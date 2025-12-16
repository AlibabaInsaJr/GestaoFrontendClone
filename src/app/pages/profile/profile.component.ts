import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ErrorHandlerService } from '../../services/error-handler.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="profile-container">
      <div class="profile-header">
        <h2><i class="fas fa-user-circle"></i> Meu Perfil</h2>
        <button class="btn-back" (click)="goBack()">
          <i class="fas fa-arrow-left"></i> Voltar
        </button>
      </div>

      <div class="profile-content" *ngIf="currentUser">
        <div class="profile-info">
          <div class="avatar-section">
            <div class="avatar">
              <i class="fas fa-user-circle"></i>
            </div>
            <h3>{{ currentUser.username }}</h3>
            <p class="user-roles">
              <span class="role-badge" *ngFor="let role of currentUser.roles">
                {{ role }}
              </span>
            </p>
          </div>

          <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="profile-form">
            <div class="form-group">
              <label for="username">Nome de Usuário</label>
              <input
                type="text"
                id="username"
                formControlName="username"
                class="form-control"
                [class.is-invalid]="hasFieldError('username')"
              >
              <div class="invalid-feedback" *ngIf="hasFieldError('username')">
                {{ getFieldError('username') }}
              </div>
            </div>

            <div class="form-group">
              <label for="email">Email</label>
              <input
                type="email"
                id="email"
                formControlName="email"
                class="form-control"
                [class.is-invalid]="hasFieldError('email')"
              >
              <div class="invalid-feedback" *ngIf="hasFieldError('email')">
                {{ getFieldError('email') }}
              </div>
            </div>

            <div class="form-group">
              <label for="currentPassword">Senha Atual (para confirmar alterações)</label>
              <input
                type="password"
                id="currentPassword"
                formControlName="currentPassword"
                class="form-control"
                [class.is-invalid]="hasFieldError('currentPassword')"
              >
              <div class="invalid-feedback" *ngIf="hasFieldError('currentPassword')">
                {{ getFieldError('currentPassword') }}
              </div>
            </div>

            <div class="form-group">
              <label for="newPassword">Nova Senha (opcional)</label>
              <input
                type="password"
                id="newPassword"
                formControlName="newPassword"
                class="form-control"
                [class.is-invalid]="hasFieldError('newPassword')"
              >
              <div class="invalid-feedback" *ngIf="hasFieldError('newPassword')">
                {{ getFieldError('newPassword') }}
              </div>
            </div>

            <div class="form-group" *ngIf="profileForm.get('newPassword')?.value">
              <label for="confirmPassword">Confirmar Nova Senha</label>
              <input
                type="password"
                id="confirmPassword"
                formControlName="confirmPassword"
                class="form-control"
                [class.is-invalid]="hasFieldError('confirmPassword')"
              >
              <div class="invalid-feedback" *ngIf="hasFieldError('confirmPassword')">
                {{ getFieldError('confirmPassword') }}
              </div>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-primary" [disabled]="!profileForm.valid || isLoading">
                <i class="fas fa-spinner fa-spin" *ngIf="isLoading"></i>
                <i class="fas fa-save" *ngIf="!isLoading"></i>
                {{ isLoading ? 'Salvando...' : 'Salvar Alterações' }}
              </button>
              <button type="button" class="btn-secondary" (click)="resetForm()">
                <i class="fas fa-undo"></i> Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }

    .profile-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #e9ecef;
    }

    .profile-header h2 {
      color: #495057;
      margin: 0;
    }

    .btn-back {
      background: #6c757d;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .btn-back:hover {
      background: #5a6268;
    }

    .profile-content {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .avatar-section {
      text-align: center;
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .avatar i {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .avatar-section h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
    }

    .user-roles {
      margin: 0;
    }

    .role-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
      margin: 0 0.25rem;
    }

    .profile-form {
      padding: 2rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #495057;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 1rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #80bdff;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }

    .form-control.is-invalid {
      border-color: #dc3545;
    }

    .invalid-feedback {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      margin-top: 2rem;
    }

    .btn-primary {
      background: #007bff;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0056b3;
    }

    .btn-primary:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }

    @media (max-width: 768px) {
      .profile-container {
        padding: 1rem;
      }

      .profile-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }

      .form-actions {
        flex-direction: column;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  currentUser: User | null = null;
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private errorHandler: ErrorHandlerService
  ) {
    this.profileForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      currentPassword: ['', [Validators.required]],
      newPassword: [''],
      confirmPassword: ['']
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      this.profileForm.patchValue({
        username: this.currentUser.username,
        email: this.currentUser.email
      });
    }
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      this.isLoading = true;
      
      const formData = this.profileForm.value;
      const updateData: any = {
        username: formData.username,
        email: formData.email,
        currentPassword: formData.currentPassword
      };

      if (formData.newPassword) {
        updateData.newPassword = formData.newPassword;
      }

      this.authService.updateProfile(updateData).subscribe({
        next: (response) => {
          this.isLoading = false;
          alert('Perfil atualizado com sucesso!');
          this.profileForm.get('currentPassword')?.setValue('');
          this.profileForm.get('newPassword')?.setValue('');
          this.profileForm.get('confirmPassword')?.setValue('');
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Erro ao atualizar perfil:', error);
          const errorMessage = this.errorHandler.handleHttpError(error);
          this.errorHandler.showError(errorMessage);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  resetForm(): void {
    if (this.currentUser) {
      this.profileForm.patchValue({
        username: this.currentUser.username,
        email: this.currentUser.email,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.profileForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        return this.getRequiredMessage(fieldName);
      }
      if (field.errors['email']) {
        return 'Email inválido';
      }
      if (field.errors['minlength']) {
        return `Mínimo de ${field.errors['minlength'].requiredLength} caracteres`;
      }
      if (field.errors['passwordMismatch']) {
        return 'As senhas não coincidem';
      }
    }
    return '';
  }

  private getRequiredMessage(fieldName: string): string {
    const fieldNames: { [key: string]: string } = {
      username: 'Nome de usuário é obrigatório',
      email: 'Email é obrigatório',
      currentPassword: 'Senha atual é obrigatória',
      confirmPassword: 'Confirmação de senha é obrigatória'
    };
    return fieldNames[fieldName] || 'Campo obrigatório';
  }

  private markFormGroupTouched(): void {
    Object.keys(this.profileForm.controls).forEach(key => {
      this.profileForm.get(key)?.markAsTouched();
    });
  }

  private passwordMatchValidator(group: FormGroup) {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      group.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }
}