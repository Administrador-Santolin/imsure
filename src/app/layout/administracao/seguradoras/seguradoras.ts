import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { Subscription } from 'rxjs';

import { Seguradora } from '../../../models/seguradora.model';
import { SeguradoraService } from '../../../services/seguradora.service';
import { MascaraPipe } from '../../../mascara-pipe';

@Component({
  selector: 'app-seguradoras',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatChipsModule,
    MascaraPipe
  ],
  templateUrl: './seguradoras.html',
  styleUrl: './seguradoras.scss'
})
export class Seguradoras implements OnInit, OnDestroy {
  dataSource = new MatTableDataSource<Seguradora>();
  displayedColumns: string[] = ['nome', 'cnpj', 'contato', 'status', 'actions'];
  isLoading = true;

  private subscription?: Subscription;
  private seguradoraService = inject(SeguradoraService);
  private snackBar = inject(MatSnackBar);

  ngOnInit() {
    this.loadSeguradoras();
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  loadSeguradoras() {
    this.isLoading = true;
    this.subscription = this.seguradoraService.getSeguradoras()
      .subscribe({
        next: (seguradoras) => {
          this.dataSource.data = seguradoras;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erro ao carregar seguradoras:', error);
          this.snackBar.open('Erro ao carregar seguradoras', 'Fechar', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  async onDelete(id: string | undefined) {
    if (!id) return;

    if (confirm('Tem certeza que deseja excluir esta seguradora?\n\nAtenção: Isso também removerá todos os vínculos com produtos.')) {
      try {
        await this.seguradoraService.deleteSeguradora(id);
        this.snackBar.open('Seguradora excluída com sucesso!', 'Fechar', { duration: 3000 });
        this.loadSeguradoras();
      } catch (error) {
        console.error('Erro ao excluir seguradora:', error);
        this.snackBar.open('Erro ao excluir seguradora. Verifique se não há apólices vinculadas.', 'Fechar', { duration: 5000 });
      }
    }
  }

  async toggleStatus(seguradora: Seguradora) {
    if (!seguradora.id) return;

    try {
      await this.seguradoraService.updateSeguradora(seguradora.id, {
        ativa: !seguradora.ativa
      });
      this.snackBar.open(
        `Seguradora ${seguradora.ativa ? 'desativada' : 'ativada'} com sucesso!`,
        'Fechar',
        { duration: 3000 }
      );
      this.loadSeguradoras();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      this.snackBar.open('Erro ao atualizar status', 'Fechar', { duration: 3000 });
    }
  }
}