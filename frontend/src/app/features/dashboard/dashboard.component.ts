import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LayoutComponent } from '../../shared/components/layout.component';
import { TurnoService } from '../../core/auth/services';
import { CategoriaService } from '../../core/auth/services';
import { AuthService } from '../../core/auth/auth.service';
import { Turno, Categoria } from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [LayoutComponent, RouterLink],
  template: `
    <app-layout>
      <div class="dashboard">
        <div class="page-header">
          <h1>Dashboard</h1>
          <p>Bienvenido/a, <strong>{{ userName() }}</strong> — {{ hoy() }}</p>
        </div>

        <!-- Stats cards -->
        <div class="stats-grid">
          <div class="stat-card blue">
            <div class="stat-icon">📅</div>
            <div class="stat-info">
              <div class="stat-value">{{ turnosHoy().length }}</div>
              <div class="stat-label">Turnos hoy</div>
            </div>
          </div>
          <div class="stat-card green">
            <div class="stat-icon">✅</div>
            <div class="stat-info">
              <div class="stat-value">{{ turnosActivos().length }}</div>
              <div class="stat-label">Activos</div>
            </div>
          </div>
          <div class="stat-card orange">
            <div class="stat-icon">🕐</div>
            <div class="stat-info">
              <div class="stat-value">{{ cuposDisponiblesHoy() }}</div>
              <div class="stat-label">Cupos disponibles hoy</div>
            </div>
          </div>
          @if (isSecretario()) {
            <div class="stat-card purple">
              <div class="stat-icon">👨‍⚕️</div>
              <div class="stat-info">
                <div class="stat-value">{{ categorias().length }}</div>
                <div class="stat-label">Categorías activas</div>
              </div>
            </div>
          }
        </div>

        <!-- Quick actions -->
        <div class="section-title">Acciones rápidas</div>
        <div class="quick-actions">
          <a routerLink="/calendario" class="action-btn primary">
            <span>📅</span> Ver Calendario
          </a>
          <a routerLink="/calendario" class="action-btn success">
            <span>➕</span> Nuevo Turno
          </a>
          @if (isSecretario()) {
            <a routerLink="/profesionales" class="action-btn secondary">
              <span>👨‍⚕️</span> Profesionales
            </a>
            <a routerLink="/estadisticas" class="action-btn info">
              <span>📈</span> Estadísticas
            </a>
          }
        </div>

        <!-- Turnos de hoy -->
        @if (turnosHoy().length > 0) {
          <div class="section-title">Próximos turnos de hoy</div>
          <div class="turnos-list">
            @for (turno of turnosHoy().slice(0, 5); track turno.id) {
              <div class="turno-card">
                <div class="turno-hora">{{ formatHora(turno.fechaHora) }}</div>
                <div class="turno-info">
                  <div class="turno-paciente">{{ turno.paciente.nombreCompleto }}</div>
                  <div class="turno-profesional">{{ turno.profesional.nombreCompleto }}</div>
                </div>
                <div class="turno-cat" [class]="'cat-' + turno.categoria.id">
                  {{ turno.categoria.nombre }}
                </div>
              </div>
            }
          </div>
        } @else if (!loading()) {
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            <p>No hay turnos para hoy</p>
          </div>
        }
      </div>
    </app-layout>
  `,
  styles: [`
    .dashboard { max-width: 1200px; margin: 0 auto; }
    .page-header { margin-bottom: 2rem; }
    .page-header h1 { font-size: 2rem; color: var(--color-primary); margin: 0 0 0.25rem; font-weight: 700; }
    .page-header p { color: var(--color-text-muted); margin: 0; font-size: 0.95rem; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--color-border);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .stat-card.blue  { border-top: 4px solid var(--color-accent); }
    .stat-card.green { border-top: 4px solid var(--color-success); }
    .stat-card.orange{ border-top: 4px solid var(--color-warning); }
    .stat-card.purple{ border-top: 4px solid #8b5cf6; }
    .stat-icon { 
      width: 48px; height: 48px; border-radius: 12px; 
      display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem;
    }
    .stat-card.blue .stat-icon  { background: #eff6ff; color: var(--color-accent); }
    .stat-card.green .stat-icon { background: #f0fdf4; color: var(--color-success); }
    .stat-card.orange .stat-icon { background: #fffbeb; color: var(--color-warning); }
    .stat-card.purple .stat-icon { background: #f5f3ff; color: #8b5cf6; }
    
    .stat-value { font-size: 2rem; font-weight: 700; color: var(--color-primary); line-height: 1; }
    .stat-label { font-size: 0.85rem; color: var(--color-text-muted); margin-top: 0.2rem; }

    .section-title {
      font-size: 1.1rem; font-weight: 700; color: var(--color-primary);
      margin: 1.5rem 0 1rem;
    }
    .quick-actions {
      display: flex; flex-wrap: wrap; gap: 0.75rem;
      margin-bottom: 2rem;
    }
    .action-btn {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem 1.25rem; border-radius: var(--radius-md);
      font-weight: 600; text-decoration: none; font-size: 0.95rem;
      transition: all 0.2s; box-shadow: var(--shadow-sm);
    }
    .action-btn:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .action-btn.primary   { background: var(--color-accent); color: white; }
    .action-btn.success   { background: var(--color-success); color: white; }
    .action-btn.secondary { background: #8b5cf6; color: white; }
    .action-btn.info      { background: var(--color-warning); color: white; }

    .turnos-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .turno-card {
      background: var(--color-surface); border-radius: var(--radius-md); 
      padding: 1rem 1.25rem;
      display: flex; align-items: center; gap: 1.25rem;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--color-border);
    }
    .turno-hora {
      font-size: 1.1rem; font-weight: 700; color: var(--color-accent);
      min-width: 60px;
    }
    .turno-info { flex: 1; }
    .turno-paciente { font-weight: 600; color: var(--color-primary); font-size: 0.95rem; }
    .turno-profesional { color: var(--color-text-muted); font-size: 0.85rem; margin-top: 2px; }
    .turno-cat {
      padding: 0.3rem 0.7rem; border-radius: 20px;
      font-size: 0.8rem; font-weight: 600;
    }
    .cat-1 { background: #eff6ff; color: #1e40af; }
    .cat-2 { background: #f0fdf4; color: #166534; }
    .cat-3 { background: #fdf2f8; color: #9d174d; }
    .cat-4 { background: #fffbeb; color: #92400e; }

    .empty-state {
      text-align: center; padding: 3rem;
      background: var(--color-surface); border-radius: var(--radius-lg);
      border: 1px dashed var(--color-border);
    }
    .empty-icon { font-size: 3rem; margin-bottom: 0.5rem; opacity: 0.5; }
    .empty-state p { color: var(--color-text-muted); }
  `]
})
export class DashboardComponent implements OnInit {
  turnosHoy = signal<Turno[]>([]);
  categorias = signal<Categoria[]>([]);
  loading = signal(true);

  constructor(
    private turnoService: TurnoService,
    private categoriaService: CategoriaService,
    private authService: AuthService
  ) {}

  isSecretario = this.authService.isSecretario;
  userName = computed(() => this.authService.currentUser()?.nombre ?? '');

  hoy() {
    return new Date().toLocaleDateString('es-AR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  turnosActivos = computed(() => this.turnosHoy().filter(t => t.estado === 'Activo'));

  cuposDisponiblesHoy = computed(() => {
    // 4 horas x 4 categorías x 3 cupos = 48 total, menos los ocupados
    const ocupados = this.turnosHoy().length;
    return Math.max(0, 48 - ocupados);
  });

  formatHora(fechaHora: string): string {
    return new Date(fechaHora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  ngOnInit() {
    const hoy = new Date().toISOString().split('T')[0];

    this.turnoService.getCalendario(hoy, hoy).subscribe({
      next: (t) => { this.turnosHoy.set(t); this.loading.set(false); },
      error: () => this.loading.set(false)
    });

    this.categoriaService.getAll().subscribe(c => this.categorias.set(c));
  }
}
