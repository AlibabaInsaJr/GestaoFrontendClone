import { 
  Component, 
  ElementRef, 
  OnInit, 
  ViewChild, 
  AfterViewInit 
} from '@angular/core';
import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';

import { EquipamentoService } from '../../services/equipamento.service';
import { AlocacaoService } from '../../services/alocacoes.service';
import { ReparacaoService } from '../../services/reparacao.service';
import { DevolucoesService } from '../../services/devolucoes.service';
import { BaixasService } from '../../services/baixas.service';
import { AuditService } from '../../services/audit.service';
import { LoadingService } from '../../services/loading.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

Chart.register(...registerables);

interface Activity {
  id: number;
  type: string;
  equipmentName: string;
  date: Date;
  user: string;
  status: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    NgClass,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatDividerModule
  ],
  providers: [DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  verDetalheS(_t91: Activity) {
    throw new Error('Method not implemented.');
  }
  verDetalhES(_t91: Activity) {
    throw new Error('Method not implemented.');
  }
  @ViewChild('pieChart') pieChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart') barChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineChart') lineChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineChart2') lineChart2Ref!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineChart3') lineChart3Ref!: ElementRef<HTMLCanvasElement>;

  equipmentStats = {
    total: 0,
    allocated: 0,
    inRepair: 0,
    available: 0,
    writtenOff: 0
  };

  allocationTrend: number[] = [];
  repairTrend: number[] = [];
  returnTrend: number[] = [];
  months: string[] = [];

  recentActivities: Activity[] = [];
  allocationTypes = [
    { label: 'Alocações', count: 0 },
    { label: 'Reparações', count: 0 },
    { label: 'Devoluções', count: 0 },
    { label: 'Baixas', count: 0 }
  ];

  equipmentByStatus = [
    { status: 'NOVO', count: 0 },
    { status: 'BOM', count: 0 },
    { status: 'AVARIADO', count: 0 },
    { status: 'OBSOLETO', count: 0 }
  ];

  chartColors: string[] = ['#4CAF50', '#FFC107', '#2196F3', '#F44336'];

  constructor(
    private equipamentoService: EquipamentoService,
    private alocacaoService: AlocacaoService,
    private reparacaoService: ReparacaoService,
    private devolucaoService: DevolucoesService,
    private baixaService: BaixasService,
    private datePipe: DatePipe,
    private router: Router,
    private auditService: AuditService,
    private loadingService: LoadingService
  ) {}

  private chartsInitialized = false;
  private dataLoaded = {
    equipamentos: false,
    alocacoes: false,
    reparacoes: false,
    devolucoes: false,
    baixas: false
  };
  
  isLoading = true;
  private charts: { [key: string]: Chart } = {};
  loadErrors: string[] = [];

  ngOnInit(): void {
    this.carregarEstatisticas();
    this.carregarAtividadesRecentes();
    console.log('Dashboard inicializado');
  }

  limparAtividades(): void {
    this.auditService.clearActivities();
    this.auditService.clearStoredActivities();
    this.recentActivities = [];
  }

  private carregarEstatisticas(): void {
    console.log('Carregando estatísticas');
    this.isLoading = true;
    this.loadErrors = [];

    forkJoin({
      equipamentos: this.equipamentoService.listarEquipamentos().pipe(
        catchError(err => { this.markError('equipamentos', err); return of([]); })
      ),
      alocacoes: this.alocacaoService.listar().pipe(
        catchError(err => { this.markError('alocações', err); return of([]); })
      ),
      reparacoes: this.reparacaoService.listar().pipe(
        catchError(err => { this.markError('reparações', err); return of([]); })
      ),
      devolucoes: this.devolucaoService.listar().pipe(
        catchError(err => { this.markError('devoluções', err); return of([]); })
      ),
      baixas: this.baixaService.listar().pipe(
        catchError(err => { this.markError('baixas', err); return of([]); })
      )
    }).subscribe({
      next: ({ equipamentos, alocacoes, reparacoes, devolucoes, baixas }) => {
        // Estatísticas principais
        this.equipmentStats.total = equipamentos?.length || 0;
        this.equipmentStats.allocated = (equipamentos || []).filter((e: any) => e.estado === 'ALOCADO').length;
        this.equipmentStats.inRepair = (equipamentos || []).filter((e: any) => e.estado === 'REPARACAO').length;
        this.equipmentStats.available = (equipamentos || []).filter((e: any) => e.estado === 'STOCK_NOVO' || e.estado === 'STOCK_BOM').length;
        this.equipmentStats.writtenOff = (equipamentos || []).filter((e: any) => e.estado === 'BAIXADO').length;

        // Contadores por tipo de ação
        this.allocationTypes = [
          { label: 'Alocações', count: alocacoes?.length || 0 },
          { label: 'Reparações', count: reparacoes?.length || 0 },
          { label: 'Devoluções', count: devolucoes?.length || 0 },
          { label: 'Baixas', count: baixas?.length || 0 }
        ];

        // Distribuição por estado (mapear enums do backend para rótulos de UI)
        const novo = (equipamentos || []).filter((e: any) => e.estado === 'STOCK_NOVO').length;
        const bom = (equipamentos || []).filter((e: any) => e.estado === 'STOCK_BOM' || e.estado === 'PATRIMONIO_BOM').length;
        const avariado = (equipamentos || []).filter((e: any) => e.estado === 'STOCK_AVARIADO' || e.estado === 'PATRIMONIO_AVARIADO').length;
        const obsoleto = (equipamentos || []).filter((e: any) => e.estado === 'BAIXADO' || e.estado === 'PERDIDO').length;

        this.equipmentByStatus = [
          { status: 'NOVO', count: novo },
          { status: 'BOM', count: bom },
          { status: 'AVARIADO', count: avariado },
          { status: 'OBSOLETO', count: obsoleto }
        ];

         // Tendências mensais para os últimos 6 meses
         this.months = this.getLastSixMonthsLabels();
         this.allocationTrend = this.calcularTrendMensalPorCampo(alocacoes || [], 'dataAlocacao');
         this.repairTrend = this.calcularTrendMensalPorCampo(reparacoes || [], 'dataEnvioReparacao');
         this.returnTrend = this.calcularTrendMensalPorCampo(devolucoes || [], 'dataDevolucao');
         this.isLoading = false;
         this.updateCharts();
      },
      error: (err) => {
        console.error('Erro ao carregar estatísticas do dashboard:', err);
        this.isLoading = false;
      }
    });
  }

  private markError(tipo: string, err: any) {
    console.error(`Erro ao carregar ${tipo}:`, err);
    const msg = typeof err?.status !== 'undefined'
      ? `${tipo}: erro ${err.status}`
      : `${tipo}: erro desconhecido`;
    this.loadErrors.push(msg);
  }

  private carregarAtividadesRecentes(): void {
    console.log('Carregando atividades recentes');
    // Preferir dados reais do backend quando possível
    this.equipamentoService.listarHistorico().pipe(
      catchError(err => {
        // Se falhar (ex: 401 não autenticado), cair para o AuditService local
        console.warn('Falha ao obter histórico real. Usando atividades locais.', err);
        const recentLocal = this.auditService.getRecentActivities(10) || [];
        this.recentActivities = recentLocal.map((a: any) => ({
          id: Number(a.id),
          type: a.entity,
          equipmentName: a.entityName,
          date: new Date(a.timestamp),
          user: a.username,
          status: a.description || a.type
        }));
        return of([]);
      })
    ).subscribe((historico: any[]) => {
      if (historico && historico.length) {
        // Mapear da projeção do backend para o modelo de Activity
        // HistoricoEventoProjection: equipamentoId, dataEvento, tipoEvento, eventoId
        this.recentActivities = historico.slice(0, 10).map((h: any) => ({
          id: Number(h.eventoId),
          type: this.mapTipoEventoToEntity(h.tipoEvento),
          equipmentName: `Equipamento #${h.equipamentoId}`,
          date: new Date(h.dataEvento),
          user: '-', // backend não fornece usuário nesta view
          status: this.mapDescricaoFromTipo(h.tipoEvento)
        }));
      } else if (!this.recentActivities.length) {
        // Sem histórico real e sem local, manter vazio
        this.recentActivities = [];
      }
    });
  }

  private mapTipoEventoToEntity(tipo: string): string {
    switch ((tipo || '').toUpperCase()) {
      case 'ALOCACAO': return 'alocacao';
      case 'REPARACAO': return 'reparacao';
      case 'DEVOLUCAO': return 'devolucao';
      case 'BAIXA': return 'baixa';
      case 'AQUISICAO': return 'equipamento';
      default: return 'equipamento';
    }
  }

  private mapDescricaoFromTipo(tipo: string): string {
    switch ((tipo || '').toUpperCase()) {
      case 'ALOCACAO': return 'Equipamento alocado';
      case 'REPARACAO': return 'Reparação iniciada/atualizada';
      case 'DEVOLUCAO': return 'Equipamento devolvido';
      case 'BAIXA': return 'Equipamento abatido';
      case 'AQUISICAO': return 'Equipamento adquirido';
      default: return tipo || 'Evento';
    }
  }
  ngAfterViewInit(): void {
    // Aguardar um pouco mais para garantir que os elementos estão prontos
    setTimeout(() => {
      this.chartsInitialized = true;
      this.initCharts();
    }, 200);
  }



  private updateCharts(): void {
    // Atualiza os gráficos se já foram inicializados
    if (this.chartsInitialized && !this.isLoading) {
      this.destroyExistingCharts();
      this.initCharts();
    }
  }

  private destroyExistingCharts(): void {
    // Destroi gráficos existentes para evitar sobreposição
    Object.values(this.charts).forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });
    this.charts = {};
  }

  private initCharts(): void {
    if (!this.chartsInitialized) return;
    
    // Inicializa os gráficos com dados reais
    console.log('Inicializando gráficos');
    
    // Gráfico de Pizza - Distribuição por estado de equipamento
    if (this.pieChartRef?.nativeElement) {
      const pieCtx = this.pieChartRef.nativeElement.getContext('2d');
      if (pieCtx) {
        this.charts['pie'] = new Chart(pieCtx, {
          type: 'pie',
          data: {
            labels: this.allocationTypes.map(a => a.label),
            datasets: [{
              data: this.allocationTypes.map(a => a.count),
              backgroundColor: this.chartColors
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
          }
        });
      }
    }
    
    // Gráfico de Barras - Contagem de tipos de atividade
    if (this.barChartRef?.nativeElement) {
      const barCtx = this.barChartRef.nativeElement.getContext('2d');
      if (barCtx) {
        this.charts['bar'] = new Chart(barCtx, {
          type: 'bar',
          data: {
            labels: this.equipmentByStatus.map(s => s.status),
            datasets: [{
              label: 'Estados',
              data: this.equipmentByStatus.map(s => s.count),
              backgroundColor: this.chartColors
            }]
          },
          options: {
            responsive: true,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
          }
        });
      }
    }
    
    // Gráficos de Linha - Tendências mensais
    const lineOptions = {
      responsive: true,
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { display: false } }
    } as any;
    
    if (this.lineChartRef?.nativeElement) {
      const lineCtx = this.lineChartRef.nativeElement.getContext('2d');
      if (lineCtx) {
        this.charts['line1'] = new Chart(lineCtx, {
          type: 'line',
          data: {
            labels: this.months,
            datasets: [{
              label: 'Alocações',
              data: this.allocationTrend,
              borderColor: '#4CAF50',
              backgroundColor: 'rgba(76, 175, 80, 0.2)',
              tension: 0.3
            }]
          },
          options: lineOptions
        });
      }
    }
    
    if (this.lineChart2Ref?.nativeElement) {
      const line2Ctx = this.lineChart2Ref.nativeElement.getContext('2d');
      if (line2Ctx) {
        this.charts['line2'] = new Chart(line2Ctx, {
          type: 'line',
          data: {
            labels: this.months,
            datasets: [{
              label: 'Reparações',
              data: this.repairTrend,
              borderColor: '#FFC107',
              backgroundColor: 'rgba(255, 193, 7, 0.2)',
              tension: 0.3
            }]
          },
          options: lineOptions
        });
      }
    }
    
    if (this.lineChart3Ref?.nativeElement) {
      const line3Ctx = this.lineChart3Ref.nativeElement.getContext('2d');
      if (line3Ctx) {
        this.charts['line3'] = new Chart(line3Ctx, {
          type: 'line',
          data: {
            labels: this.months,
            datasets: [{
              label: 'Devoluções',
              data: this.returnTrend,
              borderColor: '#2196F3',
              backgroundColor: 'rgba(33, 150, 243, 0.2)',
              tension: 0.3
            }]
          },
          options: lineOptions
        });
      }
    }
   }

  /**
   * Formata a data da atividade para exibição
   * @param activityDate Data da atividade
   * @returns String formatada com tempo relativo ou data completa
   */
  formatActivityDate(activityDate: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Agora mesmo';
    }
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} min atrás`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h atrás`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d atrás`;
    }
    
    return this.datePipe.transform(activityDate, 'dd/MM/yyyy HH:mm') || '';
  }

  /**
   * Retorna a classe CSS para o ícone de status baseado no tipo de atividade
   * @param type Tipo da atividade
   * @returns Nome da classe CSS
   */
  getStatusClass(type: string): string {
    switch (type) {
      case 'alocacao': return 'status-allocated';
      case 'reparacao': return 'status-repair';
      case 'devolucao': return 'status-returned';
      case 'baixa': return 'status-written-off';
      default: return '';
    }
  }

  /**
   * Retorna o ícone Material para o tipo de atividade
   * @param type Tipo da atividade
   * @returns Nome do ícone Material
   */
  getStatusIcon(type: string): string {
    switch (type) {
      case 'alocacao': return 'assignment_turned_in';
      case 'reparacao': return 'build';
      case 'devolucao': return 'assignment_return';
      case 'baixa': return 'delete_forever';
      default: return 'info';
    }
  }

  /**
   * Retorna a classe CSS para o badge de status baseado no tipo de atividade
   * @param type Tipo da atividade
   * @returns Nome da classe CSS para o badge
   */
  getStatusBadgeClass(type: string): string {
    switch (type) {
      case 'alocacao': return 'badge-success';
      case 'reparacao': return 'badge-warning';
      case 'devolucao': return 'badge-info';
      case 'baixa': return 'badge-danger';
      default: return 'badge-default';
    }
  }

  /**
   * Navega para a rota especificada
   * @param rota Nome da rota para navegação
   */
  navegarPara(rota: string): void {
    if (rota === 'relatorio') {
      // Mostrar overlay de loading ao clicar no botão Relatórios no dashboard
      this.loadingService.showForNavigation();
    }
    this.router.navigate([rota]);
  }

  /**
   * Calcula a percentagem de equipamentos alocados
   * @returns Percentagem de equipamentos alocados
   */
  getAllocatedPercentage(): number {
    return this.equipmentStats.total > 0 
      ? Math.round((this.equipmentStats.allocated / this.equipmentStats.total) * 100) 
      : 0;
  }

  /**
   * Calcula a percentagem de equipamentos em reparação
   * @returns Percentagem de equipamentos em reparação
   */
  getRepairPercentage(): number {
    return this.equipmentStats.total > 0 
      ? Math.round((this.equipmentStats.inRepair / this.equipmentStats.total) * 100) 
      : 0;
  }

  /**
   * Calcula a percentagem de equipamentos disponíveis
   * @returns Percentagem de equipamentos disponíveis
   */
  getAvailablePercentage(): number {
    return this.equipmentStats.total > 0 
      ? Math.round((this.equipmentStats.available / this.equipmentStats.total) * 100) 
      : 0;
  }

  /**
   * Calcula a percentagem de equipamentos abatidos
   * @returns Percentagem de equipamentos abatidos
   */
  getWrittenOffPercentage(): number {
    return this.equipmentStats.total > 0 
      ? Math.round((this.equipmentStats.writtenOff / this.equipmentStats.total) * 100) 
      : 0;
  }
  // Calcula contagem por mês para os últimos 6 meses, baseado no campo de data
  private calcularTrendMensalPorCampo(items: any[], campoData: string): number[] {
    const monthsMeta = this.getLastSixMonthsMeta();
    const counts = new Array(monthsMeta.length).fill(0);
    items.forEach((item: any) => {
      const raw = item?.[campoData];
      if (!raw) return;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return;
      // Encontrar índice correspondente
      const idx = monthsMeta.findIndex(m => m.year === d.getFullYear() && m.monthIndex === d.getMonth());
      if (idx >= 0) counts[idx]++;
    });
    return counts;
  }

  private getLastSixMonthsLabels(): string[] {
    return this.getLastSixMonthsMeta().map(m => m.label);
  }

  private getLastSixMonthsMeta(): { label: string; year: number; monthIndex: number }[] {
    const mesesPt = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const res: { label: string; year: number; monthIndex: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      res.push({ label: `${mesesPt[d.getMonth()]}`, year: d.getFullYear(), monthIndex: d.getMonth() });
    }
    return res;
  }
}
