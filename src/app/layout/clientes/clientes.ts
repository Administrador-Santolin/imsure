import { Component, OnInit, OnDestroy } from '@angular/core'; // Remova ViewChild
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Firestore, collection, collectionData, doc, deleteDoc, FirestoreDataConverter } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';
import { RouterModule } from '@angular/router';

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
  selector: 'app-clientes',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule, 
    MatProgressSpinnerModule, 
    MatCardModule,
    MatButtonModule, 
    MatIconModule
  ],
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss'
})
export class Clientes implements OnInit, OnDestroy {
  dataSource = new MatTableDataSource<Cliente>();
  displayedColumns: string[] = ['nome', 'email', 'telefone', 'actions'];

  private clientesSubscription: Subscription | undefined;

  constructor(private firestore: Firestore) { } 

  ngOnInit() {
    const clientesCollection = collection(this.firestore, 'clientes').withConverter(clienteConverter);
    this.clientesSubscription = collectionData<Cliente>(clientesCollection, { idField: 'id' })
      .subscribe((clientes: Cliente[]) => {
        this.dataSource.data = clientes;
      });
  }

  ngOnDestroy() {
    if (this.clientesSubscription) {
      this.clientesSubscription.unsubscribe();
    }
  }

  async onDeleteCliente(clienteId: string | undefined) {
    if (!clienteId) {
      console.error('ID do cliente indefinido para exclusão.');
      return;
    }
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        const clienteDocRef = doc(this.firestore, `clientes/${clienteId}`).withConverter(clienteConverter);
        await deleteDoc(clienteDocRef);
        alert('Cliente excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        alert('Erro ao excluir cliente. Tente novamente.');
      }
    }
  }
}