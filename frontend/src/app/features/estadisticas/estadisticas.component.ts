import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../../shared/components/layout.component';
import { EstadisticaService } from '../../core/auth/services';
import { Estadisticas } from '../../core/models/models';

// ── Paleta de colores por categoría ─────────────────────────
const CAT_COLORS: Record<string, { fill: string; stroke: string; light: string }> = {
  'Traumatología':       { fill: '#2563eb', stroke: '#1d4ed8', light: '#dbeafe' },
  'Cardio Respiratorio': { fill: '#16a34a', stroke: '#15803d', light: '#dcfce7' },
  'Neurología':          { fill: '#db2777', stroke: '#be185d', light: '#fce7f3' },
  'Dermatofuncional':    { fill: '#d97706', stroke: '#b45309', light: '#fef3c7' },
};
const DEFAULT_COLOR = { fill: '#6366f1', stroke: '#4f46e5', light: '#e0e7ff' };

// Mapa de abreviaturas para los KPIs (definido fuera para ser estático)
const CAT_ABBREVIATIONS: Record<string, string> = {
  'Traumatología': 'Traumato',
  'Cardio Respiratorio': 'Cardio',
  'Neurología': 'Neuro',
  'Dermatofuncional': 'Dermato',
};

function catColor(nombre: string) {
  return CAT_COLORS[nombre] ?? DEFAULT_COLOR;
}

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [LayoutComponent, FormsModule],
  template: `
    <app-layout>
      <div class="est-page">

        <!-- ── HEADER ── -->
        <div class="page-header">
          <div>
            <h1>Estadísticas</h1>
            <p class="subtitle">Análisis de turnos por período</p>
          </div>
          <div class="date-filters">
            <div class="filter-group">
              <label>Desde</label>
              <input type="date" [(ngModel)]="desde" />
            </div>
            <div class="filter-group">
              <label>Hasta</label>
              <input type="date" [(ngModel)]="hasta" />
            </div>
            <button class="btn-refresh" (click)="cargar()">
              <span class="refresh-icon">↻</span> Actualizar
            </button>
          </div>
        </div>

        @if (error()) {
          <div class="error-state">
            <div class="error-icon">⚠️</div>
            <p>{{ error() }}</p>
            <button class="btn-retry" (click)="cargar()">Reintentar</button>
          </div>
        } @else if (loading()) {
          <div class="loading-state">
            <div class="spinner-lg"></div>
            <p>Cargando estadísticas...</p>
          </div>
        } @else if (stats()) {

          <!-- ── KPI CARDS ── -->
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-header">
                <div class="kpi-icon blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div>
                  <div class="kpi-value">{{ stats()!.totalGeneral }}</div>
                  <div class="kpi-label">Total de turnos</div>
                </div>
              </div>
              <div class="kpi-trend blue">En el período</div>
            </div>
            
            <div class="kpi-card">
              <div class="kpi-header">
                <div class="kpi-icon green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <div>
                  <div class="kpi-value" style="color:var(--color-success)">{{ stats()!.totalActivos }}</div>
                  <div class="kpi-label">Activos</div>
                </div>
              </div>
              <div class="kpi-trend green">{{ tasaAsistencia() }}% efectividad</div>
            </div>
            
            <div class="kpi-card">
              <div class="kpi-header">
                <div class="kpi-icon red">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </div>
                <div>
                  <div class="kpi-value" style="color:var(--color-danger)">{{ stats()!.totalCancelados }}</div>
                  <div class="kpi-label">Cancelados</div>
                </div>
              </div>
              <div class="kpi-trend red">{{ tasaCancelacion() }}% cancelación</div>
            </div>
            
            <div class="kpi-card">
              <div class="kpi-header">
                <div class="kpi-icon orange">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </div>
                <div class="kpi-text-content">
                  <div class="kpi-value-categoria" style="color:var(--color-warning)">{{ abbreviateCategory(categoriaTop()) }}</div>
                  <div class="kpi-label">Categoría más demandada</div>
                </div>
              </div>
              <div class="kpi-trend orange">{{ cantidadTop() }} turnos</div>
            </div>
          </div>

          <!-- ── ROW 1: Barras categorías + Dona ── -->
          <div class="charts-row">

            <!-- Gráfico de barras horizontales -->
            <div class="chart-card wide">
              <div class="chart-header">
                <h2>Turnos por Categoría</h2>
                <span class="chart-sub">Período seleccionado</span>
              </div>
              <div class="bar-chart-area">
                @for (cat of stats()!.porCategoria; track cat.categoria) {
                  <div class="hbar-row">
                    <div class="hbar-label">{{ cat.categoria }}</div>
                    <div class="hbar-track">
                      <div
                        class="hbar-fill"
                        [style.width.%]="cat.porcentaje"
                        [style.background]="catFill(cat.categoria)"
                        [style.min-width.px]="cat.cantidad > 0 ? 40 : 0"
                      >
                        @if (cat.cantidad > 0) {
                          <span class="hbar-val">{{ cat.cantidad }}</span>
                        }
                      </div>
                    </div>
                    <div class="hbar-pct">{{ cat.porcentaje }}%</div>
                  </div>
                }
                @if (stats()!.porCategoria.length === 0) {
                  <div class="no-data">Sin datos en el período</div>
                }
              </div>
            </div>

            <!-- Gráfico dona SVG -->
            <div class="chart-card narrow">
              <div class="chart-header">
                <h2>Distribución</h2>
                <span class="chart-sub">Por categoría</span>
              </div>
              <div class="donut-wrap">
                <svg viewBox="0 0 200 200" class="donut-svg">
                  @for (seg of donutSegments(); track seg.categoria) {
                    <path
                      [attr.d]="seg.path"
                      [attr.fill]="seg.fill"
                      [attr.stroke]="seg.stroke"
                      stroke-width="2"
                      class="donut-seg"
                    />
                  }
                  <!-- Centro -->
                  <circle cx="100" cy="100" r="52" fill="white"/>
                  <text x="100" y="95" text-anchor="middle" class="donut-center-val">
                    {{ stats()!.totalActivos }}
                  </text>
                  <text x="100" y="113" text-anchor="middle" class="donut-center-lbl">activos</text>
                </svg>
                <!-- Leyenda -->
                <div class="donut-legend">
                  @for (seg of donutSegments(); track seg.categoria) {
                    <div class="legend-item">
                      <span class="legend-dot" [style.background]="seg.fill"></span>
                      <span class="legend-name">{{ seg.categoria }}</span>
                      <span class="legend-val">{{ seg.cantidad }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- ── ROW 2: Barras verticales por hora + Línea tendencia ── -->
          <div class="charts-row">

            <!-- Barras verticales por franja horaria -->
            <div class="chart-card medium">
              <div class="chart-header">
                <h2>Ocupación por Franja Horaria</h2>
                <span class="chart-sub">Turnos activos</span>
              </div>
              <div class="vbar-chart">
                <svg [attr.viewBox]="'0 0 ' + vbarWidth + ' ' + vbarHeight" class="vbar-svg">
                  <!-- Grid lines -->
                  @for (line of yGridLines(); track line.y) {
                    <line
                      [attr.x1]="vbarPad"
                      [attr.y1]="line.y"
                      [attr.x2]="vbarWidth - vbarPad"
                      [attr.y2]="line.y"
                      stroke="#f0f0f0" stroke-width="1"
                    />
                    <text
                      [attr.x]="vbarPad - 6"
                      [attr.y]="line.y + 4"
                      text-anchor="end"
                      class="axis-label"
                    >{{ line.val }}</text>
                  }
                  <!-- Barras -->
                  @for (bar of vbars(); track bar.hora; let i = $index) {
                    <rect
                      [attr.x]="bar.x"
                      [attr.y]="bar.y"
                      [attr.width]="bar.width"
                      [attr.height]="bar.height"
                      rx="4"
                      [attr.fill]="bar.fill"
                      class="vbar-rect"
                    />
                    <!-- Valor encima de la barra -->
                    <text
                      [attr.x]="bar.x + bar.width / 2"
                      [attr.y]="bar.y - 5"
                      text-anchor="middle"
                      class="bar-val-label"
                    >{{ bar.cantidad }}</text>
                    <!-- Etiqueta hora -->
                    <text
                      [attr.x]="bar.x + bar.width / 2"
                      [attr.y]="vbarHeight - vbarPad + 16"
                      text-anchor="middle"
                      class="axis-label"
                    >{{ bar.hora }}</text>
                  }
                  <!-- Eje X -->
                  <line
                    [attr.x1]="vbarPad"
                    [attr.y1]="vbarHeight - vbarPad"
                    [attr.x2]="vbarWidth - vbarPad"
                    [attr.y2]="vbarHeight - vbarPad"
                    stroke="#ccc" stroke-width="1.5"
                  />
                </svg>
                <!-- Capacidad máxima indicada -->
                <div class="cap-note">
                  Capacidad máxima por hora: <strong>12 turnos</strong>
                  (4 categorías × 3 cupos)
                </div>
              </div>
            </div>

            <!-- Top 3 Profesionales -->
            <div class="chart-card medium">
              <div class="chart-header">
                <h2>Top Profesionales</h2>
                <span class="chart-sub">Rendimiento en el período</span>
              </div>
              
              <div class="profesionales-grid">
                <!-- Más cancelados -->
                <div class="prof-group">
                  <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    Más cancelados
                  </h3>
                  @if (stats()!.topProfesionalesCancelados.length > 0) {
                    @for (pro of stats()!.topProfesionalesCancelados; track pro.id; let i = $index) {
                      <div class="prof-item">
                        <span class="prof-rank">#{{ i + 1 }}</span>
                        <span class="prof-name">{{ pro.nombreCompleto }}</span>
                        <span class="prof-count red">{{ pro.cantidad }} cancelados</span>
                      </div>
                    }
                  } @else {
                    <div class="no-data">Sin datos</div>
                  }
                </div>

                <!-- Menos cancelados (más eficientes) -->
                <div class="prof-group">
                  <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Menos cancelados
                  </h3>
                  @if (stats()!.topProfesionalesActivos.length > 0) {
                    @for (pro of stats()!.topProfesionalesActivos; track pro.id; let i = $index) {
                      <div class="prof-item">
                        <span class="prof-rank">#{{ i + 1 }}</span>
                        <span class="prof-name">{{ pro.nombreCompleto }}</span>
                        <span class="prof-count green">{{ pro.cantidad }} activos</span>
                      </div>
                    }
                  } @else {
                    <div class="no-data">Sin datos</div>
                  }
                </div>
              </div>
            </div>
          </div>

        } @else {
          <div class="empty-state">
            <div class="empty-icon">📊</div>
            <p>Seleccioná un período y hacé clic en Actualizar</p>
          </div>
        }
      </div>
    </app-layout>
  `,
  styles: [`
    /* ── Layout ── */
    .est-page { max-width: 1200px; margin: 0 auto; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;
    }
    h1 { color: var(--color-primary); margin: 0 0 0.25rem; font-size: 2rem; font-weight: 700; }
    .subtitle { color: var(--color-text-muted); margin: 0; font-size: 0.95rem; }
    h2 { color: var(--color-primary); margin: 0; font-size: 1.1rem; font-weight: 600; }
    .date-filters {
      display: flex; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap;
    }
    .filter-group { display: flex; flex-direction: column; gap: 0.3rem; }
    .filter-group label { font-size: 0.78rem; font-weight: 600; color: var(--color-text-muted); }
    .filter-group input {
      padding: 0.55rem 0.75rem; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: 0.9rem;
      background: var(--color-surface); color: var(--color-text);
    }
    .filter-group input:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
    .btn-refresh {
      display: flex; align-items: center; gap: 0.4rem;
      background: var(--color-accent); color: white; border: none;
      padding: 0.6rem 1.2rem; border-radius: var(--radius-md);
      font-weight: 600; font-size: 0.9rem; cursor: pointer;
      transition: all 0.2s;
    }
    .btn-refresh:hover { background: var(--color-accent-dark); transform: translateY(-1px); }
    .refresh-icon { font-size: 1.1rem; }

    /* ── KPI Cards ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem; margin-bottom: 1.5rem;
    }
    .kpi-card {
      background: var(--color-surface); border-radius: var(--radius-lg); padding: 1rem;
      box-shadow: var(--shadow-sm); border: 1px solid var(--color-border);
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 100px; /* Altura mínima para evitar compactación */
    }
    .kpi-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
    
    .kpi-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }
    
    .kpi-icon {
      width: 36px; height: 36px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .kpi-icon svg { width: 18px; height: 18px; }
    
    .kpi-value { 
      font-size: 1.5rem; 
      font-weight: 800; 
      color: var(--color-primary); 
      line-height: 1.1;
      margin-bottom: 0.1rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    /* Estilo específico para la categoría abreviada */
    .kpi-value-categoria {
      font-size: 1.2rem;
      font-weight: 800; 
      color: var(--color-warning); 
      line-height: 1.1;
      margin-bottom: 0.1rem;
    }
    
    .kpi-label { 
      font-size: 0.8rem; 
      color: var(--color-text-muted); 
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .kpi-text-content {
      display: flex;
      flex-direction: column;
      min-width: 0; /* Permite que el texto se contenga */
    }
    
    .kpi-trend {
      font-size: 0.7rem; font-weight: 600; padding: 0.25rem 0.5rem;
      border-radius: 20px; white-space: nowrap; 
      display: inline-block;
      margin-top: auto; /* Empuja hacia abajo */
      align-self: flex-start;
    }
    .kpi-trend.blue   { background: #eff6ff; color: var(--color-accent); }
    .kpi-trend.green  { background: #f0fdf4; color: var(--color-success); }
    .kpi-trend.red    { background: #fef2f2; color: var(--color-danger); }
    .kpi-trend.orange { background: #fffbeb; color: var(--color-warning); }

    /* ── Chart containers ── */
    .charts-row {
      display: flex; gap: 1.25rem; margin-bottom: 1.25rem; flex-wrap: wrap;
    }
    .chart-card {
      background: var(--color-surface); border-radius: var(--radius-lg); padding: 1.5rem;
      box-shadow: var(--shadow-sm); border: 1px solid var(--color-border);
      display: flex; flex-direction: column;
    }
    .chart-card.wide   { flex: 2; min-width: 340px; }
    .chart-card.narrow { flex: 1; min-width: 240px; }
    .chart-card.medium { flex: 1; min-width: 300px; }
    .chart-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1.25rem;
    }
    .chart-sub { font-size: 0.8rem; color: var(--color-text-muted); }

    /* ── Barras horizontales ── */
    .bar-chart-area { display: flex; flex-direction: column; gap: 1rem; }
    .hbar-row { display: flex; align-items: center; gap: 0.75rem; }
    .hbar-label {
      min-width: 140px; font-size: 0.85rem; font-weight: 600; color: var(--color-text);
      white-space: nowrap;
    }
    .hbar-track {
      flex: 1; height: 28px; background: var(--color-bg);
      border-radius: 14px; overflow: hidden;
    }
    .hbar-fill {
      height: 100%; border-radius: 14px;
      display: flex; align-items: center; padding-left: 0.75rem;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      min-width: 0;
    }
    .hbar-val { color: white; font-size: 0.8rem; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
    .hbar-pct {
      min-width: 45px; text-align: right;
      font-size: 0.85rem; font-weight: 600; color: var(--color-text-muted);
    }

    /* ── Gráfico dona ── */
    .donut-wrap {
      display: flex; flex-direction: column; align-items: center; gap: 1rem;
      flex: 1;
    }
    .donut-svg { width: 170px; height: 170px; }
    .donut-seg { transition: opacity 0.2s; cursor: pointer; }
    .donut-seg:hover { opacity: 0.85; }
    .donut-center-val {
      font-size: 28px; font-weight: 800; fill: var(--color-primary);
      font-family: var(--font-sans);
    }
    .donut-center-lbl {
      font-size: 11px; fill: var(--color-text-muted);
      font-family: var(--font-sans);
    }
    .donut-legend { width: 100%; display: flex; flex-direction: column; gap: 0.4rem; }
    .legend-item {
      display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem;
    }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .legend-name { flex: 1; color: var(--color-text); }
    .legend-val { font-weight: 700; color: var(--color-primary); }

    /* ── Barras verticales SVG ── */
    .vbar-chart { flex: 1; display: flex; flex-direction: column; }
    .vbar-svg { width: 100%; }
    .vbar-rect { transition: opacity 0.2s; cursor: pointer; }
    .vbar-rect:hover { opacity: 0.8; }
    .axis-label {
      font-size: 11px; fill: var(--color-text-muted);
      font-family: var(--font-sans);
    }
    .bar-val-label {
      font-size: 12px; font-weight: 700; fill: var(--color-primary);
      font-family: var(--font-sans);
    }
    .cap-note {
      font-size: 0.75rem; color: var(--color-text-muted); text-align: center;
      margin-top: 0.5rem; padding-top: 0.5rem;
      border-top: 1px solid var(--color-border);
    }

    /* ── Top Profesionales ── */
    .profesionales-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .prof-group h3 {
      font-size: 0.85rem;
      color: var(--color-text-muted);
      margin-bottom: 0.75rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .prof-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--color-bg);
    }
    .prof-item:last-child { border-bottom: none; }
    .prof-rank {
      font-weight: 700;
      color: var(--color-text-muted);
      font-size: 0.8rem;
      width: 24px;
    }
    .prof-name {
      flex: 1;
      font-size: 0.9rem;
      color: var(--color-text);
      font-weight: 500;
    }
    .prof-count {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }
    .prof-count.green { background: #f0fdf4; color: #15803d; }
    .prof-count.red { background: #fef2f2; color: #b91c1c; }

    /* ── Estados ── */
    .loading-state, .error-state {
      display: flex; flex-direction: column; align-items: center;
      padding: 4rem; gap: 1rem; color: var(--color-text-muted);
    }
    .error-state {
      background: var(--color-surface); border-radius: var(--radius-lg); border: 1px solid #fecaca;
    }
    .error-icon { font-size: 3rem; }
    .btn-retry {
      background: var(--color-danger); color: white; border: none;
      padding: 0.5rem 1rem; border-radius: var(--radius-md); cursor: pointer;
    }
    .spinner-lg {
      width: 40px; height: 40px; border: 3px solid var(--color-border);
      border-top-color: var(--color-accent); border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state {
      text-align: center; padding: 4rem;
      background: var(--color-surface); border-radius: var(--radius-lg);
    }
    .empty-icon { font-size: 3.5rem; margin-bottom: 1rem; opacity: 0.5; }
    .empty-state p { color: var(--color-text-muted); font-size: 1rem; }
    .no-data { text-align: center; color: var(--color-text-muted); padding: 1.5rem; font-style: italic; }
  `]
})
export class EstadisticasComponent implements OnInit {
  stats = signal<Estadisticas | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  desde = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];
  hasta = new Date().toISOString().split('T')[0];

  // ── Dimensiones SVG barras verticales ───────────────────────
  readonly vbarWidth  = 460;
  readonly vbarHeight = 220;
  readonly vbarPad    = 40;

  constructor(private estadisticaService: EstadisticaService) {}

  ngOnInit() { this.cargar(); }

  cargar() {
    this.loading.set(true);
    this.error.set(null);
    this.estadisticaService.getResumen(this.desde, this.hasta).subscribe({
      next: s => { this.stats.set(s); this.loading.set(false); },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.mensaje || 'Error al cargar estadísticas');
      }
    });
  }

  // ── Computed helpers ────────────────────────────────────────
  tasaAsistencia = computed(() => {
    const s = this.stats();
    if (!s || s.totalGeneral === 0) return 0;
    return Math.round((s.totalActivos / s.totalGeneral) * 100);
  });

  tasaCancelacion = computed(() => {
    const s = this.stats();
    if (!s || s.totalGeneral === 0) return 0;
    return Math.round((s.totalCancelados / s.totalGeneral) * 100);
  });

  categoriaTop = computed(() => {
    const s = this.stats();
    if (!s || s.porCategoria.length === 0) return '—';
    return [...s.porCategoria].sort((a, b) => b.cantidad - a.cantidad)[0].categoria;
  });

  cantidadTop = computed(() => {
    const s = this.stats();
    if (!s || s.porCategoria.length === 0) return 0;
    return [...s.porCategoria].sort((a, b) => b.cantidad - a.cantidad)[0].cantidad;
  });

  // ── Color helpers ────────────────────────────────────────────
  catFill(nombre: string): string {
    return catColor(nombre).fill;
  }

  // ── Text helpers ──────────────────────────────────────────────
  abbreviateCategory(nombre: string): string {
    return CAT_ABBREVIATIONS[nombre] ?? nombre;
  }

  // ── Gráfico dona (pie chart SVG) ─────────────────────────────
  donutSegments = computed(() => {
    const s = this.stats();
    if (!s) return [];
    const total = s.porCategoria.reduce((sum, c) => sum + c.cantidad, 0);
    if (total === 0) return [];

    const cx = 100, cy = 100, r = 78;
    let cumAngle = -Math.PI / 2; // empezar desde arriba

    return s.porCategoria.map(cat => {
      const fraction = cat.cantidad / total;
      const angle = fraction * 2 * Math.PI;
      const startAngle = cumAngle;
      const endAngle = cumAngle + angle;
      cumAngle = endAngle;

      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = angle > Math.PI ? 1 : 0;

      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      const col = catColor(cat.categoria);

      return {
        categoria: cat.categoria,
        cantidad: cat.cantidad,
        path,
        fill: col.fill,
        stroke: 'white',
      };
    });
  });

  // ── Barras verticales SVG ────────────────────────────────────
  yGridLines = computed(() => {
    const s = this.stats();
    if (!s) return [];
    const maxVal = Math.max(...s.porFranja.map(f => f.cantidad), 1);
    const steps = 4;
    const step = Math.ceil(maxVal / steps);
    const lines = [];
    const chartH = this.vbarHeight - this.vbarPad * 2 + 10;
    for (let i = 0; i <= steps; i++) {
      const val = i * step;
      const y = this.vbarHeight - this.vbarPad - (val / (steps * step)) * chartH;
      lines.push({ val, y: Math.round(y) });
    }
    return lines;
  });

  vbars = computed(() => {
    const s = this.stats();
    if (!s || s.porFranja.length === 0) return [];

    const data = s.porFranja;
    const maxVal = Math.max(...data.map(f => f.cantidad), 1);
    const chartH = this.vbarHeight - this.vbarPad * 2 + 10;
    const chartW = this.vbarWidth - this.vbarPad * 2;
    const barW = Math.floor(chartW / data.length * 0.55);
    const gap  = Math.floor(chartW / data.length);

    // Colores azules en degradado para cada hora
    const hourColors = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa'];

    return data.map((f, i) => {
      const barH = Math.max(4, (f.cantidad / maxVal) * chartH);
      const x = this.vbarPad + i * gap + (gap - barW) / 2;
      const y = this.vbarHeight - this.vbarPad - barH;
      return {
        hora: f.hora,
        cantidad: f.cantidad,
        x: Math.round(x),
        y: Math.round(y),
        width: barW,
        height: Math.round(barH),
        fill: hourColors[i % hourColors.length],
      };
    });
  });
}
