import { Button } from './ui/button';
import {
  ArrowLeft,
  Building2,
  Handshake,
  LineChart,
  Users,
} from 'lucide-react';

interface DemoPresentationProps {
  onClose: () => void;
}

export function DemoPresentation({ onClose }: DemoPresentationProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#006666] to-[#003333] flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur-sm sm:max-w-xl">
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-[#006666]">
          Présentation
        </p>
        <h1 className="mt-2 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
          AL-TOPPE
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Une plateforme pour structurer l’accompagnement des entrepreneurs au Sénégal.
        </p>

        <ul className="mt-8 space-y-4">
          <li className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50/80 p-4">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-[#006666]" aria-hidden />
            <div>
              <p className="font-medium text-gray-900">Pour qui ?</p>
              <p className="text-sm text-gray-600">
                Entrepreneurs, coachs, bailleurs et équipes admin — chacun accède à son espace
                adapté.
              </p>
            </div>
          </li>
          <li className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50/80 p-4">
            <Handshake className="mt-0.5 h-5 w-5 shrink-0 text-[#006666]" aria-hidden />
            <div>
              <p className="font-medium text-gray-900">Accompagnement</p>
              <p className="text-sm text-gray-600">
                Suivi des sessions, reporting et échanges pour faire progresser les projets.
              </p>
            </div>
          </li>
          <li className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50/80 p-4">
            <LineChart className="mt-0.5 h-5 w-5 shrink-0 text-[#006666]" aria-hidden />
            <div>
              <p className="font-medium text-gray-900">Pilotage</p>
              <p className="text-sm text-gray-600">
                Tableaux de bord et indicateurs pour voir l’activité et les résultats.
              </p>
            </div>
          </li>
          <li className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50/80 p-4">
            <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-[#006666]" aria-hidden />
            <div>
              <p className="font-medium text-gray-900">Projets & financements</p>
              <p className="text-sm text-gray-600">
                Plans d’affaires, programmes et candidatures — au même endroit.
              </p>
            </div>
          </li>
        </ul>

        <p className="mt-6 text-center text-xs text-gray-500">
          Connecte-toi pour accéder à ton espace réel. Cette page est une simple vue d’ensemble.
        </p>

        <Button
          type="button"
          variant="outline"
          className="mt-6 w-full border-[#006666]/40 text-[#006666] hover:bg-[#006666]/10"
          onClick={onClose}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à la connexion
        </Button>
      </div>
    </div>
  );
}
