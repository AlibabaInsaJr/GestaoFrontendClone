import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReparacaoService } from '../../../services/reparacao.service';
import { ItemsReparacaoService } from '../../../services/item-reparacao.service';
import { EquipamentoService } from '../../../services/equipamento.service';
import { EmpresaService } from '../../../services/empresa.service';  // Adicionando o serviço de empresas
import { Location } from '@angular/common';
import { UtilizadorService } from '../../../services/utilizador.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-detalhes-reparacao',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './detalhes-reparacao.component.html',
  styleUrls: ['./detalhes-reparacao.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class DetalhesReparacaoComponent implements OnInit {
  reparacaoId: number = 0;
  reparacao: any;
  empresas: any[] = [];
  itensReparacao: any[] = [];
  historicoEquipamentos: Record<number, any[]> = {};
  equipamentosMap = new Map<number, any>();
  equipamentosDevolvidos = new Set<number>(); // Track devolvidos
  tecnicos: any[] = [];
  modelosMap = new Map<number, any>();

  // Cronómetro
  countdownText: string = '';
  countdownPassed: boolean = false;
  private countdownInterval: any;

  showExtendDatePicker: boolean = false;
  novaDataPrevista: string = '';
  anotacoesPrazo: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private reparacaoService: ReparacaoService,
    private itemsReparacaoService: ItemsReparacaoService,
    private equipamentoService: EquipamentoService,
    private empresaService: EmpresaService, // Injetando o serviço de empresas
    private location: Location,
    private utilizadorService: UtilizadorService
  ) {}

  ngOnInit(): void {
    this.reparacaoId = +this.route.snapshot.paramMap.get('id')!;
    this.carregarReparacao();
    this.carregarEmpresas(); // Carregar as empresas
    this.carregarItensReparacao(); // Carregar itens da reparação
    this.carregarTecnicos(); // Carregar lista de técnicos para exibir nome
    // Carregar modelos para mapear nomes e evitar "Modelo Desconhecido"
    this.equipamentoService.listarModelos().subscribe({
      next: (modelos) => {
        (modelos || []).forEach((m: any) => this.modelosMap.set(m.id, m));
      },
      error: (err) => console.error('Erro ao carregar modelos:', err)
    });
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  carregarReparacao() {
    this.reparacaoService.buscarPorId(this.reparacaoId).subscribe({
      next: dados => {
        this.reparacao = dados;
        this.carregarAnotacoesPrazo();
        // Iniciar cronómetro se houver Resumo (avaria) e Data Prevista Devolução e não estiver devolvido
        if (this.reparacao?.avaria && this.reparacao?.dataPrevistaDevolucao && !this.reparacao?.dataDevolucao) {
          this.iniciarCountdown(this.reparacao.dataPrevistaDevolucao);
        } else {
          this.countdownText = '';
        }
        // Recarregar itens após carregar a reparação para verificar estados
        this.verificarEquipamentosDevolvidos();
      },
      error: err => console.error('Erro ao buscar reparação:', err)
    });
  }

  private iniciarCountdown(dataPrevista: string | Date) {
    const alvo = new Date(dataPrevista).getTime();
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    const atualizar = () => {
      const agora = Date.now();
      let diff = alvo - agora; // positivo: falta, negativo: passou
      const passou = diff <= 0;
      this.countdownPassed = passou;

      const abs = Math.abs(diff);
      const { dias, horas, minutos, segundos } = this.formatDuration(abs);
      const dataPrevistaFmt = this.formatDatePT(alvo);

      if (!passou) {
        this.countdownText = `Faltam ${dias} dias, ${horas}h ${minutos}m ${segundos}s (Devolução prevista: ${dataPrevistaFmt})`;
      } else {
        this.countdownText = `Prazo ultrapassado há ${dias} dias, ${horas}h ${minutos}m ${segundos}s (Devolução prevista: ${dataPrevistaFmt})`;
      }
    };

    atualizar();
    this.countdownInterval = setInterval(atualizar, 1000);
  }

  private formatDuration(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const dias = Math.floor(totalSeconds / 86400);
    const horas = Math.floor((totalSeconds % 86400) / 3600);
    const minutos = Math.floor((totalSeconds % 3600) / 60);
    const segundos = totalSeconds % 60;
    return { dias, horas, minutos, segundos };
  }

  private formatDatePT(epochMs: number): string {
    return new Date(epochMs).toLocaleDateString('pt-PT');
  }

  private verificarEquipamentosDevolvidos() {
    // Verificar equipamentos que já foram devolvidos baseado apenas no estado
    this.equipamentosMap.forEach((equipamento, equipamentoId) => {
      // Se o equipamento está em STOCK_BOM, foi devolvido
      if (equipamento.estado === 'STOCK_BOM') {
        this.equipamentosDevolvidos.add(equipamentoId);
        console.log(`Equipamento ${equipamentoId} detectado como devolvido (estado: ${equipamento.estado})`);
      }
    });
  }

  carregarEmpresas() {
    this.empresaService.listar().subscribe({
      next: dados => this.empresas = dados,
      error: err => console.error('Erro ao buscar empresas:', err)
    });
  }

  carregarItensReparacao() {
    this.itemsReparacaoService.listarPorReparacao(this.reparacaoId).subscribe({
      next: (itens) => {
        this.itensReparacao = itens;
        let equipamentosCarregados = 0;
        const totalEquipamentos = itens.length;
        
        itens.forEach(item => {
          this.equipamentoService.buscarPorId(item.equipamentoId).subscribe({
            next: equipamento => {
              this.equipamentosMap.set(item.equipamentoId, equipamento);
              equipamentosCarregados++;
              
              // Verificar estados após todos os equipamentos serem carregados
              if (equipamentosCarregados === totalEquipamentos) {
                this.verificarEquipamentosDevolvidos();
              }
            },
            error: err => {
              console.error('Erro ao carregar equipamento', err);
              equipamentosCarregados++;
              if (equipamentosCarregados === totalEquipamentos) {
                this.verificarEquipamentosDevolvidos();
              }
            }
          });

          // Removido: carregamento de histórico detalhado por equipamento
          // A informação necessária já está disponível no Resumo da Reparação
          // this.equipamentoService.buscarHistorico(item.equipamentoId).subscribe({
          //   next: (historico) => this.historicoEquipamentos[item.equipamentoId] = historico,
          //   error: () => this.historicoEquipamentos[item.equipamentoId] = []
          // });
        });
      },
      error: err => console.error('Erro ao buscar itens da reparação:', err)
    });
  }

  getDescricaoEquipamento(id: number): string {
    const eq = this.equipamentosMap.get(id);
    if (!eq) return 'Carregando...';
    const modelo = eq.modelo || this.modelosMap.get(eq.modeloId);
    const modeloNome = modelo?.nome || '---';
    return `${eq.numeroSerie} - ${modeloNome || 'Modelo Desconhecido'}`;
  }

  getEmpresaNome(id: number): string {
    const empresa = this.empresas.find(e => e.id === id);
    return empresa ? empresa.designacao : 'Empresa Desconhecida';  // Retorna o nome da empresa
  }

  marcarComoDevolvido(equipamentoId: number) {
    if (confirm('Tem certeza que deseja marcar este equipamento como devolvido?')) {
      // Atualizar estado do equipamento para STOCK_BOM
      this.equipamentoService.atualizarEstado(equipamentoId, 'STOCK_BOM').subscribe({
        next: () => {
          // Marcar como devolvido localmente
          this.equipamentosDevolvidos.add(equipamentoId);
          
          // Atualizar data de devolução na reparação (usar data local YYYY-MM-DD)
          const now = new Date();
          const yyyy = now.getFullYear();
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          const dataAtual = `${yyyy}-${mm}-${dd}`;
          this.atualizarDataDevolucao(dataAtual);
          
          console.log('Equipamento marcado como devolvido com sucesso');
        },
        error: (err) => {
          console.error('Erro ao marcar equipamento como devolvido:', err);
          alert('Erro ao marcar equipamento como devolvido');
        }
      });
    }
  }

  private atualizarDataDevolucao(dataDevolucao: string) {
    // Sempre atualizar a data de devolução para refletir o momento exato do clique
    const reparacaoAtualizada = {
      id: this.reparacao.id,
      empresaId: this.reparacao.empresaId,
      tecnicoGSIId: this.reparacao.tecnicoGSIId,
      avaria: this.reparacao.avaria,
      dataEnvioReparacao: this.reparacao.dataEnvioReparacao,
      dataPrevistaDevolucao: this.reparacao.dataPrevistaDevolucao,
      dataDevolucao: dataDevolucao,
      pathGuiaReparacao: this.reparacao.pathGuiaReparacao || null
    };
    
    this.reparacaoService.atualizar(this.reparacaoId, reparacaoAtualizada).subscribe({
      next: (reparacao) => {
        this.reparacao = reparacao;
        // Parar cronómetro quando houver devolução
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        this.countdownText = '';
        console.log('Data de devolução atualizada para:', dataDevolucao);
      },
      error: (err) => {
        console.error('Erro ao atualizar data de devolução:', err);
      }
    });
  }

  isEquipamentoDevolvido(equipamentoId: number): boolean {
    return this.equipamentosDevolvidos.has(equipamentoId);
  }

  getStatusEquipamento(equipamentoId: number): string {
    return this.isEquipamentoDevolvido(equipamentoId) ? 'Devolvido' : 'Em Reparação';
  }

  voltar() {
    this.location.back();
  }

  carregarTecnicos(): void {
    this.utilizadorService.listar().subscribe({
      next: (dados: any[]) => this.tecnicos = dados,
      error: (err) => console.error('Erro ao carregar técnicos:', err)
    });
  }



  toggleEstenderPrazo(): void {
    this.showExtendDatePicker = !this.showExtendDatePicker;
    if (this.showExtendDatePicker) {
      this.novaDataPrevista = this.toDateInput(this.reparacao?.dataPrevistaDevolucao);
    }
  }

  confirmarNovaDataPrevista(): void {
    if (!this.novaDataPrevista) {
      alert('Selecione a nova data prevista de devolução.');
      return;
    }

    const dataAnterior = this.reparacao?.dataPrevistaDevolucao;
    const dataNova = this.novaDataPrevista;

    const reparacaoAtualizada = {
      id: this.reparacao.id,
      empresaId: this.reparacao.empresaId,
      tecnicoGSIId: this.reparacao.tecnicoGSIId,
      avaria: this.reparacao.avaria,
      dataEnvioReparacao: this.reparacao.dataEnvioReparacao,
      dataPrevistaDevolucao: dataNova,
      dataDevolucao: this.reparacao.dataDevolucao,
      pathGuiaReparacao: this.reparacao.pathGuiaReparacao || null
    };

    this.reparacaoService.atualizar(this.reparacaoId, reparacaoAtualizada).subscribe({
      next: (reparacao) => {
        this.reparacao = reparacao;
        this.showExtendDatePicker = false;

        const textoAnotacao = `Prazo de devolução alterado de ${this.formatDatePTValue(dataAnterior)} para ${this.formatDatePTValue(dataNova)} em ${new Date().toLocaleString('pt-PT')}.`;
        this.anotacoesPrazo.unshift(textoAnotacao);
        this.guardarAnotacoesPrazo();

        if (!this.reparacao?.dataDevolucao && this.reparacao?.dataPrevistaDevolucao) {
          this.iniciarCountdown(this.reparacao.dataPrevistaDevolucao);
        }
      },
      error: (err) => {
        console.error('Erro ao estender data prevista de devolução:', err);
        alert('Não foi possível atualizar a data prevista de devolução.');
      }
    });
  }

  cancelarEstenderPrazo(): void {
    this.showExtendDatePicker = false;
  }

  private getAnotacoesPrazoStorageKey(): string {
    return `reparacao_${this.reparacaoId}_anotacoes_prazo`;
  }

  private carregarAnotacoesPrazo(): void {
    try {
      const raw = localStorage.getItem(this.getAnotacoesPrazoStorageKey());
      this.anotacoesPrazo = raw ? JSON.parse(raw) : [];
    } catch {
      this.anotacoesPrazo = [];
    }
  }

  private guardarAnotacoesPrazo(): void {
    try {
      localStorage.setItem(this.getAnotacoesPrazoStorageKey(), JSON.stringify(this.anotacoesPrazo));
    } catch {}
  }

  private toDateInput(value: string | Date | null | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private formatDatePTValue(value: string | Date | null | undefined): string {
    if (!value) return '---';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('pt-PT');
  }

  toFileUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${environment.apiUrl}${p}`;
  }

  getTecnicoNome(id: number | string | null | undefined): string {
    const tecnico = this.tecnicos.find((t: any) => t.id == id);
    return tecnico ? tecnico.nome : '---';
  }
}