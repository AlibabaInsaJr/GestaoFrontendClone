import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { ReparacaoService } from '../../services/reparacao.service';
import { EmpresaService } from '../../services/empresa.service';
import { UtilizadorService } from '../../services/utilizador.service';
import { ItemsReparacaoService } from '../../services/item-reparacao.service';
import { EquipamentoService } from '../../services/equipamento.service';
import { MarcaService } from '../../services/marca.service';
import { ModeloService } from '../../services/modelo.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileUploadService, FileUploadResponse } from '../../services/file-upload.service';

@Component({
  standalone: true,
  selector: 'app-reparacoes',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgSelectModule],
  templateUrl: './reparacoes.component.html',
  styleUrls: ['./reparacoes.component.scss']
})
export class ReparacoesComponent implements OnInit {
  reparacoes: any[] = [];
  empresas: any[] = [];
  tecnicos: any[] = [];
  equipamentosDisponiveis: any[] = [];
  equipamentosFiltrados: any[] = [];
  modelos: any[] = [];
  marcas: any[] = [];
  modelosPorMarca: any[] = [];
  utilizadoresComDevolucoes: any[] = [];
  selectedEquipamentos: string[] = [];
  dropdownAberto = false;
  dropdownEquipamentoAberto = false;
  isUploadingGuia = false;

  filtroEmpresa: number | null = null;
  filtroTecnico: number | null = null;

  form: FormGroup;
  showModal = false;
  editando = false;
  reparacaoSelecionadaId: number | null = null;


  constructor(
    private fb: FormBuilder,
    private reparacaoService: ReparacaoService,
    private empresaService: EmpresaService,
    private utilizadorService: UtilizadorService,
    private itemsReparacaoService: ItemsReparacaoService,
    private equipamentoService: EquipamentoService,
    private marcaService: MarcaService,
    private modeloService: ModeloService,
    private fileUploadService: FileUploadService
  ) {
    this.form = this.fb.group({
      empresaId: [null, Validators.required],
      tecnicoGSIId: [null, Validators.required],
      avaria: ['', Validators.required],
      dataEnvioReparacao: ['', Validators.required],
      dataPrevistaDevolucao: [''],
      dataDevolucao: [''],
      marcaId: [null, Validators.required],
      equipamentoId: [{ value: null, disabled: true }, Validators.required],
      pathGuiaReparacao: ['']
    });

    // Observar mudanças na marca para filtrar equipamentos
    this.form.get('marcaId')?.valueChanges.subscribe(marcaId => {
      this.filtrarEquipamentosPorMarca(marcaId);
      this.form.get('equipamentoId')?.setValue(null); // Reset equipamento quando marca muda
      
      // Controlar o estado disabled do campo equipamento
      if (marcaId) {
        this.form.get('equipamentoId')?.enable();
      } else {
        this.form.get('equipamentoId')?.disable();
      }
    });
  }

  ngOnInit(): void {
    console.log('🚀 Iniciando ngOnInit...');
    this.carregarReparacoes();
    this.carregarEmpresas();
    this.carregarTecnicos();
    this.carregarMarcas();
    this.carregarModelos();
    this.carregarEquipamentosDisponiveis();
    this.carregarUtilizadoresComDevolucoes();
    
    console.log('✅ ngOnInit concluído');
  }

  // Método removido - não usar dados de teste

  carregarReparacoes(): void {
    this.reparacaoService.listar().subscribe({
      next: (dados: any[]) => {
        this.reparacoes = dados;
      },
      error: (erro: any) => {
        console.error('Erro ao buscar reparações:', erro);
      }
    });
  }

  carregarEmpresas(): void {
    console.log('Iniciando carregamento de empresas...');
    this.empresaService.listar().subscribe({
      next: (dados: any[]) => {
        console.log('Empresas carregadas:', dados);
        this.empresas = dados;
      },
      error: (erro: any) => {
        console.error('Erro ao carregar empresas:', erro);
        console.error('Detalhes do erro:', erro.message, erro.status);
      }
    });
  }

  carregarTecnicos(): void {
    this.utilizadorService.listar().subscribe({
      next: (dados: any[]) => this.tecnicos = dados,
      error: (erro: any) => console.error('Erro ao carregar técnicos:', erro)
    });
  }

  carregarEquipamentosDisponiveis(): void {
    console.log('Iniciando carregamento de equipamentos...');
    this.equipamentoService.listarEquipamentos().subscribe({
      next: (dados: any[]) => {
        console.log('Equipamentos carregados:', dados);
        this.equipamentosDisponiveis = dados.filter(e => e.estado !== 'REPARACAO' && e.estado !== 'ALOCADO');
        console.log('Equipamentos disponíveis filtrados:', this.equipamentosDisponiveis);
        
        // Se já houver uma marca selecionada, refiltrar para garantir labels com modelo
        const marcaId = this.form.get('marcaId')?.value;
        if (marcaId) {
          this.filtrarEquipamentosPorMarca(marcaId);
        }
      },
      error: (erro: any) => {
        console.error('Erro ao carregar equipamentos:', erro);
        console.error('Detalhes do erro:', erro.message, erro.status);
        this.equipamentosDisponiveis = [];
      }
    });
  }

  carregarModelos(): void {
    console.log('🔄 Iniciando carregamento de modelos...');
    this.equipamentoService.listarModelos().subscribe({
      next: (dados: any[]) => {
        console.log('📋 Modelos recebidos da API:', dados);
        this.modelos = dados;
        console.log('📋 Modelos carregados:', this.modelos.length);
        
        // Se já houver uma marca selecionada, refiltrar para aplicar nomes de modelos
        const marcaId = this.form.get('marcaId')?.value;
        if (marcaId) {
          this.filtrarEquipamentosPorMarca(marcaId);
        }
      },
      error: (err) => {
        console.error('Erro ao carregar modelos:', err);
        this.modelos = [];
      }
    });
  }

  carregarMarcas(): void {
    console.log('Iniciando carregamento de marcas...');
    this.marcaService.listar().subscribe({
      next: (dados: any[]) => {
        console.log('Marcas carregadas:', dados);
        console.log('Número de marcas:', dados.length);
        this.marcas = dados;
        console.log('Array marcas atualizado:', this.marcas);
      },
      error: (err) => {
        console.error('Erro ao carregar marcas:', err);
        console.error('Detalhes do erro:', err.message, err.status);
        this.marcas = [];
      }
    });
  }

  // Métodos de dados de teste removidos - usar apenas endpoints reais



  carregarUtilizadoresComDevolucoes(): void {
    // Método removido temporariamente - serviço não disponível
    this.utilizadoresComDevolucoes = [];
  }

  filtrarEquipamentosPorMarca(marcaId: number | null): void {
    console.log('🔍 Filtrando equipamentos por marca:', marcaId);
    console.log('📦 Equipamentos disponíveis:', this.equipamentosDisponiveis.length);
    console.log('🏷️ Modelos carregados:', this.modelos.length);
    
    if (!marcaId) {
      this.equipamentosFiltrados = [];
      console.log('❌ Nenhuma marca selecionada, lista limpa');
      return;
    }

    // Filtrar equipamentos pela marca selecionada
    const filtrados = this.equipamentosDisponiveis.filter(equipamento => {
      const modelo = this.modelos.find(m => m.id === equipamento.modeloId);
      const pertenceAMarca = modelo && modelo.marcaId === marcaId;
      console.log(`📱 Equipamento ${equipamento.numeroSerie}: modelo=${modelo?.nome}, marcaId=${modelo?.marcaId}, pertence=${pertenceAMarca}`);
      return pertenceAMarca;
    });
    
    // Adicionar rótulo combinado: "Nº Série - Modelo" para melhor visualização e busca
    this.equipamentosFiltrados = filtrados.map(e => ({
      ...e,
      displayLabel: `${e.numeroSerie} - ${this.getModeloNome(e.modeloId)}`
    }));
    
    console.log('✅ Equipamentos filtrados:', this.equipamentosFiltrados.length);
    console.log('📋 Lista filtrada:', this.equipamentosFiltrados);
  }

  // Função utilitária para normalizar texto e remover acentos/maiúsculas
  private normalize(texto: string): string {
    return (texto || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // Permite pesquisar por número de série OU nome do modelo no ng-select
  equipamentoSearchFn = (term: string, item: any): boolean => {
    const t = this.normalize(term);
    const serie = this.normalize(item?.numeroSerie);
    const modeloNome = this.normalize(this.getModeloNome(item?.modeloId));
    const label = this.normalize(item?.displayLabel);
    return serie.includes(t) || modeloNome.includes(t) || label.includes(t);
  };

  getMarcaNome(marcaId: number): string {
    const marca = this.marcas.find(m => m.id === marcaId);
    return marca ? marca.nome : 'Marca não encontrada';
  }



  abrirModal(novo = true, reparacao?: any) {
    this.editando = !novo;
    this.showModal = true;
    this.selectedEquipamentos = [];

    if (novo) {
      this.reparacaoSelecionadaId = null;
      this.form.reset();
      this.form.patchValue({ pathGuiaReparacao: '' });
    } else if (reparacao) {
      this.reparacaoSelecionadaId = reparacao.id;
      this.form.patchValue({
        empresaId: reparacao.empresaId,
        tecnicoGSIId: reparacao.tecnicoGSIId,
        avaria: reparacao.avaria,
        dataEnvioReparacao: reparacao.dataEnvioReparacao,
        dataPrevistaDevolucao: reparacao.dataPrevistaDevolucao,
        dataDevolucao: reparacao.dataDevolucao,
        marcaId: null,
        equipamentoId: null,
        pathGuiaReparacao: reparacao.pathGuiaReparacao || ''
      });

      this.itemsReparacaoService.listarPorReparacao(reparacao.id).subscribe({
        next: (itens: any[]) => {
          if (itens.length > 0) {
            const equipamento = this.equipamentosDisponiveis.find(e => e.id === itens[0].equipamentoId);
            if (equipamento) {
              const modelo = this.modelos.find(m => m.id === equipamento.modeloId);
              if (modelo) {
                // Definir a marca primeiro
                this.form.patchValue({
                  marcaId: modelo.marcaId
                });
                // Filtrar equipamentos pela marca
                this.filtrarEquipamentosPorMarca(modelo.marcaId);
                // Depois definir o equipamento
                setTimeout(() => {
                  this.form.patchValue({
                    equipamentoId: itens[0].equipamentoId
                  });
                }, 100);
              }
            }
          }
        },
        error: (err: any) => {
          console.error('Erro ao carregar itens da reparação:', err);
        }
      });
    }
  }



  salvar() {
    if (this.form.invalid) return;

    const dados = this.form.getRawValue();

    if (this.editando && this.reparacaoSelecionadaId !== null) {
      this.reparacaoService.atualizar(this.reparacaoSelecionadaId, dados).subscribe({
        next: () => {
          this.salvarItensReparacao(this.reparacaoSelecionadaId!);
          this.carregarReparacoes();
          this.fecharModal();
        },
        error: (err: any) => {
          console.error('Erro ao atualizar reparação:', err);
          alert('Erro ao atualizar reparação');
        }
      });
    } else {
      this.reparacaoService.criar(dados).subscribe({
        next: (reparacao: any) => {
          this.salvarItensReparacao(reparacao.id);
          this.carregarReparacoes();
          this.fecharModal();
        },
        error: (err: any) => {
          console.error('Erro ao criar reparação:', err);
          alert('Erro ao criar reparação');
        }
      });
    }
  }

  salvarItensReparacao(reparacaoId: number) {
    const equipamentoId = this.form.get('equipamentoId')?.value;
    if (equipamentoId) {
      const novoItem = {
        reparacaoId,
        equipamentoId: equipamentoId,
        dataAlocacao: new Date()
      };
      this.itemsReparacaoService.criar(novoItem).subscribe();
    }
  }

  fecharModal() {
    this.showModal = false;
    this.form.reset();
    this.form.get('equipamentoId')?.disable(); // Garantir que equipamento inicie desabilitado
    this.reparacaoSelecionadaId = null;
    this.selectedEquipamentos = [];
    this.dropdownAberto = false;
    this.dropdownEquipamentoAberto = false;
    this.isUploadingGuia = false;
  }



  getModeloNome(modeloId: number): string {
    const modelo = this.modelos.find(m => m.id === modeloId);
    return modelo ? modelo.nome : '---';
  }



  excluir(id: number) {
    if (confirm('Tem certeza que deseja remover esta reparação?')) {
      this.reparacaoService.remover(id).subscribe({
        next: () => this.carregarReparacoes(),
        error: (err: any) => {
          console.error('Erro ao remover reparação:', err);
          alert('Erro ao remover reparação');
        }
      });
    }
  }

  getReparacoesFiltradas() {
    return this.reparacoes
      .filter(r => {
        return (!this.filtroEmpresa || r.empresaId === this.filtroEmpresa) &&
               (!this.filtroTecnico || r.tecnicoGSIId === this.filtroTecnico);
      })
      .sort((a: any, b: any) => {
        const da = a?.dataEnvioReparacao ? new Date(a.dataEnvioReparacao).getTime() : 0;
        const db = b?.dataEnvioReparacao ? new Date(b.dataEnvioReparacao).getTime() : 0;
        if (db !== da) return db - da; // mais recentes primeiro
        const ia = typeof a?.id === 'number' ? a.id : 0;
        const ib = typeof b?.id === 'number' ? b.id : 0;
        return ib - ia; // fallback por ID
      });
  }

  getEmpresaNome(id: number): string {
    const empresa = this.empresas.find(e => e.id === id);
    return empresa ? empresa.designacao : '---';
  }

  getTecnicoNome(id: number): string {
    const tecnico = this.tecnicos.find(t => t.id === id);
    return tecnico ? tecnico.nome : '---';
  }

  toggleDropdown(): void {
    console.log('Toggle dropdown chamado. Estado atual:', this.dropdownAberto);
    this.dropdownAberto = !this.dropdownAberto;
    console.log('Novo estado do dropdown:', this.dropdownAberto);
    console.log('Marcas disponíveis:', this.marcas.length);
  }

  toggleDropdownEquipamento(): void {
    this.dropdownEquipamentoAberto = !this.dropdownEquipamentoAberto;
  }

  selecionarMarca(marca: any): void {
    console.log('🎯 Marca selecionada:', marca);
    console.log('📊 Estado atual - Equipamentos disponíveis:', this.equipamentosDisponiveis.length, this.equipamentosDisponiveis);
    console.log('📊 Estado atual - Modelos:', this.modelos.length, this.modelos);
    console.log('📊 Estado atual - Marcas:', this.marcas.length, this.marcas);
    
    // Reset equipamento quando marca muda
    this.form.patchValue({ equipamentoId: null });
    
    if (marca) {
      this.form.patchValue({ marcaId: marca.id });
      console.log('✅ Marca ID definido no form:', marca.id);
      this.filtrarEquipamentosPorMarca(marca.id);
      console.log('🔍 Após filtrar - Equipamentos filtrados:', this.equipamentosFiltrados.length, this.equipamentosFiltrados);
    } else {
      this.form.patchValue({ marcaId: null });
      console.log('🔄 Marca resetada');
      this.filtrarEquipamentosPorMarca(null);
    }
    this.dropdownAberto = false;
  }

  getMarcaSelecionada(): string {
    const marcaId = this.form.get('marcaId')?.value;
    if (marcaId) {
      const marca = this.marcas.find(m => m.id === marcaId);
      return marca ? marca.nome : '';
    }
    return '';
  }

  selecionarEquipamento(equipamento: any): void {
    console.log('Equipamento selecionado:', equipamento);
    if (equipamento) {
      this.form.patchValue({ equipamentoId: equipamento.id });
      console.log('Equipamento ID definido no form:', equipamento.id);
    } else {
      this.form.patchValue({ equipamentoId: null });
      console.log('Equipamento resetado');
    }
    this.dropdownEquipamentoAberto = false;
  }

  getEquipamentoSelecionado(): string {
    const equipamentoId = this.form.get('equipamentoId')?.value;
    if (equipamentoId) {
      const equipamento = this.equipamentosFiltrados.find(e => e.id === equipamentoId);
      if (equipamento) {
        return `${equipamento.numeroSerie} - ${this.getModeloNome(equipamento.modeloId)}`;
      }
    }
    return '';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.custom-dropdown');
    if (!dropdown) {
      if (this.dropdownAberto) {
        this.dropdownAberto = false;
      }
      if (this.dropdownEquipamentoAberto) {
        this.dropdownEquipamentoAberto = false;
      }
    }
  }

  // ===== Helpers PDF Guia Reparação =====
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private async ensureCenturyGothic(doc: jsPDF): Promise<string> {
    try {
      const fontResp = await fetch('assets/CenturyGothic.ttf');
      if (fontResp.ok) {
        const buf = await fontResp.arrayBuffer();
        const b64 = this.arrayBufferToBase64(buf);
        doc.addFileToVFS('CenturyGothic.ttf', b64);
        doc.addFont('CenturyGothic.ttf', 'CenturyGothic', 'normal');
        doc.setFont('CenturyGothic', 'normal');
        doc.setFontSize(12);
        return 'CenturyGothic';
      }
    } catch {}

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    return 'helvetica';
  }

  private formatarData(value: any): string {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value ? String(value) : '';
      return d.toLocaleDateString('pt-PT');
    } catch {
      return value ? String(value) : '';
    }
  }

  private drawBoldLabelValue(doc: jsPDF, fontFamily: string, label: string, value: string, x: number, y: number) {
    const labelText = `${label}:`;
    doc.setFont(fontFamily, 'bold');
    doc.text(labelText, x, y);
    const labelWidth = doc.getTextWidth(labelText);
    doc.setFont(fontFamily, 'normal');
    doc.text(`${value}`, x + labelWidth + 2, y);
  }

  private async loadAndCompressImage(path: string, maxWidthPx: number, quality: number): Promise<string | null> {
    try {
      const response = await fetch(path);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const img = await this.loadHtmlImage(objectUrl);
      URL.revokeObjectURL(objectUrl);
      if (!img) return null;

      const scale = Math.min(1, maxWidthPx / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', quality);
    } catch {
      return null;
    }
  }

  private loadHtmlImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Falha ao carregar imagem'));
      image.src = src;
    });
  }

  async gerarGuiaReparacao(): Promise<void> {
    const equipamentoId = this.form.get('equipamentoId')?.value;
    const empresaId = this.form.get('empresaId')?.value;
    const tecnicoId = this.form.get('tecnicoGSIId')?.value;
    const avaria = (this.form.get('avaria')?.value || '').trim();
    const dataEnvio = this.form.get('dataEnvioReparacao')?.value;
    const dataPrevista = this.form.get('dataPrevistaDevolucao')?.value;

    if (!equipamentoId || !empresaId || !tecnicoId || !avaria || !dataEnvio) {
      alert('Preencha Empresa, Técnico, Equipamento, Data de Envio e Avaria para gerar a guia.');
      return;
    }

    const equipamento = this.equipamentosFiltrados.find(e => e.id === equipamentoId)
      || this.equipamentosDisponiveis.find(e => e.id === equipamentoId);
    const tecnicoNome = this.getTecnicoNome(tecnicoId);
    const empresaNome = this.getEmpresaNome(empresaId);
    const modeloNome = equipamento ? this.getModeloNome(equipamento.modeloId) : '---';
    const marcaNome = equipamento?.modeloId ? this.getMarcaNomePorModeloId(equipamento.modeloId) : '---';

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const fontFamily = await this.ensureCenturyGothic(doc);
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      const [firstBg, secondBg] = await Promise.all([
        this.loadAndCompressImage('assets/Guia de Reparacao GSI.png', 1600, 0.6),
        this.loadAndCompressImage('assets/Second page.png', 1600, 0.6)
      ]);

      const drawBgPageSpecific = (d: jsPDF, pageNumber: number) => {
        const img = pageNumber === 1 ? (firstBg || secondBg) : (secondBg || firstBg);
        if (img) {
          const alias = pageNumber === 1 ? 'rep-bg1' : 'rep-bg2';
          d.addImage(img, 'JPEG', 0, 0, pageW, pageH, alias, 'FAST');
        }
      };

      drawBgPageSpecific(doc, 1);

      const headerH = 68;
      const footerH = 22;
      const contentTopY = headerH + 4;
      const contentBottomY = pageH - footerH - 6;

      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(12);
      doc.text('Guia de Reparação', pageW / 2, contentTopY, { align: 'center' });
      doc.setFont(fontFamily, 'normal');

      let y = contentTopY + 8;
      doc.setFont(fontFamily, 'bold');
      doc.text('1. Dados da reparação', 15, y);
      doc.setFont(fontFamily, 'normal');
      y += 8;
      this.drawBoldLabelValue(doc, fontFamily, 'Empresa', empresaNome, 15, y); y += 8;
      this.drawBoldLabelValue(doc, fontFamily, 'Técnico GSI', tecnicoNome, 15, y); y += 8;
      this.drawBoldLabelValue(doc, fontFamily, 'Data Envio Reparação', this.formatarData(dataEnvio), 15, y); y += 8;
      this.drawBoldLabelValue(doc, fontFamily, 'Data Prevista Devolução', dataPrevista ? this.formatarData(dataPrevista) : '—', 15, y); y += 12;

      const rows = [[
        equipamento?.numeroSerie || '—',
        marcaNome || '—',
        modeloNome || '—',
        avaria || '—'
      ]];

      autoTable(doc, {
        head: [[ 'Nº de Série', 'Marca', 'Modelo', 'Resumo da Avaria' ]],
        body: rows,
        startY: y + 6,
        theme: 'grid',
        styles: { fontSize: 12, font: fontFamily, cellPadding: 3 },
        headStyles: { fillColor: [241, 245, 249], textColor: 30, lineColor: [203, 213, 225], lineWidth: 0.3 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        bodyStyles: { lineColor: [203, 213, 225], lineWidth: 0.2 },
        margin: { left: 15, right: 15, bottom: pageH - contentBottomY },
        willDrawPage: (data: any) => {
          if (data.pageNumber !== 1) {
            drawBgPageSpecific(doc, data.pageNumber);
          }
        }
      });

      const finalY = (doc as any).lastAutoTable?.finalY || (y + 40);
      const margemL = 15;
      const margemR = 15;
      const larguraUtil = pageW - margemL - margemR;
      let cursorY = finalY + 8;

      const verificaPagina = () => {
        if (cursorY > contentBottomY - 12) {
          doc.addPage('a4', 'p');
          const currentPage = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 2;
          drawBgPageSpecific(doc, currentPage);
          cursorY = 15;
        }
      };

      const escreveTitulo = (texto: string, yPos: number) => {
        doc.setFont(fontFamily, 'bold');
        doc.setFontSize(12);
        doc.text(texto, margemL, yPos);
        doc.setFont(fontFamily, 'normal');
        doc.setFontSize(12);
      };

      const escreveParagrafo = (texto: string, yPos: number) => {
        const wrapped = doc.splitTextToSize(texto, larguraUtil);
        doc.text(wrapped, margemL, yPos);
        return yPos + (wrapped.length * 6);
      };

      cursorY += 8; verificaPagina();
      escreveTitulo('2. Termo de envio para reparação', cursorY);
      cursorY += 8; verificaPagina();
      cursorY = escreveParagrafo(
        'O equipamento acima identificado foi encaminhado para reparação. O responsável técnico compromete-se a acompanhar o processo e registar qualquer alteração de estado.',
        cursorY
      );
      cursorY += 4;

      const termos = [
        'Confirmar o diagnóstico e reportar avarias adicionais, se existirem;',
        'Garantir rastreabilidade da intervenção técnica;',
        'Preservar os dados institucionais conforme política interna;',
        'Cumprir o prazo previsto de devolução do equipamento reparado.'
      ];

      termos.forEach(item => {
        verificaPagina();
        const lines = doc.splitTextToSize(`• ${item}`, larguraUtil);
        doc.text(lines, margemL, cursorY);
        cursorY += lines.length * 6;
      });

      cursorY += 8;
      const anotacoesAltura = 44;
      const alturaTituloAnotacoes = 6;
      const espacoNecessarioAnotacoes = alturaTituloAnotacoes + anotacoesAltura;

      if (cursorY + espacoNecessarioAnotacoes > contentBottomY - 10) {
        doc.addPage('a4', 'p');
        const currentPage = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 2;
        drawBgPageSpecific(doc, currentPage);
        cursorY = 15;
      }

      escreveTitulo('3. Anotações adicionais', cursorY);
      cursorY += alturaTituloAnotacoes;

      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.4);
      doc.rect(margemL, cursorY, larguraUtil, anotacoesAltura);

      const linhas = 5;
      const espacoLinha = anotacoesAltura / (linhas + 1);
      for (let i = 1; i <= linhas; i++) {
        const yLinha = cursorY + (i * espacoLinha);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.line(margemL + 2, yLinha, margemL + larguraUtil - 2, yLinha);
      }

      cursorY += anotacoesAltura + 10; verificaPagina();
      const colW = (pageW - margemL - margemR - 12) / 2;
      const leftX = margemL;
      const rightX = margemL + colW + 12;
      const assinaturaY = Math.min(cursorY + 6, contentBottomY - 20);
      doc.setLineWidth(0.6);
      doc.line(leftX, assinaturaY, leftX + colW, assinaturaY);
      doc.line(rightX, assinaturaY, rightX + colW, assinaturaY);
      doc.setFontSize(10);
      doc.text('Assinatura do Técnico GSI', leftX, assinaturaY + 6);
      doc.text('Assinatura do Responsável da Empresa', rightX, assinaturaY + 6);

      const pdfBlob = doc.output('blob');
      const safeName = (equipamento?.numeroSerie || 'equipamento').replace(/\s+/g, '_');
      const fileName = `Guia_de_Reparacao_${safeName}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 1200);

      this.isUploadingGuia = true;
      this.fileUploadService.uploadFile(file, 'guias').subscribe({
        next: (res: FileUploadResponse | any) => {
          if (res && res.success && res.filePath) {
            this.form.patchValue({ pathGuiaReparacao: res.filePath });
            alert('Guia de reparação gerada e anexada com sucesso. Clique em Salvar para persistir a reparação com a guia.');
          }
        },
        error: (err: any) => {
          console.error('Falha no upload da guia de reparação:', err);
          alert('Guia gerada, mas falhou o upload. Você ainda pode baixar/visualizar o PDF.');
        },
        complete: () => {
          this.isUploadingGuia = false;
        }
      });
    } catch (err) {
      console.error('Erro ao gerar Guia de Reparação:', err);
      alert('Falha ao gerar a Guia de Reparação em PDF.');
    }
  }

  private getMarcaNomePorModeloId(modeloId: number | null | undefined): string {
    if (!modeloId) return '';
    const modelo = this.modelos.find((m: any) => m.id === modeloId);
    if (!modelo) return '';
    const marca = this.marcas.find((mc: any) => mc.id === modelo.marcaId);
    return marca ? (marca.nome ?? '') : '';
  }
}