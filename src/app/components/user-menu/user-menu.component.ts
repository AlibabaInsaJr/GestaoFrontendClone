import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="user-menu" *ngIf="currentUser">
      <div class="user-info">
        <div class="user-avatar">
          <i class="fas fa-user-circle"></i>
        </div>
        <div class="user-details">
          <span class="user-name">{{ currentUser.username }}</span>
          <span class="user-email">{{ currentUser.email }}</span>
        </div>
      </div>
      
      <div class="user-actions">
        <button class="btn-profile" (click)="goToProfile()" title="Perfil">
          <i class="fas fa-user-cog"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .user-menu {
      display: flex;
      align-items: center;
      gap: 2rem;
      padding: 0.75rem 2rem;
      background: transparent;
      border-radius: 8px;
      color: #333;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-grow: 1;
    }

    .user-avatar i {
      font-size: 2.5rem;
      color: #2563eb;
    }

    .user-details {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-weight: 600;
      font-size: 1rem;
    }

    .user-email {
      font-size: 0.85rem;
      opacity: 0.8;
    }

    .user-actions {
      display: flex;
      align-items: center;
    }

    .btn-profile {
      background: none;
      border: none;
      color: #2563eb;
      padding: 0.75rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 1.3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 45px;
      height: 45px;
    }

    .btn-profile:hover {
      background: rgba(37, 99, 235, 0.1);
      color: #1d4ed8;
      transform: scale(1.05);
    }

    @media (max-width: 768px) {
      .user-details {
        display: none;
      }
      
      .user-menu {
        gap: 1rem;
        padding: 0.75rem 1rem;
      }
      
      .user-avatar i {
        font-size: 2rem;
      }
    }
  `]
})
export class UserMenuComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }
}