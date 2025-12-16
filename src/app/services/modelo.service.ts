import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ModeloService {
  private API = `${environment.apiUrl}/modelos`;

  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<any[]>(this.API);
  }

  buscarPorId(id: number) {
    return this.http.get<any>(`${this.API}/${id}`);
  }

  criar(dto: any) {
    return this.http.post<any>(this.API, dto);
  }

  atualizar(id: number, dto: any) {
    return this.http.put<any>(`${this.API}/${id}`, dto);
  }

  remover(id: number) {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  listarPorMarca(marcaId: number) {
    return this.http.get<any[]>(`${this.API}/marca/${marcaId}`);
  }
}
