import { Produtos } from "./produtos";
import { Routes } from "@angular/router";

export const PRODUTOS_ROUTES: Routes = [
    { path: '', component: Produtos },
    { path: 'novo', loadComponent: () => import('./produtos-form/produtos-form').then(c => c.ProdutosForm) },
    { path: ':id', loadComponent: () => import('./produtos-form/produtos-form').then(c => c.ProdutosForm) }
]