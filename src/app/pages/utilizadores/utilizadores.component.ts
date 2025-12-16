import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { UtilizadorService } from '../../services/utilizador.service';
import { UnidadeService } from '../../services/unidade.service';
import { GrupoService } from '../../services/grupo.service';

@Component({
  standalone: true,
  selector: 'app-utilizadores',
  templateUrl: './utilizadores.component.html',
  styleUrls: ['./utilizadores.component.scss'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgSelectModule]
})
export class UtilizadoresComponent implements OnInit {
  utilizadores: any[] = [];
  unidades: any[] = [];
  grupos: any[] = [];

  filtroNome: string = '';
  // Novo: filtro via ng-select (igual ao componente de Alocações)
  filtroUtilizadorId: number | null = null;

  form: FormGroup;
  showModal = false;
  editando = false;
  selecionadoId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private utilizadorService: UtilizadorService,
    private unidadeService: UnidadeService,
    private grupoService: GrupoService
  ) {
    this.form = this.fb.group({
      nome: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefone: ['', Validators.required],
      cargo: ['', Validators.required],
      unidadeId: [null, Validators.required],
      gruposIds: [[], Validators.required]
    });
  }

  ngOnInit(): void {
    this.carregarUtilizadores();
    this.carregarUnidades();
    this.carregarGrupos();
  }

  carregarUtilizadores() {
    this.utilizadorService.listar().subscribe({
      next: (data) => this.utilizadores = data,
      error: (err) => console.error('Erro ao carregar utilizadores', err)
    });
  }

  carregarUnidades() {
    this.unidadeService.listar().subscribe({
      next: (data) => this.unidades = data
    });
  }

  carregarGrupos() {
    this.grupoService.listar().subscribe({
      next: (data) => this.grupos = data
    });
  }

  abrirModal(novo = true, user?: any) {
    this.editando = !novo;
    this.showModal = true;

    if (novo) {
      this.selecionadoId = null;
      this.form.reset();
    } else {
      this.selecionadoId = user.id;
      this.form.patchValue(user);
    }
  }

  fecharModal() {
    this.form.reset();
    this.showModal = false;
    this.selecionadoId = null;
  }

  salvar() {
    if (this.form.invalid) return;
    const dados = this.form.value;

    if (this.editando && this.selecionadoId !== null) {
      this.utilizadorService.atualizar(this.selecionadoId, dados).subscribe({
        next: () => {
          this.carregarUtilizadores();
          this.fecharModal();
        },
        error: (err) => console.error('Erro ao atualizar', err)
      });
    } else {
      this.utilizadorService.criar(dados).subscribe({
        next: () => {
          this.carregarUtilizadores();
          this.fecharModal();
        },
        error: (err) => console.error('Erro ao criar', err)
      });
    }
  }

  excluir(id: number) {
    if (confirm('Tem certeza que deseja remover?')) {
      this.utilizadorService.remover(id).subscribe({
        next: () => this.utilizadores = this.utilizadores.filter(u => u.id !== id)
      });
    }
  }

  getUtilizadoresFiltrados() {
    // Se houver um utilizador selecionado no ng-select, filtra por ele
    if (this.filtroUtilizadorId) {
      return this.utilizadores.filter(u => u.id === this.filtroUtilizadorId);
    }
    // Caso contrário, mantém compatibilidade com filtro por texto
    if (this.filtroNome && this.filtroNome.trim().length > 0) {
      const busca = this.filtroNome.toLowerCase();
      return this.utilizadores.filter(u => u.nome && u.nome.toLowerCase().includes(busca));
    }
    // Sem filtro, retorna todos
    return this.utilizadores;
  }

  getUnidadeNome(id: number): string {
    if (!id) return '---';
    const unidade = this.unidades.find(u => u.id === id);
    return unidade ? unidade.nome : '---';
  }

  getGruposNomes(ids: number[]): string {
    return this.grupos.filter(g => ids.includes(g.id)).map(g => g.nome).join(', ');
  }
}
