import { RouterOutlet } from '@angular/router';
import { Component, OnInit, OnDestroy, signal, inject, ErrorHandler } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router'; // Para routerLink na sidenav

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { Firestore } from '@angular/fire/firestore';
import { Observable, Subscription, of } from 'rxjs';
import { startWith, debounceTime, switchMap, distinctUntilChanged } from 'rxjs/operators';

import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Cliente } from '../models/cliente.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClienteService } from '../services/cliente.service';
import { ErrorHandlerService } from '../services/error-handler';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet,
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    AsyncPipe],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class Layout implements OnInit {
  isLoading = signal(false);
  searchControl = new FormControl(''); // <<< NOVO: Controle para o campo de pesquisa
  filteredClientes$: Observable<Cliente[]> | undefined; // <<< NOVO: Observable para os resultados da pesquisa
  private _snackBar = inject(MatSnackBar);
  private clienteService = inject(ClienteService);
  private errorHandler = inject(ErrorHandlerService);


  constructor(private auth: Auth, private router: Router, private firestore: Firestore) {}

  ngOnInit() {
    this.filteredClientes$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300), // Espera 300ms antes de buscar
      distinctUntilChanged(), // Só busca se o texto mudou
      switchMap(searchText => {
        if (!searchText || searchText.length < 2) {
          return of([]); // Não busca se menos de 2 caracteres
        }
        return this.clienteService.searchClientes(searchText);
      })
    );
  }

  onClienteSelected(event: any) {
    const selectedCliente: Cliente = event.option.value;
    if (selectedCliente && selectedCliente.id) {
      this.router.navigate(['/clientes', selectedCliente.id]); // Navega para a tela de detalhes
      this.searchControl.setValue(''); // Limpa o campo de pesquisa após a seleção
    }
  }

  displayCliente(cliente: Cliente): string {
    return cliente ? cliente.nome : '';
  }

  async onLogout() {
    this.isLoading.set(true);
    try {
      await this.auth.signOut();
      this.router.navigate(['/login']);
      this._snackBar.open('Logout realizado com sucesso!', 'Fechar', { duration: 3000 });
    } catch (error) {
      this.errorHandler.handleError(error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
