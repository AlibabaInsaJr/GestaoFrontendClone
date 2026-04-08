import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MarcaService } from '../../services/marca.service';
import { NgSelectModule } from '@ng-select/ng-select';


@Component({
  selector: 'app-marcas',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgSelectModule],
  templateUrl: './marcas.component.html',
  styleUrl: './marcas.component.scss',
})
export class MarcasComponent implements OnInit {
  marcas: any[] = [];
  filtroNome: string = '';
  form: FormGroup;
  showModal = false;
  editando = false;
  marcaSelecionadaId: number | null = null;

  constructor(private fb: FormBuilder, private marcaService: MarcaService) {
    this.form = this.fb.group({
      nome: ['', Validators.required],
      dataRegisto: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.carregarMarcas();
  }

  carregarMarcas(): void {
    this.marcaService.listar().subscribe({
      next: (dados) => this.marcas = dados,
      error: (erro) => console.error('Erro ao buscar marcas:', erro)
    });
  }

  abrirModal(novo = true, marca?: any) {
    this.editando = !novo;
    this.showModal = true;

    if (novo) {
      this.marcaSelecionadaId = null;
      this.form.reset();
    } else {
      this.marcaSelecionadaId = marca.id;
      this.form.patchValue({
        nome: marca.nome,
        dataRegisto: marca.dataRegisto
      });
    }
  }

  fecharModal() {
    this.showModal = false;
    this.form.reset();
    this.marcaSelecionadaId = null;
  }

  salvar() {
    if (this.form.invalid) return;

    const dados = this.form.value;

    if (this.editando && this.marcaSelecionadaId !== null) {
      this.marcaService.atualizar(this.marcaSelecionadaId, dados).subscribe({
        next: (marcaAtualizada) => {
          const index = this.marcas.findIndex(m => m.id === this.marcaSelecionadaId);
          if (index !== -1) this.marcas[index] = marcaAtualizada;
          this.fecharModal();
        },
        error: (err) => console.error('Erro ao atualizar marca:', err)
      });
    } else {
      this.marcaService.criar(dados).subscribe({
        next: (novaMarca) => {
          this.marcas.push(novaMarca);
          this.fecharModal();
        },
        error: (err) => console.error('Erro ao criar marca:', err)
      });
    }
  }

  excluir(id: number) {
    if (confirm('Tem certeza que deseja remover esta marca?')) {
      this.marcaService.remover(id).subscribe({
        next: () => this.marcas = this.marcas.filter(m => m.id !== id),
        error: (err) => console.error('Erro ao remover marca:', err)
      });
    }
  }

  getMarcasFiltradas() {
    return this.marcas.filter(m =>
      !this.filtroNome || m.nome.toLowerCase().includes(this.filtroNome.toLowerCase())
    );
  }
}