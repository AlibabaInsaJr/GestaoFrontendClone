import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UnidadeService } from '../../../services/unidade.service';
import { UtilizadorService } from '../../../services/utilizador.service';
import { GrupoService } from '../../../services/grupo.service';

@Component({
  selector: 'app-detalhes-unidade',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detalhes-unidade.component.html',
  styleUrls: ['./detalhes-unidade.component.scss']
})
export class DetalhesUnidadeComponent implements OnInit {
  unidadeId: number = 0;
  unidade: any;
  utilizadoresUnidade: any[] = [];
  grupos: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private unidadeService: UnidadeService,
    private utilizadorService: UtilizadorService,
    private grupoService: GrupoService
  ) {}

  ngOnInit(): void {
    this.unidadeId = +this.route.snapshot.paramMap.get('id')!;
    this.carregarUnidade();
    this.carregarUtilizadoresComGrupos();
  }

  carregarUnidade() {
    this.unidadeService.buscarPorId(this.unidadeId).subscribe({
      next: (dados) => {
        this.unidade = dados;
      },
      error: (err) => console.error('Erro ao buscar unidade:', err)
    });
  }

  carregarUtilizadoresComGrupos() {
    this.utilizadorService.listar().subscribe({
      next: (utilizadores) => {
        const filtrados = utilizadores.filter(u => u.unidadeId === this.unidadeId);
        this.grupoService.listar().subscribe({
          next: (grupos) => {
            this.grupos = grupos;
            this.utilizadoresUnidade = filtrados;
          },
          error: (err) => console.error('Erro ao buscar grupos:', err)
        });
      },
      error: (err) => console.error('Erro ao buscar utilizadores:', err)
    });
  }

  getGruposNomes(ids: number[] | undefined | null): string {
    if (!ids || ids.length === 0) return 'Sem Grupo';
    return this.grupos
      .filter(g => ids.includes(g.id))
      .map(g => g.nome)
      .join(', ');
  }

  voltar() {
    window.history.back();
  }
}
