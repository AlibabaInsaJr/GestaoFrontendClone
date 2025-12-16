// alocacao.service.ts
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, retry } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { ErrorHandlerService } from './error-handler.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AlocacaoService {
  private readonly API = `${environment.apiUrl}/alocacoes`;

  constructor(
    private http: HttpClient,
    private auditService: AuditService,
    private errorHandler: ErrorHandlerService,
    private authService: AuthService
  ) {}

  listar(): Observable<any[]> {
    return this.http.get<any[]>(this.API).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  // Lista apenas alocações com itens ativos (não devolvidos)
  listarAtivas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/ativas`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  criar(dados: any): Observable<any> {
    return this.http.post<any>(this.API, dados).pipe(
      tap(response => {
        if (response && response.id) {
          this.auditService.logAllocationCreated(
            response.id,
            `Equipamento ID: ${dados.equipamentoId || 'N/A'}`,
            `Usuário ID: ${dados.utilizadorBeneficiarioId || 'N/A'}`
          );
        }
      }),
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  buscarPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.API}/${id}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`).pipe(
      tap(() => {
        this.auditService.logAllocationDeleted(id, `Alocação ID: ${id}`);
      }),
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  atualizar(id: number, dados: any): Observable<any> {
    return this.http.put<any>(`${this.API}/${id}`, dados).pipe(
      tap(response => {
        if (response) {
          this.auditService.logAllocationUpdated(
            id,
            `Equipamento ID: ${dados.equipamentoId || 'N/A'}`,
            `Usuário ID: ${dados.utilizadorBeneficiarioId || 'N/A'}`
          );
        }
      }),
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Manipula erros HTTP nas requisições
   */
  private handleError(error: HttpErrorResponse) {
    console.error('AlocacaoService - Erro na requisição:', error);
    
    // Verificar se é erro de autenticação
    if (error.status === 401 || error.status === 403) {
      console.warn('AlocacaoService - Erro de autenticação:', error.status);
      
      // Verificar se o token ainda é válido
      if (!this.authService.isAuthenticated()) {
        console.warn('AlocacaoService - Usuário não está autenticado. Redirecionando para login...');
      }
    }
    
    // Usar o ErrorHandlerService para formatar a mensagem de erro
    const errorMessage = this.errorHandler.handleHttpError(error);
    
    // Retornar o erro para ser tratado pelo componente
    return throwError(() => error);
  }
}