// items-alocacao.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { ErrorHandlerService } from './error-handler.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ItemsAlocacaoService {
  private readonly API = `${environment.apiUrl}/items-alocacao`;

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService,
    private authService: AuthService
  ) {}

  listar(): Observable<any[]> {
    return this.http.get<any[]>(this.API).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  criar(dados: any): Observable<any> {
    return this.http.post<any>(this.API, dados).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  listarPorAlocacao(alocacaoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/por-alocacao/${alocacaoId}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  atualizar(id: number, dados: any): Observable<any> {
    return this.http.put<any>(`${this.API}/${id}`, dados).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Manipula erros HTTP nas requisições
   */
  private handleError(error: HttpErrorResponse) {
    console.error('ItemsAlocacaoService - Erro na requisição:', error);
    
    // Verificar se é erro de autenticação
    if (error.status === 401 || error.status === 403) {
      console.warn('ItemsAlocacaoService - Erro de autenticação:', error.status);
      
      // Verificar se o token ainda é válido
      if (!this.authService.isAuthenticated()) {
        console.warn('ItemsAlocacaoService - Usuário não está autenticado. Redirecionando para login...');
      }
    }
    
    // Usar o ErrorHandlerService para formatar a mensagem de erro
    const errorMessage = this.errorHandler.handleHttpError(error);
    
    // Retornar o erro para ser tratado pelo componente
    return throwError(() => error);
  }
}
