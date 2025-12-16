import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuditService } from './audit.service';
import { ErrorHandlerService } from './error-handler.service';
import { AuthService } from './auth.service';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EquipamentoService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private auditService: AuditService,
    private errorHandler: ErrorHandlerService,
    private authService: AuthService
  ) {}


  // Equipamentos
  listarEquipamentos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/equipamentos`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  listarEquipamentosPaginado(page: number, size: number, sort?: string): Observable<PageResponse<any>> {
    const params: any = { page, size };
    if (sort) params.sort = sort;
    return this.http.get<PageResponse<any>>(`${this.baseUrl}/equipamentos/paginado`, { params }).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  // Criar novo equipamento
  criarEquipamento(equipamento: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/equipamentos`, equipamento).pipe(
      tap(response => {
        if (response && response.id) {
          this.auditService.logEquipmentCreated(
            response.id,
            equipamento.numeroSerie || `Equipamento ID: ${response.id}`
          );
        }
      }),
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }
  // Buscar equipamento por ID
  buscarPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/equipamentos/${id}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  // Buscar histórico por equipamento
  buscarHistorico(equipamentoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/historico/${equipamentoId}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  // Listar histórico geral (todas as atividades reais)
  listarHistorico(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/historico`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  // Modelos
  listarModelos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/modelos`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  // Tipos de Equipamento
  listarTipos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/tipos_equipamento`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  // Aquisicoes
  listarAquisicoes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/aquisicoes`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }
  excluirEquipamento(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/equipamentos/${id}`).pipe(
      tap(() => {
        this.auditService.logEquipmentDeleted(id, `Equipamento ID: ${id}`);
      }),
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }
  
  // Atualizar equipamento existente
  atualizarEquipamento(id: number, equipamento: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/equipamentos/${id}`, equipamento).pipe(
      tap(response => {
        if (response) {
          this.auditService.logEquipmentUpdated(
            id,
            equipamento.numeroSerie || `Equipamento ID: ${id}`
          );
        }
      }),
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  // Atualizar apenas o estado do equipamento
  atualizarEstado(id: number, novoEstado: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/equipamentos/${id}/estado`, { estado: novoEstado }).pipe(
      tap(response => {
        if (response) {
          this.auditService.logEquipmentUpdated(
            id,
            `Estado alterado para: ${novoEstado}`
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
    console.error('EquipamentoService - Erro na requisição:', error);
    
    // Verificar se é erro de autenticação
    if (error.status === 401 || error.status === 403) {
      console.warn('EquipamentoService - Erro de autenticação:', error.status);
      
      // Verificar se o token ainda é válido
      if (!this.authService.isAuthenticated()) {
        console.warn('EquipamentoService - Usuário não está autenticado. Redirecionando para login...');
      }
    }
    
    // Usar o ErrorHandlerService para formatar a mensagem de erro
    const errorMessage = this.errorHandler.handleHttpError(error);
    
    // Retornar o erro para ser tratado pelo componente
    return throwError(() => error);
  }
}
