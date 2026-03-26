import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../../shared/components/layout.component';
import { TurnoService, ProfesionalService, CategoriaService } from '../../core/auth/services';
import { Turno, Profesional, Categoria } from '../../core/models/models';

@Component({
  selector: 'app-cancelaciones',
  standalone: true,
  imports: [FormsModule, LayoutComponent],
  template: `
    <app-layout>
      <div class="page-header">
        <div class="header-title">
          <h2>Historial de Cancelaciones</h2>
          <p class="subtitle">Gestión y seguimiento de turnos cancelados</p>
        </div>
        <div class="filters-container">
          <div class="filter-box">
            <label class="filter-label">
              Profesional
            </label>
            <select [(ngModel)]="filtroProfesional" (ngModelChange)="cargarCancelaciones()" class="filter-select">
              <option [ngValue]="null">Todos los profesionales</option>
              @for (prof of profesionales(); track prof.id) {
                <option [ngValue]="prof.id">{{ prof.nombreCompleto }}</option>
              }
            </select>
          </div>
          <div class="filter-box">
            <label class="filter-label">
              Categoría
            </label>
            <select [(ngModel)]="filtroCategoria" (ngModelChange)="cargarCancelaciones()" class="filter-select">
              <option [ngValue]="null">Todas las categorías</option>
              @for (cat of categorias(); track cat.id) {
                <option [ngValue]="cat.id">{{ cat.nombre }}</option>
              }
            </select>
          </div>
          @if (filtroProfesional || filtroCategoria) {
            <button class="btn-clear" (click)="limpiarFiltros()">✕</button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="loading">Cargando...</div>
      } @else {
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha Cancelación</th>
                <th>Fecha Turno</th>
                <th>Hora</th>
                <th>Profesional</th>
                <th>Paciente</th>
                <th>Categoría</th>
                <th>Motivo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (turno of cancelaciones(); track turno.id) {
                <tr>
                  <td>{{ formatDate(turno.canceladoAt!) }}</td>
                  <td>{{ formatDate(turno.fechaHora) }}</td>
                  <td>{{ formatTime(turno.fechaHora) }}</td>
                  <td>{{ turno.profesional.nombreCompleto }}</td>
                  <td>{{ turno.paciente.nombreCompleto }}</td>
                  <td>{{ turno.categoria.nombre }}</td>
                  <td>
                    @if (editId() === turno.id) {
                      <input type="text" [(ngModel)]="editMotivo" class="edit-input" />
                    } @else {
                      <span class="motivo-text">{{ turno.motivoCancelacion || 'Sin motivo' }}</span>
                    }
                  </td>
                  <td>
                    @if (editId() === turno.id) {
                      <button class="btn-save" (click)="guardarMotivo(turno)">Guardar</button>
                      <button class="btn-cancel" (click)="cancelarEdicion()">Cancelar</button>
                    } @else {
                      <button class="btn-edit" (click)="iniciarEdicion(turno)">Editar</button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="no-data">No hay cancelaciones registradas.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <button (click)="paginaAnterior()" [disabled]="skip() === 0">← Anteriores</button>
          <span>Página {{ (skip() / 10) + 1 }}</span>
          <button (click)="paginaSiguiente()" [disabled]="cancelaciones().length < 10">Siguientes →</button>
        </div>
      }
    </app-layout>
  `,
  styles: [`
    .page-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1.5rem 2rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }
    .header-title h2 {
      margin: 0;
      color: white;
      font-size: 1.5rem;
      font-weight: 600;
    }
    .subtitle {
      margin: 0.25rem 0 0;
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.9rem;
    }
    .filters-container {
      display: flex;
      gap: 1rem;
      align-items: flex-end;
    }
    .filter-box {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .filter-label {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .filter-icon {
      font-size: 0.9rem;
    }
    .filter-select {
      padding: 0.6rem 2rem 0.6rem 0.75rem;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.95);
      font-size: 0.9rem;
      min-width: 200px;
      cursor: pointer;
      color: #333;
      appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 0.5rem center;
      background-size: 1em;
      transition: all 0.2s ease;
    }
    .filter-select:hover {
      border-color: white;
      background-color: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .filter-select:focus {
      outline: none;
      border-color: white;
      background-color: white;
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
    }
    .filter-select option {
      padding: 0.5rem;
    }
    .btn-clear {
      padding: 0.6rem 0.75rem;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.2s ease;
      line-height: 1;
    }
    .btn-clear:hover {
      background: rgba(255, 255, 255, 0.3);
      border-color: white;
    }
    .table-container {
      overflow-x: auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    .data-table th, .data-table td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    .data-table th {
      background: #f8f9fa;
      font-weight: 600;
      color: #495057;
    }
    .data-table tr:hover {
      background: #f1f3f5;
    }
    .no-data {
      text-align: center;
      padding: 2rem;
      color: #666;
    }
    .motivo-text {
      max-width: 200px;
      display: inline-block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      vertical-align: middle;
    }
    .edit-input {
      width: 100%;
      padding: 0.25rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    .btn-edit, .btn-save, .btn-cancel {
      padding: 0.25rem 0.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      margin-right: 0.25rem;
    }
    .btn-edit { background: #e2e8f0; color: #334155; }
    .btn-save { background: #2563eb; color: white; }
    .btn-cancel { background: #ef4444; color: white; }
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      margin-top: 1.5rem;
    }
    .pagination button {
      padding: 0.5rem 1rem;
      border: 1px solid #ccc;
      background: white;
      border-radius: 4px;
      cursor: pointer;
    }
    .pagination button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class CancelacionesComponent implements OnInit {
  cancelaciones = signal<Turno[]>([]);
  profesionales = signal<Profesional[]>([]);
  categorias = signal<Categoria[]>([]);
  loading = signal(false);
  filtroProfesional: number | null = null;
  filtroCategoria: number | null = null;
  skip = signal(0);
  editId = signal<number | null>(null);
  editMotivo = '';

  constructor(
    private turnoService: TurnoService,
    private profesionalService: ProfesionalService,
    private categoriaService: CategoriaService
  ) {}

  ngOnInit() {
    this.profesionalService.getAll().subscribe(prof => this.profesionales.set(prof));
    this.categoriaService.getAll().subscribe(cat => this.categorias.set(cat));
    this.cargarCancelaciones();
  }

  cargarCancelaciones() {
    this.loading.set(true);
    this.turnoService.getCancelaciones(this.filtroProfesional ?? undefined, this.filtroCategoria ?? undefined, this.skip(), 10)
      .subscribe({
        next: (data) => {
          this.cancelaciones.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  limpiarFiltros() {
    this.filtroProfesional = null;
    this.filtroCategoria = null;
    this.skip.set(0);
    this.cargarCancelaciones();
  }

  paginaAnterior() {
    if (this.skip() > 0) {
      this.skip.update(v => v - 10);
      this.cargarCancelaciones();
    }
  }

  paginaSiguiente() {
    this.skip.update(v => v + 10);
    this.cargarCancelaciones();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-AR');
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  iniciarEdicion(turno: Turno) {
    this.editId.set(turno.id);
    this.editMotivo = turno.motivoCancelacion || '';
  }

  cancelarEdicion() {
    this.editId.set(null);
    this.editMotivo = '';
  }

  guardarMotivo(turno: Turno) {
    // En una implementación real, esto haría una llamada a una API para actualizar el motivo.
    // Por ahora, actualizamos localmente para demostrar la funcionalidad.
    turno.motivoCancelacion = this.editMotivo;
    this.cancelarEdicion();
  }
}
