import { View, StyleSheet, Switch, TouchableOpacity, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/StyledText';
import { useState } from 'react';
import Colors from '@/src/constants/Colors';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { useTranslation } from 'react-i18next';

export default function Notifications() {
  const { notificationsEnabled, remindersEnabled, promotionsEnabled,
          toggleNotifications, toggleReminders, togglePromotions } = useSettingsStore();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: theme.background}]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <AppText weight="bold" size={24} style={styles.title}>
          {t('notifications')}
        </AppText>
      </View>
      
      
      {/* Global */}
      <View style={styles.settingItem}>
        <AppText weight="medium" size={16}>{t('notifications.global')}</AppText>
        <Switch
          value={notificationsEnabled}
          onValueChange={toggleNotifications}
          trackColor={{ true: theme.tint + '40', false: theme.tabIconDefault + '40' }}
          thumbColor={notificationsEnabled ? theme.tint : theme.tabIconDefault}
        />
      </View>

      {/* Pago */}
      {notificationsEnabled && (
        <View style={styles.settingItem}>
          <AppText weight="medium" size={16}>{t('notifications.payments')}</AppText>
          <Switch
            value={remindersEnabled}
            onValueChange={toggleReminders}
            trackColor={{ true: theme.tint + '40', false: theme.tabIconDefault + '40' }}
            thumbColor={remindersEnabled ? theme.tint : theme.tabIconDefault}
          />
        </View>
      )}

      {/* Promocionales */}
      {notificationsEnabled && (
        <View style={styles.settingItem}>
          <AppText weight="medium" size={16}>{t('notifications.promotions')}</AppText>
          <Switch
            value={promotionsEnabled}
            onValueChange={togglePromotions}
            trackColor={{ true: theme.tint + '40', false: theme.tabIconDefault + '40' }}
            thumbColor={promotionsEnabled ? theme.tint : theme.tabIconDefault}
          />
        </View>
      )}
    </View>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    marginLeft: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});