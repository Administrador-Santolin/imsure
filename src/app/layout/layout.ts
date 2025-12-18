import { RouterOutlet } from '@angular/router';
import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { RouterModule } from '@angular/router'; // Para routerLink na sidenav

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { Observable, of } from 'rxjs';
import { startWith, debounceTime, switchMap, distinctUntilChanged } from 'rxjs/operators';

import { Router } from '@angular/router';
import { Cliente } from '../models/cliente.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClienteService } from '../services/cliente.service';
import { ErrorHandlerService } from '../services/error-handler';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SupabaseService } from '../services/supabase.service';
import { CpfPipe } from '../pipes/cpf-pipe';
import { MENU_ITEMS } from '../config/menu.config';
import { MenuItem } from '../models/system.model';


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
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    MatExpansionModule,
    ReactiveFormsModule,
    AsyncPipe,
    CpfPipe],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class Layout implements OnInit {
  menuItems = MENU_ITEMS;
  isLoading = signal(false);
  searchControl = new FormControl(''); // <<< NOVO: Controle para o campo de pesquisa
  filteredClientes$: Observable<Cliente[]> | undefined; // <<< NOVO: Observable para os resultados da pesquisa
  private _snackBar = inject(MatSnackBar);
  private clienteService = inject(ClienteService);
  private errorHandler = inject(ErrorHandlerService);

  nestedMenuOpen = signal(false);

  toggleNestedMenu(item?: MenuItem) {
    if (!item?.subMenu) return;

    this.nestedMenuOpen.set(!this.nestedMenuOpen());
  }

  constructor(private router: Router) { }

  ngOnInit() {
    this.filteredClientes$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(500), // Espera 300ms antes de buscar
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
    try {
      const selectedCliente: Cliente = event.option.value;
      if (selectedCliente?.id) {
        this.router.navigate(['/clientes', selectedCliente.id]);
        this.searchControl.setValue('');
      }
    } catch (error) {
      this.errorHandler.handleError(error);
      this._snackBar.open('Erro ao selecionar cliente', 'Fechar');
    }
  }

  displayCliente(cliente: Cliente): string {
    return cliente ? cliente.nome : '';
  }

  private supabase = inject(SupabaseService); // ⬅️ NOVO

  async onLogout() {
    this.isLoading.set(true);
    try {
      const { error } = await this.supabase.signOut();

      if (error) throw error;

      this.router.navigate(['/login']);
      this._snackBar.open('Logout realizado com sucesso!', 'Fechar', { duration: 3000 });
    } catch (error) {
      this.errorHandler.handleError(error);
      this._snackBar.open('Erro ao fazer logout', 'Fechar', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }
}
