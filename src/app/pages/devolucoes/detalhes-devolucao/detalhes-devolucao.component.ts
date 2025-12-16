import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';  // Importando CommonModule
import { RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { ItemsDevolucaoService } from '../../../services/item-devolucao.service';
import { ItemsAlocacaoService } from '../../../services/item-alocacao.service';
import { DevolucoesService } from '../../../services/devolucoes.service';
import { UtilizadorService } from '../../../services/utilizador.service';
import { EquipamentoService } from '../../../services/equipamento.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-detalhes-devolucao',
  standalone: true,
  imports: [CommonModule, RouterModule],  // Certifique-se que CommonModule está aqui
  templateUrl: './detalhes-devolucao.component.html',
  styleUrls: ['./detalhes-devolucao.component.scss']
})
export class DetalhesDevolucaoComponent implements OnInit {
  devolucaoId: number = 0;
  devolucao: any;
  utilizadores: any[] = [];
  itensDevolucao: any[] = [];
  historicoEquipamentos: { [equipamentoId: number]: any[] } = {};
  equipamento: any;
  equipamentosMap = new Map<number, any>();
  // Flag para controlar o modo de impressão da Guia de Devolução
  printMode = false;

  constructor(
    private route: ActivatedRoute,
    private devolucoesService: DevolucoesService,
    private itemsDevolucaoService: ItemsDevolucaoService,
    private utilizadorService: UtilizadorService,
    private equipamentoService: EquipamentoService,
    private itemsAlocacaoService: ItemsAlocacaoService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.devolucaoId = +this.route.snapshot.paramMap.get('id')!;
    this.carregarDevolucao();
    this.carregarUtilizadores();
  }

  carregarDevolucao() {
    this.devolucoesService.listar().subscribe({
      next: (dados) => {
        this.devolucao = dados.find(d => d.id === this.devolucaoId);
        this.carregarItensDevolucao();
        if (this.devolucao?.equipamentoId) {
          this.equipamentoService.buscarPorId(this.devolucao.equipamentoId).subscribe({
            next: eq => this.equipamento = eq,
            error: err => console.error('Erro ao carregar equipamento', err)
          });
        }
      },
      error: (err) => console.error('Erro ao buscar devolução:', err)
    });
  }

  carregarItensDevolucao() {
    this.itemsDevolucaoService.listarPorDevolucao(this.devolucaoId).subscribe({
      next: (itens) => {
        this.itensDevolucao = itens || [];
        // Primeiro carregamos todos itens de alocação para resolver equipamentoId quando ausente
        this.itemsAlocacaoService.listar().subscribe({
          next: (todosItensAloc) => {
            const mapaItemAlocPorId = new Map<number, any>();
            (todosItensAloc || []).forEach(it => mapaItemAlocPorId.set(it.id, it));

            // Obter IDs únicos de equipamentos a partir de equipamentoId direto ou via itemsAlocacaoId
            const equipamentosIds = new Set<number>();
            for (const item of this.itensDevolucao) {
              const direto = item?.equipamentoId || item?.equipamento?.id;
              const viaItemAloc = (() => {
                const itemAlocId = item?.itemsAlocacaoId || item?.itemAlocacaoId;
                const itAloc = itemAlocId ? mapaItemAlocPorId.get(itemAlocId) : undefined;
                return itAloc?.equipamentoId || itAloc?.equipamento?.id;
              })();
              const eqId = direto || viaItemAloc;
              // Atualiza o item para que o template consiga aceder pelo equipamentoId
              if (!item.equipamentoId && eqId) {
                item.equipamentoId = eqId;
              }
              if (eqId) equipamentosIds.add(eqId);
            }

            // Buscar cada equipamento e povoar o mapa
            equipamentosIds.forEach(eqId => {
              if (!this.equipamentosMap.has(eqId)) {
                this.equipamentoService.buscarPorId(eqId).subscribe({
                  next: equipamento => this.equipamentosMap.set(eqId, equipamento),
                  error: err => console.error('Erro ao carregar equipamento', err)
                });
              }
            });
          },
          error: (err) => console.error('Erro ao carregar itens de alocação para mapear equipamentos:', err)
        });
      },
      error: (err) => console.error('Erro ao buscar itens da devolução:', err)
    });
  }

  carregarUtilizadores() {
    this.utilizadorService.listar().subscribe({
      next: (dados) => this.utilizadores = dados,
      error: (err) => console.error('Erro ao carregar utilizadores:', err)
    });
  }

  getNomeUtilizador(id: number): string {
    const u = this.utilizadores.find(u => u.id === id);
    return u ? u.nome : `ID ${id}`;
  }

  getDescricaoEquipamento(id: number): string {
    const eq = this.equipamentosMap.get(id);
    return eq ? `${eq.numeroSerie} - ${eq.modelo?.nome || 'Modelo Desconhecido'}` : 'Carregando...';
  }

  // Acesso seguro ao objeto de equipamento para uso direto no template
  getEquipamentoObj(id: number): any | null {
    return this.equipamentosMap.get(id) || null;
  }

  voltar() {
    this.location.back();
  }
  toFileUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${environment.apiUrl}${p}`;
  }

  // Aciona a visualização da Guia (com imagem de fundo) e imprime
  gerarGuia() {
    this.printMode = true;
    // Aguarda o render do template e aciona a impressão
    setTimeout(() => {
      try {
        window.print();
      } finally {
        // Após a impressão (ou cancelamento), retorna ao modo normal
        this.printMode = false;
      }
    }, 250);
  }
}
