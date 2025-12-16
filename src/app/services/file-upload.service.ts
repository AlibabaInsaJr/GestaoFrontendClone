import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpProgressEvent, HttpResponse } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface FileUploadProgress {
  progress: number;
  loaded: number;
  total: number;
}

export interface FileUploadResponse {
  success: boolean;
  fileName: string;
  filePath: string;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private baseUrl = environment.apiUrl;
  private uploadProgress = new BehaviorSubject<FileUploadProgress>({ progress: 0, loaded: 0, total: 0 });

  constructor(private http: HttpClient) {}

  /**
   * Upload de arquivo para o servidor
   * @param file Arquivo a ser enviado
   * @param category Categoria do arquivo (guia, contrato, etc.)
   * @returns Observable com o progresso e resposta do upload
   */
  uploadFile(file: File, category: string = 'documents'): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    return this.http.post<FileUploadResponse>(`${this.baseUrl}/files/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map((event: HttpEvent<FileUploadResponse>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            if (event.total) {
              const progress = Math.round(100 * event.loaded / event.total);
              this.uploadProgress.next({
                progress,
                loaded: event.loaded,
                total: event.total
              });
            }
            return { success: false, fileName: '', filePath: '', message: 'Uploading...' };
          
          case HttpEventType.Response:
            this.uploadProgress.next({ progress: 100, loaded: event.body?.fileName?.length || 0, total: event.body?.fileName?.length || 0 });
            return event.body || { success: false, fileName: '', filePath: '', error: 'Erro no upload' };
          
          default:
            return { success: false, fileName: '', filePath: '', message: 'Processando...' };
        }
      })
    );
  }

  /**
   * Download de arquivo do servidor
   * @param filePath Caminho do arquivo no servidor
   * @returns Observable com o blob do arquivo
   */
  downloadFile(filePath: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/files/download`, {
      params: { path: filePath },
      responseType: 'blob'
    });
  }

  /**
   * Excluir arquivo do servidor
   * @param filePath Caminho do arquivo no servidor
   * @returns Observable com a resposta da exclusão
   */
  deleteFile(filePath: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/files/delete`, {
      params: { path: filePath }
    });
  }

  /**
   * Obter progresso do upload atual
   * @returns Observable com o progresso do upload
   */
  getUploadProgress(): Observable<FileUploadProgress> {
    return this.uploadProgress.asObservable();
  }

  /**
   * Validar tipo de arquivo
   * @param file Arquivo a ser validado
   * @param allowedTypes Tipos permitidos
   * @returns true se o arquivo é válido
   */
  validateFileType(file: File, allowedTypes: string[]): boolean {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type;
    
    return allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileExtension === type.toLowerCase();
      }
      return mimeType.match(type.replace('*', '.*'));
    });
  }

  /**
   * Validar tamanho do arquivo
   * @param file Arquivo a ser validado
   * @param maxSizeInBytes Tamanho máximo em bytes
   * @returns true se o arquivo está dentro do limite
   */
  validateFileSize(file: File, maxSizeInBytes: number): boolean {
    return file.size <= maxSizeInBytes;
  }

  /**
   * Formatar tamanho do arquivo para exibição
   * @param bytes Tamanho em bytes
   * @returns String formatada (ex: "2.5 MB")
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Gerar nome único para o arquivo
   * @param originalName Nome original do arquivo
   * @returns Nome único com timestamp
   */
  generateUniqueFileName(originalName: string): string {
    const timestamp = new Date().getTime();
    const extension = originalName.split('.').pop();
    const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExtension}_${timestamp}.${extension}`;
  }
}