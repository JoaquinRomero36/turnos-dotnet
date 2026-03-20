import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/guards';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'dashboard',     canActivate: [authGuard], loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'calendario',    canActivate: [authGuard], loadComponent: () => import('./features/calendario/calendario.component').then(m => m.CalendarioComponent) },
  { path: 'profesionales', canActivate: [authGuard, roleGuard(['Secretario'])], loadComponent: () => import('./features/profesionales/profesionales.component').then(m => m.ProfesionalesComponent) },
   { path: 'estadisticas',  canActivate: [authGuard, roleGuard(['Secretario'])], loadComponent: () => import('./features/estadisticas/estadisticas.component').then(m => m.EstadisticasComponent) },
   { path: 'cancelaciones', canActivate: [authGuard, roleGuard(['Secretario'])], loadComponent: () => import('./features/cancelaciones/cancelaciones.component').then(m => m.CancelacionesComponent) },
   { path: '**', redirectTo: '/dashboard' }
];
