// src/app/pages/baixas/baixas.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { BaixasService } from '../../services/baixas.service';
import { ItemBaixaService } from '../../services/item-baixa.service';
import { EquipamentoService } from '../../services/equipamento.service';
import { UtilizadorService } from '../../services/utilizador.service';
import { ItemsDevolucaoService } from '../../services/item-devolucao.service';

@Component({
  standalone: true,
  selector: 'app-baixas',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgSelectModule],
  templateUrl: './baixas.component.html',
  styleUrls: ['./baixas.component.scss']
})
export class BaixasComponent implements OnInit {
  baixas: any[] = [];
  equipamentos: any[] = [];
  modelos: any[] = [];
  utilizadores: any[] = [];
  selectedEquipamentos: string[] = [];

  filtroUtilizador: number | null = null; // Quem entregou
  filtroRecebedor: number | null = null; // Quem recebeu

  // Estados disponíveis para "Estado da Baixa"
  estadosBaixa: string[] = [
    'BAIXADO',
    'PERDIDO',
    'PATRIMONIO_AVARIADO',
    'PATRIMONIO_BOM'
  ];

  form: FormGroup;
  showModal = false;
  editando = false;
  baixaSelecionadaId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private baixasService: BaixasService,
    private itemBaixaService: ItemBaixaService,
    private equipamentoService: EquipamentoService,
    private utilizadorService: UtilizadorService,
    private itemsDevolucaoService: ItemsDevolucaoService
  ) {
    this.form = this.fb.group({
      utilizadorEntregouId: [null, Validators.required],
      utilizadorRecebeuId: [null, Validators.required],
      dataBaixa: ['', Validators.required],
      novoEstado: ['BAIXADO', Validators.required]
    });
  }

  ngOnInit(): void {
    this.carregarBaixas();
    this.carregarEquipamentos();
    this.carregarModelos();
    this.carregarUtilizadores();
    this.form.get('utilizadorRecebeuId')?.setValue(1);
  }

  carregarBaixas(): void {
    this.baixasService.listar().subscribe({
      next: (dados) => {
        this.baixas = dados;
        this.baixas.forEach(b => {
          this.itemBaixaService.listarPorBaixa(b.id).subscribe({
            next: (itens) => b.itens = itens
          });
        });
      },
      error: (erro) => console.error('Erro ao buscar baixas:', erro)
    });
  }

  carregarEquipamentos(): void {
    this.equipamentoService.listarEquipamentos().subscribe({
      next: (dados) => this.equipamentos = dados.filter(e => e.estado !== 'ALOCADO'),
      error: (erro) => console.error('Erro ao buscar equipamentos:', erro)
    });
  }

  carregarModelos(): void {
    this.equipamentoService.listarModelos().subscribe({
      next: (dados) => this.modelos = dados,
      error: (erro) => console.error('Erro ao buscar modelos:', erro)
    });
  }

  carregarUtilizadores(): void {
    this.utilizadorService.listar().subscribe({
      next: (dados) => {
        this.utilizadores = dados;
        // Definir recebedor padrão como o primeiro utilizador disponível, se existir
        const primeiroId = this.utilizadores.length ? this.utilizadores[0].id : null;
        this.form.get('utilizadorRecebeuId')?.setValue(primeiroId);
      },
      error: (erro) => console.error('Erro ao buscar utilizadores:', erro)
    });
  }

  abrirModal(novo = true, baixa?: any) {
    this.editando = !novo;
    this.showModal = true;
    this.selectedEquipamentos = [];

    if (novo) {
      this.baixaSelecionadaId = null;
      this.form.reset();
      // manter valores padrão
      this.form.get('novoEstado')?.setValue('BAIXADO');
      // recebedor será definido após carregarUtilizadores()
    } else {
      this.baixaSelecionadaId = baixa.id;
      this.form.patchValue({
        utilizadorEntregouId: baixa.utilizadorEntregouId,
        utilizadorRecebeuId: baixa.utilizadorRecebeuId || this.form.get('utilizadorRecebeuId')?.value,
        dataBaixa: baixa.dataBaixa,
        novoEstado: 'BAIXADO'
      });

      this.itemBaixaService.listarPorBaixa(baixa.id).subscribe({
        next: (itens) => {
          this.selectedEquipamentos = itens.map(item => {
            const eq = this.equipamentos.find(e => e.id === item.equipamentoId);
            return eq ? eq.numeroSerie : '';
          }).filter(ns => ns !== '');
        }
      });
    }
  }

  fecharModal() {
    this.showModal = false;
    this.form.reset();
    this.baixaSelecionadaId = null;
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

  getBaixasFiltradas() {
    return this.baixas.filter(b => {
      const filtroEntregouOk = !this.filtroUtilizador || b.utilizadorEntregouId === this.filtroUtilizador;
      const filtroRecebeuOk = !this.filtroRecebedor || b.utilizadorRecebeuId === this.filtroRecebedor;
      return filtroEntregouOk && filtroRecebeuOk;
    });
  }

  excluir(id: number) {
    if (!confirm('Tem certeza que deseja remover esta baixa?')) {
      return;
    }

    // Remover primeiro todos os itens associados; depois remover a baixa.
    this.itemBaixaService.listarPorBaixa(id).subscribe({
      next: (itens) => {
        const removerSequencialmente = (index: number) => {
          if (index >= itens.length) {
            // Após remover itens, remover a baixa
            this.baixasService.remover(id).subscribe({
              next: () => {
                this.baixas = this.baixas.filter(b => b.id !== id);
                alert('Baixa removida com sucesso.');
              },
              error: (err) => {
                console.error('Erro ao remover baixa:', err);
                alert('Não foi possível remover a baixa.');
              }
            });
            return;
          }

          const item = itens[index];
          this.itemBaixaService.remover(item.id).subscribe({
            next: () => removerSequencialmente(index + 1),
            error: (err) => {
              console.error('Erro ao remover item de baixa:', err);
              // Continua tentando remover os demais itens para maximizar a limpeza
              removerSequencialmente(index + 1);
            }
          });
        };

        removerSequencialmente(0);
      },
      error: (err) => {
        console.error('Erro ao carregar itens para remoção da baixa:', err);
        alert('Não foi possível carregar os itens associados. A remoção foi cancelada.');
      }
    });
  }

  salvar() {
    if (this.form.invalid) return;

    const dados = this.form.value;
    if (!dados.utilizadorRecebeuId && this.utilizadores.length) {
      dados.utilizadorRecebeuId = this.utilizadores[0].id;
    }

    const criarOuAtualizarItens = (baixaId: number) => {
      this.itemBaixaService.listarPorBaixa(baixaId).subscribe({
        next: (existentes) => {
          const removerSeq = (i: number) => {
            if (i >= existentes.length) {
              this.criarItensBaixa(baixaId, dados.novoEstado);
              return;
            }
            this.itemBaixaService.remover(existentes[i].id).subscribe({
              next: () => removerSeq(i + 1),
              error: () => removerSeq(i + 1)
            });
          };
          removerSeq(0);
        },
        error: (err) => {
          console.error('Erro ao listar itens de baixa para sincronização:', err);
          this.criarItensBaixa(baixaId, dados.novoEstado);
        }
      });
    };

    if (this.editando && this.baixaSelecionadaId) {
      this.baixasService.atualizar(this.baixaSelecionadaId, {
        utilizadorEntregouId: dados.utilizadorEntregouId,
        utilizadorRecebeuId: dados.utilizadorRecebeuId,
        dataBaixa: dados.dataBaixa
      }).subscribe({
        next: () => criarOuAtualizarItens(this.baixaSelecionadaId!),
        error: (err) => {
          console.error('Erro ao atualizar baixa:', err);
          alert('Erro ao atualizar a baixa');
        }
      });
    } else {
      this.baixasService.criar({
        utilizadorEntregouId: dados.utilizadorEntregouId,
        utilizadorRecebeuId: dados.utilizadorRecebeuId,
        dataBaixa: dados.dataBaixa
      }).subscribe({
        next: (baixa) => criarOuAtualizarItens(baixa.id),
        error: (err) => {
          console.error('Erro ao criar baixa:', err);
          alert('Erro ao salvar baixa');
        }
      });
    }
  }

  private criarItensBaixa(baixaId: number, novoEstado: string) {
    this.itemsDevolucaoService.listar().subscribe({
      next: (todosItensDev) => {
        const mapaDevPorEquip: Map<number, any[]> = new Map();
        for (const item of todosItensDev) {
          const lista = mapaDevPorEquip.get(item.equipamentoId) || [];
          lista.push(item);
          mapaDevPorEquip.set(item.equipamentoId, lista);
        }
        for (const [key, lista] of mapaDevPorEquip.entries()) {
          lista.sort((a, b) => (b.id || 0) - (a.id || 0));
          mapaDevPorEquip.set(key, lista);
        }

        const itensPayloads: any[] = [];
        for (const ns of this.selectedEquipamentos) {
          const eq = this.equipamentos.find(e => e.numeroSerie === ns);
          if (!eq) continue;
          const listaDev = mapaDevPorEquip.get(eq.id) || [];
          const ultimoDev = listaDev[0];
          if (!ultimoDev) {
            itensPayloads.push({
              baixaPatrimonioId: baixaId,
              equipamentoId: eq.id,
              novoEstado
            });
          } else {
            itensPayloads.push({
              baixaPatrimonioId: baixaId,
              itemsDevolucaoId: ultimoDev.id,
              novoEstado
            });
          }
        }

        let criados = 0;
        const total = itensPayloads.length;
        if (total === 0) {
          alert('Operação concluída: a baixa ficou sem itens selecionados.');
          this.fecharModal();
          this.carregarBaixas();
          return;
        }
        for (const payload of itensPayloads) {
          this.itemBaixaService.criar(payload).subscribe({
            next: () => {
              criados++;
              if (criados === total) {
                this.fecharModal();
                this.carregarBaixas();
              }
            },
            error: (err) => console.error('Erro ao criar item de baixa:', err)
          });
        }
      },
      error: (err) => {
        console.error('Erro ao carregar itens de devolução:', err);
        alert('Operação concluída com avisos: não foi possível associar itens de devolução.');
        this.fecharModal();
        this.carregarBaixas();
      }
    });
  }
}
