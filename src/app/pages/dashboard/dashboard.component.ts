import { 
  Component, 
  ElementRef, 
  OnInit, 
  OnDestroy,
  ViewChild, 
  AfterViewInit 
} from '@angular/core';
import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { EquipamentoService } from '../../services/equipamento.service';
import { AlocacaoService } from '../../services/alocacoes.service';
import { ReparacaoService } from '../../services/reparacao.service';
import { DevolucoesService } from '../../services/devolucoes.service';
import { BaixasService } from '../../services/baixas.service';
import { AuditService } from '../../services/audit.service';
import { LoadingService } from '../../services/loading.service';
import { Subject, forkJoin, interval, of } from 'rxjs';
import { catchError, startWith, switchMap, takeUntil } from 'rxjs/operators';

Chart.register(...registerables);

interface Activity {
  id: number;
  type: string;
  equipmentName: string;
  date: Date;
  user: string;
  status: string;
}


interface PrinterConsumables {
  black: number;
  cyan?: number;
  magenta?: number;
  yellow?: number;
}

interface PrinterSupplyItem {
  id: number;
  referencia: string;
  tipo: 'COLORIDA' | 'PRETO_BRANCO';
  localizacao: string;
  enderecoIp: string;
  consumiveis: PrinterConsumables;
}

interface RepairReminder {
  repairId: number;
  expectedDate: Date;
  empresaId?: number;
}

interface CalendarDay {
  date: Date;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  hasPendingRepairReminder: boolean;
  reminders: RepairReminder[];
}

import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    NgClass,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatDividerModule,
    FormsModule
  ],
  providers: [DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  isAdmin = false;
  dashboardUserName = 'Utilizador';
  dashboardUserRoleLabel = 'Gestão de Ativos';
  dashboardUserInitials = 'GA';

  @ViewChild('pieChart') pieChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart') barChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineChart') lineChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineChart2') lineChart2Ref!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineChart3') lineChart3Ref!: ElementRef<HTMLCanvasElement>;
  @ViewChild('consumablesChart') consumablesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('consumablesDetailChart') consumablesDetailChartRef!: ElementRef<HTMLCanvasElement>;

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
  selectedTrend: 'alocacoes' | 'reparacoes' | 'devolucoes' = 'alocacoes';

  recentActivities: Activity[] = [];
  impressorasConsumiveis: PrinterSupplyItem[] = [
    {
      id: 1,
      referencia: 'HP-LJ-4001',
      tipo: 'PRETO_BRANCO',
      localizacao: '3º Andar',
      enderecoIp: '10.10.3.21',
      consumiveis: { black: 64 }
    },
    {
      id: 2,
      referencia: 'Canon-CX-775',
      tipo: 'COLORIDA',
      localizacao: '2º Andar',
      enderecoIp: '10.10.2.47',
      consumiveis: { black: 71, cyan: 52, magenta: 34, yellow: 60 }
    },
    {
      id: 3,
      referencia: 'Epson-MC-992',
      tipo: 'COLORIDA',
      localizacao: 'R/C',
      enderecoIp: '10.10.0.15',
      consumiveis: { black: 28, cyan: 20, magenta: 18, yellow: 25 }
    }
  ];

  novaImpressora: Omit<PrinterSupplyItem, 'id' | 'consumiveis'> & { nivelBase: number } = {
    referencia: '',
    tipo: 'PRETO_BRANCO',
    localizacao: '',
    enderecoIp: '',
    nivelBase: 100
  };

  impressoraSelecionadaId = 1;
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
  weekDays: string[] = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  calendarDays: CalendarDay[] = [];
  calendarMonthLabel = '';
  private calendarCursor = new Date();
  pendingRepairReminders: RepairReminder[] = [];

  private readonly estadosOcultos = new Set<string>([
    'BAIXADO',
    'PERDIDO',
    'PATRIMONIO_AVARIADO',
    'PATRIMONIO_BOM'
  ]);

  constructor(
    private equipamentoService: EquipamentoService,
    private alocacaoService: AlocacaoService,
    private reparacaoService: ReparacaoService,
    private devolucaoService: DevolucoesService,
    private baixaService: BaixasService,
    private datePipe: DatePipe,
    private router: Router,
    private auditService: AuditService,
    private loadingService: LoadingService,
    private authService: AuthService
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

  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.sincronizarUtilizadorLogado();
    this.generateCalendar();
    this.carregarEstatisticas();
    this.carregarAtividadesRecentes();
    this.iniciarSincronizacaoLembretesReparacao();
    this.impressoraSelecionadaId = this.impressorasConsumiveis[0]?.id || 0;
    console.log('Dashboard inicializado');
  }

  private sincronizarUtilizadorLogado(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => this.aplicarDadosUtilizador(user));

    this.aplicarDadosUtilizador(this.authService.getCurrentUser());
  }

  private aplicarDadosUtilizador(user: User | null): void {
    const rawName = user?.username?.trim() || user?.email?.trim() || 'Utilizador';
    const safeName = rawName.replace(/[_\.]+/g, ' ').replace(/\s+/g, ' ').trim();

    this.dashboardUserName = safeName || 'Utilizador';
    this.dashboardUserRoleLabel = this.isAdmin ? 'Administrador' : 'Utilizador';

    const words = this.dashboardUserName.split(' ').filter(Boolean);
    if (words.length >= 2) {
      this.dashboardUserInitials = `${words[0][0]}${words[1][0]}`.toUpperCase();
    } else {
      this.dashboardUserInitials = this.dashboardUserName.slice(0, 2).toUpperCase() || 'US';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyExistingCharts();
  }

  private iniciarSincronizacaoLembretesReparacao(): void {
    interval(15000)
      .pipe(
        startWith(0),
        switchMap(() => this.reparacaoService.listar().pipe(catchError(() => of([])))),
        takeUntil(this.destroy$)
      )
      .subscribe((reparacoes: any[]) => {
        this.pendingRepairReminders = this.mapPendingRepairReminders(reparacoes || []);
        this.generateCalendar();
      });
  }

  navegarParaAdmin(): void {
    this.router.navigate(['/admin/users']);
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
        const equipamentosVisiveis = (equipamentos || []).filter((e: any) => {
          const estado = (e?.estado ?? '').toString().trim().toUpperCase();
          return !this.estadosOcultos.has(estado);
        });

        // Estatísticas principais
        this.equipmentStats.total = equipamentosVisiveis.length;
        this.equipmentStats.allocated = equipamentosVisiveis.filter((e: any) => e.estado === 'ALOCADO').length;
        this.equipmentStats.inRepair = equipamentosVisiveis.filter((e: any) => e.estado === 'REPARACAO').length;
        this.equipmentStats.available = equipamentosVisiveis.filter((e: any) => e.estado === 'STOCK_NOVO' || e.estado === 'STOCK_BOM').length;
        this.equipmentStats.writtenOff = equipamentosVisiveis.filter((e: any) => e.estado === 'BAIXADO').length;

        // Contadores por tipo de ação
        this.allocationTypes = [
          { label: 'Alocações', count: alocacoes?.length || 0 },
          { label: 'Reparações', count: reparacoes?.length || 0 },
          { label: 'Devoluções', count: devolucoes?.length || 0 },
          { label: 'Baixas', count: baixas?.length || 0 }
        ];

        // Distribuição por estado (mapear enums do backend para rótulos de UI)
        const novo = equipamentosVisiveis.filter((e: any) => e.estado === 'STOCK_NOVO').length;
        const bom = equipamentosVisiveis.filter((e: any) => e.estado === 'STOCK_BOM').length;
        const avariado = equipamentosVisiveis.filter((e: any) => e.estado === 'STOCK_AVARIADO').length;
        const obsoleto = equipamentosVisiveis.filter((e: any) => e.estado === 'BAIXADO' || e.estado === 'PERDIDO').length;

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

         this.pendingRepairReminders = this.mapPendingRepairReminders(reparacoes || []);
         this.generateCalendar();

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
      this.refreshConsumiveisCharts();
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

    const baseTooltip = {
      backgroundColor: '#101828',
      titleColor: '#ffffff',
      bodyColor: '#dbe4ff',
      padding: 12,
      cornerRadius: 12,
      displayColors: false
    };
    
    // Gráfico de Rosca - Distribuição por tipo de ação
    if (this.pieChartRef?.nativeElement) {
      const doughnutCtx = this.pieChartRef.nativeElement.getContext('2d');
      if (doughnutCtx) {
        this.charts['pie'] = new Chart(doughnutCtx, {
          type: 'doughnut',
          data: {
            labels: this.allocationTypes.map(a => a.label),
            datasets: [{
              data: this.allocationTypes.map(a => a.count),
              backgroundColor: [
                '#7C3AED',
                '#F59E0B',
                '#06B6D4',
                '#F43F5E'
              ],
              borderWidth: 0,
              borderRadius: 10,
              hoverOffset: 10,
              spacing: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            rotation: -110,
            plugins: {
              legend: { display: false },
              tooltip: baseTooltip
            }
          }
        });
      }
    }
    
    // Gráfico de Barras - Estado dos equipamentos
    if (this.barChartRef?.nativeElement) {
      const barCtx = this.barChartRef.nativeElement.getContext('2d');
      if (barCtx) {
        const barGradientA = barCtx.createLinearGradient(0, 0, 0, 260);
        barGradientA.addColorStop(0, '#60A5FA');
        barGradientA.addColorStop(1, '#2563EB');

        const barGradientB = barCtx.createLinearGradient(0, 0, 0, 260);
        barGradientB.addColorStop(0, '#38BDF8');
        barGradientB.addColorStop(1, '#06B6D4');

        const barGradientC = barCtx.createLinearGradient(0, 0, 0, 260);
        barGradientC.addColorStop(0, '#A78BFA');
        barGradientC.addColorStop(1, '#7C3AED');

        const barGradientD = barCtx.createLinearGradient(0, 0, 0, 260);
        barGradientD.addColorStop(0, '#FB7185');
        barGradientD.addColorStop(1, '#F43F5E');

        this.charts['bar'] = new Chart(barCtx, {
          type: 'bar',
          data: {
            labels: this.equipmentByStatus.map(s => s.status),
            datasets: [{
              label: 'Estados',
              data: this.equipmentByStatus.map(s => s.count),
              backgroundColor: [barGradientA, barGradientB, barGradientC, barGradientD],
              borderRadius: 14,
              borderSkipped: false,
              maxBarThickness: 34
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: '#667085', font: { weight: 600 } }
              },
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(148, 163, 184, 0.18)'
                },
                ticks: {
                  color: '#94A3B8',
                  stepSize: 1
                }
              }
            },
            plugins: {
              legend: { display: false },
              tooltip: baseTooltip
            }
          }
        });
      }
    }
    
    // Gráficos de Linha - Tendências mensais
    const lineOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#94A3B8' }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(148, 163, 184, 0.14)'
          },
          ticks: { color: '#94A3B8', stepSize: 1 }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: baseTooltip
      },
      elements: {
        point: {
          radius: 0,
          hoverRadius: 6,
          hoverBorderWidth: 3,
          backgroundColor: '#ffffff'
        },
        line: {
          tension: 0.42,
          borderWidth: 3
        }
      }
    } as any;
    
    if (this.lineChartRef?.nativeElement) {
      const lineCtx = this.lineChartRef.nativeElement.getContext('2d');
      if (lineCtx) {
        this.charts['line1'] = new Chart(lineCtx, {
          type: 'line',
          data: {
            labels: this.months,
            datasets: [this.buildMainTrendDataset(lineCtx)]
          },
          options: lineOptions
        });
      }
    }
    
   }

  onTrendChange(event: Event): void {
    const next = (event.target as HTMLSelectElement).value as 'alocacoes' | 'reparacoes' | 'devolucoes';
    this.selectedTrend = next;
    this.refreshMainTrendChart();
  }

  private refreshMainTrendChart(): void {
    const chart = this.charts['line1'];
    const ctx = this.lineChartRef?.nativeElement?.getContext('2d');
    if (!chart || !ctx) return;

    const dataset = this.buildMainTrendDataset(ctx);
    chart.data.datasets = [dataset];
    chart.update();
  }

  private buildMainTrendDataset(ctx: CanvasRenderingContext2D) {
    const configMap = {
      alocacoes: {
        label: 'Alocações',
        data: this.allocationTrend,
        borderColor: '#4F7CFF',
        gradientStart: 'rgba(79, 124, 255, 0.35)',
        gradientEnd: 'rgba(79, 124, 255, 0.02)'
      },
      reparacoes: {
        label: 'Reparações',
        data: this.repairTrend,
        borderColor: '#FF9B3F',
        gradientStart: 'rgba(255, 155, 63, 0.35)',
        gradientEnd: 'rgba(255, 155, 63, 0.02)'
      },
      devolucoes: {
        label: 'Devoluções',
        data: this.returnTrend,
        borderColor: '#06B6D4',
        gradientStart: 'rgba(6, 182, 212, 0.35)',
        gradientEnd: 'rgba(6, 182, 212, 0.02)'
      }
    } as const;

    const current = configMap[this.selectedTrend];
    const gradient = ctx.createLinearGradient(0, 0, 0, 320);
    gradient.addColorStop(0, current.gradientStart);
    gradient.addColorStop(1, current.gradientEnd);

    return {
      label: current.label,
      data: current.data,
      borderColor: current.borderColor,
      backgroundColor: gradient,
      fill: true,
      pointHoverBorderColor: current.borderColor
    };
  }

  prevCalendarMonth(): void {
    this.calendarCursor = new Date(this.calendarCursor.getFullYear(), this.calendarCursor.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextCalendarMonth(): void {
    this.calendarCursor = new Date(this.calendarCursor.getFullYear(), this.calendarCursor.getMonth() + 1, 1);
    this.generateCalendar();
  }

  private generateCalendar(): void {
    const year = this.calendarCursor.getFullYear();
    const month = this.calendarCursor.getMonth();
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    this.calendarMonthLabel = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const startDate = new Date(year, month, 1 - startOffset);

    this.calendarDays = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      const reminders = this.getRemindersForDate(date);

      this.calendarDays.push({
        date,
        dayNumber: date.getDate(),
        inCurrentMonth: date.getMonth() === month,
        isToday,
        hasPendingRepairReminder: reminders.length > 0,
        reminders
      });
    }
  }

  private mapPendingRepairReminders(reparacoes: any[]): RepairReminder[] {
    return (reparacoes || [])
      .filter((r: any) => !r?.dataDevolucao)
      .map((r: any) => {
        const rawDate = r?.dataPrevistaDevolucao || r?.dataEnvioReparacao;
        const parsed = rawDate ? new Date(rawDate) : null;
        if (!parsed || isNaN(parsed.getTime()) || !r?.id) {
          return null;
        }
        return {
          repairId: Number(r.id),
          expectedDate: parsed,
          empresaId: r?.empresaId
        } as RepairReminder;
      })
      .filter((item: RepairReminder | null): item is RepairReminder => item !== null);
  }

  private getRemindersForDate(date: Date): RepairReminder[] {
    return this.pendingRepairReminders.filter((reminder) =>
      reminder.expectedDate.getFullYear() === date.getFullYear() &&
      reminder.expectedDate.getMonth() === date.getMonth() &&
      reminder.expectedDate.getDate() === date.getDate()
    );
  }

  onCalendarDayClick(day: CalendarDay): void {
    if (!day.hasPendingRepairReminder || !day.reminders.length) {
      return;
    }

    const reminder = day.reminders[0];
    this.router.navigate(['/reparacoes', reminder.repairId]);
  }

  adicionarImpressoraMock(): void {
    const referencia = this.novaImpressora.referencia.trim();
    const localizacao = this.novaImpressora.localizacao.trim();
    const enderecoIp = this.novaImpressora.enderecoIp.trim();

    if (!referencia || !localizacao || !enderecoIp) {
      return;
    }

    const baseLevel = this.clampPercent(this.novaImpressora.nivelBase);
    const consumiveis: PrinterConsumables = this.novaImpressora.tipo === 'COLORIDA'
      ? { black: baseLevel, cyan: baseLevel, magenta: baseLevel, yellow: baseLevel }
      : { black: baseLevel };

    const nextId = this.impressorasConsumiveis.length
      ? Math.max(...this.impressorasConsumiveis.map((p) => p.id)) + 1
      : 1;

    this.impressorasConsumiveis = [
      ...this.impressorasConsumiveis,
      {
        id: nextId,
        referencia,
        tipo: this.novaImpressora.tipo,
        localizacao,
        enderecoIp,
        consumiveis
      }
    ];

    this.impressoraSelecionadaId = nextId;

    this.novaImpressora = {
      referencia: '',
      tipo: 'PRETO_BRANCO',
      localizacao: '',
      enderecoIp: '',
      nivelBase: 100
    };

    this.refreshConsumiveisCharts();
  }

  atualizarNivelConsumivel(printer: PrinterSupplyItem, key: keyof PrinterConsumables, value: number): void {
    printer.consumiveis[key] = this.clampPercent(value);
    this.refreshConsumiveisCharts();
  }

  selecionarImpressora(printerId: number): void {
    this.impressoraSelecionadaId = printerId;
    this.refreshConsumiveisCharts();
  }

  editarImpressoraSelecionada(): void {
    const selected = this.selectedPrinter;
    if (!selected) return;

    const referencia = prompt('Editar referência da impressora:', selected.referencia);
    if (referencia === null) return;

    const enderecoIp = prompt('Editar endereço IP:', selected.enderecoIp);
    if (enderecoIp === null) return;

    const localizacao = prompt('Editar localização:', selected.localizacao);
    if (localizacao === null) return;

    selected.referencia = referencia.trim() || selected.referencia;
    selected.enderecoIp = enderecoIp.trim() || selected.enderecoIp;
    selected.localizacao = localizacao.trim() || selected.localizacao;

    this.refreshConsumiveisCharts();
  }

  apagarImpressoraSelecionada(): void {
    const selected = this.selectedPrinter;
    if (!selected) return;

    const confirmar = confirm(`Deseja apagar a impressora ${selected.referencia}?`);
    if (!confirmar) return;

    this.impressorasConsumiveis = this.impressorasConsumiveis.filter((p) => p.id !== selected.id);
    this.impressoraSelecionadaId = this.impressorasConsumiveis[0]?.id || 0;
    this.refreshConsumiveisCharts();
  }

  async exportarConsumiveisPdf(): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    const firstPageTemplate = await this.loadAssetDataUrl('assets/Relatorio.png');
    const nextPageTemplate = await this.loadAssetDataUrl('assets/Second page.png');

    this.renderPageTemplate(doc, firstPageTemplate || nextPageTemplate, pageWidth, pageHeight);

    const contentTop = 100;
    const contentBottom = pageHeight - 20;

    autoTable(doc, {
      startY: contentTop,
      head: [['Referência', 'Tipo', 'Localização', 'IP', 'Média (%)']],
      body: this.impressorasConsumiveis.map((p) => [
        p.referencia,
        p.tipo === 'COLORIDA' ? 'Colorida' : 'Preto e Branco',
        p.localizacao,
        p.enderecoIp,
        `${this.getPrinterAverage(p)}%`
      ]),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9 },
      willDrawPage: (data) => {
        if (data.pageNumber === 1) {
          this.renderPageTemplate(doc, firstPageTemplate || nextPageTemplate, pageWidth, pageHeight);
        } else {
          this.renderPageTemplate(doc, nextPageTemplate, pageWidth, pageHeight);
        }
      }
    });

    let yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : contentTop + 15;

    this.impressorasConsumiveis.forEach((printer, index) => {
      const blocoAltura = 36 + this.getConsumivelKeys(printer).length * 8;
      if (yPos + blocoAltura > contentBottom) {
        doc.addPage();
        this.renderPageTemplate(doc, nextPageTemplate, pageWidth, pageHeight);
        yPos = 16;
      }

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`${index + 1}. ${printer.referencia} (${printer.enderecoIp})`, 14, yPos);
      yPos += 4;

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Localização: ${printer.localizacao}`, 16, yPos + 3);
      yPos += 6;

      const keys = this.getConsumivelKeys(printer);
      keys.forEach((key) => {
        const value = printer.consumiveis[key] || 0;
        const label = this.getConsumivelLabel(key);

        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        doc.text(`${label}: ${value}%`, 16, yPos + 4);
        doc.setDrawColor(220);
        doc.rect(48, yPos + 1.2, 80, 4.5);

        const [r, g, b] = this.getConsumivelRgb(key);
        doc.setFillColor(r, g, b);
        doc.rect(48, yPos + 1.2, 0.8 * value, 4.5, 'F');

        yPos += 8;
      });

      yPos += 3;
    });

    doc.save(`consumiveis-impressoras-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private renderPageTemplate(doc: jsPDF, templateDataUrl: string | null, pageWidth: number, pageHeight: number): void {
    if (!templateDataUrl) {
      return;
    }

    doc.addImage(templateDataUrl, 'PNG', 0, 0, pageWidth, pageHeight);
  }

  private async loadAssetDataUrl(assetPath: string): Promise<string | null> {
    try {
      const response = await fetch(assetPath);
      if (!response.ok) return null;
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  private getConsumivelRgb(key: keyof PrinterConsumables): [number, number, number] {
    switch (key) {
      case 'black':
        return [17, 24, 39];
      case 'cyan':
        return [6, 182, 212];
      case 'magenta':
        return [236, 72, 153];
      case 'yellow':
        return [245, 158, 11];
      default:
        return [79, 124, 255];
    }
  }


  getConsumivelKeys(printer: PrinterSupplyItem): (keyof PrinterConsumables)[] {
    const keys: (keyof PrinterConsumables)[] = ['black'];
    if (printer.tipo === 'COLORIDA') {
      keys.push('cyan', 'magenta', 'yellow');
    }
    return keys;
  }

  getConsumivelLabel(key: keyof PrinterConsumables): string {
    const labels: Record<keyof PrinterConsumables, string> = {
      black: 'Preto',
      cyan: 'Cyan',
      magenta: 'Magenta',
      yellow: 'Amarelo'
    };
    return labels[key];
  }

  getConsumivelClass(key: keyof PrinterConsumables): string {
    return `ink-${key}`;
  }

  getPrinterAverage(printer: PrinterSupplyItem): number {
    const values = this.getConsumivelKeys(printer)
      .map((key) => printer.consumiveis[key] ?? 0);

    if (!values.length) {
      return 0;
    }

    const total = values.reduce((sum, curr) => sum + curr, 0);
    return Math.round(total / values.length);
  }

  get selectedPrinter(): PrinterSupplyItem | null {
    return this.impressorasConsumiveis.find((p) => p.id === this.impressoraSelecionadaId) || null;
  }

  private clampPercent(value: number): number {
    if (Number.isNaN(Number(value))) {
      return 0;
    }
    return Math.min(100, Math.max(0, Math.round(Number(value))));
  }

  private refreshConsumiveisCharts(): void {
    if (!this.chartsInitialized) {
      return;
    }

    this.renderConsumiveisResumoChart();
    this.renderConsumiveisDetalheChart();
  }

  private renderConsumiveisResumoChart(): void {
    const ctx = this.consumablesChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    this.charts['consumablesSummary']?.destroy();

    this.charts['consumablesSummary'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.impressorasConsumiveis.map((p) => p.referencia),
        datasets: [{
          label: 'Média de tinta (%)',
          data: this.impressorasConsumiveis.map((p) => this.getPrinterAverage(p)),
          borderRadius: 10,
          backgroundColor: 'rgba(79, 124, 255, 0.75)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 100, ticks: { stepSize: 20 } },
          x: { ticks: { color: '#667085', font: { size: 10 } } }
        }
      }
    });
  }

  private renderConsumiveisDetalheChart(): void {
    const selected = this.selectedPrinter;
    const ctx = this.consumablesDetailChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !selected) return;

    this.charts['consumablesDetail']?.destroy();

    const keys = this.getConsumivelKeys(selected);

    this.charts['consumablesDetail'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: keys.map((k) => this.getConsumivelLabel(k)),
        datasets: [{
          data: keys.map((k) => selected.consumiveis[k] || 0),
          backgroundColor: ['#111827', '#06B6D4', '#EC4899', '#FACC15'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        cutout: '62%'
      }
    });
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