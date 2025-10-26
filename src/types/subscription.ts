export type Frequency = 'diario' | 'semanal' | 'mensual' | 'anual' | 'custom';

export type Category = 
  | 'Casa' 
  | 'Entretenimiento' 
  | 'Cultura' 
  | 'Deporte' 
  | 'Música' 
  | 'Mobilidad' 
  | 'Productividad' 
  | 'Noticias' 
  | 'Gaming' 
  | 'Comida' 
  | 'Trabajo' 
  | 'Educación'
  | 'Otros';

export interface NotificationSettings {
  enabled: boolean;
  daysBeforePayment: number; // Días antes del pago (1-30)
  notificationTime: string; // Formato "HH:mm" ej: "09:00"
}

export interface Subscription {
  id: string;
  
  // Campos obligatorios
  name: string;
  startDate: string; // ISO date string
  frequency: Frequency;
  customIntervalDays?: number; // solo si frequency === 'custom'
  price: number;
  
  // Campos opcionales
  color?: string; // Hex color, por defecto se asigna uno aleatorio
  paymentMethod?: string; // Campo libre: "Tarjeta BBVA *1234", "PayPal", etc.
  description?: string;
  category: Category; // Por defecto "Otros"
  account?: string; // Email o usuario de la cuenta
  notifications: NotificationSettings;
  notificationIds: string[] | null;
  
  // Campos calculados (se generan automáticamente)
  nextPaymentDate: string; // ISO date string
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface SubscriptionFormData {
  name: string;
  startDate: string;
  frequency: Frequency;
  customIntervalDays?: number;
  price: string; // String para el input, se convierte a number
  color: string;
  paymentMethod: string;
  description: string;
  category: Category;
  account: string;
  notifications: NotificationSettings;
  notificationIds?: string[] | null;
}

// Valores por defecto para el formulario
export const defaultSubscriptionForm: SubscriptionFormData = {
  name: '',
  startDate: new Date().toISOString().split('T')[0], // Fecha actual en formato YYYY-MM-DD
  frequency: 'mensual',
  customIntervalDays: 30, // default razonabl
  price: '',
  color: '#2196F3', // Azul por defecto
  paymentMethod: '',
  description: '',
  category: 'Otros',
  account: '',
  notifications: {
    enabled: true,
    daysBeforePayment: 3,
    notificationTime: '09:00'
  },
  notificationIds: []
};

// Colores predefinidos para elegir
export const predefinedColors = [
  '#2196F3', // Azul
  '#4CAF50', // Verde  
  '#FF9800', // Naranja
  '#9C27B0', // Púrpura
  '#F44336', // Rojo
  '#00BCD4', // Cian
  '#FFC107', // Amarillo
  '#795548', // Marrón
  '#607D8B', // Azul gris
  '#E91E63', // Rosa
  '#3F51B5', // Índigo
  '#8BC34A'  // Verde claro
];

// Categorías disponibles
export const categories: Category[] = [
  'Casa',
  'Entretenimiento',
  'Cultura', 
  'Deporte',
  'Música',
  'Mobilidad',
  'Productividad',
  'Noticias',
  'Gaming',
  'Comida',
  'Trabajo',
  'Educación',
  'Otros'
];

// Opciones de frecuencia
export const frequencyOptions: { value: Frequency; label: string }[] = [
  { value: 'diario', label: 'Diario' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'anual',  label: 'Anual'  },
  { value: 'custom', label: 'Personalizada' },
];

// Utilidades para cálculos
export const calculateNextPaymentDate = (startDate: string, frequency: Frequency, customIntervalDays?: number): string => {
  const start = new Date(startDate);
  const now = new Date();
  let nextPayment = new Date(start);

  while (nextPayment <= now) {
    switch (frequency) {
      case 'diario':
        nextPayment.setDate(nextPayment.getDate() + 1);
        break;
      case 'semanal':
        nextPayment.setDate(nextPayment.getDate() + 7);
        break;
      case 'mensual':
        nextPayment.setMonth(nextPayment.getMonth() + 1);
        break;
      case 'anual':
        nextPayment.setFullYear(nextPayment.getFullYear() + 1);
        break;
      case 'custom':   
        nextPayment.setDate(nextPayment.getDate() + (customIntervalDays || 30)); 
        break;
    }
  }

  return nextPayment.toISOString();
};

export const calculateMonthlyAmount = (price: number, frequency: Frequency, customIntervalDays?: number): number => {
  switch (frequency) {
    case 'diario':
      return price * 30.44; // Promedio de días por mes
    case 'semanal':
      return price * 4.33; // Promedio de semanas por mes
    case 'mensual':
      return price;
    case 'anual':
      return price / 12;
    case 'custom':  
      return price * (30.44 / Math.max(1, customIntervalDays || 30));
    default:
      return 0;
  }
};

export const calculateYearlyAmount = (price: number, frequency: Frequency, customIntervalDays?: number): number => {
  switch (frequency) {
    case 'diario':
      return price * 365;
    case 'semanal':
      return price * 52;
    case 'mensual':
      return price * 12;
    case 'anual':
      return price;
    case 'custom':  
      return price * (365 / Math.max(1, customIntervalDays || 30));
    default:
      return 0;
  }
};

export const getRandomColor = (): string => {
  return predefinedColors[Math.floor(Math.random() * predefinedColors.length)];
};