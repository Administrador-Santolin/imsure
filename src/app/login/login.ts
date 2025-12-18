import { Component, inject } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormControl, FormGroup, FormsModule, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../services/supabase.service'; // ⬅️ NOVO

@Component({
  selector: 'app-login',
  imports: [
    MatInputModule, 
    MatButtonModule, 
    MatCardModule, 
    MatSnackBarModule, 
    FormsModule, 
    CommonModule, 
    ReactiveFormsModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private _snackBar = inject(MatSnackBar);
  private supabase = inject(SupabaseService); // ⬅️ NOVO
  private router = inject(Router);

  loginForm = new FormGroup({
    username: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  });
  
  errorMessage: string | null = null;
  isLoading = false;

  get username() { return this.loginForm.get('username'); }
  get password() { return this.loginForm.get('password'); }

  async onRegister() {
    this.isLoading = true;
    this.errorMessage = null;
    
    const username = this.username?.value ?? '';
    const password = this.password?.value ?? '';
    
    if (!username || !password) {
      this.errorMessage = 'Por favor, preencha o e-mail e a senha corretamente.';
      this._snackBar.open(this.errorMessage, 'Fechar', { duration: 5000 });
      this.isLoading = false;
      return;
    }

    try {
      const { data, error } = await this.supabase.signUp(username, password);
      
      if (error) throw error;
      
      this._snackBar.open('Registro bem-sucedido! Bem vindo, ' + username + '!', 'Fechar', {
        duration: 3000,
      });
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = this.getSupabaseErrorMessage(error.message);
      this._snackBar.open(this.errorMessage, 'Fechar', { duration: 5000 });
    } finally {
      this.isLoading = false;
    }
  }

  async onLogin() {
    this.isLoading = true;
    this.errorMessage = null;
    
    const username = this.username?.value ?? '';
    const password = this.password?.value ?? '';
    
    if (!username || !password) {
      this.errorMessage = 'Por favor, preencha o e-mail e a senha corretamente.';
      this._snackBar.open(this.errorMessage, 'Fechar', { duration: 5000 });
      this.isLoading = false;
      return;
    }

    try {
      const { data, error } = await this.supabase.signIn(username, password);
      
      if (error) throw error;
      
      this._snackBar.open('Bem vindo, ' + username + '!', 'Fechar', {
        duration: 3000,
      });
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = this.getSupabaseErrorMessage(error.message);
      this._snackBar.open(this.errorMessage, 'Fechar', { duration: 5000 });
    } finally {
      this.isLoading = false;
    }
  }

  // 🎓 EXPLICAÇÃO: Traduz erros do Supabase para português
  private getSupabaseErrorMessage(errorMessage: string): string {
    if (errorMessage.includes('Invalid login credentials')) {
      return 'Credenciais inválidas. Verifique seu e-mail e senha.';
    }
    if (errorMessage.includes('Email not confirmed')) {
      return 'E-mail não confirmado. Verifique sua caixa de entrada.';
    }
    if (errorMessage.includes('User already registered')) {
      return 'Este e-mail já está em uso. Tente fazer login.';
    }
    if (errorMessage.includes('Invalid email')) {
      return 'Formato de e-mail inválido.';
    }
    if (errorMessage.includes('Password should be at least 6 characters')) {
      return 'A senha deve ter pelo menos 6 caracteres.';
    }
    return 'Ocorreu um erro. Tente novamente.';
  }
}