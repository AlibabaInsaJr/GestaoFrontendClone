import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  constructor() {}

  show(): void {
    this.loadingSubject.next(true);
  }

  hide(): void {
    this.loadingSubject.next(false);
  }

  // Método para mostrar loading por um tempo específico
  showForDuration(duration: number = 1000): void {
    this.show();
    setTimeout(() => {
      this.hide();
    }, duration);
  }

  // Método para mostrar loading durante navegação
  showForNavigation(): void {
    this.showForDuration(800);
  }
}