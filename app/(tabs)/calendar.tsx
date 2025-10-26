// app/(tabs)/calendar.tsx
import React, { useState, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  useColorScheme,
  StatusBar,
  Image 
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { AppText } from '@/src/components/StyledText';
import { router } from 'expo-router';
import Colors from '@/src/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore } from '@/src/stores/subscriptionStore';
import { Subscription } from '@/src/types/subscription';
import { todayString } from 'react-native-calendars/src/expandableCalendar/commons';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import i18n from '@/src/i18n';
import { fromLocalDateKey, toLocalDateKey } from '@/src/utils/datekey';

interface PaymentEvent {
  date: string;
  subscriptions: Subscription[];
}

export default function CalendarScreen() {
  const { t } = useTranslation();
  const today = toLocalDateKey(new Date());
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);
  const currencySymbol = useSettingsStore(s => s.currencySymbol);

  // Generar todos los eventos de pago para los próximos meses
  const paymentEvents = useMemo(() => {
    const events: { [key: string]: PaymentEvent } = {};
    const today = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(today.getMonth() + 6);

    subscriptions.forEach((subscription) => {
      const startDate = new Date(subscription.startDate);
      let currentDate = new Date(startDate);

      // Generar fechas de pago hasta 6 meses en el futuro
      while (currentDate <= sixMonthsFromNow) {
        // Solo incluir fechas desde el inicio de la suscripción
        if (currentDate >= startDate) {
          const dateKey = toLocalDateKey(currentDate);
          
          if (!events[dateKey]) {
            events[dateKey] = {
              date: dateKey,
              subscriptions: []
            };
          }
          
          events[dateKey].subscriptions.push(subscription);
        }

        // Calcular siguiente fecha según frecuencia
        switch (subscription.frequency) {
          case 'diario':
            currentDate.setDate(currentDate.getDate() + 1);
            break;
          case 'semanal':
            currentDate.setDate(currentDate.getDate() + 7);
            break;
          case 'mensual':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
          case 'anual':
            currentDate.setFullYear(currentDate.getFullYear() + 1);
            break;
          case 'custom':
            currentDate.setDate(currentDate.getDate() + (subscription as any).customIntervalDays)
        }
      }
    });

    return events;
  }, [subscriptions]);

  // Preparar marcadores para el calendario
  const markedDates = useMemo(() => {
    const marked: any = {};
    const today = new Date().toISOString().split('T')[0];

    // Marcar días con pagos - círculo rojo debajo
    Object.keys(paymentEvents).forEach((date) => {
      const event = paymentEvents[date];
      const isSelected = date === selectedDate;
      const isToday = date === today;

      if (!isToday) {
        // Solo marcar con punto rojo si NO es hoy
        marked[date] = {
          marked: true,
          dotColor: '#FF6B6B',
          selected: isSelected,
          selectedColor: isSelected ? theme.tint : undefined,
        };
      } else {
        // Si es hoy, solo marcar como seleccionado si corresponde
        marked[date] = {
          selected: isSelected,
          selectedColor: isSelected ? theme.tint : undefined,
        };
      }
    });

    // Marcar día de hoy con círculo de fondo (SIN punto debajo)
    marked[today] = {
      selected: true,
      selectedColor: theme.tabIconDefault,
      selectedTextColor: theme.background,
    };

    // Marcar día seleccionado si no tiene pagos y no es hoy
    if (selectedDate && !marked[selectedDate] && selectedDate !== today) {
      marked[selectedDate] = {
        selected: true,
        selectedColor: theme.tint,
      };
    }

    return marked;
  }, [paymentEvents, selectedDate, theme]);

  // Manejar selección de fecha
  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  // Obtener suscripciones del día seleccionado
  const selectedDaySubscriptions = selectedDate ? paymentEvents[selectedDate]?.subscriptions || [] : [];

  // Formatear fecha para mostrar
  const formatSelectedDate = (dateString: string) => {
    const date = fromLocalDateKey(dateString);
    return date.toLocaleDateString(i18n.language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calcular días hasta el pago
  const getDaysUntilPayment = (dateString: string) => {
    const today = new Date();
    const paymentDate = fromLocalDateKey(dateString);
    const diffTime = paymentDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDaysText = (days: number) => {
    if (days < 0) {
      return t(`relative.ago_${Math.abs(days) === 1 ? 'one' : 'other'}`, { count: Math.abs(days) });
    }
    if (days === 0) return t('relative.today');
    if (days === 1) return t('relative.tomorrow');
    return t(`relative.in_days_${days === 1 ? 'one' : 'other'}`, { count: days });
  };

  const getDaysColor = (days: number) => {
    if (days < 0) return theme.tabIconDefault;
    if (days === 0) return '#FF6B6B';
    if (days <= 3) return '#FFC107';
    return '#28a745';
  };

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
{/* Calendario */}
        <View style={[styles.calendarContainer, {backgroundColor: theme.card}]}>
          <Calendar
            onDayPress={onDayPress}
            markedDates={markedDates}
            markingType="dot"
            theme={{
              backgroundColor: theme.card,
              calendarBackground: theme.card,
              textSectionTitleColor: theme.text,
              selectedDayBackgroundColor: theme.tint,
              selectedDayTextColor: theme.background,
              todayTextColor: theme.text,
              dayTextColor: theme.text,
              textDisabledColor: theme.tabIconDefault + '60',
              dotColor: '#FF6B6B',
              selectedDotColor: '#FF6B6B',
              arrowColor: theme.tint,
              disabledArrowColor: theme.tabIconDefault,
              monthTextColor: theme.text,
              indicatorColor: theme.tint,
              textDayFontFamily: 'Inter_400Regular',
              textMonthFontFamily: 'Inter_600SemiBold',
              textDayHeaderFontFamily: 'Inter_500Medium',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 13,
            }}
            firstDay={1}
            hideExtraDays={true}
            enableSwipeMonths={true}
          />
        </View>
      
        
        {/* Información del día seleccionado */}
        {selectedDate && (
          <View style={styles.selectedDaySection}>
            <View style={[styles.selectedDayHeader, { borderBottomColor: theme.tabIconDefault + '20' }]}>
              <AppText weight="semibold" size={18}>
                {formatSelectedDate(selectedDate)}
              </AppText>
              
              {selectedDaySubscriptions.length > 0 && (
                <View style={styles.countBadge}>
                  <AppText weight="bold" size={12} style={{ color: '#fff' }}>
                    {selectedDaySubscriptions.length}
                  </AppText>
                </View>
              )}
            </View>

            {selectedDaySubscriptions.length === 0 ? (
              <View style={styles.emptyDay}>
                <Ionicons name="calendar-outline" size={48} color={theme.tabIconDefault} style={styles.emptyIcon} />
                <AppText weight="medium" size={16} style={{ color: theme.tabIconDefault }}>
                  {t('no_payments_today')}
                </AppText>
              </View>
            ) : (
              
              <ScrollView
            style={[styles.subscriptionsScroll, {height: 750}]}        // nuevo estilo
            showsVerticalScrollIndicator={false}
          >
                {selectedDaySubscriptions.map((subscription) => {
                  const daysUntil = getDaysUntilPayment(selectedDate);
                  
                  return (
                    <TouchableOpacity
                      key={`${subscription.id}-${selectedDate}`}
                      style={[styles.subscriptionCard, { backgroundColor: theme.card }]}
                      onPress={() => router.push(`/payment/detail/${subscription.id}`)}
                    >
                      <View style={styles.subscriptionContent}>
                        <View style={styles.subscriptionLeft}>
                          <View 
                            style={[
                              styles.subscriptionIcon,
                              { backgroundColor: theme.background || theme.tint }
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
                              {subscription.frequency === 'custom'
                                ? t(
                                    `frequency_text.custom_${subscription.customIntervalDays === 1 ? 'one' : 'other'}`,
                                    { count: subscription.customIntervalDays }
                                  )
                                : t(`frequency.${subscription.frequency}`)
                              }
                              {' • '}
                              {t(`category.${subscription.category}`)}
                            </AppText>
                          </View>
                        </View>
                        
                        <View style={styles.subscriptionRight}>
                          <AppText weight="bold" size={18}>
                            {subscription.price.toFixed(2).replace('.', ',')}{currencySymbol}
                          </AppText>
                          <AppText 
                            weight="medium" 
                            size={12} 
                            style={{ 
                              color: getDaysColor(daysUntil),
                              textAlign: 'right'
                            }}
                          >
                            {getDaysText(daysUntil)}
                          </AppText>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <View style={{marginBottom: 20}}></View>
              </ScrollView>
              
            )}
          </View>
        )}

        <View style={styles.bottomSpacing} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  scrollView: {
    flex: 1,
  },
  calendarContainer: {
    marginHorizontal: 20,
    padding:10,
    marginBottom:20,
    borderRadius: 16,        // radio de esquinas
    overflow: 'hidden',      // recorta el contenido al radio
    elevation: 4,            // sombra Android
    shadowColor: '#000',     // sombra iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedDaySection: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  countBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    opacity: 0.5,
    marginBottom: 12,
  },
  subscriptionsList: {
    gap: 12,
  },
  subscriptionsScroll: {
    flexGrow: 0,
    maxHeight: 380,
  },
  subscriptionCard: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  subscriptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  subscriptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subscriptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionRight: {
    alignItems: 'flex-end',
  },
  legendSection: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  legendTitle: {
    marginBottom: 12,
  },
  legendItems: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 2,
  },
  legendCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendExample: {
    alignItems: 'center',
    gap: 2,
  },
  bottomSpacing: {
    height: 120,
  },
});