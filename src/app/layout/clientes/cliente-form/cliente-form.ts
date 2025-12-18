import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgxMaskDirective } from 'ngx-mask';

import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';

import { ActivatedRoute, Router } from '@angular/router';

import { Cliente } from '../../../models/cliente.model';
import { ClienteService } from '../../../services/cliente.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cliente-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatExpansionModule,
    MatSelectModule,
    NgxMaskDirective,
    MatDatepickerModule,
  ],
  templateUrl: './cliente-form.html',
  styleUrl: './cliente-form.scss',
})
export class ClienteForm implements OnInit, OnDestroy {
  isEditing: boolean = false;
  clienteId: string | null = null;
  isLoading: boolean = false;

  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private clienteService = inject(ClienteService); // ⬅️ NOVO

  clienteForm = this.fb.group({
    nome: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telefone: ['', Validators.required],
    cpf: ['', Validators.required],
    genero: [''],
    dataNascimento: ['', Validators.required],
    estadoCivil: ['', Validators.required],
    endereco: this.fb.group({
      cep: ['', Validators.required],
      rua: ['', Validators.required],
      numero: ['', Validators.required],
      complemento: [''],
      bairro: ['', Validators.required],
      cidade: ['', Validators.required],
      estado: ['', Validators.required],
    }),
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.clienteId = params.get('id');

      if (this.clienteId) {
        this.isEditing = true;
        this.loadCliente(this.clienteId);
      } else {
        this.isEditing = false;
        this.clienteForm.reset();
      }
    });
  }

  private routeSubscription?: Subscription;

  // 🎓 EXPLICAÇÃO: Carrega cliente do Supabase
  async loadCliente(id: string) {
    this.isLoading = true;
    this.clienteService.getClienteById(id).subscribe({
      next: (cliente) => {
        if (cliente) {
          this.clienteForm.patchValue(cliente);
          this.clienteForm.markAsPristine();
        } else {
          this.snackBar.open('Cliente não encontrado!', 'Fechar', { duration: 3000 });
          this.router.navigate(['/clientes']);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar cliente:', error);
        this.snackBar.open('Erro ao carregar cliente!', 'Fechar', { duration: 3000 });
        this.router.navigate(['/clientes']);
        this.isLoading = false;
      }
    });
  }

  async onSubmit() {
    if (this.clienteForm.valid) {
      this.isLoading = true;

      const clienteData = {
        ...this.clienteForm.value,
        dataNascimento: (this.clienteForm.value.dataNascimento as unknown) instanceof Date
          ? ((this.clienteForm.value.dataNascimento as unknown) as Date).toISOString()
          : this.clienteForm.value.dataNascimento
      } as Cliente;

      try {
        if (this.isEditing && this.clienteId) {
          // Atualizar cliente existente
          await this.clienteService.updateCliente(this.clienteId, clienteData);
          this.snackBar.open('Cliente atualizado com sucesso!', 'Fechar', { duration: 3000 });
        } else {
          // Adicionar novo cliente
          await this.clienteService.createCliente(clienteData);
          this.snackBar.open('Cliente adicionado com sucesso!', 'Fechar', { duration: 3000 });
        }
        this.router.navigate(['/clientes']);
      } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        this.snackBar.open('Erro ao salvar cliente. Tente novamente.', 'Fechar', { duration: 3000 });
      } finally {
        this.isLoading = false;
      }
    } else {
      this.snackBar.open('Por favor, preencha todos os campos obrigatórios corretamente.', 'Fechar', { duration: 3000 });
    }
  }

  onCancel() {
    this.router.navigate(['/clientes']);
  }

  ngOnDestroy() {
    this.routeSubscription?.unsubscribe();
  }
}