import { Component } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [MatInputModule, MatButtonModule, MatCardModule, FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  username = '';
  password = '';
  errorMessage: string | null = null;

  constructor(private auth: Auth, private router: Router) {}

  async onRegister() {
    this.errorMessage = null; // Limpa qualquer erro anterior
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, this.username, this.password);
      console.log('Usuário registrado com sucesso:', userCredential.user);
      alert('Registro bem-sucedido! Agora você pode fazer login.');
      // Opcional: Redirecionar para alguma página após o registro
      // this.router.navigate(['/dashboard']);
    } catch (error: any) {
      console.error('Erro no registro:', error.message);
      this.errorMessage = this.getFirebaseErrorMessage(error.code);
    }
  }

  async onLogin() {
    this.errorMessage = null; // Limpa qualquer erro anterior
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, this.username, this.password);
      console.log('Login bem-sucedido:', userCredential.user);
      alert('Login bem-sucedido!');
      // Redirecionar para a página principal do sistema após o login
      this.router.navigate(['/dashboard']); // Vamos criar esta rota em breve
    } catch (error: any) {
      console.error('Erro no login:', error.message);
      this.errorMessage = this.getFirebaseErrorMessage(error.code);
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
