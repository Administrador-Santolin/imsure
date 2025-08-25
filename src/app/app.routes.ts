import { Routes } from '@angular/router';
import { Login } from './login/login';
import { authGuard } from './auth-guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  { path: 'dashboard', 
    canActivate: [authGuard],
    loadChildren: () => import('./dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES)
   },

  // Rota curinga para qualquer URL não encontrada (redireciona para o login)
  { path: '**', redirectTo: '/login' }
];
