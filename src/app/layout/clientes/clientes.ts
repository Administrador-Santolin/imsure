import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { RouterModule } from '@angular/router';
import { MascaraPipe } from '../../mascara-pipe';
import { Cliente } from '../../models/cliente.model';
import { ClienteService } from '../../services/cliente.service'; // ⬅️ NOVO

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
    MatIconModule,
    MascaraPipe
  ],
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss'
})
export class Clientes implements OnInit, OnDestroy {
  dataSource = new MatTableDataSource<Cliente>();
  displayedColumns: string[] = ['nome', 'email', 'telefone', 'actions'];
  isLoading = true; // ⬅️ NOVO: para mostrar spinner

  private clientesSubscription: Subscription | undefined;
  private clienteService = inject(ClienteService); // ⬅️ NOVO
  private snackBar = inject(MatSnackBar);

  ngOnInit() {
    this.loadClientes();
  }

  ngOnDestroy() {
    if (this.clientesSubscription) {
      this.clientesSubscription.unsubscribe();
    }
  }

  // 🎓 EXPLICAÇÃO: Carrega clientes do Supabase
  loadClientes() {
    this.isLoading = true;
    this.clientesSubscription = this.clienteService.getClientes()
      .subscribe({
        next: (clientes: Cliente[]) => {
          this.dataSource.data = clientes;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erro ao carregar clientes:', error);
          this.snackBar.open('Erro ao carregar clientes', 'Fechar', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  async onDeleteCliente(clienteId: string | undefined) {
    if (!clienteId) {
      console.error('ID do cliente indefinido para exclusão.');
      return;
    }
    
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await this.clienteService.deleteCliente(clienteId);
        this.snackBar.open('Cliente excluído com sucesso!', 'Fechar', { duration: 3000 });
        this.loadClientes(); // Recarrega a lista
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        this.snackBar.open('Erro ao excluir cliente. Tente novamente.', 'Fechar', { duration: 3000 });
      }
    }
  }
}