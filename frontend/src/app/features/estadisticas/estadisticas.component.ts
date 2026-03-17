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
              <div class="kpi-icon" style="background:#dbeafe">📅</div>
              <div class="kpi-body">
                <div class="kpi-value">{{ stats()!.totalGeneral }}</div>
                <div class="kpi-label">Total de turnos</div>
              </div>
              <div class="kpi-trend blue">En el período</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon" style="background:#dcfce7">✅</div>
              <div class="kpi-body">
                <div class="kpi-value" style="color:#16a34a">{{ stats()!.totalActivos }}</div>
                <div class="kpi-label">Activos</div>
              </div>
              <div class="kpi-trend green">{{ tasaAsistencia() }}% efectividad</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon" style="background:#fee2e2">❌</div>
              <div class="kpi-body">
                <div class="kpi-value" style="color:#dc2626">{{ stats()!.totalCancelados }}</div>
                <div class="kpi-label">Cancelados</div>
              </div>
              <div class="kpi-trend red">{{ tasaCancelacion() }}% cancelación</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon" style="background:#fef3c7">⭐</div>
              <div class="kpi-body">
                <div class="kpi-value" style="color:#d97706">{{ categoriaTop() }}</div>
                <div class="kpi-label">Categoría más demandada</div>
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
                  <h3>⚠️ Más cancelados</h3>
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
                  <h3>✅ Menos cancelados</h3>
                  @if (stats()!.topProfesionalesActivos.length > 0) {
                    @for (pro of stats()!.topProfesionalesActivos; track pro.id; let i = $index) {
                      <div class="prof-item">
                        <span class="prof-rank">#{{ i + 1 }}</span>
                        <span class="prof-name">{{ pro.nombreCompleto }}</span>
                        <span class="prof-count green">{{ pro.cantidad }} cancelados</span>
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
    .est-page { max-width: 1200px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;
    }
    h1 { color: #1e3a5f; margin: 0 0 0.25rem; font-size: 1.75rem; }
    .subtitle { color: #666; margin: 0; font-size: 0.9rem; }
    h2 { color: #1e3a5f; margin: 0; font-size: 1rem; }
    .date-filters {
      display: flex; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap;
    }
    .filter-group { display: flex; flex-direction: column; gap: 0.3rem; }
    .filter-group label { font-size: 0.78rem; font-weight: 600; color: #666; }
    .filter-group input {
      padding: 0.5rem 0.75rem; border: 1.5px solid #ddd;
      border-radius: 7px; font-size: 0.9rem;
    }
    .filter-group input:focus { outline: none; border-color: #2e75b6; }
    .btn-refresh {
      display: flex; align-items: center; gap: 0.4rem;
      background: #2e75b6; color: white; border: none;
      padding: 0.55rem 1.1rem; border-radius: 7px;
      font-weight: 600; font-size: 0.9rem; cursor: pointer;
      transition: background 0.2s;
    }
    .btn-refresh:hover { background: #1e3a5f; }
    .refresh-icon { font-size: 1.1rem; }

    /* ── KPI Cards ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem; margin-bottom: 1.5rem;
    }
    .kpi-card {
      background: white; border-radius: 14px; padding: 1.25rem;
      display: flex; align-items: center; gap: 1rem;
      box-shadow: 0 2px 10px rgba(0,0,0,0.06);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.1); }
    .kpi-icon {
      width: 52px; height: 52px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem; flex-shrink: 0;
    }
    .kpi-body { flex: 1; }
    .kpi-value { font-size: 2rem; font-weight: 800; color: #1e3a5f; line-height: 1; }
    .kpi-label { font-size: 0.78rem; color: #777; margin-top: 0.2rem; }
    .kpi-trend {
      font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.5rem;
      border-radius: 20px; white-space: nowrap;
    }
    .kpi-trend.blue   { background: #dbeafe; color: #1e40af; }
    .kpi-trend.green  { background: #dcfce7; color: #166534; }
    .kpi-trend.red    { background: #fee2e2; color: #991b1b; }
    .kpi-trend.orange { background: #fef3c7; color: #92400e; }

    /* ── Chart containers ── */
    .charts-row {
      display: flex; gap: 1.25rem; margin-bottom: 1.25rem; flex-wrap: wrap;
    }
    .chart-card {
      background: white; border-radius: 14px; padding: 1.5rem;
      box-shadow: 0 2px 10px rgba(0,0,0,0.06); display: flex; flex-direction: column;
    }
    .chart-card.wide   { flex: 2; min-width: 340px; }
    .chart-card.narrow { flex: 1; min-width: 240px; }
    .chart-card.medium { flex: 1; min-width: 300px; }
    .chart-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1.25rem;
    }
    .chart-sub { font-size: 0.78rem; color: #999; }

    /* ── Barras horizontales ── */
    .bar-chart-area { display: flex; flex-direction: column; gap: 1rem; }
    .hbar-row { display: flex; align-items: center; gap: 0.75rem; }
    .hbar-label {
      min-width: 165px; font-size: 0.83rem; font-weight: 600; color: #444;
      white-space: nowrap;
    }
    .hbar-track {
      flex: 1; height: 32px; background: #f0f4f8;
      border-radius: 16px; overflow: hidden;
    }
    .hbar-fill {
      height: 100%; border-radius: 16px;
      display: flex; align-items: center; padding-left: 0.75rem;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      min-width: 0;
    }
    .hbar-val { color: white; font-size: 0.8rem; font-weight: 700; }
    .hbar-pct {
      min-width: 42px; text-align: right;
      font-size: 0.82rem; font-weight: 600; color: #555;
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
      font-size: 28px; font-weight: 800; fill: #1e3a5f;
      font-family: 'Segoe UI', sans-serif;
    }
    .donut-center-lbl {
      font-size: 11px; fill: #888;
      font-family: 'Segoe UI', sans-serif;
    }
    .donut-legend { width: 100%; display: flex; flex-direction: column; gap: 0.4rem; }
    .legend-item {
      display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem;
    }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .legend-name { flex: 1; color: #444; }
    .legend-val { font-weight: 700; color: #1e3a5f; }

    /* ── Barras verticales SVG ── */
    .vbar-chart { flex: 1; display: flex; flex-direction: column; }
    .vbar-svg { width: 100%; }
    .vbar-rect { transition: opacity 0.2s; cursor: pointer; }
    .vbar-rect:hover { opacity: 0.8; }
    .axis-label {
      font-size: 11px; fill: #888;
      font-family: 'Segoe UI', sans-serif;
    }
    .bar-val-label {
      font-size: 12px; font-weight: 700; fill: #1e3a5f;
      font-family: 'Segoe UI', sans-serif;
    }
    .cap-note {
      font-size: 0.75rem; color: #888; text-align: center;
      margin-top: 0.5rem; padding-top: 0.5rem;
      border-top: 1px solid #f0f0f0;
    }

    /* ── Tabla detallada ── */
    .detail-table-wrap { overflow-x: auto; margin-bottom: 1rem; }
    .detail-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .detail-table th {
      background: #f8fafc; color: #555; font-weight: 600;
      padding: 0.6rem 0.75rem; text-align: left;
      border-bottom: 2px solid #e8edf2;
    }
    .detail-table td {
      padding: 0.6rem 0.75rem; border-bottom: 1px solid #f0f4f8;
    }
    .detail-table tfoot td {
      border-top: 2px solid #e8edf2; border-bottom: none;
      background: #f8fafc;
    }
    .cat-name-cell { display: flex; align-items: center; gap: 0.5rem; }
    .cat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .num-cell { text-align: right; font-weight: 600; color: #1e3a5f; }
    .mini-bar-track {
      height: 8px; background: #f0f4f8; border-radius: 4px; overflow: hidden;
    }
    .mini-bar-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }

    /* ── Top Profesionales ── */
    .profesionales-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .prof-group h3 {
      font-size: 0.85rem;
      color: #666;
      margin-bottom: 0.75rem;
      font-weight: 600;
    }
    .prof-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f0f4f8;
    }
    .prof-rank {
      font-weight: 700;
      color: #999;
      font-size: 0.8rem;
      width: 20px;
    }
    .prof-name {
      flex: 1;
      font-size: 0.85rem;
      color: #333;
    }
    .prof-count {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }
    .prof-count.green { background: #dcfce7; color: #166534; }
    .prof-count.red { background: #fee2e2; color: #991b1b; }

    /* ── Mini KPIs de tasa ── */
    .mini-kpis {
      border-top: 1px solid #f0f4f8; padding-top: 1rem;
      display: flex; flex-direction: column; gap: 0.75rem;
    }
    .mini-kpi {}
    .mini-kpi-bar {
      height: 10px; background: #f0f4f8; border-radius: 5px;
      overflow: hidden; margin-bottom: 0.3rem;
    }
    .mini-kpi-fill { height: 100%; border-radius: 5px; transition: width 0.6s ease; }
    .mini-kpi-fill.green { background: #16a34a; }
    .mini-kpi-fill.red   { background: #dc2626; }
    .mini-kpi-label {
      display: flex; align-items: center; gap: 0.4rem;
      font-size: 0.8rem; color: #555;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .dot.green { background: #16a34a; }
    .dot.red   { background: #dc2626; }

    /* ── Estados ── */
    .loading-state, .error-state {
      display: flex; flex-direction: column; align-items: center;
      padding: 4rem; gap: 1rem; color: #666;
    }
    .error-state {
      background: white; border-radius: 14px; border: 1px solid #fee2e2;
    }
    .error-icon { font-size: 3rem; }
    .btn-retry {
      background: #dc2626; color: white; border: none;
      padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;
    }
    .spinner-lg {
      width: 40px; height: 40px; border: 3px solid #e0e0e0;
      border-top-color: #2e75b6; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state {
      text-align: center; padding: 4rem;
      background: white; border-radius: 14px;
    }
    .empty-icon { font-size: 3.5rem; margin-bottom: 1rem; }
    .empty-state p { color: #666; font-size: 1rem; }
    .no-data { text-align: center; color: #aaa; padding: 1.5rem; font-style: italic; }
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
