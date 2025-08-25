import { Routes } from "@angular/router";
import { Dashboard } from "./dashboard";


export const DASHBOARD_ROUTES: Routes = [
  {
    path: '', // Representa o path vazio dentro de '/dashboard' (ou seja, '/dashboard')
    component: Dashboard, // Este componente será o "shell" com a sidenav e toolbar
  }
];