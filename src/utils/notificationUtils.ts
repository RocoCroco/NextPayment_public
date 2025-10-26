// src/utils/notificationUtils.ts
import * as Notifications from 'expo-notifications';
import { Subscription } from '@/src/types/subscription';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { useSubscriptionStore } from '@/src/stores/subscriptionStore';

// 1️⃣ Configuro el handler para que siempre muestre alertas
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound:   false,
    shouldSetBadge:    false,

    // nuevos (requeridos):
    shouldShowBanner:  true,   // muestra un banner en iOS/Android
    shouldShowList:    true,   // añade la notificación al centro de notificaciones
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

/**
 * Calcula la próxima fecha de notificación basada en la frecuencia
 */
function getNextNotificationDate(sub: Subscription): Date {
  const payDate = new Date(sub.nextPaymentDate);
  const notificationDate = new Date(payDate);
  
  // Restar los días antes del pago
  notificationDate.setDate(notificationDate.getDate() - sub.notifications.daysBeforePayment);
  
  // Establecer la hora específica
  const [hour, minute] = sub.notifications.notificationTime.split(':').map(Number);
  notificationDate.setHours(hour, minute, 0, 0);
  
  // Si la fecha ya pasó, calcular la siguiente según la frecuencia
  const now = new Date();
  if (notificationDate <= now) {
    switch (sub.frequency) {
      case 'diario':
        notificationDate.setDate(notificationDate.getDate() + 1);
        break;
      case 'semanal':
        notificationDate.setDate(notificationDate.getDate() + 7);
        break;
      case 'mensual':
        notificationDate.setMonth(notificationDate.getMonth() + 1);
        break;
      case 'anual':
        notificationDate.setFullYear(notificationDate.getFullYear() + 1);
        break;
      case 'custom':
        notificationDate.setDate(notificationDate.getDate() + (sub.customIntervalDays || 30));
        break;
    }
  }
  
  return notificationDate;
}

/**
 * Programa UNA notificación puntual (compatible con Android)
 * @returns el notificationId (para poder cancelarla más tarde) o null si no está activa
 */
export async function scheduleSubscriptionNotification(sub: Subscription): Promise<string|null> {
  const { notificationsEnabled, remindersEnabled, currencySymbol } = useSettingsStore.getState();
  if (!notificationsEnabled || !remindersEnabled || !sub.notifications.enabled) {
    return null;
  }

  const hasPermissions = await requestNotificationPermissions();
  if (!hasPermissions) {
    console.warn('No hay permisos para notificaciones');
    return null;
  }

  const notificationDate = getNextNotificationDate(sub);
  
  // Verificar que la fecha esté en el futuro
  const now = new Date();
  if (notificationDate <= now) {
    console.log('⚠️ Fecha de notificación ya pasó, no se programará');
    return null;
  }

  const content = {
    title: `📅 Pago próximo: ${sub.name}`,
    body: `Quedan ${sub.notifications.daysBeforePayment} días para pagar ${sub.name} (${sub.price.toFixed(2)}${currencySymbol}).`,
    data: { subscriptionId: sub.id },
  };

  // ✅ Usar TimeInterval para ambas plataformas (más compatible)
  const secondsUntilNotification = Math.floor((notificationDate.getTime() - now.getTime()) / 1000);
  
  if (secondsUntilNotification < 60) {
    console.log('⚠️ Notificación muy próxima, no se programará');
    return null;
  }

  console.log(`📅 Programando notificación para ${notificationDate.toLocaleString()}`);

  try {
    const id = await Notifications.scheduleNotificationAsync({ content, trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilNotification,
    } });
    console.log(`✅ Notificación programada con ID: ${id}`);
    return id;
  } catch (error) {
    console.error('❌ Error al programar notificación:', error);
    return null;
  }
}

export async function scheduleMultipleNotifications(sub: Subscription): Promise<string[]> {
  const { notificationsEnabled, remindersEnabled, currencySymbol } = useSettingsStore.getState();
  if (!notificationsEnabled || !remindersEnabled || !sub.notifications.enabled) {
    return [];
  }

  const hasPermissions = await requestNotificationPermissions();
  if (!hasPermissions) {
    console.warn('No hay permisos para notificaciones');
    return [];
  }

  const now = new Date();
  const ids: string[] = [];
  let nextDate = new Date(sub.nextPaymentDate);

  for (let i = 0; i < 12; i++) {
    // Calcular fecha de notificación
    const notificationDate = new Date(nextDate);
    notificationDate.setDate(notificationDate.getDate() - sub.notifications.daysBeforePayment);

    const [hour, minute] = sub.notifications.notificationTime.split(':').map(Number);
    notificationDate.setHours(hour, minute, 0, 0);

    // Solo programar si está en el futuro
    if (notificationDate > now) {
      const content = {
        title: `📅 Pago próximo: ${sub.name}`,
        body: `Quedan ${sub.notifications.daysBeforePayment} días para pagar ${sub.name} (${sub.price.toFixed(2)}${currencySymbol}).`,
        data: { subscriptionId: sub.id },
      };

      const secondsUntilNotification = Math.floor((notificationDate.getTime() - now.getTime()) / 1000);

      try {
        const id = await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntilNotification,
          },
        });
        ids.push(id);
      } catch (error) {
        console.error('❌ Error al programar notificación:', error);
      }
    }

    // Calcular siguiente fecha de pago
    switch (sub.frequency) {
      case 'diario':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'semanal':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'mensual':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'anual':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }
  }

  console.log(`✅ Programadas ${ids.length} notificaciones para ${sub.name}`);
  return ids;
}

/** Cancela una notificación programada por su ID */
export function cancelNotification(id: string) {
  return Notifications.cancelScheduledNotificationAsync(id);
}

/** Cancela **todas** las notificaciones programadas por esta app */
export function cancelAllNotifications() {
  return Notifications.cancelAllScheduledNotificationsAsync();
}


