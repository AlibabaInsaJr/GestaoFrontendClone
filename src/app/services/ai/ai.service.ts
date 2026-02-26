import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
export class AiService {

  private apiUrl = `${environment.apiUrl}/api/ai/generate-report`;

  constructor(private http: HttpClient, private authService: AuthService) { }

  analyzeReport(reportData: any): Observable<string> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.post(this.apiUrl, reportData, { responseType: 'text', headers })
      .pipe(
        timeout(60000),
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocorreu um erro desconhecido.';
    if (error.error instanceof ErrorEvent) {
      // Erro do lado do cliente
      errorMessage = `Erro: ${error.error.message}`;
    } else {
      // Erro retornado pelo backend
      if (typeof error.error === 'string') {
          errorMessage = error.error;
      } else {
          errorMessage = `Código de erro: ${error.status}. Tente novamente mais tarde.`;
      }
    }
    // Retorna um erro observável com uma mensagem amigável
    return throwError(() => new Error(errorMessage));
  }
}
