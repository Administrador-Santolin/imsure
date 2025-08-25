// src/app/dashboard/clientes/clientes.routes.ts

import { Routes } from '@angular/router';
import { Clientes } from './clientes';
import { ClienteForm } from './cliente-form/cliente-form';// <<< ADICIONE ESTA LINHA
import { ClienteDetalhes } from './cliente-detalhes/cliente-detalhes';

export const CLIENTES_ROUTES: Routes = [
  {
    path: '', // Rota para /dashboard/clientes (lista/pesquisa)
    component: Clientes
  },
  {
    path: 'novo', // Rota para /dashboard/clientes/novo
    component: ClienteForm
  },
  {
    path: 'editar/:id', // Rota para /dashboard/clientes/editar/:id
    component: ClienteForm
  },
  {
    path: ':id', // <<< NOVA ROTA: Rota para /dashboard/clientes/:id (detalhes do cliente)
    component: ClienteForm
  }
];