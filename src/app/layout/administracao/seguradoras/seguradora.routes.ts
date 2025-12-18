import { Routes } from "@angular/router";
import { Seguradoras } from "./seguradoras";


export const SEGURADORAS_ROUTES: Routes = [
    { path: '', component: Seguradoras },
    { path: 'novo', loadComponent: () => import('./seguradoras-form/seguradoras-form').then(c => c.SeguradorasForm) },
    { path: ':id', loadComponent: () => import('./seguradoras-form/seguradoras-form').then(c => c.SeguradorasForm) },
]