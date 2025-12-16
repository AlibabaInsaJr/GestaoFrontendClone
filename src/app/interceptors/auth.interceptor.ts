import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  // Verificar se a URL é do backend
  const isBackendUrl = req.url.startsWith(environment.apiUrl);
  
  let authReq = req;
  
  // Adicionar token para todas as requisições ao backend
  if (isBackendUrl) {
    const token = authService.getToken();
    if (token) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
  }

  return next(authReq);
};