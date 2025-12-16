export interface AuditActivity {
  id: string;
  type: AuditActionType;
  entity: AuditEntityType;
  entityId: number | string;
  entityName: string;
  description: string;
  userId: number;
  username: string;
  timestamp: Date;
  details?: any;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export type AuditActionType = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';

export type AuditEntityType = 
  | 'equipamento'
  | 'alocacao'
  | 'reparacao'
  | 'devolucao'
  | 'baixa'
  | 'usuario'
  | 'empresa'
  | 'marca'
  | 'modelo'
  | 'tipo_equipamento'
  | 'grupo'
  | 'unidade'
  | 'aquisicao';

export interface AuditFilter {
  userId?: number;
  entity?: AuditEntityType;
  type?: AuditActionType;
  startDate?: Date;
  endDate?: Date;
  entityId?: number | string;
  searchTerm?: string;
}

export interface AuditSummary {
  totalActivities: number;
  activitiesByType: Record<AuditActionType, number>;
  activitiesByEntity: Record<AuditEntityType, number>;
  activitiesByUser: Record<string, number>;
  mostActiveUser: string;
  mostActiveEntity: AuditEntityType;
  mostCommonAction: AuditActionType;
  activitiesLast24Hours: number;
  activitiesLastWeek: number;
  activitiesLastMonth: number;
}

export interface ActivityDisplayConfig {
  showIcon: boolean;
  showUser: boolean;
  showTimestamp: boolean;
  showDetails: boolean;
  maxDescriptionLength: number;
  dateFormat: string;
  groupByDate: boolean;
}

export interface AuditActivityGroup {
  date: string;
  activities: AuditActivity[];
  count: number;
}

export class AuditActivityBuilder {
  private activity: Partial<AuditActivity> = {};

  static create(): AuditActivityBuilder {
    return new AuditActivityBuilder();
  }

  withType(type: AuditActionType): AuditActivityBuilder {
    this.activity.type = type;
    return this;
  }

  withEntity(entity: AuditEntityType): AuditActivityBuilder {
    this.activity.entity = entity;
    return this;
  }

  withEntityId(entityId: number | string): AuditActivityBuilder {
    this.activity.entityId = entityId;
    return this;
  }

  withEntityName(entityName: string): AuditActivityBuilder {
    this.activity.entityName = entityName;
    return this;
  }

  withDescription(description: string): AuditActivityBuilder {
    this.activity.description = description;
    return this;
  }

  withUser(userId: number, username: string): AuditActivityBuilder {
    this.activity.userId = userId;
    this.activity.username = username;
    return this;
  }

  withDetails(details: any): AuditActivityBuilder {
    this.activity.details = details;
    return this;
  }

  withSessionInfo(sessionId: string, ipAddress?: string, userAgent?: string): AuditActivityBuilder {
    this.activity.sessionId = sessionId;
    this.activity.ipAddress = ipAddress;
    this.activity.userAgent = userAgent;
    return this;
  }

  build(): AuditActivity {
    if (!this.activity.type || !this.activity.entity || !this.activity.entityId || 
        !this.activity.entityName || !this.activity.description || 
        !this.activity.userId || !this.activity.username) {
      throw new Error('Campos obrigatórios não foram preenchidos para criar a atividade de auditoria');
    }

    return {
      id: this.generateId(),
      timestamp: new Date(),
      ...this.activity
    } as AuditActivity;
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}

export class AuditUtils {
  /**
   * Formata a descrição da atividade baseada no tipo e entidade
   */
  static formatActivityDescription(
    type: AuditActionType, 
    entity: AuditEntityType, 
    entityName: string, 
    additionalInfo?: string
  ): string {
    const actionMap = {
      CREATE: 'criou',
      UPDATE: 'atualizou',
      DELETE: 'removeu',
      READ: 'visualizou'
    };

    const entityMap = {
      equipamento: 'o equipamento',
      alocacao: 'a alocação',
      reparacao: 'a reparação',
      devolucao: 'a devolução',
      baixa: 'a baixa',
      usuario: 'o usuário',
      empresa: 'a empresa',
      marca: 'a marca',
      modelo: 'o modelo',
      tipo_equipamento: 'o tipo de equipamento',
      grupo: 'o grupo',
      unidade: 'a unidade',
      aquisicao: 'a aquisição'
    };

    const action = actionMap[type] || type.toLowerCase();
    const entityDesc = entityMap[entity] || entity;
    
    let description = `${action} ${entityDesc} "${entityName}"`;
    
    if (additionalInfo) {
      description += ` - ${additionalInfo}`;
    }

    return description;
  }

  /**
   * Agrupa atividades por data
   */
  static groupActivitiesByDate(activities: AuditActivity[]): AuditActivityGroup[] {
    const groups = new Map<string, AuditActivity[]>();

    activities.forEach(activity => {
      const dateKey = activity.timestamp.toDateString();
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(activity);
    });

    return Array.from(groups.entries())
      .map(([date, activities]) => ({
        date,
        activities: activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
        count: activities.length
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Filtra atividades baseado nos critérios fornecidos
   */
  static filterActivities(activities: AuditActivity[], filter: AuditFilter): AuditActivity[] {
    return activities.filter(activity => {
      if (filter.userId && activity.userId !== filter.userId) return false;
      if (filter.entity && activity.entity !== filter.entity) return false;
      if (filter.type && activity.type !== filter.type) return false;
      if (filter.entityId && activity.entityId !== filter.entityId) return false;
      
      if (filter.startDate && activity.timestamp < filter.startDate) return false;
      if (filter.endDate && activity.timestamp > filter.endDate) return false;
      
      if (filter.searchTerm) {
        const searchLower = filter.searchTerm.toLowerCase();
        const searchableText = `${activity.description} ${activity.entityName} ${activity.username}`.toLowerCase();
        if (!searchableText.includes(searchLower)) return false;
      }
      
      return true;
    });
  }

  /**
   * Gera um resumo das atividades
   */
  static generateSummary(activities: AuditActivity[]): AuditSummary {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activitiesByType: Record<AuditActionType, number> = {
      CREATE: 0,
      UPDATE: 0,
      DELETE: 0,
      READ: 0
    };

    const activitiesByEntity: Record<string, number> = {};
    const activitiesByUser: Record<string, number> = {};

    let activitiesLast24Hours = 0;
    let activitiesLastWeek = 0;
    let activitiesLastMonth = 0;

    activities.forEach(activity => {
      // Contagem por tipo
      activitiesByType[activity.type]++;

      // Contagem por entidade
      activitiesByEntity[activity.entity] = (activitiesByEntity[activity.entity] || 0) + 1;

      // Contagem por usuário
      activitiesByUser[activity.username] = (activitiesByUser[activity.username] || 0) + 1;

      // Contagem por período
      if (activity.timestamp >= last24Hours) activitiesLast24Hours++;
      if (activity.timestamp >= lastWeek) activitiesLastWeek++;
      if (activity.timestamp >= lastMonth) activitiesLastMonth++;
    });

    // Encontrar os mais ativos
    const mostActiveUser = Object.entries(activitiesByUser)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';
    
    const mostActiveEntity = Object.entries(activitiesByEntity)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as AuditEntityType || 'equipamento';
    
    const mostCommonAction = Object.entries(activitiesByType)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as AuditActionType || 'CREATE';

    return {
      totalActivities: activities.length,
      activitiesByType,
      activitiesByEntity: activitiesByEntity as Record<AuditEntityType, number>,
      activitiesByUser,
      mostActiveUser,
      mostActiveEntity,
      mostCommonAction,
      activitiesLast24Hours,
      activitiesLastWeek,
      activitiesLastMonth
    };
  }
}