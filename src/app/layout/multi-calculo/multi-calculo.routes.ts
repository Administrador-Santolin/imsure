import { Routes } from "@angular/router";
import { MultiCalculo } from "./multi-calculo";


export const MULTI_CALCULO_ROUTES: Routes = [
    { path: '', component: MultiCalculo },
    { path: 'respCivil', loadComponent: () => import('./resp-civil/resp-civil').then(c => c.RespCivil) },
    { path: 'automovel', loadComponent: () => import('./automovel/automovel').then(c => c.Automovel) }
]
