export type SupportedLang = "fr" | "wo" | "pu";

const STORAGE_KEY = "altoppe_lang";

const fallbackLang: SupportedLang = "fr";

const messages: Record<SupportedLang, Record<string, string>> = {
  fr: {
    "role.entrepreneur": "Entrepreneur",
    "role.coach": "Coach",
    "role.admin": "Administrateur",
    "role.bailleur": "Bailleur",
    "menu.dashboard": "Tableau de bord",
    "menu.activities": "Mes Activités",
    "menu.finances": "Mes Finances",
    "menu.sessions": "Sessions de coaching",
    "menu.entrepreneurs": "Entrepreneurs",
    "menu.businessPlans": "Plans d'affaires",
    "menu.reports": "Rapports",
    "menu.users": "Utilisateurs",
    "menu.analytics": "Analytics",
    "menu.settings": "Paramètres",
    "menu.programs": "Programmes",
    "menu.applications": "Candidatures",
    "menu.portfolio": "Portfolio",
    "action.logout": "Se déconnecter",
    "action.markAllRead": "Tout marquer comme lu",
    "label.notifications": "Notifications",
    "label.enterpriseMgmt": "Gestion d'entreprise",
  },
  wo: {
    "role.entrepreneur": "Jëfandikukat",
    "role.coach": "Kooch",
    "role.admin": "Yore-kat",
    "role.bailleur": "Mbooloo walla jawriñu xaalis",
    "menu.dashboard": "Tablo njariñ",
    "menu.activities": "Sama liggéey yi",
    "menu.finances": "Sama xaalis",
    "menu.sessions": "Jëfandikoo kooch",
    "menu.entrepreneurs": "Jëfandikukat yi",
    "menu.businessPlans": "Pàttali jëfandikoo",
    "menu.reports": "Rapoor yi",
    "menu.users": "Jëfandikookat yi",
    "menu.analytics": "Seetaan",
    "menu.settings": "Parameetar yi",
    "menu.programs": "Program yi",
    "menu.applications": "Dencukaay yi",
    "menu.portfolio": "Portfolio",
    "action.logout": "Génn",
    "action.markAllRead": "Lépp jàng",
    "label.notifications": "Yëgle yi",
    "label.enterpriseMgmt": "Saytu liggéey",
  },
  pu: {
    "role.entrepreneur": "Jeyndoojo",
    "role.coach": "Koc",
    "role.admin": "Toppiɗo",
    "role.bailleur": "Wallitoowo xaalis",
    "menu.dashboard": "Taabal ngol",
    "menu.activities": "Ko mi waɗi",
    "menu.finances": "Xaalis am",
    "menu.sessions": "Jokkondiral koc",
    "menu.entrepreneurs": "Jeyndooɓe",
    "menu.businessPlans": "Plani jeeynde",
    "menu.reports": "Rapooroji",
    "menu.users": "Jeyndooɓe ngam app",
    "menu.analytics": "Limtol",
    "menu.settings": "Teelte",
    "menu.programs": "Programmiiji",
    "menu.applications": "Denkol",
    "menu.portfolio": "Portfolio",
    "action.logout": "Yaltu",
    "action.markAllRead": "Janga fof",
    "label.notifications": "Yettoore",
    "label.enterpriseMgmt": "Topondiral jeeynde",
  },
};

function normalizeLang(raw: string | null | undefined): SupportedLang {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "wo") return "wo";
  if (v === "pu") return "pu";
  return fallbackLang;
}

export function getCurrentLang(defaultLang?: string): SupportedLang {
  const fromStorage =
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  return normalizeLang(fromStorage || defaultLang || fallbackLang);
}

export function setCurrentLang(lang: SupportedLang): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, normalizeLang(lang));
}

export function t(key: string, lang?: string): string {
  const active = getCurrentLang(lang);
  return messages[active][key] || messages.fr[key] || key;
}
