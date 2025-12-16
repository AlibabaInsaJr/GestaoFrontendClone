import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TipoEquipamentoService {
  private apiUrl = `${environment.apiUrl}/tipos_equipamento`;


  constructor(private http: HttpClient) {}

  listar(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  buscarPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  criar(tipo: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, tipo);
  }

  atualizar(id: number, tipo: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, tipo);
  }

  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
