import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ModeloService } from '../../../services/modelo.service';
import { EquipamentoService } from '../../../services/equipamento.service';

@Component({
  selector: 'app-detalhes-modelo',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detalhes-modelo.component.html',
  styleUrls: ['./detalhes-modelo.component.scss']
})
export class DetalhesModeloComponent implements OnInit {
  modeloId: number = 0;
  modelo: any;
  equipamentos: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private modeloService: ModeloService,
    private equipamentoService: EquipamentoService
  ) {}

  ngOnInit(): void {
    this.modeloId = +this.route.snapshot.paramMap.get('id')!;
    this.carregarModelo();
    this.carregarEquipamentosDoModelo();
  }

  carregarModelo() {
    this.modeloService.buscarPorId(this.modeloId).subscribe({
      next: (dados) => this.modelo = dados,
      error: (err) => console.error('Erro ao buscar modelo:', err)
    });
  }

  carregarEquipamentosDoModelo() {
    this.equipamentoService.listarEquipamentos().subscribe({
      next: (dados) => {
        this.equipamentos = dados.filter(e => e.modeloId === this.modeloId);
      },
      error: (err) => console.error('Erro ao buscar equipamentos do modelo:', err)
    });
  }

  voltar() {
    window.history.back();
  }
}
