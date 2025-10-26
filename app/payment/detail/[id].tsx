// app/payment/detail/[id].tsx
import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  useColorScheme,
  Alert,
  Modal,
  StatusBar
} from 'react-native';
import { AppText } from '@/src/components/StyledText';
import { router, useLocalSearchParams } from 'expo-router';
import Colors from '@/src/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore } from '@/src/stores/subscriptionStore';
import { calculateMonthlyAmount, calculateYearlyAmount, calculateNextPaymentDate, Subscription } from '@/src/types/subscription';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { useTranslation } from 'react-i18next';
import i18n from '@/src/i18n';

export default function SubscriptionDetail() {
  const {t} = useTranslation();
  const { id } = useLocalSearchParams();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const currencySymbol = useSettingsStore(s => s.currencySymbol);
  
  const getSubscriptionById = useSubscriptionStore((state) => state.getSubscriptionById);
  const deleteSubscription = useSubscriptionStore((state) => state.deleteSubscription);
  
  const subscription = getSubscriptionById(id as string);

  if (!subscription) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.tabIconDefault} />
          <AppText weight="bold" size={20} style={styles.errorTitle}>
            {t('not_found')}
          </AppText>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.tint }]}
            onPress={() => router.back()}
          >
            <AppText weight="semibold" size={16} style={{ color: '#fff' }}>
              {t('back')}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Cálculos
  const monthlyAmount = calculateMonthlyAmount(subscription.price, subscription.frequency);
  const yearlyAmount = calculateYearlyAmount(subscription.price, subscription.frequency);
  
  // Días hasta próximo pago
  const daysBetween = (dateString: string) => {
     // Fecha de pago y fecha de hoy sin horas
    const target = new Date(dateString);
    target.setHours(0,0,0,0);
    const todayZero = new Date();
    todayZero.setHours(0,0,0,0);

    const diffMs = target.getTime() - todayZero.getTime();
    // Redondear hacia arriba para futuros y hacia abajo (abs) para pasados
    return diffMs >= 0
      ? Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      : -Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
  };
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
          case 'custom':
            d.setDate(d.getDate() + (sub as any).customIntervalDays || 1);
            break;
        }
      }
      return d;
    }
  const nextDate = getNextPaymentDate(subscription);
    const daysUntil = daysBetween(nextDate.toISOString());

  const getDaysText = () => {
    if (daysUntil === 0) return t('relative.today');
    if (daysUntil === 1) return t('relative.tomorrow');
    return t('relative.in_days_other', { count: daysUntil });
  };

  const getDaysColor = () => {
    if (daysUntil < 0) return '#dc3545';
    if (daysUntil <= 3) return '#FF6B6B';
    return '#28a745';
  };

  // Formatear fechas
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  // Tiempo usando la suscripción
  const getSubscriptionAge = () => {
    const startDate = new Date(subscription.startDate);
    const today = new Date();
    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return t('subscription_age.days_other', { count: diffDays });
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return t(`subscription_age.months_${months === 1 ? 'one' : 'other'}`, { count: months });
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      const months = remainingMonths; 
      if (remainingMonths > 0) {
        return t('subscription_age.years_and_months', {
          years,
          yearsText: t(`subscription_age.years_${years === 1 ? 'one' : 'other'}`, { count: years }),
          months,
          monthsText: t(`subscription_age.months_${remainingMonths === 1 ? 'one' : 'other'}`, { count: remainingMonths })
        });
      }
      return t(`subscription_age.years_${years === 1 ? 'one' : 'other'}`, { count: years });
    }
  };

  function countChargesSinceStart(sub: Subscription): number {
    const start = new Date(sub.startDate);
    const now = new Date();
    if (isNaN(start.getTime()) || start > now) return 0;

    const cursor = new Date(start);
    let count = 0;

    while (cursor <= now) {
      count += 1;
      switch (sub.frequency) {
        case 'diario':
          cursor.setDate(cursor.getDate() + 1);
          break;
        case 'semanal':
          cursor.setDate(cursor.getDate() + 7);
          break;
        case 'mensual':
          cursor.setMonth(cursor.getMonth() + 1);
          break;
        case 'anual':
          cursor.setFullYear(cursor.getFullYear() + 1);
          break;
        case 'custom': {
          const n = sub.customIntervalDays ?? 0; // si falta, evita loop infinito
          cursor.setDate(cursor.getDate() + Math.max(1, n));
          break;
        }
      }
    }
    return count;
  }

  function calcTotalAccumulated(sub: Subscription): number {
    const charges = countChargesSinceStart(sub);
    // precio por ciclo = sub.price (no uses monthly/yearly normalizados)
    return charges * sub.price;
  }

  const chargesCount = countChargesSinceStart(subscription);
  const totalAccumulated = calcTotalAccumulated(subscription);

  const handleDelete = () => {
    deleteSubscription(subscription.id);
    setShowDeleteModal(false);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <AppText weight="bold" size={20}>{t('details')}</AppText>
        
        <TouchableOpacity 
          onPress={() => router.push(`/payment/edit/${subscription.id}`)}
          style={styles.headerButton}
        >
          <Ionicons name="pencil" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Tarjeta principal */}
        <View style={styles.mainCardContainer}>
          <View style={[styles.mainCard, { backgroundColor: theme.card }]}>
            {/* Icono y nombre */}
            <View style={styles.serviceHeader}>
              
              
              <View style={styles.serviceInfo}>
                <AppText weight="bold" size={28}>
                  {subscription.name}
                </AppText>
                <AppText weight="medium" size={16} style={{ color: theme.tabIconDefault }}>
                  {t('category.' + subscription.category)}
                </AppText>
              </View>
            </View>

            {/* Precio principal */}
            <View style={styles.priceSection}>
              <AppText  size={36} style={{ color: theme.tint }}>
                {subscription.price.toFixed(2).replace('.', ',')}{currencySymbol}
              </AppText>
              <AppText weight="medium" size={16} style={{ color: theme.tabIconDefault }}>
                {(() => {
                  if (subscription.frequency === 'mensual') return t('frequency_text.monthly');
                  if (subscription.frequency === 'anual') return t('frequency_text.yearly');
                  if (subscription.frequency === 'semanal') return t('frequency_text.weekly');
                  if (subscription.frequency === 'diario') return t('frequency_text.daily');
                  if (subscription.frequency === 'custom') {
                    const n = subscription.customIntervalDays;
                    return t(`frequency_text.custom_${n === 1 ? 'one' : 'other'}`, { count: n });
                  }
                  return '';
                })()}
              </AppText>
            </View>

            {/* Próximo pago */}
            <View style={[styles.nextPaymentCard, { backgroundColor: theme.background, borderColor: theme.tabIconDefault + '20' }]}>
              <View style={styles.nextPaymentHeader}>
                <Ionicons name="calendar-outline" size={20} color={theme.tabIconDefault} />
                <AppText weight="semibold" size={16} style={{ marginLeft: 8 }}>
                  {t('next_payment')}
                </AppText>
              </View>
              
              <AppText weight="regular" size={14} style={{ color: theme.tabIconDefault, marginBottom: 4 }}>
                {formatDate(nextDate.toISOString())}
              </AppText>
              
              <AppText 
                weight="bold" 
                size={14} 
                style={{ color: getDaysColor() }}
              >
                {getDaysText()}
              </AppText>
            </View>
          </View>
        </View>

        {/* Información adicional */}
        <View style={styles.infoSection}>
          <AppText weight="semibold" size={18} style={styles.sectionTitle}>
            {t('info')}
          </AppText>

          {/* Cálculos de importes */}
          <View style={[styles.infoCard, { backgroundColor: theme.background, borderColor: theme.tabIconDefault + '20' }]}>
            <View style={styles.infoRow}>
              <AppText weight="medium" size={14} style={{ color: theme.tabIconDefault }}>
                {t('monthly_amount')}
              </AppText>
              <AppText weight="bold" size={16}>
                {monthlyAmount.toFixed(2)}{currencySymbol}
              </AppText>
            </View>
            
            <View style={styles.infoRow}>
              <AppText weight="medium" size={14} style={{ color: theme.tabIconDefault }}>
                {t('yearly_amount')}
              </AppText>
              <AppText weight="bold" size={16}>
                {yearlyAmount.toFixed(2)}{currencySymbol}
              </AppText>
            </View>
            
            <View style={styles.infoRow}>
              <AppText weight="medium" size={14} style={{ color: theme.tabIconDefault }}>
                {t('using_since')}
              </AppText>
              <AppText weight="bold" size={16}>
                {getSubscriptionAge()}
              </AppText>
            </View>

            <View style={styles.infoRow}>
              <AppText weight="medium" size={14} style={{ color: theme.tabIconDefault }}>
                {t('total_accumulated') /* añade esta key a tus traducciones */}
              </AppText>
              <AppText weight="bold" size={16}>
                {totalAccumulated.toFixed(2)}{currencySymbol}
              </AppText>
            </View>

            {/* (Opcional) muestra también cuántos cobros han ocurrido */}
            <View style={styles.infoRow}>
              <AppText weight="medium" size={14} style={{ color: theme.tabIconDefault }}>
                {t('charges_count')}
              </AppText>
              <AppText weight="bold" size={16}>
                {chargesCount}
              </AppText>
            </View>
          </View>

          {/* Detalles adicionales */}
          {(subscription.paymentMethod || subscription.account || subscription.description) && (
            <View style={[styles.infoCard, { backgroundColor: theme.background, borderColor: theme.tabIconDefault + '20' }]}>
              {subscription.paymentMethod && (
                <View style={styles.infoRow}>
                  <AppText weight="medium" size={14} style={{ color: theme.tabIconDefault }}>
                    {t('payment_method')}:
                  </AppText>
                  <AppText weight="regular" size={14} style={{ flex: 1, textAlign: 'right' }}>
                    {subscription.paymentMethod}
                  </AppText>
                </View>
              )}
              
              {subscription.account && (
                <View style={styles.infoRow}>
                  <AppText weight="medium" size={14} style={{ color: theme.tabIconDefault }}>
                    {t('account')}:
                  </AppText>
                  <AppText weight="regular" size={14} style={{ flex: 1, textAlign: 'right' }}>
                    {subscription.account}
                  </AppText>
                </View>
              )}
              
              {subscription.description && (
                <View style={styles.infoColumn}>
                  <AppText weight="medium" size={14} style={{ color: theme.tabIconDefault, marginBottom: 8 }}>
                    {t('description')}:
                  </AppText>
                  <AppText weight="regular" size={14} style={{ lineHeight: 20 }}>
                    {subscription.description}
                  </AppText>
                </View>
              )}
            </View>
          )}

          {/* Notificaciones */}
          <View style={[styles.infoCard, { backgroundColor: theme.background, borderColor: theme.tabIconDefault + '20' }]}>
            <View style={styles.infoRow}>
              <View style={styles.notificationHeader}>
                <Ionicons name="notifications-outline" size={16} color={theme.tabIconDefault} />
                <AppText weight="medium" size={14} style={{ color: theme.tabIconDefault, marginLeft: 8 }}>
                  {t('notifications')}:
                </AppText>
              </View>
              <AppText weight="regular" size={14} style={{ color: subscription.notifications.enabled ? '#28a745' : theme.tabIconDefault }}>
                {subscription.notifications.enabled ? 'Enabled' : 'Disabled'}
              </AppText>
            </View>
            
            {subscription.notifications.enabled && (
              <>
                <View style={styles.infoRow}>
                  <AppText weight="medium" size={14} style={{ color: theme.tabIconDefault }}>
                    {t('notifications.days_before')}:
                  </AppText>
                  <AppText weight="regular" size={14}>
                    {subscription.notifications.daysBeforePayment} 
                  </AppText>
                </View>
                
                <View style={styles.infoRow}>
                  <AppText weight="medium" size={14} style={{ color: theme.tabIconDefault }}>
                    {t('notifications.time')}:
                  </AppText>
                  <AppText weight="regular" size={14}>
                    {formatTime(subscription.notifications.notificationTime)}
                  </AppText>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Botón eliminar */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.deleteButton, { borderColor: '#dc3545' }]}
            onPress={() => setShowDeleteModal(true)}
          >
            <Ionicons name="trash-outline" size={20} color="#dc3545" />
            <AppText weight="medium" size={16} style={{ color: '#dc3545', marginLeft: 8 }}>
              {t('delete_subscription')}
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Modal de confirmación de eliminación */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.deleteModalContainer, { backgroundColor: theme.background }]}>
            <View style={styles.deleteIcon}>
              <Ionicons name="trash" size={32} color="#dc3545" />
            </View>
            
            <AppText weight="bold" size={20} style={styles.deleteModalTitle}>
              ¿Eliminar suscripción?
            </AppText>
            
            <AppText weight="regular" size={14} style={[styles.deleteModalDescription, { color: theme.tabIconDefault }]}>
              Esta acción eliminará permanentemente la suscripción "{subscription.name}" y no se puede deshacer.
            </AppText>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, { borderColor: theme.tabIconDefault + '40' }]}
                onPress={() => setShowDeleteModal(false)}
              >
                <AppText weight="medium" size={16}>Cancelar</AppText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.deleteModalButton, { backgroundColor: '#dc3545' }]}
                onPress={handleDelete}
              >
                <AppText weight="semibold" size={16} style={{ color: '#fff' }}>
                  Eliminar
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  mainCardContainer: {
    padding: 20,
  },
  mainCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  serviceIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  priceSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  nextPaymentCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  nextPaymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoColumn: {
    marginBottom: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionSection: {
    padding: 20,
    paddingTop: 0,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  bottomSpacing: {
    height: 120,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContainer: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  deleteIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dc354515',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteModalDescription: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
});