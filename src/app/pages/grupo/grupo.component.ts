import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { GrupoService } from '../../services/grupo.service';
import { AuthService } from '../../services/auth.service';
import { ErrorHandlerService } from '../../services/error-handler.service';

@Component({
  standalone: true,
  selector: 'app-grupo',
  templateUrl: './grupo.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgSelectModule],
  styleUrls: ['./grupo.component.scss']
})
export class GrupoComponent implements OnInit {
  grupos: any[] = [];
  form: FormGroup;
  showModal = false;
  editando = false;
  grupoSelecionadoId: number | null = null;
  // Filtro via ng-select (igual ao componente de Empresas)
  filtroGrupoId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private grupoService: GrupoService,
    private authService: AuthService,
    private errorHandler: ErrorHandlerService
  ) {
    this.form = this.fb.group({
      nome: ['', Validators.required]
      // Removido: descricao
    });
  }

  ngOnInit(): void {
    this.carregarGrupos();
  }

  carregarGrupos() {
    this.grupoService.listar().subscribe({
      next: (dados) => this.grupos = dados,
      error: (erro) => console.error('Erro ao buscar grupos:', erro)
    });
  }

  abrirModal(novo = true, grupo?: any) {
    this.editando = !novo;
    this.showModal = true;

    if (novo) {
      this.grupoSelecionadoId = null;
      this.form.reset();
    } else {
      this.grupoSelecionadoId = grupo.id;
      this.form.patchValue({
        nome: grupo.nome
        // descricao removido
      });
    }
  }

  fecharModal() {
    this.showModal = false;
    this.form.reset();
    this.grupoSelecionadoId = null;
  }

  salvar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dados = this.form.value;

    if (this.editando && this.grupoSelecionadoId !== null) {
      this.grupoService.atualizar(this.grupoSelecionadoId, dados).subscribe({
        next: () => {
          this.carregarGrupos();
          this.fecharModal();
        },
        error: (err) => {
          console.error('Erro ao atualizar grupo:', err);
          alert('Erro ao atualizar grupo');
        }
      });
    } else {
      this.grupoService.criar(dados).subscribe({
        next: (novoGrupo) => {
          this.grupos.push(novoGrupo);
          this.fecharModal();
        },
        error: (err) => {
          console.error('Erro ao criar grupo:', err);
          alert('Erro ao salvar grupo');
        }
      });
    }
  }

  getGruposFiltrados() {
    // Quando um ID é selecionado no filtro, retorna apenas esse grupo; caso contrário, retorna todos
    if (this.filtroGrupoId) {
      return this.grupos.filter(g => g.id === this.filtroGrupoId);
    }
    return this.grupos;
  }

  excluir(id: number) {
    // Verificar se o usuário tem a role ADMIN antes de tentar excluir
    if (!this.authService.hasRole('ADMIN')) {
      this.errorHandler.showError({
        title: 'Permissão Negada',
        message: 'Você não tem permissão para excluir grupos. É necessário ter a role ADMIN.',
        type: 'error'
      });
      return;
    }
    
    if (confirm('Tem certeza que deseja remover este grupo?')) {
      this.grupoService.remover(id).subscribe({
        next: () => this.grupos = this.grupos.filter(g => g.id !== id),
        error: (err) => console.error('Erro ao excluir grupo:', err)
      });
    }
  }
}