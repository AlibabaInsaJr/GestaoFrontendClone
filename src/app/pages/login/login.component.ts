import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginRequest } from '../../services/auth.service';
import { ErrorHandlerService } from '../../services/error-handler.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;

  // Fallback programático para o logo
  logoSrc = '/assets/logo.svg.png';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private errorHandler: ErrorHandlerService
  ) {
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      
      const { username, password, rememberMe } = this.loginForm.value;
      
      const loginRequest: LoginRequest = {
        username: username,
        password: password
      };
      
      this.authService.login(loginRequest, rememberMe).subscribe({
        next: (response) => {
          this.isLoading = false;
          
          // Verificar se há uma URL de redirecionamento salva
          const redirectUrl = localStorage.getItem('redirectUrl') || '/dashboard';
          localStorage.removeItem('redirectUrl');
          
          this.router.navigate([redirectUrl]);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Erro no login:', error);
          
          const errorMessage = this.errorHandler.handleHttpError(error);
          alert(errorMessage.message);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Fallback de carregamento do logo
  onLogoError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (this.logoSrc !== 'assets/logo.svg.png') {
      this.logoSrc = 'assets/logo.svg.png';
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return this.getRequiredMessage(fieldName);
      }
      if (field.errors['minlength'] && fieldName === 'username') {
        return 'Nome de usuário deve ter pelo menos 3 caracteres';
      }
      if (field.errors['minlength']) {
        return 'Senha deve ter pelo menos 6 caracteres';
      }
    }
    
    return '';
  }

  private getRequiredMessage(fieldName: string): string {
    const messages: { [key: string]: string } = {
      'username': 'Nome de usuário é obrigatório',
      'password': 'Senha é obrigatória'
    };
    return messages[fieldName] || 'Campo obrigatório';
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field?.errors && field.touched);
  }
}