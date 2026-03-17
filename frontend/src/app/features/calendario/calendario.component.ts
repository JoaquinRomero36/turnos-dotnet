import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../../shared/components/layout.component';
import { TurnoService, CategoriaService, ProfesionalService } from '../../core/auth/services';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { Turno, Categoria, SlotHorario, Profesional, ProfesionalLibre, CrearTurnoRequest, Disponibilidad } from '../../core/models/models';

const HORAS = ['08:00', '09:00', '10:00', '11:00'];

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [FormsModule, LayoutComponent, CommonModule],
  template: `
    <app-layout>
      <div class="calendario-page">
        <!-- Header controles -->
            <div class="cal-header">
              <div class="cal-title-row">
                <h1>Calendario de Turnos</h1>
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
    .calendario-page { max-width: 1400px; margin: 0 auto; }
    .cal-header { margin-bottom: 1.5rem; }
    .cal-title-row {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1rem;
    }
    h1 { color: var(--color-primary); margin: 0; font-size: 1.8rem; font-weight: 700; }
    
    .btn-nuevo {
      background: var(--color-success); color: white; border: none;
      padding: 0.7rem 1.25rem; border-radius: var(--radius-md);
      font-size: 0.9rem; font-weight: 600; cursor: pointer;
      box-shadow: var(--shadow-sm);
      transition: all 0.2s;
    }
    .btn-nuevo:hover { background: #166534; transform: translateY(-1px); box-shadow: var(--shadow-md); }
    
    .cal-controls {
      display: flex; gap: 1rem; align-items: center;
      background: var(--color-surface); padding: 1rem;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--color-border);
    }
    .week-nav { display: flex; align-items: center; gap: 0.5rem; }
    .btn-nav {
      background: var(--color-bg); border: 1px solid var(--color-border); 
      border-radius: var(--radius-sm); color: var(--color-text);
      padding: 0.4rem 0.75rem; cursor: pointer; font-size: 0.9rem;
      transition: all 0.2s;
    }
    .btn-nav:hover { background: #e2e8f0; }
    .week-label { font-weight: 600; color: var(--color-primary); min-width: 200px; text-align: center; font-size: 1rem; }
    .btn-today {
      background: var(--color-accent); color: white; border: none;
      padding: 0.4rem 0.85rem; border-radius: var(--radius-sm);
      cursor: pointer; font-size: 0.85rem; font-weight: 500;
    }
    .cat-filter { display: flex; align-items: center; gap: 0.5rem; }
    .cat-filter label { font-size: 0.85rem; color: var(--color-text-muted); }
    .cat-filter select { 
      padding: 0.4rem 0.6rem; border: 1px solid var(--color-border); 
      border-radius: var(--radius-sm); background: var(--color-surface);
    }
    .cat-badge {
      background: #eff6ff; color: var(--color-accent-dark); 
      padding: 0.4rem 0.85rem; border-radius: 20px; font-size: 0.85rem;
      font-weight: 500;
    }

    /* Grid */
    .cal-grid {
      display: grid;
      grid-template-columns: 70px repeat(5, 1fr);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      background: var(--color-surface);
      box-shadow: var(--shadow-md);
    }
    .cal-corner { background: #f8fafc; border-bottom: 1px solid var(--color-border); border-right: 1px solid var(--color-border); }
    .cal-day-header {
      background: #f8fafc; padding: 1rem;
      text-align: center; border-bottom: 1px solid var(--color-border);
      border-right: 1px solid var(--color-border);
    }
    .cal-day-header.today { background: #eff6ff; }
    .day-name { font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-muted); letter-spacing: 0.5px; }
    .day-num {
      font-size: 1.25rem; font-weight: 700; color: var(--color-primary);
      width: 32px; height: 32px; display: flex;
      align-items: center; justify-content: center;
      margin: 0.2rem auto 0; border-radius: 50%;
    }
    .day-num.today { background: var(--color-accent); color: white; }
    .cal-hora-label {
      background: #f8fafc; padding: 0.5rem;
      display: flex; align-items: flex-start; justify-content: center;
      font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border);
      border-right: 1px solid var(--color-border);
      padding-top: 0.8rem;
    }
    .cal-cell {
      min-height: 90px; padding: 0.5rem;
      border-bottom: 1px solid var(--color-border);
      border-right: 1px solid var(--color-border);
      transition: background 0.2s;
    }
    .cal-cell:hover { background: #fafafa; }
    .cal-cell.past { background: #f9fafb; opacity: 0.6; }
    .cell-turnos { display: flex; flex-direction: column; gap: 0.4rem; }
    .turno-chip {
      padding: 0.35rem 0.6rem; border-radius: 6px;
      font-size: 0.8rem; cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
      border-left-width: 3px; border-left-style: solid;
    }
    .turno-chip:hover { transform: translateY(-1px); box-shadow: var(--shadow-sm); }
    
    /* Colores categorías (más profesionales) */
    .cat-1 { background: #eff6ff; color: #1e40af; border-left-color: #3b82f6; }
    .cat-2 { background: #f0fdf4; color: #166534; border-left-color: #22c55e; }
    .cat-3 { background: #fdf2f8; color: #9d174d; border-left-color: #ec4899; }
    .cat-4 { background: #fffbeb; color: #92400e; border-left-color: #f59e0b; }
    
    .chip-paciente { display: block; font-weight: 600; }
    .chip-prof { display: block; font-size: 0.7rem; opacity: 0.8; }
    
    .add-slot {
      height: 28px; border: 2px dashed #cbd5e1; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      color: #94a3b8; cursor: pointer; font-size: 1.1rem;
      transition: all 0.15s;
    }
    .add-slot:hover { border-color: var(--color-accent); color: var(--color-accent); background: #eff6ff; }

    /* Modals */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 1rem;
    }
    .modal {
      background: var(--color-surface); border-radius: var(--radius-lg);
      width: 100%; max-width: 500px;
      max-height: 90vh; overflow-y: auto;
      box-shadow: var(--shadow-lg);
      animation: slideIn 0.2s ease-out;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: scale(0.95) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .modal-large { max-width: 750px; }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--color-border);
    }
    .modal-header h2 { margin: 0; color: var(--color-primary); font-size: 1.2rem; font-weight: 700; }
    .btn-close {
      background: none; border: none; font-size: 1.2rem; cursor: pointer; 
      color: var(--color-text-muted); padding: 0.25rem; line-height: 1;
    }
    .btn-close:hover { color: var(--color-danger); }
    .modal-body { padding: 1.5rem; }
    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--color-border);
      display: flex; gap: 0.75rem; justify-content: flex-end;
      background: #f8fafc;
    }
    .detail-row {
      display: flex; gap: 0.75rem; padding: 0.6rem 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .detail-row label { font-weight: 600; color: var(--color-text-muted); min-width: 130px; font-size: 0.85rem; }
    .detail-row span { color: var(--color-text); font-size: 0.95rem; font-weight: 500; }
    .form-section { margin-bottom: 1.5rem; }
    .form-section h3 { color: var(--color-primary); font-size: 1rem; margin: 0 0 1rem; font-weight: 600; border-bottom: 2px solid var(--color-bg); padding-bottom: 0.5rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--color-text); margin-bottom: 0.4rem; }
    .form-group input, .form-group select, .form-group textarea {
      width: 100%; padding: 0.7rem 0.85rem; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: 0.95rem; box-sizing: border-box;
      background: var(--color-surface); color: var(--color-text);
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
      outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    .slots-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem; margin: 1rem 0;
    }
    .slot-btn {
      padding: 0.8rem; border: 1px solid var(--color-border); border-radius: var(--radius-md);
      text-align: center; cursor: pointer; transition: all 0.15s;
      background: var(--color-surface);
    }
    .slot-btn:hover:not(.lleno) { border-color: var(--color-accent); background: #eff6ff; }
    .slot-btn.selected { border-color: var(--color-accent); background: #eff6ff; box-shadow: 0 0 0 2px var(--color-accent); }
    .slot-btn.lleno { opacity: 0.5; cursor: not-allowed; background: #f8fafc; text-decoration: line-through; }
    .slot-hora { font-weight: 700; color: var(--color-primary); font-size: 0.95rem; }
    .slot-cupos { font-size: 1.1rem; font-weight: 700; color: var(--color-accent); }
    .slot-label { font-size: 0.75rem; color: var(--color-text-muted); }
    
    .btn-primary {
      background: var(--color-accent); color: white; border: none;
      padding: 0.75rem 1.5rem; border-radius: var(--radius-md); 
      font-weight: 600; cursor: pointer; font-size: 0.95rem;
      transition: all 0.2s;
    }
    .btn-primary:hover { background: var(--color-accent-dark); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    
    .btn-secondary {
      background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border);
      padding: 0.75rem 1.25rem; border-radius: var(--radius-md); 
      font-weight: 500; cursor: pointer; font-size: 0.95rem;
      transition: all 0.2s;
    }
    .btn-secondary:hover { background: #e2e8f0; }
    
    .btn-cancelar-turno {
      background: var(--color-danger); color: white; border: none;
      padding: 0.75rem 1.25rem; border-radius: var(--radius-md); 
      font-weight: 600; cursor: pointer; font-size: 0.95rem;
    }
    
    .error-msg {
      background: #fef2f2; color: #991b1b; border: 1px solid #fecaca;
      border-radius: var(--radius-md); padding: 0.75rem 1rem; 
      font-size: 0.9rem; margin-top: 1rem;
    }
    
    .loading { text-align: center; padding: 3rem; color: var(--color-text-muted); font-size: 1.1rem; }
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
        // Keep current hora if possible
        const currentHora = this.nuevoTurno.hora;
        this.cargarDisponibilidad();
        // After loading, if we had a hora selected, try to keep it if still valid
        if (currentHora && this.disponibilidad()) {
          const slot = this.disponibilidad()?.slots?.find((s: SlotHorario) => s.hora === currentHora);
          if (slot && slot.cuposDisponibles > 0) {
            // Keep the hora
            this.nuevoTurno.hora = currentHora;
            // If there is exactly one professional, auto-select
            if (slot.profesionalesLibres.length === 1) {
              this.nuevoTurno.profesionalId = slot.profesionalesLibres[0].id;
            } else {
              // Otherwise clear professional selection so user must choose
              this.nuevoTurno.profesionalId = null;
            }
          } else {
            // Slot no longer available, clear hora and professional
            this.nuevoTurno.hora = '';
            this.nuevoTurno.profesionalId = null;
          }
        }
      }
    }

    cargarDisponibilidad() {
      this.turnoService.getDisponibles(
        this.nuevoTurno.fecha,
        this.nuevoTurno.categoriaId!
      ).subscribe(d => {
        this.disponibilidad.set(d);
        // Do not reset hora and professionalId here; they are set by the caller
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
    console.log(this.nuevoTurno)
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
