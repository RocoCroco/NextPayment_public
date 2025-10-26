// app/settings/general.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { AppText } from '@/src/components/StyledText';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/src/constants/Colors';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { useTranslation } from 'react-i18next';

const LANG_OPTIONS = [
  { label: 'Español', value: 'es' as const },
  { label: 'Català', value: 'ca' as const },
  { label: 'English', value: 'en' as const },
];

const CURRENCY_OPTIONS = ['€', '$', '£'] as const;

export default function GeneralSettings() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();

  const { language, currencySymbol, setLanguage, setCurrencySymbol } = useSettingsStore();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <AppText style={styles.title} weight="bold" size={24}>General</AppText>
        <View style={{ width: 24 }} />
      </View>

      {/* Idioma */}
      <View style={[styles.section]}>
        <AppText weight="semibold" size={16} style={{ marginBottom: 8 }}>{t('language')}</AppText>
        <View style={styles.rowWrap}>
          {LANG_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setLanguage(opt.value)}
              style={[
                styles.chip,
                { borderColor: theme.tabIconDefault + '40', backgroundColor: language === opt.value ? theme.tint : 'transparent' }
              ]}
            >
              <AppText weight="medium" size={14} style={{ color: language === opt.value ? theme.background : theme.text }}>
                {opt.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Moneda */}
      <View style={[styles.section]}>
        <AppText weight="semibold" size={16} style={{ marginBottom: 8 }}>{t('currency')}</AppText>
        <View style={styles.rowWrap}>
          {CURRENCY_OPTIONS.map(sym => (
            <TouchableOpacity
              key={sym}
              onPress={() => setCurrencySymbol(sym)}
              style={[
                styles.chip,
                { borderColor: theme.tabIconDefault + '40', backgroundColor: currencySymbol === sym ? theme.tint : 'transparent' }
              ]}
            >
              <AppText weight="medium" size={14} style={{ color: currencySymbol === sym ? theme.background : theme.text }}>
                {sym}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
        <AppText size={12} style={{ color: theme.tabIconDefault, marginTop: 6 }}>
          {t('currency_info')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    marginBottom: 20,
  },
  title: {
    marginLeft: 12,
  },
  backButton: { padding: 8 },
  section: { marginTop: 12, marginBottom: 20 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 16, borderWidth: 1,
  },
});
