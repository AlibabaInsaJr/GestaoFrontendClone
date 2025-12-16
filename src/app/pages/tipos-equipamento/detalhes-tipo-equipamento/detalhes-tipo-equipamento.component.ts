import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TipoEquipamentoService } from '../../../services/tipo-equipamento.service';
import { EquipamentoService } from '../../../services/equipamento.service';

@Component({
  selector: 'app-detalhes-tipo-equipamento',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detalhes-tipo-equipamento.component.html',
  styleUrls: ['./detalhes-tipo-equipamento.component.scss']
})
export class DetalhesTipoEquipamentoComponent implements OnInit {
  tipoId: number = 0;
  tipo: any;

  // Lista de equipamentos pertencentes a este tipo
  equipamentosDoTipo: any[] = [];
  modelos: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private tipoService: TipoEquipamentoService,
    private equipamentoService: EquipamentoService
  ) {}

  ngOnInit(): void {
    this.tipoId = +this.route.snapshot.paramMap.get('id')!;

    // Carregar detalhes do tipo
    this.tipoService.buscarPorId(this.tipoId).subscribe({
      next: (dados) => this.tipo = dados,
      error: (err) => console.error('Erro ao carregar tipo:', err)
    });

    // Carregar todos os modelos (para mapear nome do modelo)
    this.equipamentoService.listarModelos().subscribe({
      next: (modelos) => this.modelos = modelos,
      error: (err) => console.error('Erro ao carregar modelos:', err)
    });

    // Carregar equipamentos e filtrar por tipo
    this.equipamentoService.listarEquipamentos().subscribe({
      next: (equipamentos) => {
        this.equipamentosDoTipo = equipamentos.filter(e => e.tipoEquipamentoId === this.tipoId);
      },
      error: (err) => console.error('Erro ao carregar equipamentos do tipo:', err)
    });
  }

  getModeloNome(modeloId: number): string {
    return this.modelos.find(m => m.id === modeloId)?.nome || '---';
  }

  voltar() {
    window.history.back();
  }
}
