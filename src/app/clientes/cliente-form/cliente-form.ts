import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'; // Adicione

import { MatFormFieldModule } from '@angular/material/form-field'; // Adicione
import { MatInputModule } from '@angular/material/input';       // Adicione
import { MatButtonModule } from '@angular/material/button';     // Adicione
import { MatCardModule } from '@angular/material/card';         // Adicione
import { MatIconModule } from '@angular/material/icon';         // Adicione
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; // Para mensagens de feedback
import { MatRadioModule } from '@angular/material/radio';
import { MatExpansionModule } from '@angular/material/expansion';

// Imports do Firestore e Roteamento
import { Firestore, collection, doc, addDoc, updateDoc, getDoc } from '@angular/fire/firestore'; // Adicione
import { ActivatedRoute, Router } from '@angular/router'; // Adicione

interface Cliente {
  id?: string;
  nome: string;
  email: string;
  telefone: string;
  cpf?: string; // Adicione
  endereco?: string; // Adicione
  dataNascimento?: string; // Adicione
}

@Component({
  selector: 'app-cliente-form',
  standalone: true,
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
    MatExpansionModule
  ],
  templateUrl: './cliente-form.html',
  styleUrl: './cliente-form.scss'
})
export class ClienteForm implements OnInit {
  clienteForm: FormGroup;
  isEditing: boolean = false;
  clienteId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar // Para exibir mensagens
  ) {
    // Inicializa o formulário com os campos e validações
    this.clienteForm = this.fb.group({
      nome: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefone: ['', Validators.required],
      cpf: [''], // Adicione
      endereco: [''], // Adicione
      dataNascimento: [''] // Adicione
    });
  }

  ngOnInit() {
    // Verifica se é uma rota de edição (se há um 'id' na URL)
    this.clienteId = this.route.snapshot.paramMap.get('id');
    if (this.clienteId) {
      this.isEditing = true;
      this.loadCliente(this.clienteId); // Carrega os dados do cliente para edição
    }
  }

  async loadCliente(id: string) {
    const clienteDocRef = doc(this.firestore, `clientes/${id}`);
    const docSnap = await getDoc(clienteDocRef);

    if (docSnap.exists()) {
      this.clienteForm.patchValue(docSnap.data() as Cliente); // Preenche o formulário
    } else {
      this.snackBar.open('Cliente não encontrado!', 'Fechar', { duration: 3000 });
      this.router.navigate(['/dashboard/clientes']); // Redireciona de volta
    }
  }

  async onSubmit() {
    if (this.clienteForm.valid) {
      const clienteData = this.clienteForm.value as Cliente;
      try {
        if (this.isEditing && this.clienteId) {
          // Atualizar cliente existente
          const clienteDocRef = doc(this.firestore, `clientes/${this.clienteId}`);
          await updateDoc(clienteDocRef, { ...clienteData });
          this.snackBar.open('Cliente atualizado com sucesso!', 'Fechar', { duration: 3000 });
        } else {
          // Adicionar novo cliente
          const clientesCollection = collection(this.firestore, 'clientes');
          await addDoc(clientesCollection, clienteData);
          this.snackBar.open('Cliente adicionado com sucesso!', 'Fechar', { duration: 3000 });
        }
        this.router.navigate(['/dashboard/clientes']); // Volta para a lista de clientes
      } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        this.snackBar.open('Erro ao salvar cliente. Tente novamente.', 'Fechar', { duration: 3000 });
      }
    } else {
      this.snackBar.open('Por favor, preencha todos os campos obrigatórios corretamente.', 'Fechar', { duration: 3000 });
    }
  }

  onCancel() {
    this.router.navigate(['/clientes']); // Volta para a lista de clientes
  }
}
