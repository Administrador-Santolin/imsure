import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';

// Imports do Firestore
import { Firestore, doc, getDoc, FirestoreDataConverter } from '@angular/fire/firestore'; // <<< ADICIONE ESTAS LINHAS

interface Cliente {
  id?: string;
  nome: string;
  email: string;
  telefone: string;
  cpf?: string;
  endereco?: string; // Adicione para os dados pessoais
  dataNascimento?: string; // Adicione para os dados pessoais
  // Adicione outros campos que você espera nos dados do cliente
}

// Reutilize o conversor de cliente para garantir a tipagem correta ao buscar
const clienteConverter: FirestoreDataConverter<Cliente> = {
  toFirestore: (cliente: Cliente) => {
    const { id, ...data } = cliente;
    return data;
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
  selector: 'app-cliente-detalhes',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule // <<< ADICIONE AQUI
  ],
  templateUrl: './cliente-detalhes.html',
  styleUrl: './cliente-detalhes.scss'
})
export class ClienteDetalhes implements OnInit {
  clienteId: string | null = null;
  cliente: Cliente | undefined; // <<< Para armazenar os dados do cliente
  isLoading: boolean = true; // <<< Para controlar o estado de carregamento

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firestore: Firestore // <<< Injetar Firestore
  ) { }

  ngOnInit() {
    this.clienteId = this.route.snapshot.paramMap.get('id');
    if (this.clienteId) {
      this.loadClienteDetails(this.clienteId);
    } else {
      // Se não houver ID, redireciona de volta para a lista de clientes
      this.router.navigate(['/dashboard/clientes']);
    }
  }

  async loadClienteDetails(id: string) {
    this.isLoading = true;
    try {
      const clienteDocRef = doc(this.firestore, `clientes/${id}`).withConverter(clienteConverter);
      const docSnap = await getDoc(clienteDocRef);

      if (docSnap.exists()) {
        this.cliente = docSnap.data(); // Atribui os dados do cliente
        console.log('Dados do cliente carregados:', this.cliente);
      } else {
        console.warn('Cliente não encontrado para o ID:', id);
        this.router.navigate(['/dashboard/clientes']); // Redireciona se não encontrar
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes do cliente:', error);
      this.router.navigate(['/dashboard/clientes']); // Redireciona em caso de erro
    } finally {
      this.isLoading = false;
    }
  }

  goToEdit() {
    this.router.navigate(['/dashboard/clientes/editar', this.clienteId]);
  }

  goBackToList() {
    this.router.navigate(['/dashboard/clientes']);
  }
}