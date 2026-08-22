import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { UI } from './dict';

const resources: Record<string, { translation: Record<string, string> }> = Object.fromEntries(
  Object.entries(UI).map(([lang, strings]) => [
    lang,
    { translation: strings },
  ]),
);

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('lasotuvi-lang') || 'vn',
  fallbackLng: 'vn',
  interpolation: { escapeValue: false },
});

export default i18n;