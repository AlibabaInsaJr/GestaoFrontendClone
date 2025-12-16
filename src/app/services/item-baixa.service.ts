// src/app/services/item-baixa.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ItemBaixaService {
  private readonly API = `${environment.apiUrl}/items-baixa`;

  constructor(private http: HttpClient) {}

  listarPorBaixa(baixaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/por-baixa/${baixaId}`);
  }

  criar(dados: any): Observable<any> {
    return this.http.post<any>(this.API, dados);
  }

  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
}
