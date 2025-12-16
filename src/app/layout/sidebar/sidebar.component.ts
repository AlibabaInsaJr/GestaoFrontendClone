import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  // Controla quais seções estão expandidas
  expandedSections: { [key: string]: boolean } = {
    inventario: false,
    operacoes: false,
    gestao: false
  };

  // Fallback programático para o logo
  logoSrc = '/assets/logo.svg.png';

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingService: LoadingService
  ) {}

  // Alterna a expansão de uma seção (comportamento accordion - apenas uma seção expandida por vez)
  toggleSection(section: string) {
    // Se a seção já está expandida, colapsa ela
    if (this.expandedSections[section]) {
      this.expandedSections[section] = false;
    } else {
      // Colapsa todas as outras seções
      Object.keys(this.expandedSections).forEach(key => {
        this.expandedSections[key] = false;
      });
      // Expande apenas a seção clicada
      this.expandedSections[section] = true;
    }
  }

  // Método para navegação com loading
  navigateWithLoading(route: string): void {
    this.loadingService.showForNavigation();
    this.router.navigate([route]);
  }

  // Fallback de carregamento do logo
  onLogoError(event: Event) {
    const img = event.target as HTMLImageElement;
    // Tentar caminho relativo caso absoluto falhe
    if (this.logoSrc !== 'assets/logo.svg.png') {
      this.logoSrc = 'assets/logo.svg.png';
    }
  }

  logout() {
    if (confirm('Tem certeza que deseja sair?')) {
      this.authService.logout();
    }
  }
}
