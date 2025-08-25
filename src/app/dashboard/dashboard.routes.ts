import { Routes } from "@angular/router";
import { Relatorios } from "./relatorios/relatorios";
import { Dashboard } from "./dashboard";


export const DASHBOARD_ROUTES: Routes = [
  {
    path: '', // Representa o path vazio dentro de '/dashboard' (ou seja, '/dashboard')
    component: Dashboard, // Este componente será o "shell" com a sidenav e toolbar
    children: [ // As rotas filhas serão renderizadas no <router-outlet> do DashboardComponent
      { path: 'clientes', 
        loadChildren: () => import('./clientes/clientes.routes').then(m => m.CLIENTES_ROUTES)
      },
      { path: 'apolices', 
        loadChildren: () => import('./apolices/apolices.routes').then(m => m.APOLICES_ROUTES)
      },
      { path: 'relatorios', component: Relatorios },
      { path: '', redirectTo: 'clientes', pathMatch: 'full' }, // Rota padrão ao entrar em '/dashboard'
      {
        path: 'multi-calculo',
        loadChildren: () => import('./multi-calculo/multi-calculo.routes').then(m => m.MULTI_CALCULO_ROUTES)
      }
    ]
  }
];