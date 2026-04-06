import { User, Entrepreneur, Coach, CoachingSession, CoachAssignment } from './api';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live en millisecondes
}

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  storageKey: string;
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheItem<any>> = new Map();
  private config: CacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutes par défaut
    maxSize: 100,
    storageKey: 'altoppe_cache'
  };

  private constructor() {
    this.loadFromStorage();
    this.setupStorageSync();
    this.setupPeriodicCleanup();
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Sauvegarder des données dans le cache
  set<T>(key: string, data: T, ttl?: number): void {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL
    };

    this.cache.set(key, cacheItem);
    this.enforceSizeLimit();
    this.saveToStorage();
  }

  // Récupérer des données du cache
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // Vérifier si l'item a expiré
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }

    return item.data as T;
  }

  // Vérifier si une clé existe et est valide
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // Supprimer une entrée du cache
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  // Vider le cache
  clear(): void {
    this.cache.clear();
    localStorage.removeItem(this.config.storageKey);
  }

  // Mettre à jour des données existantes
  update<T>(key: string, updater: (data: T) => T): T | null {
    const existing = this.get<T>(key);
    if (existing) {
      const updated = updater(existing);
      this.set(key, updated);
      return updated;
    }
    return null;
  }

  // Sauvegarder dans localStorage
  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.cache.entries());
      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde du cache:', error);
    }
  }

  // Charger depuis localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.cache = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn('Erreur lors du chargement du cache:', error);
      this.cache.clear();
    }
  }

  // Synchroniser avec localStorage sur changement
  private setupStorageSync(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === this.config.storageKey) {
        this.loadFromStorage();
      }
    });
  }

  // Nettoyage périodique des entrées expirées
  private setupPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Toutes les minutes
  }

  // Nettoyer les entrées expirées
  private cleanupExpired(): void {
    const now = Date.now();
    let hasChanges = false;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.saveToStorage();
    }
  }

  // Limiter la taille du cache
  private enforceSizeLimit(): void {
    if (this.cache.size > this.config.maxSize) {
      // Supprimer les entrées les plus anciennes
      const entries = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - this.config.maxSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  // === MÉTHODES SPÉCIALISÉES POUR AL-TOPPE ===

  // Cache utilisateur
  cacheUser(user: User): void {
    this.set(`user_${user.id}`, user, 30 * 60 * 1000); // 30 minutes
    this.set('current_user', user, 30 * 60 * 1000);
  }

  getCurrentUser(): User | null {
    return this.get<User>('current_user');
  }

  getUser(userId: string): User | null {
    return this.get<User>(`user_${userId}`);
  }

  // Cache entrepreneurs
  cacheEntrepreneurs(entrepreneurs: Entrepreneur[]): void {
    this.set('entrepreneurs_list', entrepreneurs, 10 * 60 * 1000); // 10 minutes
    entrepreneurs.forEach(entrepreneur => {
      this.set(`entrepreneur_${entrepreneur.id}`, entrepreneur, 15 * 60 * 1000);
    });
  }

  getEntrepreneurs(): Entrepreneur[] | null {
    return this.get<Entrepreneur[]>('entrepreneurs_list');
  }

  getEntrepreneur(id: string): Entrepreneur | null {
    return this.get<Entrepreneur>(`entrepreneur_${id}`);
  }

  // Cache coaches
  cacheCoaches(coaches: Coach[]): void {
    this.set('coaches_list', coaches, 10 * 60 * 1000);
    coaches.forEach(coach => {
      this.set(`coach_${coach.id}`, coach, 15 * 60 * 1000);
    });
  }

  getCoaches(): Coach[] | null {
    return this.get<Coach[]>('coaches_list');
  }

  getCoach(id: string): Coach | null {
    return this.get<Coach>(`coach_${id}`);
  }

  // Cache sessions
  cacheSessions(sessions: CoachingSession[]): void {
    this.set('sessions_list', sessions, 5 * 60 * 1000); // 5 minutes
    sessions.forEach(session => {
      this.set(`session_${session.id}`, session, 10 * 60 * 1000);
    });
  }

  getSessions(): CoachingSession[] | null {
    return this.get<CoachingSession[]>('sessions_list');
  }

  getSession(id: string): CoachingSession | null {
    return this.get<CoachingSession>(`session_${id}`);
  }

  // Cache assignations
  cacheAssignments(assignments: CoachAssignment[]): void {
    this.set('assignments_list', assignments, 10 * 60 * 1000);
    assignments.forEach(assignment => {
      this.set(`assignment_${assignment.id}`, assignment, 15 * 60 * 1000);
    });
  }

  getAssignments(): CoachAssignment[] | null {
    return this.get<CoachAssignment[]>('assignments_list');
  }

  getAssignment(id: string): CoachAssignment | null {
    return this.get<CoachAssignment>(`assignment_${id}`);
  }

  // Méthodes pour les données hors-ligne
  setOfflineData<T>(key: string, data: T): void {
    // Données hors-ligne avec TTL plus long
    this.set(`offline_${key}`, data, 24 * 60 * 60 * 1000); // 24 heures
  }

  getOfflineData<T>(key: string): T | null {
    return this.get<T>(`offline_${key}`);
  }

  // Synchroniser les modifications hors-ligne
  addPendingSync(operation: {
    method: string;
    endpoint: string;
    data: any;
    timestamp: number;
  }): void {
    const pending = this.get<any[]>('pending_sync') || [];
    pending.push(operation);
    this.set('pending_sync', pending, 7 * 24 * 60 * 60 * 1000); // 7 jours
  }

  getPendingSync(): any[] {
    return this.get<any[]>('pending_sync') || [];
  }

  clearPendingSync(): void {
    this.delete('pending_sync');
  }

  // Statistiques du cache
  getStats() {
    const now = Date.now();
    let validItems = 0;
    let expiredItems = 0;
    let totalSize = 0;

    for (const [key, item] of this.cache.entries()) {
      totalSize += JSON.stringify(item).length;
      if (now - item.timestamp > item.ttl) {
        expiredItems++;
      } else {
        validItems++;
      }
    }

    return {
      totalItems: this.cache.size,
      validItems,
      expiredItems,
      totalSize,
      maxSize: this.config.maxSize
    };
  }
}

// Instance singleton
export const cacheService = CacheService.getInstance();