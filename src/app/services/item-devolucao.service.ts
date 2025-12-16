import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ItemsDevolucaoService {
  private readonly API = `${environment.apiUrl}/items-devolucao`;

  constructor(private http: HttpClient) {}

  // Listar todos os items de devolução
  listar(): Observable<any[]> {
    return this.http.get<any[]>(this.API);
  }

  // Criar um novo item de devolução
  criar(dados: any): Observable<any> {
    return this.http.post<any>(this.API, dados);
  }

  listarPorDevolucao(devolucaoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/por-devolucao/${devolucaoId}`);
  }
  
  // Remover um item de devolução
  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  // Atualizar um item de devolução
  atualizar(id: number, dados: any): Observable<any> {
    return this.http.put<any>(`${this.API}/${id}`, dados);
  }
}
