import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../services/modal.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EquipamentoService } from '../../services/equipamento.service';
import { NgSelectModule } from '@ng-select/ng-select';


@Component({
  standalone: true,
  selector: 'app-equipamentos',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgSelectModule],
  templateUrl: './equipamentos.component.html',
  styleUrls: ['./equipamentos.component.scss']
})
export class EquipamentosComponent implements OnInit {
  equipamentos: any[] = [];
  page = 0;
  size = 20;
  total = 0;
  hasMore = true;
  loading = false;
  useFallback = false;
  bufferTodos: any[] = [];

  modelos: any[] = [];  
  tipos: any[] = [];
  aquisicoes: any[] = [];
  // Estados possíveis do equipamento (alinhados com backend)
  estados: string[] = [
    'ALOCADO',
    'REPARACAO',
    'BAIXADO',
    'PERDIDO',
    'STOCK_NOVO',
    'STOCK_BOM',
    'STOCK_AVARIADO',
    'PATRIMONIO_AVARIADO',
    'PATRIMONIO_BOM'
  ];
  
  
  filtroModelo: number | null = null;
  filtroTipo: number | null = null;
  filtroAquisicao: number | null = null;
  filtroEstado: string | null = null;

  form: FormGroup;
  showModal = false;
  editando = false;
  equipamentoSelecionadoId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private equipamentoService: EquipamentoService,
    private modalService: ModalService,
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
    this.carregarEquipamentosPaginado(true);
    this.carregarModelos();
    this.carregarTipos();
    this.carregarAquisicoes();
  }

  carregarEquipamentosPaginado(reset = false): void {
    if (reset) {
      this.page = 0;
      this.equipamentos = [];
      this.hasMore = true;
      this.useFallback = false;
      this.bufferTodos = [];
    }
    if (this.useFallback) {
      this.appendFromBuffer(reset);
      return;
    }
    if (this.loading || !this.hasMore) return;
    this.loading = true;
    this.equipamentoService.listarEquipamentosPaginado(this.page, this.size, 'id,asc').subscribe({
      next: (resp) => {
        const conteudo = resp.content || [];
        if (conteudo.length === 0 && (resp.totalElements || 0) === 0) {
          this.equipamentoService.listarEquipamentos().subscribe({
            next: (dados) => {
              this.useFallback = true;
              this.bufferTodos = dados || [];
              this.appendFromBuffer(reset);
              this.loading = false;
            },
            error: () => {
              this.loading = false;
            }
          });
        } else {
          this.equipamentos = [...this.equipamentos, ...conteudo];
          this.total = resp.totalElements || 0;
          this.hasMore = this.equipamentos.length < this.total;
          this.page = this.page + 1;
          this.loading = false;
        }
      },
      error: (erro) => {
        console.error('Erro ao buscar equipamentos:', erro);
        // Fallback robusto: em erro de paginação, tentar listar tudo e paginar no cliente
        this.equipamentoService.listarEquipamentos().subscribe({
          next: (dados) => {
            this.useFallback = true;
            this.bufferTodos = dados || [];
            this.appendFromBuffer(reset);
            this.loading = false;
          },
          error: () => {
            this.loading = false;
          }
        });
      }
    });
  }

  private appendFromBuffer(reset = false) {
    if (reset) {
      this.equipamentos = [];
      this.page = 0;
    }
    const start = this.page * this.size;
    const slice = this.bufferTodos.slice(start, start + this.size);
    this.equipamentos = [...this.equipamentos, ...slice];
    this.total = this.bufferTodos.length;
    this.hasMore = this.equipamentos.length < this.total;
    this.page = this.page + 1;
  }

  carregarModelos() {
    this.equipamentoService.listarModelos().subscribe({
      next: (dados) => {
        console.log('📦 Modelos do backend:', dados);
        this.modelos = dados;
      },
      error: (err) => console.error('❌ Erro ao carregar modelos:', err)
    });
  }
  
  carregarTipos() {
    this.equipamentoService.listarTipos().subscribe({
      next: (dados) => this.tipos = dados,
      error: (err) => console.error('Erro ao carregar tipos:', err)
    });
  }
  
  carregarAquisicoes() {
    this.equipamentoService.listarAquisicoes().subscribe({
      next: (dados) => this.aquisicoes = dados,
      error: (err) => console.error('Erro ao carregar aquisições:', err)
    });
  }

  abrirModal(novo = true, equipamento?: any) {
    this.editando = !novo;
    this.showModal = true;
    this.modalService.openModal();

    if (novo) {
      this.equipamentoSelecionadoId = null;
      this.form.reset();
    } else {
      this.equipamentoSelecionadoId = equipamento.id;
      this.form.patchValue({
        modelo_id: equipamento.modeloId,
        tipoEquipamento_id: equipamento.tipoEquipamentoId,
        aquisicao_id: equipamento.aquisicaoId,
        numeroSerie: equipamento.numeroSerie,
        dataRegisto: equipamento.dataRegisto
      });
    }
  }

  fecharModal() {
    this.showModal = false;
    this.form.reset();
    this.equipamentoSelecionadoId = null;
    this.modalService.closeModal();
  }

  editarModal(novo: boolean, equipamento: any) {
    this.equipamentoService.buscarPorId(equipamento.id).subscribe({
      next: (equipamentoAtualizado) => {
        this.abrirModal(novo, equipamentoAtualizado);
      },
      error: (erro) => {
        console.error('Erro ao buscar dados do equipamento:', erro);
        alert('Erro ao carregar dados do equipamento');
      }
    });
  }

  salvar() {
    if (this.form.invalid) return;
  
    const dados = {
      modeloId: this.form.value.modelo_id,
      tipoEquipamentoId: this.form.value.tipoEquipamento_id,
      aquisicaoId: this.form.value.aquisicao_id,
      numeroSerie: this.form.value.numeroSerie,
      dataRegisto: this.form.value.dataRegisto
    };
  
    if (this.editando && this.equipamentoSelecionadoId !== null) {
      this.equipamentoService.atualizarEquipamento(this.equipamentoSelecionadoId, dados).subscribe({
        next: (equipamentoAtualizado) => {
          const index = this.equipamentos.findIndex(e => e.id === this.equipamentoSelecionadoId);
          if (index !== -1) {
            this.equipamentos[index] = equipamentoAtualizado;
          }
          this.fecharModal();
          console.log('Equipamento atualizado com sucesso');
        },
        error: (err) => {
          console.error('Erro ao atualizar equipamento:', err);
          alert('Erro ao atualizar equipamento');
        }
      });
    } else {
      this.equipamentoService.criarEquipamento(dados).subscribe({
        next: (novoEquipamento) => {
          this.equipamentos.push(novoEquipamento);
          this.fecharModal();
        },
        error: (err) => {
          console.error('Erro ao criar equipamento:', err);
          alert('Erro ao salvar equipamento');
        }
      });
    }
  }
  

  excluir(id: number) {
  if (confirm('Tem certeza que deseja remover este equipamento?')) {
    this.equipamentoService.excluirEquipamento(id).subscribe({
      next: () => {
        this.equipamentos = this.equipamentos.filter(e => e.id !== id);
        console.log('Equipamento excluído com sucesso');
      },
      error: (erro) => {
        console.error('Erro ao excluir equipamento:', erro);
        alert('Erro ao excluir equipamento');
      }
    });
  }
}

  getEquipamentosFiltrados() {
    return this.equipamentos.filter(eq => {
      return (!this.filtroModelo || eq.modeloId === this.filtroModelo) &&
             (!this.filtroTipo || eq.tipoEquipamentoId === this.filtroTipo) &&
             (!this.filtroAquisicao || eq.aquisicaoId === this.filtroAquisicao) &&
             (!this.filtroEstado || (eq.estado && eq.estado === this.filtroEstado));
    });
  }

getModeloNome(id: number): string {
  console.log('Buscando modeloId:', id, 'na lista:', this.modelos);
  const modelo = this.modelos.find(m => m.id == id); 
  return modelo ? modelo.nome : '---';
}

  getTipoNome(id: number): string {
    const tipo = this.tipos.find(t => t.id === id);
    return tipo ? tipo.nome : '---';
  }

  getAquisicaoNrConcurso(id: number): string {
    const aquisicao = this.aquisicoes.find(a => a.id === id);
    return aquisicao ? aquisicao.numeroConcurso : '---';
  }

  getEstadoAtual(equipamento: any): string {
    return equipamento.estado || '---';
  }
}
