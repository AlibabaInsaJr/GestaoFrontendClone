import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { LoadingService } from '../../services/loading.service';
import { LoadingComponent } from '../loading/loading.component';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule, LoadingComponent],
  templateUrl: './loading-overlay.component.html',
  styleUrls: ['./loading-overlay.component.scss']
})
export class LoadingOverlayComponent implements OnInit, OnDestroy {
  isLoading = false;
  private subscription: Subscription = new Subscription();

  constructor(private loadingService: LoadingService) {}

  ngOnInit(): void {
    this.subscription = this.loadingService.loading$.subscribe(
      (loading: boolean) => {
        this.isLoading = loading;
      }
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}