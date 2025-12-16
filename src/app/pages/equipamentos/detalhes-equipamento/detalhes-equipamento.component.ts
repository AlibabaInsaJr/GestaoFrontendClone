import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EquipamentoService } from '../../../services/equipamento.service';
import { AlocacaoService } from '../../../services/alocacoes.service';
import { ItemsAlocacaoService } from '../../../services/item-alocacao.service';
import { UtilizadorService } from '../../../services/utilizador.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-detalhes-equipamento',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detalhes-equipamento.component.html',
  styleUrls: ['./detalhes-equipamento.component.scss']
})
export class DetalhesEquipamentoComponent implements OnInit {
  equipamentoId: number = 0;
  equipamento: any;
  equipamentoHistorico: any[] = [];

  modelos: any[] = [];
  tipos: any[] = [];
  aquisicoes: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private equipamentoService: EquipamentoService,
    private alocacaoService: AlocacaoService,
    private itemsAlocacaoService: ItemsAlocacaoService,
    private utilizadorService: UtilizadorService
  ) {}

  ngOnInit(): void {
    this.equipamentoId = +this.route.snapshot.paramMap.get('id')!;
    this.buscarDados();
    this.buscarHistorico();
  }

  buscarDados() {
    this.equipamentoService.buscarPorId(this.equipamentoId).subscribe({
      next: (dados) => {
        this.equipamento = dados;
        console.log('Equipamento carregado:', dados);
      },
      error: (err) => console.error('Erro ao buscar equipamento:', err)
    });

    this.equipamentoService.listarModelos().subscribe({
      next: (modelos) => this.modelos = modelos
    });

    this.equipamentoService.listarTipos().subscribe({
      next: (tipos) => this.tipos = tipos
    });

    this.equipamentoService.listarAquisicoes().subscribe({
      next: (aq) => this.aquisicoes = aq
    });
  }

  buscarHistorico() {
    this.equipamentoService.buscarHistorico(this.equipamentoId).subscribe({
      next: (dados) => {
        this.equipamentoHistorico = dados || [];
        // Se o backend não retornar histórico, montar ao menos o histórico de alocação
        if (!this.equipamentoHistorico || this.equipamentoHistorico.length === 0) {
          this.carregarHistoricoSimplificado();
        }
        console.log('📋 Histórico carregado:', this.equipamentoHistorico);
      },
      error: (err) => {
        console.error('❌ Erro ao carregar histórico:', err);
        // Em caso de erro, tentar fallback mínimo com dados de alocação
        this.carregarHistoricoSimplificado();
      }
    });
  }

  getModeloNome(modeloId: number): string {
    return this.modelos.find(m => m.id === modeloId)?.nome || 'Desconhecido';
  }

  getTipoNome(tipoId: number): string {
    return this.tipos.find(t => t.id === tipoId)?.nome || 'Desconhecido';
  }

  getTipoDescricao(tipoId: number): string {
    return this.tipos.find(t => t.id === tipoId)?.descricao || '---';
  }

  getAquisicaoNrConcurso(id: number): string {
    const aquisicao = this.aquisicoes.find(a => a.id === id);
    return aquisicao ? aquisicao.numeroConcurso : '---';
  }

  getEstadoClass(estado: string): string {
    return estado?.toLowerCase().replace(/\s/g, '-') || '';
  }

  voltar() {
    window.history.back();
  }

  private carregarHistoricoSimplificado() {
    // Monta um histórico mínimo com base nos items de alocação + alocações + utilizadores
    forkJoin({
      items: this.itemsAlocacaoService.listar(),
      alocacoes: this.alocacaoService.listar(),
      utilizadores: this.utilizadorService.listar()
    }).subscribe({
      next: ({ items, alocacoes, utilizadores }) => {
        const itensDoEquipamento = (items || []).filter((it: any) => it.equipamentoId === this.equipamentoId);
        if (!itensDoEquipamento || itensDoEquipamento.length === 0) {
          console.warn('Sem items de alocação para o equipamento', this.equipamentoId);
          return;
        }

        const alocMap = new Map<number, any>();
        (alocacoes || []).forEach((a: any) => alocMap.set(a.id, a));

        const userMap = new Map<number, any>();
        (utilizadores || []).forEach((u: any) => userMap.set(u.id, u));

        const eventos = itensDoEquipamento.map((item: any) => {
          const aloc = alocMap.get(item.alocacaoId);
          const user = aloc ? userMap.get(aloc.utilizadorBeneficiarioId) : null;
          const nome = user?.nome || aloc?.utilizador?.nome || aloc?.utilizadorBeneficiarioId || '---';
          const data = aloc?.dataAlocacao || aloc?.data || item?.data || null;
          return {
            acao: 'ALOCADO',
            utilizador: nome,
            data: data,
            estado: 'ALOCADO'
          };
        }).filter((e: any) => !!e.data);

        // Mesclar com qualquer histórico existente e ordenar por data desc
        const merged = [...(this.equipamentoHistorico || []), ...eventos];
        merged.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());
        this.equipamentoHistorico = merged;

        console.log('📚 Histórico fallback (alocação) montado:', this.equipamentoHistorico);
      },
      error: (err) => {
        console.error('Erro ao montar histórico simplificado de alocação:', err);
      }
    });
  }
}
