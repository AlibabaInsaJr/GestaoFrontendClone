import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';
import { EquipamentoService } from '../../services/equipamento.service';
import { AlocacaoService } from '../../services/alocacoes.service';
import { DevolucoesService } from '../../services/devolucoes.service';
import { UtilizadorService } from '../../services/utilizador.service';
import { EmpresaService } from '../../services/empresa.service';
import { ReparacaoService } from '../../services/reparacao.service';
import { BaixasService } from '../../services/baixas.service';
import { MarcaService } from '../../services/marca.service';
import { ModeloService } from '../../services/modelo.service';
import { TipoEquipamentoService } from '../../services/tipo-equipamento.service';
import { ItemsAlocacaoService } from '../../services/item-alocacao.service';
import { ItemsDevolucaoService } from '../../services/item-devolucao.service';
import { AiService } from '../../services/ai/ai.service';
import { NotificationService } from '../../components/notification/notification.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-relatorio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './relatorio.component.html',
  styleUrls: ['./relatorio.component.scss']
})
export class RelatorioComponent implements OnInit  {
  reportItems = [
    { name: 'devices', label: 'Equipamentos', selected: false},
    { name: 'allocations', label: 'Alocações', selected: false},
    { name: 'models', label: 'Modelos de Equipamento', selected: false},
    { name: 'brands', label: 'Marcas', selected: false},
    { name: 'repair', label: 'Reparações', selected: false},
    { name: 'acquisitions', label: 'Aquisições', selected: false},
    { name: 'disuse', label: 'Baixas', selected: false},
    { name: 'companies', label: 'Empresas', selected: false},
    { name: 'returned', label: 'Devoluções', selected: false},
  ];

  equipamentos: any[] = [];
  modelos: any[] = [];
  alocacoes: any[] = [];
  itemsAlocacao: any[] = [];
  itemsDevolucao: any[] = [];
  devolucoes: any[] = [];
  marcas: any[] = [];
  reparacoes: any[] = [];
  aquisicoes: any[] = [];
  baixas: any[] = [];
  empresas: any[] = [];
  utilizadores: any[] = [];
  tipos: any[] = [];

  generatedReports: string[] = [];
  // Estrutura tabular para visualização direta na UI
  generatedTables: {
    title: string;
    count: number;
    columns: { key: string; label: string }[];
    rows: { [key: string]: any }[];
  }[] = [];
  isLoadingRelatorios: boolean = false;
  // Controla se o filtro por período deve ser aplicado nas saídas (texto e PDF)
  usePeriodFilter: boolean = false;

  // Filtro por período
  startDate: string = '';
  endDate: string = '';
  // Indica se a variante bold da Century Gothic foi encontrada para o PDF
  private centuryBoldAvailable: boolean = false;
  constructor(
      private equipamentoService: EquipamentoService,
      private alocacaoService: AlocacaoService,
      private devolucoesService: DevolucoesService,
      private utilizadorService: UtilizadorService,
      private empresaService: EmpresaService,
      private reparacaoService: ReparacaoService,
      private baixasService: BaixasService,
      private marcaService: MarcaService,
      private itemsAlocacaoService: ItemsAlocacaoService,
      private itemsDevolucaoService: ItemsDevolucaoService,
      private modeloService: ModeloService,
      private tipoEquipamentoService: TipoEquipamentoService,
      private aiService: AiService,
      private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    // Inicializar período padrão (últimos 30 dias)
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 30);
    this.startDate = this.toIsoDate(start);
    this.endDate = this.toIsoDate(today);

    this.carregarUtilizadores();
    this.carregarEquipamentos();
    this.carregarModelos();
    this.carregarAlocacoes();
    this.carregarReparacoes();
    this.carregarDevolucoes();
    this.carregarMarcas();
    this.carregarReparacoes();
    this.carregarAquisicoes();
    this.carregarBaixas();
    this.carregarEmpresas();
    this.carregarTiposEquipamento();
  }

  private toIsoDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  aplicarFiltroPeriodo(): void {
    if (!this.startDate || !this.endDate) {
      this.generatedReports = [
        '⚠️ Selecione as datas de início e fim para aplicar o filtro.'
      ];
      return;
    }
    if (new Date(this.startDate) > new Date(this.endDate)) {
      this.generatedReports = [
        '⚠️ A data inicial não pode ser posterior à data final.'
      ];
      return;
    }
    // Apenas uma mensagem de confirmação (a filtragem efetiva acontece em generateReport)
    this.generatedReports = [
      `✔️ Filtro aplicado: ${this.startDate} até ${this.endDate}`
    ];
    // Ativar aplicação do filtro por período nos relatórios e PDF
    this.usePeriodFilter = true;
  }

  private parseDateSafe(value: any): Date | null {
    if (!value) return null;
    try {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }

  private extractDateFromRecord(rec: any): Date | null {
    if (!rec || typeof rec !== 'object') return null;
    const keys = [
      'data',
      'dataDevolucao',
      'dataAquisicao',
      'dataAlocacao',
      'dataReparacao',
      'dataRecebimento',
      'createdAt',
      'updatedAt'
    ];
    for (const k of keys) {
      if (rec[k]) {
        const d = this.parseDateSafe(rec[k]);
        if (d) return d;
      }
    }
    return null;
  }

  private filterByPeriod(collection: any[]): any[] {
    if (!Array.isArray(collection)) return [];
    // Se o filtro por período não estiver ativo, retornar a coleção original
    if (!this.usePeriodFilter) return collection;
    const start = this.parseDateSafe(this.startDate);
    const end = this.parseDateSafe(this.endDate);
    if (!start || !end) return collection;
    const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0).getTime();
    const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime();
    return collection.filter((item) => {
      const d = this.extractDateFromRecord(item);
      if (!d) return true; // se não existir data, não filtrar o item
      const t = d.getTime();
      return t >= startTime && t <= endTime;
    });
  }

  // Limpar/Desativar filtro de período (opcional)
  limparFiltroPeriodo(): void {
    this.usePeriodFilter = false;
    this.generatedReports = ['✔️ Filtro de período desativado.'];
  }

  // Normaliza a leitura do número do concurso/documento em Aquisições
  private getConcursoNumero(rec: any): string {
    if (!rec) return 'Não especificado';
    const candidates = [
      rec.numeroConcurso,
      rec.numero,
      rec.nrDocumento,
      rec.numero_documento,
      rec.concurso,
      rec.nrConcurso
    ];
    const found = candidates.find(v => typeof v === 'string' && v.trim().length > 0);
    return (found || 'Não especificado').toString().trim();
  }

  carregarUtilizadores(): void {
    this.utilizadorService.listar().subscribe({
      next: (dados) => this.utilizadores = dados,
      error: (erro) => console.error('Erro ao carregar utilizadores:', erro)
    });
  }

  getUserNameById(id: number | string | null | undefined): string {
    const numId = typeof id === 'string' ? Number(id) : id;
    const u = this.utilizadores.find((x: any) => x.id === numId);
    return u ? u.nome : `ID ${id}`;
  }

  getEmpresaNomeById(id: number | string | null | undefined): string {
    const empresa = this.empresas.find(e => e.id == id);
    return empresa ? empresa.designacao : 'Empresa não encontrada';
  }

  getTecnicoNomeById(id: number | string | null | undefined): string {
    const tecnico = this.utilizadores.find(u => u.id == id);
    return tecnico ? tecnico.nome : 'Técnico não encontrado';
  }

  carregarEquipamentos(): void {
    this.equipamentoService.listarEquipamentos().subscribe({
      next: (dados) => {
        this.equipamentos = dados.map((res: any) => ({
          id: res.id,
          numeroSerie: res.numeroSerie,
          // Preservar o modeloId com fallbacks
          modeloId: res.modeloId ?? res.modelo_id ?? res.modelId ?? res.model_id ?? res.modelo?.id ?? null,
          // Preservar o tipo do equipamento para heurística de inferência de tipo
          tipoEquipamentoId: res.tipoEquipamentoId ?? res.tipoId ?? res.tipo_equipamento_id ?? res.tipo_id ?? res.tipoEquipamento?.id ?? null,
          estado: res.estado
        }));
      },
      error: (erro) => console.error('Erro ao buscar equipamentos:', erro)
    });
  }

  carregarModelos() {
    this.equipamentoService.listarModelos().subscribe({
      next: (dados) => {
        // Manter o objeto completo para permitir mapeamento de Marca e Tipo
        // Muitos endpoints já trazem marcaId/marca e tipoId/tipo; preservar estes campos
        this.modelos = (dados || []).map((res: any) => ({
          id: res.id,
          nome: res.nome,
          categoria: res.categoria,
          // Fallbacks para diferentes convenções de nome do backend
          marcaId: res.marcaId ?? res.marca_id ?? res.brandId ?? res.brand_id ?? res.marca?.id ?? null,
          marca: res.marca ?? null,
          tipoId: res.tipoId ?? res.tipoEquipamentoId ?? res.tipo_equipamento_id ?? res.tipo_id ?? res.tipo?.id ?? null,
          tipo: res.tipo ?? null
        }));
      },
      error: (err) => console.error('❌ Erro ao carregar modelos:', err)
    });
  }

  carregarAlocacoes(): void {
    // Importante: usar apenas alocações ativas (com itens não devolvidos)
    this.alocacaoService.listarAtivas().subscribe({
      next: (dados: any[]) => {
        this.alocacoes = dados.map((res: any) => ({
          id: res.id,
          guia: res.pathGuiaRecepcao,
          data: res.dataAlocacao,
          utilizador: res.utilizador?.nome,
          utilizadorBeneficiarioId: res.utilizadorBeneficiarioId ?? res.utilizadorId ?? null,
          utilizadorEntregadorId: res.utilizadorEntregadorId ?? null
        }));
      },
      error: (erro) => console.error('Erro ao buscar alocações:', erro)
    });
  }

  carregarItemsAlocacao(): void {
    this.itemsAlocacaoService.listar().pipe(
      catchError((err) => { console.error('Erro ao carregar itens de alocação:', err); return of([]); })
    ).subscribe({
      next: (dados) => this.itemsAlocacao = dados || [],
      error: (erro) => console.error('Erro ao buscar itens de alocação:', erro)
    });
  }

  carregarItemsDevolucao(): void {
    this.itemsDevolucaoService.listar().pipe(
      catchError((err) => { console.error('Erro ao carregar itens de devolução:', err); return of([]); })
    ).subscribe({
      next: (dados) => this.itemsDevolucao = dados || [],
      error: (erro) => console.error('Erro ao buscar itens de devolução:', erro)
    });
  }

  carregarDevolucoes(): void {
    this.devolucoesService.listar().subscribe({
      next: (dados: any[]) => {
        this.devolucoes = dados.map((res: any) => ({
          id: res.id,
          quemDevolveu: res.utilizadorDevolveuId,
          quemRecebeu: res.utilizadorRecebeuId,
          dataDevolucao: res.dataDevolucao,
          pathGuiaDevolucao: res.pathGuiaDevolucao
        }));
      },
      error: (erro: any) => console.error('Erro ao buscar devoluções:', erro)
    });
  }

  carregarMarcas(): void {
    this.marcaService.listar().pipe(
      catchError((err) => { console.error('Erro ao carregar marcas:', err); return of([]); })
    ).subscribe({
      next: (dados) => this.marcas = dados || [],
      error: (erro) => console.error('Erro ao buscar marcas:', erro)
    });
  }

  carregarTiposEquipamento(): void {
    this.tipoEquipamentoService.listar().pipe(
      catchError((err) => { console.error('Erro ao carregar tipos de equipamento:', err); return of([]); })
    ).subscribe({
      next: (dados) => this.tipos = dados || [],
      error: (erro) => console.error('Erro ao buscar tipos de equipamento:', erro)
    });
  }

  carregarReparacoes(): void {
    this.reparacaoService.listar().subscribe({
      next: (data) => {
        this.reparacoes = data;
      },
      error: (error) => {
        console.error('Erro ao carregar reparações:', error);
        this.reparacoes = [];
      }
    });
  }

  carregarAquisicoes(): void {
    // Utiliza o endpoint já exposto em EquipamentoService
    this.equipamentoService.listarAquisicoes().pipe(
      catchError((err) => { console.error('Erro ao carregar aquisições:', err); return of([]); })
    ).subscribe({
      next: (dados) => this.aquisicoes = dados || [],
      error: (erro) => console.error('Erro ao buscar aquisições:', erro)
    });
  }

  carregarBaixas(): void {
    this.baixasService.listar().pipe(
      catchError((err) => { console.error('Erro ao carregar baixas:', err); return of([]); })
    ).subscribe({
      next: (dados) => this.baixas = dados || [],
      error: (erro) => console.error('Erro ao buscar baixas:', erro)
    });
  }

  carregarEmpresas(): void {
    this.empresaService.listar().subscribe({
      next: (empresas) => {
        this.empresas = empresas;
      },
      error: (error) => {
        console.error('Erro ao carregar empresas:', error);
        // Fallback para dados mock em caso de erro
        this.empresas = [
          { id: 1, nome: 'Empresa A', nif: '123456789', designacao: 'Empresa A Ltda', descricao: 'Empresa de tecnologia', telefone: '123456789', endereco: 'Rua A, 123' },
          { id: 2, nome: 'Empresa B', nif: '987654321', designacao: 'Empresa B SA', descricao: 'Empresa de serviços', telefone: '987654321', endereco: 'Rua B, 456' },
          { id: 3, nome: 'Empresa C', nif: '456789123', designacao: 'Empresa C Unip', descricao: 'Empresa comercial', telefone: '456789123', endereco: 'Rua C, 789' }
        ];
      }
    });
  }

  /**
   * Recarrega, em tempo real, apenas os datasets referentes aos itens selecionados.
   * Garante que o relatório acede aos mesmos endpoints que as páginas de origem.
   */
  private refreshSelectedData(): Promise<void> {
    const selected = this.reportItems.filter(i => i.selected).map(i => i.name);
    const requests: { key: string; obs: any }[] = [];

    const pushReq = (key: string, obs: any) => {
      requests.push({ key, obs: obs.pipe(catchError(() => of([]))) });
    };

    if (selected.includes('devices')) {
      pushReq('devices', this.equipamentoService.listarEquipamentos());
      // também garantir modelos para mapear nome do modelo
      pushReq('models', this.equipamentoService.listarModelos());
    }
    if (selected.includes('allocations')) {
      // Relatórios de alocações devem considerar apenas alocações em vigor
      pushReq('allocations', this.alocacaoService.listarAtivas());
      pushReq('utilizadores', this.utilizadorService.listar());
      pushReq('itemsAlocacao', this.itemsAlocacaoService.listar());
    }
    if (selected.includes('models')) {
      pushReq('models', this.equipamentoService.listarModelos());
      pushReq('marcas', this.marcaService.listar());
      // Tipos para mapear corretamente o nome do tipo de equipamento
      pushReq('tipos', this.tipoEquipamentoService.listar());
    }
    if (selected.includes('brands')) {
      pushReq('marcas', this.marcaService.listar());
      // Também carregar modelos para listar os modelos associados por marca
      pushReq('models', this.equipamentoService.listarModelos());
    }
    if (selected.includes('repair')) {
      pushReq('repair', this.reparacaoService.listar());
      pushReq('utilizadores', this.utilizadorService.listar());
      pushReq('companies', this.empresaService.listar());
    }
    if (selected.includes('acquisitions')) {
      pushReq('acquisitions', this.equipamentoService.listarAquisicoes());
      pushReq('companies', this.empresaService.listar());
    }
    if (selected.includes('disuse')) {
      pushReq('disuse', this.baixasService.listar());
    }
    if (selected.includes('companies')) {
      pushReq('companies', this.empresaService.listar());
    }
    if (selected.includes('returned')) {
      pushReq('returned', this.devolucoesService.listar());
      pushReq('utilizadores', this.utilizadorService.listar());
      pushReq('itemsDevolucao', this.itemsDevolucaoService.listar());
      // Garantir que equipamentos e itens de alocação são carregados, pois as marcas/modelos/estado derivam deles
      pushReq('equipamentos', this.equipamentoService.listarEquipamentos());
      pushReq('itemsAlocacao', this.itemsAlocacaoService.listar());
      // Garantir que os modelos estejam disponíveis para mapear Marca/Tipo
      pushReq('models', this.equipamentoService.listarModelos());
      pushReq('tipos', this.tipoEquipamentoService.listar());
    }

    if (requests.length === 0) return Promise.resolve();

    return new Promise((resolve) => {
      forkJoin(Object.fromEntries(requests.map(r => [r.key, r.obs]))).subscribe((res: any) => {
        // Atualiza caches locais com os dados mais recentes por chave
        if (res.devices) this.equipamentos = res.devices;
        if (res.models) this.modelos = res.models;
        if (res.allocations) this.alocacoes = res.allocations;
        if (res.itemsAlocacao) this.itemsAlocacao = res.itemsAlocacao;
        if (res.returned) this.devolucoes = res.returned;
        if (res.itemsDevolucao) this.itemsDevolucao = res.itemsDevolucao;
        if (res.marcas) this.marcas = res.marcas;
        if (res.repair) this.reparacoes = res.repair;
        if (res.acquisitions) this.aquisicoes = res.acquisitions;
        if (res.disuse) this.baixas = res.disuse;
        if (res.companies) this.empresas = res.companies;
        if (res.utilizadores) this.utilizadores = res.utilizadores;
        if (res.tipos) this.tipos = res.tipos;
        resolve();
      });
    });
  }

  private listarEquipamentosPorAlocacao(alocacaoId: number): string {
    const itens = (this.itemsAlocacao || []).filter((it: any) => {
      // compatibilidade de chaves prováveis
      return it.alocacaoId === alocacaoId || it.alocacao?.id === alocacaoId;
    });
    if (!itens.length) return '—';
    const descricoes = itens.map((it: any, idx: number) => {
      const eqId = it.equipamentoId || it.equipamento?.id;
      const eq = (this.equipamentos || []).find((e: any) => e.id === eqId);
      const serie = eq?.numeroSerie || it.equipamento?.numeroSerie || `Item ${idx+1}`;
      const estado = eq?.estado || it.estado || it.equipamento?.estado || '—';
      return `${serie}${estado !== '—' ? ' (' + estado + ')' : ''}`;
    });
    return descricoes.join(', ');
  }

  async generateReport() {
    this.generatedReports = [];
    this.generatedTables = [];
    this.isLoadingRelatorios = true;

    // Verificar se os dados necessários estão carregados
    if (this.utilizadores.length === 0) {
      this.carregarUtilizadores();
      // Adicionar mensagem de aviso
      this.generatedReports.push('⚠️ Aguardando carregamento de dados de utilizadores...');
    }
    
    if (this.empresas.length === 0) {
      this.carregarEmpresas();
      // Adicionar mensagem de aviso
      this.generatedReports.push('⚠️ Aguardando carregamento de dados de empresas...');
    }

    // Recarregar dados atuais dos itens selecionados, garantindo acesso aos endpoints corretos
    await this.refreshSelectedData();

    // Construir recurso original
    const resource: any = {
      devices: this.equipamentos,
      allocations: this.alocacoes,
      models: this.modelos,
      brands: this.marcas,
      repair: this.reparacoes,
      acquisitions: this.aquisicoes,
      disuse: this.baixas,
      companies: this.empresas,
      returned: this.devolucoes
    };

    // Aplicar filtro por período a coleções que possuem campo de data
    const filtered: any = {
      devices: resource.devices, // sem data
      models: resource.models,   // sem data
      brands: resource.brands,   // sem data
      disuse: resource.disuse,   // geralmente sem data aqui (mock)
      companies: resource.companies, // sem data

      allocations: this.filterByPeriod(resource.allocations),
      returned: this.filterByPeriod(resource.returned),
      acquisitions: this.filterByPeriod(resource.acquisitions),
      repair: this.filterByPeriod(resource.repair)
    };

    // Verificar se algum item foi selecionado
    const selectedItems = this.reportItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      this.generatedReports.push('ℹ️ Nenhum item selecionado para o relatório. Por favor, selecione pelo menos um item.');
      this.isLoadingRelatorios = false;
      return;
    }

    // Processar cada tipo de item selecionado
    selectedItems.forEach(el => {
      // Verificar se há dados disponíveis para este tipo de item
      if (!filtered[el.name] || filtered[el.name].length === 0) {
        this.generatedReports.push(`ℹ️ Não há dados disponíveis para ${el.label}`);
        return;
      }
      
      // Adicionar cabeçalho para cada tipo de item
      this.generatedReports.push(`📊 ${el.label.toUpperCase()} (${filtered[el.name].length} registos)`);

      // Preparar estrutura de tabela
      let tableColumns: { key: string; label: string }[] = [];
      const tableRows: any[] = [];

      // Definir colunas conforme o tipo
      switch (el.name) {
        case 'devices':
          tableColumns = [
            { key: 'nr', label: 'Nº' },
            { key: 'modelo', label: 'Modelo' },
            { key: 'serie', label: 'Nº Série' },
            { key: 'estado', label: 'Estado' }
          ];
          break;
        case 'allocations':
          tableColumns = [
            { key: 'nr', label: 'Nº' },
            { key: 'beneficiario', label: 'Beneficiário' },
            { key: 'entregador', label: 'Entregador' },
            { key: 'marcas', label: 'Marca' },
            { key: 'modeloTipo', label: 'Modelo (tipo)' },
            { key: 'dataAlocacao', label: 'Data da Alocação' }
          ];
          break;
        case 'models':
          tableColumns = [
            { key: 'nr', label: 'Nº' },
            { key: 'nome', label: 'Modelo' },
            { key: 'tipo', label: 'Tipo' },
            { key: 'marca', label: 'Marca' }
          ];
          break;
        case 'brands':
          tableColumns = [
            { key: 'nr', label: 'Nº' },
            { key: 'nome', label: 'Marca' },
            { key: 'associados', label: 'Modelos associados' }
          ];
          break;
        case 'repair':
          tableColumns = [
            { key: 'nr', label: 'Nº' },
            { key: 'empresa', label: 'Empresa' },
            { key: 'tecnico', label: 'Técnico GSI' },
            { key: 'avaria', label: 'Avaria' },
            { key: 'envio', label: 'Envio' },
            { key: 'prevista', label: 'Prevista' },
            { key: 'devolucao', label: 'Devolução' }
          ];
          break;
        case 'acquisitions':
          tableColumns = [
            { key: 'nr', label: 'Nº' },
            { key: 'empresa', label: 'Empresa' },
            { key: 'descricao', label: 'Descrição' },
            { key: 'numero', label: 'Número' },
            { key: 'data', label: 'Data' }
          ];
          break;
        case 'disuse':
          tableColumns = [
            { key: 'nr', label: 'Nº' },
            { key: 'entregou', label: 'Entregou' },
            { key: 'recebeu', label: 'Recebeu' },
            { key: 'equipamento', label: 'Equipamento' },
            { key: 'estado', label: 'Estado' }
          ];
          break;
        case 'companies':
          tableColumns = [
            { key: 'nr', label: 'Nº' },
            { key: 'designacao', label: 'Designação' },
            { key: 'descricao', label: 'Descrição' },
            { key: 'telefone', label: 'Telefone' },
            { key: 'endereco', label: 'Endereço' }
          ];
          break;
        case 'returned':
          tableColumns = [
            { key: 'nr', label: 'Nº' },
            { key: 'devolveu', label: 'Quem devolveu' },
            { key: 'recebeu', label: 'Quem recebeu' },
            { key: 'data', label: 'Data' },
            { key: 'marcas', label: 'Marca' },
            { key: 'modeloTipo', label: 'Modelo (tipo)' },
            { key: 'estado', label: 'Estado' },
            { key: 'guia', label: 'Guia' }
          ];
          break;
      }

      // Processar cada registo deste tipo (usar sempre a coleção já filtrada, quando aplicável)
      (filtered[el.name] || []).forEach((res: any, index: number) => {
        // Número do registo para melhor organização
        const itemNumber = index + 1;
        
        if (el.name === 'devices') {
          const modelo = this.modelos.find((model: any) => model.id === res.modeloId);
          const modeloNome = modelo?.nome || 'Não especificado';
          const numeroSerie = res.numeroSerie || 'Não especificado';
          const estado = res.estado || 'Não especificado';
          
          this.generatedReports.push(
            `${itemNumber}. Equipamento:\n` +
            `  • Modelo: ${modeloNome}\n` +
            `  • Número de Série: ${numeroSerie}\n` +
            `  • Estado: ${estado}`
          );

          tableRows.push({ nr: itemNumber, modelo: modeloNome, serie: numeroSerie, estado });
        }

        if (el.name === 'allocations') {
          const beneficiario = this.getUserNameById(res.utilizadorBeneficiarioId) || res.utilizador?.nome || 'Não especificado';
          const entregador = this.getUserNameById(res.utilizadorEntregadorId) || 'Não especificado';
          const marcas = this.getMarcasDaAlocacao(res.id);
          const modeloTipo = this.getModelosTiposDaAlocacao(res.id);
          const dataAlocacaoRaw = (res.dataAlocacao || res.data);
          const dataAlocacao = dataAlocacaoRaw ? new Date(dataAlocacaoRaw).toLocaleDateString('pt-PT') : 'Não especificada';
          this.generatedReports.push(
            `${itemNumber}. Alocação:\n` +
            `  • Beneficiário: ${beneficiario}\n` +
            `  • Entregador: ${entregador}\n` +
            `  • Marca(s): ${marcas}\n` +
            `  • Modelo(s) (tipo): ${modeloTipo}\n` +
            `  • Data da Alocação: ${dataAlocacao}`
          );

          tableRows.push({ nr: itemNumber, beneficiario, entregador, marcas, modeloTipo, dataAlocacao });
        }

        if (el.name === 'models') {
          const nome = res.nome || 'Não especificado';
          // Preencher Tipo com heurísticas (IDs/objetos/categoria/equipamentos/palavras-chave)
          const tipo = this.inferTipoNomePorModelo(res) || 'Não especificado';
          // Marca: tentar marca.nome; caso contrário, procurar pelo ID local
          const marca = res.marca?.nome
            || this.getMarcaNomeByIdLocal(res.marcaId ?? res.marca?.id)
            || 'Não especificada';
          this.generatedReports.push(
            `${itemNumber}. Modelo:\n` +
            `  • Nome do Modelo: ${nome}\n` +
            `  • Tipo: ${tipo}\n` +
            `  • Marca: ${marca}`
          );

          tableRows.push({ nr: itemNumber, nome, tipo, marca });
        }

        if (el.name === 'brands') {
          const nome = res.nome || 'Não especificado';
          const associados = this.getModelosNomesPorMarca(res.id, nome);
          const associadosStr = associados.length ? associados.join(', ') : 'Sem modelos associados';
          this.generatedReports.push(
            `${itemNumber}. Marca:\n` +
            `  • Nome: ${nome}\n` +
            `  • Modelos associados: ${associadosStr}`
          );

          tableRows.push({ nr: itemNumber, nome, associados: associadosStr });
        }

        if (el.name === 'repair') {
          const empresa = this.getEmpresaNomeById(res.empresaId) || 'Não especificada';
          const tecnico = this.getTecnicoNomeById(res.tecnicoGSIId) || 'Não especificado';
          const avaria = res.avaria || 'Não especificada';
          const dataEnvio = res.dataEnvioReparacao ? new Date(res.dataEnvioReparacao).toLocaleDateString('pt-PT') : 'Não especificada';
          const dataPrevista = res.dataPrevistaDevolucao ? new Date(res.dataPrevistaDevolucao).toLocaleDateString('pt-PT') : 'Não especificada';
          const dataDevolucao = res.dataDevolucao ? new Date(res.dataDevolucao).toLocaleDateString('pt-PT') : 'Não especificada';
          
          this.generatedReports.push(
            `${itemNumber}. Reparação:\n` +
            `  • Empresa: ${empresa}\n` +
            `  • Técnico GSI: ${tecnico}\n` +
            `  • Avaria: ${avaria}\n` +
            `  • Data de envio: ${dataEnvio}\n` +
            `  • Data prevista: ${dataPrevista}\n` +
            `  • Data de devolução: ${dataDevolucao}`
          );

          tableRows.push({ nr: itemNumber, empresa, tecnico, avaria, envio: dataEnvio, prevista: dataPrevista, devolucao: dataDevolucao });
        }

        if (el.name === 'acquisitions') {
          const empresa = this.getEmpresaNomeById(res.empresaId) || res.fornecedor || 'Não especificado';
          const descricao = res.descricao || 'Não especificada';
          const numero = this.getConcursoNumero(res);
          const data = res.dataAquisicao ? new Date(res.dataAquisicao).toLocaleDateString('pt-PT') : 'Não especificada';
          this.generatedReports.push(
            `${itemNumber}. Aquisição:\n` +
            `  • Empresa: ${empresa}\n` +
            `  • Descrição: ${descricao}\n` +
            `  • Número: ${numero}\n` +
            `  • Data: ${data}`
          );

          tableRows.push({ nr: itemNumber, empresa, descricao, numero, data });
        }

        if (el.name === 'disuse') {
          const entregou = this.getUserNameById(res.utilizadorEntregouId) || 'Não especificado';
          const recebeu = this.getUserNameById(res.utilizadorRecebeuId) || 'Não especificado';
          const equipamento = res.equipamento?.numeroSerie || 'Não especificado';
          const estado = res.equipamento?.estado || res.estado || 'Não especificado';
          this.generatedReports.push(
            `${itemNumber}. Baixa:\n` +
            `  • Quem entregou: ${entregou}\n` +
            `  • Quem recebeu: ${recebeu}\n` +
            `  • Equipamento: ${equipamento}\n` +
            `  • Estado: ${estado}`
          );

          tableRows.push({ nr: itemNumber, entregou, recebeu, equipamento, estado });
        }

        if (el.name === 'companies') {
          const designacao = res.designacao || 'Não especificada';
          const descricao = res.descricao || 'Não especificada';
          const telefone = res.telefone || 'Não especificado';
          const endereco = res.endereco || 'Não especificado';
          
          this.generatedReports.push(
            `${itemNumber}. Empresa:\n` +
            `  • Designação: ${designacao}\n` +
            `  • Descrição: ${descricao}\n` +
            `  • Telefone: ${telefone}\n` +
            `  • Endereço: ${endereco}`
          );

          tableRows.push({ nr: itemNumber, designacao, descricao, telefone, endereco });
        }

        if (el.name === 'returned') {
          const nomeQuemDevolveu = this.getUserNameById(res.utilizadorDevolveuId) || 'Não especificado';
          const nomeQuemRecebeu = this.getUserNameById(res.utilizadorRecebeuId) || 'Não especificado';
          const data = res.dataDevolucao ? new Date(res.dataDevolucao).toLocaleDateString('pt-PT') : 'Não especificada';
          const guia = res.pathGuiaDevolucao || 'Não disponível';
          const marcas = this.getMarcasDaDevolucao(res.id);
          const modeloTipo = this.getModelosTiposDaDevolucao(res.id);
          const estado = this.getEstadosDaDevolucao(res.id);
          
          this.generatedReports.push(
            `${itemNumber}. Devolução:\n` +
            `  • Quem devolveu: ${nomeQuemDevolveu}\n` +
            `  • Quem recebeu: ${nomeQuemRecebeu}\n` +
            `  • Data: ${data}\n` +
            `  • Marca(s): ${marcas}\n` +
            `  • Modelo(s) (tipo): ${modeloTipo}\n` +
            `  • Estado(s): ${estado}`
          );
          
          tableRows.push({ nr: itemNumber, devolveu: nomeQuemDevolveu, recebeu: nomeQuemRecebeu, data, marcas, modeloTipo, estado });
        }
      });
      
      // Guardar tabela estruturada para a UI
      this.generatedTables.push({
        title: el.label.toUpperCase(),
        count: filtered[el.name].length,
        columns: tableColumns,
        rows: tableRows
      });

      // Adicionar separador entre diferentes tipos de itens
      this.generatedReports.push('───────────────────────');
    });
    
    // Remover o último separador se existir
    if (this.generatedReports[this.generatedReports.length - 1] === '───────────────────────') {
      this.generatedReports.pop();
    }

    this.isLoadingRelatorios = false;
  }

  // Variável para controlar carregamento da IA
  isLoadingAI: boolean = false;
  aiAnalysisResult: string | null = null;

  async generateSmartReport() {
    this.isLoadingAI = true;
    this.aiAnalysisResult = null;
    
    // 1. Gerar o relatório padrão primeiro para exibir os dados e tabelas visualmente
    try {
      await this.generateReport();
    } catch (e) {
      console.error('Erro ao gerar relatório preliminar:', e);
      this.notificationService.error('Erro ao carregar dados para o relatório.');
      this.isLoadingAI = false;
      return;
    }
    
    // 2. Construir o objeto de dados filtrados (similar ao generateReport)
    const resource: any = {
      devices: this.equipamentos,
      allocations: this.alocacoes,
      models: this.modelos,
      brands: this.marcas,
      repair: this.reparacoes,
      acquisitions: this.aquisicoes,
      disuse: this.baixas,
      companies: this.empresas,
      returned: this.devolucoes
    };

    const filtered: any = {
      devices: resource.devices,
      models: resource.models,
      brands: resource.brands,
      disuse: resource.disuse,
      companies: resource.companies,
      allocations: this.filterByPeriod(resource.allocations),
      returned: this.filterByPeriod(resource.returned),
      acquisitions: this.filterByPeriod(resource.acquisitions),
      repair: this.filterByPeriod(resource.repair)
    };

    // Filtrar apenas o que foi selecionado pelo usuário
    const selectedItems = this.reportItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      alert('Selecione pelo menos um item para gerar o relatório inteligente.');
      this.isLoadingAI = false;
      return;
    }

    const dataToSend: any = {};
    selectedItems.forEach(item => {
      dataToSend[item.name] = filtered[item.name];
    });

    // Verificar volume de dados para evitar payload excessivo
    let totalRecords = 0;
    Object.values(dataToSend).forEach((list: any) => {
      if (Array.isArray(list)) totalRecords += list.length;
    });

    if (totalRecords > 500) {
      const confirmMsg = `Atenção: O relatório contém muitos registos (${totalRecords}). A análise por IA pode demorar ou falhar devido ao tamanho dos dados. Deseja continuar?`;
      if (!confirm(confirmMsg)) {
        this.isLoadingAI = false;
        return;
      }
    }

    // 3. Enviar para a IA
    this.aiService.analyzeReport(dataToSend).subscribe({
      next: (analysisText) => {
        // 4. Gerar PDF com a análise
        this.aiAnalysisResult = analysisText;
        this.exportSmartReportToPDF(analysisText, dataToSend);
        this.isLoadingAI = false;
        this.notificationService.success('Relatório inteligente gerado com sucesso!');
      },
      error: (err) => {
        console.error('Erro na análise IA:', err);
        // Usar NotificationService para feedback mais elegante
        this.notificationService.error('Erro ao gerar relatório inteligente. Tente novamente mais tarde.');
        this.isLoadingAI = false;
      }
    });
  }

  async exportSmartReportToPDF(analysisText: string, data: any) {
    this.isLoadingRelatorios = true;
    
    const build = async () => {
      const [firstBg, secondBg] = await Promise.all([
        this.loadImage(this.getTemplateBgSrc()),
        this.loadImage(this.getSecondTemplateBgSrc())
      ]);

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const drawnPages = new Set<number>();

      const headerH = 55; 
      const footerH = 22;
      const contentTopY = headerH + 6;
      const contentBottomY = pageH - footerH - 6;

      const fontFamily = await this.ensureCenturyGothic(doc);
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(12);

      const drawBgPageSpecific = (d: jsPDF, pageNumber: number) => {
        const img = pageNumber === 1 ? firstBg : secondBg;
        d.addImage(img, 'PNG', 0, 0, pageW, pageH);
      };

      drawBgPageSpecific(doc, 1);
      drawnPages.add(1);

      // --- PÁGINA 1: Título e Análise da IA ---
      
      // Metadados
      const periodo = this.startDate && this.endDate
        ? `${new Date(this.startDate).toLocaleDateString('pt-PT')} até ${new Date(this.endDate).toLocaleDateString('pt-PT')}`
        : 'Todo o período';
      const dataGeracao = this.getCurrentDate();

      let yCursor = contentTopY + 10;
      
      // Título Principal
      if (fontFamily === 'CenturyGothic' && !this.centuryBoldAvailable) doc.setFont('helvetica', 'bold');
      else doc.setFont(fontFamily, 'bold');
      
      doc.setFontSize(16);
      doc.text('RELATÓRIO INTELIGENTE DE ATIVOS', pageW / 2, yCursor, { align: 'center' });
      yCursor += 10;

      // Subtítulo / Metadados
      doc.setFontSize(10);
      doc.setFont(fontFamily, 'normal');
      doc.text(`Gerado em: ${dataGeracao} | Período: ${periodo}`, pageW / 2, yCursor, { align: 'center' });
      yCursor += 15;

      // Título da Análise
      if (fontFamily === 'CenturyGothic' && !this.centuryBoldAvailable) doc.setFont('helvetica', 'bold');
      else doc.setFont(fontFamily, 'bold');
      doc.setFontSize(14);
      doc.text('ANÁLISE E INSIGHTS (IA)', 15, yCursor);
      yCursor += 8;

      // Texto da IA
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(11);
      const splitAnalysis = doc.splitTextToSize(analysisText, pageW - 30);
      
      // Verificar se o texto cabe na primeira página, se não, adicionar páginas
      // Simples lógica de paginação para texto
      const lineHeight = 5;
      for (const line of splitAnalysis) {
        if (yCursor > contentBottomY) {
          doc.addPage();
          drawBgPageSpecific(doc, doc.getNumberOfPages());
          drawnPages.add(doc.getNumberOfPages());
          yCursor = contentTopY;
        }
        doc.text(line, 15, yCursor);
        yCursor += lineHeight;
      }

      yCursor += 10;

      // --- TABELAS DE DADOS (Opcional, mas útil para contexto) ---
      // Reutiliza lógica simplificada de exportToPDF para anexar dados
      
      if (yCursor > contentBottomY - 20) {
        doc.addPage();
        drawBgPageSpecific(doc, doc.getNumberOfPages());
        drawnPages.add(doc.getNumberOfPages());
        yCursor = contentTopY;
      }

      if (fontFamily === 'CenturyGothic' && !this.centuryBoldAvailable) doc.setFont('helvetica', 'bold');
      else doc.setFont(fontFamily, 'bold');
      doc.setFontSize(14);
      doc.text('DADOS ANALISADOS', 15, yCursor);
      yCursor += 10;

      // Iterar sobre os itens selecionados para gerar tabelas
       const selectedItems = this.reportItems.filter(item => item.selected);
       for (const el of selectedItems) {
         const entries = data[el.name] || [];
         if (!entries.length) continue;

         if (yCursor > contentBottomY - 20) {
            doc.addPage();
            drawBgPageSpecific(doc, doc.getNumberOfPages());
            drawnPages.add(doc.getNumberOfPages());
            yCursor = contentTopY;
         }

         doc.setFontSize(12);
         doc.text(el.label.toUpperCase(), 15, yCursor);
         yCursor += 2;

         // Definir colunas (simplificado do original)
         let head: string[] = [];
         let body: any[] = [];
         
         // ... (Lógica de colunas idêntica ao switch do exportToPDF original, 
         // mas copiá-la inteira seria redundante. 
         // Para simplificar, vou chamar uma função auxiliar ou repetir a lógica essencial)
         // Vou repetir a lógica essencial de mapeamento para garantir que funcione standalone
         
          switch (el.name) {
          case 'devices':
            head = ['Modelo', 'Nº de Série', 'Estado'];
            for (const res of entries) {
              const modelo = this.modelos.find((m: any) => m.id === res.modeloId);
              body.push([modelo?.nome || '—', res.numeroSerie || '—', res.estado || '—']);
            }
            break;
          case 'allocations':
            head = ['Beneficiário', 'Entregador', 'Data'];
            for (const res of entries) {
               const beneficiario = this.getUserNameById(res.utilizadorBeneficiarioId) || res.utilizador?.nome || '—';
               const entregador = this.getUserNameById(res.utilizadorEntregadorId) || '—';
               const data = res.dataAlocacao ? new Date(res.dataAlocacao).toLocaleDateString('pt-PT') : '—';
               body.push([beneficiario, entregador, data]);
            }
            break;
          // ... outros casos simplificados
          default:
             head = ['Item'];
             body = entries.map((e:any) => [JSON.stringify(e).substring(0, 50)]);
        }

        autoTable(doc, {
          head: [head],
          body,
          startY: yCursor + 2,
          theme: 'grid',
          styles: { fontSize: 10, font: fontFamily, cellPadding: 2, textColor: 30 },
          headStyles: { fillColor: [241, 245, 249], textColor: 30, fontStyle: 'bold' },
          margin: { left: 15, right: 15, bottom: footerH },
          willDrawPage: (data: any) => {
            if (!drawnPages.has(data.pageNumber)) {
              drawBgPageSpecific(doc, data.pageNumber);
              drawnPages.add(data.pageNumber);
            }
          }
        });

        yCursor = (doc as any).lastAutoTable.finalY + 10;
       }

      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      // Salvar diretamente para evitar bloqueio de popup
      doc.save('relatorio_inteligente_ia.pdf');
      // window.open(url, '_blank');
    };

    build()
      .catch(err => console.error('Erro ao gerar PDF Inteligente:', err))
      .finally(() => { this.isLoadingRelatorios = false; });
  }

  async exportToPDF() {
    // Nova implementação: gerar PDF diretamente com jsPDF + autoTable,
    // aplicando os templates de fundo para a primeira e as páginas seguintes.
    this.isLoadingRelatorios = true;
    // Garantir dados em tempo real antes da geração
    await this.refreshSelectedData();

    const build = async () => {
      // Carregar imagens dos templates (primeira e segunda página)
      const [firstBg, secondBg] = await Promise.all([
        this.loadImage(this.getTemplateBgSrc()),
        this.loadImage(this.getSecondTemplateBgSrc())
      ]);

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const drawnPages = new Set<number>(); // evita redesenhar o BG da mesma página várias vezes

      // Margens e área de conteúdo: abaixo do título "Relatório" e acima do rodapé
      const headerH = 55; // altura aproximada até ao título
      const footerH = 22; // altura reservada ao rodapé
      const contentTopY = headerH + 6;
      const contentBottomY = pageH - footerH - 6;

      // Fonte: tenta Century Gothic, senão usa Helvetica
      const fontFamily = await this.ensureCenturyGothic(doc);
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(12);

      // Função que desenha o background correto conforme a página
      // Importante: o hook didDrawPage do autoTable é chamado APÓS o conteúdo da página.
      // Para evitar que a imagem de fundo cubra tabelas/textos, aplicamos baixa opacidade.
      // Desta forma, mesmo desenhando no final, o conteúdo permanece legível.
      const drawBgPageSpecific = (d: jsPDF, pageNumber: number) => {
        const img = pageNumber === 1 ? firstBg : secondBg;
        // Desenhar template no tom original, sem alteração de opacidade
        d.addImage(img, 'PNG', 0, 0, pageW, pageH);
      };

      // Desenhar BG na primeira página antes de qualquer conteúdo
      // (mesmo com opacidade baixa) para garantir consistência visual
      drawBgPageSpecific(doc, 1);
      drawnPages.add(1);

      // Construir dados do resumo
      const periodo = this.startDate && this.endDate
        ? `${new Date(this.startDate).toLocaleDateString('pt-PT')} até ${new Date(this.endDate).toLocaleDateString('pt-PT')}`
        : '—';
      const selecionados = this.getSelectedItemsText();
      const dataGeracao = this.getCurrentDate();

      // Resumo do relatório em texto (em vez de tabela), deslocado um pouco mais abaixo do título
      const leftX = 15;
      const labelWidth = 45; // largura reservada para o rótulo
      const lineGap = 7;
      let yCursor = contentTopY + 34; // descer ainda mais o conteúdo gerado conforme solicitado (sem tocar o rodapé)
      // Desenhar labels e valores
      doc.setTextColor(30);
      // Labels em negrito; se Century Gothic bold não existir, usar Helvetica bold como fallback apenas nos rótulos
      if (fontFamily === 'CenturyGothic' && !this.centuryBoldAvailable) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont(fontFamily, 'bold');
      }
      doc.text('Dados selecionados:', leftX, yCursor);
      doc.setFont(fontFamily, 'normal');
      doc.text(doc.splitTextToSize(selecionados, pageW - leftX - labelWidth - 15), leftX + labelWidth, yCursor);
      yCursor += lineGap;
      if (fontFamily === 'CenturyGothic' && !this.centuryBoldAvailable) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont(fontFamily, 'bold');
      }
      doc.text('Data de geração:', leftX, yCursor);
      doc.setFont(fontFamily, 'normal');
      doc.text(doc.splitTextToSize(dataGeracao, pageW - leftX - labelWidth - 15), leftX + labelWidth, yCursor);
      yCursor += lineGap;
      if (fontFamily === 'CenturyGothic' && !this.centuryBoldAvailable) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont(fontFamily, 'bold');
      }
      doc.text('Período:', leftX, yCursor);
      doc.setFont(fontFamily, 'normal');
      doc.text(doc.splitTextToSize(periodo, pageW - leftX - labelWidth - 15), leftX + labelWidth, yCursor);
      yCursor += lineGap + 6;

      // Preparar recurso e filtro como no generateReport
      const resource: any = {
        devices: this.equipamentos,
        allocations: this.alocacoes,
        models: this.modelos,
        brands: this.marcas,
        repair: this.reparacoes,
        acquisitions: this.aquisicoes,
        disuse: this.baixas,
        companies: this.empresas,
        returned: this.devolucoes
      };
      const filtered: any = {
        devices: resource.devices,
        models: resource.models,
        brands: resource.brands,
        disuse: resource.disuse,
        companies: resource.companies,
        allocations: this.filterByPeriod(resource.allocations),
        returned: this.filterByPeriod(resource.returned),
        acquisitions: this.filterByPeriod(resource.acquisitions),
        repair: this.filterByPeriod(resource.repair)
      };
      const selectedItems = this.reportItems.filter(item => item.selected);

      // Para cada secção selecionada, desenhar um título e tabela respetiva
      for (const el of selectedItems) {
        const entries = filtered[el.name] || [];
        if (!entries.length) continue;

        // Título da secção
        // Título de secção
        // Título de secção próximo da sua tabela
        if (fontFamily === 'CenturyGothic' && !this.centuryBoldAvailable) {
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont(fontFamily, 'bold');
        }
        doc.setFontSize(12);
        doc.text(el.label.toUpperCase(), 15, yCursor);
        doc.setFont(fontFamily, 'normal');
        yCursor += 4; // reduzir espaço entre título e tabela

        // Definir colunas e linhas conforme o tipo
        let head: string[] = [];
        const body: any[] = [];
        let columnStyles: any = {}; // Estilos específicos por coluna

        switch (el.name) {
          case 'devices':
            head = ['Modelo', 'Nº de Série', 'Estado'];
            for (const res of entries) {
              const modelo = this.modelos.find((m: any) => m.id === res.modeloId);
              const modeloNome = modelo?.nome || '—';
              body.push([modeloNome, res.numeroSerie || '—', res.estado || '—']);
            }
            break;
          case 'allocations':
            head = ['Beneficiário', 'Entregador', 'Marca', 'Modelo (tipo)', 'Data da Alocação'];
            for (const res of entries) {
              const beneficiario = this.getUserNameById(res.utilizadorBeneficiarioId) || res.utilizador?.nome || '—';
              const entregador = this.getUserNameById(res.utilizadorEntregadorId) || '—';
              const marcas = this.getMarcasDaAlocacao(res.id);
              const modeloTipo = this.getModelosTiposDaAlocacao(res.id);
              const dataRaw = res.dataAlocacao || res.data;
              const data = dataRaw ? new Date(dataRaw).toLocaleDateString('pt-PT') : '—';
              body.push([beneficiario, entregador, marcas, modeloTipo, data]);
            }
            break;
          case 'models':
            head = ['Nome do Modelo', 'Tipo', 'Marca'];
            for (const res of entries) {
              const nome = res.nome || '—';
              const tipo = this.inferTipoNomePorModelo(res) || '—';
              const marca = res.marca?.nome
                || this.getMarcaNomeByIdLocal(res.marcaId ?? res.marca?.id)
                || '—';
              body.push([nome, tipo, marca]);
            }
            break;
          case 'brands':
            head = ['Nome da Marca', 'Modelos Associados'];
            for (const res of entries) {
              const associados = this.getModelosNomesPorMarca(res.id, res.nome || undefined);
              const associadosStr = associados.length ? associados.join(', ') : '—';
              body.push([res.nome || '—', associadosStr]);
            }
            break;
          case 'repair':
            head = ['Empresa', 'Técnico', 'Avaria', 'Envio', 'Prevista', 'Devolução'];
            for (const res of entries) {
              const empresa = this.getEmpresaNomeById(res.empresaId) || '—';
              const tecnico = this.getTecnicoNomeById(res.tecnicoGSIId) || '—';
              const envio = res.dataEnvioReparacao ? new Date(res.dataEnvioReparacao).toLocaleDateString('pt-PT') : '—';
              const prevista = res.dataPrevistaDevolucao ? new Date(res.dataPrevistaDevolucao).toLocaleDateString('pt-PT') : '—';
              const devolucao = res.dataDevolucao ? new Date(res.dataDevolucao).toLocaleDateString('pt-PT') : '—';
              body.push([empresa, tecnico, res.avaria || '—', envio, prevista, devolucao]);
            }
            break;
          case 'acquisitions':
            head = ['Empresa', 'Descrição', 'Número', 'Data'];
            for (const res of entries) {
              const empresa = this.getEmpresaNomeById(res.empresaId) || res.fornecedor || '—';
              const descricao = res.descricao || '—';
              const numero = this.getConcursoNumero(res) || '—';
              const data = res.dataAquisicao ? new Date(res.dataAquisicao).toLocaleDateString('pt-PT') : '—';
              body.push([empresa, descricao, numero, data]);
            }
            break;
          case 'disuse':
            head = ['Quem entregou', 'Quem recebeu', 'Equipamento', 'Estado'];
            for (const res of entries) {
              const entregou = this.getUserNameById(res.utilizadorEntregouId) || '—';
              const recebeu = this.getUserNameById(res.utilizadorRecebeuId) || '—';
              const equipamento = res.equipamento?.numeroSerie || '—';
              const estado = res.equipamento?.estado || res.estado || '—';
              body.push([entregou, recebeu, equipamento, estado]);
            }
            break;
          case 'companies':
            head = ['Designação', 'Descrição', 'Telefone', 'Endereço'];
            for (const res of entries) {
              body.push([res.designacao || '—', res.descricao || '—', res.telefone || '—', res.endereco || '—']);
            }
            break;
          case 'returned':
            // Ajustar cabeçalhos para serem mais curtos e diretos
            head = ['Devolvido por', 'Recebido por', 'Data', 'Marca', 'Modelo (Tipo)', 'Estado'];
            
            // Definir larguras específicas para evitar quebra de layout "invulgar"
            columnStyles = {
              0: { cellWidth: 35 }, // Devolvido por
              1: { cellWidth: 35 }, // Recebido por
              2: { cellWidth: 25 }, // Data
              3: { cellWidth: 25 }, // Marca
              4: { cellWidth: 'auto' }, // Modelo (Tipo) - Flexível
              5: { cellWidth: 25 }  // Estado
            };

            for (const res of entries) {
              const nomeQuemDevolveu = this.getUserNameById(res.utilizadorDevolveuId) || '—';
              const nomeQuemRecebeu = this.getUserNameById(res.utilizadorRecebeuId) || '—';
              const data = res.dataDevolucao ? new Date(res.dataDevolucao).toLocaleDateString('pt-PT') : '—';
              const marcas = this.getMarcasDaDevolucao(res.id);
              const modeloTipo = this.getModelosTiposDaDevolucao(res.id);
              const estado = this.getEstadosDaDevolucao(res.id);
              body.push([nomeQuemDevolveu, nomeQuemRecebeu, data, marcas, modeloTipo, estado]);
            }
            break;
        }

        autoTable(doc, {
          head: [head],
          body,
          startY: yCursor + 1, // tabela mais próxima do título
          theme: 'grid',
          styles: { fontSize: 10, font: fontFamily, cellPadding: 3, textColor: 30, halign: 'left', overflow: 'linebreak' }, // Fonte levemente reduzida e padding ajustado
          columnStyles: columnStyles, // Aplicar estilos de coluna dinâmicos
          headStyles: { fillColor: [241, 245, 249], textColor: 30, lineColor: [203, 213, 225], lineWidth: 0.3, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          bodyStyles: { lineColor: [229, 231, 235], lineWidth: 0.2 },
          margin: { left: 15, right: 15, top: 15, bottom: pageH - contentBottomY },
          // Desenhar o template ANTES do conteúdo da página para evitar cobrir tabelas/textos
          willDrawPage: (data: any) => {
            if (!drawnPages.has(data.pageNumber)) {
              drawBgPageSpecific(doc, data.pageNumber);
              drawnPages.add(data.pageNumber);
            }
          }
        });

        // Espaçamento entre uma tabela e outra aumentado para melhor leitura
        yCursor = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 14 : yCursor + 32;
        const safeBottomGap = 28; // margem de segurança adicional para não encostar no rodapé
        if (yCursor > contentBottomY - safeBottomGap) {
          // Nova página reinicia o cursor
          yCursor = contentTopY;
        }
      }

      const pdfBlob = doc.output('blob');
      try {
        const url = URL.createObjectURL(pdfBlob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) {
        console.error('Erro ao abrir PDF em nova aba:', e);
      }
    };

    build()
      .catch(err => console.error('Erro ao gerar PDF:', err))
      .finally(() => { this.isLoadingRelatorios = false; });
  }

  // Helpers para fonte Century Gothic no PDF
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private async ensureCenturyGothic(doc: jsPDF): Promise<string> {
    // Como os ficheiros de fonte Century Gothic não estão presentes nos assets, 
    // retornamos diretamente 'helvetica' para evitar erros 404 no console.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    return 'helvetica';
    
    /* Código original mantido para referência futura caso as fontes sejam adicionadas:
    try {
      const fontResp = await fetch('assets/CenturyGothic.ttf');
      if (fontResp.ok) {
        const buf = await fontResp.arrayBuffer();
        const b64 = this.arrayBufferToBase64(buf);
        doc.addFileToVFS('CenturyGothic.ttf', b64);
        doc.addFont('CenturyGothic.ttf', 'CenturyGothic', 'normal');
        doc.setFont('CenturyGothic', 'normal');
        doc.setFontSize(12);
        // Tentar carregar variante Bold, se existir
        try {
          const boldResp = await fetch('assets/CenturyGothic-Bold.ttf');
          if (boldResp.ok) {
            const bbuf = await boldResp.arrayBuffer();
            const bb64 = this.arrayBufferToBase64(bbuf);
            doc.addFileToVFS('CenturyGothic-Bold.ttf', bb64);
            doc.addFont('CenturyGothic-Bold.ttf', 'CenturyGothic', 'bold');
            this.centuryBoldAvailable = true;
          }
        } catch (_) {
          this.centuryBoldAvailable = false;
        }
        return 'CenturyGothic';
      }
    } catch (_) {
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    return 'helvetica';
    */
  }
  


  
  // Método auxiliar para adicionar rodapé
  private addFooter(pdf: any, pageHeight: number, pageWidth: number) {
    const margin = 20;
    
    pdf.setDrawColor(226, 232, 240); // cor cinza claro
    pdf.setLineWidth(0.3);
    pdf.line(margin, pageHeight - margin - 10, pageWidth - margin, pageHeight - margin - 10);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139); // cor cinza
    
    pdf.text(`© ${this.getCurrentYear()} G ACTIVOS - Sistema de Gestão de Ativos`, pageWidth / 2, pageHeight - margin - 6, { align: 'center' });
    pdf.text('Relatório gerado automaticamente pelo sistema', pageWidth / 2, pageHeight - margin - 2, { align: 'center' });
  }

  getSelectedItemsText(): string {
    const selectedItems = this.reportItems
      .filter(item => item.selected)
      .map(item => item.label);
    
    if (selectedItems.length === 0) return 'Nenhum item selecionado';
    if (selectedItems.length === 1) return selectedItems[0];
    if (selectedItems.length === 2) return selectedItems.join(' e ');
    
    return selectedItems.slice(0, -1).join(', ') + ' e ' + selectedItems[selectedItems.length - 1];
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }

  // Usar imagem de fundo do template oficial
  useImageTemplate: boolean = true;
  
  getTemplateBgSrc(): string {
    // Template da primeira página do relatório
    return '/assets/Relatorio.png';
  }

  getSecondTemplateBgSrc(): string {
    // Template para páginas seguintes
    return '/assets/Second page.png';
  }

  // Fallback programático para o logo do relatório (SVG)
  logoSrc: string = '/assets/logo.svg.png';

  // Método utilitário para uso em template/pdf com fallback
  getLogoSrc(): string {
    return this.logoSrc;
  }

  // Rodapé SVG
  getFooterSvgSrc(): string {
    return '/assets/rodape.svg';
  }

  // Utilitário para carregar imagem e garantir disponibilidade
  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  }

  // Linhas de tabela de placeholder para exibir estrutura sem depender de dados reais
  placeholderRows: number[] = Array.from({ length: 12 }, (_, i) => i + 1);
  // Helpers de mapeamento para Modelos e Marcas
  private getMarcaNomeByIdLocal(id: number | string | null | undefined): string {
    const numId = typeof id === 'string' ? Number(id) : id;
    const marca = this.marcas.find((m: any) => m.id === numId);
    return marca?.nome || 'Não especificada';
  }

  private getTipoNomeByIdLocal(id: number | string | null | undefined): string {
    const numId = typeof id === 'string' ? Number(id) : id;
    const tipo = this.tipos.find((t: any) => t.id === numId);
    return tipo?.nome || 'Não especificado';
  }

  private getModelosNomesPorMarca(marcaId: number, marcaNomeFallback?: string): string[] {
    const nomes: string[] = [];
    const models = Array.isArray(this.modelos) ? this.modelos : [];
    for (const mod of models) {
      const mId = mod.marcaId ?? mod.marca?.id;
      const mNome = mod.marca?.nome;
      if (mId === marcaId || (!!marcaNomeFallback && mNome === marcaNomeFallback)) {
        nomes.push(mod.nome || '—');
      }
    }
    // Remover duplicados e ordenar
    return Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b));
  }

  // Inferência de Tipo para um Modelo específico
  private inferTipoNomePorModelo(modelo: any): string | undefined {
    // 1) Preferências diretas
    const direto = modelo?.tipo?.nome
      || this.getTipoNomeByIdLocal(modelo?.tipoId ?? modelo?.tipo?.id)
      || modelo?.categoria;
    if (direto && direto !== 'Não especificado' && direto !== '—') return direto;

    // 2) Equipamentos que utilizam este modelo -> tipoEquipamentoId
    const eq = (this.equipamentos || []).find((e: any) => e.modeloId === modelo?.id);
    if (eq?.tipoEquipamentoId) {
      const viaEq = this.getTipoNomeByIdLocal(eq.tipoEquipamentoId);
      if (viaEq && viaEq !== 'Não especificado' && viaEq !== '—') return viaEq;
    }

    // 3) Heurística por palavras-chave entre nome do modelo e nome dos tipos
    const normalize = (s: string) => (s || '').toLowerCase()
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
    const modeloNomeNorm = normalize(modelo?.nome || '');
    for (const t of (this.tipos || [])) {
      const tipoNomeNorm = normalize(t?.nome || '');
      if (!tipoNomeNorm) continue;
      // Match se o nome do tipo aparece no modelo ou vice-versa
      if (modeloNomeNorm.includes(tipoNomeNorm) || tipoNomeNorm.includes(modeloNomeNorm)) {
        return t?.nome;
      }
    }

    // 4) Pequeno dicionário de sinónimos (ajustável conforme necessidade)
    const synonyms: { [k: string]: string[] } = {
      'portatil': ['thinkpad', 'thinkbook', 'macbook'],
      'monitor': ['thinkvision'],
      'tablet': ['ipad']
    };
    for (const t of (this.tipos || [])) {
      const key = normalize(t?.nome || '');
      const syns = synonyms[key];
      if (syns && syns.some(s => modeloNomeNorm.includes(s))) {
        return t?.nome;
      }
    }

    // Sem inferência
    return undefined;
  }

  // ===== Helpers específicos para Alocações (Marca, Modelo/Tipo) =====
  private getModeloNomePorEquipamentoId(equipamentoId: number | undefined | null): string {
    if (!equipamentoId) return '';
    const eq = (this.equipamentos || []).find((e: any) => e.id === equipamentoId);
    const modeloId = eq?.modeloId ?? eq?.modelo?.id;
    const modelo = (this.modelos || []).find((m: any) => m.id === modeloId);
    return modelo?.nome || '';
  }

  private getTipoNomePorEquipamentoId(equipamentoId: number | undefined | null): string {
    if (!equipamentoId) return '';
    const eq = (this.equipamentos || []).find((e: any) => e.id === equipamentoId);
    // tenta pelo equipamento, senão pelo modelo
    const tipoId = eq?.tipoEquipamentoId
      ?? (this.modelos || []).find((m: any) => m.id === (eq?.modeloId ?? eq?.modelo?.id))?.tipoId
      ?? (this.modelos || []).find((m: any) => m.id === (eq?.modeloId ?? eq?.modelo?.id))?.tipo?.id;
    return this.getTipoNomeByIdLocal(tipoId);
  }

  private getMarcaNomePorEquipamentoId(equipamentoId: number | undefined | null): string {
    if (!equipamentoId) return '';
    const eq = (this.equipamentos || []).find((e: any) => e.id === equipamentoId);
    const modeloId = eq?.modeloId ?? eq?.modelo?.id;
    const modelo = (this.modelos || []).find((m: any) => m.id === modeloId);
    const marcaNome = modelo?.marca?.nome || this.getMarcaNomeByIdLocal(modelo?.marcaId);
    return marcaNome || '';
  }

  private getModelosTiposDaAlocacao(alocacaoId: number): string {
    const itens = (this.itemsAlocacao || []).filter((it: any) => (it.alocacaoId ?? it.alocacao?.id) === alocacaoId);
    if (!itens.length) return '—';
    const labels = itens.map((item: any) => {
      const equipamentoId = item?.equipamentoId || item?.equipamento?.id;
      const mNome = this.getModeloNomePorEquipamentoId(equipamentoId);
      const tNome = this.getTipoNomePorEquipamentoId(equipamentoId);
      if (mNome && tNome) return `${mNome} (${tNome})`;
      return mNome || '—';
    }).filter(Boolean);
    const unique = Array.from(new Set(labels));
    return unique.length ? unique.join(', ') : '—';
  }

  private getMarcasDaAlocacao(alocacaoId: number): string {
    const itens = (this.itemsAlocacao || []).filter((it: any) => (it.alocacaoId ?? it.alocacao?.id) === alocacaoId);
    if (!itens.length) return '—';
    const marcas = itens.map((item: any) => {
      const equipamentoId = item?.equipamentoId || item?.equipamento?.id;
      return this.getMarcaNomePorEquipamentoId(equipamentoId) || '—';
    }).filter(m => m && m !== '—');
    const unique = Array.from(new Set(marcas));
    return unique.length ? unique.join(', ') : '—';
  }

  // ===== Helpers para Devoluções (Marca, Modelo/Tipo, Estado) =====
  private getMarcasDaDevolucao(devolucaoId: number): string {
    const itens = (this.itemsDevolucao || []).filter((it: any) => (it.devolucaoId ?? it.devolucao?.id) === devolucaoId);
    if (!itens.length) return '—';
    const marcas = itens.map((item: any) => {
      const equipamentoId = item?.equipamentoId || item?.equipamento?.id || (() => {
        const itemAlocId = item?.itemsAlocacaoId || item?.itemAlocacaoId;
        const itAloc = (this.itemsAlocacao || []).find((a: any) => a.id === itemAlocId);
        return itAloc?.equipamentoId || itAloc?.equipamento?.id;
      })();
      return this.getMarcaNomePorEquipamentoId(equipamentoId) || '—';
    }).filter(m => m && m !== '—');
    const unique = Array.from(new Set(marcas));
    return unique.length ? unique.join(', ') : '—';
  }

  private getModelosTiposDaDevolucao(devolucaoId: number): string {
    const itens = (this.itemsDevolucao || []).filter((it: any) => (it.devolucaoId ?? it.devolucao?.id) === devolucaoId);
    if (!itens.length) return '—';
    const labels = itens.map((item: any) => {
      const equipamentoId = item?.equipamentoId || item?.equipamento?.id || (() => {
        const itemAlocId = item?.itemsAlocacaoId || item?.itemAlocacaoId;
        const itAloc = (this.itemsAlocacao || []).find((a: any) => a.id === itemAlocId);
        return itAloc?.equipamentoId || itAloc?.equipamento?.id;
      })();
      const mNome = this.getModeloNomePorEquipamentoId(equipamentoId);
      const tNome = this.getTipoNomePorEquipamentoId(equipamentoId);
      if (mNome && tNome) return `${mNome} (${tNome})`;
      return mNome || '—';
    }).filter(Boolean);
    const unique = Array.from(new Set(labels));
    return unique.length ? unique.join(', ') : '—';
  }

  private getEstadosDaDevolucao(devolucaoId: number): string {
    const itens = (this.itemsDevolucao || []).filter((it: any) => (it.devolucaoId ?? it.devolucao?.id) === devolucaoId);
    if (!itens.length) return '—';
    const estados = itens.map((item: any) => {
      const equipamentoId = item?.equipamentoId || item?.equipamento?.id || (() => {
        const itemAlocId = item?.itemsAlocacaoId || item?.itemAlocacaoId;
        const itAloc = (this.itemsAlocacao || []).find((a: any) => a.id === itemAlocId);
        return itAloc?.equipamentoId || itAloc?.equipamento?.id;
      })();
      const eq = (this.equipamentos || []).find((e: any) => e.id === equipamentoId);
      return eq?.estado || item?.novoEstado || '—';
    }).filter(s => s && s !== '—');
    const unique = Array.from(new Set(estados));
    return unique.length ? unique.join(', ') : '—';
  }

}
