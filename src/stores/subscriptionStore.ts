import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Subscription, 
  SubscriptionFormData, 
  calculateNextPaymentDate, 
  getRandomColor,
  calculateMonthlyAmount,
  calculateYearlyAmount
} from '../types/subscription';
import {
  scheduleMultipleNotifications,
  scheduleSubscriptionNotification,
  cancelNotification,
  cancelAllNotifications
} from '../utils/notificationUtils'

interface SubscriptionStore {
  subscriptions: Subscription[];
  
  // Acciones
  addSubscription: (formData: SubscriptionFormData) => void;
  updateSubscription: (id: string, formData: SubscriptionFormData) => void;
  deleteSubscription: (id: string) => void;
  getSubscriptionById: (id: string) => Subscription | undefined;
  
  // Cálculos
  getTotalMonthlyAmount: () => number;
  getTotalYearlyAmount: () => number;
  
  // Utilidades
  rebuildAllNotifications: () => void;
  getSubscriptionsSortedByNextPayment: () => Subscription[];
  getSubscriptionsByCategory: (category: string) => Subscription[];
}

const createSubscriptionFromForm = (formData: SubscriptionFormData): Subscription => {
  const now = new Date().toISOString();
  const price = parseFloat(formData.price) || 0;
  
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    name: formData.name.trim(),
    startDate: formData.startDate,
    frequency: formData.frequency,
    customIntervalDays: formData.customIntervalDays,
    price: price,
    color: formData.color || getRandomColor(),
    paymentMethod: formData.paymentMethod.trim() || undefined,
    description: formData.description.trim() || undefined,
    category: formData.category,
    account: formData.account.trim() || undefined,
    notifications: formData.notifications,
    notificationIds: [],
    nextPaymentDate: calculateNextPaymentDate(
      formData.startDate, 
      formData.frequency, 
      formData.customIntervalDays
    ),
    createdAt: now,
    updatedAt: now
  };
};

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set, get) => ({
      // ✨ Todo tu código actual exactamente igual
      subscriptions: [],
      
      addSubscription: async (formData: SubscriptionFormData) => {
        const newSubscription = createSubscriptionFromForm(formData);
        
        set((state) => ({
        subscriptions: [...state.subscriptions, newSubscription]
        }));

        const notifIds = await scheduleMultipleNotifications(newSubscription)
        if(notifIds.length > 0) {
          set(state => ({
            subscriptions: state.subscriptions.map(sub =>
              sub.id === newSubscription.id ? { ...sub, notificationIds: notifIds } : sub
            )
          }))
        }
      },

      // Actualizar suscripción existente
      updateSubscription: async (id: string, formData: SubscriptionFormData) => {
        // 1️⃣ primero recuperamos la suscripción anterior
        const prev = get().subscriptions.find(s => s.id === id)
        if (prev?.notificationIds) {
          for (const id of prev.notificationIds) {
            try {
              cancelNotification(id);
            } catch (err) {
              console.warn(`No se pudo cancelar la notificación con ID ${id}`, err);
            }
          }
          // cancelamos la notificación antigua
          //cancelNotification(prev.notificationId)
        }

        // 2️⃣ creamos la nueva versión
        const now = new Date().toISOString()
        const price = parseFloat(formData.price) || 0
        const updatedSub: Subscription = {
          ...prev!,
          name: formData.name.trim(),
          startDate: formData.startDate,
          frequency: formData.frequency,
          price,
          color: formData.color || prev!.color,
          paymentMethod: formData.paymentMethod.trim() || prev!.paymentMethod,
          description: formData.description.trim() || prev!.description,
          category: formData.category,
          account: formData.account.trim() || prev!.account,
          notifications: formData.notifications,
          nextPaymentDate: calculateNextPaymentDate(formData.startDate, formData.frequency),
          notificationIds: null,              // resetear antes de reprogramar
          updatedAt: now
        }

        // 3️⃣ sustituimos en el array
        set(state => ({
          subscriptions: state.subscriptions.map(s => s.id === id ? updatedSub : s)
        }))

        // 4️⃣ y programamos de nuevo la notificación
        const newNotifIds = await scheduleMultipleNotifications(updatedSub)
        if (newNotifIds.length > 0) {
          set(state => ({
            subscriptions: state.subscriptions.map(s =>
              s.id === id ? { ...s, notificationIds: newNotifIds } : s
            )
          }))
        }
      },

      // Eliminar suscripción
      deleteSubscription: (id: string) => {
        const toDelete = get().subscriptions.find(s => s.id === id)
        if (toDelete?.notificationIds) {
          for (const id of toDelete.notificationIds) {
            try {
              cancelNotification(id);
            } catch (err) {
              console.warn(`No se pudo cancelar la notificación con ID ${id}`, err);
            }
          }
        }
        set((state) => ({
        subscriptions: state.subscriptions.filter((sub) => sub.id !== id)
        }));
      },

    // Obtener suscripción por ID
    getSubscriptionById: (id: string) => {
        return get().subscriptions.find((sub) => sub.id === id);
    },

    // Calcular total mensual
    getTotalMonthlyAmount: () => {
        const subscriptions = get().subscriptions;
        return subscriptions.reduce((total, sub) => {
        return total + calculateMonthlyAmount(sub.price, sub.frequency, sub.customIntervalDays);
        }, 0);
    },

    // Calcular total anual
    getTotalYearlyAmount: () => {
        const subscriptions = get().subscriptions;
        return subscriptions.reduce((total, sub) => {
        return total + calculateYearlyAmount(sub.price, sub.frequency, sub.customIntervalDays);
        }, 0);
    },

    //rebuild de todas las notificaciones
    rebuildAllNotifications: async () => {
      cancelAllNotifications();
      const subs = useSubscriptionStore.getState().subscriptions;
      for (const sub of subs) {
        const ids = await scheduleMultipleNotifications(sub);
        useSubscriptionStore.setState(state => ({
          subscriptions: state.subscriptions.map(s =>
            s.id === sub.id ? { ...s, notificationIds: ids } : s
          )
        }));
      }
    },

    // Obtener suscripciones ordenadas por próximo pago
    getSubscriptionsSortedByNextPayment: () => {
      return get().subscriptions
        .map(sub => ({
          ...sub,
          // recalculamos la fecha real del próximo pago
          nextDynamic: calculateNextPaymentDate(sub.startDate, sub.frequency),
        }))
        .sort(
          (a, b) =>
            new Date(a.nextDynamic).getTime() -
            new Date(b.nextDynamic).getTime()
        )
        // si quieres devolver solo Subscription, omites nextDynamic:
        .map(({ nextDynamic, ...sub }) => sub);
    },

    // Obtener suscripciones por categoría
    getSubscriptionsByCategory: (category: string) => {
        const subscriptions = get().subscriptions;
        if (category === 'todas') return subscriptions;
        return subscriptions.filter((sub) => sub.category === category);
    }

      // ... resto de métodos iguales
    }),
    {
      name: 'subscription-storage', // ✨ Clave para AsyncStorage
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
