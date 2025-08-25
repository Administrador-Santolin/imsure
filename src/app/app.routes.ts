import { Routes } from '@angular/router';
import { Login } from './login/login';
import { authGuard } from './auth-guard';
import { Relatorios } from './relatorios/relatorios';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () => import('./dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES)
  },
  {
    path: 'clientes',
    canActivate: [authGuard],
    loadChildren: () => import('./clientes/clientes.routes').then(m => m.CLIENTES_ROUTES)
  },
  {
    path: 'apolices',
    canActivate: [authGuard],
    loadChildren: () => import('./apolices/apolices.routes').then(m => m.APOLICES_ROUTES)
  },
  { path: 'relatorios', canActivate: [authGuard],component: Relatorios },
  {
    path: 'multi-calculo',
    canActivate: [authGuard],
    loadChildren: () => import('./multi-calculo/multi-calculo.routes').then(m => m.MULTI_CALCULO_ROUTES)
  },

  // Rota curinga para qualquer URL não encontrada (redireciona para o dashboard)
  { path: '**', redirectTo: '/dashboard' }
];
