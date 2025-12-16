import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ErrorHandlerService } from './error-handler.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UtilizadorService {
  private baseUrl = `${environment.apiUrl}/utilizadores`;

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService,
    private authService: AuthService
  ) {}

  listar(): Observable<any[]> {
    console.log('Buscando utilizadores na URL:', this.baseUrl);
    return this.http.get<any[]>(`${this.baseUrl}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  buscarPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  criar(utilizador: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}`, utilizador).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  atualizar(id: number, utilizador: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, utilizador).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  remover(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Manipula erros HTTP nas requisições
   */
  private handleError(error: HttpErrorResponse) {
    console.error('UtilizadorService - Erro na requisição:', error);
    
    // Verificar se é erro de autenticação
    if (error.status === 401 || error.status === 403) {
      console.warn('UtilizadorService - Erro de autenticação:', error.status);
      
      // Verificar se o token ainda é válido
      if (!this.authService.isAuthenticated()) {
        console.warn('UtilizadorService - Usuário não está autenticado. Redirecionando para login...');
      }
    }
    
    // Usar o ErrorHandlerService para formatar a mensagem de erro
    const errorMessage = this.errorHandler.handleHttpError(error);
    
    // Retornar o erro para ser tratado pelo componente
    return throwError(() => error);
  }
}
