import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { 
  Settings, 
  Database, 
  Shield, 
  Bell,
  Globe,
  Mail,
  Smartphone,
  Key,
  Upload,
  Download,
  Trash2,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Server,
  Monitor
} from 'lucide-react';
import { apiService, User } from '../services/api';
import Swal from 'sweetalert2';
import { SystemMonitor } from './SystemMonitor';

export function AdminSettings({ user: _user }: { user?: User }) {
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [lastBackup, setLastBackup] = useState('2024-09-26 03:00:00');

  // État des paramètres
  const [settings, setSettings] = useState({
    // Général
    platform_name: 'AL-TOPPE',
    platform_description: 'Plateforme de gestion d\'entreprise pour entrepreneurs sénégalais',
    default_language: 'fr',
    timezone: 'Africa/Dakar',
    currency: 'XOF',
    max_file_size: 10,
    session_timeout: 120,
    
    // Notifications
    email_notifications: true,
    sms_notifications: true,
    push_notifications: true,
    admin_alerts: true,
    daily_reports: true,
    weekly_reports: true,
    
    // Sécurité
    two_factor_auth: true,
    password_expiry: 90,
    max_login_attempts: 5,
    session_encryption: true,
    api_rate_limiting: true,
    audit_logging: true,
    
    // API
    api_version: 'v1.2.0',
    rate_limit: 1000,
    cors_enabled: true,
    webhook_timeout: 30,
    
    // Maintenance
    maintenance_mode: false,
    backup_frequency: 'daily',
    data_retention: 365,
    debug_mode: false
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await apiService.updateAdminSettings(settings);
      setSettings(updated);
      console.log('Paramètres sauvegardés:', updated);
    } catch (e) {
      console.warn('Sauvegarde échouée, conserver les réglages locaux.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      const snapshot = {
        exported_at: new Date().toISOString(),
        note: 'Export JSON des paramètres affichés (pas un dump base de données).',
        settings,
      };
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `altoppe-settings-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      setLastBackup(new Date().toLocaleString('fr-FR'));
      Swal.fire({
        icon: 'success',
        title: 'Export prêt',
        text: 'Les paramètres courants ont été téléchargés en JSON.',
        timer: 2200,
        showConfirmButton: false,
      });
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Erreur', text: 'Export impossible.' });
    }
  };

  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        void (async () => {
          try {
            const parsed = JSON.parse(String(reader.result)) as Record<string, unknown>;
            const incoming = (parsed.settings ?? parsed) as Record<string, unknown>;
            const merged = { ...settings };
            (Object.keys(merged) as (keyof typeof settings)[]).forEach((k) => {
              if (incoming[String(k)] !== undefined && incoming[String(k)] !== null) {
                (merged as Record<string, unknown>)[String(k)] = incoming[String(k)];
              }
            });
            setSettings(merged);
            await apiService.updateAdminSettings(merged);
            Swal.fire({
              icon: 'success',
              title: 'Paramètres importés',
              text: 'Le fichier a été fusionné avec les réglages actuels et envoyé au serveur.',
              timer: 2600,
              showConfirmButton: false,
            });
          } catch {
            Swal.fire({
              icon: 'error',
              title: 'Import impossible',
              text: 'Utilisez un export JSON généré depuis cette page (« Sauvegarder » / export).',
            });
          }
        })();
      };
      reader.readAsText(file);
    };
    input.click();
  };

  useEffect(() => {
    const load = async () => {
      try {
        const s = await apiService.getAdminSettings();
        setSettings(s);
      } catch (e) {
        // fallback: garder valeurs locales
      }
    };
    load();
  }, []);

  const systemStatus = {
    api: { status: 'operational', uptime: '99.98%', response_time: '245ms' },
    database: { status: 'operational', connections: 45, size: '2.3GB' },
    storage: { status: 'operational', used: '67%', available: '1.2TB' },
    backup: { status: 'operational', last: lastBackup, next: '2024-09-27 03:00:00' }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres Système</h1>
          <p className="text-gray-600">Configuration et administration de la plateforme</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" type="button" onClick={handleBackup}>
            <Upload className="w-4 h-4 mr-2" />
            Exporter réglages (JSON)
          </Button>
          <Button 
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#006666] hover:bg-[#004d4d]"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* Statut système */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(systemStatus).map(([key, status]) => (
          <Card key={key} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 capitalize">{key}</p>
                <div className={`flex items-center space-x-1 mt-1 ${getStatusColor(status.status)}`}>
                  {getStatusIcon(status.status)}
                  <span className="text-sm font-medium capitalize">{status.status}</span>
                </div>
              </div>
              <div className="text-right text-xs text-gray-600">
                {key === 'api' && <p>Temps: {status.response_time}</p>}
                {key === 'database' && <p>Taille: {status.size}</p>}
                {key === 'storage' && <p>Utilisé: {status.used}</p>}
                {key === 'backup' && <p>Dernier: {status.last?.split(' ')[1]}</p>}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <p className="text-xs text-gray-500 -mt-2">
        Cartes ci-dessus : valeurs de démonstration. Pour des métriques réelles du serveur, utilisez l’onglet{' '}
        <strong>Surveillance</strong>.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Sécurité</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="monitoring">Surveillance</TabsTrigger>

        </TabsList>
        <TabsContent value="monitoring" className="space-y-6">
          <SystemMonitor />
        </TabsContent>
        <TabsContent value="general" className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Paramètres généraux</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="platform_name">Nom de la plateforme</Label>
                <Input
                  id="platform_name"
                  value={settings.platform_name}
                  onChange={(e) => setSettings({...settings, platform_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_language">Langue par défaut</Label>
                <Select value={settings.default_language} onValueChange={(value) => setSettings({...settings, default_language: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="wo">Wolof</SelectItem>
                    <SelectItem value="en">Anglais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Fuseau horaire</Label>
                <Select value={settings.timezone} onValueChange={(value) => setSettings({...settings, timezone: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Dakar">Africa/Dakar (GMT+0)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Devise</Label>
                <Select value={settings.currency} onValueChange={(value) => setSettings({...settings, currency: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XOF">FCFA (XOF)</SelectItem>
                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    <SelectItem value="USD">Dollar US (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_file_size">Taille max fichiers (MB)</Label>
                <Input
                  id="max_file_size"
                  type="number"
                  value={settings.max_file_size}
                  onChange={(e) => setSettings({...settings, max_file_size: parseInt(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session_timeout">Timeout session (min)</Label>
                <Input
                  id="session_timeout"
                  type="number"
                  value={settings.session_timeout}
                  onChange={(e) => setSettings({...settings, session_timeout: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <Label htmlFor="platform_description">Description de la plateforme</Label>
              <Textarea
                id="platform_description"
                value={settings.platform_description}
                onChange={(e) => setSettings({...settings, platform_description: e.target.value})}
                rows={3}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Paramètres de notifications</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium">Notifications email</p>
                    <p className="text-sm text-gray-600">Envoyer des notifications par email</p>
                  </div>
                </div>
                <Switch
                  checked={settings.email_notifications}
                  onCheckedChange={(checked) => setSettings({...settings, email_notifications: checked})}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Smartphone className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium">Notifications SMS</p>
                    <p className="text-sm text-gray-600">Envoyer des SMS aux utilisateurs</p>
                  </div>
                </div>
                <Switch
                  checked={settings.sms_notifications}
                  onCheckedChange={(checked) => setSettings({...settings, sms_notifications: checked})}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium">Notifications push</p>
                    <p className="text-sm text-gray-600">Notifications dans l'application</p>
                  </div>
                </div>
                <Switch
                  checked={settings.push_notifications}
                  onCheckedChange={(checked) => setSettings({...settings, push_notifications: checked})}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium">Alertes administrateur</p>
                    <p className="text-sm text-gray-600">Alertes système critiques</p>
                  </div>
                </div>
                <Switch
                  checked={settings.admin_alerts}
                  onCheckedChange={(checked) => setSettings({...settings, admin_alerts: checked})}
                />
              </div>
              
              <Separator />
              
              <h4 className="font-medium text-gray-900">Rapports automatiques</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Rapports quotidiens</p>
                  <p className="text-sm text-gray-600">Statistiques quotidiennes</p>
                </div>
                <Switch
                  checked={settings.daily_reports}
                  onCheckedChange={(checked) => setSettings({...settings, daily_reports: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Rapports hebdomadaires</p>
                  <p className="text-sm text-gray-600">Synthèse hebdomadaire</p>
                </div>
                <Switch
                  checked={settings.weekly_reports}
                  onCheckedChange={(checked) => setSettings({...settings, weekly_reports: checked})}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Paramètres de sécurité</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Key className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium">Authentification à deux facteurs</p>
                    <p className="text-sm text-gray-600">Obligatoire pour tous les utilisateurs</p>
                  </div>
                </div>
                <Switch
                  checked={settings.two_factor_auth}
                  onCheckedChange={(checked) => setSettings({...settings, two_factor_auth: checked})}
                />
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="password_expiry">Expiration mot de passe (jours)</Label>
                  <Input
                    id="password_expiry"
                    type="number"
                    value={settings.password_expiry}
                    onChange={(e) => setSettings({...settings, password_expiry: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_login_attempts">Tentatives de connexion max</Label>
                  <Input
                    id="max_login_attempts"
                    type="number"
                    value={settings.max_login_attempts}
                    onChange={(e) => setSettings({...settings, max_login_attempts: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium">Chiffrement des sessions</p>
                    <p className="text-sm text-gray-600">Chiffrement SSL/TLS activé</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Activé
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Globe className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium">Limitation de débit API</p>
                    <p className="text-sm text-gray-600">Protection contre les attaques DDoS</p>
                  </div>
                </div>
                <Switch
                  checked={settings.api_rate_limiting}
                  onCheckedChange={(checked) => setSettings({...settings, api_rate_limiting: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Database className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium">Journalisation d'audit</p>
                    <p className="text-sm text-gray-600">Enregistrement des actions critiques</p>
                  </div>
                </div>
                <Switch
                  checked={settings.audit_logging}
                  onCheckedChange={(checked) => setSettings({...settings, audit_logging: checked})}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Configuration API</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="api_version">Version API</Label>
                  <Input
                    id="api_version"
                    value={settings.api_version}
                    onChange={(e) => setSettings({...settings, api_version: e.target.value})}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate_limit">Limite de débit (req/min)</Label>
                  <Input
                    id="rate_limit"
                    type="number"
                    value={settings.rate_limit}
                    onChange={(e) => setSettings({...settings, rate_limit: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook_timeout">Timeout webhook (sec)</Label>
                  <Input
                    id="webhook_timeout"
                    type="number"
                    value={settings.webhook_timeout}
                    onChange={(e) => setSettings({...settings, webhook_timeout: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">CORS activé</p>
                  <p className="text-sm text-gray-600">Cross-Origin Resource Sharing</p>
                </div>
                <Switch
                  checked={settings.cors_enabled}
                  onCheckedChange={(checked) => setSettings({...settings, cors_enabled: checked})}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">URLs d'API</h4>
                <div className="space-y-2">
                  <Label>API Base URL</Label>
                  <div className="flex items-center space-x-2">
                    <Input value="https://api-al-toppe.com" readOnly />
                    <Button variant="outline" size="sm">
                      <Globe className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Documentation</Label>
                  <div className="flex items-center space-x-2">
                    <Input value="https://api-al-toppe.com/docs" readOnly />
                    <Button variant="outline" size="sm">
                      <Globe className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Maintenance et sauvegarde</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-900">Mode maintenance</p>
                    <p className="text-sm text-yellow-700">Désactiver l'accès utilisateur</p>
                  </div>
                </div>
                <Switch
                  checked={settings.maintenance_mode}
                  onCheckedChange={(checked) => setSettings({...settings, maintenance_mode: checked})}
                />
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="backup_frequency">Fréquence sauvegarde</Label>
                  <Select value={settings.backup_frequency} onValueChange={(value) => setSettings({...settings, backup_frequency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Toutes les heures</SelectItem>
                      <SelectItem value="daily">Quotidienne</SelectItem>
                      <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_retention">Rétention données (jours)</Label>
                  <Input
                    id="data_retention"
                    type="number"
                    value={settings.data_retention}
                    onChange={(e) => setSettings({...settings, data_retention: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Actions de maintenance</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" onClick={handleBackup}>
                    <Upload className="w-4 h-4 mr-2" />
                    Sauvegarde manuelle
                  </Button>
                  <Button variant="outline" onClick={handleRestore}>
                    <Download className="w-4 h-4 mr-2" />
                    Restaurer
                  </Button>
                  <Button variant="outline">
                    <Database className="w-4 h-4 mr-2" />
                    Optimiser DB
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Mode debug</p>
                  <p className="text-sm text-gray-600">Logs détaillés pour développement</p>
                </div>
                <Switch
                  checked={settings.debug_mode}
                  onCheckedChange={(checked) => setSettings({...settings, debug_mode: checked})}
                />
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-2">Informations système</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Dernière sauvegarde:</p>
                    <p className="font-medium">{lastBackup}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Prochaine sauvegarde:</p>
                    <p className="font-medium">2024-09-27 03:00:00</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Espace disque utilisé:</p>
                    <p className="font-medium">2.3GB / 10GB</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Version système:</p>
                    <p className="font-medium">AL-TOPPE v1.2.0</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}