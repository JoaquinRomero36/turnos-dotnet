import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../../shared/components/layout.component';
import { ProfesionalService, CategoriaService } from '../../core/auth/services';
import { Profesional, Categoria, CrearProfesionalRequest } from '../../core/models/models';

@Component({
  selector: 'app-profesionales',
  standalone: true,
  imports: [LayoutComponent, FormsModule],
  template: `
    <app-layout>
      <div class="profesionales-page">
        <div class="page-header">
          <h1>Gestión de Profesionales</h1>
          <button class="btn-primary" (click)="abrirModal()">➕ Nuevo Profesional</button>
        </div>

        <!-- Filtros -->
        <div class="filters">
          <select [(ngModel)]="filtroCat" (ngModelChange)="cargar()">
            <option [ngValue]="null">Todas las categorías</option>
            @for (cat of categorias(); track cat.id) {
              <option [ngValue]="cat.id">{{ cat.nombre }}</option>
            }
          </select>
        </div>

        <!-- Tabla -->
        @if (loading()) {
          <div class="loading">Cargando...</div>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Profesional</th>
                  <th>Matrícula</th>
                  <th>Categoría</th>
                  <th>Usuario</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (p of profesionales(); track p.id) {
                  <tr>
                    <td>
                      <div class="prof-name">{{ p.nombreCompleto }}</div>
                    </td>
                    <td><code>{{ p.matricula }}</code></td>
                    <td>
                      <span class="cat-badge cat-{{ p.categoria.id }}">{{ p.categoria.nombre }}</span>
                    </td>
                    <td>{{ p.username }}</td>
                    <td>
                      <span class="estado-badge" [class.activo]="p.activo" [class.inactivo]="!p.activo">
                        {{ p.activo ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      <div class="action-btns">
                        <button class="btn-edit" (click)="editar(p)">✏️</button>
                        @if (p.activo) {
                          <button class="btn-delete" (click)="desactivar(p)" title="Desactivar">🚫</button>
                        }
                      </div>
                    </td>
                  </tr>
                }
                @if (profesionales().length === 0) {
                  <tr><td colspan="6" class="empty">No hay profesionales registrados</td></tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- Modal -->
        @if (modal()) {
          <div class="modal-overlay" (click)="cerrarModal()">
            <div class="modal" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h2>{{ editandoId() ? 'Editar' : 'Nuevo' }} Profesional</h2>
                <button class="btn-close" (click)="cerrarModal()">✕</button>
              </div>
              <div class="modal-body">
                <div class="form-row">
                  <div class="form-group">
                    <label>Nombre *</label>
                    <input type="text" [(ngModel)]="form.nombre" />
                  </div>
                  <div class="form-group">
                    <label>Apellido *</label>
                    <input type="text" [(ngModel)]="form.apellido" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Matrícula *</label>
                    <input type="text" [(ngModel)]="form.matricula" placeholder="MP-XXXXX" />
                  </div>
                  <div class="form-group">
                    <label>Categoría *</label>
                    <select [(ngModel)]="form.categoriaId">
                      <option [ngValue]="0">Seleccionar...</option>
                      @for (cat of categorias(); track cat.id) {
                        <option [ngValue]="cat.id">{{ cat.nombre }}</option>
                      }
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Username *</label>
                    <input type="text" [(ngModel)]="form.username" [disabled]="!!editandoId()" />
                  </div>
                  <div class="form-group">
                    <label>Contraseña {{ editandoId() ? '(dejar vacío para no cambiar)' : '*' }}</label>
                    <input type="password" [(ngModel)]="form.password" />
                  </div>
                </div>
                @if (errorModal()) {
                  <div class="error-msg">{{ errorModal() }}</div>
                }
              </div>
              <div class="modal-footer">
                <button class="btn-primary" (click)="guardar()" [disabled]="guardando()">
                  {{ guardando() ? 'Guardando...' : '✅ Guardar' }}
                </button>
                <button class="btn-secondary" (click)="cerrarModal()">Cancelar</button>
              </div>
            </div>
          </div>
        }
      </div>
    </app-layout>
  `,
  styles: [`
    .profesionales-page { max-width: 1100px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1.5rem;
    }
    h1 { color: #1e3a5f; margin: 0; }
    .btn-primary {
      background: #2e75b6; color: white; border: none;
      padding: 0.65rem 1.25rem; border-radius: 8px; font-weight: 600; cursor: pointer;
    }
    .filters { margin-bottom: 1rem; }
    .filters select { padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 8px; }
    .table-wrap {
      background: white; border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    th {
      background: #1e3a5f; color: white;
      padding: 0.85rem 1rem; text-align: left; font-size: 0.85rem;
    }
    td { padding: 0.85rem 1rem; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8f9fb; }
    .prof-name { font-weight: 600; color: #1e3a5f; }
    code { background: #f0f4f8; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.8rem; }
    .cat-badge {
      padding: 0.25rem 0.6rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600;
    }
    .cat-1 { background: #dbeafe; color: #1e40af; }
    .cat-2 { background: #dcfce7; color: #166534; }
    .cat-3 { background: #fce7f3; color: #831843; }
    .cat-4 { background: #fef3c7; color: #92400e; }
    .estado-badge {
      padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.78rem; font-weight: 600;
    }
    .estado-badge.activo { background: #dcfce7; color: #166534; }
    .estado-badge.inactivo { background: #fee2e2; color: #991b1b; }
    .action-btns { display: flex; gap: 0.4rem; }
    .btn-edit, .btn-delete {
      background: none; border: 1px solid #e0e0e0; border-radius: 6px;
      padding: 0.3rem 0.5rem; cursor: pointer; font-size: 0.9rem;
    }
    .btn-edit:hover { background: #f0f7ff; }
    .btn-delete:hover { background: #fff0f0; }
    .empty { text-align: center; color: #999; padding: 2rem; }
    .loading { text-align: center; padding: 3rem; color: #666; }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .modal {
      background: white; border-radius: 12px; width: 100%; max-width: 560px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1.25rem 1.5rem; border-bottom: 1px solid #e0e0e0;
    }
    .modal-header h2 { margin: 0; color: #1e3a5f; }
    .btn-close { background: none; border: none; font-size: 1.1rem; cursor: pointer; }
    .modal-body { padding: 1.25rem 1.5rem; }
    .modal-footer {
      padding: 1rem 1.5rem; border-top: 1px solid #e0e0e0;
      display: flex; gap: 0.75rem; justify-content: flex-end;
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .form-group { margin-bottom: 0.75rem; }
    .form-group label { display: block; font-size: 0.82rem; font-weight: 600; color: #444; margin-bottom: 0.3rem; }
    .form-group input, .form-group select {
      width: 100%; padding: 0.6rem 0.75rem; border: 2px solid #e0e0e0;
      border-radius: 7px; font-size: 0.9rem; box-sizing: border-box;
    }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: #2e75b6; }
    .btn-secondary {
      background: #f0f4f8; color: #444; border: none;
      padding: 0.7rem 1.25rem; border-radius: 8px; font-weight: 600; cursor: pointer;
    }
    .error-msg {
      background: #fdecea; color: #c62828; border-radius: 6px;
      padding: 0.6rem 0.75rem; font-size: 0.85rem;
    }
  `]
})
export class ProfesionalesComponent implements OnInit {
  profesionales = signal<Profesional[]>([]);
  categorias = signal<Categoria[]>([]);
  loading = signal(false);
  modal = signal(false);
  editandoId = signal<number | null>(null);
  errorModal = signal('');
  guardando = signal(false);
  filtroCat: number | null = null;

  form: CrearProfesionalRequest = this.initForm();

  constructor(
    private profesionalService: ProfesionalService,
    private categoriaService: CategoriaService
  ) {}

  ngOnInit() {
    this.categoriaService.getAll().subscribe(c => this.categorias.set(c));
    this.cargar();
  }

  cargar() {
    this.loading.set(true);
    this.profesionalService.getAll(this.filtroCat ?? undefined).subscribe({
      next: p => { this.profesionales.set(p); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  abrirModal() { this.form = this.initForm(); this.editandoId.set(null); this.modal.set(true); }

  editar(p: Profesional) {
    this.form = {
      nombre: p.nombre, apellido: p.apellido,
      matricula: p.matricula, categoriaId: p.categoria.id,
      username: p.username, password: ''
    };
    this.editandoId.set(p.id);
    this.modal.set(true);
  }

  cerrarModal() { this.modal.set(false); this.errorModal.set(''); }

  guardar() {
    if (!this.form.nombre || !this.form.apellido || !this.form.matricula || !this.form.categoriaId) {
      this.errorModal.set('Complete todos los campos obligatorios');
      return;
    }
    this.guardando.set(true);
    const obs = this.editandoId()
      ? this.profesionalService.actualizar(this.editandoId()!, this.form)
      : this.profesionalService.crear(this.form);

    obs.subscribe({
      next: () => { this.cerrarModal(); this.cargar(); this.guardando.set(false); },
      error: (err) => { this.errorModal.set(err.error?.mensaje || 'Error al guardar'); this.guardando.set(false); }
    });
  }

  desactivar(p: Profesional) {
    if (!confirm(`¿Desactivar a ${p.nombreCompleto}?`)) return;
    this.profesionalService.desactivar(p.id).subscribe(() => this.cargar());
  }

  initForm(): CrearProfesionalRequest {
    return { nombre: '', apellido: '', matricula: '', categoriaId: 0, username: '', password: '' };
  }
}
