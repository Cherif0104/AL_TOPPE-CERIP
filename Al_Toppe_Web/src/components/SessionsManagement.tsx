import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Calendar } from './ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Video,
  Phone,
  MapPin,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  User
} from 'lucide-react';

import { User as UserType } from '../services/api';

interface SessionsManagementProps {
  user: UserType;
}

export function SessionsManagement({ user }: SessionsManagementProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Données mockées des sessions
  const sessions = [
    {
      id: 1,
      entrepreneur: 'Fatou Diop',
      date: '2024-09-26',
      time: '14:00',
      duration: 60,
      type: 'Suivi financier',
      mode: 'En personne',
      status: 'Planifiée',
      location: 'Bureau Dakar',
      notes: 'Révision du plan de trésorerie mensuel',
      objectives: ['Analyser les revenus', 'Optimiser les dépenses', 'Planifier investissements']
    },
    {
      id: 2,
      entrepreneur: 'Moussa Sall',
      date: '2024-09-27',
      time: '10:30',
      duration: 90,
      type: 'Première rencontre',
      mode: 'Visioconférence',
      status: 'Planifiée',
      location: 'En ligne',
      notes: 'Découverte du projet et établissement des objectifs',
      objectives: ['Comprendre le projet', 'Définir les besoins', 'Établir roadmap']
    },
    {
      id: 3,
      entrepreneur: 'Awa Ndiaye',
      date: '2024-09-25',
      time: '16:00',
      duration: 45,
      type: 'Plan d\'affaires',
      mode: 'Téléphone',
      status: 'Terminée',
      location: 'Téléphonique',
      notes: 'Finalisation du business model canvas',
      objectives: ['Valider proposition valeur', 'Revoir canaux distribution']
    },
    {
      id: 4,
      entrepreneur: 'Omar Ba',
      date: '2024-09-28',
      time: '09:00',
      duration: 120,
      type: 'Formation marketing',
      mode: 'En personne',
      status: 'Planifiée',
      location: 'Kaolack',
      notes: 'Stratégies marketing digital pour l\'agriculture',
      objectives: ['Réseaux sociaux', 'E-commerce', 'Communication client']
    }
  ];

  const entrepreneurs = [
    { id: 1, name: 'Fatou Diop', business: 'Commerce alimentaire' },
    { id: 2, name: 'Moussa Sall', business: 'Menuiserie' },
    { id: 3, name: 'Awa Ndiaye', business: 'Services nettoyage' },
    { id: 4, name: 'Omar Ba', business: 'Agriculture' }
  ];

  const getStatusBadge = (status: string) => {
    const config = {
      'Planifiée': { color: 'bg-blue-100 text-blue-800', icon: Clock },
      'En cours': { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      'Terminée': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'Annulée': { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    };

    const statusConfig = config[status as keyof typeof config] || config['Planifiée'];
    const IconComponent = statusConfig.icon;

    return (
      <Badge className={statusConfig.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'Visioconférence': return <Video className="w-4 h-4" />;
      case 'Téléphone': return <Phone className="w-4 h-4" />;
      case 'En personne': return <MapPin className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const todaySessions = sessions.filter(session =>
    session.date === new Date().toISOString().split('T')[0]
  );

  const upcomingSessions = sessions.filter(session => {
    const sessionDate = new Date(session.date);
    const today = new Date();
    return sessionDate > today && session.status === 'Planifiée';
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Sessions</h1>
          <p className="text-gray-600">Planifiez et suivez vos sessions de coaching</p>
        </div>
        <div className="flex space-x-3">
          <div className="flex rounded-md border border-gray-200">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className={viewMode === 'calendar' ? 'bg-[#006666] text-white' : ''}
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              Calendrier
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-[#006666] text-white' : ''}
            >
              Liste
            </Button>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[#006666] hover:bg-[#004d4d]">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-[#FFFF]">
              <DialogHeader>
                <DialogTitle>Planifier une nouvelle session</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="entrepreneur">Entrepreneur</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un entrepreneur" />
                    </SelectTrigger>
                    <SelectContent>
                      {entrepreneurs.map((entrepreneur) => (
                        <SelectItem key={entrepreneur.id} value={entrepreneur.id.toString()}>
                          {entrepreneur.name} - {entrepreneur.business}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type de session</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Type de session" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="premiere">Première rencontre</SelectItem>
                      <SelectItem value="suivi">Suivi financier</SelectItem>
                      <SelectItem value="plan">Plan d'affaires</SelectItem>
                      <SelectItem value="formation">Formation</SelectItem>
                      <SelectItem value="bilan">Bilan mensuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Heure</Label>
                  <Input id="time" type="time" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Durée (minutes)</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Durée" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 heure</SelectItem>
                      <SelectItem value="90">1h30</SelectItem>
                      <SelectItem value="120">2 heures</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mode">Mode</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Mode de session" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personne">En personne</SelectItem>
                      <SelectItem value="visio">Visioconférence</SelectItem>
                      <SelectItem value="telephone">Téléphone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="location">Lieu / Lien</Label>
                  <Input id="location" placeholder="Adresse ou lien de visioconférence" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="objectives">Objectifs de la session</Label>
                  <Textarea
                    id="objectives"
                    placeholder="Définissez les objectifs à atteindre pendant cette session..."
                    rows={3}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="notes">Notes préparatoires</Label>
                  <Textarea
                    id="notes"
                    placeholder="Notes et points à aborder..."
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Annuler
                </Button>
                <Button className="bg-[#006666] hover:bg-[#004d4d]">
                  Planifier
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#006666] rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Aujourd'hui</p>
              <p className="text-xl font-bold text-gray-900">{todaySessions.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">À venir</p>
              <p className="text-xl font-bold text-gray-900">{upcomingSessions.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Ce mois</p>
              <p className="text-xl font-bold text-gray-900">23</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#FF9933] rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Entrepreneurs actifs</p>
              <p className="text-xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </Card>
      </div>

      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendrier */}
          <Card className="lg:col-span-2 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Calendrier des sessions</h3>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </Card>

          {/* Sessions du jour sélectionné */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Sessions - {selectedDate?.toLocaleDateString('fr-FR') || 'Aucune date sélectionnée'}
            </h3>
            <div className="space-y-4">
              {sessions
                .filter(session => {
                  if (!selectedDate) return false;
                  return session.date === selectedDate.toISOString().split('T')[0];
                })
                .map((session) => (
                  <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{session.entrepreneur}</p>
                        <p className="text-xs text-gray-600">{session.type}</p>
                      </div>
                      {getStatusBadge(session.status)}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-600 mb-2">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{session.time} ({session.duration}min)</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {getModeIcon(session.mode)}
                        <span>{session.mode}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">{session.notes}</p>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              {sessions.filter(session => {
                if (!selectedDate) return false;
                return session.date === selectedDate.toISOString().split('T')[0];
              }).length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    Aucune session planifiée pour cette date
                  </p>
                )}
            </div>
          </Card>
        </div>
      ) : (
        /* Vue liste */
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Toutes les sessions</h3>
          <div className="space-y-4">
            {sessions.map((session) => (
              <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-[#006666] rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {session.entrepreneur.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{session.entrepreneur}</h4>
                      <p className="text-sm text-gray-600">{session.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(session.status)}
                    <div className="text-right text-sm">
                      <p className="font-medium">{session.date}</p>
                      <p className="text-gray-600">{session.time}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Durée: {session.duration} min</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    {getModeIcon(session.mode)}
                    <span>{session.mode}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{session.location}</span>
                  </div>
                </div>

                {session.objectives && session.objectives.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Objectifs:</p>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {session.objectives.map((objective, index) => (
                        <li key={index}>{objective}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">{session.notes}</p>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}