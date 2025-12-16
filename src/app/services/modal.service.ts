import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  constructor() {}

  /**
   * Abre um modal
   */
  openModal(): void {
    document.body.classList.add('modal-open');
  }

  /**
   * Fecha um modal
   */
  closeModal(): void {
    document.body.classList.remove('modal-open');
  }
}