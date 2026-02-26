import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';  // Importando CommonModule
import { RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { ItemsDevolucaoService } from '../../../services/item-devolucao.service';
import { DevolucoesService } from '../../../services/devolucoes.service';
import { UtilizadorService } from '../../../services/utilizador.service';
import { EquipamentoService } from '../../../services/equipamento.service';
import { MarcaService } from '../../../services/marca.service';
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
  modelos: any[] = [];
  tipos: any[] = [];
  marcas: any[] = [];
  // Flag para controlar o modo de impressão da Guia de Devolução
  printMode = false;

  constructor(
    private route: ActivatedRoute,
    private devolucoesService: DevolucoesService,
    private itemsDevolucaoService: ItemsDevolucaoService,
    private utilizadorService: UtilizadorService,
    private equipamentoService: EquipamentoService,
    private marcaService: MarcaService,
    private location: Location,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.devolucaoId = +this.route.snapshot.paramMap.get('id')!;
    this.carregarDevolucao();
    this.carregarUtilizadores();
    this.carregarMarcas();
  }

  carregarDevolucao() {
    this.devolucoesService.listar().subscribe({
      next: (dados) => {
        this.devolucao = dados.find(d => d.id === this.devolucaoId);
        this.carregarItensDevolucao();
        if (this.devolucao?.equipamentoId) {
          this.equipamentoService.buscarPorId(this.devolucao.equipamentoId).subscribe({
            next: eq => this.equipamento = eq,
            error: (err: any) => console.error('Erro ao carregar equipamento', err)
          });
        }
      },
      error: (err: any) => console.error('Erro ao buscar devolução:', err)
    });
  }

  carregarItensDevolucao() {
    this.itemsDevolucaoService.listarPorDevolucao(this.devolucaoId).subscribe({
      next: (itens) => {
        this.itensDevolucao = itens || [];

        // Carregar modelos e tipos ANTES de buscar equipamentos individualmente
        this.equipamentoService.listarModelos().subscribe({
          next: (modelos) => {
            this.modelos = modelos;
            this.equipamentoService.listarTipos().subscribe({
              next: (tipos) => {
                this.tipos = tipos;

                // Agora buscar cada equipamento usando o ID que vem do backend
                this.itensDevolucao.forEach(item => {
                  const eqId = item.equipamentoId; 
                  if (eqId && !this.equipamentosMap.has(eqId)) {
                    this.equipamentoService.buscarPorId(eqId).subscribe({
                      next: equipamento => {
                        // Enriquecer o objeto equipamento com Modelo e Tipo
                        if (equipamento.modeloId) {
                            const modelo = this.modelos.find((m: any) => m.id === equipamento.modeloId);
                            if (modelo) equipamento.modelo = modelo;
                        }
                        if (equipamento.tipoEquipamentoId) {
                            const tipo = this.tipos.find((t: any) => t.id === equipamento.tipoEquipamentoId);
                            if (tipo) equipamento.tipoEquipamento = tipo;
                        }

                        this.equipamentosMap.set(eqId, equipamento);
                        // Forçar atualização da view
                        this.itensDevolucao = [...this.itensDevolucao];
                        this.cdr.detectChanges();
                      },
                      error: (err: any) => {
                        console.error('Erro ao carregar equipamento', err);
                      }
                    });
                  }
                });

              },
              error: (err: any) => console.error('Erro ao carregar tipos de equipamento', err)
            });
          },
          error: (err: any) => console.error('Erro ao carregar modelos', err)
        });
      },
      error: (err: any) => console.error('Erro ao buscar itens da devolução:', err)
    });
  }

  carregarUtilizadores() {
    this.utilizadorService.listar().subscribe({
      next: (dados) => this.utilizadores = dados,
      error: (err: any) => console.error('Erro ao carregar utilizadores:', err)
    });
  }

  carregarMarcas() {
    this.marcaService.listar().subscribe({
      next: (dados) => this.marcas = dados || [],
      error: (err: any) => { console.error('Erro ao carregar marcas:', err); this.marcas = []; }
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

  getMarcaNomePorModeloId(modeloId: number): string {
    if (!modeloId) return '';
    const modelo = this.modelos.find((m: any) => m.id === modeloId);
    if (!modelo) return '';
    const marcaId = (modelo as any).marcaId ?? (modelo as any).marca_id ?? (modelo as any).marca;
    const marca = this.marcas.find((mc: any) => mc.id === marcaId);
    return marca ? (marca.nome ?? marca.designacao ?? marca.name ?? '') : '';
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
