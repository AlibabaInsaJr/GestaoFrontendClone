import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UnidadeService {
  private readonly API = `${environment.apiUrl}/unidades`;

  constructor(private http: HttpClient) {}

  listar(): Observable<any[]> {
    return this.http.get<any[]>(this.API);
  }

  criar(dados: any): Observable<any> {
    return this.http.post<any>(this.API, dados);
  }

  atualizar(id: number, dados: any): Observable<any> {
    return this.http.put<any>(`${this.API}/${id}`, dados);
  }

  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  // ✅ Método adicionado para resolver o erro NG04002
  buscarPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.API}/${id}`);
  }
}
