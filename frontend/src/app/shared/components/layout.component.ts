import { Component, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-logo">
          <!-- Logo de la escuela -->
          <img src="assets/LogoSidebar.jpeg" alt="Logo Escuela" class="logo-img">
          <div>
            <div class="logo-title">Sistema Turnos</div>
            <div class="logo-sub">Centro de Salud</div>
          </div>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span>Dashboard</span>
          </a>
          <a routerLink="/calendario" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Calendario</span>
          </a>
          @if (isSecretario()) {
            <a routerLink="/profesionales" routerLinkActive="active" class="nav-item">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>Profesionales</span>
            </a>
            <a routerLink="/estadisticas" routerLinkActive="active" class="nav-item">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              <span>Estadísticas</span>
            </a>
            <a routerLink="/cancelaciones" routerLinkActive="active" class="nav-item">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>Cancelaciones</span>
            </a>
          }
        </nav>

        <div class="sidebar-user">
          <div class="user-avatar">{{ userInitials() }}</div>
          <div class="user-info">
            <div class="user-name">{{ userName() }}</div>
            <div class="user-role">{{ userRolLabel() }}</div>
          </div>
          <button class="btn-logout" (click)="logout()" title="Cerrar sesión">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <main class="main-content">
        <ng-content />
      </main>
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      min-height: 100vh;
      font-family: var(--font-sans, 'Segoe UI', sans-serif);
      background: var(--color-bg);
    }
    .sidebar {
      width: 260px;
      min-height: 100vh;
      background: var(--color-primary);
      display: flex;
      flex-direction: column;
      position: fixed;
      left: 0; top: 0; bottom: 0;
      z-index: 100;
      box-shadow: var(--shadow-md);
    }
    .sidebar-logo {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 1.5rem 1.25rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .logo-img {
      width: 80px;
      height: 80px;
      object-fit: contain;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.9);
      padding: 4px;
    }
    .logo-title { color: white; font-weight: 700; font-size: 1.1rem; letter-spacing: 0.5px; }
    .logo-sub { color: rgba(255,255,255,0.6); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; }
    .sidebar-nav {
      flex: 1;
      padding: 1.5rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .nav-item {
      display: flex; align-items: center; gap: 0.85rem;
      padding: 0.85rem 1rem; border-radius: var(--radius-md); 
      color: rgba(255,255,255,0.7);
      text-decoration: none; font-size: 0.95rem; font-weight: 500;
      transition: all 0.2s ease;
    }
    .nav-item:hover { background: rgba(255,255,255,0.1); color: white; transform: translateX(4px); }
    .nav-item.active { 
      background: var(--color-accent); 
      color: white; 
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
    }
    .nav-icon { 
      width: 20px; height: 20px; 
      flex-shrink: 0;
    }
    .sidebar-user {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-top: 1px solid rgba(255,255,255,0.1);
      background: rgba(0,0,0,0.1);
    }
    .user-avatar {
      width: 38px; height: 38px; border-radius: 8px;
      background: var(--color-accent); color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 600; font-size: 0.9rem; flex-shrink: 0;
    }
    .user-info { flex: 1; min-width: 0; }
    .user-name { color: white; font-size: 0.9rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .user-role { color: rgba(255,255,255,0.5); font-size: 0.75rem; margin-top: 2px; }
    .btn-logout {
      background: none; border: none; cursor: pointer; 
      padding: 0.5rem; border-radius: 6px;
      color: rgba(255,255,255,0.5); transition: all 0.2s;
      display: flex; align-items: center; justify-content: center;
    }
    .btn-logout:hover { background: rgba(255,255,255,0.1); color: white; }
    .main-content {
      margin-left: 260px;
      flex: 1;
      padding: 2rem;
      min-height: 100vh;
    }
  `]
})
export class LayoutComponent {
  constructor(private authService: AuthService, private router: Router) {}

  isSecretario = this.authService.isSecretario;
  userName = computed(() => {
    const u = this.authService.currentUser();
    return u ? `${u.nombre} ${u.apellido}` : '';
  });
  userInitials = computed(() => {
    const u = this.authService.currentUser();
    return u ? `${u.nombre[0]}${u.apellido[0]}`.toUpperCase() : '?';
  });
  userRolLabel = computed(() => {
    const roles: Record<string, string> = {
      OPERADORA: 'Operadora',
      PROFESIONAL: 'Profesional',
      SECRETARIO: 'Secretario/a'
    };
    return roles[this.authService.currentUser()?.rol ?? ''] ?? '';
  });

  logout() { this.authService.logout(); }
}
