import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AquisicaoService } from '../../services/aquicicao.service';
import { MarcaService } from '../../services/marca.service';
import { ModeloService } from '../../services/modelo.service';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { FileUploadService, FileUploadResponse } from '../../services/file-upload.service';


@Component({
  standalone: true,
  selector: 'app-aquisicoes',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, FileUploadComponent, NgSelectModule],
  templateUrl: './aquisicoes.component.html',
  styleUrls: ['./aquisicoes.component.scss']
})
export class AquisicoesComponent implements OnInit {
  aquisicoes: any[] = [];
  concursos: string[] = [];
  empresas: any[] = [];
  marcas: any[] = [];
  modelos: any[] = [];
  modelosPorMarca: any[] = [];
  filtroEmpresa: number | null = null;
  filtroNumeroConcurso: string | null = null;
  selectedMarca: number | null = null;
  selectedModelos: number[] = [];

  form: FormGroup;
  showModal = false;
  editando = false;
  aquisicaoSelecionadaId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private aquisicaoService: AquisicaoService,
    private marcaService: MarcaService,
    private modeloService: ModeloService,
    private fileUploadService: FileUploadService
  ) {
    this.form = this.fb.group({
      descricao: ['', Validators.required],
      dataAquisicao: ['', Validators.required],
      numeroConcurso: ['', Validators.required],
      pathContracto: [''],
      empresaId: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.carregarAquisicoes();
    this.carregarEmpresas();
    this.carregarMarcas();
    this.carregarModelos();
  }

  carregarAquisicoes(): void {
    this.aquisicaoService.listarTodas().subscribe({
      next: (dados) => {
        this.aquisicoes = dados || [];
        this.atualizarConcursos();
      },
      error: (erro) => console.error('Erro ao buscar aquisições:', erro)
    });
  }

  carregarEmpresas(): void {
    this.aquisicaoService.listarEmpresas().subscribe({
      next: (dados) => this.empresas = dados,
      error: (erro) => console.error('Erro ao buscar empresas:', erro)
    });
  }

  carregarMarcas(): void {
    this.marcaService.listar().subscribe({
      next: (dados) => this.marcas = dados,
      error: (erro) => console.error('Erro ao buscar marcas:', erro)
    });
  }
  
  carregarModelos(): void {
    this.modeloService.listar().subscribe({
      next: (dados) => this.modelos = dados,
      error: (erro) => console.error('Erro ao buscar modelos:', erro)
    });
  }

  onMarcaChange(marcaId: number): void {
    this.selectedMarca = marcaId;
    this.selectedModelos = [];
    this.modelosPorMarca = [];
    
    if (marcaId) {
      this.modeloService.listarPorMarca(marcaId).subscribe({
        next: (dados: any[]) => this.modelosPorMarca = dados,
        error: (err) => console.error('Erro ao carregar modelos da marca:', err)
      });
    }
  }

  toggleModeloSelecionado(modeloId: number, event: any): void {
    if (event.target.checked) {
      this.selectedModelos.push(modeloId);
    } else {
      this.selectedModelos = this.selectedModelos.filter(id => id !== modeloId);
    }
  }

  abrirModal(novo = true, aquisicao?: any): void {
    this.editando = !novo;
    this.showModal = true;

    if (novo) {
      this.aquisicaoSelecionadaId = null;
      this.form.reset();
      this.selectedMarca = null;
      this.selectedModelos = [];
      this.modelosPorMarca = [];
    } else {
      this.aquisicaoSelecionadaId = aquisicao.id;
      this.form.patchValue(aquisicao);
      this.selectedMarca = null;
      this.selectedModelos = [];
      this.modelosPorMarca = [];
    }
  }

  fecharModal(): void {
    this.showModal = false;
    this.form.reset();
    this.aquisicaoSelecionadaId = null;
    this.selectedMarca = null;
    this.selectedModelos = [];
    this.modelosPorMarca = [];
  }

  salvar(): void {
    if (this.form.invalid) return;

    const dados = this.form.value;
    const arquivo: File | string | null = this.form.get('pathContracto')?.value || null;

    const continuarSalvar = (url?: string) => {
      if (url) {
        dados.pathContracto = url;
      }

      if (this.editando && this.aquisicaoSelecionadaId !== null) {
        this.aquisicaoService.atualizar(this.aquisicaoSelecionadaId, dados).subscribe({
          next: () => {
            this.carregarAquisicoes();
            this.fecharModal();
          },
          error: (err) => console.error('Erro ao atualizar:', err)
        });
      } else {
        this.aquisicaoService.criar(dados).subscribe({
          next: () => {
            this.carregarAquisicoes();
            this.fecharModal();
          },
          error: (err) => console.error('Erro ao criar aquisição:', err)
        });
      }
    };

    if (arquivo && arquivo instanceof File) {
      this.fileUploadService.uploadFile(arquivo, 'contratos').subscribe({
        next: (res: FileUploadResponse) => {
          if (res.success && res.filePath) {
            continuarSalvar(res.filePath);
          }
        },
        error: (err) => {
          console.error('Falha no upload do contrato:', err);
          continuarSalvar();
        },
        complete: () => {}
      });
    } else {
      continuarSalvar(typeof arquivo === 'string' ? arquivo : undefined);
    }
  }

  excluir(id: number): void {
    if (confirm('Tem certeza que deseja remover esta aquisição?')) {
      this.aquisicaoService.remover(id).subscribe({
        next: () => {
          this.aquisicoes = this.aquisicoes.filter(a => a.id !== id);
          this.atualizarConcursos();
        },
        error: (err) => console.error('Erro ao remover aquisição:', err)
      });
    }
  }

  getEmpresaNome(id: number): string {
    const empresa = this.empresas.find(e => e.id === id);
    return empresa ? empresa.designacao : '---';
  }

  getEquipamentosParaReparacao(aquisicaoId: number): string {
    // Por enquanto retorna uma mensagem padrão
    // Esta funcionalidade pode ser expandida para mostrar os equipamentos reais associados
    if (this.selectedModelos.length > 0) {
      const modelosNomes = this.selectedModelos.map(id => {
        const modelo = this.modelosPorMarca.find(m => m.id === id);
        return modelo ? modelo.nome : 'Modelo ' + id;
      });
      return modelosNomes.join(', ');
    }
    return 'Nenhum equipamento selecionado';
  }

  getAquisicoesFiltradas(): any[] {
    const filtroEmpresa = this.filtroEmpresa;
    const filtroConcurso = (this.filtroNumeroConcurso || '').toString().trim().toLowerCase();

    return (this.aquisicoes || []).filter(a => {
      const empresaValida = !filtroEmpresa || a.empresaId === filtroEmpresa;
      const concursoAtual = (a.numeroConcurso || '').toString().trim().toLowerCase();
      const concursoValido = !this.filtroNumeroConcurso || concursoAtual === filtroConcurso;

      return empresaValida && concursoValido;
    });
  }

  private atualizarConcursos(): void {
    const valores = (this.aquisicoes || [])
      .map(a => (a?.numeroConcurso ?? '').toString().trim())
      .filter(v => v.length > 0);
    this.concursos = Array.from(new Set(valores)).sort();
  }

  onFileError(error: string): void {
    console.error('Erro no upload do arquivo:', error);
  }
}9