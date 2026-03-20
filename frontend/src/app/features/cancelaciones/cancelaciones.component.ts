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
        <h2>Historial de Cancelaciones</h2>
        <div class="filters">
          <select [(ngModel)]="filtroProfesional" (ngModelChange)="cargarCancelaciones()" class="filter-select">
            <option [ngValue]="null">Todos los profesionales</option>
            @for (prof of profesionales(); track prof.id) {
              <option [ngValue]="prof.id">{{ prof.nombreCompleto }}</option>
            }
          </select>
          <select [(ngModel)]="filtroCategoria" (ngModelChange)="cargarCancelaciones()" class="filter-select">
            <option [ngValue]="null">Todas las categorías</option>
            @for (cat of categorias(); track cat.id) {
              <option [ngValue]="cat.id">{{ cat.nombre }}</option>
            }
          </select>
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
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .filter-select {
      padding: 0.5rem;
      border-radius: 4px;
      border: 1px solid #ccc;
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
