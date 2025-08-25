import { RouterOutlet } from '@angular/router';
import { Component, OnInit, OnDestroy, inject, Inject, signal } from '@angular/core'; // Adicione OnInit, OnDestroy
import { CommonModule, AsyncPipe } from '@angular/common'; // Adicione AsyncPipe
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router'; // Para routerLink na sidenav

import { MatFormFieldModule } from '@angular/material/form-field'; // <<< ADICIONE
import { MatInputModule } from '@angular/material/input';       // <<< ADICIONE
import { MatAutocompleteModule } from '@angular/material/autocomplete'; // <<< ADICIONE
import { FormControl, ReactiveFormsModule } from '@angular/forms'; // <<< ADICIONE

import { Firestore, collection, collectionData, FirestoreDataConverter, query, orderBy, limit, where } from '@angular/fire/firestore'; // <<< ADICIONE
import { Observable, Subscription, combineLatest } from 'rxjs'; // <<< ADICIONE combineLatest
import { startWith, debounceTime, switchMap, map } from 'rxjs/operators'; // <<< ADICIONE

import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';

interface Cliente {
  id?: string;
  nome: string;
  email: string;
  telefone: string;
  cpf?: string;
  endereco?: string;
  dataNascimento?: string;
}

const clienteConverter: FirestoreDataConverter<Cliente> = {
  toFirestore: (cliente: Cliente) => {
    const { id, ...data } = cliente;
    return data; // Não adiciona mais nomeLowerCase aqui
  },
  fromFirestore: (snapshot: any, options: any) => {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      cpf: data.cpf || '',
      endereco: data.endereco || '',
      dataNascimento: data.dataNascimento || ''
    } as Cliente;
  }
};

@Component({
  selector: 'app-root',
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
    AsyncPipe
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('Imsure');

  searchControl = new FormControl(''); // <<< NOVO: Controle para o campo de pesquisa
  filteredClientes$: Observable<Cliente[]> | undefined; // <<< NOVO: Observable para os resultados da pesquisa

  private searchSubscription: Subscription | undefined; // Para gerenciar a subscrição da pesquisa

  constructor(private auth: Auth, private router: Router, private firestore: Firestore) {}

  ngOnInit() {
    this.filteredClientes$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      // Use switchMap para buscar todos os clientes relevantes do Firestore
      switchMap(value => {
        const clientesCollectionRef = collection(this.firestore, 'clientes').withConverter(clienteConverter);
        // Buscamos um número limitado de clientes (ex: 50) ordenados por nome
        // Não usamos cláusulas 'where' de intervalo aqui para simplificar a busca inicial no Firestore
        // e evitar problemas de índice complexos.
        return collectionData(query(clientesCollectionRef, orderBy('nome'), limit(50))) as Observable<Cliente[]>;
      }),
      // Agora, aplicamos o filtro localmente no cliente
      map(clientes => {
        const searchText = this.searchControl.value?.toLowerCase() || ''; // Pega o texto atual do input
        if (!searchText) {
          return clientes; // Se o input estiver vazio, retorna todos os clientes buscados inicialmente
        }
        return clientes.filter(cliente =>
          cliente.nome.toLowerCase().includes(searchText) || // Busca por nome (case-insensitive, "contém")
          (cliente.cpf && cliente.cpf.toLowerCase().includes(searchText)) // Busca por CPF (case-insensitive, "contém")
        );
      })
    );
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  private searchClientes(searchText: string): Observable<Cliente[]> {
    const clientesCollectionRef = collection(this.firestore, 'clientes').withConverter(clienteConverter);

    const lowerCaseSearchText = searchText.trim().toLowerCase();

    if (!lowerCaseSearchText) {
      return collectionData(query(clientesCollectionRef, orderBy('nome'), limit(10))) as Observable<Cliente[]>;
    }

    const nameQuery = query(
      clientesCollectionRef,
      orderBy('nome'),
      where('nome', '>=', lowerCaseSearchText),
      where('nome', '<=', lowerCaseSearchText + '\uf8ff'),
      limit(10)
    );
    const nameResults$ = collectionData(nameQuery) as Observable<Cliente[]>;

    const cpfQuery = query(
      clientesCollectionRef,
      orderBy('cpf'),
      where('cpf', '>=', lowerCaseSearchText),
      where('cpf', '<=', lowerCaseSearchText + '\uf8ff'),
      limit(10)
    );
    const cpfResults$ = collectionData(cpfQuery) as Observable<Cliente[]>;

    return combineLatest([nameResults$, cpfResults$]).pipe(
      map(([nameClients, cpfClients]) => {
        const combined = [...nameClients, ...cpfClients];
        const uniqueClients = Array.from(new Map(combined.map(item => [item.id, item])).values());
        return uniqueClients.sort((a, b) => a.nome.localeCompare(b.nome));
      })
    );
  }


  onClienteSelected(event: any) {
    const selectedCliente: Cliente = event.option.value;
    if (selectedCliente && selectedCliente.id) {
      this.router.navigate(['/dashboard/clientes', selectedCliente.id]); // Navega para a tela de detalhes
      this.searchControl.setValue(''); // Limpa o campo de pesquisa após a seleção
    }
  }

  displayCliente(cliente: Cliente): string {
    return cliente ? cliente.nome : '';
  }

  async onLogout() {
    try {
      await this.auth.signOut();
      this.router.navigate(['/login']);
      alert('Você foi desconectado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      alert('Erro ao fazer logout. Tente novamente.');
    }
  }
}


// Interface Cliente e Converter (copie do clientes.ts)

