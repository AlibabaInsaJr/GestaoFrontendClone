import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkAuth(state.url);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkAuth(state.url);
  }

  private checkAuth(url: string): Observable<boolean> {
    console.log('AuthGuard: Verificando autenticação para URL:', url);
    
    // Verificar se há token e usuário no storage antes de confiar no estado do AuthService
    const hasStoredAuth = this.hasStoredAuthentication();
    
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        console.log('AuthGuard: Estado de autenticação - AuthService:', isAuthenticated, 'Storage:', hasStoredAuth);
        
        // Se há dados no storage mas o AuthService ainda não processou, dar uma chance
        if (!isAuthenticated && hasStoredAuth) {
          console.log('AuthGuard: Dados encontrados no storage, aguardando inicialização do AuthService');
          // Permitir acesso temporariamente enquanto o AuthService inicializa
          return true;
        }
        
        if (isAuthenticated) {
          console.log('AuthGuard: Acesso permitido');
          return true;
        } else {
          console.log('AuthGuard: Acesso negado, redirecionando para login');
          this.redirectToLogin(url);
          return false;
        }
      })
    );
  }

  private redirectToLogin(url: string): void {
    // Salvar a URL que o usuário tentou acessar para redirecionar após o login
    if (url !== '/login') {
      localStorage.setItem('redirectUrl', url);
    }
    this.router.navigate(['/login']);
  }

  private hasStoredAuthentication(): boolean {
    const token = localStorage.getItem('auth-token') || sessionStorage.getItem('auth-token');
    const user = localStorage.getItem('auth-user') || sessionStorage.getItem('auth-user');
    return !!(token && user);
  }
}