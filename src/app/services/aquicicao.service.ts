import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AquisicaoService {

  buscarPorId(id: number) {
    return this.http.get<any>(`${this.API}/${id}`);
  }
  private API = `${environment.apiUrl}/aquisicoes`;

  constructor(private http: HttpClient) {}

  listarTodas() {
    return this.http.get<any[]>(`${this.API}`);
  }

  listarEmpresas() {
    return this.http.get<any[]>(`${environment.apiUrl}/empresas`);
  }

  criar(dto: any) {
    return this.http.post<any>(`${this.API}`, dto);
  }


  atualizar(id: number, dto: any) {
    return this.http.put<any>(`${this.API}/${id}`, dto);
  }

  remover(id: number) {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
}
