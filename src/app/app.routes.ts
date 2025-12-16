import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { HomeComponent } from './pages/home/home.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
  // Redirecionamento padrão para /dashboard ao acessar 
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },

  //  Layout de autenticação (ex: login)
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/login/login.component').then(m => m.LoginComponent),
      }
    ]
  },

  //  Layout principal (usuário autenticado)
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      { path: 'home', component: HomeComponent },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'equipamentos',
        loadComponent: () =>
          import('./pages/equipamentos/equipamentos.component').then(m => m.EquipamentosComponent),
      },
      {
        path: 'equipamentos/:id',
        loadComponent: () =>
          import('./pages/equipamentos/detalhes-equipamento/detalhes-equipamento.component')
            .then(m => m.DetalhesEquipamentoComponent),
      },
      {
        path: 'grupo',
        loadComponent: () =>
          import('./pages/grupo/grupo.component').then(m => m.GrupoComponent),
      },
      {
        path: 'grupos/:id',
        loadComponent: () =>
          import('./pages/grupo/detalhes-grupo/detalhes-grupo.component')
            .then(m => m.DetalhesGrupoComponent),
      },
      {
        path: 'utilizadores',
        loadComponent: () =>
          import('./pages/utilizadores/utilizadores.component').then(m => m.UtilizadoresComponent),
      },
      {
        path: 'utilizadores/:id',
        loadComponent: () =>
          import('./pages/utilizadores/detalhes-utilizador/detalhes-utilizador.component')
            .then(m => m.DetalhesUtilizadorComponent),
      },
      {
        path: 'aquisicoes',
        loadComponent: () =>
          import('./pages/aquisicoes/aquisicoes.component').then(m => m.AquisicoesComponent),
      },
      {
        path: 'aquisicoes/:id',
        loadComponent: () =>
          import('./pages/aquisicoes/detalhes-aquisicao/detalhes-aquisicao.component')
            .then(m => m.DetalhesAquisicaoComponent),
      },
      {
        path: 'reparacoes',
        loadComponent: () =>
          import('./pages/reparacoes/reparacoes.component').then(m => m.ReparacoesComponent),
      },
      {
        path: 'reparacoes/:id',
        loadComponent: () =>
          import('./pages/reparacoes/detalhes-reparacao/detalhes-reparacao.component')
            .then(m => m.DetalhesReparacaoComponent),
      },
      {
        path: 'alocacoes',
        loadComponent: () =>
          import('./pages/alocacoes/alocacoes.component').then(m => m.AlocacoesComponent),
      },
      {
        path: 'alocacoes/:id',
        loadComponent: () =>
          import('./pages/alocacoes/detalhes-alocacao/detalhes-alocacao.component')
            .then(m => m.DetalhesAlocacaoComponent),
      },
      {
        path: 'devolucoes',
        loadComponent: () =>
          import('./pages/devolucoes/devolucoes.component').then(m => m.DevolucoesComponent),
      },
      {
        path: 'devolucoes/:id',
        loadComponent: () =>
          import('./pages/devolucoes/detalhes-devolucao/detalhes-devolucao.component')
            .then(m => m.DetalhesDevolucaoComponent),
      },
      {
        path: 'baixas',
        loadComponent: () =>
          import('./pages/baixas/baixas.component').then(m => m.BaixasComponent),
      },
      {
        path: 'baixas/:id',
        loadComponent: () =>
          import('./pages/baixas/detalhes-baixa/detalhes-baixa.component')
            .then(m => m.DetalhesBaixaComponent),
      },
      {
        path: 'marcas',
        loadComponent: () =>
          import('./pages/marcas/marcas.component').then(m => m.MarcasComponent),
      },
      {
        path: 'marcas/:id',
        loadComponent: () =>
          import('./pages/marcas/detalhes-marca/detalhes-marca.component')
            .then(m => m.DetalhesMarcaComponent),
      },
      {
        path: 'modelos',
        loadComponent: () =>
          import('./pages/modelos/modelos.component').then(m => m.ModelosComponent),
      },
      {
        path: 'modelos/:id',
        loadComponent: () =>
          import('./pages/modelos/detalhes-modelo/detalhes-modelo.component')
            .then(m => m.DetalhesModeloComponent),
      },
      {
        path: 'tipos-equipamento',
        loadComponent: () =>
          import('./pages/tipos-equipamento/tipos-equipamento.component')
            .then(m => m.TiposEquipamentoComponent),
      },
      {
        path: 'tipos-equipamento/:id',
        loadComponent: () =>
          import('./pages/tipos-equipamento/detalhes-tipo-equipamento/detalhes-tipo-equipamento.component')
            .then(m => m.DetalhesTipoEquipamentoComponent),
      },
      {
        path: 'unidades',
        loadComponent: () =>
          import('./pages/unidades/unidades.component').then(m => m.UnidadesComponent),
      },
      {
        path: 'unidades/:id',
        loadComponent: () =>
          import('./pages/unidades/detalhes-unidade/detalhes-unidade.component')
            .then(m => m.DetalhesUnidadeComponent),
      },
      {
        path: 'empresas',
        loadComponent: () =>
          import('./pages/empresas/empresas.component').then(m => m.EmpresasComponent),
      },
      {
        path: 'empresas/:id',
        loadComponent: () =>
          import('./pages/empresas/detalhes-empresa/detalhes-empresa.component')
            .then(m => m.DetalhesEmpresaComponent),
      },
      {
        path: 'actividades',
        loadComponent: () =>
          import('./pages/actividades/actividades.component')
            .then(m => m.ActividadesComponent),
      },
      {
        path: 'relatorio',
        loadComponent: () =>
          import('./pages/relatorio/relatorio.component').then(m => m.RelatorioComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.component').then(m => m.ProfileComponent),
      }
    ]
  },

  //  Fallback: se a rota não existir, volta para login
  {
    path: '**',
    redirectTo: 'login'
  }
];
