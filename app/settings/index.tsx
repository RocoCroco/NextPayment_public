import { View, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { AppText } from '@/src/components/StyledText';
import { router } from 'expo-router';
import Colors from '@/src/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <AppText weight="bold" size={24} style={styles.title}>
          {t('settings')}
        </AppText>
      </View>
      
      
      <View style={styles.menuContainer}>
        <TouchableOpacity 
          style={[styles.menuItem, {backgroundColor: theme.card}]}
          onPress={() => router.push('/settings/general')}
        >
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Ionicons name="settings-outline" size={20} color={theme.text} />
            <AppText style={{marginLeft: 10}} weight="medium" size={16}>{t('general')}</AppText>
          </View>
  
          <AppText size={24}>›</AppText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuItem, {backgroundColor: theme.card}]}
          onPress={() => router.push('/settings/notifications')}
        >
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Ionicons name="notifications-outline" size={20} color={theme.text} />
            <AppText style={{marginLeft: 10}} weight="medium" size={16}>{t('notifications')}</AppText>
          </View>
          
          <AppText size={24}>›</AppText>
        </TouchableOpacity>
      </View>
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
  title: {
    marginLeft: 12,
  },
  backButton: {
    padding: 8,
  },
  menuContainer: {
    gap: 2,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
});