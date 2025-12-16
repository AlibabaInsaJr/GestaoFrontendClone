import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { ReparacaoService } from '../../services/reparacao.service';
import { EmpresaService } from '../../services/empresa.service';
import { UtilizadorService } from '../../services/utilizador.service';
import { ItemsReparacaoService } from '../../services/item-reparacao.service';
import { EquipamentoService } from '../../services/equipamento.service';
import { MarcaService } from '../../services/marca.service';
import { ModeloService } from '../../services/modelo.service';

@Component({
  standalone: true,
  selector: 'app-reparacoes',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgSelectModule],
  templateUrl: './reparacoes.component.html',
  styleUrls: ['./reparacoes.component.scss']
})
export class ReparacoesComponent implements OnInit {
  reparacoes: any[] = [];
  empresas: any[] = [];
  tecnicos: any[] = [];
  equipamentosDisponiveis: any[] = [];
  equipamentosFiltrados: any[] = [];
  modelos: any[] = [];
  marcas: any[] = [];
  modelosPorMarca: any[] = [];
  utilizadoresComDevolucoes: any[] = [];
  selectedEquipamentos: string[] = [];
  dropdownAberto = false;
  dropdownEquipamentoAberto = false;


  filtroEmpresa: number | null = null;
  filtroTecnico: number | null = null;

  form: FormGroup;
  showModal = false;
  editando = false;
  reparacaoSelecionadaId: number | null = null;


  constructor(
    private fb: FormBuilder,
    private reparacaoService: ReparacaoService,
    private empresaService: EmpresaService,
    private utilizadorService: UtilizadorService,
    private itemsReparacaoService: ItemsReparacaoService,
    private equipamentoService: EquipamentoService,
    private marcaService: MarcaService,
    private modeloService: ModeloService
  ) {
    this.form = this.fb.group({
      empresaId: [null, Validators.required],
      tecnicoGSIId: [null, Validators.required],
      avaria: ['', Validators.required],
      dataEnvioReparacao: ['', Validators.required],
      dataPrevistaDevolucao: [''],
      dataDevolucao: [''],
      marcaId: [null, Validators.required],
      equipamentoId: [{value: null, disabled: true}, Validators.required]
    });

    // Observar mudanças na marca para filtrar equipamentos
    this.form.get('marcaId')?.valueChanges.subscribe(marcaId => {
      this.filtrarEquipamentosPorMarca(marcaId);
      this.form.get('equipamentoId')?.setValue(null); // Reset equipamento quando marca muda
      
      // Controlar o estado disabled do campo equipamento
      if (marcaId) {
        this.form.get('equipamentoId')?.enable();
      } else {
        this.form.get('equipamentoId')?.disable();
      }
    });
  }

  ngOnInit(): void {
    console.log('🚀 Iniciando ngOnInit...');
    this.carregarReparacoes();
    this.carregarEmpresas();
    this.carregarTecnicos();
    this.carregarMarcas();
    this.carregarModelos();
    this.carregarEquipamentosDisponiveis();
    this.carregarUtilizadoresComDevolucoes();
    
    console.log('✅ ngOnInit concluído');
  }

  // Método removido - não usar dados de teste

  carregarReparacoes(): void {
    this.reparacaoService.listar().subscribe({
      next: (dados: any[]) => {
        this.reparacoes = dados;
      },
      error: (erro: any) => {
        console.error('Erro ao buscar reparações:', erro);
      }
    });
  }

  carregarEmpresas(): void {
    console.log('Iniciando carregamento de empresas...');
    this.empresaService.listar().subscribe({
      next: (dados: any[]) => {
        console.log('Empresas carregadas:', dados);
        this.empresas = dados;
      },
      error: (erro: any) => {
        console.error('Erro ao carregar empresas:', erro);
        console.error('Detalhes do erro:', erro.message, erro.status);
      }
    });
  }

  carregarTecnicos(): void {
    this.utilizadorService.listar().subscribe({
      next: (dados: any[]) => this.tecnicos = dados,
      error: (erro: any) => console.error('Erro ao carregar técnicos:', erro)
    });
  }

  carregarEquipamentosDisponiveis(): void {
    console.log('Iniciando carregamento de equipamentos...');
    this.equipamentoService.listarEquipamentos().subscribe({
      next: (dados: any[]) => {
        console.log('Equipamentos carregados:', dados);
        this.equipamentosDisponiveis = dados.filter(e => e.estado !== 'REPARACAO' && e.estado !== 'ALOCADO');
        console.log('Equipamentos disponíveis filtrados:', this.equipamentosDisponiveis);
        
        // Se já houver uma marca selecionada, refiltrar para garantir labels com modelo
        const marcaId = this.form.get('marcaId')?.value;
        if (marcaId) {
          this.filtrarEquipamentosPorMarca(marcaId);
        }
      },
      error: (erro: any) => {
        console.error('Erro ao carregar equipamentos:', erro);
        console.error('Detalhes do erro:', erro.message, erro.status);
        this.equipamentosDisponiveis = [];
      }
    });
  }

  carregarModelos(): void {
    console.log('🔄 Iniciando carregamento de modelos...');
    this.equipamentoService.listarModelos().subscribe({
      next: (dados: any[]) => {
        console.log('📋 Modelos recebidos da API:', dados);
        this.modelos = dados;
        console.log('📋 Modelos carregados:', this.modelos.length);
        
        // Se já houver uma marca selecionada, refiltrar para aplicar nomes de modelos
        const marcaId = this.form.get('marcaId')?.value;
        if (marcaId) {
          this.filtrarEquipamentosPorMarca(marcaId);
        }
      },
      error: (err) => {
        console.error('Erro ao carregar modelos:', err);
        this.modelos = [];
      }
    });
  }

  carregarMarcas(): void {
    console.log('Iniciando carregamento de marcas...');
    this.marcaService.listar().subscribe({
      next: (dados: any[]) => {
        console.log('Marcas carregadas:', dados);
        console.log('Número de marcas:', dados.length);
        this.marcas = dados;
        console.log('Array marcas atualizado:', this.marcas);
      },
      error: (err) => {
        console.error('Erro ao carregar marcas:', err);
        console.error('Detalhes do erro:', err.message, err.status);
        this.marcas = [];
      }
    });
  }

  // Métodos de dados de teste removidos - usar apenas endpoints reais



  carregarUtilizadoresComDevolucoes(): void {
    // Método removido temporariamente - serviço não disponível
    this.utilizadoresComDevolucoes = [];
  }

  filtrarEquipamentosPorMarca(marcaId: number | null): void {
    console.log('🔍 Filtrando equipamentos por marca:', marcaId);
    console.log('📦 Equipamentos disponíveis:', this.equipamentosDisponiveis.length);
    console.log('🏷️ Modelos carregados:', this.modelos.length);
    
    if (!marcaId) {
      this.equipamentosFiltrados = [];
      console.log('❌ Nenhuma marca selecionada, lista limpa');
      return;
    }

    // Filtrar equipamentos pela marca selecionada
    const filtrados = this.equipamentosDisponiveis.filter(equipamento => {
      const modelo = this.modelos.find(m => m.id === equipamento.modeloId);
      const pertenceAMarca = modelo && modelo.marcaId === marcaId;
      console.log(`📱 Equipamento ${equipamento.numeroSerie}: modelo=${modelo?.nome}, marcaId=${modelo?.marcaId}, pertence=${pertenceAMarca}`);
      return pertenceAMarca;
    });
    
    // Adicionar rótulo combinado: "Nº Série - Modelo" para melhor visualização e busca
    this.equipamentosFiltrados = filtrados.map(e => ({
      ...e,
      displayLabel: `${e.numeroSerie} - ${this.getModeloNome(e.modeloId)}`
    }));
    
    console.log('✅ Equipamentos filtrados:', this.equipamentosFiltrados.length);
    console.log('📋 Lista filtrada:', this.equipamentosFiltrados);
  }

  // Função utilitária para normalizar texto e remover acentos/maiúsculas
  private normalize(texto: string): string {
    return (texto || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // Permite pesquisar por número de série OU nome do modelo no ng-select
  equipamentoSearchFn = (term: string, item: any): boolean => {
    const t = this.normalize(term);
    const serie = this.normalize(item?.numeroSerie);
    const modeloNome = this.normalize(this.getModeloNome(item?.modeloId));
    const label = this.normalize(item?.displayLabel);
    return serie.includes(t) || modeloNome.includes(t) || label.includes(t);
  };

  getMarcaNome(marcaId: number): string {
    const marca = this.marcas.find(m => m.id === marcaId);
    return marca ? marca.nome : 'Marca não encontrada';
  }



  abrirModal(novo = true, reparacao?: any) {
    this.editando = !novo;
    this.showModal = true;
    this.selectedEquipamentos = [];

    if (novo) {
      this.reparacaoSelecionadaId = null;
      this.form.reset();
    } else if (reparacao) {
      this.reparacaoSelecionadaId = reparacao.id;
      this.form.patchValue({
        empresaId: reparacao.empresaId,
        tecnicoGSIId: reparacao.tecnicoGSIId,
        avaria: reparacao.avaria,
        dataEnvioReparacao: reparacao.dataEnvioReparacao,
        dataPrevistaDevolucao: reparacao.dataPrevistaDevolucao,
        dataDevolucao: reparacao.dataDevolucao,
        marcaId: null,
        equipamentoId: null
      });

      this.itemsReparacaoService.listarPorReparacao(reparacao.id).subscribe({
        next: (itens: any[]) => {
          if (itens.length > 0) {
            const equipamento = this.equipamentosDisponiveis.find(e => e.id === itens[0].equipamentoId);
            if (equipamento) {
              const modelo = this.modelos.find(m => m.id === equipamento.modeloId);
              if (modelo) {
                // Definir a marca primeiro
                this.form.patchValue({
                  marcaId: modelo.marcaId
                });
                // Filtrar equipamentos pela marca
                this.filtrarEquipamentosPorMarca(modelo.marcaId);
                // Depois definir o equipamento
                setTimeout(() => {
                  this.form.patchValue({
                    equipamentoId: itens[0].equipamentoId
                  });
                }, 100);
              }
            }
          }
        },
        error: (err: any) => {
          console.error('Erro ao carregar itens da reparação:', err);
        }
      });
    }
  }



  salvar() {
    if (this.form.invalid) return;

    const dados = this.form.value;

    if (this.editando && this.reparacaoSelecionadaId !== null) {
      this.reparacaoService.atualizar(this.reparacaoSelecionadaId, dados).subscribe({
        next: () => {
          this.salvarItensReparacao(this.reparacaoSelecionadaId!);
          this.carregarReparacoes();
          this.fecharModal();
        },
        error: (err: any) => {
          console.error('Erro ao atualizar reparação:', err);
          alert('Erro ao atualizar reparação');
        }
      });
    } else {
      this.reparacaoService.criar(dados).subscribe({
        next: (reparacao: any) => {
          this.salvarItensReparacao(reparacao.id);
          this.carregarReparacoes();
          this.fecharModal();
        },
        error: (err: any) => {
          console.error('Erro ao criar reparação:', err);
          alert('Erro ao criar reparação');
        }
      });
    }
  }

  salvarItensReparacao(reparacaoId: number) {
    const equipamentoId = this.form.get('equipamentoId')?.value;
    if (equipamentoId) {
      const novoItem = {
        reparacaoId,
        equipamentoId: equipamentoId,
        dataAlocacao: new Date()
      };
      this.itemsReparacaoService.criar(novoItem).subscribe();
    }
  }

  fecharModal() {
    this.showModal = false;
    this.form.reset();
    this.form.get('equipamentoId')?.disable(); // Garantir que equipamento inicie desabilitado
    this.reparacaoSelecionadaId = null;
    this.selectedEquipamentos = [];
    this.dropdownAberto = false;
    this.dropdownEquipamentoAberto = false;
  }



  getModeloNome(modeloId: number): string {
    const modelo = this.modelos.find(m => m.id === modeloId);
    return modelo ? modelo.nome : '---';
  }



  excluir(id: number) {
    if (confirm('Tem certeza que deseja remover esta reparação?')) {
      this.reparacaoService.remover(id).subscribe({
        next: () => this.carregarReparacoes(),
        error: (err: any) => {
          console.error('Erro ao remover reparação:', err);
          alert('Erro ao remover reparação');
        }
      });
    }
  }

  getReparacoesFiltradas() {
    return this.reparacoes
      .filter(r => {
        return (!this.filtroEmpresa || r.empresaId === this.filtroEmpresa) &&
               (!this.filtroTecnico || r.tecnicoGSIId === this.filtroTecnico);
      })
      .sort((a: any, b: any) => {
        const da = a?.dataEnvioReparacao ? new Date(a.dataEnvioReparacao).getTime() : 0;
        const db = b?.dataEnvioReparacao ? new Date(b.dataEnvioReparacao).getTime() : 0;
        if (db !== da) return db - da; // mais recentes primeiro
        const ia = typeof a?.id === 'number' ? a.id : 0;
        const ib = typeof b?.id === 'number' ? b.id : 0;
        return ib - ia; // fallback por ID
      });
  }

  getEmpresaNome(id: number): string {
    const empresa = this.empresas.find(e => e.id === id);
    return empresa ? empresa.designacao : '---';
  }

  getTecnicoNome(id: number): string {
    const tecnico = this.tecnicos.find(t => t.id === id);
    return tecnico ? tecnico.nome : '---';
  }

  toggleDropdown(): void {
    console.log('Toggle dropdown chamado. Estado atual:', this.dropdownAberto);
    this.dropdownAberto = !this.dropdownAberto;
    console.log('Novo estado do dropdown:', this.dropdownAberto);
    console.log('Marcas disponíveis:', this.marcas.length);
  }

  toggleDropdownEquipamento(): void {
    this.dropdownEquipamentoAberto = !this.dropdownEquipamentoAberto;
  }

  selecionarMarca(marca: any): void {
    console.log('🎯 Marca selecionada:', marca);
    console.log('📊 Estado atual - Equipamentos disponíveis:', this.equipamentosDisponiveis.length, this.equipamentosDisponiveis);
    console.log('📊 Estado atual - Modelos:', this.modelos.length, this.modelos);
    console.log('📊 Estado atual - Marcas:', this.marcas.length, this.marcas);
    
    // Reset equipamento quando marca muda
    this.form.patchValue({ equipamentoId: null });
    
    if (marca) {
      this.form.patchValue({ marcaId: marca.id });
      console.log('✅ Marca ID definido no form:', marca.id);
      this.filtrarEquipamentosPorMarca(marca.id);
      console.log('🔍 Após filtrar - Equipamentos filtrados:', this.equipamentosFiltrados.length, this.equipamentosFiltrados);
    } else {
      this.form.patchValue({ marcaId: null });
      console.log('🔄 Marca resetada');
      this.filtrarEquipamentosPorMarca(null);
    }
    this.dropdownAberto = false;
  }

  getMarcaSelecionada(): string {
    const marcaId = this.form.get('marcaId')?.value;
    if (marcaId) {
      const marca = this.marcas.find(m => m.id === marcaId);
      return marca ? marca.nome : '';
    }
    return '';
  }

  selecionarEquipamento(equipamento: any): void {
    console.log('Equipamento selecionado:', equipamento);
    if (equipamento) {
      this.form.patchValue({ equipamentoId: equipamento.id });
      console.log('Equipamento ID definido no form:', equipamento.id);
    } else {
      this.form.patchValue({ equipamentoId: null });
      console.log('Equipamento resetado');
    }
    this.dropdownEquipamentoAberto = false;
  }

  getEquipamentoSelecionado(): string {
    const equipamentoId = this.form.get('equipamentoId')?.value;
    if (equipamentoId) {
      const equipamento = this.equipamentosFiltrados.find(e => e.id === equipamentoId);
      if (equipamento) {
        return `${equipamento.numeroSerie} - ${this.getModeloNome(equipamento.modeloId)}`;
      }
    }
    return '';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.custom-dropdown');
    if (!dropdown) {
      if (this.dropdownAberto) {
        this.dropdownAberto = false;
      }
      if (this.dropdownEquipamentoAberto) {
        this.dropdownEquipamentoAberto = false;
      }
    }
  }
}
