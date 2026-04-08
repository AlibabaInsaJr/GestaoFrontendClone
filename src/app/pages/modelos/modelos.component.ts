import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ModeloService } from '../../services/modelo.service';
import { MarcaService } from '../../services/marca.service';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-modelos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgSelectModule],
  templateUrl: './modelos.component.html',
  styleUrls: ['./modelos.component.scss']
})
export class ModelosComponent implements OnInit {
  modelos: any[] = [];
  marcas: any[] = [];
  filtroNome: string = '';

  form: FormGroup;
  showModal = false;
  editando = false;
  modeloSelecionadoId: number | null = null;
  filtroModeloId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private modeloService: ModeloService,
    private marcaService: MarcaService
  ) {
    this.form = this.fb.group({
      nome: ['', Validators.required],
      dataRegisto: ['', Validators.required],
      marcaId: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.carregarModelos();
    this.carregarMarcas();
  }

  carregarModelos(): void {
    this.modeloService.listar().subscribe({
      next: (dados) => this.modelos = dados,
      error: (erro) => console.error('Erro ao buscar modelos:', erro)
    });
  }

  carregarMarcas(): void {
    this.marcaService.listar().subscribe({
      next: (dados) => this.marcas = dados,
      error: (erro) => console.error('Erro ao buscar marcas:', erro)
    });
  }

  abrirModal(novo = true, modelo?: any) {
    this.editando = !novo;
    this.showModal = true;

    if (novo) {
      this.modeloSelecionadoId = null;
      this.form.reset();
    } else {
      this.modeloSelecionadoId = modelo.id;
      this.form.patchValue({
        nome: modelo.nome,
        dataRegisto: modelo.dataRegisto,
        marcaId: modelo.marcaId
      });
    }
  }

  fecharModal() {
    this.showModal = false;
    this.form.reset();
    this.modeloSelecionadoId = null;
  }

  salvar() {
    if (this.form.invalid) return;

    const dados = this.form.value;

    if (this.editando && this.modeloSelecionadoId !== null) {
      this.modeloService.atualizar(this.modeloSelecionadoId, dados).subscribe({
        next: () => {
          this.carregarModelos();
          this.fecharModal();
        },
        error: (err) => {
          console.error('Erro ao atualizar modelo:', err);
          alert('Erro ao atualizar modelo');
        }
      });
    } else {
      this.modeloService.criar(dados).subscribe({
        next: (novoModelo) => {
          this.modelos.push(novoModelo);
          this.fecharModal();
        },
        error: (err) => {
          console.error('Erro ao criar modelo:', err);
          alert('Erro ao salvar modelo');
        }
      });
    }
  }

  excluir(id: number) {
    if (confirm('Tem certeza que deseja remover este modelo?')) {
      this.modeloService.remover(id).subscribe({
        next: () => this.modelos = this.modelos.filter(m => m.id !== id),
        error: (err) => console.error('Erro ao remover modelo:', err)
      });
    }
  }


  getModeloFiltrado() {
    return this.modelos.filter(m => {
      return !this.filtroModeloId || m.id === this.filtroModeloId;
    });
  }
  

  getMarcaNome(id: number): string {
    const marca = this.marcas.find(m => m.id === id);
    return marca ? marca.nome : '---';
  }
}