import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GrupoService {
  private apiUrl = `${environment.apiUrl}/grupos`;

  constructor(private http: HttpClient) {}

  listar(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  criar(grupo: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, grupo);
  }

  atualizar(id: number, grupo: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, grupo);
  }

  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  buscarPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
}
