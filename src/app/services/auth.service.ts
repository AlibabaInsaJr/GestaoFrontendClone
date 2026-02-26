import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  type: string;
  id: number;
  username: string;
  email: string;
  roles: string[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenCheckInterval: any = null;
  private baseUrl = `${environment.apiUrl}/api/auth`;
  private tokenKey = 'auth-token';
  private userKey = 'auth-user';
  
  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.checkInitialAuthState());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  /**
   * Verifica o estado inicial de autenticação
   */
  private checkInitialAuthState(): boolean {
    const token = localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey);
    const userStr = localStorage.getItem(this.userKey) || sessionStorage.getItem(this.userKey);
    
    if (!token || !userStr) {
      return false;
    }
    
    try {
      // Verificar se o token é válido estruturalmente
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const isValid = payload.exp > currentTime;
      
      // Verificar se o usuário pode ser parseado
      JSON.parse(userStr);
      
      return isValid;
    } catch (error) {
      // Se não conseguir decodificar, assumir como válido para deixar o servidor validar
      return true;
    }
  }

  /**
   * Inicializa a autenticação verificando o token no servidor
   */
  private initializeAuth(): void {
    const token = this.getToken();
    const user = this.getUserFromStorage();
    const persistFlag = localStorage.getItem('auth-persist') || sessionStorage.getItem('auth-persist');
    
    console.log('AuthService: Inicializando autenticação - Token:', !!token, 'User:', !!user, 'Persist:', persistFlag);
    
    // Verificar se há token e usuário armazenados
    if (token && user) {
      console.log('AuthService: Token e usuário encontrados, verificando validade');
      
      // Verificar se o token é válido estruturalmente
      if (this.isTokenValid()) {
        console.log('AuthService: Token válido, restaurando sessão');
        
        // Restaurar o usuário na sessão
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
        
        // Iniciar timer de validação
        this.startTokenValidationTimer();
        
        console.log('AuthService: Usuário autenticado restaurado da sessão');
        
        // Validar token no servidor para garantir que ainda é válido
        this.validateToken().subscribe({
          next: () => {
            console.log('AuthService: Token validado no servidor com sucesso');
          },
          error: (err) => {
            console.warn('AuthService: Token inválido no servidor:', err);
            this.clearSession();
            if (!this.router.url.includes('/login')) {
              this.router.navigate(['/login']);
            }
          }
        });
      } else {
        console.warn('AuthService: Token expirado encontrado durante inicialização');
        this.clearSession();
        // Redirecionar para login apenas se não estiver já na página de login
        if (!this.router.url.includes('/login')) {
          this.router.navigate(['/login']);
        }
      }
    } else {
      console.log('AuthService: Nenhum token ou usuário encontrado');
      // Limpar qualquer resíduo de sessão que possa existir
      this.clearSession();
    }
    
    // Log do estado final
    console.log('AuthService: Estado final da inicialização - Autenticado:', this.isAuthenticatedSubject.value);
  }

  /**
   * Realiza o login do usuário
   */
  login(credentials: LoginRequest, rememberMe: boolean = true): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, credentials)
      .pipe(
        tap(response => {
          this.setSession(response, rememberMe);
        }),
        catchError(error => {
          console.error('Erro no login:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Realiza o registo de um novo usuário
   */
  register(userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, userData)
      .pipe(
        catchError(error => {
          console.error('Erro no registo:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Realiza o logout do usuário
   */
  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  /**
   * Limpa a sessão do usuário
   */
  private clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem('auth-persist');
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);
    sessionStorage.removeItem('auth-persist');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.stopTokenValidationTimer();
    console.log('AuthService: Sessão limpa completamente');
  }

  /**
   * Inicia timer para verificação periódica do token
   */
  private startTokenValidationTimer(): void {
    // Verificar token a cada 5 minutos
    this.tokenCheckInterval = setInterval(() => {
      if (this.isAuthenticated() && !this.isTokenValid()) {
        console.warn('Token expirado detectado. Limpando sessão.');
        this.clearSession();
      }
    }, 5 * 60 * 1000); // 5 minutos
  }

  /**
   * Para o timer de verificação do token
   */
  private stopTokenValidationTimer(): void {
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
      this.tokenCheckInterval = null;
    }
  }

  /**
   * Verifica se o token é válido (estrutura e expiração)
   */
  private isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      // Verificar se o token tem a estrutura correta de um JWT
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('Token JWT com formato inválido');
        return false;
      }
      
      // Verificar se o token não está expirado
      const payload = JSON.parse(atob(parts[1]));
      if (!payload || !payload.exp) {
        console.warn('Token JWT sem data de expiração');
        return false;
      }
      
      const currentTime = Math.floor(Date.now() / 1000);
      const isValid = payload.exp > currentTime;
      
      if (!isValid) {
        console.warn('Token JWT expirado. Expiração:', new Date(payload.exp * 1000), 'Agora:', new Date());
        // Limpar a sessão quando o token estiver expirado
        this.clearSession();
      } else {
        const minutesRemaining = Math.floor((payload.exp - currentTime) / 60);
        console.log(`Token válido. Expira em ${minutesRemaining} minutos`);
      }
      
      return isValid;
    } catch (error) {
      console.error('Erro ao validar token JWT:', error);
      return false;
    }
  }

  /**
   * Obtém o token JWT armazenado
   */
  getToken(): string | null {
    // Tentar obter o token do localStorage primeiro, depois do sessionStorage
    const token = localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey);
    
    if (token) {
      console.log('AuthService.getToken: Token encontrado no storage');
      // Verificar se o token tem formato válido
      if (token.split('.').length !== 3) {
        console.error('AuthService.getToken: Token com formato inválido');
        // Limpar token inválido
        localStorage.removeItem(this.tokenKey);
        sessionStorage.removeItem(this.tokenKey);
        return null;
      }
    } else {
      console.warn('AuthService.getToken: Token não encontrado no storage');
    }
    
    return token;
  }

  /**
   * Força a re-inicialização da autenticação (útil após refresh)
   */
  public reinitializeAuth(): void {
    console.log('AuthService: Forçando re-inicialização da autenticação');
    this.initializeAuth();
  }

  /**
   * Verifica se há dados de autenticação armazenados
   */
  public hasStoredAuth(): boolean {
    const token = this.getToken();
    const user = this.getUserFromStorage();
    return !!(token && user);
  }

  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getCurrentUser();
    
    // Primeiro verificar se token e user existem
    if (!token || !user) {
      console.warn('AuthService.isAuthenticated - Token ou usuário não encontrado');
      return false;
    }
    
    // Depois verificar se o token é válido
    const tokenValid = this.isTokenValid();
    console.log('AuthService.isAuthenticated - Token presente:', !!token, 'Usuário presente:', !!user, 'Token válido:', tokenValid);
    
    if (!tokenValid) {
      console.warn('Sessão inválida detectada em isAuthenticated(). Limpando sessão...');
      this.clearSession();
      return false;
    }
    
    return true;
  }

  /**
   * Obtém o usuário atual
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Verifica se o usuário tem uma role específica
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    console.log('AuthService.hasRole - Verificando role:', role, 'User:', user, 'User roles:', user?.roles);
    const hasRole = user ? user.roles.includes(role) : false;
    console.log('AuthService.hasRole - Resultado:', hasRole);
    return hasRole;
  }

  /**
   * Verifica se o usuário tem alguma das roles especificadas
   */
  hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    console.log('AuthService.hasAnyRole - Verificando roles:', roles, 'User:', user, 'User roles:', user?.roles);
    if (!user) {
      console.log('AuthService.hasAnyRole - Usuário não encontrado');
      return false;
    }
    const hasAnyRole = roles.some(role => user.roles.includes(role));
    console.log('AuthService.hasAnyRole - Resultado:', hasAnyRole);
    return hasAnyRole;
  }

  /**
   * Verifica se o usuário é administrador
   */
  isAdmin(): boolean {
    return this.hasRole('ROLE_ADMIN') || this.hasRole('ADMIN');
  }

  /**
   * Atualiza o perfil do usuário
   */
  updateProfile(userData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/profile`, userData, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        // Atualizar dados do usuário no localStorage se necessário
        const currentUser = this.getCurrentUser();
        if (currentUser) {
          const updatedUser = { ...currentUser, ...response };
          localStorage.setItem(this.userKey, JSON.stringify(updatedUser));
          this.currentUserSubject.next(updatedUser);
        }
      }),
      catchError(error => {
        console.error('Erro ao atualizar perfil:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Solicita redefinição de senha
   */
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/forgot-password`, { email })
      .pipe(
        catchError(error => {
          console.error('Erro ao solicitar redefinição de senha:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Redefine a senha
   */
  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/reset-password`, { token, newPassword })
      .pipe(
        catchError(error => {
          console.error('Erro ao redefinir senha:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Valida o token atual
   */
  validateToken(): Observable<any> {
    return this.http.get(`${this.baseUrl}/validate`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Token inválido:', error);
        // Usar clearSession() em vez de logout() para evitar dependência circular
        this.clearSession();
        return throwError(() => error);
      })
    );
  }

  // Métodos privados
  private setSession(authResult: LoginResponse, rememberMe: boolean = true): void {
    if (!authResult || !authResult.token) {
      console.error('Tentativa de salvar sessão com dados inválidos:', authResult);
      return;
    }
    
    // Sempre usar localStorage por padrão para persistir após refresh
    const primaryStorage = rememberMe ? localStorage : sessionStorage;
    const secondaryStorage = rememberMe ? sessionStorage : localStorage;
    
    // Limpar storage secundário para evitar conflitos
    secondaryStorage.removeItem(this.tokenKey);
    secondaryStorage.removeItem(this.userKey);
    secondaryStorage.removeItem('auth-persist');
    
    // Salvar no storage principal
    primaryStorage.setItem(this.tokenKey, authResult.token);
    
    const user: User = {
      id: authResult.id,
      username: authResult.username,
      email: authResult.email,
      roles: authResult.roles || []
    };
    
    console.log('AuthService.setSession - Usuário criado:', user);
    console.log('AuthService.setSession - Roles do usuário:', user.roles);
    
    primaryStorage.setItem(this.userKey, JSON.stringify(user));
    
    // Salvar também uma flag de persistência
    primaryStorage.setItem('auth-persist', rememberMe.toString());
    
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
    
    console.log(`Sessão salva em ${rememberMe ? 'localStorage (persistente)' : 'sessionStorage (temporária)'}`);
    
    // Iniciar timer de validação
    this.startTokenValidationTimer();
  }

  private getUserFromStorage(): User | null {
    const userStr = localStorage.getItem(this.userKey) || sessionStorage.getItem(this.userKey);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Erro ao parsear usuário do storage:', error);
        localStorage.removeItem(this.userKey);
        sessionStorage.removeItem(this.userKey);
      }
    }
    return null;
  }

  private hasValidTokenStructure(): boolean {
    return this.isTokenValid();
  }

  private hasValidToken(): boolean {
    const token = this.getToken();
    const user = this.getCurrentUser();
    return !!(token && user && this.isTokenValid());
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
}