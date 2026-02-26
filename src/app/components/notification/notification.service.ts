import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  /**
   * Alias para showSuccess (usado pelo relatorio.component)
   */
  success(message: string, duration: number = 3000): void {
    this.showSuccess(message, duration);
  }

  /**
   * Alias para showError (usado pelo relatorio.component)
   */
  error(message: string, duration: number = 5000): void {
    this.showError(message, duration);
  }

  /**
   * Mostra uma notificação de sucesso
   */
  showSuccess(message: string, duration: number = 3000): void {
    const config: MatSnackBarConfig = {
      duration,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    };
    
    this.snackBar.open(message, 'Fechar', config);
  }

  /**
   * Mostra uma notificação de erro
   */
  showError(message: string, duration: number = 5000): void {
    const config: MatSnackBarConfig = {
      duration,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    };
    
    this.snackBar.open(message, 'Fechar', config);
  }

  /**
   * Mostra uma notificação de aviso
   */
  showWarning(message: string, duration: number = 4000): void {
    const config: MatSnackBarConfig = {
      duration,
      panelClass: ['warning-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    };
    
    this.snackBar.open(message, 'Fechar', config);
  }
  
  /**
   * Mostra uma notificação informativa
   */
  showInfo(message: string, duration: number = 3000): void {
    const config: MatSnackBarConfig = {
      duration,
      panelClass: ['info-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    };
    
    this.snackBar.open(message, 'Fechar', config);
  }

  /**
   * Mostra uma notificação personalizada
   */
  showCustom(message: string, action: string = 'Fechar', config?: MatSnackBarConfig): void {
    const defaultConfig: MatSnackBarConfig = {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      ...config
    };
    
    this.snackBar.open(message, action, defaultConfig);
  }
}