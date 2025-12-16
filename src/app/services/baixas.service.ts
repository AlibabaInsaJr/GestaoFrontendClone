// src/app/services/baixas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

@Injectable({
  providedIn: 'root'
})
export class BaixasService {
  private readonly API = `${environment.apiUrl}/baixas`;

  constructor(
    private http: HttpClient,
    private auditService: AuditService
  ) {}

  listar(): Observable<any[]> {
    return this.http.get<any[]>(this.API);
  }

  criar(dados: any): Observable<any> {
    return this.http.post<any>(this.API, dados).pipe(
      tap(response => {
        this.auditService.logDisuseCreated(
          response.id,
          dados.equipamentoNome || `Equipamento ID: ${dados.equipamentoId}`,
          dados.motivo || 'Baixa registrada no sistema'
        );
      })
    );
  }

  buscarPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.API}/${id}`);
  }

  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`).pipe(
      tap(() => {
        this.auditService.logActivity('DELETE', 'baixa', id, `Baixa ${id}`, 'Baixa removida do sistema');
      })
    );
  }

  atualizar(id: number, dados: any): Observable<any> {
    return this.http.put<any>(`${this.API}/${id}`, dados).pipe(
      tap(response => {
        this.auditService.logActivity('UPDATE', 'baixa', id, `Baixa ${id}`, 'Baixa atualizada no sistema', dados);
      })
    );
  }
}
