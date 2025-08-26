import { Routes } from "@angular/router";
import { Apolices } from "./apolices";


export const APOLICES_ROUTES: Routes = [
    {path: '', component: Apolices},
    {path: 'novo', loadComponent: () => import('./apolice-form/apolice-form').then(c => c.ApoliceForm)},
    {path: ':id', loadComponent: () => import('./apolice-form/apolice-form').then(c => c.ApoliceForm)}
]