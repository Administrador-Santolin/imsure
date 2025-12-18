import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { Cliente } from '../../../models/cliente.model';
import { ClienteService } from '../../../services/cliente.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-cliente-detalhes',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './cliente-detalhes.html',
  styleUrl: './cliente-detalhes.scss'
})
export class ClienteDetalhes implements OnInit {
  clienteId: string | null = null;
  cliente: Cliente | undefined;
  isLoading: boolean = true;

  private clienteService = inject(ClienteService);
  private snackBar = inject(MatSnackBar);

  constructor(
    private route: ActivatedRoute,
    private router: Router
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

  loadClienteDetails(id: string) {
    this.isLoading = true;
    this.clienteService.getClienteById(id).subscribe({
      next: (cliente) => {
        if (cliente) {
          this.cliente = cliente;
          console.log('Dados do cliente carregados:', this.cliente);
        } else {
          this.snackBar.open('Cliente não encontrado', 'Fechar', { duration: 3000 });
          this.router.navigate(['/dashboard/clientes']);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar detalhes do cliente:', error);
        this.snackBar.open('Erro ao carregar cliente', 'Fechar', { duration: 3000 });
        this.router.navigate(['/dashboard/clientes']);
        this.isLoading = false;
      }
    });
  }

  goToEdit() {
    this.router.navigate(['/dashboard/clientes/editar', this.clienteId]);
  }

  goBackToList() {
    this.router.navigate(['/dashboard/clientes']);
  }
}
