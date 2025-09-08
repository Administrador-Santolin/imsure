import { Component, inject } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormControl, FormGroup, FormsModule, Validators, ReactiveFormsModule } from '@angular/forms';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [MatInputModule, MatButtonModule, MatCardModule, MatSnackBarModule, FormsModule, CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})

export class Login {
  private _snackBar = inject(MatSnackBar);
  loginForm = new FormGroup({
    username: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  });
  errorMessage: string | null = null;
  isLoading = false;

  get username() { return this.loginForm.get('username'); }
  get password() { return this.loginForm.get('password'); }

  constructor(private auth: Auth,
    private router: Router
  ) { }

  async onRegister() {
    this.errorMessage = null; // Limpa qualquer erro anterior
    // Aqui, vamos garantir que email e password nunca sejam undefined ou null
    const username = this.username?.value ?? '';
    const password = this.password?.value ?? '';
    if (!username || !password) {
      this.errorMessage = 'Por favor, preencha o e-mail e a senha corretamente.';
      this._snackBar.open(this.errorMessage, 'Fechar', { duration: 5000 });
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, username, password);
      // Se o displayName for nulo, mostramos só o email
      const nomeUsuario = userCredential.user.displayName || userCredential.user.email || '';
      this._snackBar.open('Registro bem-sucedido! Bem vindo, ' + nomeUsuario + '!', 'Fechar', {
        duration: 3000,
      });
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = this.getFirebaseErrorMessage(error.code);
      this._snackBar.open(this.errorMessage, 'Fechar', {
        duration: 5000,
      });
    } finally {
      this.isLoading = false;
    }
  }

  async onLogin() {
    this.isLoading = true;
    this.errorMessage = null; // Limpa qualquer erro anterior
    // Vamos garantir que email e password nunca sejam undefined ou null
    const username = this.username?.value ?? '';
    const password = this.password?.value ?? '';
    if (!username || !password) {
      this.errorMessage = 'Por favor, preencha o e-mail e a senha corretamente.';
      this._snackBar.open(this.errorMessage, 'Fechar', { duration: 5000 });
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, username, password);
      // Se o displayName for nulo, mostramos só o email
      const nomeUsuario = userCredential.user.displayName || userCredential.user.email || '';
      this._snackBar.open('Bem vindo, ' + nomeUsuario + '!', 'Fechar', {
        duration: 3000,
      });
      // Redirecionar para a página principal do sistema após o login
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = this.getFirebaseErrorMessage(error.code);
      this._snackBar.open(this.errorMessage, 'Fechar', { duration: 5000 });
    } finally {
      this.isLoading = false;
    }
  }

  private getFirebaseErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'Este e-mail já está em uso. Tente outro ou faça login.';
      case 'auth/invalid-email':
        return 'O formato do e-mail é inválido.';
      case 'auth/operation-not-allowed':
        return 'Operação não permitida. Verifique as configurações do Firebase.';
      case 'auth/weak-password':
        return 'A senha é muito fraca. Use pelo menos 6 caracteres.';
      case 'auth/user-disabled':
        return 'Esta conta de usuário foi desativada.';
      case 'auth/user-not-found':
        return 'Usuário não encontrado. Verifique seu e-mail ou registre-se.';
      case 'auth/wrong-password':
        return 'Senha incorreta. Tente novamente.';
      case 'auth/invalid-credential': // Erro mais genérico para credenciais inválidas
        return 'Credenciais inválidas. Verifique seu e-mail e senha.';
      default:
        return 'Ocorreu um erro desconhecido. Tente novamente.';
    }
  }
}
