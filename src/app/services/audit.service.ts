import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { 
  AuditActivity, 
  AuditActionType, 
  AuditEntityType, 
  AuditFilter, 
  AuditSummary,
  AuditActivityBuilder,
  AuditUtils
} from '../models/audit.models';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private activities: AuditActivity[] = [];
  private activitiesSubject = new BehaviorSubject<AuditActivity[]>([]);
  public activities$ = this.activitiesSubject.asObservable();

  constructor(private authService: AuthService) {
    this.loadActivitiesFromStorage();
  }

  /**
   * Registra uma nova atividade no sistema
   */
  logActivity(
    type: AuditActionType,
    entity: AuditEntityType,
    entityId: number | string,
    entityName: string,
    description: string,
    details?: any
  ): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    const activity: AuditActivity = {
      id: this.generateId(),
      type,
      entity,
      entityId,
      entityName,
      description,
      userId: currentUser.id,
      username: currentUser.username,
      timestamp: new Date(),
      details
    };

    this.activities.unshift(activity); // Adiciona no início da lista
    
    // Manter apenas as últimas 100 atividades para não sobrecarregar o localStorage
    if (this.activities.length > 100) {
      this.activities = this.activities.slice(0, 100);
    }

    this.saveActivitiesToStorage();
    this.activitiesSubject.next([...this.activities]);
  }

  /**
   * Obtém todas as atividades
   */
  getAllActivities(): AuditActivity[] {
    return [...this.activities];
  }

  /**
   * Obtém as atividades recentes (últimas N atividades)
   */
  getRecentActivities(limit: number = 10): AuditActivity[] {
    return this.activities.slice(0, limit);
  }

  /**
   * Obtém atividades por usuário
   */
  getActivitiesByUser(userId: number): AuditActivity[] {
    return this.activities.filter(activity => activity.userId === userId);
  }

  /**
   * Obtém atividades por tipo de entidade
   */
  getActivitiesByEntity(entity: string): AuditActivity[] {
    return this.activities.filter(activity => activity.entity === entity);
  }

  /**
   * Obtém atividades por tipo de operação
   */
  getActivitiesByType(type: AuditActionType): AuditActivity[] {
    return this.activities.filter(activity => activity.type === type);
  }

  /**
   * Filtra atividades baseado nos critérios fornecidos
   */
  filterActivities(filter: AuditFilter): AuditActivity[] {
    return AuditUtils.filterActivities(this.activities, filter);
  }

  /**
   * Gera um resumo das atividades
   */
  getSummary(): AuditSummary {
    return AuditUtils.generateSummary(this.activities);
  }

  /**
   * Agrupa atividades por data
   */
  getActivitiesGroupedByDate() {
    return AuditUtils.groupActivitiesByDate(this.activities);
  }

  /**
   * Obtém atividades em um período específico
   */
  getActivitiesByDateRange(startDate: Date, endDate: Date): AuditActivity[] {
    return this.activities.filter(activity => {
      const activityDate = new Date(activity.timestamp);
      return activityDate >= startDate && activityDate <= endDate;
    });
  }

  /**
   * Limpa todas as atividades
   */
  clearActivities(): void {
    this.activities = [];
    this.activitiesSubject.next([]);
    this.saveActivitiesToStorage();
  }

  /**
   * Remove todas as atividades do localStorage
   */
  clearStoredActivities(): void {
    localStorage.removeItem('audit_activities');
    this.activities = [];
    this.activitiesSubject.next([]);
  }

  /**
   * Métodos de conveniência para registrar atividades específicas
   */
  logEquipmentCreated(equipmentId: number, equipmentName: string): void {
    this.logActivity('CREATE', 'equipamento', equipmentId, equipmentName, 
      `Equipamento "${equipmentName}" foi criado`);
  }

  logEquipmentUpdated(equipmentId: number, equipmentName: string): void {
    this.logActivity('UPDATE', 'equipamento', equipmentId, equipmentName, 
      `Equipamento "${equipmentName}" foi atualizado`);
  }

  logEquipmentDeleted(equipmentId: number, equipmentName: string): void {
    this.logActivity('DELETE', 'equipamento', equipmentId, equipmentName, 
      `Equipamento "${equipmentName}" foi removido`);
  }

  logAllocationCreated(allocationId: number, equipmentName: string, userName: string): void {
    this.logActivity('CREATE', 'alocacao', allocationId, `${equipmentName} → ${userName}`, 
      `Equipamento "${equipmentName}" foi alocado para ${userName}`);
  }

  logAllocationUpdated(allocationId: number, equipmentName: string, userName: string): void {
    this.logActivity('UPDATE', 'alocacao', allocationId, `${equipmentName} → ${userName}`, 
      `Alocação do equipamento "${equipmentName}" foi atualizada`);
  }

  logAllocationDeleted(allocationId: number, equipmentName: string): void {
    this.logActivity('DELETE', 'alocacao', allocationId, equipmentName, 
      `Alocação do equipamento "${equipmentName}" foi removida`);
  }

  logRepairCreated(repairId: number, equipmentName: string): void {
    this.logActivity('CREATE', 'reparacao', repairId, equipmentName, 
      `Reparação do equipamento "${equipmentName}" foi iniciada`);
  }

  logRepairUpdated(repairId: number, equipmentName: string): void {
    this.logActivity('UPDATE', 'reparacao', repairId, equipmentName, 
      `Reparação do equipamento "${equipmentName}" foi atualizada`);
  }

  logRepairCompleted(repairId: number, equipmentName: string): void {
    this.logActivity('UPDATE', 'reparacao', repairId, equipmentName, 
      `Reparação do equipamento "${equipmentName}" foi concluída`);
  }

  logReturnCreated(returnId: number, equipmentName: string, returnedBy: string): void {
    this.logActivity('CREATE', 'devolucao', returnId, equipmentName, 
      `Equipamento "${equipmentName}" foi devolvido por ${returnedBy}`);
  }

  logDisuseCreated(disuseId: number, equipmentName: string, reason: string): void {
    this.logActivity('CREATE', 'baixa', disuseId, equipmentName, 
      `Equipamento "${equipmentName}" foi dado de baixa. Motivo: ${reason}`);
  }

  /**
   * Gera um ID único para a atividade
   */
  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Salva as atividades no localStorage
   */
  private saveActivitiesToStorage(): void {
    try {
      localStorage.setItem('audit_activities', JSON.stringify(this.activities));
    } catch (error) {
      console.error('Erro ao salvar atividades no localStorage:', error);
    }
  }

  /**
   * Carrega as atividades do localStorage
   */
  private loadActivitiesFromStorage(): void {
    try {
      const stored = localStorage.getItem('audit_activities');
      if (stored) {
        this.activities = JSON.parse(stored).map((activity: any) => ({
          ...activity,
          timestamp: new Date(activity.timestamp)
        }));
        this.activitiesSubject.next([...this.activities]);
      }
    } catch (error) {
      console.error('Erro ao carregar atividades do localStorage:', error);
      this.activities = [];
    }
  }

  /**
   * Obtém o ícone Material para o tipo de atividade
   */
  getActivityIcon(type: string): string {
    switch (type) {
      case 'CREATE': return 'add_circle';
      case 'UPDATE': return 'edit';
      case 'DELETE': return 'delete';
      case 'READ': return 'visibility';
      default: return 'info';
    }
  }

  /**
   * Obtém a cor para o tipo de atividade
   */
  getActivityColor(type: string): string {
    switch (type) {
      case 'CREATE': return '#4CAF50'; // Verde
      case 'UPDATE': return '#2196F3'; // Azul
      case 'DELETE': return '#F44336'; // Vermelho
      case 'READ': return '#FF9800'; // Laranja
      default: return '#9E9E9E'; // Cinza
    }
  }

  /**
   * Obtém o ícone Material para o tipo de entidade
   */
  getEntityIcon(entity: string): string {
    switch (entity) {
      case 'equipamento': return 'devices';
      case 'alocacao': return 'assignment_turned_in';
      case 'reparacao': return 'build';
      case 'devolucao': return 'assignment_return';
      case 'baixa': return 'delete_forever';
      case 'usuario': return 'person';
      case 'empresa': return 'business';
      default: return 'folder';
    }
  }
}