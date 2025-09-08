import { Routes } from '@angular/router';
import { Login } from './login/login';
import { authGuard } from './auth-guard';
import { Relatorios } from './layout/relatorios/relatorios';
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
        loadChildren: () =>
          import('./layout/dashboard/dashboard.routes').then(
            (m) => m.DASHBOARD_ROUTES
          ),
      },
      {
        path: 'clientes',
        loadChildren: () =>
          import('./layout/clientes/clientes.routes').then((m) => m.CLIENTES_ROUTES),
      },
      {
        path: 'apolices',
        loadChildren: () =>
          import('./layout/apolices/apolices.routes').then((m) => m.APOLICES_ROUTES),
      },
      { path: 'relatorios', canActivate: [authGuard], component: Relatorios },
      {
        path: 'multi-calculo',
        loadChildren: () =>
          import('./layout/multi-calculo/multi-calculo.routes').then(
            (m) => m.MULTI_CALCULO_ROUTES
          ),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ],
  },
  // Rota curinga para qualquer URL não encontrada (redireciona para o dashboard)
  { path: '**', redirectTo: '' },
];
