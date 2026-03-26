import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../../shared/components/layout.component';
import { TurnoService, CategoriaService } from '../../core/auth/services';
import { AuthService } from '../../core/auth/auth.service';
import { Turno, Categoria, Disponibilidad, SlotHorario } from '../../core/models/models';

const HORAS = ['08:00', '09:00', '10:00', '11:00'];

const CAT_COLORS: Record<string, { fill: string; stroke: string; light: string }> = {
  'Traumatología':       { fill: '#2563eb', stroke: '#1d4ed8', light: '#dbeafe' },
  'Cardio Respiratorio': { fill: '#16a34a', stroke: '#15803d', light: '#dcfce7' },
  'Neurología':          { fill: '#db2777', stroke: '#be185d', light: '#fce7f3' },
  'Dermatofuncional':    { fill: '#d97706', stroke: '#b45309', light: '#fef3c7' },
};
const DEFAULT_COLOR = { fill: '#6366f1', stroke: '#4f46e5', light: '#e0e7ff' };

function catColor(nombre: string) {
  return CAT_COLORS[nombre] ?? DEFAULT_COLOR;
}

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [FormsModule, LayoutComponent],
  template: `
    <app-layout>
      <!-- Header del calendario -->
      <div class="calendar-header">
        <div class="header-left">
          <button class="btn-nav" (click)="semanaAnterior()">◀</button>
          <span class="week-label">{{ semanaLabel() }}</span>
          <button class="btn-nav" (click)="semanaSiguiente()">▶</button>
          <button class="btn-today" (click)="irAHoy()">Hoy</button>
        </div>
        <div class="header-right">
          <select [(ngModel)]="categoriaSeleccionada" (ngModelChange)="cargarTurnos()" class="category-select">
            <option [ngValue]="null">Todas las categorías</option>
            @for (cat of categorias(); track cat.id) {
              <option [ngValue]="cat.id">{{ cat.nombre }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Grilla de calendario -->
      @if (loading()) {
        <div class="loading">Cargando turnos...</div>
      } @else {
        <div class="cal-grid">
          <!-- Header días -->
          <div class="cal-corner"></div>
          @for (dia of diasSemana(); track dia.fecha) {
            <div class="cal-day-header" [class.today]="dia.esHoy">
              <div class="day-name">{{ dia.nombre }}</div>
              <div class="day-num" [class.today]="dia.esHoy">{{ dia.numero }}</div>
            </div>
          }

          <!-- Filas por hora -->
          @for (hora of horas; track hora) {
            <div class="cal-hora-label">{{ hora }}</div>
            @for (dia of diasSemana(); track dia.fecha) {
              <div class="cal-cell" [class.past]="dia.esPasado" [class.today]="dia.esHoy">
                <div class="cell-turnos">
                  @for (turno of getTurnosParaCelda(dia.fecha, hora); track turno.id) {
                    <div
                      class="turno-chip"
                      [class]="'cat-' + turno.categoria.id"
                      (click)="verDetalle(turno)"
                      title="{{ turno.paciente.nombreCompleto }}"
                    >
                      <div class="chip-names">
                        <span class="chip-paciente">{{ turno.paciente.apellido }}</span>
                        <span class="chip-prof">{{ turno.profesional.apellido }}</span>
                      </div>
                    </div>
                  }
                  @if (!isProfesional()) {
                    <div class="add-slot" (click)="abrirModalEnCelda(dia.fecha, hora)">
                      <span>+</span>
                    </div>
                  }
                </div>
              </div>
            }
          }
        </div>
      }

      <!-- Modal: Ver detalle / cancelar -->
      @if (turnoDetalle()) {
        <div class="modal-overlay" (click)="cerrarDetalle()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Detalle del turno</h2>
              <button class="btn-close" (click)="cerrarDetalle()">✕</button>
            </div>
            <div class="modal-body">
              @if (!mostrandoMotivoCancelacion()) {
                <div class="detail-row"><label>Paciente:</label><span>{{ turnoDetalle()!.paciente.nombreCompleto }}</span></div>
                <div class="detail-row"><label>DNI:</label><span>{{ turnoDetalle()!.paciente.dni }}</span></div>
                <div class="detail-row"><label>Teléfono:</label><span>{{ turnoDetalle()!.paciente.telefono }}</span></div>
                <div class="detail-row"><label>Profesional:</label><span>{{ turnoDetalle()!.profesional.nombreCompleto }}</span></div>
                <div class="detail-row"><label>Categoría:</label><span>{{ turnoDetalle()!.categoria.nombre }}</span></div>
                <div class="detail-row"><label>Fecha y hora:</label><span>{{ formatFechaHora(turnoDetalle()!.fechaHora) }}</span></div>
                @if (turnoDetalle()!.estado === 'Activo' && turnoDetalle()!.descripcionProblema) {
                  <div class="detail-row"><label>Motivo consulta:</label><span>{{ turnoDetalle()!.descripcionProblema }}</span></div>
                }
                @if (turnoDetalle()!.estado === 'Cancelado' && turnoDetalle()!.motivoCancelacion) {
                  <div class="detail-row"><label>Motivo cancelación:</label><span>{{ turnoDetalle()!.motivoCancelacion }}</span></div>
                }
                <div class="detail-row"><label>Registrado por:</label><span>{{ turnoDetalle()!.creadoPor }}</span></div>
              } @else {
                <!-- Formulario de cancelación -->
                <div class="cancel-form-container">
                  <div class="cancel-header">
                    <span class="cancel-icon">⚠️</span>
                    <div>
                      <h3>Cancelar turno</h3>
                      <p class="cancel-subtitle">Esta acción no se puede deshacer</p>
                    </div>
                  </div>
                  
                  <div class="cancel-summary">
                    <div><strong>Paciente:</strong> {{ turnoDetalle()!.paciente.nombreCompleto }}</div>
                    <div><strong>Profesional:</strong> {{ turnoDetalle()!.profesional.nombreCompleto }}</div>
                    <div><strong>Fecha:</strong> {{ formatFechaHora(turnoDetalle()!.fechaHora) }}</div>
                  </div>

                  <div class="cancel-input-group">
                    <label for="motivoCancelacion">Motivo de cancelación <span class="required">*</span></label>
                    <textarea 
                      id="motivoCancelacion"
                      [(ngModel)]="motivoCancelacionValue"
                      placeholder="Ejemplo: Paciente no asistió, emergencia familiar, error de carga..."
                      rows="3"
                      maxlength="250"
                      class="cancel-textarea"
                    ></textarea>
                    <div class="char-counter">{{ motivoCancelacionValue.length }}/250</div>
                    <p class="cancel-hint">Este motivo quedará registrado para auditoría.</p>
                  </div>
                </div>
              }
            </div>
            <div class="modal-footer">
              @if (!mostrandoMotivoCancelacion() && turnoDetalle()!.estado === 'Activo') {
                <button class="btn-cancelar-turno" (click)="iniciarCancelacion()">
                  ❌ Cancelar turno
                </button>
                <button class="btn-secondary" (click)="cerrarDetalle()">Cerrar</button>
              } @else if (turnoDetalle()!.estado === 'Activo') {
                <button class="btn-secondary" (click)="cancelarCancelacion()">← Volver</button>
                <button class="btn-cancelar-turno" (click)="confirmarCancelacion()" [disabled]="!motivoCancelacionValue.trim()">
                  Confirmar cancelación
                </button>
              } @else {
                <button class="btn-secondary" (click)="cerrarDetalle()">Cerrar</button>
              }
            </div>
          </div>
        </div>
      }

      <!-- Modal: Nuevo turno -->
      @if (modalNuevo()) {
        <div class="modal-overlay" (click)="cerrarModalNuevo()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Nuevo turno</h2>
              <button class="btn-close" (click)="cerrarModalNuevo()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <label>Fecha</label>
                <input type="date" [(ngModel)]="nuevoTurno.fecha" (ngModelChange)="onFechaChange()" />
              </div>
              <div class="form-row">
                <label>Categoría</label>
                <select [(ngModel)]="nuevoTurno.categoriaId" (ngModelChange)="onCategoriaChange()">
                  <option [ngValue]="null">Seleccionar categoría</option>
                  @for (cat of categorias(); track cat.id) {
                    <option [ngValue]="cat.id">{{ cat.nombre }}</option>
                  }
                </select>
              </div>
              @if (disponibilidad()) {
                <div class="form-row">
                  <label>Horario</label>
                  <div class="slots-grid">
                    @for (slot of disponibilidad()!.slots; track slot.hora) {
                      <div
                        class="slot-btn"
                        [class.selected]="nuevoTurno.hora === slot.hora"
                        [class.lleno]="slot.cuposDisponibles === 0"
                        (click)="slot.cuposDisponibles > 0 && seleccionarSlot(slot)"
                      >
                        <div class="slot-hora">{{ slot.hora }}</div>
                        <div class="slot-cupos">{{ slot.cuposDisponibles }} cupos</div>
                        <div class="slot-label">disponibles</div>
                      </div>
                    }
                  </div>
                </div>
              }
              @if (nuevoTurno.hora && slotSeleccionado()) {
                <div class="form-row">
                  <label>Profesional</label>
                  <select [(ngModel)]="nuevoTurno.profesionalId">
                    <option [ngValue]="null">Seleccionar profesional</option>
                    @for (prof of slotSeleccionado()!.profesionalesLibres; track prof.id) {
                      <option [ngValue]="prof.id">{{ prof.nombreCompleto }}</option>
                    }
                  </select>
                </div>
                <div class="form-row">
                  <label>Paciente</label>
                  <div class="paciente-form">
                    <input type="text" [(ngModel)]="nuevoTurno.paciente.nombre" placeholder="Nombre" />
                    <input type="text" [(ngModel)]="nuevoTurno.paciente.apellido" placeholder="Apellido" />
                    <input type="text" [(ngModel)]="nuevoTurno.paciente.dni" placeholder="DNI" />
                    <input type="text" [(ngModel)]="nuevoTurno.paciente.telefono" placeholder="Teléfono" />
                  </div>
                </div>
                <div class="form-row">
                  <label>Descripción del problema</label>
                  <textarea [(ngModel)]="nuevoTurno.descripcion" rows="3"></textarea>
                </div>
              }
              @if (errorModal()) {
                <div class="error-msg">{{ errorModal() }}</div>
              }
            </div>
            <div class="modal-footer">
              <button class="btn-primary" (click)="crearTurno()" [disabled]="guardando()">
                {{ guardando() ? 'Guardando...' : 'Guardar turno' }}
              </button>
              <button class="btn-secondary" (click)="cerrarModalNuevo()">Cancelar</button>
            </div>
          </div>
        </div>
      }
    </app-layout>
  `,
  styles: [`
    /* ── Formulario de cancelación mejorado ── */
    .cancel-form-container {
      padding: 0.5rem;
    }
    .cancel-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #fee2e2;
    }
    .cancel-icon { font-size: 1.75rem; }
    .cancel-header h3 {
      margin: 0; font-size: 1.1rem; color: #dc2626;
    }
    .cancel-subtitle {
      margin: 0; font-size: 0.85rem; color: #666;
    }
    .cancel-summary {
      background: #f8fafc;
      padding: 0.75rem;
      border-radius: 6px;
      font-size: 0.85rem;
      margin-bottom: 1.25rem;
      line-height: 1.6;
      color: #475569;
    }
    .cancel-input-group {
      margin-bottom: 0.5rem;
    }
    .cancel-input-group label {
      display: block;
      font-size: 0.9rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.4rem;
    }
    .required { color: #dc2626; }
    .cancel-textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.95rem;
      resize: vertical;
      min-height: 80px;
      font-family: inherit;
      box-sizing: border-box;
    }
    .cancel-textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }
    .char-counter {
      text-align: right;
      font-size: 0.75rem;
      color: #94a3b8;
      margin-top: 0.25rem;
    }
    .cancel-hint {
      font-size: 0.8rem;
      color: #64748b;
      margin: 0.5rem 0 0;
    }
    /* Estilos existentes del calendario... */
    :host {
      display: block;
      height: 100%;
    }
    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
    }
    .header-left { display: flex; gap: 0.5rem; align-items: center; }
    .header-right { display: flex; gap: 0.5rem; align-items: center; }
    .btn-nav, .btn-today, .btn-nuevo, .btn-primary, .btn-secondary, .btn-cancelar-turno {
      padding: 0.5rem 1rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      background: var(--color-bg);
      cursor: pointer;
      font-size: 0.9rem;
    }
    .btn-nuevo, .btn-primary { background: var(--color-accent); color: white; border: none; }
    .btn-cancelar-turno { background: var(--color-danger); color: white; border: none; }
    .category-select { padding: 0.5rem; border-radius: var(--radius-md); border: 1px solid var(--color-border); }
    
    .cal-grid {
      display: grid;
      grid-template-columns: 60px repeat(5, 1fr);
      grid-template-rows: auto repeat(4, 1fr);
      height: calc(100% - 70px);
      overflow-y: auto;
    }
    .cal-corner { grid-column: 1; grid-row: 1; }
    .cal-day-header {
      grid-row: 1;
      padding: 0.5rem;
      text-align: center;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-surface);
    }
    .cal-day-header.today {
      background: #e0f2fe; /* Azul muy claro */
      color: #0369a1; /* Texto azul oscuro */
      font-weight: bold;
    }
    .cal-day-header.today .day-num {
      background: #0284c7; /* Azul intenso */
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .cal-hora-label {
      grid-column: 1;
      padding: 0.5rem;
      text-align: center;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-surface);
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }
    .cal-cell {
      border-bottom: 1px solid var(--color-border);
      border-right: 1px solid var(--color-border);
      padding: 0.25rem;
      min-height: 80px;
      position: relative;
    }
    /* Resaltar la columna del día actual */
    /* Usamos :nth-child para seleccionar la columna correcta basada en el índice del día */
    /* Esto requiere que sepamos qué día es hoy. Como es dinámico, usamos una clase en el header 
       y asumimos que la celda correspondiente en la grilla está alineada. 
       Sin embargo, con CSS puro es difícil alinear columnas sin saber el índice.
       Mejor opción: Aplicar clase 'today' a las celdas desde el template. */
    
    /* Ya que el template aplica [class.today] en la celda (.cal-cell), verifiquemos si está ahí */
    .cal-cell.today {
      background-color: #f0f9ff; /* Fondo azul muy muy claro */
    }
    .cell-turnos { display: flex; flex-direction: column; gap: 2px; }
    .turno-chip {
      padding: 2px 4px;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
      border-left: 3px solid;
    }
    .turno-chip:hover { filter: brightness(0.95); }
    .chip-names {
      display: flex;
      flex-direction: column;
    }
    .chip-paciente { font-weight: bold; }
    .chip-prof { font-size: 0.7rem; opacity: 0.8; }
    
    .cat-1 { background: #eff6ff; border-left-color: #3b82f6; color: #1e40af; }
    .cat-2 { background: #f0fdf4; border-left-color: #22c55e; color: #166534; }
    .cat-3 { background: #fdf2f8; border-left-color: #ec4899; color: #9d174d; }
    .cat-4 { background: #fffbeb; border-left-color: #f59e0b; color: #92400e; }

    .add-slot {
      position: absolute;
      bottom: 2px;
      right: 2px;
      font-size: 1.2rem;
      color: #cbd5e1;
      cursor: pointer;
    }
    .add-slot:hover { color: var(--color-accent); }

    /* Modal styles */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
    .modal { background: white; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
    .modal-header { padding: 1rem; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
    .modal-body { padding: 1rem; }
    .modal-footer { padding: 1rem; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 0.5rem; }
    .detail-row { display: flex; margin-bottom: 0.5rem; }
    .detail-row label { width: 120px; font-weight: bold; color: #666; }
    .form-row { margin-bottom: 1rem; }
    .form-row label { display: block; margin-bottom: 0.25rem; font-weight: bold; }
    .form-row input, .form-row select, .form-row textarea { width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
    .slots-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
    .slot-btn { border: 1px solid #ccc; padding: 0.5rem; text-align: center; border-radius: 4px; cursor: pointer; }
    .slot-btn.selected { background: #e0f2fe; border-color: #0ea5e9; }
    .slot-btn.lleno { opacity: 0.5; cursor: not-allowed; background: #f1f5f9; }
    .paciente-form { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  `]
})
export class CalendarioComponent implements OnInit {
  horas = HORAS;
  semanaOffset = signal(0);
  categorias = signal<Categoria[]>([]);
  turnos = signal<Turno[]>([]);
  loading = signal(false);
  categoriaSeleccionada: number | null = null;

  turnoDetalle = signal<Turno | null>(null);
  modalNuevo = signal(false);
  disponibilidad = signal<any>(null);
  errorModal = signal('');
  guardando = signal(false);
  motivoCancelacion = signal<string>('');
  mostrandoMotivoCancelacion = signal<boolean>(false);
  motivoCancelacionValue = '';

  nuevoTurno = {
    fecha: '',
    hora: '',
    categoriaId: null as number | null,
    profesionalId: null as number | null,
    paciente: { nombre: '', apellido: '', dni: '', telefono: '' },
    descripcion: ''
  };

  constructor(
    private turnoService: TurnoService,
    private categoriaService: CategoriaService,
    public authService: AuthService
  ) {}

  isProfesional = this.authService.isProfesional;

  diasSemana = computed(() => {
    const hoy = new Date();
    // Normalizar a medianoche para evitar desplazamientos de fecha por la hora actual
    const hoyMedianoche = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    
    const lunes = new Date(hoyMedianoche);
    lunes.setDate(hoyMedianoche.getDate() - hoyMedianoche.getDay() + 1 + (this.semanaOffset() * 7));
    
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      return {
        fecha: d.toISOString().split('T')[0],
        numero: d.getDate(),
        nombre: d.toLocaleDateString('es-AR', { weekday: 'short' }),
        esHoy: d.toDateString() === new Date().toDateString(),
        esPasado: d < new Date(new Date().setHours(0,0,0,0))
      };
    });
  });

  semanaLabel = computed(() => {
    const dias = this.diasSemana();
    const ini = new Date(dias[0].fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    const fin = new Date(dias[4].fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${ini} – ${fin}`;
  });

  slotSeleccionado = computed(() =>
    this.disponibilidad()?.slots?.find((s: SlotHorario) => s.hora === this.nuevoTurno.hora) ?? null
  );

  ngOnInit() {
    this.categoriaService.getAll().subscribe(c => {
      this.categorias.set(c);
      if (this.isProfesional()) {
        this.categoriaSeleccionada = this.authService.currentUser()?.categoriaId ?? null;
      }
    });
    this.cargarTurnos();
  }

  cargarTurnos() {
    const dias = this.diasSemana();
    this.loading.set(true);
    this.turnoService.getCalendario(
      dias[0].fecha, dias[4].fecha,
      this.categoriaSeleccionada ?? undefined
    ).subscribe({
      next: t => { this.turnos.set(t); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  getTurnosParaCelda(fecha: string, hora: string): Turno[] {
    const horaNum = parseInt(hora.split(':')[0]);
    return this.turnos().filter(t => {
      const d = new Date(t.fechaHora);
      // Comparar fecha en formato YYYY-MM-DD (UTC)
      const fechaUtc = d.toISOString().split('T')[0];
      // Obtener hora local
      const horaLocal = d.getHours();
      return fechaUtc === fecha && horaLocal === horaNum;
    });
  }

  puedeAgregarEnCelda(fecha: string, hora: string): boolean {
    const count = this.getTurnosParaCelda(fecha, hora).length;
    return !this.isProfesional() && count < 3; // Max 3 turnos por celda
  }

  semanaAnterior() { this.semanaOffset.update(v => v - 1); this.cargarTurnos(); }
  semanaSiguiente() { this.semanaOffset.update(v => v + 1); this.cargarTurnos(); }
  irAHoy() { this.semanaOffset.set(0); this.cargarTurnos(); }

  verDetalle(turno: Turno) { this.turnoDetalle.set(turno); }
  cerrarDetalle() { 
    this.turnoDetalle.set(null);
    this.mostrandoMotivoCancelacion.set(false);
    this.motivoCancelacionValue = '';
    this.errorModal.set('');
  }

  iniciarCancelacion() {
    this.mostrandoMotivoCancelacion.set(true);
  }

  cancelarCancelacion() {
    this.mostrandoMotivoCancelacion.set(false);
    this.motivoCancelacionValue = '';
  }

  confirmarCancelacion() {
    const turno = this.turnoDetalle();
    if (!turno || !this.motivoCancelacionValue.trim()) return;

    this.turnoService.cancelar(turno.id, this.motivoCancelacionValue.trim()).subscribe({
      next: () => {
        this.cerrarDetalle();
        this.cargarTurnos();
      },
      error: (err) => {
        this.errorModal.set(err.error?.mensaje || 'Error al cancelar el turno');
      }
    });
  }

  resetNuevoTurno() {
    this.nuevoTurno = {
      fecha: new Date().toISOString().split('T')[0],
      hora: '',
      categoriaId: this.isProfesional() ? this.authService.currentUser()?.categoriaId ?? null : null,
      profesionalId: this.isProfesional() ? this.authService.currentUser()?.id ?? null : null,
      paciente: { nombre: '', apellido: '', dni: '', telefono: '' },
      descripcion: ''
    };
    this.disponibilidad.set(null);
    this.errorModal.set('');
  }

  abrirModalNuevo() {
    this.resetNuevoTurno();
    this.modalNuevo.set(true);
  }

  cerrarModalNuevo() {
    this.modalNuevo.set(false);
    this.resetNuevoTurno();
  }

  abrirModalEnCelda(fecha: string, hora: string) {
    this.resetNuevoTurno();
    this.nuevoTurno.fecha = fecha;
    this.nuevoTurno.hora = hora;
    if (this.isProfesional()) {
      this.nuevoTurno.categoriaId = this.authService.currentUser()?.categoriaId ?? null;
    } else if (this.categoriaSeleccionada) {
      this.nuevoTurno.categoriaId = this.categoriaSeleccionada;
    }
    if (this.nuevoTurno.fecha && this.nuevoTurno.categoriaId) {
      this.cargarDisponibilidad();
    }
    this.modalNuevo.set(true);
  }

  onFechaChange() {
    if (this.nuevoTurno.categoriaId) {
      this.cargarDisponibilidad();
    }
  }

  onCategoriaChange() {
    if (this.nuevoTurno.fecha && this.nuevoTurno.categoriaId) {
      const currentHora = this.nuevoTurno.hora;
      this.cargarDisponibilidad();
      if (currentHora && this.disponibilidad()) {
        const slot = this.disponibilidad()?.slots?.find((s: SlotHorario) => s.hora === currentHora);
        if (slot && slot.cuposDisponibles > 0) {
          this.nuevoTurno.hora = currentHora;
          if (slot.profesionalesLibres.length === 1) {
            this.nuevoTurno.profesionalId = slot.profesionalesLibres[0].id;
          } else {
            this.nuevoTurno.profesionalId = null;
          }
        } else {
          this.nuevoTurno.hora = '';
          this.nuevoTurno.profesionalId = null;
        }
      }
    }
  }

  cargarDisponibilidad() {
    if (!this.nuevoTurno.fecha || !this.nuevoTurno.categoriaId) return;
    this.turnoService.getDisponibles(this.nuevoTurno.fecha, this.nuevoTurno.categoriaId!)
      .subscribe({
        next: (d) => {
          this.disponibilidad.set(d);
          // Auto-select hour if only one slot or previously selected
          if (this.nuevoTurno.hora) {
            const exists = d.slots.find((s: SlotHorario) => s.hora === this.nuevoTurno.hora);
            if (!exists || exists.cuposDisponibles === 0) this.nuevoTurno.hora = '';
          }
        },
        error: () => this.disponibilidad.set(null)
      });
  }

  seleccionarSlot(slot: SlotHorario) {
    this.nuevoTurno.hora = slot.hora;
    if (slot.profesionalesLibres.length === 1) {
      this.nuevoTurno.profesionalId = slot.profesionalesLibres[0].id;
    } else {
      this.nuevoTurno.profesionalId = null;
    }
  }

  crearTurno() {
    if (!this.nuevoTurno.fecha || !this.nuevoTurno.hora || !this.nuevoTurno.categoriaId || !this.nuevoTurno.profesionalId) {
      this.errorModal.set('Complete todos los campos obligatorios');
      return;
    }

    this.guardando.set(true);
    this.errorModal.set('');

    const fechaHora = `${this.nuevoTurno.fecha}T${this.nuevoTurno.hora}:00`;

    this.turnoService.crear({
      profesionalId: this.nuevoTurno.profesionalId,
      categoriaId: this.nuevoTurno.categoriaId,
      fechaHora: fechaHora,
      paciente: {
        nombre: this.nuevoTurno.paciente.nombre,
        apellido: this.nuevoTurno.paciente.apellido,
        dni: this.nuevoTurno.paciente.dni,
        telefono: this.nuevoTurno.paciente.telefono
      },
      descripcionProblema: this.nuevoTurno.descripcion || undefined
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModalNuevo();
        this.cargarTurnos();
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorModal.set(err.error?.mensaje || 'Error al guardar el turno');
      }
    });
  }

  formatFechaHora(fechaHora: string): string {
    const d = new Date(fechaHora);
    return d.toLocaleDateString('es-AR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  catFill(nombre: string): string {
    return catColor(nombre).fill;
  }
}
