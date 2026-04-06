import { useState, useEffect } from 'react';
import { coachService } from '../services/coach';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Users,
  Search,
  Filter,
  Plus,
  Phone,
  MessageCircle,
  FileText,
  Edit,
  Eye,
  Calendar,
  TrendingUp,
  MapPin,
  Building
} from 'lucide-react';
import { EntrepreneurProfile } from './EntrepreneurProfile';
import Swal from 'sweetalert2';
import { formatRevenue } from '@/services/api';

interface EntrepreneursManagementProps {
  user?: any;
  initialAction?: string | null;
  onActionHandled?: () => void;
}

export function EntrepreneursManagement({ user, initialAction, onActionHandled }: EntrepreneursManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    civility: 'M',
    cni_number: '',
    address: '',
    whatsapp: '',
    birth_date: '',
    phone: '',
    email: '',
    password: '',
    password_confirm: '',
    primary_address: '',
    primary_region: 'Dakar',
    primary_city: 'Dakar',
    primary_lat: '0',
    primary_lng: '0',
    objectives: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 jours plus tard
    activities: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Nouveaux états pour les actions
  const [viewingEntrepreneur, setViewingEntrepreneur] = useState<any>(null);
  const [editingEntrepreneur, setEditingEntrepreneur] = useState<any>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [sessionFormData, setSessionFormData] = useState({
    assignment_id: '',
    session_type: 'individual',
    scheduled_date: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:mm
    duration_minutes: 60,
    agenda: ''
  });
    // Chiffre d'affaires total


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));

    // Effacer l'erreur du champ lorsqu'il est modifié
    if (formErrors[id]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Effacer l'erreur du champ lorsqu'il est modifié
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setFormErrors({}); // Réinitialiser toutes les erreurs au début

      const errors: Record<string, string> = {};

      // Validations des champs requis
      const requiredFields = [
        'first_name',
        'last_name',
        'phone',
        'email',
        'password',
        'password_confirm',
        'primary_address',
        'primary_city',
        'primary_region',
        'birth_date'
      ];

      requiredFields.forEach(field => {
        if (!formData[field]) {
          errors[field] = 'Ce champ est requis';
        }
      });

      // Validation du format de téléphone
      const phoneRegex = /^221 7[0-8] [0-9]{3} [0-9]{2} [0-9]{2}$/;
      if (!errors.phone) {
        if (!phoneRegex.test(formData.phone)) {
          errors.phone = 'Le format doit être: 221 7X XXX XX XX';
        }
      }

      // Validation du format WhatsApp s'il est fourni
      if (formData.whatsapp && !errors.whatsapp) {
        if (!phoneRegex.test(formData.whatsapp)) {
          errors.whatsapp = 'Le format doit être: 221 7X XXX XX XX';
        }
      }

      // Validation de l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!errors.email && !emailRegex.test(formData.email.trim())) {
        errors.email = 'Format d\'email invalide';
      }

      // Validation du mot de passe
      if (!errors.password && formData.password.length < 8) {
        errors.password = 'Le mot de passe doit contenir au moins 8 caractères';
      }

      if (!errors.password_confirm && formData.password !== formData.password_confirm) {
        errors.password_confirm = 'Les mots de passe ne correspondent pas';
      }

      const cniTrim = formData.cni_number.trim();
      if (cniTrim) {
        const cniDigits = cniTrim.replace(/\D/g, '');
        if (cniDigits.length < 12 || cniDigits.length > 14) {
          errors.cni_number =
            'Si renseigné, le N° CNI doit contenir entre 12 et 14 chiffres (optionnel).';
        }
      }

      // Récupérer le coach ID depuis localStorage
      const stored = localStorage.getItem('altoppe_user') || localStorage.getItem('user');
      const parsed = stored ? JSON.parse(stored) : null;
      const coachId = parsed?.coach?.id || parsed?.coach_id || parsed?.coachId;

      if (!coachId) {
        throw new Error('Coach ID non trouvé');
      }      // Créer l'entrepreneur avec les données exactes attendues par l'API
      // Validation du format de téléphone avec la regex exacte attendue
      if (!errors.phone) {
        // Nettoyer d'abord le numéro
        const cleanedPhone = formData.phone.replace(/\s+/g, '');

        // Si le numéro n'a pas le bon nombre de chiffres
        if (cleanedPhone.length !== 12) {
          errors.phone = 'Le numéro doit contenir 12 chiffres (221 suivi de 9 chiffres)';
        }
        // Si le numéro ne commence pas par 221
        else if (!cleanedPhone.startsWith('221')) {
          errors.phone = 'Le numéro doit commencer par 221';
        }
        // Si le numéro ne continue pas avec 7X (où X est 0-8)
        else if (!['70', '71', '75', '76', '77', '78'].includes(cleanedPhone.slice(3, 5))) {
          errors.phone = 'Le préfixe doit être 70, 71, 75, 76, 77 ou 78';
        }
      }

      // Fonction de formatage du téléphone
      const formatPhoneForAPI = (phone: string) => {
        const cleaned = phone.replace(/\s+/g, '');
        return [
          cleaned.slice(0, 3), // 221
          cleaned.slice(3, 5), // 7X
          cleaned.slice(5, 8), // XXX
          cleaned.slice(8, 10), // XX
          cleaned.slice(10, 12) // XX
        ].join(' ');
      };

      // Validation du format WhatsApp s'il est fourni
      if (formData.whatsapp && !errors.whatsapp) {
        const whatsappRegex = /^[0-9\s]+$/;
        if (!whatsappRegex.test(formData.whatsapp)) {
          errors.whatsapp = 'Le numéro ne doit contenir que des chiffres et des espaces';
        }
        const cleanedWhatsapp = formData.whatsapp.replace(/\s+/g, '');
        if (cleanedWhatsapp.length < 9) {
          errors.whatsapp = 'Le numéro WhatsApp est trop court';
        }
      }

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        setIsSubmitting(false);
        return;
      }

      // Préparation des données en gardant les formats saisis
      const phone = formatPhoneForAPI(formData.phone);
      const whatsapp = formData.whatsapp ? formatPhoneForAPI(formData.whatsapp) : undefined;

      console.log('Numéro formaté:', phone);
      console.log('WhatsApp formaté:', whatsapp);

      const entrepreneurData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        civility: formData.civility,
        cni_number: cniTrim ? cniTrim.replace(/\D/g, '') : '',
        address: formData.primary_address.trim(),
        whatsapp: whatsapp,
        birth_date: formData.birth_date,
        phone: phone,
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        password_confirm: formData.password_confirm,
        primary_address: formData.primary_address.trim(),
        primary_region: formData.primary_region.trim(),
        primary_city: formData.primary_city.trim(),
        primary_lat: "0",
        primary_lng: "0"
      };

      const newEntrepreneur = editingEntrepreneur
        ? await coachService.updateEntrepreneur(editingEntrepreneur.id, entrepreneurData)
        : await coachService.createEntrepreneur(entrepreneurData);

      // Si c'est une création, vérifier si une assignation existe déjà avant d'en créer une
      if (!editingEntrepreneur) {
        try {
          // Vérifier si une assignation existe déjà pour cet entrepreneur
          const existingAssignments = await coachService.getAssignments(coachId);
          const existingAssignment = existingAssignments.find(
            (a: any) => a.entrepreneur === newEntrepreneur.id || a.entrepreneur_id === newEntrepreneur.id
          );

          // Si aucune assignation n'existe, en créer une
          if (!existingAssignment) {
            await coachService.assignEntrepreneurToCoach({
              coach: coachId,
              entrepreneur: newEntrepreneur.id,
              start_date: formData.start_date,
              end_date: formData.end_date,
              objectives: formData.objectives ? [formData.objectives] : []
            });
          } else {
            console.log('Assignation déjà existante pour cet entrepreneur, pas de création nécessaire');
          }
        } catch (assignError: any) {
          // Si l'erreur indique qu'une assignation existe déjà, on continue
          if (assignError.message && (
            assignError.message.includes('ensemble unique') ||
            assignError.message.includes('déjà assigné') ||
            assignError.message.includes('unique')
          )) {
            console.log('Assignation déjà existante, continuation...');
          } else {
            // Sinon, propager l'erreur
            throw assignError;
          }
        }
      }

      // Recharger la liste des entrepreneurs
      const data = await coachService.getCoachEntrepreneurs(coachId);
      setEntrepreneurs(data);

      // Afficher un message de succès
      Swal.fire({
        icon: 'success',
        title: 'Succès',
        text: editingEntrepreneur ? 'Entrepreneur modifié avec succès' : 'Entrepreneur créé avec succès',
        confirmButtonColor: '#006666',
        timer: 2000
      });

      // Fermer le dialog et réinitialiser le formulaire
      setShowAddDialog(false);
      setEditingEntrepreneur(null);
      setFormErrors({}); // Réinitialiser les erreurs
      setFormData({
        first_name: '',
        last_name: '',
        civility: 'M',
        cni_number: '',
        address: '',
        whatsapp: '',
        birth_date: '',
        phone: '',
        email: '',
        password: '',
        password_confirm: '',
        primary_address: '',
        primary_region: 'Dakar',
        primary_city: 'Dakar',
        primary_lat: '0',
        primary_lng: '0',
        objectives: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        activities: []
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'enregistrement de l\'entrepreneur:', error);
      console.log('Structure de l\'erreur:', {
        message: error.message,
        body: error.body,
        status: error.status
      });
      
      // Extraire les erreurs de validation du backend
      let errorMessage = 'Une erreur est survenue lors de l\'enregistrement de l\'entrepreneur';
      const fieldErrors: Record<string, string> = {};
      
      // Essayer d'extraire les erreurs depuis différentes sources possibles
      let errorData = null;
      
      // 1. Essayer depuis error.body (source principale)
      if (error.body && typeof error.body === 'object') {
        errorData = error.body;
        console.log('Erreurs trouvées dans error.body:', errorData);
      }
      // 2. Essayer depuis error directement si c'est un objet avec des propriétés d'erreur
      else if (error && typeof error === 'object') {
        // Vérifier si error contient directement des propriétés d'erreur (comme 'phone', 'cni_number', etc.)
        const errorKeys = Object.keys(error).filter(key => 
          key !== 'message' && 
          key !== 'name' && 
          key !== 'stack' &&
          key !== 'body' &&
          key !== 'status' &&
          !key.startsWith('_') &&
          !/^\d+$/.test(key) // Exclure les clés numériques
        );
        
        if (errorKeys.length > 0) {
          // Créer un objet avec seulement les propriétés d'erreur
          const extractedErrors: Record<string, unknown> = {};
          errorKeys.forEach(key => {
            extractedErrors[key] = error[key];
          });
          errorData = extractedErrors;
          console.log('Erreurs trouvées directement dans error:', errorData);
        }
      }
      // 3. Essayer depuis error.data ou error.response?.data
      if (!errorData) {
        if (error.data && typeof error.data === 'object') {
          errorData = error.data;
          console.log('Erreurs trouvées dans error.data:', errorData);
        } else if (error.response?.data && typeof error.response.data === 'object') {
          errorData = error.response.data;
          console.log('Erreurs trouvées dans error.response.data:', errorData);
        }
      }
      
      // Vérifier si on a trouvé des données d'erreur
      if (errorData && typeof errorData === 'object') {
        console.log('Traitement des erreurs depuis errorData:', errorData);
        
        // Parcourir toutes les propriétés de l'objet d'erreur
        Object.keys(errorData).forEach(key => {
          // Ignorer les clés spéciales qui ne sont pas des champs de formulaire
          if (key === 'non_field_errors' || key === 'detail' || key === 'message') {
            return;
          }
          
          // Ignorer les clés numériques (comme "0") qui sont des indices de tableau
          if (/^\d+$/.test(key)) {
            return;
          }
          
          const errorValue = errorData[key];
          
          // Si c'est un tableau de messages d'erreur
          if (Array.isArray(errorValue) && errorValue.length > 0) {
            // Prendre le premier message du tableau
            fieldErrors[key] = String(errorValue[0]);
          } 
          // Si c'est une chaîne directement
          else if (typeof errorValue === 'string' && errorValue.trim() !== '') {
            fieldErrors[key] = errorValue;
          }
          // Si c'est un objet avec un message
          else if (errorValue && typeof errorValue === 'object' && errorValue.message) {
            fieldErrors[key] = String(errorValue.message);
          }
        });
        
        console.log('Erreurs extraites après traitement:', fieldErrors);
        
        // Construire le message d'erreur général
        if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
          errorMessage = errorData.non_field_errors.join(', ');
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (Object.keys(fieldErrors).length > 0) {
          // Si on a des erreurs de champs, créer un message générique
          errorMessage = 'Veuillez corriger les erreurs dans le formulaire';
        }
      } else if (error.message) {
        errorMessage = error.message;
        console.warn('Aucune donnée d\'erreur structurée trouvée. Message d\'erreur:', error.message);
      }
      
      // Mettre à jour les erreurs de formulaire
      if (Object.keys(fieldErrors).length > 0) {
        console.log('Erreurs de validation extraites et assignées:', fieldErrors);
        setFormErrors(fieldErrors);
      } else {
        console.warn('Aucune erreur de champ extraite. Structure complète de l\'erreur:', error);
      }
      
      // Afficher l'alerte seulement s'il n'y a pas d'erreurs de champs spécifiques
      // (pour éviter de masquer les erreurs dans le formulaire)
      if (Object.keys(fieldErrors).length === 0) {
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errorMessage,
          confirmButtonColor: '#006666',
          timer: 1000
        });
      } else {
        // Afficher une alerte plus discrète si on a des erreurs de champs
        Swal.fire({
          icon: 'error',
          title: 'Erreurs de validation',
          text: 'Veuillez corriger les erreurs dans le formulaire',
          confirmButtonColor: '#006666',
          timer: 1000
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleView = async (id: string) => {
    try {
      const fullData = await coachService.getEntrepreneur(id);
      // Créer un objet User compatible avec EntrepreneurProfile
      const mockUser = {
        id: fullData.user,
        phone: fullData.phone,
        email: fullData.email,
        role: 'entrepreneur',
        role_display: 'Entrepreneur',
        language: 'fr',
        is_active: fullData.is_active,
        created_at: fullData.created_at,
        last_login: '',
        full_name: fullData.full_name,
        entrepreneur: fullData
      };
      setViewingEntrepreneur(mockUser);
      setShowViewDialog(true);
    } catch (error) {
      console.error('Erreur lors de la récupération des détails:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Impossible de charger les détails de l\'entrepreneur',
        timer: 1000

      });
    }
  };

  const handleEdit = (ent: any) => {
    setEditingEntrepreneur(ent);
    const raw = ent.raw || {};
    setFormData({
      first_name: ent.first_name || '',
      last_name: ent.last_name || '',
      civility: raw.civility || 'M',
      cni_number: raw.cni_number || '',
      address: ent.address || '',
      whatsapp: raw.whatsapp || '',
      birth_date: raw.birth_date || '',
      phone: raw.phone || ent.phone || '',
      email: raw.email || '',
      password: '', // On ne pré-remplit pas le mot de passe
      password_confirm: '',
      primary_address: ent.address || '',
      primary_region: raw.primary_region || 'Dakar',
      primary_city: raw.primary_city || 'Dakar',
      primary_lat: '0',
      primary_lng: '0',
      objectives: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      activities: []
    });
    setShowAddDialog(true);
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
  };

  const handleMessage = (whatsapp: string) => {
    const cleaned = (whatsapp || '').replace(/\s+/g, '').replace('+', '');
    window.open(`https://wa.me/${cleaned}`, '_blank');
  };

  const handleSchedule = (ent: any) => {
    // Il nous faut l'ID de l'assignation. On suppose qu'il est dans raw.assignment_id ou similaire
    // Sinon on peut essayer de le trouver via coachService.getAssignments
    setSessionFormData(prev => ({
      ...prev,
      assignment_id: ent.raw?.assignment_id || '',
      scheduled_date: new Date().toISOString().slice(0, 16)
    }));
    setViewingEntrepreneur(ent); // Réutilise pour savoir pour qui on planifie
    setShowSessionDialog(true);
  };

  const handleCreateSession = async () => {
    try {
      setIsSubmitting(true);

      // Si on n'a pas l'assignment_id, on doit le chercher
      let assignmentId = sessionFormData.assignment_id;
      if (!assignmentId) {
        const stored = localStorage.getItem('altoppe_user') || localStorage.getItem('user');
        const parsed = stored ? JSON.parse(stored) : null;
        const coachId = parsed?.coach?.id || parsed?.coach_id || parsed?.coachId;

        const assignments = await coachService.getAssignments(coachId);
        const userAssignment = assignments.find((a: any) => a.entrepreneur === viewingEntrepreneur.id || a.entrepreneur_id === viewingEntrepreneur.id);

        if (userAssignment) {
          assignmentId = userAssignment.id;
        } else {
          throw new Error('Aucune assignation trouvée pour cet entrepreneur.');
        }
      }

      await coachService.addSession({
        assignment: assignmentId,
        session_type: sessionFormData.session_type,
        scheduled_date: sessionFormData.scheduled_date,
        duration_minutes: sessionFormData.duration_minutes,
        agenda: sessionFormData.agenda
      });

      Swal.fire({
        icon: 'success',
        title: 'Succès',
        text: 'Session planifiée avec succès',
        confirmButtonColor: '#006666'
      });
      setShowSessionDialog(false);
    } catch (error: any) {
      console.error('Erreur lors de la planification:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: error.message || 'Erreur lors de la planification de la session',
        confirmButtonColor: '#006666',
        timer: 1000

      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Données des entrepreneurs du backend
  const [entrepreneurs, setEntrepreneurs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEntrepreneurs = async () => {
      try {
        // Récupérer l'utilisateur stocké dans localStorage (clé utilisée ailleurs)
        const stored = typeof window !== 'undefined' ? (localStorage.getItem('altoppe_user') || localStorage.getItem('user')) : null;
        let coachId: string | null = null;

        if (stored) {
          try {
            const parsed = JSON.parse(stored as string);
            coachId = parsed?.coach?.id || parsed?.coach_id || parsed?.coachId || null;
          } catch (e) {
            console.warn('Impossible de parser l\'utilisateur en localStorage', e);
          }
        }

        if (!coachId) {
          console.warn('Aucun coach id trouvé dans le localStorage. Annulation du fetch.');
          setEntrepreneurs([]);
          setIsLoading(false);
          return;
        }

        const data = await coachService.getCoachEntrepreneurs(coachId);
        console.log('Entrepreneurs backend:', data);

        // L'API peut renvoyer un objet contenant une clé 'entrepreneurs' ou un tableau directement
        const list: unknown[] = Array.isArray(data)
          ? (data as unknown[])
          : (Array.isArray((data as { entrepreneurs?: unknown[] }).entrepreneurs)
            ? ((data as { entrepreneurs?: unknown[] }).entrepreneurs as unknown[])
            : []);

        // Normaliser chaque entrepreneur pour faciliter l'affichage
        const normalized = list.map((item) => {
          const e = item as Record<string, unknown>;
          const getStr = (k: string) => (typeof e[k] === 'string' ? (e[k] as string) : '');
          const getArr = (k: string) => (Array.isArray(e[k]) ? (e[k] as unknown[]) : []);

          const first_name = getStr('first_name') || getStr('prenom') || getStr('prenom_fr');
          const last_name = getStr('last_name') || getStr('nom') || getStr('nom_fr');
          const activities = getArr('activities');
          const firstActivity = activities.length > 0 ? (activities[0] as Record<string, unknown>) : null;
          const business = firstActivity ? (typeof firstActivity['title'] === 'string' ? (firstActivity['title'] as string) : '') : (getStr('business') || getStr('entreprise'));
          const sector = firstActivity ? (typeof firstActivity['sector_display'] === 'string' ? (firstActivity['sector_display'] as string) : (typeof firstActivity['sector'] === 'string' ? (firstActivity['sector'] as string) : '')) : (getStr('secteur') || getStr('sector'));
          const locationsArr = Array.isArray(e['locations']) ? (e['locations'] as unknown[]) : [];
          const addressFromLocations = locationsArr.length > 0 && typeof (locationsArr[0] as Record<string, unknown>)['address'] === 'string'
            ? ((locationsArr[0] as Record<string, unknown>)['address'] as string)
            : '';
          const address = getStr('address') || addressFromLocations || getStr('adresse');
          const isActive = typeof e['is_active'] === 'boolean' ? (e['is_active'] as boolean) : undefined;
          const status = typeof isActive === 'boolean' ? (isActive ? 'En cours' : 'Suspendu') : (getStr('status_display') || getStr('status') || 'Nouveau');
          const progress = typeof e['progres'] === 'number' ? (e['progres'] as number) : (typeof e['progress'] === 'number' ? (e['progress'] as number) : 0);
          const lastSession = getStr('last_session') || getStr('dernier_session') || null;
          const revenue = getStr('total_revenue') || getStr('chiffre_affaires') || getStr('revenue') || '0 FCFA';

          return {
            id: getStr('id') || String(e['id'] || ''),
            first_name,
            last_name,
            full_name: getStr('full_name') || `${first_name} ${last_name}`.trim(),
            business,
            sector,
            address,
            status,
            progress,
            lastSession,
            revenue,
            raw: e,
          };
        });

        setEntrepreneurs(normalized);
      } catch (error) {
        console.error('Erreur chargement entrepreneurs:', error);
        setEntrepreneurs([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEntrepreneurs();
  }, []);

  useEffect(() => {
    if (initialAction === 'add') {
      setShowAddDialog(true);
      if (onActionHandled) onActionHandled();
    }
  }, [initialAction]);
  const [totalRevenues, setTotalRevenues] = useState<string>('0 FCFA');
  useEffect(() => {
      const total_revenues = entrepreneurs.reduce((acc: number, entrepreneur: any) => {
        const revenue = entrepreneur.total_revenue || entrepreneur.revenue || '0';
        const numRevenue = typeof revenue === 'string' ? parseFloat(revenue.replace(/[^\d.]/g, '')) || 0 : (typeof revenue === 'number' ? revenue : 0);
        return acc + numRevenue;
      }, 0);
      setTotalRevenues(formatRevenue(total_revenues.toString()));
  }, [entrepreneurs]);  

  const getStatusBadge = (status: string) => {
    const config = {
      'En cours': { color: 'bg-blue-100 text-blue-800', label: 'En cours' },
      'Nouveau': { color: 'bg-green-100 text-green-800', label: 'Nouveau' },
      'Terminé': { color: 'bg-gray-100 text-gray-800', label: 'Terminé' },
      'Suspendu': { color: 'bg-red-100 text-red-800', label: 'Suspendu' }
    };

    const statusConfig = config[status as keyof typeof config] || config['En cours'];

    return (
      <Badge className={statusConfig.color}>
        {statusConfig.label}
      </Badge>
    );
  };

  const getSectorIcon = (sector: string) => {
    switch (sector) {
      case 'Commerce': return '🏪';
      case 'Artisanat': return '🔨';
      case 'Services': return '⚙️';
      case 'Agriculture': return '🌱';
      default: return '💼';
    }
  };

  const filteredEntrepreneurs = entrepreneurs.filter(entrepreneur => {
    const low = (s: unknown) => String(s || '').toLowerCase();
    const matchesSearch = low(entrepreneur.full_name).includes(searchTerm.toLowerCase()) ||
      low(entrepreneur.business).includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || entrepreneur.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Gestion des Entrepreneurs</h1>
          <p className="text-sm md:text-base text-gray-600">Accompagnez et suivez vos entrepreneurs assignés</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) {
            setEditingEntrepreneur(null);
            setFormErrors({}); // Réinitialiser les erreurs
            setFormData({
              first_name: '', last_name: '', civility: 'M', cni_number: '', address: '', whatsapp: '', birth_date: '', phone: '', email: '', password: '', password_confirm: '', primary_address: '', primary_region: 'Dakar', primary_city: 'Dakar', primary_lat: '0', primary_lng: '0', objectives: '', start_date: new Date().toISOString().split('T')[0], end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], activities: []
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#006666] hover:bg-[#004d4d] w-full sm:w-auto" onClick={() => {
              setEditingEntrepreneur(null);
              setShowAddDialog(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter entrepreneur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl w-[95vw] sm:w-full overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-semibold">
                {editingEntrepreneur ? 'Modifier l\'entrepreneur' : 'Ajouter un nouvel entrepreneur'}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Les champs marqués d'un <span className="text-red-500">*</span> sont obligatoires
              </p>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              {/* Section Informations personnelles */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Informations personnelles</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Informations personnelles */}
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-sm font-medium">
                  Prénom <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="first_name"
                  placeholder="Prénom"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className={`${formErrors.first_name ? 'border-red-500' : ''} text-base`}
                  required
                  aria-invalid={!!formErrors.first_name}
                  aria-describedby={formErrors.first_name ? 'first_name-error' : undefined}
                />
                {formErrors.first_name && (
                  <p id="first_name-error" className="text-sm text-red-500" role="alert">
                    {formErrors.first_name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-sm font-medium">
                  Nom <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="last_name"
                  placeholder="Nom"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className={`${formErrors.last_name ? 'border-red-500' : ''} text-base`}
                  required
                  aria-invalid={!!formErrors.last_name}
                  aria-describedby={formErrors.last_name ? 'last_name-error' : undefined}
                />
                {formErrors.last_name && (
                  <p id="last_name-error" className="text-sm text-red-500" role="alert">
                    {formErrors.last_name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="civility" className="text-sm font-medium">
                  Civilité
                </Label>
                <Select value={formData.civility} onValueChange={handleSelectChange('civility')}>
                  <SelectTrigger className={`${formErrors.civility ? 'border-red-500' : ''} text-base`}>
                    <SelectValue placeholder="Civilité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">M.</SelectItem>
                    <SelectItem value="Mme">Mme</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.civility && (
                  <p className="text-sm text-red-500" role="alert">{formErrors.civility}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date" className="text-sm font-medium">
                  Date de naissance <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      birth_date: value
                    }));
                    
                    // Effacer l'erreur du champ lorsqu'il est modifié
                    if (formErrors.birth_date) {
                      setFormErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.birth_date;
                        return newErrors;
                      });
                    }
                  }}
                  className={`${formErrors.birth_date ? 'border-red-500' : ''} text-base`}
                  required
                  aria-invalid={!!formErrors.birth_date}
                  aria-describedby={formErrors.birth_date ? 'birth_date-error' : 'birth_date-help'}
                />
               
                {formErrors.birth_date && (
                  <p id="birth_date-error" className="text-sm text-red-500" role="alert">
                    {formErrors.birth_date}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cni_number" className="text-sm font-medium">
                  Numéro CNI <span className="text-muted-foreground font-normal text-xs">(optionnel, 13 chiffres)</span>
                </Label>
                <Input
                  id="cni_number"
                  placeholder="1234567890123"
                  value={formData.cni_number}
                  onChange={handleInputChange}
                  className={`${formErrors.cni_number ? 'border-red-500' : ''} text-base`}
                  required
                  aria-invalid={!!formErrors.cni_number}
                  aria-describedby={formErrors.cni_number ? 'cni_number-error' : undefined}
                />
                {formErrors.cni_number && (
                  <p id="cni_number-error" className="text-sm text-red-500" role="alert">
                    {formErrors.cni_number}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`${formErrors.email ? 'border-red-500' : ''} text-base`}
                  required
                  aria-invalid={!!formErrors.email}
                  aria-describedby={formErrors.email ? 'email-error' : undefined}
                />
                {formErrors.email && (
                  <p id="email-error" className="text-sm text-red-500" role="alert">
                    {formErrors.email}
                  </p>
                )}
              </div>

                </div>
              </div>

              {/* Section Contact */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Téléphone <span className="text-red-500">*</span>
                </Label>
                <div className="space-y-1">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="7X XXX XX XX (221 ajouté automatiquement)"
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value;
                      const cleaned = value.replace(/\D/g, '');

                      // Si l'utilisateur commence à saisir sans "221", l'ajouter automatiquement
                      let phoneNumber = cleaned;
                      
                      // Si le numéro ne commence pas par "221", l'ajouter
                      if (cleaned.length > 0 && !cleaned.startsWith('221')) {
                        // Si l'utilisateur saisit directement les 9 chiffres (sans 221)
                        if (cleaned.length <= 9) {
                          phoneNumber = '221' + cleaned;
                        } else {
                          // Si l'utilisateur a saisi plus de 9 chiffres mais ne commence pas par 221
                          // On garde ce qu'il a saisi mais on limite à 12 chiffres
                          phoneNumber = cleaned.slice(0, 12);
                        }
                      } else if (cleaned.length === 0) {
                        // Champ vide, on ne fait rien
                        phoneNumber = '';
                      } else {
                        // Le numéro commence déjà par 221, on limite à 12 chiffres
                        phoneNumber = cleaned.slice(0, 12);
                      }

                      // Formater le numéro avec des espaces
                      let formatted = '';
                      if (phoneNumber.length > 0) {
                        // Format: 221 7X XXX XX XX
                        if (phoneNumber.length >= 3) {
                          formatted = phoneNumber.slice(0, 3) + ' ' + phoneNumber.slice(3);
                        }
                        if (phoneNumber.length >= 5) {
                          formatted = formatted.slice(0, 6) + ' ' + formatted.slice(6);
                        }
                        if (phoneNumber.length >= 8) {
                          formatted = formatted.slice(0, 10) + ' ' + formatted.slice(10);
                        }
                        if (phoneNumber.length >= 10) {
                          formatted = formatted.slice(0, 13) + ' ' + formatted.slice(13);
                        }
                      }

                      setFormData(prev => ({
                        ...prev,
                        phone: formatted
                      }));
                      
                      // Effacer l'erreur du champ lorsqu'il est modifié
                      if (formErrors.phone) {
                        setFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.phone;
                          return newErrors;
                        });
                      }
                    }}
                    className={`${formErrors.phone ? 'border-red-500' : ''} text-base`}
                    required
                    aria-invalid={!!formErrors.phone}
                    aria-describedby={formErrors.phone ? 'phone-error' : 'phone-help'}
                  />
                 
                  {formErrors.phone && (
                    <p id="phone-error" className="text-sm text-red-500" role="alert">
                      {formErrors.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-sm font-medium">
                  WhatsApp
                </Label>
                <div className="space-y-1">
                  <Input
                    id="whatsapp"
                    type="tel"
                    placeholder="7X XXX XX XX (221 ajouté automatiquement)"
                    value={formData.whatsapp}
                    onChange={(e) => {
                      const value = e.target.value;
                      const cleaned = value.replace(/\D/g, '');

                      // Si l'utilisateur commence à saisir sans "221", l'ajouter automatiquement
                      let phoneNumber = cleaned;
                      
                      // Si le numéro ne commence pas par "221", l'ajouter
                      if (cleaned.length > 0 && !cleaned.startsWith('221')) {
                        // Si l'utilisateur saisit directement les 9 chiffres (sans 221)
                        if (cleaned.length <= 9) {
                          phoneNumber = '221' + cleaned;
                        } else {
                          // Si l'utilisateur a saisi plus de 9 chiffres mais ne commence pas par 221
                          // On garde ce qu'il a saisi mais on limite à 12 chiffres
                          phoneNumber = cleaned.slice(0, 12);
                        }
                      } else if (cleaned.length === 0) {
                        // Champ vide, on ne fait rien
                        phoneNumber = '';
                      } else {
                        // Le numéro commence déjà par 221, on limite à 12 chiffres
                        phoneNumber = cleaned.slice(0, 12);
                      }

                      // Formater le numéro avec des espaces
                      let formatted = '';
                      if (phoneNumber.length > 0) {
                        // Format: 221 7X XXX XX XX
                        if (phoneNumber.length >= 3) {
                          formatted = phoneNumber.slice(0, 3) + ' ' + phoneNumber.slice(3);
                        }
                        if (phoneNumber.length >= 5) {
                          formatted = formatted.slice(0, 6) + ' ' + formatted.slice(6);
                        }
                        if (phoneNumber.length >= 8) {
                          formatted = formatted.slice(0, 10) + ' ' + formatted.slice(10);
                        }
                        if (phoneNumber.length >= 10) {
                          formatted = formatted.slice(0, 13) + ' ' + formatted.slice(13);
                        }
                      }

                      setFormData(prev => ({
                        ...prev,
                        whatsapp: formatted
                      }));
                      
                      // Effacer l'erreur du champ lorsqu'il est modifié
                      if (formErrors.whatsapp) {
                        setFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.whatsapp;
                          return newErrors;
                        });
                      }
                    }}
                    className={`${formErrors.whatsapp ? 'border-red-500' : ''} text-base`}
                    aria-invalid={!!formErrors.whatsapp}
                    aria-describedby={formErrors.whatsapp ? 'whatsapp-error' : 'whatsapp-help'}
                  />
                
                  {formErrors.whatsapp && (
                    <p id="whatsapp-error" className="text-sm text-red-500" role="alert">
                      {formErrors.whatsapp}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary_address">Adresse</Label>
                <Input
                  id="primary_address"
                  placeholder="Adresse complète"
                  value={formData.primary_address}
                  onChange={handleInputChange}
                  className={formErrors.primary_address ? 'border-red-500' : ''}
                  required
                />
                {formErrors.primary_address && (
                  <p className="text-sm text-red-500">{formErrors.primary_address}</p>
                )}
              </div>

              {/* Localisation */}
              <div className="space-y-2">
                <Label htmlFor="primary_city" className="text-sm font-medium">
                  Ville <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="primary_city"
                  placeholder="Dakar"
                  value={formData.primary_city}
                  onChange={handleInputChange}
                  className={`${formErrors.primary_city ? 'border-red-500' : ''} text-base`}
                  required
                  aria-invalid={!!formErrors.primary_city}
                  aria-describedby={formErrors.primary_city ? 'primary_city-error' : undefined}
                />
                {formErrors.primary_city && (
                  <p id="primary_city-error" className="text-sm text-red-500" role="alert">
                    {formErrors.primary_city}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary_region">Région</Label>
                <Input
                  id="primary_region"
                  value={formData.primary_region}
                  onChange={handleInputChange}
                  className={formErrors.primary_region ? 'border-red-500' : ''}
                  required
                />
                {formErrors.primary_region && (
                  <p className="text-sm text-red-500">{formErrors.primary_region}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Mot de passe <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 caractères"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`${formErrors.password ? 'border-red-500' : ''} text-base`}
                  required={!editingEntrepreneur}
                  aria-invalid={!!formErrors.password}
                  aria-describedby={formErrors.password ? 'password-error' : 'password-help'}
                />
                
                {formErrors.password && (
                  <p id="password-error" className="text-sm text-red-500" role="alert">
                    {formErrors.password}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password_confirm" className="text-sm font-medium">
                  Confirmer le mot de passe <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password_confirm"
                  type="password"
                  placeholder="Répétez le mot de passe"
                  value={formData.password_confirm}
                  onChange={handleInputChange}
                  className={`${formErrors.password_confirm ? 'border-red-500' : ''} text-base`}
                  required={!editingEntrepreneur}
                  aria-invalid={!!formErrors.password_confirm}
                  aria-describedby={formErrors.password_confirm ? 'password_confirm-error' : undefined}
                />
                {formErrors.password_confirm && (
                  <p id="password_confirm-error" className="text-sm text-red-500" role="alert">
                    {formErrors.password_confirm}
                  </p>
                )}
              </div>
                </div>
              </div>
              

              {/* Section Accompagnement */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Accompagnement</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date" className="text-sm font-medium">
                  Date de début <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className={`${formErrors.start_date ? 'border-red-500' : ''} text-base`}
                  required
                  aria-invalid={!!formErrors.start_date}
                  aria-describedby={formErrors.start_date ? 'start_date-error' : undefined}
                />
                {formErrors.start_date && (
                  <p id="start_date-error" className="text-sm text-red-500" role="alert">
                    {formErrors.start_date}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date" className="text-sm font-medium">
                  Date de fin prévue <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className={`${formErrors.end_date ? 'border-red-500' : ''} text-base`}
                  required
                  aria-invalid={!!formErrors.end_date}
                  aria-describedby={formErrors.end_date ? 'end_date-error' : undefined}
                />
                {formErrors.end_date && (
                  <p id="end_date-error" className="text-sm text-red-500" role="alert">
                    {formErrors.end_date}
                  </p>
                )}
              </div>
              <div className="space-y-2 col-span-1 sm:col-span-2">
                <Label htmlFor="objectives" className="text-sm font-medium">
                  Objectifs de l'accompagnement <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="objectives"
                  placeholder="Décrivez les objectifs de l'accompagnement..."
                  value={formData.objectives}
                  onChange={handleInputChange}
                  className={`${formErrors.objectives ? 'border-red-500' : ''} text-base min-h-[100px]`}
                  required
                  aria-invalid={!!formErrors.objectives}
                  aria-describedby={formErrors.objectives ? 'objectives-error' : undefined}
                />
                {formErrors.objectives && (
                  <p id="objectives-error" className="text-sm text-red-500" role="alert">
                    {formErrors.objectives}
                  </p>
                )}
              </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddDialog(false);
                  setFormErrors({});
                }}
                className="w-full sm:w-auto"
              >
                Annuler
              </Button>
              <Button
                className="bg-[#006666] hover:bg-[#004d4d] w-full sm:w-auto"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (editingEntrepreneur ? 'Mise à jour...' : 'Ajout en cours...') : (editingEntrepreneur ? 'Mettre à jour' : 'Ajouter')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#006666] rounded-lg flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Total assignés</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">{entrepreneurs.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600">En cours</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">
                {entrepreneurs.filter(e => e.status === 'En cours').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#FF9933] rounded-lg flex items-center justify-center shrink-0">
              <Building className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Nouveaux</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">
                {entrepreneurs.filter(e => e.status === 'Nouveau').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Terminés</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">
                {entrepreneurs.filter(e => e.status === 'Terminé').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un entrepreneur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-44">
                <div className="flex items-center">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="Nouveau">Nouveau</SelectItem>
                <SelectItem value="En cours">En cours</SelectItem>
                <SelectItem value="Terminé">Terminé</SelectItem>
                <SelectItem value="Suspendu">Suspendu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-gray-600 text-center md:text-right">
            {filteredEntrepreneurs.length} entrepreneur(s)
          </div>
        </div>
      </Card>

      {/* Liste des entrepreneurs */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[250px]">Entrepreneur</TableHead>
                <TableHead className="min-w-[180px]">Activité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="min-w-[140px]">Progrès</TableHead>
                <TableHead className="min-w-[140px]">Dernière session</TableHead>
                {/* <TableHead>CA</TableHead> */}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntrepreneurs.map((entrepreneur) => (
                <TableRow key={entrepreneur.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[#006666] rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {((entrepreneur.full_name || '') as string).split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{entrepreneur.full_name}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <MapPin className="w-3 h-3" />
                          <span>{entrepreneur.address}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getSectorIcon(entrepreneur.sector)}</span>
                      <div>
                        <p className="font-medium text-sm">{entrepreneur.business}</p>
                        <p className="text-xs text-gray-600">{entrepreneur.sector}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(entrepreneur.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#006666] h-2 rounded-full"
                          style={{ width: `${entrepreneur.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{entrepreneur.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {entrepreneur.lastSession || 'Aucune'}
                  </TableCell>
                  {/*   <TableCell className="font-medium text-[#006666]">
                    {formatRevenue(entrepreneur.total_revenue) || '0 FCFA'}
                  </TableCell> */}
                  {/* <TableCell className="font-medium text-[#006666]">
                      {totalRevenues}
                  </TableCell> */}
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" title="Voir profil" onClick={() => handleView(entrepreneur.id)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Planifier session" onClick={() => handleSchedule(entrepreneur)}>
                        <Calendar className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Appeler" onClick={() => handleCall(entrepreneur.raw?.phone || entrepreneur.phone)}>
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Message" onClick={() => handleMessage(entrepreneur.raw?.whatsapp || entrepreneur.whatsapp)}>
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Modifier" onClick={() => handleEdit(entrepreneur)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal Visualisation Profil */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Profil de l'entrepreneur</DialogTitle>
          </DialogHeader>
          {viewingEntrepreneur && (
            <EntrepreneurProfile user={viewingEntrepreneur} />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Planification Session */}
      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Planifier une nouvelle session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="session_type">Type de session</Label>
              <Select
                value={sessionFormData.session_type}
                onValueChange={(v) => setSessionFormData(p => ({ ...p, session_type: v }))}
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
            <div className="space-y-2">
              <Label htmlFor="scheduled_date">Date et heure</Label>
              <Input
                id="scheduled_date"
                type="datetime-local"
                value={sessionFormData.scheduled_date}
                onChange={(e) => setSessionFormData(p => ({ ...p, scheduled_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Durée (minutes)</Label>
              <Input
                id="duration_minutes"
                type="number"
                value={sessionFormData.duration_minutes}
                onChange={(e) => setSessionFormData(p => ({ ...p, duration_minutes: parseInt(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agenda">Ordre du jour</Label>
              <Textarea
                id="agenda"
                placeholder="Objectifs de la séance..."
                value={sessionFormData.agenda}
                onChange={(e) => setSessionFormData(p => ({ ...p, agenda: e.target.value }))}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowSessionDialog(false)}>
                Annuler
              </Button>
              <Button
                className="bg-[#006666] hover:bg-[#004d4d]"
                onClick={handleCreateSession}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Planification...' : 'Planifier'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}