import { Component } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { SidebarComponent } from "./layout/sidebar/sidebar.component";
import { filter, take } from 'rxjs/operators';
import { NgIf } from '@angular/common';
import { Renderer2, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './services/auth.service';
import { LoadingOverlayComponent } from './components/loading-overlay/loading-overlay.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, NgIf, LoadingOverlayComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  showSidebar = true;

  constructor(
    private router: Router,
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) private platformId: Object,
    private authService: AuthService
  ) {
    this.initializeApp();
  }

  private initializeApp(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Detectar se é um refresh da página
      const isPageRefresh = this.detectPageRefresh();
      console.log('AppComponent: Inicialização - isPageRefresh:', isPageRefresh);
      
      // Se é um refresh e há dados de auth armazenados, aguardar a inicialização
      if (isPageRefresh && this.authService.hasStoredAuth()) {
        console.log('AppComponent: Refresh detectado com dados de auth, aguardando inicialização');
        
        // Aguardar um pouco mais para o AuthService processar
        setTimeout(() => {
          this.handleAuthenticationState();
        }, 100);
      } else {
        this.handleAuthenticationState();
      }
    }
  }

  private detectPageRefresh(): boolean {
    // Detectar refresh através do performance.navigation.type ou sessionStorage
    if (typeof performance !== 'undefined' && performance.navigation) {
      return performance.navigation.type === 1; // TYPE_RELOAD
    }
    
    // Fallback: usar sessionStorage para detectar refresh
    const wasRefreshed = sessionStorage.getItem('page-refreshed');
    if (!wasRefreshed) {
      sessionStorage.setItem('page-refreshed', 'true');
      return false;
    }
    return true;
  }

  private handleAuthenticationState(): void {
    this.authService.isAuthenticated$.pipe(
      take(1)
    ).subscribe(isAuthenticated => {
      const currentUrl = this.router.url;
      
      console.log('AppComponent: Estado de autenticação - isAuthenticated:', isAuthenticated, 'currentUrl:', currentUrl);
      
      // Se há dados armazenados mas não está autenticado, tentar re-inicializar
      if (!isAuthenticated && this.authService.hasStoredAuth()) {
        console.log('AppComponent: Dados encontrados mas não autenticado, re-inicializando');
        this.authService.reinitializeAuth();
        
        // Aguardar a re-inicialização e verificar novamente
        setTimeout(() => {
          this.authService.isAuthenticated$.pipe(take(1)).subscribe(reInitialized => {
            if (reInitialized && currentUrl === '/login') {
              console.log('AppComponent: Re-inicialização bem-sucedida, redirecionando para dashboard');
              this.router.navigate(['/dashboard']);
            }
          });
        }, 200);
      } else if (isAuthenticated && currentUrl === '/login') {
        console.log('AppComponent: Usuário autenticado na página de login, redirecionando para dashboard');
        this.router.navigate(['/dashboard']);
      }
      
      console.log('AppComponent: Inicialização concluída');
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => {
          const isLoginPage = this.router.url === '/login';
          this.showSidebar = !isLoginPage;

          // Add/remove body class
          if (isLoginPage) {
            this.renderer.addClass(document.body, 'no-sidebar');
          } else {
            this.renderer.removeClass(document.body, 'no-sidebar');
          }
        });
    }
  }
}