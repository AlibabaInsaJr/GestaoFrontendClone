import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UtilizadorService } from '../../../services/utilizador.service';
import { GrupoService } from '../../../services/grupo.service';
import { UnidadeService } from '../../../services/unidade.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-detalhes-utilizador',
  standalone: true,
  imports: [CommonModule, RouterModule],
  styleUrls: ['./detalhes-utilizador.component.scss'],
  templateUrl: './detalhes-utilizador.component.html',
})
export class DetalhesUtilizadorComponent implements OnInit {
  utilizadorId: number = 0;
  utilizador: any;
  gruposUtilizador: any[] = [];
  unidades: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private utilizadorService: UtilizadorService,
    private grupoService: GrupoService,
    private unidadeService: UnidadeService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.utilizadorId = +this.route.snapshot.paramMap.get('id')!;
    this.carregarUtilizador();
    this.carregarUnidades();
  }

  carregarUtilizador() {
    this.utilizadorService.buscarPorId(this.utilizadorId).subscribe({
      next: (dados) => {
        this.utilizador = dados;
        if (dados.gruposIds?.length > 0) {
          this.grupoService.listar().subscribe({
            next: (todosGrupos) => {
              this.gruposUtilizador = todosGrupos.filter(g =>
                dados.gruposIds.includes(g.id)
              );
            },
            error: (err) => console.error('Erro ao buscar grupos:', err)
          });
        }
      },
      error: (err) => console.error('Erro ao buscar utilizador:', err)
    });
  }

  carregarUnidades() {
    this.unidadeService.listar().subscribe({
      next: (dados) => this.unidades = dados,
      error: (err) => console.error('Erro ao buscar unidades:', err)
    });
  }

  getUnidadeNome(id: number): string {
    if (!id) return '---';
    const unidade = this.unidades.find(u => u.id === id);
    return unidade ? unidade.nome : '---';
  }

  voltar() {
    this.location.back();
  }
}
