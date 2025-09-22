import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  private snackBar = inject(MatSnackBar)

  handleError(error: any, message?: string): void {
    const errorMessage = message || this.getErrorMessage(error);
    this.snackBar.open(errorMessage, 'Fechar', {
      duration: 5000,
      panelClass: ['error-snackbar'] // Classe CSS para estilizar
    });
  }

  private getErrorMessage(error: any): string {
    // 1. Erro de rede (sem internet, servidor fora do ar)
    if (error instanceof HttpErrorResponse) {
      return this.handleHttpError(error);
    }

    // 2. Erro do Firebase
    if (error?.code && error.code.startsWith('auth/')) {
      return this.handleFirebaseError(error);
    }

    // 3. Erro do Firestore
    if (error?.code && error.code.startsWith('firestore/')) {
      return this.handleFirestoreError(error);
    }

    // 4. Erro de validação
    if (error?.message && error.message.includes('validation')) {
      return 'Dados inválidos. Verifique as informações e tente novamente.';
    }

    // 5. Erro de timeout
    if (error?.name === 'TimeoutError' || error?.message?.includes('timeout')) {
      return 'A operação demorou muito para responder. Tente novamente.';
    }

    // 6. Erro genérico (último recurso)
    return 'Ocorreu um erro inesperado. Por favor, tente novamente.';
  }

  // ✅ TRATA ERROS HTTP (APIs externas)
  private handleHttpError(error: HttpErrorResponse): string {
    switch (error.status) {
      case 400:
        return 'Dados inválidos enviados. Verifique as informações.';
      case 401:
        return 'Não autorizado. Faça login novamente.';
      case 403:
        return 'Acesso negado. Você não tem permissão para esta ação.';
      case 404:
        return 'Recurso não encontrado. Verifique se a URL está correta.';
      case 408:
        return 'Tempo limite excedido. Tente novamente.';
      case 429:
        return 'Muitas tentativas. Aguarde um momento e tente novamente.';
      case 500:
        return 'Erro interno do servidor. Tente novamente mais tarde.';
      case 502:
        return 'Servidor temporariamente indisponível. Tente novamente.';
      case 503:
        return 'Serviço temporariamente indisponível. Tente novamente.';
      default:
        return `Erro ${error.status}: ${error.message || 'Erro desconhecido'}`;
    }
  }

  // ✅ TRATA ERROS DO FIREBASE AUTH
  private handleFirebaseError(error: any): string {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'Este e-mail já está em uso. Tente outro ou faça login.';
      case 'auth/invalid-email':
        return 'O formato do e-mail é inválido.';
      case 'auth/operation-not-allowed':
        return 'Operação não permitida. Verifique as configurações.';
      case 'auth/weak-password':
        return 'A senha é muito fraca. Use pelo menos 6 caracteres.';
      case 'auth/user-disabled':
        return 'Esta conta foi desativada. Entre em contato com o suporte.';
      case 'auth/user-not-found':
        return 'Usuário não encontrado. Verifique seu e-mail ou registre-se.';
      case 'auth/wrong-password':
        return 'Senha incorreta. Tente novamente.';
      case 'auth/invalid-credential':
        return 'Credenciais inválidas. Verifique seu e-mail e senha.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas de login. Aguarde um momento.';
      case 'auth/network-request-failed':
        return 'Erro de conexão. Verifique sua internet.';
      default:
        return 'Erro de autenticação. Tente novamente.';
    }
  }

  // ✅ TRATA ERROS DO FIRESTORE
  private handleFirestoreError(error: any): string {
    switch (error.code) {
      case 'firestore/permission-denied':
        return 'Permissão negada. Você não pode acessar estes dados.';
      case 'firestore/not-found':
        return 'Dados não encontrados.';
      case 'firestore/already-exists':
        return 'Estes dados já existem.';
      case 'firestore/resource-exhausted':
        return 'Limite de uso excedido. Tente novamente mais tarde.';
      case 'firestore/failed-precondition':
        return 'Condição não atendida. Verifique os dados.';
      case 'firestore/aborted':
        return 'Operação cancelada. Tente novamente.';
      case 'firestore/out-of-range':
        return 'Valor fora do intervalo permitido.';
      case 'firestore/unimplemented':
        return 'Operação não implementada.';
      case 'firestore/internal':
        return 'Erro interno. Tente novamente.';
      case 'firestore/unavailable':
        return 'Serviço temporariamente indisponível.';
      case 'firestore/data-loss':
        return 'Perda de dados. Verifique as informações.';
      case 'firestore/unauthenticated':
        return 'Não autenticado. Faça login novamente.';
      default:
        return 'Erro no banco de dados. Tente novamente.';
    }
  }

  // ✅ MÉTODO PARA MOSTRAR SUCESSO (BÔNUS!)
  showSuccess(message: string): void {
    this.snackBar.open(message, 'Fechar', { 
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  // ✅ MÉTODO PARA MOSTRAR INFORMAÇÃO (BÔNUS!)
  showInfo(message: string): void {
    this.snackBar.open(message, 'Fechar', { 
      duration: 4000,
      panelClass: ['info-snackbar']
    });
  }
}
