// src/app/services/items-reparacao.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ItemsReparacaoService {
  private readonly API = `${environment.apiUrl}/items-reparacao`; // usa environment.apiUrl

  constructor(private http: HttpClient) {}

  criar(item: any): Observable<any> {
    return this.http.post(`${this.API}`, item);
  }

  listar(): Observable<any[]> {
    return this.http.get<any[]>(this.API);
  }

  listarPorReparacao(reparacaoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/reparacao/${reparacaoId}`);
  }

  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
}
