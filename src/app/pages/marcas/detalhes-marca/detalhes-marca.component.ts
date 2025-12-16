import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MarcaService } from '../../../services/marca.service';
import { ModeloService } from '../../../services/modelo.service';

@Component({
  selector: 'app-detalhes-marca',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detalhes-marca.component.html',
  styleUrls: ['./detalhes-marca.component.scss']
})
export class DetalhesMarcaComponent implements OnInit {
  marcaId: number = 0;
  marca: any;
  modelos: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private marcaService: MarcaService,
    private modeloService: ModeloService
  ) {}

  ngOnInit(): void {
    this.marcaId = +this.route.snapshot.paramMap.get('id')!;
    this.carregarMarca();
    this.carregarModelosDaMarca();
  }

  carregarMarca() {
    this.marcaService.buscarPorId(this.marcaId).subscribe({
      next: (dados) => this.marca = dados,
      error: (err) => console.error('Erro ao buscar marca:', err)
    });
  }

  carregarModelosDaMarca() {
    this.modeloService.listar().subscribe({
      next: (dados) => this.modelos = dados.filter(m => m.marcaId === this.marcaId),
      error: (err) => console.error('Erro ao buscar modelos da marca:', err)
    });
  }

  voltar() {
    window.history.back();
  }
}
