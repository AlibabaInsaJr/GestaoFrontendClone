import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminUserService {
  private apiUrl = `${environment.apiUrl}/api/admin/users`;

  constructor(private http: HttpClient) {}

  listarUsuarios(): Observable<any[]> {
    console.log('AdminUserService: Listando usuários de', this.apiUrl);
    return this.http.get<any[]>(this.apiUrl);
  }

  criarUsuario(usuario: any): Observable<any> {
    console.log('AdminUserService: Criando usuário em', this.apiUrl, usuario);
    return this.http.post<any>(this.apiUrl, usuario);
  }

  resetarSenha(id: number, password: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/password`, { password });
  }

  alterarRole(id: number, role: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/role`, { role });
  }

  alterarStatus(id: number, enabled: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/status`, { enabled });
  }

  removerUsuario(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
