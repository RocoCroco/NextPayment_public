import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Carga los recursos (abajo te dejo los JSON)
import es from './locales/es.json';
import ca from './locales/ca.json';
import en from './locales/en.json';

// idioma por defecto desde el sistema (es-ES -> "es")
const system = Localization.getLocales?.()[0]?.languageCode ?? 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es }, ca: { translation: ca }, en: { translation: en } },
    lng: system,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export default i18n;