import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EmpresaService } from '../../../services/empresa.service';
import { AquisicaoService } from '../../../services/aquicicao.service'; 
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-detalhes-empresa',
  standalone: true,
  templateUrl: './detalhes-empresa.component.html',
  styleUrls: ['./detalhes-empresa.component.scss'],
  imports: [CommonModule, RouterModule]
})
export class DetalhesEmpresaComponent implements OnInit {
  empresaId: number = 0;
  empresa: any;
  aquisicoes: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private empresaService: EmpresaService,
    private aquisicaoService: AquisicaoService
  ) {}

  ngOnInit(): void {
    this.empresaId = +this.route.snapshot.paramMap.get('id')!;
    this.carregarEmpresa();
    this.carregarAquisicoesDaEmpresa();
  }

  carregarEmpresa() {
    this.empresaService.buscarPorId(this.empresaId).subscribe({
      next: (dados) => this.empresa = dados,
      error: (err) => console.error('Erro ao buscar empresa:', err)
    });
  }

  carregarAquisicoesDaEmpresa() {
    this.aquisicaoService.listarTodas().subscribe({
      next: (dados) => {
        this.aquisicoes = dados.filter(a => a.empresaId === this.empresaId);
      },
      error: (err) => console.error('Erro ao buscar aquisições:', err)
    });
  }

  voltar() {
    window.history.back();
  }

  public toFileUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${environment.apiUrl}${p}`;
  }
}
