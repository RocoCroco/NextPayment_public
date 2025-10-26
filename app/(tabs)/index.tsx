//app/(tabs)/index.tsx
import { View, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, StatusBar, SectionList, Image } from 'react-native';
import { AppText } from '@/src/components/StyledText';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import Colors from '@/src/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore } from '@/src/stores/subscriptionStore';
import { Subscription } from '@/src/types/subscription';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { formatWithSymbol } from '@/src/utils/formatMoney';
import { useTranslation } from 'react-i18next';
import i18n from '@/src/i18n';

type ViewMode = 'date' | 'category';

export default function Home() {
  const [mode, setMode] = useState<ViewMode>('date');
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();

  const currencySymbol = useSettingsStore(s => s.currencySymbol);
  
  // ✨ CAMBIO 1: Usar el store en lugar de mocks
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);
  const getTotalMonthlyAmount = useSubscriptionStore((state) => state.getTotalMonthlyAmount);
  const getTotalYearlyAmount = useSubscriptionStore((state) => state.getTotalYearlyAmount);
  const getSubscriptionsSortedByNextPayment = useSubscriptionStore((state) => state.getSubscriptionsSortedByNextPayment);
  
  const isDate = mode === 'date';
  const isCategory = mode === 'category';

  // ✨ CAMBIO 2: Usar cálculos del store
  const monthlyTotal = getTotalMonthlyAmount();
  const yearlyTotal = getTotalYearlyAmount();

  // Helpers actualizados para usar nextPaymentDate
  const today = new Date();
  const daysBetween = (targetDate: Date) => {
     // Fecha de pago y fecha de hoy sin horas
    const target = new Date(targetDate);
    target.setHours(0,0,0,0);
    const todayZero = new Date();
    todayZero.setHours(0,0,0,0);

    const diffMs = target.getTime() - todayZero.getTime();
    // Redondear hacia arriba para futuros y hacia abajo (abs) para pasados
    return diffMs >= 0
      ? Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      : -Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
  };

  const getDaysText = (days: number) => {
    if (days === 0) return t('relative.today');
    if (days === 1) return t('relative.tomorrow');
    return t('relative.in_days_other', { count: days });
  };

  const getDaysColor = (days: number) => {
    if (days < 0) return '#dc3545';
    if (days <= 3) return '#FF6B6B';
    return '#28a745';
  };

  const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString(i18n.language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // ✨ CAMBIO 3: Usar el método del store para ordenar por fecha
  const subsSortedByDate = getSubscriptionsSortedByNextPayment();

  // ✨ CAMBIO 4: Actualizar agrupación por categoría
  const sectionsByCategory = useMemo(() => {
    const map: Record<string, Subscription[]> = {};
    subscriptions.forEach((s) => {
      const key = s.category || 'Sin categoría';
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });

    // Ordenar cada sección por fecha de próximo pago
    Object.keys(map).forEach((k) =>
      map[k].sort(
        (a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime()
      )
    );

    return Object.keys(map)
      .sort((a, b) => a.localeCompare(b))
      .map((title) => ({ title, data: map[title] }));
  }, [subscriptions]);

  // ✨ CAMBIO 5: Actualizar render para usar nextPaymentDate
  function getNextPaymentDate(sub: Subscription): Date {
    const now = new Date();
    let d = new Date(sub.nextPaymentDate); 
    // Si prefieres partir de startDate, haz: new Date(sub.startDate)
    while (d < now) {
      switch (sub.frequency) {
        case 'mensual':
          d.setMonth(d.getMonth() + 1);
          break;
        case 'anual':
          d.setFullYear(d.getFullYear() + 1);
          break;
        case 'semanal':
          d.setDate(d.getDate() + 7);
          break;
        case 'diario':
          d.setDate(d.getDate() + 1);
          break;
      }
    }
    return d;
  }
  
  const renderSubscription = (subscription: Subscription) => {
    const nextDate = getNextPaymentDate(subscription);
    const daysUntilPayment = daysBetween(nextDate);
    
    return (
      <TouchableOpacity
        key={subscription.id}
        style={[styles.subscriptionCard, { backgroundColor: theme.card }]}
        onPress={() => router.push(`/payment/detail/${subscription.id}`)}
      >
        <View style={styles.subscriptionContent}>
          <View style={styles.subscriptionLeft}>
            <View 
              style={[
                styles.subscriptionIcon, 
                { backgroundColor: theme.background || theme.background }
              ]}
            >
              <AppText weight="bold" size={16} style={{ color: subscription.color }}>
                {subscription.name.charAt(0).toUpperCase()}
              </AppText>
            </View>

            <View style={styles.subscriptionInfo}>
              <AppText weight="semibold" size={16}>
                {subscription.name}
              </AppText>
              <AppText weight="regular" size={14} style={{ color: theme.tabIconDefault }}>
                {formatDate(subscription.nextPaymentDate)}
              </AppText>
            </View>
          </View>

          <View style={styles.subscriptionRight}>
            <AppText weight="bold" size={18}>
              {/*{subscription.price.toFixed(2).replace('.', ',')}{currencySymbol}*/}
              {formatWithSymbol(subscription.price, currencySymbol)}
            </AppText>
            <AppText
              weight="medium"
              size={12}
              style={{ color: getDaysColor(daysUntilPayment), textAlign: 'right' }}
            >
              {getDaysText(daysUntilPayment)}
            </AppText>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ✨ CAMBIO 6: Mostrar mensaje cuando no hay suscripciones
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="card-outline" size={64} color={theme.tabIconDefault} style={styles.emptyIcon} />
      <AppText weight="semibold" size={20} style={styles.emptyTitle}>
        {t('no_payments')}
      </AppText>
      <AppText weight="regular" size={16} style={[styles.emptySubtitle, { color: theme.tabIconDefault }]}>
        {t('add_first_payment')}
      </AppText>
      <TouchableOpacity
        style={[styles.emptyAddButton, { backgroundColor: theme.tint }]}
        onPress={() => router.push('/payment/add')}
      >
        <AppText weight="semibold" size={16} style={{ color: theme.background }}>
          {t('add_payment')}
        </AppText>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <View style={styles.placeholder} />
          
          <Image 
            source={
              colorScheme === 'dark' 
                ? require('../../assets/images/logo-dark.png')
                : require('../../assets/images/logo-light.png')
            }
            style={styles.logo}
            resizeMode="contain"
          />
          
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Summary card */}
        <View style={styles.summaryCardContainer}>
          <View style={styles.cardShadow}>
            <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
              <View style={styles.summaryContent}>
                <View style={styles.summaryLeft}>
                  <AppText weight="medium" size={16} style={{ color: theme.tabIconDefault }}>
                    {t('monthly_spend')}
                  </AppText>
                  <View style={styles.totalAmount}>
                    <AppText weight="medium" size={40}>
                      {monthlyTotal.toFixed(2).replace('.', ',')}{currencySymbol}
                    </AppText>
                  </View>
                  <AppText weight="medium" size={16} style={{ color: theme.tabIconDefault }}>
                    {yearlyTotal.toFixed(2).replace('.', ',')}{currencySymbol}{t('per_year')}
                  </AppText>
                </View>

                <View style={styles.summaryRight}>
                  {/* 
                  <TouchableOpacity 
                    style={styles.downloadButton}
                    onPress={() => {
                      // TODO: Implementar exportación de datos
                      console.log('Exportar datos...');
                    }}
                  >
                    <Ionicons name="download-outline" size={20} color={theme.tabIconDefault} />
                  </TouchableOpacity>
                  */}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ✨ CAMBIO 7: Solo mostrar controles si hay suscripciones */}
        {subscriptions.length > 0 && (
          <View style={styles.controls}>
            <View style={styles.filterTabs}>
              <TouchableOpacity
                onPress={() => setMode('date')}
                style={[
                  styles.filterTab,
                  { 
                    borderBottomWidth: 2,
                    borderBottomColor: isDate ? theme.text : 'transparent'
                  }
                ]}
              >
                <AppText
                  weight={isDate ? 'semibold' : 'medium'}
                  size={16}
                  style={{ color: isDate ? theme.text : theme.tabIconDefault }}
                >
                  {t('date')}
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMode('category')}
                style={[
                  styles.filterTab,
                  { 
                    borderBottomWidth: 2,
                    borderBottomColor: isCategory ? theme.text : 'transparent'
                  }
                ]}
              >
                <AppText
                  weight={isCategory ? 'semibold' : 'medium'}
                  size={16}
                  style={{ color: isCategory ? theme.text : theme.tabIconDefault }}
                >
                  {t('category')}
                </AppText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: 'transparent' }]}
              onPress={() => router.push('/payment/add')}
            >
              <AppText weight="medium" size={16} style={{ color: theme.text }}>
                + {t('add')}
              </AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* ✨ CAMBIO 8: Lista según modo o estado vacío */}
         <View style={styles.listContainer}>
      {subscriptions.length === 0 ? (
        renderEmptyState()
      ) : mode === 'date' ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {subsSortedByDate.map(renderSubscription)}
        </ScrollView>
      ) : (
        <SectionList
          sections={sectionsByCategory}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <AppText weight="semibold" size={18} style={{ marginTop: 16, marginBottom: 8, color: theme.text }}>
              {t('category.' + section.title)}
            </AppText>
          )}
          renderItem={({ item }) => renderSubscription(item)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>

        <View style={styles.bottomSpacing} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Esto distribuye: placeholder - logo - settings
  },
  settingsButton: { padding: 8 },
    placeholder: {
    width: 40, // Mismo ancho que settingsButton para centrar
  },
  logo: {
    height: 40,
    width: 120, // Ajusta según tu logo
  },
  summaryCardContainer: { paddingHorizontal: 20, marginBottom: 24 },
  cardShadow: {
    borderRadius: 16,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 6,
  },
  summaryCard: { borderRadius: 16, overflow: 'hidden' },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    paddingHorizontal: 15,
  },
  summaryLeft: { flex: 1 },
  summaryRight: { justifyContent: 'flex-end' },
  downloadButton: { paddingRight: 5, borderRadius: 8, marginLeft: 16 },
  totalAmount: { flexDirection: 'row', alignItems: 'baseline', marginVertical: 2 },

  controls: {
    paddingHorizontal: 25,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterTabs: { flexDirection: 'row', flex: 1 },
  filterTab: { marginRight: 24, paddingBottom: 4 },
  addButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
listContainer: {
    flex: 1,
  },

  subscriptionsList: { paddingHorizontal: 20 },
  subscriptionCard: {
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  subscriptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  subscriptionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  subscriptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subscriptionInfo: { flex: 1 },
  subscriptionRight: { alignItems: 'flex-end' },

  // ✨ CAMBIO 9: Estilos para estado vacío
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 20,
    opacity: 0.6,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyAddButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },

  bottomSpacing: { height: 60 },
});