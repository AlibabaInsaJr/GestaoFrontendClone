import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DevolucoesService } from '../../services/devolucoes.service';
import { MarcaService } from '../../services/marca.service';
import { AlocacaoService } from '../../services/alocacoes.service';
import { ItemsDevolucaoService } from '../../services/item-devolucao.service';
import { ItemsAlocacaoService } from '../../services/item-alocacao.service';
import { UtilizadorService } from '../../services/utilizador.service';
import { EquipamentoService } from '../../services/equipamento.service';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { FileUploadService, FileUploadResponse } from '../../services/file-upload.service';
import { environment } from '../../../environments/environment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  standalone: true,
  selector: 'app-devolucoes',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgSelectModule, FileUploadComponent],
  templateUrl: './devolucoes.component.html',
  styleUrls: ['./devolucoes.component.scss']
})
export class DevolucoesComponent implements OnInit {
  devolucoes: any[] = [];
  equipamentosAlocados: any[] = [];
  utilizadores: any[] = [];
  modelos: any[] = [];
  marcas: any[] = [];
  alocacoes: any[] = [];
  selectedEquipamentos: number[] = [];
  estadoEquipamentosSelecionados: { [equipamentoId: number]: string } = {};
  filtroUtilizador: number | null = null;
  filtroTecnico: number | null = null;
  searchEquipTerm: string = '';
  filtroBuscaTerm: string = '';
  itemsAlocacao: any[] = [];

  // Limitar estados conforme pedido: apenas STOCK_BOM e STOCK_AVARIADO
  estadosEquipamento: string[] = [
    'STOCK_BOM',
    'STOCK_AVARIADO'
  ];

  // Filtro/seleção global de estado (substitui o campo "Período de Alocação" do molde)
  estadoGlobalSelecionado: string | null = null;

  form: FormGroup;
  showModal = false;
  editando = false;
  isUploadingGuia: boolean = false;

  constructor(
    private fb: FormBuilder,
    private devolucoesService: DevolucoesService,
    private itemsDevolucaoService: ItemsDevolucaoService,
    private utilizadorService: UtilizadorService,
    private equipamentoService: EquipamentoService,
    private itemsAlocacaoService: ItemsAlocacaoService,
    private alocacaoService: AlocacaoService,
    private marcaService: MarcaService,
    private fileUploadService: FileUploadService
  ) {
    this.form = this.fb.group({
      utilizadorDevolveuId: [null, Validators.required],
      utilizadorRecebeuId: [null, Validators.required],
      dataDevolucao: ['', Validators.required],
      // Guia de devolução é opcional (alinhado com Reparações)
      pathGuiaDevolucao: ['']
    });
  }

  ngOnInit(): void {
    this.carregarDevolucoes();
    this.carregarUtilizadores();
    this.carregarEquipamentos();
    this.carregarModelos();
    this.carregarMarcas();
    this.carregarAlocacoes();
    this.carregarItemsAlocacao();
    this.form.get('utilizadorRecebeuId')?.setValue(1);

    // Atualiza a lista quando muda o beneficiário (quem devolveu)
    this.form.get('utilizadorDevolveuId')?.valueChanges.subscribe(() => {
      this.selectedEquipamentos = [];
      this.estadoEquipamentosSelecionados = {};
    });
  }

  onEstadoGlobalChange(valor: string | null): void {
    this.estadoGlobalSelecionado = valor ?? null;
    // Não aplicamos retroativamente em todos para evitar surpresa.
    // Este valor servirá como padrão quando o utilizador selecionar novos equipamentos.
  }

  carregarDevolucoes(): void {
    this.devolucoesService.listar().subscribe({
      next: dados => this.devolucoes = dados,
      error: err => console.error('Erro ao listar devoluções:', err)
    });
  }

  carregarUtilizadores(): void {
    this.utilizadorService.listar().subscribe({
      next: dados => this.utilizadores = dados,
      error: err => console.error('Erro ao carregar utilizadores:', err)
    });
  }

  carregarEquipamentos(): void {
    // Carregar TODOS os equipamentos e filtrar por alocação do beneficiário na função getEquipamentosFiltrados().
    // Muitos backends não marcam o estado "ALOCADO" diretamente no equipamento, e sim no item de alocação.
    // Por isso, evitar filtrar aqui por estado para não esconder equipamentos válidos.
    this.equipamentoService.listarEquipamentos().subscribe({
      next: (dados) => {
        // Normalizar campos comuns (id, numeroSerie, modeloId) com fallbacks como no RelatorioComponent
        this.equipamentosAlocados = (dados || []).map((res: any) => ({
          id: res.id,
          numeroSerie: res.numeroSerie ?? res.numero_serie ?? res.serie ?? res.serial ?? res.sn ?? '',
          modeloId: res.modeloId ?? res.modelo_id ?? res.modelId ?? res.model_id ?? res.modelo?.id ?? null,
          estado: res.estado
        }));
      },
      error: err => console.error('Erro ao carregar equipamentos:', err)
    });
  }

  carregarModelos(): void {
    this.equipamentoService.listarModelos().subscribe({
      next: dados => this.modelos = dados,
      error: err => console.error('Erro ao carregar modelos:', err)
    });
  }

  carregarMarcas(): void {
    this.marcaService.listar().subscribe({
      next: dados => this.marcas = dados || [],
      error: err => {
        console.error('Erro ao carregar marcas:', err);
        this.marcas = [];
      }
    });
  }

  carregarAlocacoes(): void {
    this.alocacaoService.listar().subscribe({
      next: (dados: any[]) => {
        // Normalizar estrutura mínima necessária
        this.alocacoes = (dados || []).map((res: any) => ({
          id: res.id,
          utilizadorBeneficiarioId: res.utilizadorBeneficiarioId ?? res.utilizadorId ?? res.utilizador?.id ?? null
        }));
      },
      error: err => console.error('Erro ao carregar alocações:', err)
    });
  }

  carregarItemsAlocacao(): void {
    this.itemsAlocacaoService.listar().subscribe({
      next: dados => this.itemsAlocacao = dados || [],
      error: err => console.error('Erro ao carregar items de alocação:', err)
    });
  }

  abrirModal(devolucao?: any): void {
    this.editando = !!devolucao;
    this.showModal = true;
    this.selectedEquipamentos = [];
    this.estadoEquipamentosSelecionados = {};
    this.form.reset();
  }

  fecharModal(): void {
    this.showModal = false;
    this.form.reset();
    this.selectedEquipamentos = [];
    this.estadoEquipamentosSelecionados = {};
  }

  toggleEquipamentoSelecionado(equipamentoId: number, event: any): void {
    if (event.target.checked) {
      if (!this.selectedEquipamentos.includes(equipamentoId)) {
        this.selectedEquipamentos.push(equipamentoId);
        // Define estado padrão a partir do filtro global, senão STOCK_BOM
        this.estadoEquipamentosSelecionados[equipamentoId] = this.estadoGlobalSelecionado || 'STOCK_BOM';
      }
    } else {
      this.selectedEquipamentos = this.selectedEquipamentos.filter(id => id !== equipamentoId);
      delete this.estadoEquipamentosSelecionados[equipamentoId];
    }
  }

  // Busca com sugestões (typeahead), espelha o comportamento de "Equipamentos para Alocação"
  equipamentoBusca: string = '';
  equipamentosFiltradosSugestao: any[] = [];

  filtrarEquipamentosSugestao(): void {
    const termo = (this.equipamentoBusca || '').toLowerCase();
    const lista = this.getEquipamentosFiltrados();
    if (!termo) {
      this.equipamentosFiltradosSugestao = [];
      return;
    }
    this.equipamentosFiltradosSugestao = lista
      // Não sugerir equipamentos já selecionados
      .filter(eq => !this.selectedEquipamentos.includes(eq.id))
      .filter(eq => {
      const modeloNome = (this.getModeloNome(eq.modeloId) || '').toLowerCase();
      // Agora a busca considera somente o nome do modelo
      return modeloNome.includes(termo);
      }).slice(0, 8);
  }

  selecionarEquipamentoSugestao(eq: any): void {
    if (!eq) return;
    const id = eq.id;
    if (id && !this.selectedEquipamentos.includes(id)) {
      this.selectedEquipamentos.push(id);
      this.estadoEquipamentosSelecionados[id] = this.estadoGlobalSelecionado || 'STOCK_BOM';
    }
    // limpar input e fechar sugestões
    this.equipamentoBusca = '';
    this.equipamentosFiltradosSugestao = [];
  }

  // Fechar dropdowns ao clicar fora
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const insideEquip = !!target.closest('.equipamento-search') || !!target.closest('.equipamentos-dropdown');
    if (!insideEquip) {
      this.equipamentosFiltradosSugestao = [];
    }
  }

  getNomeUtilizador(id: number): string {
    const u = this.utilizadores.find(u => u.id === id);
    return u ? u.nome : `ID ${id}`;
  }

  getModeloNome(id: number): string {
    if (!id && id !== 0) return '';
    const modelo = this.modelos.find((m: any) => (m.id === id) || (m.modeloId === id) || (m.modelo_id === id));
    return modelo ? (modelo.nome || modelo.name || `Modelo ${id}`) : `Modelo ${id}`;
  }

  getDevolucoesFiltradas(): any[] {
    const termo = (this.filtroBuscaTerm || '').toLowerCase();
    return this.devolucoes.filter(d => {
      const filtroUtilizadorOK = !this.filtroUtilizador || d.utilizadorDevolveuId == this.filtroUtilizador;
      const filtroTecnicoOK = !this.filtroTecnico || d.utilizadorRecebeuId == this.filtroTecnico;

      let buscaOK = true;
      if (termo) {
        const nomeDevolveu = (this.getNomeUtilizador(d.utilizadorDevolveuId) || '').toLowerCase();
        const nomeRecebeu = (this.getNomeUtilizador(d.utilizadorRecebeuId) || '').toLowerCase();
        const idStr = String(d.id || '').toLowerCase();
        const dataStr = d.dataDevolucao ? new Date(d.dataDevolucao).toLocaleDateString('pt-PT') : '';
        const dataLower = (dataStr || '').toLowerCase();
        const guiaStr = (d.pathGuiaDevolucao || '').toLowerCase();
        buscaOK = nomeDevolveu.includes(termo) || nomeRecebeu.includes(termo) || idStr.includes(termo) || dataLower.includes(termo) || guiaStr.includes(termo);
      }

      return filtroUtilizadorOK && filtroTecnicoOK && buscaOK;
    });
  }

  // Lista exibida na mini-tabela, filtrada por beneficiário, estado e pesquisa
  getEquipamentosFiltrados(): any[] {
    const beneficiarioId = this.form.get('utilizadorDevolveuId')?.value;
    // Não mostrar lista enquanto não selecionar o beneficiário
    if (!beneficiarioId) return [];

    // Partir da lista completa de equipamentos carregados
    let lista = [...this.equipamentosAlocados];
    const idsDoBeneficiario = new Set<number>();
    for (const item of this.itemsAlocacao) {
      const eqId = item?.equipamento?.id ?? item?.equipamentoId ?? item?.idEquipamento ?? item?.equipamento_id;
      // Primeiro tenta obter direto do item
      let userId = item?.alocacao?.utilizadorBeneficiario?.id ?? item?.alocacao?.utilizadorBeneficiarioId ?? item?.beneficiarioId ?? item?.utilizadorBeneficiarioId;
      // Se não vier, tenta resolver pelo alocacaoId juntando com a lista de alocações
      if (!userId) {
        const alocId = item?.alocacaoId ?? item?.alocacao?.id;
        if (alocId) {
          const aloc = this.alocacoes.find(a => a.id === alocId);
          userId = aloc?.utilizadorBeneficiarioId ?? null;
        }
      }
      if (eqId && userId && userId === beneficiarioId) {
        idsDoBeneficiario.add(eqId);
      }
    }
    lista = lista.filter(e => idsDoBeneficiario.has(e.id));

    // Filtro visual apenas por Modelo (conforme pedido)
    const termo = (this.equipamentoBusca || '').toLowerCase();
    if (termo) {
      lista = lista.filter(e => {
        const mod = (this.getModeloNome(e.modeloId) || '').toLowerCase();
        return mod.includes(termo);
      });
    }

    return lista;
  }

  salvar(): void {
    // Validações mais suaves e alinhadas com Reparações
    if (this.form.invalid) {
      alert('Preencha os campos obrigatórios.');
      return;
    }
    if (this.selectedEquipamentos.length === 0) {
      alert('Selecione pelo menos um equipamento para devolver.');
      return;
    }
    const dados = this.form.value;
    const arquivo = dados.pathGuiaDevolucao;

    if (this.isUploadingGuia) {
      alert('Aguarde a conclusão do upload da Guia de Devolução antes de salvar.');
      return;
    }

    const continuarSalvar = (caminhoGuia?: string) => {
      if (caminhoGuia) {
        dados.pathGuiaDevolucao = caminhoGuia;
      } else if (dados.pathGuiaDevolucao instanceof File) {
        delete dados.pathGuiaDevolucao;
      }

      this.devolucoesService.criar(dados).subscribe({
        next: (devolucao) => {
          const beneficiarioId = this.form.get('utilizadorDevolveuId')?.value;
          const itens = this.selectedEquipamentos.map(equipId => {
            const candidatos = (this.itemsAlocacao || []).filter((it: any) => {
              const itEqId = it?.equipamento?.id ?? it?.equipamentoId;
              return itEqId === equipId;
            });

            let itemAloc: any = null;
            for (const it of candidatos) {
              const alocId = it?.alocacaoId ?? it?.alocacao?.id;
              const aloc = this.alocacoes.find(a => a.id === alocId);
              if (!beneficiarioId || (aloc && aloc.utilizadorBeneficiarioId === beneficiarioId)) {
                itemAloc = it;
                break;
              }
            }

            if (!itemAloc && candidatos.length > 0) {
              itemAloc = candidatos[0];
            }

            const itemsAlocacaoId = itemAloc?.id ?? null;
            return {
              devolucaoId: devolucao.id,
              itemsAlocacaoId,
              novoEstado: this.estadoEquipamentosSelecionados[equipId],
              dataAlocacao: dados.dataDevolucao,
              equipamentoId: equipId
            };
          }).filter(item => item.itemsAlocacaoId !== null);

          for (const item of itens) {
            this.itemsDevolucaoService.criar(item).subscribe({
              error: err => console.error('Erro ao criar item de devolução:', err)
            });
          }

          alert('Devolução registrada com sucesso');
          this.fecharModal();
          this.carregarDevolucoes();
          this.carregarItemsAlocacao();
          this.carregarEquipamentos();
        },
        error: err => {
          console.error('Erro ao registrar devolução:', err);
          alert('Erro ao registrar devolução');
        }
      });
    };

    if (arquivo && arquivo instanceof File) {
      this.fileUploadService.uploadFile(arquivo, 'guias').subscribe({
        next: (res: FileUploadResponse | any) => {
          if (res && res.success && res.filePath) {
            continuarSalvar(res.filePath);
          }
        },
        error: (err: any) => {
          console.error('Falha no upload da guia de devolução:', err);
          alert('Falha no upload da Guia de Devolução. A devolução será salva sem anexar a guia.');
          continuarSalvar();
        }
      });
    } else {
      if (typeof arquivo === 'string' && arquivo.trim() !== '') {
        continuarSalvar(arquivo);
      } else {
        continuarSalvar();
      }
    }
  }

  excluir(id: number): void {
    if (confirm('Deseja excluir esta devolução?')) {
      this.devolucoesService.excluir(id).subscribe(() => {
        this.devolucoes = this.devolucoes.filter(d => d.id !== id);
      });
    }
  }

  equipamentoMock = {
  id: 123,
  numeroSerie: "ABC123",
  descricao: "Impressora multifuncional",
  tipo: { id: 1, nome: "Impressora" },
  modelo: { id: 2, nome: "HP LaserJet" }
};

  onFileError(error: string): void {
    console.error('Erro no upload do arquivo:', error);
    // Aqui você pode adicionar uma notificação para o usuário
    alert(error);
  }

  public toFileUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${environment.apiUrl}${p}`;
  }

  // ===== Helpers para PDF =====
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
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
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        return 'helvetica';
      }
    } catch {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      return 'helvetica';
    }
  }

  private async loadImage(url: string): Promise<HTMLImageElement | null> {
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
      });
      return img;
    } catch {
      return null;
    }
  }

  private formatarData(value: any): string {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) {
        return value ? String(value) : '';
      }
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

  private getMarcaNomePorModeloId(id: number | null | undefined): string {
    if (!id) return '';
    const modelo = this.modelos.find((m: any) => (m.id === id) || (m.modeloId === id) || (m.modelo_id === id));
    if (!modelo) return '';
    // Tenta obter pelo objeto aninhado
    if (modelo.marca && (modelo.marca.nome || modelo.marcaName)) {
      return modelo.marca.nome || modelo.marcaName || '';
    }
    // Tenta obter por marcaId usando a lista de marcas carregada
    const marcaId = modelo.marcaId ?? modelo.marca_id ?? null;
    if (marcaId && this.marcas && this.marcas.length) {
      const marca = this.marcas.find((mk: any) => mk.id === marcaId);
      return marca?.nome || '';
    }
    return '';
  }

  // Carrega imagem e comprime para JPEG via canvas para reduzir o tamanho do PDF
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

  async gerarGuiaDevolucao(): Promise<void> {
    if (!this.selectedEquipamentos || this.selectedEquipamentos.length === 0) {
      alert('Selecione pelo menos um equipamento para gerar a guia.');
      return;
    }

    const quemDevolveuId = this.form.value.utilizadorDevolveuId;
    const quemRecebeuId = this.form.value.utilizadorRecebeuId;
    const dataDevolucao = this.form.value.dataDevolucao;

    if (!quemDevolveuId || !dataDevolucao || !quemRecebeuId) {
      alert('Preencha Quem Devolveu, Quem Recebeu e Data de Devolução.');
      return;
    }

    const quemDevolveuNome = this.getNomeUtilizador(quemDevolveuId);
    const quemRecebeuNome = this.getNomeUtilizador(quemRecebeuId);

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      // Fonte: tentar Century Gothic 12 (se disponível em assets), caso contrário Helvetiva 12
      const fontFamily = await this.ensureCenturyGothic(doc);
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Carregar e COMPRIMIR fundos para reduzir tamanho final do PDF
      const [firstBg, secondBg] = await Promise.all([
        this.loadAndCompressImage('assets/1.1.png', 1600, 0.6),
        this.loadAndCompressImage('assets/2.1.png', 1600, 0.6)
      ]);

      const drawBgPageSpecific = (d: jsPDF, pageNumber: number) => {
        const img = pageNumber === 1 ? (firstBg || secondBg) : (secondBg || firstBg);
        if (img) {
          const alias = pageNumber === 1 ? 'bg1' : 'bg2';
          d.addImage(img, 'JPEG', 0, 0, pageW, pageH, alias, 'FAST');
        }
      };

      // Desenhar BG da primeira página antes do conteúdo
      drawBgPageSpecific(doc, 1);

      // Margens para respeitar cabeçalho/rodapé do template
      // Ajuste fino: aumentar headerH para garantir que o título pequeno e os "Dados da devolução"
      // apareçam claramente abaixo do cabeçalho do template.
      const headerH = 68; // antes: 55
      const footerH = 22;
      const contentTopY = headerH + 4;
      const contentBottomY = pageH - footerH - 6;

      // Pequeno título: "Guia de Devolução" (tamanho 12)
      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(12);
      doc.text('Guia de Devolução', pageW / 2, contentTopY, { align: 'center' });
      doc.setFont(fontFamily, 'normal');

      let y = contentTopY + 8;
      // Seção: 1. Dados da devolução
      doc.setFont(fontFamily, 'bold');
      doc.text('1. Dados da devolução', 15, y);
      doc.setFont(fontFamily, 'normal');
      y += 8;
      this.drawBoldLabelValue(doc, fontFamily, 'Quem Devolveu', quemDevolveuNome, 15, y);
      y += 8;
      this.drawBoldLabelValue(doc, fontFamily, 'Quem Recebeu', quemRecebeuNome, 15, y);
      y += 8;
      this.drawBoldLabelValue(doc, fontFamily, 'Data da Devolução', this.formatarData(dataDevolucao), 15, y);
      y += 12;

      // Tabela de equipamentos devolvidos
      const rows = this.selectedEquipamentos.map(id => {
        const eq = this.getEquipamentosFiltrados().find(e => e.id === id) || this.equipamentosAlocados.find(e => e.id === id);
        const modelo = eq ? this.getModeloNome(eq.modeloId) : '';
        const marca = eq ? this.getMarcaNomePorModeloId(eq.modeloId) : '';
        const estado = this.estadoEquipamentosSelecionados[id] || '';
        return [eq?.numeroSerie || '—', marca || '—', modelo || '—', estado || '—'];
      });

      autoTable(doc, {
        head: [[ 'Nº de Série', 'Marca', 'Modelo', 'Estado Selecionado' ]],
        body: rows,
        startY: y + 6,
        theme: 'grid',
        styles: { fontSize: 12, font: fontFamily, cellPadding: 3 },
        headStyles: { fillColor: [241, 245, 249], textColor: 30, lineColor: [203, 213, 225], lineWidth: 0.3 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        bodyStyles: { lineColor: [203, 213, 225], lineWidth: 0.2 },
        // Remover margin.top para não sobrepor o startY
        margin: { left: 15, right: 15, bottom: pageH - contentBottomY },
        // Desenhar BG ANTES do conteúdo das páginas criadas pela tabela.
        // Importante: NÃO desenhar novamente o BG na página 1 aqui, pois isso
        // sobrepõe o título e os "Dados da devolução" desenhados anteriormente.
        willDrawPage: (data: any) => {
          if (data.pageNumber !== 1) {
            drawBgPageSpecific(doc, data.pageNumber);
          }
        }
      });

      // Área de Anotações
      const finalY = (doc as any).lastAutoTable?.finalY || (y + 40);
      const margemL = 15;
      const margemR = 15;
      const larguraUtil = pageW - margemL - margemR;
      let cursorY = finalY + 8;
      const drawAnotacaoLinha = (ly: number) => {
        doc.setLineWidth(0.2);
        doc.line(margemL, ly, margemL + larguraUtil, ly);
      };
      const verificaPagina = () => {
        if (cursorY > contentBottomY - 12) {
          doc.addPage('a4', 'p');
          const currentPage = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 2;
          drawBgPageSpecific(doc, currentPage);
          // Regra: na segunda (ou próximas) páginas o texto deve começar no topo
          // do conteúdo disponível. Usamos uma margem superior mínima de 15mm.
          cursorY = 15;
        }
      };
      if (cursorY + 30 < contentBottomY) {
        doc.setFont(fontFamily, 'bold');
        doc.text('Anotações', margemL, cursorY);
        doc.setFont(fontFamily, 'normal');
        cursorY += 6;
        drawAnotacaoLinha(cursorY);
        cursorY += 10; drawAnotacaoLinha(cursorY);
        cursorY += 10; drawAnotacaoLinha(cursorY);
      } else {
        doc.addPage('a4', 'p');
        drawBgPageSpecific(doc, 2);
        doc.setFont(fontFamily, 'bold');
        doc.text('Anotações', margemL, contentTopY);
        doc.setFont(fontFamily, 'normal');
        cursorY = contentTopY + 6;
        drawAnotacaoLinha(cursorY);
        cursorY += 10; drawAnotacaoLinha(cursorY);
        cursorY += 10; drawAnotacaoLinha(cursorY);
      }

      // Cláusulas e Declaração
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
      escreveTitulo('2. Cláusulas de Devolução e Responsabilidade do Material Informático', cursorY);
      cursorY += 8; verificaPagina();
      cursorY = escreveParagrafo('O equipamento a ser devolvido é propriedade da instituição e foi utilizado exclusivamente para fins laborais, de acordo com as normas e regulamentos internos. O utilizador obriga-se a:', cursorY);
      cursorY += 4;
      const clausulas = [
        'Devolver o equipamento em perfeitas condições de funcionamento e conservação;',
        'Garantir que todos os acessórios e componentes entregues inicialmente sejam devolvidos;',
        'Remover todos os dados pessoais do equipamento antes da devolução, respeitando as políticas de segurança da informação;',
        'Comunicar de imediato ao departamento competente qualquer dano, avaria ou perda de componentes;',
        'Apresentar o equipamento limpo e em condições adequadas de higiene;',
        'Cumprir o prazo estabelecido para a devolução do equipamento.'
      ];
      clausulas.forEach(item => {
        verificaPagina();
        const bullet = `• ${item}`;
        const lines = doc.splitTextToSize(bullet, larguraUtil);
        doc.text(lines, margemL, cursorY);
        cursorY += (lines.length * 6);
      });

      cursorY += 6; verificaPagina();
      escreveTitulo('3.2. Declaração e Compromisso do Utilizador na Devolução', cursorY);
      cursorY += 8; verificaPagina();
      cursorY = escreveParagrafo('Declaro, para todos os efeitos, que:', cursorY);
      const declaracoes = [
        'Devolvo o equipamento conforme recebido, com todos os seus componentes e acessórios;',
        'Li e compreendi todas as cláusulas deste guia de devolução;',
        'Cumpri integralmente o Regulamento de Gestão, Utilização e Segurança das TICs da instituição durante o período de utilização;',
        'Removi todos os meus dados pessoais do equipamento;',
        'O equipamento encontra-se em bom estado de conservação e funcionamento, salvo o desgaste natural pelo uso;',
        'Estou ciente de que a não devolução ou devolução em más condições pode resultar em processo disciplinar e/ou ressarcimento dos danos causados.'
      ];
      declaracoes.forEach(item => {
        verificaPagina();
        const bullet = `• ${item}`;
        const lines = doc.splitTextToSize(bullet, larguraUtil);
        doc.text(lines, margemL, cursorY);
        cursorY += (lines.length * 6);
      });

      // Assinaturas
      cursorY += 10; verificaPagina();
      const colW = (pageW - margemL - margemR - 12) / 2;
      const leftX = margemL;
      const rightX = margemL + colW + 12;
      const assinaturaY = Math.min(cursorY + 6, contentBottomY - 20);
      doc.setLineWidth(0.6);
      doc.line(leftX, assinaturaY, leftX + colW, assinaturaY);
      doc.line(rightX, assinaturaY, rightX + colW, assinaturaY);
      doc.setFontSize(10);
      doc.text('Assinatura do Utilizador que devolveu', leftX, assinaturaY + 6);
      doc.text('Assinatura do Chefe de Departamento', rightX, assinaturaY + 6);

      // Descarregar imediatamente
      const pdfBlob = doc.output('blob');
      console.log('Tamanho PDF gerado (bytes):', pdfBlob.size);
      const safeName = (quemDevolveuNome || 'utilizador').replace(/\s+/g, '_');
      const fileName = `Guia_de_Devolucao_${safeName}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Abrir em nova aba para visualização em vez de descarregar
      try {
        const url = URL.createObjectURL(pdfBlob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) {
        console.error('Erro ao abrir PDF em nova aba:', e);
      }

      // Preencher o campo com o File para anexar manualmente se desejar
      this.form.patchValue({ pathGuiaDevolucao: file });

      // Upload automático da guia gerada
      this.isUploadingGuia = true;
      this.fileUploadService.uploadFile(file, 'guias').subscribe({
        next: (res: FileUploadResponse | any) => {
          if (res && res.success && res.filePath) {
            this.form.patchValue({ pathGuiaDevolucao: res.filePath });
            // alert('Guia de devolução gerada e carregada automaticamente.');
            this.isUploadingGuia = false;
          } else {
            this.form.patchValue({ pathGuiaDevolucao: file });
          }
        },
        error: (err: any) => {
          console.error('Falha no upload automático da guia de devolução:', err);
          this.form.patchValue({ pathGuiaDevolucao: file });
          if (err?.status === 0) {
            alert('Não foi possível conectar ao servidor. Verifique se o backend está em execução em http://localhost:8080.');
          } else if (err?.status === 413) {
            alert('Arquivo muito grande para o servidor. Reduza o tamanho e tente novamente.');
          } else if (err?.status === 415) {
            alert('Tipo de conteúdo não suportado pelo servidor.');
          } else {
            const backendMsg = err?.error?.error || err?.message || 'Erro desconhecido no upload.';
            alert(`Erro ao enviar a Guia: ${backendMsg}`);
          }
          this.isUploadingGuia = false;
        }
      });

      alert('Guia de devolução gerada com sucesso. A guia foi aberta numa nova aba.');
    } catch (err) {
      console.error('Erro ao gerar Guia de Devolução:', err);
      alert('Falha ao gerar a Guia em PDF.');
    }
  }
}