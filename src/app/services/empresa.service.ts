import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private apiUrl = `${environment.apiUrl}/empresas`; 

  constructor(private http: HttpClient) {}

  listar(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  buscarPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  criar(empresa: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, empresa);
  }

  atualizar(id: number, empresa: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, empresa);
  }

  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
