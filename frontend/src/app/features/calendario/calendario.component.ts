import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../../shared/components/layout.component';
import { TurnoService, CategoriaService } from '../../core/auth/services';
import { AuthService } from '../../core/auth/auth.service';
import { Turno, Categoria, SlotHorario, ProfesionalLibre, CrearTurnoRequest, Disponibilidad } from '../../core/models/models';

const HORAS = ['08:00', '09:00', '10:00', '11:00'];

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [FormsModule, LayoutComponent],
  template: `
    <app-layout>
      <div class="calendario-page">
        <!-- Header controles -->
        <div class="cal-header">
          <div class="cal-title-row">
           <h1>Calendario de Turnos</h1>
             <button *ngIf="!isProfesional()" class="btn-nuevo" (click)="abrirModalNuevo()">➕ Nuevo turno</button>
          </div>

           <div class="cal-controls">
             <!-- Navegación de semana -->
             <div class="week-nav">
               <button class="btn-nav" (click)="semanaAnterior()">◀</button>
               <span class="week-label">{{ semanaLabel() }}</span>
               <button class="btn-nav" (click)="semanaSiguiente()">▶</button>
               <button class="btn-today" (click)="irAHoy()">Hoy</button>
             </div>
             <!-- Nuevo turno button (only for secretary/admin) -->
             <div *ngIf="!isProfesional()" class="new-turno-btn">
               <button class="btn-nuevo" (click)="abrirModalNuevo()">➕ Nuevo turno</button>
             </div>

            <!-- Filtro de categoría (no para profesional) -->
            @if (!isProfesional()) {
              <div class="cat-filter">
                <label>Categoría:</label>
                <select [(ngModel)]="categoriaSeleccionada" (ngModelChange)="cargarTurnos()">
                  <option [ngValue]="null">Todas</option>
                  @for (cat of categorias(); track cat.id) {
                    <option [ngValue]="cat.id">{{ cat.nombre }}</option>
                  }
                </select>
              </div>
            } @else {
              <div class="cat-badge">
                Categoría: <strong>{{ authService.currentUser()?.categoriaNombre }}</strong>
              </div>
            }
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
                <div class="cal-cell" [class.past]="dia.esPasado">
                  <div class="cell-turnos">
                    @for (turno of getTurnosParaCelda(dia.fecha, hora); track turno.id) {
                      <div
                        class="turno-chip"
                        [class]="'cat-' + turno.categoria.id"
                        (click)="verDetalle(turno)"
                        title="{{ turno.paciente.nombreCompleto }}"
                      >
                        <span class="chip-paciente">{{ turno.paciente.apellido }}</span>
                        <span class="chip-prof">{{ turno.profesional.apellido }}</span>
                      </div>
                    }
                    @if (puedeAgregarEnCelda(dia.fecha, hora)) {
                       <div class="add-slot" *ngIf="!isProfesional() && puedeAgregarEnCelda(dia.fecha, hora)" (click)="abrirModalEnCelda(dia.fecha, hora)">
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
                <div class="detail-row"><label>Paciente:</label><span>{{ turnoDetalle()!.paciente.nombreCompleto }}</span></div>
                <div class="detail-row"><label>DNI:</label><span>{{ turnoDetalle()!.paciente.dni }}</span></div>
                <div class="detail-row"><label>Teléfono:</label><span>{{ turnoDetalle()!.paciente.telefono }}</span></div>
                <div class="detail-row"><label>Profesional:</label><span>{{ turnoDetalle()!.profesional.nombreCompleto }}</span></div>
                <div class="detail-row"><label>Categoría:</label><span>{{ turnoDetalle()!.categoria.nombre }}</span></div>
                <div class="detail-row"><label>Fecha y hora:</label><span>{{ formatFechaHora(turnoDetalle()!.fechaHora) }}</span></div>
                @if (turnoDetalle()!.descripcionProblema) {
                  <div class="detail-row"><label>Motivo:</label><span>{{ turnoDetalle()!.descripcionProblema }}</span></div>
                }
                <div class="detail-row"><label>Registrado por:</label><span>{{ turnoDetalle()!.creadoPor }}</span></div>
              </div>
              <div class="modal-footer">
                <button class="btn-cancelar-turno" (click)="confirmarCancelacion()">
                  ❌ Cancelar turno
                </button>
                <button class="btn-secondary" (click)="cerrarDetalle()">Cerrar</button>
              </div>
            </div>
          </div>
        }

        <!-- Modal: Crear turno -->
        @if (modalNuevo()) {
          <div class="modal-overlay" (click)="cerrarModalNuevo()">
            <div class="modal modal-large" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h2>Nuevo Turno</h2>
                <button class="btn-close" (click)="cerrarModalNuevo()">✕</button>
              </div>
              <div class="modal-body">
                <!-- Paso 1: Fecha/hora/categoría -->
                <div class="form-section">
                  <h3>Horario</h3>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Fecha *</label>
                      <input type="date" [(ngModel)]="nuevoTurno.fecha" (ngModelChange)="onFechaChange()" />
                    </div>
                    @if (!isProfesional()) {
                      <div class="form-group">
                        <label>Categoría *</label>
                        <select [(ngModel)]="nuevoTurno.categoriaId" (ngModelChange)="onCategoriaChange()">
                          <option [ngValue]="null">Seleccionar...</option>
                          @for (cat of categorias(); track cat.id) {
                            <option [ngValue]="cat.id">{{ cat.nombre }}</option>
                          }
                        </select>
                      </div>
                    }
                  </div>

                  @if (disponibilidad()) {
                    <div class="slots-grid">
                      @for (slot of disponibilidad()!.slots; track slot.hora) {
                        <div
                          class="slot-btn"
                          [class.selected]="nuevoTurno.hora === slot.hora"
                          [class.lleno]="slot.cuposDisponibles === 0"
                          (click)="slot.cuposDisponibles > 0 && seleccionarSlot(slot)"
                        >
                          <div class="slot-hora">{{ slot.hora }}</div>
                          <div class="slot-cupos">{{ slot.cuposDisponibles }}/3</div>
                          <div class="slot-label">{{ slot.cuposDisponibles === 0 ? 'Lleno' : 'libre(s)' }}</div>
                        </div>
                      }
                    </div>

                    @if (nuevoTurno.hora && slotSeleccionado()) {
                      <div class="form-group">
                        <label>Profesional *</label>
                        <select [(ngModel)]="nuevoTurno.profesionalId">
                          <option [ngValue]="null">Seleccionar...</option>
                          @for (prof of slotSeleccionado()!.profesionalesLibres; track prof.id) {
                            <option [ngValue]="prof.id">{{ prof.nombreCompleto }} ({{ prof.matricula }})</option>
                          }
                        </select>
                      </div>
                    }
                  }
                </div>

                <!-- Paso 2: Datos del paciente -->
                <div class="form-section">
                  <h3>Datos del paciente</h3>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Nombre *</label>
                      <input type="text" [(ngModel)]="nuevoTurno.paciente.nombre" placeholder="Nombre" />
                    </div>
                    <div class="form-group">
                      <label>Apellido *</label>
                      <input type="text" [(ngModel)]="nuevoTurno.paciente.apellido" placeholder="Apellido" />
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>DNI *</label>
                      <input type="text" [(ngModel)]="nuevoTurno.paciente.dni" placeholder="Sin puntos" />
                    </div>
                    <div class="form-group">
                      <label>Teléfono *</label>
                      <input type="tel" [(ngModel)]="nuevoTurno.paciente.telefono" placeholder="351-XXXXXXX" />
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Motivo de consulta (opcional)</label>
                    <textarea [(ngModel)]="nuevoTurno.descripcion" rows="2" placeholder="Describir brevemente el problema..."></textarea>
                  </div>
                </div>

                @if (errorModal()) {
                  <div class="error-msg">{{ errorModal() }}</div>
                }
              </div>
              <div class="modal-footer">
                <button class="btn-primary" (click)="crearTurno()" [disabled]="guardando()">
                  @if (guardando()) { Guardando... } @else { ✅ Confirmar turno }
                </button>
                <button class="btn-secondary" (click)="cerrarModalNuevo()">Cancelar</button>
              </div>
            </div>
          </div>
        }
      </div>
    </app-layout>
  `,
  styles: [`
    .calendario-page { max-width: 1200px; }
    .cal-header { margin-bottom: 1.5rem; }
    .cal-title-row {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1rem;
    }
    h1 { color: #1e3a5f; margin: 0; font-size: 1.6rem; }
    .btn-nuevo {
      background: #1f7a4d; color: white; border: none;
      padding: 0.65rem 1.25rem; border-radius: 8px;
      font-size: 0.9rem; font-weight: 600; cursor: pointer;
    }
    .btn-nuevo:hover { background: #155a38; }
    .cal-controls {
      display: flex; gap: 1.5rem; align-items: center;
      background: white; padding: 0.85rem 1rem; border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .week-nav { display: flex; align-items: center; gap: 0.5rem; }
    .btn-nav {
      background: #f0f4f8; border: none; border-radius: 6px;
      padding: 0.4rem 0.75rem; cursor: pointer; font-size: 0.9rem;
    }
    .btn-nav:hover { background: #dce6f0; }
    .week-label { font-weight: 600; color: #1e3a5f; min-width: 180px; text-align: center; }
    .btn-today {
      background: #2e75b6; color: white; border: none;
      padding: 0.4rem 0.85rem; border-radius: 6px;
      cursor: pointer; font-size: 0.85rem;
    }
    .cat-filter { display: flex; align-items: center; gap: 0.5rem; }
    .cat-filter label { font-size: 0.85rem; color: #666; }
    .cat-filter select { padding: 0.4rem 0.6rem; border: 1px solid #ddd; border-radius: 6px; }
    .cat-badge {
      background: #dbeafe; color: #1e40af; padding: 0.4rem 0.85rem;
      border-radius: 20px; font-size: 0.85rem;
    }

    /* Grid */
    .cal-grid {
      display: grid;
      grid-template-columns: 65px repeat(5, 1fr);
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      overflow: hidden;
      background: white;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }
    .cal-corner { background: #f8f9fa; border-bottom: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; }
    .cal-day-header {
      background: #f8f9fa; padding: 0.75rem;
      text-align: center; border-bottom: 1px solid #e0e0e0;
      border-right: 1px solid #e0e0e0;
    }
    .cal-day-header.today { background: #dbeafe; }
    .day-name { font-size: 0.75rem; text-transform: uppercase; color: #666; }
    .day-num {
      font-size: 1.1rem; font-weight: 700; color: #1e3a5f;
      width: 30px; height: 30px; display: flex;
      align-items: center; justify-content: center;
      margin: 0.2rem auto 0; border-radius: 50%;
    }
    .day-num.today { background: #2e75b6; color: white; }
    .cal-hora-label {
      background: #f8f9fa; padding: 0.5rem;
      display: flex; align-items: flex-start; justify-content: center;
      font-size: 0.8rem; font-weight: 600; color: #666;
      border-bottom: 1px solid #f0f0f0; border-right: 1px solid #e0e0e0;
      padding-top: 0.6rem;
    }
    .cal-cell {
      min-height: 80px; padding: 0.4rem;
      border-bottom: 1px solid #f0f0f0;
      border-right: 1px solid #e0e0e0;
    }
    .cal-cell.past { background: #fafafa; opacity: 0.7; }
    .cell-turnos { display: flex; flex-direction: column; gap: 0.3rem; }
    .turno-chip {
      padding: 0.3rem 0.5rem; border-radius: 6px;
      font-size: 0.75rem; cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
    }
    .turno-chip:hover { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
    .cat-1 { background: #dbeafe; color: #1e40af; border-left: 3px solid #2563eb; }
    .cat-2 { background: #dcfce7; color: #166534; border-left: 3px solid #16a34a; }
    .cat-3 { background: #fce7f3; color: #831843; border-left: 3px solid #db2777; }
    .cat-4 { background: #fef3c7; color: #92400e; border-left: 3px solid #d97706; }
    .chip-paciente { display: block; font-weight: 600; }
    .chip-prof { display: block; font-size: 0.7rem; opacity: 0.8; }
    .add-slot {
      height: 24px; border: 2px dashed #d0d8e4; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      color: #90a4b8; cursor: pointer; font-size: 1rem;
      transition: all 0.15s;
    }
    .add-slot:hover { border-color: #2e75b6; color: #2e75b6; background: #f0f7ff; }

    /* Modals */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 1rem;
    }
    .modal {
      background: white; border-radius: 12px;
      width: 100%; max-width: 480px;
      max-height: 90vh; overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .modal-large { max-width: 700px; }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e0e0e0;
    }
    .modal-header h2 { margin: 0; color: #1e3a5f; font-size: 1.1rem; }
    .btn-close {
      background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #666;
    }
    .modal-body { padding: 1.25rem 1.5rem; }
    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e0e0e0;
      display: flex; gap: 0.75rem; justify-content: flex-end;
    }
    .detail-row {
      display: flex; gap: 0.75rem; padding: 0.5rem 0;
      border-bottom: 1px solid #f5f5f5;
    }
    .detail-row label { font-weight: 600; color: #444; min-width: 120px; font-size: 0.85rem; }
    .detail-row span { color: #222; font-size: 0.9rem; }
    .form-section { margin-bottom: 1.5rem; }
    .form-section h3 { color: #1e3a5f; font-size: 0.95rem; margin: 0 0 0.75rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .form-group { margin-bottom: 0.75rem; }
    .form-group label { display: block; font-size: 0.82rem; font-weight: 600; color: #444; margin-bottom: 0.3rem; }
    .form-group input, .form-group select, .form-group textarea {
      width: 100%; padding: 0.6rem 0.75rem; border: 2px solid #e0e0e0;
      border-radius: 7px; font-size: 0.9rem; box-sizing: border-box;
    }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
      outline: none; border-color: #2e75b6;
    }
    .slots-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem; margin: 0.75rem 0;
    }
    .slot-btn {
      padding: 0.6rem; border: 2px solid #e0e0e0; border-radius: 8px;
      text-align: center; cursor: pointer; transition: all 0.15s;
    }
    .slot-btn:hover:not(.lleno) { border-color: #2e75b6; background: #f0f7ff; }
    .slot-btn.selected { border-color: #2e75b6; background: #dbeafe; }
    .slot-btn.lleno { opacity: 0.45; cursor: not-allowed; background: #f5f5f5; }
    .slot-hora { font-weight: 700; color: #1e3a5f; font-size: 0.95rem; }
    .slot-cupos { font-size: 1.1rem; font-weight: 700; color: #2e75b6; }
    .slot-label { font-size: 0.7rem; color: #666; }
    .btn-primary {
      background: #2e75b6; color: white; border: none;
      padding: 0.7rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer;
    }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary {
      background: #f0f4f8; color: #444; border: none;
      padding: 0.7rem 1.25rem; border-radius: 8px; font-weight: 600; cursor: pointer;
    }
    .btn-cancelar-turno {
      background: #dc2626; color: white; border: none;
      padding: 0.7rem 1.25rem; border-radius: 8px; font-weight: 600; cursor: pointer;
    }
    .error-msg {
      background: #fdecea; color: #c62828; border-radius: 6px;
      padding: 0.6rem 0.75rem; font-size: 0.85rem; margin-top: 0.5rem;
    }
    .loading { text-align: center; padding: 3rem; color: #666; font-size: 1.1rem; }
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
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - hoy.getDay() + 1 + (this.semanaOffset() * 7));

    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      const hoyStr = new Date().toDateString();
      return {
        fecha: d.toISOString().split('T')[0],
        nombre: d.toLocaleDateString('es-AR', { weekday: 'long' }),
        numero: d.getDate(),
        esHoy: d.toDateString() === hoyStr,
        esPasado: d < new Date(new Date().setHours(0, 0, 0, 0))
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
      return d.toISOString().split('T')[0] === fecha && d.getHours() === horaNum;
    });
  }

  puedeAgregarEnCelda(fecha: string, hora: string): boolean {
    const count = this.getTurnosParaCelda(fecha, hora).length;
    return count < 3;
  }

  semanaAnterior() { this.semanaOffset.update(v => v - 1); this.cargarTurnos(); }
  semanaSiguiente() { this.semanaOffset.update(v => v + 1); this.cargarTurnos(); }
  irAHoy() { this.semanaOffset.set(0); this.cargarTurnos(); }

  verDetalle(turno: Turno) { this.turnoDetalle.set(turno); }
  cerrarDetalle() { this.turnoDetalle.set(null); }

  confirmarCancelacion() {
    const turno = this.turnoDetalle();
    if (!turno) return;
    if (!confirm(`¿Cancelar turno de ${turno.paciente.nombreCompleto}?`)) return;

    this.turnoService.cancelar(turno.id).subscribe({
      next: () => {
        this.cerrarDetalle();
        this.cargarTurnos();
      }
    });
  }

  abrirModalNuevo() {
    this.resetNuevoTurno();
    this.modalNuevo.set(true);
  }

  abrirModalEnCelda(fecha: string, hora: string) {
    this.resetNuevoTurno();
    this.nuevoTurno.fecha = fecha;
    this.nuevoTurno.hora = hora;
    if (this.isProfesional()) {
      this.nuevoTurno.categoriaId = this.authService.currentUser()?.categoriaId ?? null;
      this.nuevoTurno.profesionalId = this.authService.currentUser()?.profesionalId ?? null;
    } else if (this.categoriaSeleccionada) {
      this.nuevoTurno.categoriaId = this.categoriaSeleccionada;
    }
    if (this.nuevoTurno.fecha && this.nuevoTurno.categoriaId) {
      this.cargarDisponibilidad();
    }
    this.modalNuevo.set(true);
  }

  cerrarModalNuevo() {
    this.modalNuevo.set(false);
    this.disponibilidad.set(null);
    this.errorModal.set('');
  }

  resetNuevoTurno() {
    this.nuevoTurno = {
      fecha: new Date().toISOString().split('T')[0],
      hora: '', categoriaId: null, profesionalId: null,
      paciente: { nombre: '', apellido: '', dni: '', telefono: '' },
      descripcion: ''
    };
  }

  onFechaChange() {
    if (this.nuevoTurno.fecha && this.nuevoTurno.categoriaId) {
      this.cargarDisponibilidad();
    }
  }

  onCategoriaChange() {
    if (this.nuevoTurno.fecha && this.nuevoTurno.categoriaId) {
      this.cargarDisponibilidad();
    }
  }

  cargarDisponibilidad() {
    this.turnoService.getDisponibles(
      this.nuevoTurno.fecha,
      this.nuevoTurno.categoriaId!
    ).subscribe(d => {
      this.disponibilidad.set(d);
      this.nuevoTurno.hora = '';
      this.nuevoTurno.profesionalId = null;
    });
  }

  seleccionarSlot(slot: SlotHorario) {
    this.nuevoTurno.hora = slot.hora;
    this.nuevoTurno.profesionalId = null;
    if (slot.profesionalesLibres.length === 1) {
      this.nuevoTurno.profesionalId = slot.profesionalesLibres[0].id;
    }
    if (this.isProfesional()) {
      const profId = this.authService.currentUser()?.profesionalId;
      if (profId && slot.profesionalesLibres.some(p => p.id === profId)) {
        this.nuevoTurno.profesionalId = profId;
      }
    }
  }

  crearTurno() {
    const { fecha, hora, categoriaId, profesionalId, paciente, descripcion } = this.nuevoTurno;
    if (!fecha || !hora || !categoriaId || !profesionalId) {
      this.errorModal.set('Complete fecha, horario y profesional');
      return;
    }
    if (!paciente.nombre || !paciente.apellido || !paciente.dni || !paciente.telefono) {
      this.errorModal.set('Complete todos los datos del paciente');
      return;
    }

    const fechaHora = `${fecha}T${hora}:00`;
    const req: CrearTurnoRequest = {
      profesionalId,
      categoriaId,
      fechaHora,
      paciente,
      descripcionProblema: descripcion || undefined
    };

    this.guardando.set(true);
    this.errorModal.set('');

    this.turnoService.crear(req).subscribe({
      next: () => {
        this.cerrarModalNuevo();
        this.cargarTurnos();
        this.guardando.set(false);
      },
      error: (err) => {
        this.errorModal.set(err.error?.mensaje || 'Error al crear el turno');
        this.guardando.set(false);
      }
    });
  }

  formatFechaHora(fechaHora: string): string {
    return new Date(fechaHora).toLocaleString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
