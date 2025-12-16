import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate, CanActivateChild {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkRole(route);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkRole(childRoute);
  }

  private checkRole(route: ActivatedRouteSnapshot): Observable<boolean> {
    console.log('RoleGuard: Verificando permissões para rota:', route.routeConfig?.path, 'Data:', route.data);
    
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        console.log('RoleGuard: Usuário autenticado:', isAuthenticated);
        
        if (!isAuthenticated) {
          console.log('RoleGuard: Usuário não autenticado, redirecionando para login');
          this.router.navigate(['/login']);
          return false;
        }

        // Verificar se a rota tem dados de roles requeridas
        const requiredRoles = route.data['roles'] as string[];
        console.log('RoleGuard: Roles requeridas:', requiredRoles);
        
        if (!requiredRoles || requiredRoles.length === 0) {
          // Se não há roles específicas requeridas, permitir acesso
          console.log('RoleGuard: Nenhuma role específica requerida, permitindo acesso');
          return true;
        }

        // Verificar se o usuário tem alguma das roles requeridas
        const currentUser = this.authService.getCurrentUser();
        console.log('RoleGuard: Usuário atual:', currentUser);
        console.log('RoleGuard: Roles do usuário:', currentUser?.roles);
        
        const hasRequiredRole = this.authService.hasAnyRole(requiredRoles);
        console.log('RoleGuard: Usuário tem role requerida:', hasRequiredRole);
        
        if (!hasRequiredRole) {
          // Redirecionar para página de acesso negado ou dashboard
          console.warn('RoleGuard: Usuário não tem permissão para acessar esta rota');
          console.warn('RoleGuard: Roles requeridas:', requiredRoles, 'Roles do usuário:', currentUser?.roles);
          alert('Acesso negado: Você não tem permissão para executar esta função.');
          this.router.navigate(['/dashboard']); // ou '/access-denied'
          return false;
        }

        console.log('RoleGuard: Acesso permitido');
        return true;
      })
    );
  }
}