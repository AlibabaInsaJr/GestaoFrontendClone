import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export type TipoImpressora = 'COLORIDA' | 'PRETO_BRANCO';

export interface ConsumiveisDto {
  black: number;
  cyan: number | null;
  magenta: number | null;
  yellow: number | null;
}

export interface ConsumivelImpressoraDto {
  id: number;
  referencia: string;
  tipo: TipoImpressora;
  localizacao: string;
  enderecoIp: string;
  consumiveis: ConsumiveisDto;
}

export type ConsumivelImpressoraPayload = Omit<ConsumivelImpressoraDto, 'id'>;
export type SyncStatus = 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';
export interface SnmpSyncItemResult {
  id?: number;
  referencia?: string;
  success: boolean;
  message: string;
  timestamp?: string;
}
export interface SnmpSyncResult {
  success: boolean;
  message: string;
  syncedCount?: number;
  failedCount?: number;
  totalCount?: number;
  timestamp?: string;
  results?: SnmpSyncItemResult[];
}

@Injectable({
  providedIn: 'root'
})
export class ConsumivelImpressoraService {
  private baseUrl = `${environment.apiUrl}/consumiveis-impressora`;
  private fallbackUrl = `${environment.apiUrl}/consumiveis-impressoras`;

  constructor(private http: HttpClient) {}

  listar(): Observable<ConsumivelImpressoraDto[]> {
    return this.http.get<ConsumivelImpressoraDto[]>(this.baseUrl).pipe(
      retry(1),
      catchError((error) => {
        if (error?.status === 404) {
          return this.http.get<ConsumivelImpressoraDto[]>(this.fallbackUrl);
        }
        return throwError(() => error);
      }),
      catchError((error) => throwError(() => error))
    );
  }

  buscarPorId(id: number): Observable<ConsumivelImpressoraDto> {
    return this.http.get<ConsumivelImpressoraDto>(`${this.baseUrl}/${id}`).pipe(
      retry(1),
      catchError((error) => {
        if (error?.status === 404) {
          return this.http.get<ConsumivelImpressoraDto>(`${this.fallbackUrl}/${id}`);
        }
        return throwError(() => error);
      }),
      catchError((error) => throwError(() => error))
    );
  }

  criar(payload: ConsumivelImpressoraPayload): Observable<ConsumivelImpressoraDto | null> {
    return this.http.post<ConsumivelImpressoraDto | null>(this.baseUrl, payload).pipe(
      catchError((error) => {
        if (error?.status === 404) {
          return this.http.post<ConsumivelImpressoraDto | null>(this.fallbackUrl, payload);
        }
        return throwError(() => error);
      }),
      catchError((error) => throwError(() => error))
    );
  }

  atualizar(id: number, payload: ConsumivelImpressoraPayload): Observable<ConsumivelImpressoraDto | null> {
    return this.http.put<ConsumivelImpressoraDto | null>(`${this.baseUrl}/${id}`, payload).pipe(
      catchError((error) => {
        if (error?.status === 404) {
          return this.http.put<ConsumivelImpressoraDto | null>(`${this.fallbackUrl}/${id}`, payload);
        }
        return throwError(() => error);
      }),
      catchError((error) => throwError(() => error))
    );
  }

  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      catchError((error) => {
        if (error?.status === 404) {
          return this.http.delete<void>(`${this.fallbackUrl}/${id}`);
        }
        return throwError(() => error);
      }),
      catchError((error) => throwError(() => error))
    );
  }

  syncAllSnmp(): Observable<SnmpSyncResult> {
    return this.http.post<SnmpSyncResult>(`${this.baseUrl}/sync-snmp`, {}).pipe(
      catchError((error) => this.handleSyncError(error, 'Sincronização SNMP em lote indisponível.'))
    );
  }

  syncOneSnmp(id: number): Observable<SnmpSyncResult> {
    return this.http.post<SnmpSyncResult>(`${this.baseUrl}/${id}/sync-snmp`, {}).pipe(
      catchError((error) => this.handleSyncError(error, `Falha ao sincronizar impressora ${id}.`))
    );
  }

  private handleSyncError(error: any, fallback: string) {
    let message = fallback;
    if (error?.status === 0) message = 'Sem conectividade com a API/backend.';
    else if (error?.status === 404) message = 'Endpoint SNMP não encontrado no backend.';
    else if (error?.status >= 500) message = 'Erro interno no backend SNMP.';
    else if (error?.name === 'TimeoutError') message = 'Tempo limite excedido na sincronização SNMP.';
    return throwError(() => ({ ...error, userMessage: message }));
  }
}