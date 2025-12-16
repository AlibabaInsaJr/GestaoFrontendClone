import { Component, Input, Output, EventEmitter, forwardRef, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileUploadComponent),
      multi: true
    }
  ]
})
export class FileUploadComponent implements ControlValueAccessor {
  @Input() accept: string = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
  @Input() maxSize: number = 5 * 1024 * 1024; // 5MB
  @Input() label: string = 'Selecionar Arquivo';
  @Input() placeholder: string = 'Nenhum arquivo selecionado';
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() size: 'compact' | 'medium' | 'large' = 'compact';
  @Input() showFileName: boolean = true;
  @Input() loadedText: string = 'Anexo carregado';
  
  @Output() fileSelected = new EventEmitter<File | null>();
  @Output() error = new EventEmitter<string>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;
  fileName: string = '';
  fileUrl: string = '';
  isDragOver: boolean = false;

  private onChange = (value: any) => {};
  private onTouched = () => {};

  constructor(private cdr: ChangeDetectorRef) {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    this.handleFile(file);
    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  private handleFile(file: File): void {
    if (!file) {
      this.clearFile();
      return;
    }

    // Validar tipo de arquivo
    if (this.accept && !this.isFileTypeValid(file)) {
      this.error.emit('Tipo de arquivo não permitido');
      return;
    }

    // Validar tamanho
    if (file.size > this.maxSize) {
      this.error.emit(`Arquivo muito grande. Tamanho máximo: ${this.formatFileSize(this.maxSize)}`);
      return;
    }

    this.selectedFile = file;
    this.fileName = file.name;
    this.fileUrl = URL.createObjectURL(file);
    
    this.fileSelected.emit(file);
    this.onChange(file);
    this.onTouched();
    
    // Forçar detecção de mudanças para atualizar a UI imediatamente
    this.cdr.detectChanges();
  }

  private isFileTypeValid(file: File): boolean {
    const acceptedTypes = this.accept.split(',').map(type => type.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type;
    
    return acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileExtension === type.toLowerCase();
      }
      return mimeType.match(type.replace('*', '.*'));
    });
  }

  clearFile(): void {
    this.selectedFile = null;
    this.fileName = '';
    if (this.fileUrl) {
      URL.revokeObjectURL(this.fileUrl);
      this.fileUrl = '';
    }
    
    // Limpar o input também
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    
    this.fileSelected.emit(null);
    this.onChange(null);
    
    // Forçar detecção de mudanças
    this.cdr.detectChanges();
  }

  downloadFile(): void {
    if (this.fileUrl) {
      const link = document.createElement('a');
      link.href = this.fileUrl;
      link.download = this.fileName || 'arquivo';
      link.click();
    }
  }

  // Texto a exibir quando não queremos mostrar o nome real
  getDisplayName(): string {
    if (!this.showFileName) {
      return this.loadedText;
    }
    return this.fileName || this.placeholder;
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    if (value instanceof File) {
      this.handleFile(value);
    } else if (typeof value === 'string' && value) {
      // Se receber uma URL/path, mostrar como arquivo existente
      this.fileName = value.split('/').pop() || value;
      this.fileUrl = value;
      this.selectedFile = null; // Garantir que selectedFile seja null para strings
    } else {
      this.clearFile();
    }
    
    // Forçar detecção de mudanças
    this.cdr.detectChanges();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  getFileIcon(): string {
    if (!this.fileName && !this.fileUrl) return 'fa-file';
    
    const extension = (this.fileName || '').split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'fa-file-pdf';
      case 'doc':
      case 'docx':
        return 'fa-file-word';
      case 'xls':
      case 'xlsx':
        return 'fa-file-excel';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
        return 'fa-file-image';
      case 'txt':
        return 'fa-file-alt';
      case 'zip':
      case 'rar':
        return 'fa-file-archive';
      default:
        return 'fa-file';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}