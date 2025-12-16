import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { UnidadeService } from '../../services/unidade.service';
import { AuthService } from '../../services/auth.service';
import { ErrorHandlerService } from '../../services/error-handler.service';

@Component({
  standalone: true,
  selector: 'app-unidades',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgSelectModule],
  templateUrl: './unidades.component.html',
  styleUrls: ['./unidades.component.scss']
})
export class UnidadesComponent implements OnInit {
  unidades: any[] = [];
  form: FormGroup;
  showModal = false;
  editando = false;
  unidadeSelecionadaId: number | null = null;
  // Filtro via ng-select (igual ao componente de Empresas)
  filtroUnidadeId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private unidadeService: UnidadeService,
    private authService: AuthService,
    private errorHandler: ErrorHandlerService
  ) {
    this.form = this.fb.group({
      nome: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.carregarUnidades();
  }

  carregarUnidades() {
    this.unidadeService.listar().subscribe({
      next: (dados) => this.unidades = dados,
      error: (err) => console.error('Erro ao carregar unidades:', err)
    });
  }

  abrirModal(novo = true, unidade?: any) {
    this.editando = !novo;
    this.showModal = true;

    if (novo) {
      this.unidadeSelecionadaId = null;
      this.form.reset();
    } else {
      this.unidadeSelecionadaId = unidade.id;
      this.form.patchValue(unidade);
    }
  }

  fecharModal() {
    this.showModal = false;
    this.form.reset();
    this.unidadeSelecionadaId = null;
  }

  salvar() {
    if (this.form.invalid) return;
    const dados = this.form.value;

    if (this.editando && this.unidadeSelecionadaId !== null) {
      this.unidadeService.atualizar(this.unidadeSelecionadaId, dados).subscribe({
        next: () => {
          this.carregarUnidades();
          this.fecharModal();
        },
        error: (err) => {
          console.error('Erro ao atualizar unidade:', err);
          alert('Erro ao atualizar');
        }
      });
    } else {
      this.unidadeService.criar(dados).subscribe({
        next: (novaUnidade) => {
          this.unidades.push(novaUnidade);
          this.fecharModal();
        },
        error: (err) => {
          console.error('Erro ao criar unidade:', err);
          alert('Erro ao salvar unidade');
        }
      });
    }
  }

  excluir(id: number) {
    // Verificar se o usuário tem a role ADMIN antes de tentar excluir
    if (!this.authService.hasRole('ADMIN')) {
      this.errorHandler.showError({
        title: 'Permissão Negada',
        message: 'Você não tem permissão para excluir unidades. É necessário ter a role ADMIN.',
        type: 'error'
      });
      return;
    }
    
    if (confirm('Tem certeza que deseja remover esta unidade?')) {
      this.unidadeService.remover(id).subscribe({
        next: () => this.unidades = this.unidades.filter(u => u.id !== id),
        error: (err) => console.error('Erro ao excluir unidade:', err)
      });
    }
  }

  getUnidadesFiltradas() {
    // Quando um ID é selecionado no filtro, retorna apenas essa unidade; caso contrário, retorna todas
    if (this.filtroUnidadeId) {
      return this.unidades.filter(u => u.id === this.filtroUnidadeId);
    }
    return this.unidades;
  }
}
