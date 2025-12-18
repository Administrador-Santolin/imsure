import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from "@angular/material/input";
import { ProdutoService } from '../../../../services/produto.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Produto } from '../../../../models/produto.model';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-produtos-form',
  imports: [
    MatFormFieldModule, 
    MatInputModule, 
    ReactiveFormsModule,
    MatButtonModule
  ],
  templateUrl: './produtos-form.html',
  styleUrl: './produtos-form.scss',
})
export class ProdutosForm {
  produtoId: string | null = null;
  isEditing: boolean = false;
  isLoading: boolean = false;

  private fb = inject(FormBuilder);
  private snackbar = inject(MatSnackBar);
  private produtoService = inject(ProdutoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  produtosForm = this.fb.group({
    nome: ['', Validators.required],
    tipoSeguro: ['', Validators.required],
    descricao: ['']
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.produtoId = params.get('id');

      if(this.produtoId) {
        this.isEditing = true;
        this.loadProduto(this.produtoId);
      } else {
        this.isEditing = false;
        this.produtosForm.reset();
      }
    })
  }

  private routeSubscription?: Subscription;

  async loadProduto(id: string) {
    this.isLoading = true;
    this.produtoService.getProdutoById(id).subscribe({
      next: (produto) => {
        if (produto) {
          this.produtosForm.patchValue(produto);
          this.produtosForm.markAsPristine();
        } else {
          this.snackbar.open('Produto não encontrado.', 'Fechar', { duration: 3000 });
          this.router.navigate(['/administracao/produtos']);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar produto:', error);
        this.snackbar.open('Erro ao carregar produto.', 'Fechar', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  async onSubmit() {
    if (this.produtosForm.valid) {
      this.isLoading = true;

      const produtoData = this.produtosForm.value as Produto;

      try {
        if (this.isEditing && this.produtoId) {
          await this.produtoService.updateProduto(this.produtoId, produtoData);
          this.snackbar.open('Produto atualizado com sucesso!', 'Fechar', { duration: 3000 });
      }else {
        await this.produtoService.createProduto(produtoData);
        this.snackbar.open('Produto criado com sucesso!', 'Fechar', { duration: 3000 });
      }
      this.router.navigate(['/administracao/produtos']);
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      this.snackbar.open('Erro ao salvar produto.', 'Fechar', { duration: 3000 });
    } finally {
      this.isLoading = false;
    }
  }
}

  onCancel() {
    this.router.navigate(['/administracao/produtos']);
  }

  ngOnDestroy() {
    this.routeSubscription?.unsubscribe();
  }
}
