// src/app/services/reparacao.service.ts

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

@Injectable({
  providedIn: 'root'
})
export class ReparacaoService {
  private readonly API = `${environment.apiUrl}/reparacoes`;

  constructor(
    private http: HttpClient,
    private auditService: AuditService
  ) {}

  criar(dados: any): Observable<any> {
    return this.http.post<any>(`${this.API}`, dados).pipe(
      tap(response => {
        if (response && response.id) {
          this.auditService.logRepairCreated(
            response.id,
            `Reparação para empresa ID: ${dados.empresaId || 'N/A'}`
          );
        }
      })
    );
  }

  listar(): Observable<any[]> {
    return this.http.get<any[]>(this.API);
  }

  buscarPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.API}/${id}`);
  }

  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`).pipe(
      tap(() => {
        this.auditService.logActivity('DELETE', 'reparacao', id, `Reparação ${id}`, 'Reparação removida do sistema');
      })
    );
  }

  atualizar(id: number, dados: any): Observable<any> {
    return this.http.put<any>(`${this.API}/${id}`, dados).pipe(
      tap(response => {
        if (response) {
          this.auditService.logRepairUpdated(
            id,
            `Reparação para empresa ID: ${dados.empresaId || 'N/A'}`
          );
        }
      })
    );
  }
}
