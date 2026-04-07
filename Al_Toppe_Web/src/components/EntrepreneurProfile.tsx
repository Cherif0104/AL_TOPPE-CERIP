import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Building,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Clock,
  CheckCircle,
  Play,
  XCircle
} from 'lucide-react';
import { User as UserType, formatRevenue, formatDate, getActivityStatusColor, getSectorIcon, CoachingSession, getSessionStatusColor, getSessionTypeIcon, formatSessionDuration } from '../services/api';
import { coachService } from '../services/coach';
import { isSupabaseAuthActive } from '@/config';
import { ensureEntrepreneurRecordIdForCurrentUser } from '@/services/supabaseCoaching';

interface EntrepreneurProfileProps {
  user: UserType;
}

function normalizeCivility(value: unknown): { civility: 'M' | 'Mme' | 'Mlle'; civilityDisplay: string } {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'mme' || raw === 'madame') {
    return { civility: 'Mme', civilityDisplay: 'Madame' };
  }
  if (raw === 'mlle' || raw === 'mademoiselle') {
    return { civility: 'Mlle', civilityDisplay: 'Mademoiselle' };
  }
  return { civility: 'M', civilityDisplay: 'Monsieur' };
}

function normalizeSector(value: unknown): { sector: UserType['entrepreneur']['activities'][number]['sector']; sectorDisplay: string } {
  const raw = String(value ?? '').trim().toLowerCase();
  const map: Record<string, { code: UserType['entrepreneur']['activities'][number]['sector']; label: string }> = {
    commerce: { code: 'commerce', label: 'Commerce' },
    agriculture: { code: 'agriculture', label: 'Agriculture' },
    artisanat: { code: 'artisanat', label: 'Artisanat' },
    service: { code: 'service', label: 'Service' },
    services: { code: 'service', label: 'Service' },
    technologie: { code: 'technologie', label: 'Technologie' },
    tech: { code: 'technologie', label: 'Technologie' },
  };
  return map[raw] ?? { code: 'service', label: 'Service' };
}

function normalizeActivityStatus(value: unknown): { status: UserType['entrepreneur']['activities'][number]['status']; statusDisplay: string } {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'inactive' || raw === 'inactif' || raw === 'inactifve') {
    return { status: 'inactive', statusDisplay: 'Inactif' };
  }
  if (raw === 'suspended' || raw === 'suspendu' || raw === 'suspendue') {
    return { status: 'suspended', statusDisplay: 'Suspendu' };
  }
  return { status: 'active', statusDisplay: 'Actif' };
}

function normalizeActivities(rawActivities: unknown, fallback: { entrepreneurId: string; businessName: string; sector: string; nowIso: string }) {
  const source = Array.isArray(rawActivities)
    ? rawActivities
    : fallback.businessName
      ? [{ id: `sb-act-${fallback.entrepreneurId || '1'}`, title: fallback.businessName, sector: fallback.sector }]
      : [];

  return source.map((item, index) => {
    const row = item as Record<string, unknown>;
    const sectorSource = row.sector_display ?? row.sector ?? fallback.sector;
    const statusSource = row.status_display ?? row.status ?? 'active';
    const civ = normalizeSector(sectorSource);
    const sts = normalizeActivityStatus(statusSource);

    return {
      id: String(row.id ?? `sb-act-${fallback.entrepreneurId}-${index}`),
      title: String(row.title ?? fallback.businessName ?? 'Activité'),
      sector: civ.code,
      sector_display: civ.label,
      description: String(row.description ?? ''),
      creation_date: String(row.creation_date ?? row.created_at ?? fallback.nowIso),
      legal_form: (String(row.legal_form ?? 'Informel') === 'Formel' ? 'Formel' : 'Informel') as 'Informel' | 'Formel',
      legal_form_display: String(row.legal_form_display ?? row.legal_form ?? 'Informel'),
      tax_regime: (String(row.tax_regime ?? 'Non imposable') === 'Imposable' ? 'Imposable' : 'Non imposable') as 'Non imposable' | 'Imposable',
      status: sts.status,
      status_display: sts.statusDisplay,
      age_days: Number(row.age_days ?? 0),
      total_revenue: String(row.total_revenue ?? '0'),
      total_expenses: String(row.total_expenses ?? '0'),
      profit: String(row.profit ?? '0'),
      created_at: String(row.created_at ?? fallback.nowIso),
      updated_at: String(row.updated_at ?? fallback.nowIso),
    };
  });
}

export function EntrepreneurProfile({ user }: EntrepreneurProfileProps) {
  const entrepreneur = user?.entrepreneur;
  const [supabaseEntrepreneur, setSupabaseEntrepreneur] = useState<UserType['entrepreneur'] | null>(null);
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [linkedSupabaseEntrepreneurId, setLinkedSupabaseEntrepreneurId] = useState<string | null>(null);
  const [supabaseLinkResolved, setSupabaseLinkResolved] = useState(() => !isSupabaseAuthActive());

  useEffect(() => {
    if (entrepreneur?.id) {
      setLinkedSupabaseEntrepreneurId(null);
      setSupabaseLinkResolved(true);
      return;
    }
    if (!isSupabaseAuthActive()) {
      setLinkedSupabaseEntrepreneurId(null);
      setSupabaseLinkResolved(true);
      return;
    }
    let cancelled = false;
    setSupabaseLinkResolved(false);
    void ensureEntrepreneurRecordIdForCurrentUser()
      .then((id) => {
        if (!cancelled) {
          setLinkedSupabaseEntrepreneurId(id);
          setSupabaseLinkResolved(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLinkedSupabaseEntrepreneurId(null);
          setSupabaseLinkResolved(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [entrepreneur?.id, user?.id]);

  const sessionsForEntrepreneurId = entrepreneur?.id ?? linkedSupabaseEntrepreneurId ?? null;

  useEffect(() => {
    let cancelled = false;
    const loadSupabaseEntrepreneur = async () => {
      if (entrepreneur || !sessionsForEntrepreneurId) {
        if (!cancelled) setSupabaseEntrepreneur(null);
        return;
      }
      try {
        const raw = await coachService.getEntrepreneur(sessionsForEntrepreneurId) as Record<string, unknown> | null;
        if (!raw) {
          if (!cancelled) setSupabaseEntrepreneur(null);
          return;
        }

        const firstName = String(raw.first_name || '').trim();
        const lastName = String(raw.last_name || '').trim();
        const fullName = String(raw.full_name || `${firstName} ${lastName}`.trim() || raw.email || 'Entrepreneur');
        const businessName = String(raw.business_name || '').trim();
        const sector = String(raw.sector || '').trim();
        const nowIso = new Date().toISOString();
        const civility = normalizeCivility(raw.civility);
        const activities = normalizeActivities(raw.activities, {
          entrepreneurId: String(raw.id || '1'),
          businessName,
          sector,
          nowIso,
        });

        if (!cancelled) setSupabaseEntrepreneur({
          id: String(raw.id || sessionsForEntrepreneurId),
          user: String(raw.entrepreneur_user_id || user.id || ''),
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          civility: civility.civility,
          civility_display: civility.civilityDisplay,
          cni_number: String(raw.cni_number || ''),
          address: String(raw.address || ''),
          whatsapp: String(raw.whatsapp || raw.phone || ''),
          birth_date: String(raw.birth_date || nowIso),
          age: Number(raw.age || 0),
          phone: String(raw.phone || ''),
          email: String(raw.email || ''),
          is_active: Boolean(raw.is_active ?? true),
          activities_count: Array.isArray(activities) ? activities.length : 0,
          total_revenue: String(raw.total_revenue || '0'),
          locations: Array.isArray(raw.locations) ? raw.locations : [],
          activities: activities as UserType['entrepreneur']['activities'],
          created_at: String(raw.created_at || nowIso),
          updated_at: String(raw.updated_at || nowIso),
        } as UserType['entrepreneur']);
      } catch (error) {
        console.error('Erreur lors du chargement du profil entrepreneur Supabase:', error);
        if (!cancelled) setSupabaseEntrepreneur(null);
      }
    };
    void loadSupabaseEntrepreneur();
    return () => {
      cancelled = true;
    };
  }, [entrepreneur, sessionsForEntrepreneurId, user.id]);

  useEffect(() => {
    const loadSessions = async () => {
      if (!sessionsForEntrepreneurId) return;
      setIsLoadingSessions(true);
      try {
        const sessionsData = await coachService.getSessions(undefined, sessionsForEntrepreneurId);
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      } catch (error) {
        console.error('Erreur lors du chargement des sessions:', error);
        setSessions([]);
      } finally {
        setIsLoadingSessions(false);
      }
    };
    void loadSessions();
  }, [sessionsForEntrepreneurId]);

  if (!supabaseLinkResolved) {
    return (
      <Card className="p-6">
        <p className="text-gray-500 text-center text-sm">Chargement du profil…</p>
      </Card>
    );
  }

  const effectiveEntrepreneur = entrepreneur ?? supabaseEntrepreneur;

  if (!effectiveEntrepreneur && !sessionsForEntrepreneurId) {
    return (
      <Card className="p-6">
        <div className="text-gray-600 text-center text-sm leading-relaxed">
          Profil entrepreneur non disponible pour ce compte.
          Votre coach peut creer votre dossier puis renseigner la colonne entrepreneur_user_id avec votre identifiant Auth pour lier le compte.
        </div>
      </Card>
    );
  }

  const activities = effectiveEntrepreneur?.activities ?? [];
  const total_revenues = activities.reduce(
    (acc: number, activity: { total_revenue: string | number }) =>
      acc + parseFloat(String(activity.total_revenue ?? 0)),
    0,
  );

  return (
    <div className="space-y-6" key={sessionsForEntrepreneurId ?? 'no-entrepreneur'}>
      {effectiveEntrepreneur && (
      <>
      {/* Informations personnelles */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-[#006666] rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{effectiveEntrepreneur.full_name}</h2>
              <p className="text-gray-600">{effectiveEntrepreneur.civility_display}</p>
              <Badge className="mt-1 bg-[#006666] text-white">
                {user.role_display}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Âge</p>
            <p className="text-lg font-semibold text-gray-900">{effectiveEntrepreneur.age} ans</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Phone className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Téléphone</p>
                <p className="font-medium">{effectiveEntrepreneur.phone}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Mail className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{effectiveEntrepreneur.email || 'Non renseigné'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Date de naissance</p>
                <p className="font-medium">
                  {effectiveEntrepreneur.birth_date ? formatDate(effectiveEntrepreneur.birth_date) : 'Non renseignée'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <MapPin className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Adresse</p>
                <p className="font-medium">{effectiveEntrepreneur.address}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Building className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Activités</p>
                <p className="font-medium">
                  {effectiveEntrepreneur.activities_count ?? activities.length} activité(s)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Chiffre d'affaires total</p>
                <p className="font-medium text-[#006666]">
                  {formatRevenue(total_revenues.toString())}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Activités */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Building className="w-5 h-5 text-[#006666]" />
          <h3 className="text-lg font-semibold text-gray-900">Mes Activités</h3>
        </div>

        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucune activité enregistrée</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getSectorIcon(activity.sector)}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                      <p className="text-sm text-gray-600">{activity.sector_display}</p>
                    </div>
                  </div>
                  <Badge className={getActivityStatusColor(activity.status)}>
                    {activity.status_display}
                  </Badge>
                </div>

                <p className="text-gray-700 mb-4">{activity.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Forme juridique</p>
                    <p className="font-medium">{activity.legal_form_display}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Régime fiscal</p>
                    <p className="font-medium">{activity.tax_regime}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Chiffre d'affaires</p>
                    <p className="font-medium text-green-600">{formatRevenue(activity.total_revenue)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Bénéfices</p>
                    <p className="font-medium text-[#006666]">{formatRevenue(activity.profit)}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Créée le {formatDate(activity.creation_date)}</span>
                    <span>{activity.age_days} jours d'activité</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      </>
      )}

      {!effectiveEntrepreneur && sessionsForEntrepreneurId && (
        <Card className="p-6 border-[#006666]/20 bg-[#006666]/5">
          <div className="text-sm text-gray-700 leading-relaxed">
            Votre compte est lié à un dossier entrepreneur (données Supabase). Le détail du profil complet s’affiche lorsque
            les champs du dossier sont disponibles.
          </div>
        </Card>
      )}

      {/* Sessions de coaching */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <MessageSquare className="w-5 h-5 text-[#006666]" />
          <h3 className="text-lg font-semibold text-gray-900">Sessions de Coaching</h3>
        </div>

        {isLoadingSessions ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-[#006666] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-500">Chargement des sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucune session de coaching enregistrée</p>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{getSessionTypeIcon(session.session_type)}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900 capitalize">{session.session_type?.replace('_', ' ')}</h4>
                      <p className="text-sm text-gray-600">
                        {session.scheduled_date
                          ? new Date(session.scheduled_date as string).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Date à confirmer'}
                      </p>
                    </div>
                  </div>
                  <Badge className={getSessionStatusColor(session.status)}>
                    {session.status === 'scheduled' && <Calendar className="w-3 h-3 mr-1" />}
                    {session.status === 'in_progress' && <Play className="w-3 h-3 mr-1" />}
                    {session.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                    <span className="capitalize">{session.status?.replace('_', ' ')}</span>
                  </Badge>
                </div>

                {session.agenda && (
                  <p className="text-gray-700 mb-3 text-sm">{session.agenda}</p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Durée</p>
                    <p className="font-medium">{formatSessionDuration(session.duration_minutes)}</p>
                  </div>
                  {session.actual_duration_minutes && (
                    <div>
                      <p className="text-gray-500">Durée réelle</p>
                      <p className="font-medium">{formatSessionDuration(session.actual_duration_minutes)}</p>
                    </div>
                  )}
                  {session.coach_rating && (
                    <div>
                      <p className="text-gray-500">Évaluation coach</p>
                      <p className="font-medium text-[#FF9933]">{session.coach_rating}/5</p>
                    </div>
                  )}
                  {session.entrepreneur_rating && (
                    <div>
                      <p className="text-gray-500">Évaluation entrepreneur</p>
                      <p className="font-medium text-[#FF9933]">{session.entrepreneur_rating}/5</p>
                    </div>
                  )}
                </div>

                {session.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-700">{session.notes}</p>
                  </div>
                )}

                {session.feedback && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Feedback</p>
                    <p className="text-sm text-gray-700">{session.feedback}</p>
                  </div>
                )}

                {session.action_items && session.action_items.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Actions à suivre</p>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {session.action_items.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Localisations */}
      {effectiveEntrepreneur && (effectiveEntrepreneur.locations ?? []).length > 0 && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-6">
            <MapPin className="w-5 h-5 text-[#006666]" />
            <h3 className="text-lg font-semibold text-gray-900">Localisations</h3>
          </div>

          <div className="space-y-3">
            {(effectiveEntrepreneur.locations ?? []).map((location) => (
              <div key={location.id} 
                className={`p-3 rounded-lg border ${location.is_primary ? 'border-[#006666] bg-[#006666]/5' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{location.address}</p>
                    <p className="text-sm text-gray-600">{location.city}, {location.region}</p>
                  </div>
                  {location.is_primary && (
                    <Badge className="bg-[#006666] text-white text-xs">
                      Principal
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}