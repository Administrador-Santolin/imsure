import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Produto } from '../../../models/produto.model';
import { ProdutoService } from '../../../services/produto.service';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-produtos',
  imports: [
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinner,
    MatChipsModule,
    MatTableModule,
    MatButtonModule,
    RouterModule
  ],
  templateUrl: './produtos.html',
  styleUrl: './produtos.scss',
})

export class Produtos implements OnInit, OnDestroy {
  dataSource = new MatTableDataSource<Produto>();
  displayedColumns: string[] = ['nome', 'tipoSeguro', 'descricao', 'status', 'actions'];
  isLoading = true;

  private subscription?: Subscription;
  private produtoService = inject(ProdutoService);
  private snackBar = inject(MatSnackBar);

  ngOnInit() {
    this.loadProdutos();
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  loadProdutos() {
    this.isLoading = true;
    this.subscription = this.produtoService.getProdutos()
      .subscribe({
        next: (produtos) => {
          this.dataSource.data = produtos;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erro ao carregar produtos:', error);
          this.snackBar.open('Erro ao carregar produtos', 'Fechar', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  async onDelete(id: string | undefined) {
    if (!id) return;

    if (confirm('Tem certeza que deseja excluir este produto?\n\nAtenção: Isso também removerá todos os vínculos com seguradoras.')) {
      try {
        await this.produtoService.deleteProduto(id);
        this.snackBar.open('Produto excluído com sucesso!', 'Fechar', { duration: 3000 });
        this.loadProdutos();
      } catch (error) {
        console.error('Erro ao excluir produto:', error);
        this.snackBar.open('Erro ao excluir produto. Verifique se não há apólices vinculadas.', 'Fechar', { duration: 5000 });
      }
    }
  }

  async toggleStatus(produto: Produto) {
    if (!produto.id) return;

    try {
      await this.produtoService.updateProduto(produto.id, {
        ativo: !produto.ativo
      });
      this.snackBar.open(
        `Produto ${produto.ativo ? 'desativado' : 'ativado'} com sucesso!`,
        'Fechar',
        { duration: 3000 }
      );
      this.loadProdutos();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      this.snackBar.open('Erro ao atualizar status', 'Fechar', { duration: 3000 });
    }
  }
}