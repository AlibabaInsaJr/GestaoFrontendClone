import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AquisicaoService } from '../../../services/aquicicao.service';
import { EmpresaService } from '../../../services/empresa.service';
import { EquipamentoService } from '../../../services/equipamento.service';
import { Location } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import { FileUploadService } from '../../../services/file-upload.service';

@Component({
  selector: 'app-detalhes-aquisicao',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, NgSelectModule],
  templateUrl: './detalhes-aquisicao.component.html',
  styleUrls: ['./detalhes-aquisicao.component.scss']
})
export class DetalhesAquisicaoComponent implements OnInit {
  aquisicaoId: number = 0;
  aquisicao: any;
  empresas: any[] = [];
  equipamentos: any[] = [];
  modelos: any[] = [];
  tipos: any[] = [];
  
  showModalEquipamento = false;
  formEquipamento: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private aquisicaoService: AquisicaoService,
    private equipamentoService: EquipamentoService,
    private empresaService: EmpresaService,
    private location: Location,
    private fb: FormBuilder,
    private fileUploadService: FileUploadService,
  ) {
    this.formEquipamento = this.fb.group({
      modelo_id: [null, Validators.required],
      tipoEquipamento_id: [null, Validators.required],
      aquisicao_id: [null, Validators.required],
      numeroSerie: ['', Validators.required],
      dataRegisto: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.aquisicaoId = +this.route.snapshot.paramMap.get('id')!;
    this.carregarAquisicao();
    this.carregarEmpresas();
    this.carregarEquipamentosDaAquisicao();
    this.carregarModelos();
    this.carregarTipos();
  }

  carregarAquisicao() {
    this.aquisicaoService.buscarPorId(this.aquisicaoId).subscribe({
      next: (dados) => {
        this.aquisicao = dados;
        // garantir que o campo de aquisição é preenchido no formulário
        this.formEquipamento.patchValue({ aquisicao_id: this.aquisicaoId });
      },
      error: (err) => console.error('Erro ao buscar aquisição:', err)
    });
  }

  carregarEmpresas() {
    this.empresaService.listar().subscribe({
      next: (dados) => this.empresas = dados,
      error: (err) => console.error('Erro ao buscar empresas:', err)
    });
  }

  carregarEquipamentosDaAquisicao() {
    this.equipamentoService.listarEquipamentos().subscribe({
      next: (dados) => {
        this.equipamentos = dados.filter(e => e.aquisicaoId === this.aquisicaoId);
      },
      error: (err) => console.error('Erro ao buscar equipamentos:', err)
    });
  }

  getEmpresaNome(id: number): string {
    const empresa = this.empresas.find(e => e.id === id);
    return empresa ? empresa.designacao : '---';
  }

  carregarModelos() {
    this.equipamentoService.listarModelos().subscribe({
      next: (dados) => this.modelos = dados,
      error: (err) => console.error('Erro ao carregar modelos:', err)
    });
  }

  carregarTipos() {
    this.equipamentoService.listarTipos().subscribe({
      next: (dados) => this.tipos = dados,
      error: (err) => console.error('Erro ao carregar tipos:', err)
    });
  }

  abrirModalEquipamento() {
    this.showModalEquipamento = true;
    this.formEquipamento.reset();
    // preencher aquisição com o contexto atual
    this.formEquipamento.patchValue({ aquisicao_id: this.aquisicaoId });
  }

  fecharModalEquipamento() {
    this.showModalEquipamento = false;
    this.formEquipamento.reset();
  }

  salvarEquipamento() {
    if (this.formEquipamento.invalid) return;

    const dados = {
      modeloId: this.formEquipamento.value.modelo_id,
      tipoEquipamentoId: this.formEquipamento.value.tipoEquipamento_id,
      aquisicaoId: this.aquisicaoId,
      numeroSerie: this.formEquipamento.value.numeroSerie,
      dataRegisto: this.formEquipamento.value.dataRegisto
    };

    this.equipamentoService.criarEquipamento(dados).subscribe({
      next: (novoEquipamento) => {
        this.equipamentos.push(novoEquipamento);
        this.fecharModalEquipamento();
        console.log('Equipamento criado com sucesso');
      },
      error: (err) => {
        console.error('Erro ao criar equipamento:', err);
        alert('Erro ao salvar equipamento');
      }
    });
  }

  voltar() {
    this.location.back();
  }

  // Força download via API para garantir acesso mesmo quando o caminho não é público
  downloadContrato(): void {
    const path = this.aquisicao?.pathContracto;
    if (!path) { return; }

    this.fileUploadService.downloadFile(path).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.getDownloadFileName(path);
        a.click();
        setTimeout(() => window.URL.revokeObjectURL(url), 1500);
      },
      error: (err) => {
        console.error('Falha ao descarregar contrato:', err);
        alert('Não foi possível descarregar o contrato. Tente novamente mais tarde.');
      }
    });
  }

  // Gera um nome de ficheiro a partir do caminho, usado pelo atributo HTML 'download'
  getDownloadFileName(path?: string): string {
    if (!path) return 'contrato';
    try {
      const last = path.split('/').pop() || 'contrato';
      return (last.split('?')[0] || 'contrato') || 'contrato';
    } catch {
      return 'contrato';
    }
  }
}
