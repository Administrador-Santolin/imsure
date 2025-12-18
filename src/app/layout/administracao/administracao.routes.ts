import { Routes } from "@angular/router";
import { Administracao } from "./administracao";


export const ADMINISTRACAO_ROUTES: Routes = [
    { path: '', component: Administracao },
    { path: 'seguradoras', loadChildren: () => import('./seguradoras/seguradora.routes').then(r => r.SEGURADORAS_ROUTES) },
    { path: 'produtos', loadChildren: () => import('./produtos/produtos.routes').then(r => r.PRODUTOS_ROUTES) }
]