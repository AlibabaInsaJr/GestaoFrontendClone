import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GrupoService } from '../../../services/grupo.service';
import { UtilizadorService } from '../../../services/utilizador.service';

@Component({
  selector: 'app-detalhes-grupo',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detalhes-grupo.component.html',
  styleUrls: ['./detalhes-grupo.component.scss']
})
export class DetalhesGrupoComponent implements OnInit {
  grupoId: number = 0;
  grupo: any;
  utilizadoresGrupo: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private grupoService: GrupoService,
    private utilizadorService: UtilizadorService
  ) {}

  ngOnInit(): void {
    this.grupoId = +this.route.snapshot.paramMap.get('id')!;
    this.carregarGrupo();
    this.carregarUtilizadoresGrupo();
  }

  carregarGrupo() {
    this.grupoService.buscarPorId(this.grupoId).subscribe({
      next: (dados) => {
        this.grupo = dados;
        console.log('Grupo carregado:', dados);
      },
      error: (err) => console.error('Erro ao buscar grupo:', err)
    });
  }

  carregarUtilizadoresGrupo() {
    this.utilizadorService.listar().subscribe({
      next: (dados) => {
        this.utilizadoresGrupo = dados.filter(u => u.gruposIds?.includes(this.grupoId));
        console.log('Utilizadores no grupo:', this.utilizadoresGrupo);
      },
      error: (err) => console.error('Erro ao buscar utilizadores:', err)
    });
  }

  voltar() {
    window.history.back();
  }
}
