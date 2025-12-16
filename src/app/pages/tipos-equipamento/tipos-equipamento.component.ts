import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TipoEquipamentoService } from '../../services/tipo-equipamento.service';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-tipos-equipamento',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgSelectModule],
  templateUrl: './tipos-equipamento.component.html',
  styleUrls: ['./tipos-equipamento.component.scss']
})
export class TiposEquipamentoComponent implements OnInit {
  tiposEquipamento: any[] = [];
  filtroNome: string | null = null;
  showModal = false;
  editando = false;
  tipoSelecionadoId: number | null = null;
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private tipoEquipamentoService: TipoEquipamentoService
  ) {
    this.form = this.fb.group({
      nome: ['', Validators.required],
      descricao: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.carregarTiposEquipamento();
  }

  carregarTiposEquipamento(): void {
    this.tipoEquipamentoService.listar().subscribe({
      next: (dados) => this.tiposEquipamento = dados,
      error: (err) => console.error('Erro ao carregar tipos de equipamento:', err)
    });
  }

  getTiposFiltrados() {
    return this.tiposEquipamento.filter(t =>
      !this.filtroNome || t.nome === this.filtroNome
    );
  }

  abrirModal(novo = true, tipo?: any) {
    this.editando = !novo;
    this.showModal = true;

    if (novo) {
      this.tipoSelecionadoId = null;
      this.form.reset();
    } else {
      this.tipoSelecionadoId = tipo.id;
      this.form.patchValue({
        nome: tipo.nome,
        descricao: tipo.descricao,
      });
    }
  }

  fecharModal() {
    this.showModal = false;
    this.form.reset();
    this.tipoSelecionadoId = null;
  }

  salvar() {
    if (this.form.invalid) return;

    const dados = {
      nome: this.form.value.nome,
      descricao: this.form.value.descricao,
    };

    if (this.editando && this.tipoSelecionadoId !== null) {
      this.tipoEquipamentoService.atualizar(this.tipoSelecionadoId, dados).subscribe({
        next: () => {
          this.carregarTiposEquipamento();
          this.fecharModal();
        },
        error: (err) => console.error('Erro ao atualizar tipo de equipamento:', err)
      });
    } else {
      this.tipoEquipamentoService.criar(dados).subscribe({
        next: (novoTipo) => {
          this.tiposEquipamento.push(novoTipo);
          this.fecharModal();
        },
        error: (err) => console.error('Erro ao criar tipo de equipamento:', err)
      });
    }
  }

  excluir(id: number) {
    if (confirm('Deseja realmente excluir este tipo de equipamento?')) {
      this.tipoEquipamentoService.remover(id).subscribe({
        next: () => {
          this.tiposEquipamento = this.tiposEquipamento.filter(t => t.id !== id);
        },
        error: (err) => console.error('Erro ao excluir tipo de equipamento:', err)
      });
    }
  }
}
