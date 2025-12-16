import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { AlocacaoService } from '../../../services/alocacoes.service';
import { ItemsAlocacaoService } from '../../../services/item-alocacao.service';
import { EquipamentoService } from '../../../services/equipamento.service';
import { UtilizadorService } from '../../../services/utilizador.service';
import { MarcaService } from '../../../services/marca.service';
import { ModalService } from '../../../services/modal.service';
import { Location } from '@angular/common';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-detalhes-alocacao',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, NgSelectModule],
  templateUrl: './detalhes-alocacao.component.html',
  styleUrls: ['./detalhes-alocacao.component.scss']
})
export class DetalhesAlocacaoComponent implements OnInit, OnDestroy {
  alocacaoId: number = 0;
  alocacao: any;
  itensAlocacao: any[] = [];
  historicoEquipamentos: { [equipamentoId: number]: any[] } = {};
  utilizadores: any[] = [];
  equipamentosMap = new Map<number, any>();
  marcas: any[] = [];

  // Contador para próxima alocação (5 anos após data de alocação)
  counterText: string = '';
  counterTextCompact: string = '';
  counterReady: boolean = false;
  progressPercent: number = 0;
  private counterTimer: any;

  // Novo equipamento (modal)
  showModalEquipamento = false;
  form: FormGroup;
  modelos: any[] = [];
  tipos: any[] = [];
  aquisicoes: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private alocacaoService: AlocacaoService,
    private itemsAlocacaoService: ItemsAlocacaoService,
    private equipamentoService: EquipamentoService,
    private utilizadorService: UtilizadorService,
    private modalService: ModalService,
    private marcaService: MarcaService,
    private fb: FormBuilder,
    private location: Location
  ) {
    this.form = this.fb.group({
      modelo_id: [null, Validators.required],
      tipoEquipamento_id: [null, Validators.required],
      aquisicao_id: [null, Validators.required],
      numeroSerie: ['', Validators.required],
      dataRegisto: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.alocacaoId = +params['id'];
      this.carregarAlocacao();
      this.carregarUtilizadores();
      this.carregarModelos();
      this.carregarTiposEquipamento();
      this.carregarAquisicoes();
      this.carregarMarcas();
    });
  }

  ngOnDestroy(): void {
    if (this.counterTimer) {
      clearInterval(this.counterTimer);
    }
  }

  carregarAlocacao() {
    this.alocacaoService.buscarPorId(this.alocacaoId).subscribe({
      next: (dados) => {
        this.alocacao = dados;
        this.carregarItensAlocacao();
        // Inicializar contador de 5 anos
        this.iniciarContadorNovaAlocacao();
      },
      error: (err) => console.error('Erro ao buscar alocação:', err)
    });
  }

  carregarItensAlocacao() {
    this.itemsAlocacaoService.listarPorAlocacao(this.alocacaoId).subscribe({
      next: (itens) => {
        this.itensAlocacao = itens;
        
        // Primeiro, carregar todos os modelos disponíveis
        this.equipamentoService.listarModelos().subscribe({
          next: (modelos) => {
            // Carregar todos os tipos de equipamento
            this.equipamentoService.listarTipos().subscribe({
              next: (tipos) => {
                // Depois de carregar os modelos e tipos, carregar cada equipamento
                itens.forEach(item => {
                  this.equipamentoService.buscarPorId(item.equipamentoId).subscribe({
                    next: equipamento => {
                      // Se o equipamento tem modeloId, encontrar o modelo correspondente
                      if (equipamento.modeloId) {
                        const modelo = modelos.find(m => m.id === equipamento.modeloId);
                        if (modelo) {
                          equipamento.modelo = modelo;
                        }
                      }
                      
                      // Se o equipamento tem tipoEquipamentoId, encontrar o tipo correspondente
                      if (equipamento.tipoEquipamentoId) {
                        const tipo = tipos.find(t => t.id === equipamento.tipoEquipamentoId);
                        if (tipo) {
                          equipamento.tipoEquipamento = tipo;
                        }
                      }
                      
                      this.equipamentosMap.set(item.equipamentoId, equipamento);
                    },
                    error: err => console.error('Erro ao carregar equipamento', err)
                  });
                });
              },
              error: err => console.error('Erro ao carregar tipos de equipamento', err)
            });
          },
          error: err => console.error('Erro ao carregar modelos', err)
        });
      },
      error: (err) => console.error('Erro ao buscar itens da alocação:', err)
    });
  }

  carregarUtilizadores() {
    this.utilizadorService.listar().subscribe({
      next: (dados) => this.utilizadores = dados,
      error: (err) => console.error('Erro ao carregar utilizadores:', err)
    });
  }

  carregarModelos() {
    this.equipamentoService.listarModelos().subscribe({
      next: (dados) => this.modelos = dados,
      error: (err) => console.error('Erro ao carregar modelos:', err)
    });
  }

  carregarTiposEquipamento() {
    this.equipamentoService.listarTipos().subscribe({
      next: (dados) => this.tipos = dados,
      error: (err) => console.error('Erro ao carregar tipos de equipamento:', err)
    });
  }

  carregarAquisicoes() {
    this.equipamentoService.listarAquisicoes().subscribe({
      next: (dados) => this.aquisicoes = dados,
      error: (err) => console.error('Erro ao carregar aquisições:', err)
    });
  }

  carregarMarcas() {
    this.marcaService.listar().subscribe({
      next: (dados) => this.marcas = dados || [],
      error: (err) => { console.error('Erro ao carregar marcas:', err); this.marcas = []; }
    });
  }

  abrirModalEquipamento() {
    this.showModalEquipamento = true;
    this.form.reset();
    this.modalService.openModal();
  }

  fecharModalEquipamento() {
    this.showModalEquipamento = false;
    this.form.reset();
    this.modalService.closeModal();
  }

  salvarEquipamento() {
    if (this.form.invalid) return;

    const dados = {
      modeloId: this.form.value.modelo_id,
      tipoEquipamentoId: this.form.value.tipoEquipamento_id,
      aquisicaoId: this.form.value.aquisicao_id,
      numeroSerie: this.form.value.numeroSerie,
      dataRegisto: this.form.value.dataRegisto
    };

    this.equipamentoService.criarEquipamento(dados).subscribe({
      next: (novoEquipamento) => {
        // Opcional: poderíamos atualizar alguma lista local se necessário
        this.fecharModalEquipamento();
      },
      error: (err) => {
        console.error('Erro ao criar equipamento:', err);
        alert('Erro ao salvar equipamento');
      }
    });
  }

  getNomeUtilizador(id: number): string {
    const u = this.utilizadores.find(u => u.id === id);
    return u ? u.nome : `ID ${id}`;
  }

  getDescricaoEquipamento(id: number): string {
    const eq = this.equipamentosMap.get(id);
    if (!eq) return 'Carregando...';
    
    // Se temos o equipamento mas não temos o modelo completo ou tipo, apenas os IDs
    if (eq && ((eq.modeloId && !eq.modelo) || (eq.tipoEquipamentoId && !eq.tipoEquipamento))) {
      // Buscar o modelo e tipo pelo ID
      if (eq.modeloId && !eq.modelo) {
        this.equipamentoService.listarModelos().subscribe({
          next: (modelos) => {
            const modelo = modelos.find(m => m.id === eq.modeloId);
            if (modelo) {
              // Atualizar o equipamento com o modelo completo
              eq.modelo = modelo;
              // Forçar atualização da view
              this.equipamentosMap.set(id, {...eq});
            }
          },
          error: (err) => console.error('Erro ao buscar modelos:', err)
        });
      }
      
      if (eq.tipoEquipamentoId && !eq.tipoEquipamento) {
        this.equipamentoService.listarTipos().subscribe({
          next: (tipos) => {
            const tipo = tipos.find(t => t.id === eq.tipoEquipamentoId);
            if (tipo) {
              // Atualizar o equipamento com o tipo completo
              eq.tipoEquipamento = tipo;
              // Forçar atualização da view
              this.equipamentosMap.set(id, {...eq});
            }
          },
          error: (err) => console.error('Erro ao buscar tipos:', err)
        });
      }
      
      return `${eq.numeroSerie} - Carregando detalhes...`;
    }
    
    const modeloNome = eq.modelo?.nome || 'Modelo Desconhecido';
    const tipoNome = eq.tipoEquipamento?.nome || 'Tipo Desconhecido';
    const marcaNome = this.getMarcaNomePorModeloId(eq?.modeloId);
    return eq ? `${eq.numeroSerie} - ${modeloNome} (${tipoNome})` : 'Carregando...';
  }

  // Helpers para obter objetos e nomes exibidos na tabela de itens
  getEquipamentoObj(equipamentoId: number): any {
    return this.equipamentosMap.get(equipamentoId);
  }

  getMarcaNomePorModeloId(modeloId: number): string {
    if (!modeloId) return '';
    const modelo = this.modelos.find(m => m.id === modeloId);
    if (!modelo) return '';
    const marcaId = (modelo as any).marcaId ?? (modelo as any).marca_id ?? (modelo as any).marca;
    const marca = this.marcas.find(mc => mc.id === marcaId);
    return marca ? (marca.nome ?? marca.designacao ?? marca.name ?? '') : '';
  }

  // Contador para próxima alocação (5 anos)
  private iniciarContadorNovaAlocacao() {
    const dataAlocacaoStr: string | undefined = this.alocacao?.dataAlocacao;
    if (!dataAlocacaoStr) { this.counterText = '—'; this.counterReady = false; this.progressPercent = 0; return; }
    const dataAlocacao = new Date(dataAlocacaoStr);
    // Próxima alocação em 5 anos
    const proxima = new Date(dataAlocacao);
    proxima.setFullYear(proxima.getFullYear() + 5);

    const update = () => {
      const agora = new Date();
      const diffMs = proxima.getTime() - agora.getTime();
      const totalMs = proxima.getTime() - dataAlocacao.getTime();
      const elapsedMs = Math.max(0, agora.getTime() - dataAlocacao.getTime());
      if (diffMs <= 0) {
        this.counterReady = true;
        this.counterText = 'Pronto para nova alocação!';
        this.counterTextCompact = 'Pronto';
        this.progressPercent = 100;
        return;
      }
      this.counterReady = false;
      this.counterText = `Faltam ${this.formatarDuracao(diffMs)} para a nova Alocação`;
      this.counterTextCompact = `${this.formatarDuracaoCompacta(diffMs)}`;
      const percent = Math.floor((elapsedMs / totalMs) * 100);
      this.progressPercent = Math.max(0, Math.min(100, percent));
    };

    // Atualiza imediatamente e a cada segundo
    update();
    if (this.counterTimer) clearInterval(this.counterTimer);
    this.counterTimer = setInterval(update, 1000);
  }

  private formatarDuracao(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const sec = totalSec % 60;
    const totalMin = Math.floor(totalSec / 60);
    const min = totalMin % 60;
    const totalHoras = Math.floor(totalMin / 60);
    const horas = totalHoras % 24;
    const totalDias = Math.floor(totalHoras / 24);

    // Aproxima mês como 30 dias e ano como 365 dias (suficiente para o contador informativo)
    const anos = Math.floor(totalDias / 365);
    const diasRestAnos = totalDias % 365;
    const meses = Math.floor(diasRestAnos / 30);
    const dias = diasRestAnos % 30;

    const partes: string[] = [];
    if (anos) partes.push(`${anos} ano${anos > 1 ? 's' : ''}`);
    if (meses) partes.push(`${meses} mês${meses > 1 ? 'es' : ''}`);
    if (dias) partes.push(`${dias} dia${dias > 1 ? 's' : ''}`);
    // Para períodos curtos, também exibir horas/min/seg
    if (!anos && !meses && !dias) {
      if (horas) partes.push(`${horas}h`);
      if (min) partes.push(`${min}m`);
      partes.push(`${sec}s`);
    }
    return partes.join(', ');
  }

  // Formato compacto: "4a 9m 18d" ou "2h 15m 03s" para períodos curtos
  private formatarDuracaoCompacta(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const sec = totalSec % 60;
    const totalMin = Math.floor(totalSec / 60);
    const min = totalMin % 60;
    const totalHoras = Math.floor(totalMin / 60);
    const horas = totalHoras % 24;
    const totalDias = Math.floor(totalHoras / 24);

    const anos = Math.floor(totalDias / 365);
    const diasRestAnos = totalDias % 365;
    const meses = Math.floor(diasRestAnos / 30);
    const dias = diasRestAnos % 30;

    if (anos || meses || dias) {
      const partes: string[] = [];
      if (anos) partes.push(`${anos}a`);
      if (meses) partes.push(`${meses}m`);
      if (dias) partes.push(`${dias}d`);
      return partes.join(' ');
    }
    // Curto: horas/min/seg
    const h = horas ? `${horas}h` : '';
    const m = min ? `${min}m` : '';
    const s = `${sec}s`;
    return [h, m, s].filter(Boolean).join(' ');
  }

  voltar() {
    this.location.back();
  }

  public toFileUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${environment.apiUrl}${p}`;
  }
}
