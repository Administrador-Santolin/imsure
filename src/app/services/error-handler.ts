import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
 private snackBar = inject(MatSnackBar)

  handleError(error: any, message?: string): void {
    const errorMessage = message || this.getErrorMessage(error);
    this.snackBar.open(errorMessage, 'Fechar', { duration: 5000 });
  }

  private getErrorMessage(error: any): string {
    // Lógica centralizada de tratamento de erros
    return 'Ocorreu um erro inesperado. Por favor, tente novamente.';
  }
}
