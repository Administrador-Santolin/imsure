import { Routes } from '@angular/router';
import { Login } from './login/login';
import { authGuard } from './auth-guard';
import { Relatorios } from './relatorios/relatorios';
import { Layout } from './layout/layout';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    canActivate: [authGuard],
    component: Layout,
    children: [
      {
        path: 'dashboard',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./dashboard/dashboard.routes').then(
            (m) => m.DASHBOARD_ROUTES
          ),
      },
      {
        path: 'clientes',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./clientes/clientes.routes').then((m) => m.CLIENTES_ROUTES),
      },
      {
        path: 'apolices',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./apolices/apolices.routes').then((m) => m.APOLICES_ROUTES),
      },
      { path: 'relatorios', canActivate: [authGuard], component: Relatorios },
      {
        path: 'multi-calculo',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./multi-calculo/multi-calculo.routes').then(
            (m) => m.MULTI_CALCULO_ROUTES
          ),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ],
  },
  // Rota curinga para qualquer URL não encontrada (redireciona para o dashboard)
  { path: '**', redirectTo: '' },
];
