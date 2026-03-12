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
    .dashboard { max-width: 1100px; }
    .page-header { margin-bottom: 2rem; }
    .page-header h1 { font-size: 1.75rem; color: #1e3a5f; margin: 0 0 0.25rem; }
    .page-header p { color: #666; margin: 0; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      border-left: 4px solid;
    }
    .stat-card.blue  { border-color: #2e75b6; }
    .stat-card.green { border-color: #1f7a4d; }
    .stat-card.orange{ border-color: #c05500; }
    .stat-card.purple{ border-color: #5b2d8e; }
    .stat-icon { font-size: 2rem; }
    .stat-value { font-size: 2rem; font-weight: 700; color: #1e3a5f; line-height: 1; }
    .stat-label { font-size: 0.8rem; color: #666; margin-top: 0.2rem; }

    .section-title {
      font-size: 1rem; font-weight: 700; color: #1e3a5f;
      margin: 1.5rem 0 0.75rem;
    }
    .quick-actions {
      display: flex; flex-wrap: wrap; gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .action-btn {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.7rem 1.25rem; border-radius: 8px;
      font-weight: 600; text-decoration: none; font-size: 0.9rem;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .action-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .action-btn.primary   { background: #2e75b6; color: white; }
    .action-btn.success   { background: #1f7a4d; color: white; }
    .action-btn.secondary { background: #5b2d8e; color: white; }
    .action-btn.info      { background: #c05500; color: white; }

    .turnos-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .turno-card {
      background: white; border-radius: 8px; padding: 0.85rem 1rem;
      display: flex; align-items: center; gap: 1rem;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .turno-hora {
      font-size: 1.1rem; font-weight: 700; color: #2e75b6;
      min-width: 55px;
    }
    .turno-info { flex: 1; }
    .turno-paciente { font-weight: 600; color: #1e3a5f; font-size: 0.9rem; }
    .turno-profesional { color: #666; font-size: 0.8rem; }
    .turno-cat {
      padding: 0.25rem 0.6rem; border-radius: 20px;
      font-size: 0.75rem; font-weight: 600;
    }
    .cat-1 { background: #dbeafe; color: #1e40af; }
    .cat-2 { background: #dcfce7; color: #166534; }
    .cat-3 { background: #fce7f3; color: #831843; }
    .cat-4 { background: #fef3c7; color: #92400e; }

    .empty-state {
      text-align: center; padding: 3rem;
      background: white; border-radius: 12px;
    }
    .empty-icon { font-size: 3rem; margin-bottom: 0.5rem; }
    .empty-state p { color: #666; }
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
