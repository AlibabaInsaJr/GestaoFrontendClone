import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaixasService } from '../../../services/baixas.service';
import { ItemBaixaService } from '../../../services/item-baixa.service';
import { EquipamentoService } from '../../../services/equipamento.service';
import { UtilizadorService } from '../../../services/utilizador.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-detalhes-baixa',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detalhes-baixa.component.html',
  styleUrls: ['./detalhes-baixa.component.scss']
})
export class DetalhesBaixaComponent implements OnInit {
  baixaId: number = 0;
  baixa: any;
  itens: any[] = [];
  utilizadores: any[] = [];
  equipamentosMap = new Map<number, any>();
  modelosMap = new Map<number, any>();

  constructor(
    private route: ActivatedRoute,
    private baixasService: BaixasService,
    private itemBaixaService: ItemBaixaService,
    private equipamentoService: EquipamentoService,
    private utilizadorService: UtilizadorService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.baixaId = +this.route.snapshot.paramMap.get('id')!;
    this.carregarBaixa();
    this.carregarUtilizadores();
    this.carregarEquipamentos();
    this.carregarModelos();
  }

  carregarBaixa() {
    this.baixasService.buscarPorId(this.baixaId).subscribe({
      next: (dados) => {
        this.baixa = dados;
        this.carregarItens();
      },
      error: (erro) => console.error('Erro ao buscar baixa:', erro)
    });
  }

  carregarItens() {
    this.itemBaixaService.listarPorBaixa(this.baixaId).subscribe({
      next: (itens) => {
        this.itens = itens;

        itens.forEach(item => {
          this.equipamentoService.buscarPorId(item.equipamentoId).subscribe({
            next: (equipamento) => {
              this.equipamentosMap.set(item.equipamentoId, equipamento);
            },
            error: (err) => console.error('Erro ao buscar equipamento:', err)
          });
        });
      },
      error: (err) => console.error('Erro ao buscar itens da baixa:', err)
    });
  }

  carregarEquipamentos() {
    this.equipamentoService.listarEquipamentos().subscribe({
      next: (dados) => {
        dados.forEach(eq => this.equipamentosMap.set(eq.id, eq));
      },
      error: (erro) => console.error('Erro ao buscar equipamentos:', erro)
    });
  }

  carregarModelos() {
    this.equipamentoService.listarModelos().subscribe({
      next: (dados) => {
        dados.forEach(m => this.modelosMap.set(m.id, m));
      },
      error: (erro) => console.error('Erro ao buscar modelos:', erro)
    });
  }

  carregarUtilizadores() {
    this.utilizadorService.listar().subscribe({
      next: (dados) => this.utilizadores = dados,
      error: (erro) => console.error('Erro ao buscar utilizadores:', erro)
    });
  }

  getNomeUtilizador(id: number): string {
    const u = this.utilizadores.find(u => u.id === id);
    return u ? u.nome : `ID ${id}`;
  }

  getNumeroSerie(equipamentoId: number): string {
    const eq = this.equipamentosMap.get(equipamentoId);
    return eq ? eq.numeroSerie : '---';
  }

  getModeloNome(equipamentoId: number): string {
    const eq = this.equipamentosMap.get(equipamentoId);
    if (!eq) return '---';

    const modelo = this.modelosMap.get(eq.modeloId);
    return modelo ? modelo.nome : `Modelo ${eq.modeloId}`;
  }

  voltar() {
    this.location.back();
  }
}
