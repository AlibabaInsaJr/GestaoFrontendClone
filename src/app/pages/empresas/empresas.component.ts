import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EmpresaService } from '../../services/empresa.service';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  standalone: true,
  selector: 'app-empresas',
  templateUrl: './empresas.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgSelectModule],
  styleUrls: ['./empresas.component.scss']
})
export class EmpresasComponent implements OnInit {
  empresas: any[] = [];
  filtroDesignacao: string = '';
  filtroEmpresaId: number | null = null;

  form: FormGroup;
  showModal = false;
  editando = false;
  empresaSelecionadaId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private empresaService: EmpresaService
  ) {
    this.form = this.fb.group({
      designacao: ['', Validators.required],
      descricao: ['', Validators.required],
      telefone: ['', Validators.required],
      endereco: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.carregarEmpresas();
  }

  carregarEmpresas(): void {
    this.empresaService.listar().subscribe({
      next: (dados) => this.empresas = dados,
      error: (erro) => console.error('Erro ao buscar empresas:', erro)
    });
  }

  abrirModal(novo = true, empresa?: any) {
    this.editando = !novo;
    this.showModal = true;

    if (novo) {
      this.empresaSelecionadaId = null;
      this.form.reset();
    } else {
      this.empresaSelecionadaId = empresa.id;
      this.form.patchValue(empresa);
    }
  }

  fecharModal() {
    this.showModal = false;
    this.form.reset();
    this.empresaSelecionadaId = null;
  }

  salvar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dados = this.form.value;

    if (this.editando && this.empresaSelecionadaId !== null) {
      this.empresaService.atualizar(this.empresaSelecionadaId, dados).subscribe({
        next: () => {
          this.carregarEmpresas();
          this.fecharModal();
        },
        error: (err) => {
          console.error('Erro ao atualizar empresa:', err);
          alert('Erro ao atualizar empresa');
        }
      });
    } else {
      this.empresaService.criar(dados).subscribe({
        next: (novaEmpresa) => {
          this.empresas.push(novaEmpresa);
          this.fecharModal();
        },
        error: (err) => {
          console.error('Erro ao criar empresa:', err);
          alert('Erro ao salvar empresa');
        }
      });
    }
  }

  getEmpresasFiltradas() {
    // Se houver um item selecionado no ng-select, filtra por ID; caso contrário, retorna todas
    if (this.filtroEmpresaId) {
      return this.empresas.filter(e => e.id === this.filtroEmpresaId);
    }
    // Mantém também a pesquisa por texto como fallback, se necessário
    if (this.filtroDesignacao) {
      const termo = this.filtroDesignacao.toLowerCase();
      return this.empresas.filter(e => e.designacao?.toLowerCase().includes(termo));
    }
    return this.empresas;
  }

  excluir(id: number) {
    if (confirm('Tem certeza que deseja remover esta empresa?')) {
      this.empresaService.remover(id).subscribe({
        next: () => this.empresas = this.empresas.filter(e => e.id !== id),
        error: (err) => console.error('Erro ao excluir empresa:', err)
      });
    }
  }
}