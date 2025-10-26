// src/stores/settingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from '@/src/i18n';

type Language = 'es' | 'ca' | 'en';
type CurrencySymbol = '€' | '$' | '£';

interface SettingsState {
  // ⚙️ General
  language: Language;
  currencySymbol: CurrencySymbol;

  setLanguage: (lang: Language) => void;
  setCurrencySymbol: (symbol: CurrencySymbol) => void;

  // 🔔 Notificaciones
  notificationsEnabled: boolean;
  remindersEnabled: boolean;
  promotionsEnabled: boolean;

  // Estas reciben el valor booleano desde onValueChange
  toggleNotifications: (v: boolean) => void;
  toggleReminders: (v: boolean) => void;
  togglePromotions: (v: boolean) => void;
}

// idioma del sistema como default (si no hay persistido aún)
const systemLang =
  (Localization.getLocales?.()[0]?.languageCode as Language) ?? 'en';
// aplica idioma por defecto al cargar la app por primera vez
i18n.changeLanguage(systemLang);

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // valores por defecto (se sobrescriben al rehidratar si hay persistencia)
      language: systemLang,
      currencySymbol: '€',

      setLanguage: (lang) => {
        i18n.changeLanguage(lang);
        set({ language: lang });
      },
      setCurrencySymbol: (symbol) => set({ currencySymbol: symbol }),

      // notificaciones
      notificationsEnabled: true,
      remindersEnabled: true,
      promotionsEnabled: false,

      // IMPORTANTES: reciben el booleano del Switch
      toggleNotifications: (v: boolean) => set({ notificationsEnabled: v }),
      toggleReminders: (v: boolean) => set({ remindersEnabled: v }),
      togglePromotions: (v: boolean) => set({ promotionsEnabled: v }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Cuando rehidrata desde AsyncStorage, vuelve a aplicar el idioma guardado
      onRehydrateStorage: () => (state) => {
        if (state?.language) {
          i18n.changeLanguage(state.language);
        }
      },
    }
  )
);
