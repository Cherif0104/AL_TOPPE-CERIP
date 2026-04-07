import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Calendar,
  Clock,
  Play,
  CheckCircle,
  XCircle,
  User,
  Plus,
  Edit,
  Star,
  MessageSquare,
  AlertCircle,
  Trash2
} from 'lucide-react';
import {
  User as UserType,
  CoachingSession,
  apiService,
  getSessionStatusColor,
  getSessionTypeIcon,
  formatSessionDuration,
  formatDate
} from '../services/api';
import { coachService, resolveCoachId } from '../services/coach';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

interface CoachSessionsManagerProps {
  user: UserType;
  initialAction?: string | null;
  onActionHandled?: () => void;
}

export function CoachSessionsManager({ user, initialAction, onActionHandled }: CoachSessionsManagerProps) {
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [assignments, setAssignments] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CoachingSession | null>(null);
  const [editingSession, setEditingSession] = useState<CoachingSession | null>(null);
  const [sessionForm, setSessionForm] = useState({
    assignment: '',
    session_type: 'individual',
    scheduled_date: '',
    duration_minutes: 60,
    agenda: '',
    notes: ''
  });
  const [completeSessionForm, setCompleteSessionForm] = useState({
    notes: '',
    feedback: '',
    coach_rating: '',
    actual_duration_minutes: '',
    action_items: ''
  });

  useEffect(() => {
    loadSessions();
    loadAssignments();
  }, [user]);

  useEffect(() => {
    if (initialAction === 'add') {
      setIsDialogOpen(true);
      if (onActionHandled) onActionHandled();
    }
  }, [initialAction]);

  // Retourne un label lisible pour une assignation / entrepreneur
  const getAssignmentLabel = (assignment: Record<string, unknown> | undefined) => {
    if (!assignment) return '';
    // Prioritiser entrepreneur_name s'il existe
    const entrepreneurName = assignment['entrepreneur_name'] as string | undefined;
    if (entrepreneurName && entrepreneurName.trim()) return entrepreneurName;

    const ent = (assignment['entrepreneur'] ?? assignment['entrepreneur_detail'] ?? assignment['entrepreneur_obj']) as unknown;

    if (typeof ent === 'string') return ent;
    if (ent && typeof ent === 'object') {
      const entObj = ent as Record<string, unknown>;
      const name = (entObj['name'] as string) || (entObj['full_name'] as string) || (((entObj['first_name'] as string) || '') + ' ' + ((entObj['last_name'] as string) || '')).trim() || (entObj['username'] as string) || '';
      if (name && name.trim()) return name;
    }

    // Fallbacks: top-level fields
    return (assignment['entrepreneur_display'] as string) || (assignment['name'] as string) || '';
  };

  const getSessionEntrepreneurName = (session: Record<string, unknown> | CoachingSession | undefined) => {
    if (!session) return '';

    const s = session as Record<string, unknown>;
    // Prioritiser entrepreneur_name s'il est présent dans la session
    const sessionEntrepreneurName = s['entrepreneur_name'] as string | undefined;
    if (sessionEntrepreneurName && sessionEntrepreneurName.trim()) return sessionEntrepreneurName;

    const ent = s['entrepreneur'] as unknown;
    if (typeof ent === 'string') return ent;
    if (ent && typeof ent === 'object') {
      const entObj = ent as Record<string, unknown>;
      const name = (entObj['name'] as string) || (entObj['full_name'] as string) || (((entObj['first_name'] as string) || '') + ' ' + ((entObj['last_name'] as string) || '')).trim();
      if (name && name.trim()) return name;
    }

    // If session has assignment id, try to find it
    if (s['assignment']) {
      const a = assignments.find((a) => String(a['id']) === String(s['assignment']));
      if (a) return getAssignmentLabel(a);
    }
    return '';
  };

  const loadSessions = async () => {
    try {
      const coachId = resolveCoachId(user);
      const sessionsData = await coachService.getSessions(coachId ?? undefined);
      // sessionsData est normalisé par le service pour toujours être un tableau
      console.log('Sessions API:', sessionsData);
      setSessions(Array.isArray(sessionsData) ? (sessionsData as CoachingSession[]) : []);
    } catch (error) {
      console.error('Erreur lors du chargement des sessions:', error);
      setSessions([]);
      toast.error('Impossible de charger les sessions. Vérifiez votre connexion ou les droits d’accès.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const coachId = resolveCoachId(user);
      const assignmentsData = await coachService.getAssignments(coachId ?? undefined);
      console.log('Assignments API:', assignmentsData);
      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
    } catch (error) {
      console.error('Erreur lors du chargement des assignations:', error);
      setAssignments([]);
      toast.error('Impossible de charger les assignations.');
    }
  };

  const handleCreateSession = async () => {
    try {
      if (!sessionForm.assignment) {
        toast.error('Veuillez sélectionner un entrepreneur');
        return;
      }

      setIsCreating(true);

      // Build payload expected by backend
      const payload = {
        assignment: sessionForm.assignment,
        session_type: sessionForm.session_type,
        scheduled_date: sessionForm.scheduled_date,
        duration_minutes: Number(sessionForm.duration_minutes),
        agenda: sessionForm.agenda,
        notes: sessionForm.notes
      };

      let createdOrUpdated: CoachingSession | null = null;

      if (editingSession) {
        // Mode Edition
        createdOrUpdated = await coachService.updateSession(editingSession.id, payload);
        toast.success('Session mise à jour avec succès');

        if (createdOrUpdated) {
          setSessions(prev => prev.map(s => s.id === editingSession.id ? { ...s, ...createdOrUpdated! } : s));
        }
      } else {
        // Mode Création
        createdOrUpdated = await coachService.addSession(payload) as CoachingSession | null;

        // Normalize created session entrepreneur display
        const createdSession = (createdOrUpdated ?? {}) as Record<string, unknown>;
        let displayName = '';
        if ('entrepreneur' in createdSession) {
          const ent = createdSession['entrepreneur'] as unknown;
          if (typeof ent === 'string') displayName = ent;
          else if (ent && typeof ent === 'object') {
            const entObj = ent as Record<string, unknown>;
            displayName = (entObj['name'] as string) || (entObj['full_name'] as string) || (((entObj['first_name'] as string) || '') + ' ' + ((entObj['last_name'] as string) || '')).trim();
          }
        }
        if (!displayName && payload.assignment) {
          const a = assignments.find(a => String(a['id']) === String(payload.assignment));
          if (a) displayName = getAssignmentLabel(a);
        }
        if (displayName) {
          (createdSession as Record<string, unknown>)['entrepreneur'] = displayName;
          (createdSession as Record<string, unknown>)['entrepreneur_name'] = displayName;
        }

        setSessions(prev => [...prev, createdSession as unknown as CoachingSession]);
        toast.success('Session créée avec succès');
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erreur lors de la création/modification:', error);
      if ((error as Error & { status?: number }).status === 404) {
        toast.warning('Fonctionnalité non encore disponible sur l\'API');
      } else {
        toast.error(editingSession ? 'Erreur lors de la modification' : 'Erreur lors de la création');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (session: CoachingSession) => {
    setEditingSession(session);
        setSessionForm({
          assignment: typeof session.assignment === 'string' ? session.assignment : (session.assignment as { id?: string })?.id || '',
      session_type: session.session_type,
      scheduled_date: session.scheduled_date ? session.scheduled_date.slice(0, 16) : '',
      duration_minutes: session.duration_minutes,
      agenda: session.agenda || '',
      notes: session.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (sessionId: string) => {
    const result = await Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: "Cette action est irréversible !",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#006666',
      confirmButtonText: 'Oui, supprimer !',
      cancelButtonText: 'Annuler'
    });

    if (!result.isConfirmed) return;

    try {
      await coachService.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Session supprimée');
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleStartSession = async (sessionId: string) => {
    try {
      // Update via coachService (PATCH status -> in_progress)
      if (!coachService.updateSession) {
        setSessions(prev => prev.map(s =>
          s.id === sessionId
            ? { ...s, status: 'in_progress', actual_start_time: new Date().toISOString() }
            : s
        ));
        toast.success('Session démarrée (mode local)');
        return;
      }

      const updatedSession = await coachService.updateSession(sessionId, { status: 'in_progress', actual_start_time: new Date().toISOString() });
      setSessions(prev => prev.map(s => s.id === sessionId ? updatedSession : s));
      toast.success('Session démarrée');
    } catch (error) {
      console.error('Erreur lors du démarrage:', error);
      if ((error as unknown as { status?: number }).status === 404) {
        // Fallback en mode local
        setSessions(prev => prev.map(s =>
          s.id === sessionId
            ? { ...s, status: 'in_progress', actual_start_time: new Date().toISOString() }
            : s
        ));
        toast.success('Session démarrée (mode local)');
      } else {
        toast.error('Erreur lors du démarrage de la session');
      }
    }
  };

  const handleCompleteSession = async (sessionId: string) => {
    try {
      // Préparer les données à envoyer
      const actionItemsArray = completeSessionForm.action_items
        ? completeSessionForm.action_items.split('\n').filter(item => item.trim())
        : [];

      const updateData: any = {
        status: 'completed',
        actual_end_time: new Date().toISOString(),
      };

      if (completeSessionForm.notes.trim()) {
        updateData.notes = completeSessionForm.notes.trim();
      }
      if (completeSessionForm.feedback.trim()) {
        updateData.feedback = completeSessionForm.feedback.trim();
      }
      if (actionItemsArray.length > 0) {
        updateData.action_items = actionItemsArray;
      }
      if (completeSessionForm.coach_rating) {
        updateData.coach_rating = parseInt(completeSessionForm.coach_rating, 10);
      }
      if (completeSessionForm.actual_duration_minutes) {
        updateData.actual_duration_minutes = parseInt(completeSessionForm.actual_duration_minutes, 10);
      }

      // Use coachService.updateSession to set status completed and any provided data
      if (!coachService.updateSession) {
        setSessions(prev => prev.map(s =>
          s.id === sessionId
            ? {
              ...s,
              ...updateData
            }
            : s
        ));
        toast.success('Session terminée avec succès (mode local)');
        setSelectedSession(null);
        setCompleteSessionForm({ notes: '', feedback: '', action_items: '', coach_rating: '', actual_duration_minutes: '' });
        return;
      }

      const updatedSession = await coachService.updateSession(sessionId, updateData);
      setSessions(prev => prev.map(s => s.id === sessionId ? updatedSession : s));
      toast.success('Session terminée avec succès');
      setSelectedSession(null);
      setCompleteSessionForm({ notes: '', feedback: '', action_items: '', coach_rating: '', actual_duration_minutes: '' });
    } catch (error) {
      console.error('Erreur lors de la finalisation:', error);
      if ((error as unknown as { status?: number }).status === 404) {
        // Fallback en mode local
        const actionItemsArray = completeSessionForm.action_items
          ? completeSessionForm.action_items.split('\n').filter(item => item.trim())
          : [];
        setSessions(prev => prev.map(s =>
          s.id === sessionId
            ? {
              ...s,
              status: 'completed',
              actual_end_time: new Date().toISOString(),
              notes: completeSessionForm.notes.trim() || s.notes,
              feedback: completeSessionForm.feedback.trim() || s.feedback,
              action_items: actionItemsArray.length > 0 ? actionItemsArray : s.action_items,
              coach_rating: completeSessionForm.coach_rating ? parseInt(completeSessionForm.coach_rating, 10) : s.coach_rating,
              actual_duration_minutes: completeSessionForm.actual_duration_minutes ? parseInt(completeSessionForm.actual_duration_minutes, 10) : s.actual_duration_minutes,
            }
            : s
        ));
        toast.success('Session terminée avec succès (mode local)');
        setSelectedSession(null);
        setCompleteSessionForm({ notes: '', feedback: '', action_items: '', coach_rating: '', actual_duration_minutes: '' });
      } else {
        toast.error('Erreur lors de la finalisation de la session');
      }
    }
  };

  const resetForm = () => {
    setSessionForm({
      assignment: '',
      session_type: 'individual',
      scheduled_date: '',
      duration_minutes: 60,
      agenda: '',
      notes: ''
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Calendar className="w-4 h-4" />;
      case 'in_progress':
        return <Play className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#006666] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Chargement des sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Gestion des Sessions</h1>
          <p className="text-sm md:text-base text-gray-600">Planifiez et gérez vos sessions de coaching</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingSession(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#006666] hover:bg-[#004d4d]" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-[#FFFF]">
            <DialogHeader>
              <DialogTitle>{editingSession ? 'Modifier la session' : 'Créer une nouvelle session'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assignment">Entrepreneur</Label>
                  <Select
                    value={sessionForm.assignment}
                    onValueChange={(value) => setSessionForm(prev => ({ ...prev, assignment: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un entrepreneur">
                        {sessionForm.assignment
                          ? (
                            (() => {
                              const selectedAssignment = assignments.find(a => String(a['id']) === String(sessionForm.assignment));
                              // Afficher le nom d'entrepreneur si disponible, sinon fallback
                              if (selectedAssignment?.entrepreneur && selectedAssignment.entrepreneur.entrepreneur_name) {
                                return selectedAssignment.entrepreneur.entrepreneur_name;
                              }
                              return getAssignmentLabel(selectedAssignment);
                            })()
                          )
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {assignments.map((assignment) => {
                        const id = String(assignment['id'] ?? '');
                        return (
                          <SelectItem key={id} value={id}>
                            {assignment.entrepreneur && assignment.entrepreneur.entrepreneur_name
                              ? assignment.entrepreneur.entrepreneur_name
                              : getAssignmentLabel(assignment)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="session_type">Type de session</Label>
                  <Select
                    value={sessionForm.session_type}
                    onValueChange={(value) => setSessionForm(prev => ({ ...prev, session_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="initial">Initiale</SelectItem>
                      <SelectItem value="follow_up">Suivi</SelectItem>
                      <SelectItem value="milestone">Étape importante</SelectItem>
                      <SelectItem value="final">Session final</SelectItem>
                      <SelectItem value="emergency">Urgence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduled_date">Date et heure</Label>
                  <Input
                    id="scheduled_date"
                    type="datetime-local"
                    value={sessionForm.scheduled_date}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="duration_minutes">Durée (minutes)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    value={sessionForm.duration_minutes}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, duration_minutes: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="agenda">Ordre du jour</Label>
                <Textarea
                  id="agenda"
                  placeholder="Décrivez les objectifs et sujets à aborder..."
                  value={sessionForm.agenda}
                  onChange={(e) => setSessionForm(prev => ({ ...prev, agenda: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setIsDialogOpen(false);
                setEditingSession(null);
                resetForm();
              }}>
                Annuler
              </Button>
              <Button
                onClick={handleCreateSession}
                disabled={isCreating || !sessionForm.assignment}
                className="bg-[#006666] hover:bg-[#004d4d]"
              >
                {isCreating ? (editingSession ? 'Modification...' : 'Création...') : (editingSession ? 'Mettre à jour' : 'Créer la session')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">{sessions.length}</p>
            </div>
            <Calendar className="w-6 h-6 md:w-8 md:h-8 text-[#006666]" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Planifiées</p>
              <p className="text-lg md:text-xl font-bold text-blue-600">
                {sessions.filter(s => s.status === 'scheduled').length}
              </p>
            </div>
            <Clock className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Terminées</p>
              <p className="text-lg md:text-xl font-bold text-green-600">
                {sessions.filter(s => s.status === 'completed').length}
              </p>
            </div>
            <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Note moyenne</p>
              <p className="text-lg md:text-xl font-bold text-[#FF9933]">
                {sessions.filter(s => s.entrepreneur_rating).length > 0
                  ? (sessions.reduce((acc, s) => acc + (s.entrepreneur_rating || 0), 0) /
                    sessions.filter(s => s.entrepreneur_rating).length).toFixed(1)
                  : '4.8'
                }
              </p>
            </div>
            <Star className="w-6 h-6 md:w-8 md:h-8 text-[#FF9933]" />
          </div>
        </Card>
      </div>

      {/* Liste des sessions */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Entrepreneur</TableHead>
                <TableHead className="min-w-[140px]">Type</TableHead>
                <TableHead className="min-w-[180px]">Date programmée</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="min-w-[120px]">Évaluation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{getSessionEntrepreneurName(session)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span>{getSessionTypeIcon(session.session_type)}</span>
                      <span className="capitalize">{session.session_type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(session.scheduled_date).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell>
                    {formatSessionDuration(session.duration_minutes)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getSessionStatusColor(session.status)}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(session.status)}
                        <span>{session.status}</span>
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {session.entrepreneur_rating ? (
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-[#FF9933] fill-current" />
                        <span>{session.entrepreneur_rating}/5</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Non évalué</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {session.status === 'scheduled' && (
                        <Button
                          size="sm"
                          onClick={() => handleStartSession(session.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      {session.status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={() => setSelectedSession(session)}
                          className="bg-[#FF9933] hover:bg-[#e68a2e]"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleEdit(session)} title="Modifier">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(session.id)} title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Dialog pour terminer une session */}
      {selectedSession && (
        <Dialog open={!!selectedSession} onOpenChange={(open) => {
          if (!open) {
            setSelectedSession(null);
            setCompleteSessionForm({ notes: '', feedback: '', action_items: '', coach_rating: '', actual_duration_minutes: '' });
          }
        }}>
          <DialogContent className="max-w-2xl w-[95vw] sm:w-full overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Terminer la session avec {getSessionEntrepreneurName(selectedSession)}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label>Notes de session</Label>
                <Textarea
                  placeholder="Résumé de la session, points clés abordés..."
                  value={completeSessionForm.notes}
                  onChange={(e) => setCompleteSessionForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <div>
                <Label>Feedback</Label>
                <Textarea
                  placeholder="Votre retour sur la session..."
                  value={completeSessionForm.feedback}
                  onChange={(e) => setCompleteSessionForm(prev => ({ ...prev, feedback: e.target.value }))}
                />
              </div>
              <div>
                <Label>Actions à suivre (une par ligne)</Label>
                <Textarea
                  placeholder="Prochaines étapes, actions à réaliser par l'entrepreneur (une action par ligne)..."
                  value={completeSessionForm.action_items}
                  onChange={(e) => setCompleteSessionForm(prev => ({ ...prev, action_items: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Votre évaluation</Label>
                  <Select
                    value={completeSessionForm.coach_rating}
                    onValueChange={(value) => setCompleteSessionForm(prev => ({ ...prev, coach_rating: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Notez cette session" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 - Excellente</SelectItem>
                      <SelectItem value="4">4 - Très bonne</SelectItem>
                      <SelectItem value="3">3 - Bonne</SelectItem>
                      <SelectItem value="2">2 - Moyenne</SelectItem>
                      <SelectItem value="1">1 - Décevante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Durée réelle (minutes)</Label>
                  <Input
                    type="number"
                    value={completeSessionForm.actual_duration_minutes}
                    onChange={(e) => setCompleteSessionForm(prev => ({ ...prev, actual_duration_minutes: e.target.value }))}
                    placeholder={selectedSession.duration_minutes?.toString() || '60'}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:space-x-2">
              <Button variant="outline" onClick={() => {
                setSelectedSession(null);
                setCompleteSessionForm({ notes: '', feedback: '', action_items: '', coach_rating: '', actual_duration_minutes: '' });
              }}>
                Annuler
              </Button>
              <Button
                onClick={() => handleCompleteSession(selectedSession.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                Terminer la session
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}