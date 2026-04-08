import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AlocacaoService } from '../../services/alocacoes.service';
import { ItemsAlocacaoService } from '../../services/item-alocacao.service';
import { UtilizadorService } from '../../services/utilizador.service';
import { EquipamentoService } from '../../services/equipamento.service';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { NotificationService } from '../../components/notification/notification.service';
import { ErrorHandlerService } from '../../services/error-handler.service';
import { ModalService } from '../../services/modal.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { EmpresaService } from '../../services/empresa.service';
import { UnidadeService } from '../../services/unidade.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { FileUploadService, FileUploadResponse } from '../../services/file-upload.service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MarcaService } from '../../services/marca.service';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-alocacoes',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, FileUploadComponent, NgSelectModule],
  templateUrl: './alocacoes.component.html',
  styleUrls: ['./alocacoes.component.scss'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ height: '0', opacity: 0 }),
        animate('250ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ height: '0', opacity: 0 }))
      ])
    ])
  ]
})
export class AlocacoesComponent implements OnInit {
  alocacoes: any[] = [];
  page = 0;
  size = 20;
  total = 0;
  hasMore = true;
  loading = false;
  useFallback = false;
  bufferTodos: any[] = [];
  equipamentos: any[] = [];
  equipamentosDisponiveis: any[] = [];
  modelos: any[] = [];
  // Adicionado: tipos de equipamento para exibição do "Modelo (Tipo)"
  tipos: any[] = [];
  empresas: any[] = [];
  unidades: any[] = [];
  marcas: any[] = [];
  utilizadores: any[] = [];
  utilizadoresFiltrados: any[] = [];
  utilizadorSelecionado: any = null;
  utilizadorBusca: string = '';
  guiaGerada: boolean = false;
  // Estado para controlar upload da guia gerada
  isUploadingGuia: boolean = false;
  // Variáveis para controle de busca do Utilizador Entregador
  utilizadoresEntregadorFiltrados: any[] = [];
  utilizadorEntregadorSelecionado: any = null;
  utilizadorEntregadorBusca: string = '';
  selectedEquipamentos: string[] = [];
  dropdownEquipamentoAberto = false;
  equipamentoBusca: string = '';
  // Novos estados para filtros typeahead
  periodoBusca: string = '';
  periodosFiltrados: string[] = [];
  equipamentosFiltradosSugestao: any[] = [];
  
  // Adicionado: cache para itens por alocação e equipamentos carregados
  itensPorAlocacao: { [alocacaoId: number]: any[] } = {};
  equipamentosMap: Map<number, any> = new Map<number, any>();
  
  filtroPeriodo: string | null = null;
  // Filtro por Utilizador Beneficiário (substitui o filtro por Empresa)
  filtroUtilizadorBeneficiario: number | null = null;
  periodos: string[] = ['Determinado', 'Indeterminado'];

  form: FormGroup;
  showModal = false;
  editando = false;
  alocacaoSelecionadaId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private alocacaoService: AlocacaoService,
    private itemsAlocacaoService: ItemsAlocacaoService,
    private modalService: ModalService,
    private equipamentoService: EquipamentoService,
    private utilizadorService: UtilizadorService,
    private notificationService: NotificationService,
    private errorHandler: ErrorHandlerService,
    private empresaService: EmpresaService,
    private unidadeService: UnidadeService,
    private fileUploadService: FileUploadService,
    private marcaService: MarcaService
  ) {
    this.form = this.fb.group({
      utilizadorBeneficiarioId: [null, Validators.required],
      utilizadorEntregadorId: [1, Validators.required],
      dataAlocacao: ['', Validators.required],
      periodoAlocacao: ['', Validators.required],
      pathGuiaRecepcao: [''] // Campo opcional - nem todos os ativos possuem documentação
    });
  }

  ngOnInit(): void {
    // Carregar utilizadores primeiro para garantir que estejam disponíveis
    this.carregarUtilizadores();
    // Carregar unidades (necessário para derivar Empresa a partir do Utilizador)
    this.carregarUnidades();
    // Carregar empresas para filtro e exibição
    this.carregarEmpresas();
    // Depois carregar o restante dos dados
    this.carregarAlocacoes();
    this.carregarEquipamentos();
    this.carregarModelos();
    // Adicionado: carregar tipos de equipamento para compor "Modelo (Tipo)"
    this.carregarTiposEquipamento();
    this.carregarMarcas();
  }

  carregarEmpresas(): void {
    this.empresaService.listar().subscribe({
      next: (dados: any[]) => {
        this.empresas = dados;
      },
      error: (erro: any) => {
        console.error('Erro ao buscar empresas:', erro);
        if (erro.status === 401 || erro.status === 403) {
          this.notificationService.showError('Sua sessão expirou. Por favor, faça login novamente.');
        } else {
          const errorMessage = this.errorHandler.handleHttpError(erro);
          this.errorHandler.showError(errorMessage);
        }
      }
    });
  }

  carregarUnidades(): void {
    this.unidadeService.listar().subscribe({
      next: (dados: any[]) => {
        this.unidades = dados;
      },
      error: (erro: any) => {
        console.error('Erro ao buscar unidades:', erro);
        if (erro.status === 401 || erro.status === 403) {
          this.notificationService.showError('Sua sessão expirou. Por favor, faça login novamente.');
        } else {
          const errorMessage = this.errorHandler.handleHttpError(erro);
          this.errorHandler.showError(errorMessage);
        }
      }
    });
  }

  carregarAlocacoes(): void {
    // Carregar apenas alocações com itens ativos (não devolvidos)
    this.alocacaoService.listarAtivas().subscribe({
      next: (dados: any) => {
        this.alocacoes = dados;
        // Reset cache de itens; serão carregados sob demanda ao expandir a subtabela
        this.itensPorAlocacao = {};
      },
      error: (erro: any) => {
        console.error('Erro ao buscar alocações:', erro);
        if (erro.status === 401 || erro.status === 403) {
          this.notificationService.showError('Sua sessão expirou. Por favor, faça login novamente.');
        } else {
          const errorMessage = this.errorHandler.handleHttpError(erro);
          this.errorHandler.showError(errorMessage);
        }
      }
    });
  }

  carregarAlocacoesPaginado(reset = false): void {
    this.carregarAlocacoes();
  }

  private appendFromBuffer(reset = false): void {
    const start = reset ? 0 : this.alocacoes.length;
    const next = this.bufferTodos.slice(start, start + this.size);
    this.alocacoes = this.alocacoes.concat(next);
    this.total = this.bufferTodos.length;
    this.hasMore = this.alocacoes.length < this.total;
    if (this.hasMore) {
      this.page += 1;
    }
  }

  carregarEquipamentos(): void {
    this.equipamentoService.listarEquipamentos().subscribe({
      next: (dados) => {
        this.equipamentos = dados.filter(e => e.estado !== 'ALOCADO');
        // Filtrar apenas equipamentos disponíveis (não alocados)
        this.equipamentosDisponiveis = dados.filter(eq => 
          eq.estado === 'DISPONIVEL' || eq.estado === 'STOCK_BOM' || eq.estado === 'STOCK_NOVO'
        );
      },
      error: (erro) => {
        console.error('Erro ao buscar equipamentos:', erro);
        if (erro.status === 401 || erro.status === 403) {
          this.notificationService.showError('Sua sessão expirou. Por favor, faça login novamente.');
        } else {
          const errorMessage = this.errorHandler.handleHttpError(erro);
          this.errorHandler.showError(errorMessage);
        }
      }
    });
  }

  carregarModelos(): void {
    this.equipamentoService.listarModelos().subscribe({
      next: (dados) => this.modelos = dados,
      error: (erro) => {
        console.error('Erro ao buscar modelos:', erro);
        if (erro.status === 401 || erro.status === 403) {
          this.notificationService.showError('Sua sessão expirou. Por favor, faça login novamente.');
        } else {
          const errorMessage = this.errorHandler.handleHttpError(erro);
          this.errorHandler.showError(errorMessage);
        }
      }
    });
  }

  // Adicionado: carregar lista de tipos de equipamento
  carregarTiposEquipamento(): void {
    this.equipamentoService.listarTipos().subscribe({
      next: (dados: any[]) => {
        this.tipos = dados;
      },
      error: (erro: any) => {
        console.error('Erro ao buscar tipos de equipamento:', erro);
        if (erro.status === 401 || erro.status === 403) {
          this.notificationService.showError('Sua sessão expirou. Por favor, faça login novamente.');
        } else {
          const errorMessage = this.errorHandler.handleHttpError(erro);
          this.errorHandler.showError(errorMessage);
        }
      }
    });
  }

  carregarMarcas(): void {
    this.marcaService.listar().subscribe({
      next: (dados: any[]) => {
        this.marcas = dados || [];
      },
      error: (erro: any) => {
        console.error('Erro ao buscar marcas:', erro);
        this.marcas = [];
      }
    });
  }

  carregarUtilizadores(): void {
    console.log('Iniciando carregamento de utilizadores...');
    this.utilizadorService.listar().subscribe({
      next: (dados) => {
        console.log('Utilizadores recebidos:', dados);
        this.utilizadores = dados;
        // Inicializar as listas filtradas com todos os utilizadores
        if (this.utilizadorBusca) {
          this.filtrarUtilizadores();
        } else {
          this.utilizadoresFiltrados = [...this.utilizadores];
        }
        if (this.utilizadorEntregadorBusca) {
          this.filtrarUtilizadoresEntregador();
        } else {
          this.utilizadoresEntregadorFiltrados = [...this.utilizadores];
        }
      },
      error: (erro) => {
        console.error('Erro ao buscar utilizadores:', erro);
        if (erro.status === 401 || erro.status === 403) {
          this.notificationService.showError('Sua sessão expirou. Por favor, faça login novamente.');
        } else {
          const errorMessage = this.errorHandler.handleHttpError(erro);
          this.notificationService.showError('Erro ao carregar utilizadores. Por favor, tente novamente.');
        }
      }
    });
  }
  
  recarregarUtilizadores(): void {
    this.notificationService.showInfo('Recarregando lista de utilizadores...');
    this.utilizadorService.listar().subscribe({
      next: (dados) => {
        console.log('Utilizadores recarregados:', dados);
        this.utilizadores = dados;
        this.filtrarUtilizadores();
        this.filtrarUtilizadoresEntregador();
        this.notificationService.showSuccess('Lista de utilizadores atualizada com sucesso!');
      },
      error: (erro) => {
        console.error('Erro ao recarregar utilizadores:', erro);
        this.notificationService.showError('Erro ao recarregar utilizadores. Por favor, tente novamente.');
      }
    });
  }

  abrirModal(novo = true, alocacao?: any) {
    this.editando = !novo;
    this.showModal = true;
    this.modalService.openModal();
    this.selectedEquipamentos = [];
    this.utilizadorSelecionado = null;
    this.utilizadorBusca = '';
    this.utilizadorEntregadorSelecionado = null;
    this.utilizadorEntregadorBusca = '';
    this.guiaGerada = false; // esconder "Salvar" ao abrir a modal
    
    // Inicializar as listas de utilizadores para os dropdowns
    this.filtrarUtilizadores();
    this.filtrarUtilizadoresEntregador();

    if (novo) {
      this.alocacaoSelecionadaId = null;
      this.form.reset();
    } else {
      this.alocacaoSelecionadaId = alocacao.id;
      // Converter o periodoAlocacao de número para string
      const periodoString = alocacao.periodoAlocacao === 1 ? 'Determinado' : 'Indeterminado';
      
      this.form.patchValue({
        utilizadorBeneficiarioId: alocacao.utilizadorBeneficiarioId,
        utilizadorEntregadorId: alocacao.utilizadorEntregadorId || 1,
        dataAlocacao: alocacao.dataAlocacao,
        periodoAlocacao: periodoString,
        pathGuiaRecepcao: alocacao.pathGuiaRecepcao
      });
      // Exibir o período selecionado no input de busca
      this.periodoBusca = periodoString;

      // Definir o utilizador beneficiário selecionado
      const utilizador = this.utilizadores.find(u => u.id === alocacao.utilizadorBeneficiarioId);
      if (utilizador) {
        this.utilizadorSelecionado = utilizador;
        this.utilizadorBusca = utilizador.nome;
      }
      
      // Definir o utilizador entregador selecionado
      const utilizadorEntregador = this.utilizadores.find(u => u.id === alocacao.utilizadorEntregadorId);
      if (utilizadorEntregador) {
        this.utilizadorEntregadorSelecionado = utilizadorEntregador;
        this.utilizadorEntregadorBusca = utilizadorEntregador.nome;
      }

      this.itemsAlocacaoService.listarPorAlocacao(alocacao.id).subscribe({
        next: (itens: any) => {
          this.selectedEquipamentos = [];
          (itens || []).forEach((item: any) => {
            const eqLocal = this.equipamentos.find(e => e.id === item.equipamentoId);
            if (eqLocal) {
              if (!this.selectedEquipamentos.includes(eqLocal.numeroSerie)) {
                this.selectedEquipamentos.push(eqLocal.numeroSerie);
              }
              this.equipamentosMap.set(eqLocal.id, eqLocal);
            } else {
              const equipamentoId = item?.equipamentoId || item?.equipamento?.id;
              if (equipamentoId) {
                this.equipamentoService.buscarPorId(equipamentoId).subscribe({
                  next: (eq: any) => {
                    if (eq?.numeroSerie && !this.selectedEquipamentos.includes(eq.numeroSerie)) {
                      this.selectedEquipamentos.push(eq.numeroSerie);
                    }
                    if (eq?.id) {
                      this.equipamentosMap.set(eq.id, eq);
                    }
                  },
                  error: (erro: any) => {
                    console.error('Erro ao buscar equipamento da alocação (edição):', erro);
                    const errorMessage = this.errorHandler.handleHttpError(erro);
                    this.errorHandler.showError(errorMessage);
                  }
                });
              }
            }
          });
          // resetar busca e sugestões para refletir estado atual
          this.equipamentoBusca = '';
          this.equipamentosFiltradosSugestao = [];
        },
        error: (err: any) => {
          console.error('Erro ao carregar itens da alocação:', err);
          if (err.status === 401 || err.status === 403) {
            this.notificationService.showError('Sua sessão expirou. Por favor, faça login novamente.');
          } else {
            const errorMessage = this.errorHandler.handleHttpError(err);
            this.errorHandler.showError(errorMessage);
          }
        }
      });
    }
  }

  fecharModal() {
    this.showModal = false;
    this.modalService.closeModal();
    this.form.reset();
    this.alocacaoSelecionadaId = null;
  }

  toggleEquipamentoSelecionado(numeroSerie: string, event: any) {
    if (event.target.checked) {
      if (!this.selectedEquipamentos.includes(numeroSerie)) {
        this.selectedEquipamentos.push(numeroSerie);
      }
    } else {
      this.selectedEquipamentos = this.selectedEquipamentos.filter(ns => ns !== numeroSerie);
    }
  }

  getNomeUtilizador(id: number): string {
    const u = this.utilizadores.find(u => u.id === id);
    return u ? u.nome : `ID ${id}`;
  }

  getModeloNome(id: number): string {
    const m = this.modelos.find(m => m.id === id);
    return m ? m.nome : `Modelo ${id}`;
  }

  getEmpresaNome(id: number): string {
    const empresa = this.empresas.find((e: any) => e.id === id);
    return empresa ? empresa.designacao : '---';
  }

  // Deriva o ID da Empresa a partir da alocação.
  // Prioridade: 1) aloc.empresaId (se existir) 2) empresa da unidade do utilizador beneficiário
  getEmpresaIdFromAlocacao(aloc: any): number | null {
    if (!aloc) return null;
    if (aloc.empresaId) return aloc.empresaId;

    // Tentar derivar via utilizador beneficiário -> unidade -> empresaId
    const user = this.utilizadores.find(u => u.id === aloc.utilizadorBeneficiarioId);
    const unidadeId = user?.unidadeId;
    if (unidadeId) {
      const unidade = this.unidades.find((u: any) => u.id === unidadeId);
      if (unidade && unidade.empresaId) {
        return unidade.empresaId;
      }
    }
    return null;
  }

  getEmpresaNomeByAlocacao(aloc: any): string {
    const empresaId = this.getEmpresaIdFromAlocacao(aloc);
    return empresaId ? this.getEmpresaNome(empresaId) : '---';
  }

  getAlocacoesFiltradas() {
    return this.alocacoes.filter(aloc => {
      const filtroPeriodoOK = !this.filtroPeriodo || aloc.periodoAlocacao === this.filtroPeriodo;
      const filtroBeneficiarioOK = !this.filtroUtilizadorBeneficiario || aloc.utilizadorBeneficiarioId === this.filtroUtilizadorBeneficiario;
      return filtroPeriodoOK && filtroBeneficiarioOK;
    });
  }

  getEquipamentosFiltrados() {
    // construir base com disponíveis
    const mapa = new Map<string, any>();
    (this.equipamentosDisponiveis || []).forEach(eq => {
      if (eq?.numeroSerie) mapa.set(eq.numeroSerie, eq);
    });
    // acrescentar selecionados vindos da edição (podem estar ALOCADOS)
    const cacheValues = Array.from(this.equipamentosMap.values());
    for (const ns of this.selectedEquipamentos) {
      // tentar encontrar nos disponíveis
      let eq = (this.equipamentosDisponiveis || []).find(e => e.numeroSerie === ns);
      // se não houver, tentar nos equipamentos gerais
      if (!eq) {
        eq = (this.equipamentos || []).find(e => e.numeroSerie === ns);
      }
      // se ainda não houver, tentar no cache carregado por buscarPorId
      if (!eq) {
        eq = cacheValues.find(e => e?.numeroSerie === ns);
      }
      // como última alternativa, montar objeto mínimo só para exibir na lista
      if (!eq) {
        eq = { numeroSerie: ns };
      }
      mapa.set(ns, eq);
    }
    const base = Array.from(mapa.values());

    if (!this.equipamentoBusca || this.equipamentoBusca.trim() === '') {
      return base;
    }
    const busca = this.equipamentoBusca.toLowerCase().trim();
    return base.filter(eq => {
      const numeroSerieMatch = (eq?.numeroSerie || '').toLowerCase().includes(busca);
      const modelo = this.modelos.find(m => m.id === eq?.modeloId);
      const modeloMatch = modelo && (modelo?.nome || '').toLowerCase().includes(busca);
      return numeroSerieMatch || modeloMatch;
    });
  }

  private getEquipamentoIdPorNumeroSerie(ns: string): number | null {
    const eqLocal = (this.equipamentos || []).find(e => e.numeroSerie === ns);
    if (eqLocal?.id) return eqLocal.id;
    const cacheValues = Array.from(this.equipamentosMap.values());
    const eqCache = cacheValues.find(e => e?.numeroSerie === ns);
    return eqCache?.id || null;
  }

  filtrarUtilizadores() {
    console.log('Filtrando utilizadores com busca:', this.utilizadorBusca);
    console.log('Lista de utilizadores disponíveis:', this.utilizadores);
        if (!this.utilizadores || this.utilizadores.length === 0) {
      console.log('Lista de utilizadores vazia');
      this.utilizadoresFiltrados = [];
      return;
    }
    
    if (!this.utilizadorBusca) {
      // Se não houver texto de busca, não mostrar nenhum utilizador
      this.utilizadoresFiltrados = [];
      console.log('Sem texto de busca, ocultando lista');
      return;
    }
    
    const busca = this.utilizadorBusca.toLowerCase();
    this.utilizadoresFiltrados = this.utilizadores.filter(u => 
      u.nome && u.nome.toLowerCase().includes(busca)
    );
    console.log('Utilizadores filtrados:', this.utilizadoresFiltrados);
  }

  selecionarUtilizador(utilizador: any) {
    this.utilizadorSelecionado = utilizador;
    this.form.get('utilizadorBeneficiarioId')?.setValue(utilizador.id);
    this.utilizadorBusca = utilizador.nome;
    this.utilizadoresFiltrados = [];
  }
  
  filtrarUtilizadoresEntregador() {
    console.log('Filtrando utilizadores entregador com busca:', this.utilizadorEntregadorBusca);
    console.log('Lista de utilizadores disponíveis para entregador:', this.utilizadores);
    
    if (!this.utilizadores || this.utilizadores.length === 0) {
      console.log('Lista de utilizadores vazia para entregador');
      this.utilizadoresEntregadorFiltrados = [];
      return;
    }
    
    if (!this.utilizadorEntregadorBusca) {
      // Se não houver texto de busca, não mostrar nenhum utilizador
      this.utilizadoresEntregadorFiltrados = [];
      console.log('Sem texto de busca para entregador, ocultando lista');
      return;
    }
    
    const busca = this.utilizadorEntregadorBusca.toLowerCase();
    this.utilizadoresEntregadorFiltrados = this.utilizadores.filter(u => 
      u.nome && u.nome.toLowerCase().includes(busca)
    );
    console.log('Utilizadores entregador filtrados:', this.utilizadoresEntregadorFiltrados);
  }

  selecionarUtilizadorEntregador(utilizador: any) {
    this.utilizadorEntregadorSelecionado = utilizador;
    this.form.get('utilizadorEntregadorId')?.setValue(utilizador.id);
    this.utilizadorEntregadorBusca = utilizador.nome;
    this.utilizadoresEntregadorFiltrados = [];
  }

  excluir(id: number) {
    if (confirm('Tem certeza que deseja remover esta alocação?')) {
      // Mostrar indicador de carregamento
      this.notificationService.showInfo('Processando solicitação...');
      
      this.alocacaoService.remover(id).subscribe({
        next: () => {
          this.alocacoes = this.alocacoes.filter(a => a.id !== id);
          this.notificationService.showSuccess('Alocação removida com sucesso.');
        },
        error: (err: any) => {
          console.error('Erro ao remover alocação:', err);
          // Verificar se é erro de autenticação
          if (err.status === 401 || err.status === 403) {
            this.notificationService.showError('Sua sessão expirou. Por favor, faça login novamente.');
          } else {
            const errorMessage = this.errorHandler.handleHttpError(err);
            this.errorHandler.showError(errorMessage);
          }
        }
      });
    }
  }

  salvar() {
    if (this.form.invalid) return;

    // Evitar salvar enquanto o upload automático da guia está em andamento
    if (this.isUploadingGuia) {
      this.notificationService.showInfo('Aguarde a conclusão do upload da Guia de Recepção antes de salvar.');
      return;
    }

    const dados = this.form.value;
    const arquivo = dados.pathGuiaRecepcao;

    // Converter período de alocação de string para int
    // 'Determinado' = 1, 'Indeterminado' = 0
    if (dados.periodoAlocacao === 'Determinado') {
      dados.periodoAlocacao = 1;
    } else if (dados.periodoAlocacao === 'Indeterminado') {
      dados.periodoAlocacao = 0;
    } else {
      // Se o valor já for numérico, não precisa converter
      dados.periodoAlocacao = parseInt(dados.periodoAlocacao) || 0;
    }

    // Verificar se todos os campos obrigatórios estão preenchidos
    if (!dados.utilizadorBeneficiarioId) {
      this.notificationService.showError('Utilizador Beneficiário é obrigatório');
      return;
    }

    if (!dados.utilizadorEntregadorId) {
      this.notificationService.showError('Utilizador Entregador é obrigatório');
      return;
    }

    // Verificar se os utilizadores selecionados são diferentes
    if (dados.utilizadorBeneficiarioId === dados.utilizadorEntregadorId) {
      this.notificationService.showError('O Utilizador Beneficiário e o Utilizador Entregador não podem ser o mesmo');
      return;
    }

    if (!dados.dataAlocacao) {
      this.notificationService.showError('Data de Alocação é obrigatória');
      return;
    }

    if (dados.periodoAlocacao === null || dados.periodoAlocacao === undefined) {
      this.notificationService.showError('Período de Alocação é obrigatório');
      return;
    }

    if (this.selectedEquipamentos.length === 0) {
      this.notificationService.showError('Selecione pelo menos um equipamento');
      return;
    }

    console.log('Dados sendo enviados para o backend:', dados);
    console.log('Período de alocação (convertido):', dados.periodoAlocacao);
    console.log('Equipamentos selecionados:', this.selectedEquipamentos);

    // Mostrar indicador de carregamento
    this.notificationService.showInfo('Processando solicitação...');

    const continuarSalvar = (caminhoGuia?: string) => {
      if (caminhoGuia) {
        dados.pathGuiaRecepcao = caminhoGuia;
      } else if (dados.pathGuiaRecepcao instanceof File) {
        // Se não conseguir fazer upload, não enviar o File bruto para o backend
        delete dados.pathGuiaRecepcao;
      }

      if (this.editando && this.alocacaoSelecionadaId) {
        // Atualizar alocação existente
        this.alocacaoService.atualizar(this.alocacaoSelecionadaId, dados).subscribe({
          next: (alocacao: any) => {
            // Remover itens antigos e criar novos
            this.atualizarItensAlocacao(alocacao.id, dados.dataAlocacao);
            this.fecharModal();
            this.carregarAlocacoes();
            this.notificationService.showSuccess('Alocação atualizada com sucesso.');
          },
          error: (err: any) => {
            console.error('Erro ao atualizar alocação:', err);
            // Verificar se é erro de autenticação
            if (err.status === 401 || err.status === 403) {
              this.notificationService.showError('Sua sessão expirou. Por favor, faça login novamente.');
            } else {
              const errorMessage = this.errorHandler.handleHttpError(err);
              this.errorHandler.showError(errorMessage);
            }
          }
        });
      } else {
        // Criar nova alocação
        this.alocacaoService.criar(dados).subscribe({
          next: (alocacao: any) => {
            this.atualizarItensAlocacao(alocacao.id, dados.dataAlocacao);
            this.fecharModal();
            this.carregarAlocacoes();
            this.notificationService.showSuccess('Alocação criada com sucesso.');
          },
          error: (err: any) => {
            console.error('Erro ao criar alocação:', err);
            // Verificar se é erro de autenticação
            if (err.status === 401 || err.status === 403) {
              this.notificationService.showError('Sua sessão expirou. Por favor, faça login novamente.');
            } else {
              const errorMessage = this.errorHandler.handleHttpError(err);
              this.errorHandler.showError(errorMessage);
            }
          }
        });
      }
    };

    // Se houver arquivo local (File), fazer upload antes de salvar
    if (arquivo && arquivo instanceof File) {
      this.fileUploadService.uploadFile(arquivo, 'guias').subscribe({
        next: (res: FileUploadResponse | any) => {
          // Somente continuar quando houver resposta final com sucesso
          if (res && res.success && res.filePath) {
            continuarSalvar(res.filePath);
          } else {
            // Ignorar eventos de progresso/intermediários
            return;
          }
        },
        error: (err: any) => {
          console.error('Falha no upload da guia de recepção:', err);
          // Alterado: não bloquear o salvar se o upload falhar
          this.notificationService.showWarning('Falha no upload da Guia de Recepção. A alocação será salva sem anexar a guia.');
          continuarSalvar();
        },
        complete: () => {}
      });
    } else {
      // Se já houver caminho (string) usar diretamente; caso contrário, salvar sem guia
      if (typeof arquivo === 'string' && arquivo.trim() !== '') {
        continuarSalvar(arquivo);
      } else {
        // Alterado: permitir salvar mesmo sem anexar guia
        continuarSalvar();
      }
    }
  }

  private atualizarItensAlocacao(alocacaoId: number, dataAlocacao: string) {
    // 1. Buscar itens existentes desta alocação
    this.itemsAlocacaoService.listarPorAlocacao(alocacaoId).subscribe({
      next: (itensExistentes) => {
        // Função auxiliar para criar os novos itens
        const criarNovosItens = () => {
          const itensParaCriar = this.selectedEquipamentos.map(ns => {
            const equipamentoId = this.getEquipamentoIdPorNumeroSerie(ns);
            return {
              alocacaoId,
              equipamentoId,
              dataAlocacao
            };
          }).filter(item => item.equipamentoId !== null);

          if (itensParaCriar.length === 0) {
            // Se não houver itens para criar, apenas atualiza a lista de equipamentos
            this.carregarEquipamentos();
            return;
          }

          let criadosCount = 0;
          itensParaCriar.forEach(item => {
            this.itemsAlocacaoService.criar(item).subscribe({
              next: () => {
                criadosCount++;
                if (criadosCount === itensParaCriar.length) {
                  // Ao finalizar todas as criações, recarrega a lista de equipamentos
                  // para garantir que os recém-alocados saiam da lista de disponíveis
                  this.carregarEquipamentos();
                }
              },
              error: (err: any) => {
                console.error('Erro ao criar item de alocação:', err);
                criadosCount++;
                if (criadosCount === itensParaCriar.length) {
                   this.carregarEquipamentos();
                }
              }
            });
          });
        };

        // 2. Se houver itens existentes, removê-los primeiro
        if (itensExistentes && itensExistentes.length > 0) {
          let removidosCount = 0;
          itensExistentes.forEach((item: any) => {
            this.itemsAlocacaoService.remover(item.id).subscribe({
              next: () => {
                removidosCount++;
                if (removidosCount === itensExistentes.length) {
                  criarNovosItens();
                }
              },
              error: (err: any) => {
                console.error('Erro ao remover item antigo:', err);
                removidosCount++;
                // Continua mesmo com erro para tentar salvar o estado correto
                if (removidosCount === itensExistentes.length) {
                  criarNovosItens();
                }
              }
            });
          });
        } else {
          // Se não houver itens antigos, apenas cria os novos
          criarNovosItens();
        }
      },
      error: (err: any) => {
        console.error('Erro ao listar itens da alocação para atualização:', err);
        // Fallback: tenta criar os novos itens mesmo se falhar a listagem
        const itens = this.selectedEquipamentos.map(ns => {
            const equipamentoId = this.getEquipamentoIdPorNumeroSerie(ns);
            return { alocacaoId, equipamentoId, dataAlocacao };
        }).filter(item => item.equipamentoId !== null);
        
        itens.forEach(item => this.itemsAlocacaoService.criar(item).subscribe());
        // Tenta atualizar a lista de equipamentos após um delay
        setTimeout(() => this.carregarEquipamentos(), 1000);
      }
    });
  }

  onFileError(error: string): void {
    console.error('Erro no upload do arquivo:', error);
    this.notificationService.showError(error);
  }

  async gerarGuiaRecepcao(): Promise<void> {
    if (!this.selectedEquipamentos || this.selectedEquipamentos.length === 0) {
      this.notificationService.showWarning('Selecione pelo menos um equipamento para gerar a guia.');
      return;
    }

    const beneficiarioId = this.form.value.utilizadorBeneficiarioId;
    const entregadorId = this.form.value.utilizadorEntregadorId;
    const dataAlocacao = this.form.value.dataAlocacao;

    if (!beneficiarioId || !dataAlocacao || !entregadorId) {
      this.notificationService.showWarning('Preencha Utilizador Beneficiário, Utilizador Entregador e Data de Alocação.');
      return;
    }

    const beneficiarioNome = this.getNomeUtilizador(beneficiarioId);
    const entregadorNome = this.getNomeUtilizador(entregadorId);

    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      // Fonte: tenta Century Gothic, senão usa Helvetica
      const fontFamily = await this.ensureCenturyGothic(doc);

      // Dimensão da página
      const pageW = 210; // A4 width in mm
      const pageH = 297; // A4 height in mm

      // Carregar imagem de fundo (assets/1.png) e separar em header e footer
      const bgSlices = await this.loadBgSlicesFromAssets();
      const bgSlices2 = await this.loadSecondaryBgSlicesFromAssets();
      const headerRatio = bgSlices ? bgSlices.headerRatio : 0.23; // parte superior da imagem
      const footerRatio = bgSlices ? bgSlices.footerRatio : 0.06; // parte inferior da imagem
      const headerH = pageH * headerRatio;
      const footerH = pageH * footerRatio;

      // Função local para desenhar o fundo em cada página (usa assets/2.png a partir da segunda página)
      const drawBgPageSpecific = (d: jsPDF, pageNo?: number) => {
        const useSecond = pageNo ? pageNo >= 2 : d.getNumberOfPages() >= 2;
        const headerImg = useSecond ? (bgSlices2?.header || bgSlices?.header) : (bgSlices?.header);
        const footerImg = useSecond ? (bgSlices2?.footer || bgSlices?.footer) : (bgSlices?.footer);
        if (headerImg) {
          d.addImage(headerImg, 'PNG', 0, 0, pageW, headerH);
        }
        if (footerImg) {
          d.addImage(footerImg, 'PNG', 0, pageH - footerH, pageW, footerH);
        }
      };

      // Desenhar fundo na primeira página
      if (bgSlices) {
        drawBgPageSpecific(doc, 1);
      } else {
        this.notificationService.showWarning('Imagem de fundo (assets/1.png) não encontrada. A guia será gerada sem background.');
      }

      // Área útil de conteúdo: entre cabeçalho e rodapé
      const contentTopY = headerH + 4;
      const contentBottomY = pageH - footerH - 4;

      doc.setFontSize(12);

      // Título
      doc.setFont(fontFamily, 'bold');
      doc.text('GUIA DE RECEPÇÃO', pageW / 2, contentTopY, { align: 'center' });
      doc.setFont(fontFamily, 'normal');

      // Metadados da alocação
      let y = contentTopY + 8;
      this.drawBoldLabelValue(doc, fontFamily, 'Utilizador Beneficiário', beneficiarioNome, 15, y);
      y += 8;
      this.drawBoldLabelValue(doc, fontFamily, 'Utilizador Entregador', entregadorNome, 15, y);
      y += 8;
      doc.text(`Data de Alocação: ${this.formatarData(dataAlocacao)}`, 15, y);
      y += 12;

      // Secção 1
      doc.setFont(fontFamily, 'bold');
      doc.text('1. Identificação do Equipamento', 15, y);
      doc.setFont(fontFamily, 'normal');
      y += 8;
      doc.text('Dados do Novo Equipamento', 15, y);
      y += 6;

      // Tabela de equipamentos (Marca, Modelo, Nº de Série)
      const rows = this.selectedEquipamentos.map(ns => {
        let eq = this.equipamentos.find(e => e.numeroSerie === ns);
        
        // Se não encontrar na lista principal (que só tem disponíveis/stock), 
        // procurar no cache de edição (que tem os alocados desta alocação)
        if (!eq) {
            const cacheValues = Array.from(this.equipamentosMap.values());
            eq = cacheValues.find(e => e.numeroSerie === ns);
        }

        const modelo = eq ? this.getModeloNome(eq.modeloId) : '';
        const marca = eq ? this.getMarcaNomePorModeloId(eq.modeloId) : '';
        return [marca || '—', modelo || '—', ns];
      });

      autoTable(doc, {
        head: [[ 'Marca', 'Modelo', 'Nº de Série' ]],
        body: rows,
        startY: y + 8,
        theme: 'grid',
        styles: { fontSize: 12, font: fontFamily, cellPadding: 3 },
        headStyles: { fillColor: [241, 245, 249], textColor: 30, lineColor: [203, 213, 225], lineWidth: 0.3 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        bodyStyles: { lineColor: [203, 213, 225], lineWidth: 0.2 },
        margin: { left: 15, right: 15, top: 15, bottom: pageH - contentBottomY },
        didDrawPage: (data: any) => { drawBgPageSpecific(doc, data.pageNumber); }
      });

      const afterTableY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : y + 40; // espaçamento aumentado após tabela

      // Cláusulas de uso
      doc.setFont(fontFamily, 'bold');
      doc.text('2. Cláusulas de Uso e Aproveitamento do Material Informático', 15, afterTableY);
      doc.setFont(fontFamily, 'normal');

      const clausulas = [
        'O equipamento entregue é propriedade da instituição, devendo ser utilizado exclusivamente para fins laborais, de acordo com as normas e regulamentos internos.',
        'O utilizador obriga-se a:',
        '• Fazer uso responsável do equipamento, zelando pelo seu bom estado de conservação;',
        '• Cumprir as orientações de segurança e utilização definidas pela instituição;',
        '• Comunicar de imediato ao departamento competente qualquer anomalia ou avaria;',
        '• Não ceder, emprestar ou transferir o equipamento a terceiros sem autorização prévia.'
      ];

      let paraY = afterTableY + 8;
      const drawBgWrapper = (d: jsPDF) => drawBgPageSpecific(d, d.getNumberOfPages());
      paraY = this.writeParagraphs(doc, clausulas, paraY, 15, pageW - 30, 15, contentBottomY, drawBgWrapper);

      // Declaração e compromisso
      doc.setFont(fontFamily, 'bold');
      doc.text('3. Declaração e Compromisso do Utilizador', 15, paraY + 6);
      doc.setFont(fontFamily, 'normal');

      const declaracao = [
        'Declaro, para todos os efeitos, que:',
        '• Recebi o equipamento em perfeitas condições de funcionamento;',
        '• Li e compreendi todas as cláusulas deste guia;',
        '• Comprometo-me a cumprir integralmente o Regulamento de Gestão, Utilização e Segurança das TICs da instituição;',
        '• Assumo total responsabilidade pelo equipamento durante o período de utilização;',
        '• Estou ciente de que o não cumprimento das cláusulas estabelecidas pode resultar em processo disciplinar.'
      ];

      paraY = this.writeParagraphs(doc, declaracao, paraY + 14, 15, pageW - 30, 15, contentBottomY, drawBgWrapper);

      // Assinatura (conteúdo dentro da área útil; visto permanece estático na imagem)
      let nomeY = paraY + 10;
      if (nomeY > contentBottomY - 50) {
        doc.addPage('a4', 'portrait');
        drawBgPageSpecific(doc, doc.getNumberOfPages());
        nomeY = contentTopY + 10;
      }
      doc.setFont(fontFamily, 'bold');
      doc.text(beneficiarioNome, pageW / 2, nomeY, { align: 'center' });
      doc.setFont(fontFamily, 'normal');

      let linhaY = nomeY + 15; // distância reduzida entre nome e linha de assinatura
      if (linhaY > contentBottomY - 20) {
        doc.addPage('a4', 'portrait');
        drawBgPageSpecific(doc, doc.getNumberOfPages());
        nomeY = contentTopY + 10;
        doc.setFont(fontFamily, 'bold');
        doc.text(beneficiarioNome, pageW / 2, nomeY, { align: 'center' });
        doc.setFont(fontFamily, 'normal');
        linhaY = nomeY + 15;
      }
      doc.line(60, linhaY, 150, linhaY);
      doc.text('Assinatura do Utilizador', pageW / 2, linhaY + 8, { align: 'center' });

      // Exportar como arquivo
      const pdfBlob = doc.output('blob');
      const safeName = (beneficiarioNome || 'utilizador').replace(/\s+/g, '_');
      const fileName = `Guia_de_Recepcao_${safeName}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      try {
        const url = URL.createObjectURL(pdfBlob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) {
      }

      // Tornar o botão "Salvar" visível imediatamente após gerar a guia
      this.guiaGerada = true;

      // Antes de iniciar o upload, garantir que o formulário possua o File
      // Assim, se o utilizador clicar em "Salvar" rapidamente, o método salvar fará o upload primeiro
      this.form.patchValue({ pathGuiaRecepcao: file });

      // Upload automático da guia gerada e preenchimento do campo do formulário
      this.isUploadingGuia = true;
      this.fileUploadService.uploadFile(file, 'guias').subscribe({
        next: (res: FileUploadResponse | any) => {
          if (res && res.success && res.filePath) {
            // Guardar apenas o caminho no servidor
            this.form.patchValue({ pathGuiaRecepcao: res.filePath });
            this.notificationService.showSuccess('Guia de recepção gerada e carregada automaticamente.');
            this.isUploadingGuia = false;
          } else {
            // Caso a API não devolva o caminho, manter o File local para anexar manualmente
            this.form.patchValue({ pathGuiaRecepcao: file });
                        this.notificationService.showWarning('Guia foi gerada, mas o upload automático falhou. Pode anexar manualmente.');
          }
          this.guiaGerada = true; // mesmo com erro de upload, permitir que o usuário salve
        },
        error: (err: any) => {
          console.error('Falha no upload automático da guia de recepção:', err);
          // Manter o File no formulário para anexar manualmente, evitando perda do ficheiro
          this.form.patchValue({ pathGuiaRecepcao: file });

          // Mensagens mais detalhadas por tipo de erro
          if (err?.status === 401 || err?.status === 403) {
            this.notificationService.showError('Sua sessão expirou ou não possui permissão. Faça login novamente para enviar a guia.');
          } else if (err?.status === 0) {
            this.notificationService.showError('Não foi possível conectar ao servidor. Verifique se o backend está em execução em http://localhost:8080.');
          } else if (err?.status === 413) {
            this.notificationService.showError('Arquivo muito grande para o servidor. Reduza o tamanho e tente novamente.');
          } else if (err?.status === 415) {
            this.notificationService.showError('Tipo de conteúdo não suportado pelo servidor.');
          } else {
            const backendMsg = err?.error?.error || err?.message || 'Erro desconhecido no upload.';
            this.notificationService.showError(`Erro ao enviar a Guia: ${backendMsg}`);
          }

          this.guiaGerada = true; // mesmo com erro de upload, permitir que o usuário salve
          this.isUploadingGuia = false;
        },
        complete: () => {}
      });
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      this.notificationService.showError('Falha ao gerar a Guia em PDF.');
    }
  }

  private async loadImageDataURL(url: string): Promise<{ dataUrl: string; mimeType: string }> {
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        return { dataUrl: '', mimeType: '' };
      }
      const blob = await resp.blob();
      const mimeType = blob.type || '';
      return await new Promise<{ dataUrl: string; mimeType: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ dataUrl: reader.result as string, mimeType });
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('Erro ao carregar imagem', e);
      return { dataUrl: '', mimeType: '' };
    }
  }

  // Novo: carregar metadados (largura/altura em pixels) da imagem sem alterar tamanho
  private async loadImageMeta(url: string): Promise<{ dataUrl: string; widthPx: number; heightPx: number; mimeType: string; }> {
    const res = await this.loadImageDataURL(url);
    if (!res.dataUrl) return { dataUrl: '', widthPx: 0, heightPx: 0, mimeType: '' };
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ dataUrl: res.dataUrl, widthPx: img.naturalWidth, heightPx: img.naturalHeight, mimeType: res.mimeType });
      img.src = res.dataUrl;
    });
  }

  // Tenta resolver o caminho do template de cabeçalho dentro de assets/DAC, aceitando nomes/extensões comuns
  private async resolveHeaderImage(): Promise<{ dataUrl: string; widthPx: number; heightPx: number; mimeType: string; } | null> {
    const candidates = [
      'assets/DAC.jpg',
      'assets/DAC.jpeg',
      'assets/DAC.png',
      'assets/DAC/header.png',
      'assets/DAC/cabecalho.png',
      'assets/DAC/guia-header.png',
      'assets/DAC/guia_recepcao_header.png',
      'assets/DAC/header.jpg',
      'assets/DAC/cabecalho.jpg',
      'assets/DAC/header.jpeg',
      'assets/DAC/cabecalho.jpeg',
      'assets/DAC/DAC.jpg',
      'assets/DAC/DAC.jpeg'
    ];

    for (const url of candidates) {
      try {
        const resp = await fetch(url, { method: 'GET' });
        if (resp.ok) {
          // Use loadImageMeta para manter tamanho natural
          return await this.loadImageMeta(url);
        }
      } catch (_) {
        // tenta próxima opção
      }
    }
    return null;
  }

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
    try {
      const fontResp = await fetch('assets/CenturyGothic.ttf');
      if (fontResp.ok) {
        const buf = await fontResp.arrayBuffer();
        const b64 = this.arrayBufferToBase64(buf);
        doc.addFileToVFS('CenturyGothic.ttf', b64);
        doc.addFont('CenturyGothic.ttf', 'CenturyGothic', 'normal');
        doc.setFont('CenturyGothic', 'normal');
        doc.setFontSize(12);
        return 'CenturyGothic';
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        return 'helvetica';
      }
    } catch {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      return 'helvetica';
    }
  }

  private writeParagraphs(
    doc: jsPDF,
    lines: string[],
    startY: number,
    x: number,
    maxWidth: number,
    contentTopY?: number,
    contentBottomY?: number,
    drawBg?: (d: jsPDF) => void
  ): number {
    let y = startY;
    const lineSpacing = 8; // espaçamento vertical consistente
    for (const line of lines) {
      const split = doc.splitTextToSize(line, maxWidth);
      for (const l of split) {
        if (contentBottomY && y > contentBottomY - lineSpacing) {
          doc.addPage('a4', 'portrait');
          if (drawBg) drawBg(doc);
          y = (contentTopY || 15) + 2;
        }
        doc.text(l, x, y);
        y += lineSpacing;
      }
    }
    return y;
  }
  private formatarData(value: any): string {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) {
        return value ? String(value) : '';
      }
      return d.toLocaleDateString('pt-PT');
    } catch {
      return value ? String(value) : '';
    }
  }
  // Métodos para dropdown customizado de equipamentos
  toggleDropdownEquipamento(): void {
    this.dropdownEquipamentoAberto = !this.dropdownEquipamentoAberto;
  }

  selecionarEquipamento(equipamento: any): void {
    if (equipamento) {
      if (!this.selectedEquipamentos.includes(equipamento.numeroSerie)) {
        this.selectedEquipamentos.push(equipamento.numeroSerie);
      }
    }
    this.dropdownEquipamentoAberto = false;
  }

  getEquipamentosSelecionados(): string {
    if (this.selectedEquipamentos.length === 0) {
      return 'Selecione os Equipamentos';
    }
    if (this.selectedEquipamentos.length === 1) {
      return this.selectedEquipamentos[0];
    }
    return `${this.selectedEquipamentos.length} equipamentos selecionados`;
  }

  removerEquipamentoSelecionado(numeroSerie: string): void {
    this.selectedEquipamentos = this.selectedEquipamentos.filter(ns => ns !== numeroSerie);
  }

  // Sugestões de Equipamentos (typeahead)
  filtrarEquipamentosSugestao() {
    const termo = (this.equipamentoBusca || '').toLowerCase();
    if (!termo) {
      this.equipamentosFiltradosSugestao = [];
      return;
    }
    this.equipamentosFiltradosSugestao = (this.equipamentosDisponiveis || []).filter(eq => {
      const ns = (eq.numeroSerie || '').toLowerCase();
      const modeloNome = (this.getModeloNome(eq.modeloId) || '').toLowerCase();
      return ns.includes(termo) || modeloNome.includes(termo);
    }).slice(0, 8);
  }

  selecionarEquipamentoSugestao(eq: any) {
    if (!eq) return;
    const ns = eq.numeroSerie;
    if (ns && !this.selectedEquipamentos.includes(ns)) {
      this.selectedEquipamentos.push(ns);
    }
    // limpar input e fechar sugestões
    this.equipamentoBusca = '';
    this.equipamentosFiltradosSugestao = [];
  }

  // Método para fechar dropdown ao clicar fora
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    // Fechar dropdown de equipamentos (tipoahead) se clicar fora da área de busca ou da lista
    const insideEquip = !!target.closest('.equipamento-search') || !!target.closest('.equipamentos-dropdown');
    if (!insideEquip) {
      this.equipamentosFiltradosSugestao = [];
      this.dropdownEquipamentoAberto = false;
    }
    // Fechar dropdown de período se clicar fora
    const insidePeriodo = !!target.closest('.periodo-search') || !!target.closest('.periodos-dropdown');
    if (!insidePeriodo) {
      this.periodosFiltrados = [];
    }
    // Fechar subtabelas se clicar fora da área da subtabela
    const insideSubTable = !!target.closest('.sub-wrapper');
    if (!insideSubTable) {
      this.expandedGrupos.clear();
    }
  }

  // Estado de expansão por utilizador (para ver alocações do grupo)
  expandedGrupos: Set<number> = new Set<number>();

  // Agrupa alocações por utilizador beneficiário após aplicar filtros atuais
  getGruposAlocacoesFiltrados() {
    const filtradas = this.getAlocacoesFiltradas();
    const mapa = new Map<number, { utilizadorId: number; nomeUtilizador: string; alocacoes: any[] }>();
  
    filtradas.forEach(aloc => {
      const uid = aloc.utilizadorBeneficiarioId;
      if (!mapa.has(uid)) {
        mapa.set(uid, {
          utilizadorId: uid,
          nomeUtilizador: this.getNomeUtilizador(uid),
          alocacoes: []
        });
      }
      mapa.get(uid)!.alocacoes.push(aloc);
    });
  
    return Array.from(mapa.values());
  }
  
  // TrackBy para reduzir re-renderizações do Angular durante a navegação
  grupoTrackBy(index: number, grupo: {utilizadorId: number}): number {
    return grupo.utilizadorId;
  }
  // Alterna expansão de um grupo de utilizador
  toggleExpandGrupo(utilizadorId: number) {
    if (this.expandedGrupos.has(utilizadorId)) {
      this.expandedGrupos.delete(utilizadorId);
    } else {
      this.expandedGrupos.add(utilizadorId);
      // Ao expandir, carregar itens das alocações deste utilizador (lazy)
      const grupo = this.getGruposAlocacoesFiltrados().find(g => g.utilizadorId === utilizadorId);
      if (grupo) {
        grupo.alocacoes.forEach(aloc => this.carregarItensAlocacaoSeNecessario(aloc.id));
      }
    }
  }

  // Adicionado: carregar itens da alocação e detalhes de equipamentos para montar "Modelo (Tipo)"
  private carregarItensAlocacaoSeNecessario(alocacaoId: number): void {
    if (this.itensPorAlocacao[alocacaoId]) {
      return; // já carregado
    }
    this.itemsAlocacaoService.listarPorAlocacao(alocacaoId).subscribe({
      next: (itens: any[]) => {
        this.itensPorAlocacao[alocacaoId] = itens || [];
        // Garantir que detalhes de equipamentos estejam em cache
        (itens || []).forEach(item => {
          const equipamentoId = item?.equipamentoId || item?.equipamento?.id;
          if (equipamentoId && !this.equipamentosMap.has(equipamentoId)) {
            this.equipamentoService.buscarPorId(equipamentoId).subscribe({
              next: (eq: any) => this.equipamentosMap.set(equipamentoId, eq),
              error: (erro: any) => {
                console.error('Erro ao buscar equipamento:', erro);
                const errorMessage = this.errorHandler.handleHttpError(erro);
                this.errorHandler.showError(errorMessage);
              }
            });
          }
        });
      },
      error: (erro: any) => {
        console.error('Erro ao listar itens da alocação:', erro);
        const errorMessage = this.errorHandler.handleHttpError(erro);
        this.errorHandler.showError(errorMessage);
      }
    });
  }

  // Adicionado: helpers para obter nome do modelo e do tipo por equipamento
  private getModeloNomePorEquipamentoId(equipamentoId: number): string {
    const eq = this.equipamentosMap.get(equipamentoId);
    if (!eq) return '';
    const modelo = this.modelos.find(m => m.id === eq?.modeloId);
    return modelo ? modelo.nome : '';
  }

  private getTipoNomePorEquipamentoId(equipamentoId: number): string {
    const eq = this.equipamentosMap.get(equipamentoId);
    if (!eq) return '';
    const tipoId = eq?.tipoEquipamentoId ?? eq?.tipoId;
    const tipo = this.tipos.find(t => t.id === tipoId);
    return tipo ? tipo.nome : '';
  }

  // Novo: obter o nome da Marca a partir do equipamento
  private getMarcaNomePorEquipamentoId(equipamentoId: number): string {
    const eq = this.equipamentosMap.get(equipamentoId);
    if (!eq) return '';
    const modelo = this.modelos.find(m => m.id === eq?.modeloId);
    if (!modelo) return '';
    const marca = this.marcas.find(mc => mc.id === modelo.marcaId);
    return marca ? marca.nome : '';
  }

  // Novo helper: obter nome da marca a partir do modelo
  getMarcaNomePorModeloId(modeloId: number): string {
    if (!modeloId) return '';
    const modelo = this.modelos.find(m => m.id === modeloId);
    if (!modelo) return '';
    const marca = this.marcas.find(m => m.id === modelo.marcaId);
    return marca?.nome || '';
  }

  // Adicionado: texto agregado "Modelo (Tipo)" para a alocação
  getModelosTiposDaAlocacao(alocacaoId: number): string {
    const itens = this.itensPorAlocacao[alocacaoId];
    if (!itens) {
      // dispara carregamento e mostra placeholder
      this.carregarItensAlocacaoSeNecessario(alocacaoId);
      return 'A carregar...';
    }
    const labels = (itens || []).map(item => {
      const equipamentoId = item?.equipamentoId || item?.equipamento?.id;
      if (!equipamentoId) return '—';
      const mNome = this.getModeloNomePorEquipamentoId(equipamentoId);
      const tNome = this.getTipoNomePorEquipamentoId(equipamentoId);
      if (mNome && tNome) return `${mNome} (${tNome})`;
      if (mNome) return mNome;
      return '—';
    });
    const unique = Array.from(new Set(labels.filter(Boolean)));
    return unique.join(', ');
  }

  // Novo: agrega marcas dos itens da alocação
  getMarcasDaAlocacao(alocacaoId: number): string {
    const itens = this.itensPorAlocacao[alocacaoId];
    if (!itens) {
      this.carregarItensAlocacaoSeNecessario(alocacaoId);
      return 'A carregar...';
    }
    const marcas = (itens || []).map(item => {
      const equipamentoId = item?.equipamentoId || item?.equipamento?.id;
      if (!equipamentoId) return '—';
      return this.getMarcaNomePorEquipamentoId(equipamentoId) || '—';
    });
    const unique = Array.from(new Set(marcas.filter(m => m && m !== '—')));
    return unique.length ? unique.join(', ') : '—';
  }

  // TrackBy para linhas de alocações dentro da subtabela
  alocTrackBy(index: number, aloc: any): number {
    return aloc.id;
  }

  // Função de busca para ng-select (utilizadores)
  utilizadorSearchFn = (term: string, item: any) => {
    const t = (term || '').toLowerCase();
    const nome = (item?.nome || '').toLowerCase();
    return nome.includes(t);
  };

  // Filtro typeahead para Período de Alocação
  filtrarPeriodos() {
    const termo = (this.periodoBusca || '').toLowerCase();
    this.periodosFiltrados = this.periodos.filter(p => p.toLowerCase().includes(termo));
  }

  selecionarPeriodo(p: string) {
    this.form.get('periodoAlocacao')?.setValue(p);
    this.periodoBusca = p;
    this.periodosFiltrados = [];
  }
  private async loadBgSlicesFromAssets(): Promise<{ header: string; footer: string; headerRatio: number; footerRatio: number } | null> {
    try {
      const resp = await fetch('assets/1.png');
      if (!resp.ok) return null;
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
      });
      const headerRatio = 0.23; // proporção do cabeçalho
      const footerRatio = 0.06; // proporção do rodapé
      const { header, footer } = this.cropImage(img, headerRatio, footerRatio);
      return { header, footer, headerRatio, footerRatio };
    } catch {
      return null;
    }
  }
  private async loadSecondaryBgSlicesFromAssets(): Promise<{ header: string; footer: string; headerRatio: number; footerRatio: number } | null> {
    try {
      const resp = await fetch('assets/2.png');
      if (!resp.ok) return null;
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
      });
      const headerRatio = 0.23;
      const footerRatio = 0.06;
      const { header, footer } = this.cropImage(img, headerRatio, footerRatio);
      return { header, footer, headerRatio, footerRatio };
    } catch {
      return null;
    }
  }
  private drawBoldLabelValue(doc: jsPDF, fontFamily: string, label: string, value: string, x: number, y: number) {
    const labelText = `${label}:`;
    doc.setFont(fontFamily, 'bold');
    doc.text(labelText, x, y);
    const labelWidth = doc.getTextWidth(labelText);
    doc.setFont(fontFamily, 'normal');
    doc.text(`${value}`, x + labelWidth + 2, y);
  }
  private cropImage(img: HTMLImageElement, headerRatio: number, footerRatio: number): { header: string; footer: string } {
    const w = img.width;
    const h = img.height;
    const headerH = Math.floor(h * headerRatio);
    const footerH = Math.floor(h * footerRatio);

    const canvasHeader = document.createElement('canvas');
    canvasHeader.width = w;
    canvasHeader.height = headerH;
    const ctxH = canvasHeader.getContext('2d')!;
    ctxH.drawImage(img, 0, 0, w, headerH, 0, 0, w, headerH);

    const canvasFooter = document.createElement('canvas');
    canvasFooter.width = w;
    canvasFooter.height = footerH;
    const ctxF = canvasFooter.getContext('2d')!;
    ctxF.drawImage(img, 0, h - footerH, w, footerH, 0, 0, w, footerH);

    return { header: canvasHeader.toDataURL('image/png'), footer: canvasFooter.toDataURL('image/png') };
  }

  // Constrói URL absoluto para arquivos retornados pelo backend
  toFileUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${environment.apiUrl}${p}`;
  }
}