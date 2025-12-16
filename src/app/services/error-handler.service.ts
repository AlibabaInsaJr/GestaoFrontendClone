import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { NotificationService } from '../components/notification/notification.service';

export interface ErrorMessage {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  
  constructor(
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  /**
   * Trata erros HTTP de forma centralizada
   */
  handleHttpError(error: HttpErrorResponse): ErrorMessage {
    let errorMessage: ErrorMessage;

    switch (error.status) {
      case 0:
        // Erro de rede ou servidor não disponível
        errorMessage = {
          title: 'Erro de Conexão',
          message: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.',
          type: 'error'
        };
        break;

      case 400:
        // Bad Request
        errorMessage = {
          title: 'Dados Inválidos',
          message: this.extractErrorMessage(error) || 'Os dados fornecidos são inválidos. Verifique as informações e tente novamente.',
          type: 'warning'
        };
        break;

      case 401:
        // Unauthorized
        errorMessage = {
          title: 'Não Autorizado',
          message: 'Suas credenciais expiraram ou são inválidas.',
          type: 'warning'
        };
        // Não fazer logout automático aqui - deixar o interceptor tratar
        break;

      case 403:
        // Forbidden
        errorMessage = {
          title: 'Acesso Negado',
          message: 'Você não tem permissão para realizar esta ação.',
          type: 'warning'
        };
        break;

      case 404:
        // Not Found
        errorMessage = {
          title: 'Não Encontrado',
          message: 'O recurso solicitado não foi encontrado.',
          type: 'warning'
        };
        break;

      case 409:
        // Conflict
        errorMessage = {
          title: 'Conflito',
          message: this.extractErrorMessage(error) || 'Já existe um registo com essas informações.',
          type: 'warning'
        };
        break;

      case 422:
        // Unprocessable Entity
        errorMessage = {
          title: 'Dados Inválidos',
          message: this.extractErrorMessage(error) || 'Os dados fornecidos não puderam ser processados.',
          type: 'warning'
        };
        break;

      case 500:
        // Internal Server Error
        errorMessage = {
          title: 'Erro do Servidor',
          message: 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.',
          type: 'error'
        };
        break;

      case 502:
      case 503:
      case 504:
        // Bad Gateway, Service Unavailable, Gateway Timeout
        errorMessage = {
          title: 'Serviço Indisponível',
          message: 'O serviço está temporariamente indisponível. Tente novamente em alguns minutos.',
          type: 'error'
        };
        break;

      default:
        errorMessage = {
          title: 'Erro Inesperado',
          message: `Ocorreu um erro inesperado (${error.status}). Tente novamente mais tarde.`,
          type: 'error'
        };
        break;
    }

    // Log do erro para debugging
    console.error('HTTP Error:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      message: error.message,
      error: error.error
    });

    return errorMessage;
  }

  /**
   * Trata erros de validação de formulários
   */
  handleValidationErrors(errors: any): string[] {
    const errorMessages: string[] = [];

    if (typeof errors === 'object' && errors !== null) {
      Object.keys(errors).forEach(field => {
        const fieldErrors = errors[field];
        if (Array.isArray(fieldErrors)) {
          fieldErrors.forEach(error => {
            errorMessages.push(`${this.getFieldDisplayName(field)}: ${error}`);
          });
        } else if (typeof fieldErrors === 'string') {
          errorMessages.push(`${this.getFieldDisplayName(field)}: ${fieldErrors}`);
        }
      });
    }

    return errorMessages;
  }

  /**
   * Mostra uma notificação de erro
   */
  showError(errorMessage: ErrorMessage): void {
    this.notificationService.showError(`${errorMessage.title}: ${errorMessage.message}`);
  }

  /**
   * Mostra uma notificação de sucesso
   */
  showSuccess(message: string): void {
    this.notificationService.showSuccess(message);
  }

  /**
   * Mostra uma notificação de aviso
   */
  showWarning(message: string): void {
    this.notificationService.showWarning(message);
  }

  /**
   * Mostra uma notificação de informação
   */
  showInfo(message: string): void {
    this.notificationService.showInfo(message);
  }

  // Métodos privados
  private extractErrorMessage(error: HttpErrorResponse): string | null {
    if (error.error) {
      // Tentar extrair mensagem do backend
      if (typeof error.error === 'string') {
        return error.error;
      }
      
      if (error.error.message) {
        return error.error.message;
      }
      
      if (error.error.error) {
        return error.error.error;
      }
      
      if (error.error.details) {
        return error.error.details;
      }
    }
    
    return null;
  }

  private getFieldDisplayName(fieldName: string): string {
    const fieldNames: { [key: string]: string } = {
      username: 'Nome de usuário',
      email: 'Email',
      password: 'Senha',
      currentPassword: 'Senha atual',
      newPassword: 'Nova senha',
      confirmPassword: 'Confirmação de senha',
      nome: 'Nome',
      descricao: 'Descrição',
      codigo: 'Código',
      valor: 'Valor',
      data: 'Data',
      observacoes: 'Observações'
    };
    
    return fieldNames[fieldName] || fieldName;
  }
}