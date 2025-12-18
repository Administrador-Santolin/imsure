import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { SeguradoraService } from '../../../../services/seguradora.service';
import { Subscription } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgxMaskDirective } from 'ngx-mask';
import { MatButtonModule } from '@angular/material/button';
import { cnpjValidator } from '../../../../pipes/cnpj.validator';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-seguradoras-form',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    NgxMaskDirective,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './seguradoras-form.html',
  styleUrl: './seguradoras-form.scss',
})
export class SeguradorasForm {
  isEditing: boolean = false;
  seguradoraId: string | null = null;
  isLoading: boolean = false;

  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private seguradoraService = inject(SeguradoraService);

  seguradoraForm = this.fb.group({
    nome: ['', Validators.required],
    cnpj: ['', [Validators.required, cnpjValidator()]],
    contatoComercial: [''],
    telefone: [''],
    email: ['', Validators.email]
  })

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.seguradoraId = params.get('id');
      if (this.seguradoraId) {
        this.isEditing = true;
        this.loadSeguradora(this.seguradoraId);
      } else {
        this.isEditing = false;
        this.seguradoraForm.reset();
      }
    });
  }

  private routeSubscription?: Subscription;

  async loadSeguradora(id: string) {
    this.isLoading = true;
    this.seguradoraService.getSeguradoraById(id).subscribe({
      next: (seguradora) => {
        if (seguradora) {
          this.seguradoraForm.patchValue(seguradora);
          this.seguradoraForm.markAsPristine();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open('Erro ao carregar seguradora.', 'Fechar', { duration: 3000 });
      }
    });
  }

  async onSubmit() {
    if (this.seguradoraForm.valid) {
      this.isLoading = true;
      const seguradoraData = this.seguradoraForm.value as any;

      try {
        if (this.isEditing && this.seguradoraId) {
          await this.seguradoraService.updateSeguradora(this.seguradoraId, seguradoraData);
          this.snackBar.open('Seguradora atualizada com sucesso!', 'Fechar', { duration: 3000 });
        } else {
          this.snackBar.open('Seguradora criada com sucesso!', 'Fechar', { duration: 3000 });
        }
        this.router.navigate(['/administracao/seguradoras']);
      } catch (error: any) {
        console.error('Erro ao salvar seguradora:', error);

        if (error?.message?.includes('unique') || error?.code === '23505') {
          this.snackBar.open('Já existe uma seguradora com este CNPJ.', 'Fechar', { duration: 3000 });
        } else {
          this.snackBar.open('Erro ao salvar seguradora.', 'Fechar', { duration: 3000 });
        }
      } finally {
        this.isLoading = false;
      }
    } else {
      this.snackBar.open('Por favor, preencha todos os campos obrigatórios.', 'Fechar', { duration: 3000 });
    }
  }

  onCancel() {
    this.router.navigate(['/administracao/seguradoras']);
  }

  ngOnDestroy() {
    this.routeSubscription?.unsubscribe();
  }
}
