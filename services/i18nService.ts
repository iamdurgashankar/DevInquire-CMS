import { Section } from '../types';

export interface SupportedLocale {
  code: string;
  name: string;
  nativeName: string;
  countries: string[];
  enabled: boolean;
  rtl?: boolean;
}

export interface I18nConfig {
  multiLanguageEnabled: boolean;
  autoDetectByLocation: boolean;
  defaultLocale: string;
  supportedLocales: SupportedLocale[];
  updatedAt?: string;
}

export const DEFAULT_SUPPORTED_LOCALES: SupportedLocale[] = [
  { code: 'en', name: 'English', nativeName: 'English', countries: ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'SG'], enabled: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', countries: ['IN'], enabled: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', countries: ['ES', 'MX', 'AR', 'CO', 'CL', 'PE'], enabled: true },
  { code: 'fr', name: 'French', nativeName: 'Français', countries: ['FR', 'BE', 'CA-QC', 'CH'], enabled: true },
  { code: 'de', name: 'German', nativeName: 'Deutsch', countries: ['DE', 'AT', 'CH'], enabled: true },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', countries: ['JP'], enabled: true },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', countries: ['SA', 'AE', 'EG', 'QA', 'KW'], enabled: true, rtl: true },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', countries: ['BR', 'PT'], enabled: true },
];

export const DEFAULT_I18N_CONFIG: I18nConfig = {
  multiLanguageEnabled: false,
  autoDetectByLocation: true,
  defaultLocale: 'en',
  supportedLocales: DEFAULT_SUPPORTED_LOCALES,
};

const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Vienna': 'AT',
  'Europe/Madrid': 'ES',
  'America/Mexico_City': 'MX',
  'America/Argentina/Buenos_Aires': 'AR',
  'Asia/Tokyo': 'JP',
  'Asia/Riyadh': 'SA',
  'Asia/Dubai': 'AE',
  'Africa/Cairo': 'EG',
  'America/Sao_Paulo': 'BR',
  'Europe/Lisbon': 'PT',
  'America/New_York': 'US',
  'America/Los_Angeles': 'US',
  'America/Chicago': 'US',
  'Europe/London': 'GB',
  'Australia/Sydney': 'AU',
};

const I18N_STORAGE_KEY = 'devinquire_i18n_config';
const JAVA_API_BASE = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/+$/, '');

export function saveLocalI18nConfig(config: I18nConfig) {
  try {
    localStorage.setItem(I18N_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

export function loadLocalI18nConfig(): I18nConfig {
  try {
    const raw = localStorage.getItem(I18N_STORAGE_KEY);
    if (raw) return { ...DEFAULT_I18N_CONFIG, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_I18N_CONFIG;
}

export async function fetchI18nConfig(): Promise<I18nConfig> {
  if (JAVA_API_BASE) {
    try {
      const res = await fetch(`${JAVA_API_BASE}/api/v1/console/i18n`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          saveLocalI18nConfig(json.data);
          return json.data;
        }
      }
    } catch {
      // fallback to localStorage
    }
  }
  return loadLocalI18nConfig();
}

export function resolveCountryFromTimezone(tz?: string): string | null {
  if (!tz) return null;
  if (TIMEZONE_TO_COUNTRY[tz]) return TIMEZONE_TO_COUNTRY[tz];
  if (tz.startsWith('Asia/Kolkata') || tz.startsWith('Asia/Calcutta')) return 'IN';
  if (tz.startsWith('Europe/Paris')) return 'FR';
  if (tz.startsWith('Europe/Berlin')) return 'DE';
  if (tz.startsWith('Europe/Madrid')) return 'ES';
  if (tz.startsWith('Asia/Tokyo')) return 'JP';
  if (tz.startsWith('America/Sao_Paulo')) return 'BR';
  return null;
}

export async function detectVisitorLocationAndLocale(
  config: I18nConfig,
  overrideCountry?: string
): Promise<{ locale: string; country: string; reason: string }> {
  const enabledLocales = config.supportedLocales.filter((l) => l.enabled);
  const enabledCodes = new Set(enabledLocales.map((l) => l.code));
  const fallback = enabledCodes.has(config.defaultLocale) ? config.defaultLocale : 'en';

  if (!config.multiLanguageEnabled) {
    return { locale: fallback, country: 'DEFAULT', reason: 'Multi-language disabled in Console' };
  }

  // 1. Explicit ?lang= query param
  if (typeof window !== 'undefined' && !overrideCountry) {
    const params = new URLSearchParams(window.location.search);
    const qLang = params.get('lang')?.toLowerCase();
    if (qLang && enabledCodes.has(qLang)) {
      return { locale: qLang, country: params.get('country') || 'URL', reason: `Query parameter ?lang=${qLang}` };
    }
  }

  if (!config.autoDetectByLocation && !overrideCountry) {
    return { locale: fallback, country: 'DEFAULT', reason: 'Location auto-detection disabled' };
  }

  // 2. Server geo-header / IP detection endpoint
  let country = overrideCountry?.toUpperCase() || '';
  if (!country) {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(`/cms/api/i18n/detect${tz ? `?timezone=${encodeURIComponent(tz)}` : ''}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.country) country = String(json.country).toUpperCase();
      }
    } catch {
      // ignore
    }
  }

  // 3. Fallback to browser IANA timezone -> country
  if (!country && typeof Intl !== 'undefined') {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    country = resolveCountryFromTimezone(tz) || '';
  }

  if (country) {
    const matchedByCountry = enabledLocales.find((l) => l.countries.includes(country));
    if (matchedByCountry) {
      return {
        locale: matchedByCountry.code,
        country,
        reason: `Location (${country}) matched ${matchedByCountry.name}`,
      };
    }
  }

  // 4. Fallback to navigator.language
  if (typeof navigator !== 'undefined' && navigator.language) {
    const navCode = navigator.language.split('-')[0].toLowerCase();
    if (enabledCodes.has(navCode)) {
      return { locale: navCode, country: country || 'BROWSER', reason: `Browser language (${navigator.language})` };
    }
  }

  return { locale: fallback, country: country || 'DEFAULT', reason: 'Default fallback locale' };
}

const PHRASE_DICTIONARY: Record<string, Record<string, string>> = {
  hi: {
    'Page Not Found': 'पृष्ठ नहीं मिला',
    'Back to Studio Dashboard': 'स्टूडियो डैशबोर्ड पर वापस जाएं',
    'Get Started': 'शुरू करें',
    'Learn More': 'और जानें',
    'Contact Us': 'संपर्क करें',
    'Sign In': 'साइन इन करें',
    'Home': 'होम',
    'Features': 'विशेषताएं',
    'Pricing': 'मूल्य निर्धारण',
    'About': 'हमारे बारे में',
    'Subscribe': 'सदस्यता लें',
    'Auto-detected': 'स्थान द्वारा स्वतः चयनित',
  },
  es: {
    'Page Not Found': 'Página no encontrada',
    'Back to Studio Dashboard': 'Volver al panel',
    'Get Started': 'Comenzar',
    'Learn More': 'Saber más',
    'Contact Us': 'Contáctanos',
    'Sign In': 'Iniciar sesión',
    'Home': 'Inicio',
    'Features': 'Características',
    'Pricing': 'Precios',
    'About': 'Acerca de',
    'Subscribe': 'Suscribirse',
    'Auto-detected': 'Detectado por ubicación',
  },
  fr: {
    'Page Not Found': 'Page introuvable',
    'Back to Studio Dashboard': 'Retour au tableau de bord',
    'Get Started': 'Commencer',
    'Learn More': 'En savoir plus',
    'Contact Us': 'Contactez-nous',
    'Sign In': 'Se connecter',
    'Home': 'Accueil',
    'Features': 'Fonctionnalités',
    'Pricing': 'Tarifs',
    'About': 'À propos',
    'Subscribe': "S'abonner",
    'Auto-detected': 'Détecté par localisation',
  },
  de: {
    'Page Not Found': 'Seite nicht gefunden',
    'Back to Studio Dashboard': 'Zurück zum Dashboard',
    'Get Started': 'Loslegen',
    'Learn More': 'Mehr erfahren',
    'Contact Us': 'Kontakt',
    'Sign In': 'Anmelden',
    'Home': 'Startseite',
    'Features': 'Funktionen',
    'Pricing': 'Preise',
    'About': 'Über uns',
    'Subscribe': 'Abonnieren',
    'Auto-detected': 'Automatisch erkannt',
  },
  ja: {
    'Page Not Found': 'ページが見つかりません',
    'Back to Studio Dashboard': 'ダッシュボードに戻る',
    'Get Started': '始める',
    'Learn More': '詳しく見る',
    'Contact Us': 'お問い合わせ',
    'Sign In': 'ログイン',
    'Home': 'ホーム',
    'Features': '機能',
    'Pricing': '料金',
    'About': '概要',
    'Subscribe': '購読する',
    'Auto-detected': '位置情報から自動検出',
  },
  ar: {
    'Page Not Found': 'الصفحة غير موجودة',
    'Back to Studio Dashboard': 'العودة إلى لوحة التحكم',
    'Get Started': 'ابدأ الآن',
    'Learn More': 'اعرف المزيد',
    'Contact Us': 'اتصل بنا',
    'Sign In': 'تسجيل الدخول',
    'Home': 'الرئيسية',
    'Features': 'المميزات',
    'Pricing': 'الأسعار',
    'About': 'من نحن',
    'Subscribe': 'اشترك',
    'Auto-detected': 'تم الكشف تلقائياً حسب الموقع',
  },
  pt: {
    'Page Not Found': 'Página não encontrada',
    'Back to Studio Dashboard': 'Voltar ao painel',
    'Get Started': 'Começar',
    'Learn More': 'Saiba mais',
    'Contact Us': 'Fale conosco',
    'Sign In': 'Entrar',
    'Home': 'Início',
    'Features': 'Recursos',
    'Pricing': 'Preços',
    'About': 'Sobre',
    'Subscribe': 'Inscrever-se',
    'Auto-detected': 'Detectado por localização',
  },
};

export function translatePhrase(text: string, locale: string): string {
  if (!text || locale === 'en') return text;
  const dict = PHRASE_DICTIONARY[locale];
  if (!dict) return text;
  if (dict[text]) return dict[text];
  let result = text;
  for (const [enKey, translated] of Object.entries(dict)) {
    if (result.includes(enKey)) {
      result = result.split(enKey).join(translated);
    }
  }
  return result;
}

export function localizeSections(sections: Section[], locale: string): Section[] {
  if (!locale || locale === 'en') return sections;
  return sections.map((section) => ({
    ...section,
    columns: section.columns.map((col) => ({
      ...col,
      blocks: col.blocks.map((block) => {
        const nextContent = typeof block.content === 'string'
          ? translatePhrase(block.content, locale)
          : block.content && typeof block.content === 'object'
          ? Object.fromEntries(
              Object.entries(block.content).map(([k, v]) => [
                k,
                typeof v === 'string' ? translatePhrase(v, locale) : v,
              ])
            )
          : block.content;
        return { ...block, content: nextContent };
      }),
    })),
  }));
}
