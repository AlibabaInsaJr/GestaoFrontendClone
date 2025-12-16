// src/app/services/devolucoes.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuditService } from './audit.service';

@Injectable({
  providedIn: 'root'
})
export class DevolucoesService {
  private API = `${environment.apiUrl}/devolucoes`;

  constructor(
    private http: HttpClient,
    private auditService: AuditService
  ) {}

  listar() {
    return this.http.get<any[]>(this.API);
  }

  criar(dto: any) {
    return this.http.post<any>(this.API, dto).pipe(
      tap(response => {
        this.auditService.logReturnCreated(
          response.id, 
          dto.equipamentoNome || `Equipamento ID: ${dto.equipamentoId}`,
          dto.usuarioNome || 'Usuário não identificado'
        );
      })
    );
  }

  excluir(id: number) {
    return this.http.delete(`${this.API}/${id}`).pipe(
      tap(() => {
        this.auditService.logActivity('DELETE', 'devolucao', id, `Devolução ${id}`, 'Devolução excluída do sistema');
      })
    );
  }
}
