// app/payment/add.tsx
import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Switch,
  useColorScheme,
  Alert,
  Platform,
  Modal,
  Animated
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AppText } from '@/src/components/StyledText';
import { router } from 'expo-router';
import Colors from '@/src/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { 
  SubscriptionFormData, 
  defaultSubscriptionForm, 
  categories, 
  frequencyOptions, 
  predefinedColors,
  calculateMonthlyAmount,
  calculateYearlyAmount,
  Frequency,
  Category
} from '@/src/types/subscription';
import { useSubscriptionStore } from '@/src/stores/subscriptionStore';
import { requestNotificationPermissions } from '@/src/utils/notificationUtils';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { useTranslation } from 'react-i18next';
import i18n from '@/src/i18n';

export default function AddSubscription() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<SubscriptionFormData>(defaultSubscriptionForm);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState({ monthlyAmount: 0, yearlyAmount: 0 });
  const currencySymbol = useSettingsStore(s => s.currencySymbol);
  
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const addSubscription = useSubscriptionStore((state) => state.addSubscription);

  // Calcular importes preview
  const price = parseFloat(formData.price) || 0;
  const monthlyAmount = calculateMonthlyAmount(price, formData.frequency, formData.customIntervalDays);
  const yearlyAmount = calculateYearlyAmount(price, formData.frequency, formData.customIntervalDays);
  const [daysBeforeStr, setDaysBeforeStr] = useState(
    String(formData.notifications.daysBeforePayment ?? '')
  );

  const updateFormData = (field: keyof SubscriptionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateNotificationSettings = (field: keyof typeof formData.notifications, value: any) => {
    setFormData(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [field]: value }
    }));
  };

  const handleColorSelect = (color: string, index: number) => {
    setSelectedColorIndex(index);
    updateFormData('color', color);
  };

  // 📅 Handler para el date picker
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
      updateFormData('startDate', dateString);
    }
  };

  // 🕐 Handler para el time picker
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const timeString = selectedTime.toTimeString().slice(0, 5); // HH:mm
      updateNotificationSettings('notificationTime', timeString);
    }
  };

  // 📅 Formatear fecha para mostrar
  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 🕐 Formatear hora para mostrar
  const formatTimeForDisplay = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      Alert.alert(t('error.title'), t('error.name_required'));
      return false;
    }
    if (!formData.startDate) {
      Alert.alert(t('error.title'), t('error.start_required'));
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      Alert.alert(t('error.title'), t('error.price_required'));
      return false;
    }

    if (formData.frequency === 'custom') {
      const n = Number(formData.customIntervalDays);
      if (!Number.isInteger(n) || n <= 0) {
        Alert.alert(
          t('error.custom'),
          t('error.custom_info')
        );
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      // 📲 Pedimos permiso solo si el usuario ha activado recordatorios
      if (formData.notifications.enabled) {
        const granted = await requestNotificationPermissions();
        if (!granted) {
          Alert.alert(
            t('perm_denied'),
            t('perm_explain')
          );
          // desactivar flag para no romper el scheduling
          updateNotificationSettings('enabled', false);
        }
      }

      console.log('🔄 Guardando suscripción...', formData.name);
      
      // finalmente creamos la suscripción (internamente ya se programa la notificación)
      await addSubscription(formData);
      
      console.log('✅ Suscripción guardada exitosamente');
      console.log('📊 Configurando datos del modal...', { monthlyAmount, yearlyAmount });

      setSuccessData({ monthlyAmount, yearlyAmount });
      setShowSuccessModal(true);
      
      console.log('🎉 Modal configurado para mostrarse');

    } catch (error) {
      console.error('❌ Error al guardar suscripción:', error);
      Alert.alert(
        t('error.title'),
        t('error.save_failed')
      );
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <AppText weight="bold" size={20}>{t('new_payment')}</AppText>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Campos obligatorios */}
        <View style={styles.section}>
          <AppText weight="semibold" size={20} style={styles.sectionTitle}>
            {t('basic_info_star')}
          </AppText>

          {/* Nombre */}
          <View style={[styles.inputGroup, {backgroundColor: theme.card}]}>
            <AppText weight="medium" size={16} style={styles.label}>
              {t('service_name_star')}
            </AppText>
            <TextInput
              style={[styles.input, { borderColor: theme.tabIconDefault + '40', color: theme.text }]}
              placeholder="ej. Netflix, Spotify..."
              placeholderTextColor={theme.tabIconDefault}
              value={formData.name}
              onChangeText={(text) => updateFormData('name', text)}
            />
          </View>

          {/* 📅 Fecha de inicio con picker */}
          <View style={[styles.inputGroup, {backgroundColor: theme.card}]}>
            <AppText weight="medium" size={16} style={styles.label}>
              {t('start_date_star')}
            </AppText>
            <TouchableOpacity
              style={[styles.dateTimeButton, { borderColor: theme.tabIconDefault + '40' }]}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.dateTimeContent}>
                <Ionicons name="calendar-outline" size={20} color={theme.tabIconDefault} />
                <AppText weight="regular" size={14} style={{ color: theme.text, marginLeft: 12 }}>
                  {formatDateForDisplay(formData.startDate)}
                </AppText>
              </View>
            </TouchableOpacity>
          </View>

          {/* Frecuencia */}
          <View style={[styles.inputGroup, {backgroundColor: theme.card}]}>
            <AppText weight="medium" size={16} style={styles.label}>
              {t('frequency_star')}
            </AppText>
            <View style={styles.frequencyContainer}>
              {frequencyOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.frequencyOption,
                    { 
                      backgroundColor: formData.frequency === option.value 
                        ? theme.tint 
                        : theme.background,
                      borderColor: theme.tabIconDefault + '40'
                    }
                  ]}
                  onPress={() => updateFormData('frequency', option.value)}
                >
                  <AppText 
                    weight="medium" 
                    size={14}
                    style={{ 
                      color: formData.frequency === option.value ? theme.background : theme.text 
                    }}
                  >
                    {t('frequency.' + option.value)}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {formData.frequency === 'custom' && (
            <View style={[styles.inputGroup, { backgroundColor: theme.card }]}>
              <AppText weight="medium" size={16} style={styles.label}>
                {t('custom_frequency_days')}
              </AppText>
              <TextInput
                style={[styles.input, { borderColor: theme.tabIconDefault + '40', color: theme.text }]}
                placeholder="p.ej. 45"
                placeholderTextColor={theme.tabIconDefault}
                value={formData.customIntervalDays?.toString() ?? ''}
                onChangeText={(t) => {
                  // opcional: solo dígitos
                  const cleaned = t.replace(/[^\d]/g, '');
                  const n = parseInt(cleaned, 10);
                  updateFormData(
                    'customIntervalDays',
                    Number.isNaN(n) ? undefined : Math.max(1, n)
                  );
                }}
                keyboardType="numeric"
              />
            </View>
          )}

          {/* Precio */}
          <View style={[styles.inputGroup, {backgroundColor: theme.card}]}>
            <AppText weight="medium" size={16} style={styles.label}>
              {t('price')} ({t('frequency.' + formData.frequency)}) *
            </AppText>
            <TextInput
              style={[styles.input, { borderColor: theme.tabIconDefault + '40', color: theme.text }]}
              placeholder="0.00"
              placeholderTextColor={theme.tabIconDefault}
              value={formData.price}
              onChangeText={(text) => updateFormData('price', text)}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Campos opcionales */}
        <View style={styles.section}>
          <AppText weight="semibold" size={20} style={styles.sectionTitle}>
            {t('extra_info_opt')}
          </AppText>

          {/* Color */}
          <View style={[styles.inputGroup, {backgroundColor: theme.card}]}>
            <AppText weight="medium" size={16} style={styles.label}>
              {t('color')}
            </AppText>
            <View style={styles.colorContainer}>
              {predefinedColors.map((color, index) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColorIndex === index && {borderColor: theme.text}
                  ]}
                  onPress={() => handleColorSelect(color, index)}
                />
              ))}
            </View>
          </View>

          {/* Categoría */}
          <View style={[[styles.inputGroup, {backgroundColor: theme.card}], {backgroundColor: theme.card}]}>
            <AppText weight="medium" size={16} style={styles.label}>
              {t('category')}
            </AppText>
            <View style={styles.categoryContainer}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryOption,
                    {
                      backgroundColor: formData.category === category 
                        ? theme.tint 
                        : theme.background,
                      borderColor: theme.tabIconDefault + '40'
                    }
                  ]}
                  onPress={() => updateFormData('category', category as Category)}
                >
                  <AppText 
                    weight="medium" 
                    size={12}
                    style={{ 
                      color: formData.category === category ? theme.background : theme.text 
                    }}
                  >
                    {t('category.' + category)}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Método de pago */}
          <View style={[[styles.inputGroup, {backgroundColor: theme.card}], {backgroundColor: theme.card}]}>
            <AppText weight="medium" size={16} style={styles.label}>
              {t('payment_method')}
            </AppText>
            <TextInput
              style={[styles.input, { borderColor: theme.tabIconDefault + '40', color: theme.text }]}
              placeholder="ex. BBVA *1234, PayPal..."
              placeholderTextColor={theme.tabIconDefault}
              value={formData.paymentMethod}
              onChangeText={(text) => updateFormData('paymentMethod', text)}
            />
          </View>

          {/* Cuenta */}
          <View style={[styles.inputGroup, {backgroundColor: theme.card}]}>
            <AppText weight="medium" size={16} style={styles.label}>
              {t('linked_account')}
            </AppText>
            <TextInput
              style={[styles.input, { borderColor: theme.tabIconDefault + '40', color: theme.text }]}
              placeholder="ex. user@email.com, @user..."
              placeholderTextColor={theme.tabIconDefault}
              value={formData.account}
              onChangeText={(text) => updateFormData('account', text)}
            />
          </View>

          {/* Descripción */}
          <View style={[styles.inputGroup, {backgroundColor: theme.card}]}>
            <AppText weight="medium" size={16} style={styles.label}>
              {t('description')}
            </AppText>
            <TextInput
              style={[styles.textArea, { borderColor: theme.tabIconDefault + '40', color: theme.text }]}
              placeholder="Notes..."
              placeholderTextColor={theme.tabIconDefault}
              value={formData.description}
              onChangeText={(text) => updateFormData('description', text)}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Notificaciones */}
        <View style={styles.section}>
          <AppText weight="semibold" size={18} style={styles.sectionTitle}>
            {t('notifications')}
          </AppText>

          <View style={styles.switchRow}>
            <AppText weight="medium" size={16}>
              {t('notifications.enabled')}
            </AppText>
            <Switch
              value={formData.notifications.enabled}
              onValueChange={(value) => updateNotificationSettings('enabled', value)}
              trackColor={{ false: theme.tabIconDefault + '40', true: '#649e61' }}
              thumbColor={formData.notifications.enabled ? theme.tint : '#f4f3f4'}
            />
          </View>

          {formData.notifications.enabled && (
            <>
              <View style={[styles.inputGroup, {backgroundColor: theme.card}]}>
                <AppText weight="medium" size={16} style={styles.label}>
                  {t('notifications.days_before')}
                </AppText>
                <TextInput
                  style={[styles.input, { borderColor: theme.tabIconDefault + '40', color: theme.text }]}
                  placeholder=""
                  placeholderTextColor={theme.tabIconDefault}
                  value={daysBeforeStr}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^\d]/g, '');
                    setDaysBeforeStr(cleaned);
                    if (cleaned !== '') {
                      updateNotificationSettings('daysBeforePayment', parseInt(cleaned, 10));
                    }
                  }}
                  keyboardType="numeric"
                />
              </View>

              {/* 🕐 Hora de notificación con picker */}
              <View style={[[styles.inputGroup, {backgroundColor: theme.card}], {backgroundColor: theme.card}]}>
                <AppText weight="medium" size={16} style={styles.label}>
                  {t('notifications.time')}
                </AppText>
                <TouchableOpacity
                  style={[styles.dateTimeButton, { borderColor: theme.tabIconDefault + '40' }]}
                  onPress={() => setShowTimePicker(true)}
                >
                  <View style={styles.dateTimeContent}>
                    <Ionicons name="time-outline" size={20} color={theme.tabIconDefault} />
                    <AppText weight="regular" size={16} style={{ color: theme.text, marginLeft: 12 }}>
                      {formatTimeForDisplay(formData.notifications.notificationTime)}
                    </AppText>
                  </View>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Preview de importes */}
        {price > 0 && (
          <View style={[styles.previewCard, { backgroundColor: theme.background, borderColor: theme.tabIconDefault + '20' }]}>
            <AppText weight="semibold" size={16} style={styles.previewTitle}>
              {t('summary')}
            </AppText>
            <View style={styles.previewRow}>
              <AppText weight="medium" size={14}>{t('monthly_amount')}</AppText>
              <AppText weight="bold" size={16} style={{ color: theme.tint }}>
                {monthlyAmount.toFixed(2)}{currencySymbol}
              </AppText>
            </View>
            <View style={styles.previewRow}>
              <AppText weight="medium" size={14}>{t('yearly_amount')}</AppText>
              <AppText weight="bold" size={16} style={{ color: theme.tint }}>
                {yearlyAmount.toFixed(2)}{currencySymbol}
              </AppText>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom buttons */}
      <View style={[styles.bottomButtons, { borderTopColor: theme.card, backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: theme.tabIconDefault + '40' }]}
          onPress={() => router.back()}
        >
          <AppText weight="medium" size={16}>{t('cancel')}</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.tint }]}
          onPress={handleSave}
        >
          <AppText weight="semibold" size={16} style={{ color: theme.background }}>
            {t('save')}
          </AppText>
        </TouchableOpacity>
      </View>

      {/* 📅 Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={new Date(formData.startDate)}
          mode="date"
          is24Hour={true}
          onChange={handleDateChange}
          minimumDate={new Date(2010, 0, 1)} // No permitir fechas pasadas
          maximumDate={new Date(2030, 11, 31)} // Máximo hasta 2030
        />
      )}

      {/* 🕐 Time Picker Modal */}
      {showTimePicker && (
        <DateTimePicker
          testID="timePicker"
          value={new Date(`1970-01-01T${formData.notifications.notificationTime}:00`)}
          mode="time"
          is24Hour={true}
          onChange={handleTimeChange}
        />
      )}
    {/* ✨ Success Modal personalizado */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSuccessClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
            {/* Icono de éxito */}
            <View style={[styles.successIcon, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="checkmark" size={32} color="#fff" />
            </View>
            
            {/* Título */}
            <AppText weight="bold" size={24} style={styles.modalTitle}>
              {t('created.title')}
            </AppText>
            
            {/* Descripción */}
            <AppText weight="regular" size={16} style={[styles.modalDescription, { color: theme.tabIconDefault }]}>
              {t('created.desc', { name: formData.name })}
            </AppText>
            
            {/* Información de importes */}
            <View style={[styles.amountContainer, { backgroundColor: theme.background, borderColor: theme.tabIconDefault + '20' }]}>
              <View style={styles.amountRow}>
                <AppText weight="medium" size={14} style={{ color: theme.tabIconDefault }}>
                  {t('monthly_amount')}
                </AppText>
                <AppText weight="bold" size={16} style={{ color: '#4CAF50' }}>
                  {successData.monthlyAmount.toFixed(2)}{currencySymbol}
                </AppText>
              </View>
              
              <View style={styles.amountRow}>
                <AppText weight="medium" size={14} style={{ color: theme.tabIconDefault }}>
                  {t('yearly_amount')}
                </AppText>
                <AppText weight="bold" size={16} style={{ color: '#4CAF50' }}>
                  {successData.yearlyAmount.toFixed(2)}{currencySymbol}
                </AppText>
              </View>
            </View>
            
            {/* Botón de cerrar */}
            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: '#4CAF50' }]}
              onPress={handleSuccessClose}
            >
              <AppText weight="semibold" size={16} style={{ color: '#fff' }}>
                {t('perfect')}
              </AppText>
            </TouchableOpacity>
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
  backButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
    paddingBottom: 0,
  },
  sectionTitle: {
    marginBottom: 16,
    opacity: 0.8,
  },
  inputGroup: {
    marginBottom: 20,
    borderRadius: 10, 
    padding: 10,
    elevation: 2
  },
  label: {
    marginBottom: 8,
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // 🆕 Estilos para los botones de fecha y hora
  dateTimeButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'transparent',
  },
  dateTimeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  frequencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#000',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewCard: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewTitle: {
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bottomSpacing: {
    height: 20,
  },
  bottomButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  // ✨ Estilos para el modal de éxito
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
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
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  amountContainer: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  successButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
  },
});