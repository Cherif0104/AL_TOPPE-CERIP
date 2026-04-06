export const Config = {
  // API Configuration
  // API_BASE_URL: __DEV__ 
  //   ? 'http://localhost:8000/api' 
  //   : 'https://api.altoppe.sn/api',
    API_BASE_URL: __DEV__ 
    ? 'https://api.altoppe.sn/api' 
    : 'https://api.altoppe.sn/api',
    
  API_TIMEOUT: 10000, // 10 seconds
  
  // App Configuration
  APP_NAME: 'AL-TOPPE',
  APP_VERSION: '1.0.0',
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // File Upload
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  
  // Cache
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  OFFLINE_CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  
  // Business Rules
  MIN_TRANSACTION_AMOUNT: 100, // 100 F CFA
  MAX_TRANSACTION_AMOUNT: 10000000, // 10M F CFA
  
  // Senegal Specific
  COUNTRY_CODE: '+221',
  CURRENCY: 'XOF',
  LOCALE: 'fr-SN',
  
  // Regions
  SENEGAL_REGIONS: [
    'Dakar', 'Thiès', 'Saint-Louis', 'Diourbel', 'Kaolack',
    'Tambacounda', 'Kolda', 'Ziguinchor', 'Louga', 'Fatick',
    'Kaffrine', 'Kédougou', 'Matam', 'Sédhiou'
  ],
  
  // Business Categories
  BUSINESS_CATEGORIES: [
    'Couture & Mode', 'Commerce & Vente', 'Restauration', 'Coiffure & Beauté',
    'Artisanat', 'Transport', 'Agriculture', 'Élevage', 'Pêche',
    'Services', 'Technologie', 'Éducation', 'Santé', 'Autre'
  ],
  
  // Transaction Categories
  REVENUE_CATEGORIES: [
    'Ventes', 'Services', 'Formations', 'Consultations', 'Commissions', 'Autres'
  ],
  
  EXPENSE_CATEGORIES: [
    'Matières premières', 'Transport', 'Marketing', 'Équipement',
    'Loyer', 'Électricité', 'Téléphone', 'Autres'
  ],
  
  // Notification Settings
  NOTIFICATION_TYPES: {
    TRANSACTION_ADDED: 'transaction_added',
    BUDGET_EXCEEDED: 'budget_exceeded',
    LOW_REVENUE: 'low_revenue',
    PAYMENT_REMINDER: 'payment_reminder',
    COACHING_SESSION: 'coaching_session',
  },
  
  // Chart Colors
  CHART_COLORS: {
    PRIMARY: '#22C55E',
    SECONDARY: '#EAB308',
    ACCENT: '#EF4444',
    INFO: '#3B82F6',
    SUCCESS: '#22C55E',
    WARNING: '#EAB308',
    ERROR: '#EF4444',
  },
};

export default Config;