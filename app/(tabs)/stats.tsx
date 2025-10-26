import React, { useState, useMemo, useTransition } from 'react';
import { SafeAreaView, View, ScrollView, StatusBar, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { AppText } from '@/src/components/StyledText';
import { useColorScheme } from 'react-native';
import Colors from '@/src/constants/Colors';
import { useSubscriptionStore } from '@/src/stores/subscriptionStore';
import { Subscription, calculateMonthlyAmount, calculateYearlyAmount } from '@/src/types/subscription';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { useTranslation } from 'react-i18next';
import i18n from '@/src/i18n';

const screenWidth = Dimensions.get('window').width;

export default function StatisticsScreen() {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<'mes'|'año'>('mes');
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // Datos del store
  const subscriptions = useSubscriptionStore(s => s.subscriptions);
  const getTotalMonthly = useSubscriptionStore(s => s.getTotalMonthlyAmount);
  const getTotalYearly = useSubscriptionStore(s => s.getTotalYearlyAmount);
  const totalMonthly = getTotalMonthly();
  const totalYearly = getTotalYearly();
  const currencySymbol = useSettingsStore(s => s.currencySymbol);

  // Helper para colores de categoría
  const categories = [
  'Casa', 'Entretenimiento', 'Cultura', 
  'Deporte','Música','Mobilidad',
  'Productividad','Noticias','Gaming',
  'Comida','Trabajo','Educación','Otros'
];

const subColor = (cat: string) => {
  const idx = categories.indexOf(cat);
  if (idx === -1) return 'hsl(0, 0%, 80%)';

  const total = categories.length;
  // Hue repartido uniformemente:
  const hue = Math.round((360 * idx) / total);
  // Saturación varía entre 50% y 80% para diferenciar:
  const saturation = 50 + ((idx * 15) % 30);  // 50, 65, 80, 65, 80,...
  // Luminosidad varía entre 70% y 85%:
  const lightness = 40 + ((Math.floor(idx / 4) * 5) % 15); // 70,75,80,85,...

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

  // Datos de tendencia según periodo
  const trendData = useMemo(() => {
    const now = new Date();
    const points: { label: string; amount: number }[] = [];
    if (selectedPeriod === 'mes') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString(i18n.language, { month: 'short' });
        const sum = subscriptions
          .filter(sub => {
            const start = new Date(sub.startDate);
            return (
              start.getFullYear() < d.getFullYear() ||
              (start.getFullYear() === d.getFullYear() && start.getMonth() <= d.getMonth())
            );
          })
          .reduce((acc, sub) => acc + calculateMonthlyAmount(sub.price, sub.frequency), 0);
        points.push({ label, amount: sum });
      }
    } else {
      const currentYear = now.getFullYear();
      for (let y = currentYear - 5; y <= currentYear; y++) {
        const label = String(y);
        const sum = subscriptions
          .filter(sub => new Date(sub.startDate).getFullYear() <= y)
          .reduce((acc, sub) => acc + calculateYearlyAmount(sub.price, sub.frequency), 0);
        points.push({ label, amount: sum });
      }
    }
    return points;
  }, [subscriptions, selectedPeriod]);

  // Cambio promedio
  const averageChange = useMemo(() => {
    if (trendData.length < 2) return 0;
    const first = trendData[0].amount;
    const last = trendData[trendData.length - 1].amount;
    return +((last - first) / (trendData.length - 1)).toFixed(2);
  }, [trendData]);

  // Datos por categoría según periodo
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    subscriptions.forEach(sub => {
      const val = selectedPeriod === 'mes'
        ? calculateMonthlyAmount(sub.price, sub.frequency)
        : calculateYearlyAmount(sub.price, sub.frequency);
      const key = sub.category || 'Sin categoría';
      map[key] = (map[key] || 0) + val;
    });
    const total = selectedPeriod === 'mes' ? totalMonthly : totalYearly;
    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
      color: subColor(name),
      percentage: total ? +(value / total * 100).toFixed(1) : 0
    }));
  }, [subscriptions, selectedPeriod, totalMonthly, totalYearly]);

  // Insight: pago más caro
  const highestPayment = useMemo(() => {
    if (!subscriptions.length) return null;
    return subscriptions
      .map(sub => ({
        id: sub.id,
        name: sub.name,
        amount: selectedPeriod==='mes'
          ? calculateMonthlyAmount(sub.price, sub.frequency)
          : calculateYearlyAmount(sub.price, sub.frequency)
      }))
      .reduce((a,b) => a.amount>=b.amount? a: b);
  }, [subscriptions, selectedPeriod]);

  // Insight: categoría dominante
  const dominantCategory = useMemo(() => {
    if (!categoryData.length) return null;
    return categoryData.reduce((a,b) => a.value>=b.value? a: b);
  }, [categoryData]);

  // Próximos pagos
  const upcoming = useMemo(() => {
    const today = new Date();
    return subscriptions
      .map(sub => ({
        ...sub,
        days: Math.ceil((new Date(sub.nextPaymentDate).getTime() - today.getTime())/86400000),
        amount: selectedPeriod==='mes'
          ? calculateMonthlyAmount(sub.price, sub.frequency)
          : calculateYearlyAmount(sub.price, sub.frequency)
      }))
      .sort((a,b) => a.days - b.days)
      .slice(0,5);
  }, [subscriptions, selectedPeriod]);

  // Configuración de gráficos
  const pieData = categoryData.map(c => ({ name: c.name, population: c.value, color: c.color, legendFontColor: theme.text, legendFontSize: 12 }));
  const lineData = { labels: trendData.map(p=>p.label), datasets: [{ data: trendData.map(p=>p.amount) }] };

  const accumulatedData = useMemo(() => {
    const now = new Date();
    return subscriptions.map(sub => {
      const start = new Date(sub.startDate);
      let count = 0;
      switch (sub.frequency) {
        case 'mensual':
          count =
            (now.getFullYear() - start.getFullYear()) * 12 +
            (now.getMonth() - start.getMonth());
          if (now.getDate() >= start.getDate()) count++;
          break;
        case 'anual':
          count = now.getFullYear() - start.getFullYear();
          if (
            now.getMonth() > start.getMonth() ||
            (now.getMonth() === start.getMonth() &&
              now.getDate() >= start.getDate())
          )
            count++;
          break;
        case 'semanal':
          count =
            Math.floor(
              (now.getTime() - start.getTime()) / (7 * 24 * 3600 * 1000)
            ) + 1;
          break;
        case 'diario':
          count =
            Math.floor(
              (now.getTime() - start.getTime()) / (24 * 3600 * 1000)
            ) + 1;
          break;
      }
      const perPeriod =
        selectedPeriod === 'mes'
          ? calculateMonthlyAmount(sub.price, sub.frequency)
          : calculateMonthlyAmount(sub.price, sub.frequency);
      return { ...sub, totalSpent: perPeriod * count };
    });
  }, [subscriptions, selectedPeriod]);

  // ➕ Suscripción con mayor gasto acumulado
  const mostAccumulated = useMemo(() => {
    if (!accumulatedData.length) return null;
    return accumulatedData.reduce((a, b) =>
      a.totalSpent >= b.totalSpent ? a : b
    );
  }, [accumulatedData]);

  // ⏳ Suscripción más antigua
  const oldestSubscription = useMemo(() => {
    if (!subscriptions.length) return null;
    return subscriptions.reduce((a, b) =>
      new Date(a.startDate) <= new Date(b.startDate) ? a : b
    );
  }, [subscriptions]);
  
  const periodLabels = {
    mes: t('period.month'),
    año: t('period.year'),
  };

  return (
    <SafeAreaView style={[styles.container,{backgroundColor:theme.background}]}>      
      <StatusBar barStyle={colorScheme==='dark'?'light-content':'dark-content'} />

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
      {/* Selector fijo */}
      <View> 
        <View style={[styles.selectorContainer,{backgroundColor:theme.tabIconDefault, borderRadius:24}]}>
        {(['mes','año'] as Array<'mes' | 'año'>).map(p=> (
          <TouchableOpacity key={p} style={[styles.tab, selectedPeriod===p && { backgroundColor: theme.card, elevation: 2 }]} onPress={()=>setSelectedPeriod(p)}>
            <AppText weight={selectedPeriod===p?'semibold':'medium'} size={14} style={{color: selectedPeriod===p?theme.tint:theme.text}}>
              {periodLabels[p]}
            </AppText>
          </TouchableOpacity>
        ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick stats */}
        <View style={styles.cardsRow}>
          <View style={[styles.statCard,{backgroundColor:theme.card}]}>            
            <AppText weight="medium" size={12} style={{color:theme.text}}>
              {t('total_' + selectedPeriod)}
            </AppText>
            <AppText weight="bold" size={20} style={{color:theme.text}}>{(selectedPeriod==='mes'?totalMonthly:totalYearly).toFixed(2)}{currencySymbol}</AppText>
            <Ionicons name="cash-outline" size={24} color={theme.tint} />
          </View>
          <View style={[styles.statCard,{backgroundColor:theme.card}]}>            
            <AppText weight="medium" size={12} style={{color:theme.text}}>{t('payments')}</AppText>
            <AppText weight="bold" size={20} style={{color:theme.text}}>{subscriptions.length}</AppText>
            <Ionicons name="list-outline" size={24} color={theme.tint} />
          </View>
        </View>

        {/* Pie chart + legend */}
        <View style={[styles.chartCard,{backgroundColor:theme.card}]}>   
          <AppText
            weight="semibold"
            size={20}
            style={{ color: theme.text, marginBottom: 8 }}
          >
            {t('category_distribution')}
          </AppText>       
          <PieChart key={selectedPeriod} data={pieData} hasLegend={false} width={screenWidth-32} height={180} chartConfig={{color:()=>theme.background}} accessor="population" backgroundColor="transparent" paddingLeft={`${screenWidth / 5}`} absolute />
          {[...categoryData]
          .sort((a, b) => b.value - a.value)    // Ordena de mayor a menor por `value`
          .map(c => (
            <View key={c.name} style={styles.legendItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.legendDot, { backgroundColor: c.color }]} />
                <AppText weight="medium" size={16} style={{ color: theme.text }}>
                  {t('category.' + c.name)}
                </AppText>
              </View>
              <View>
                <AppText weight="semibold" size={16} style={{ color: theme.text }}>
                  {c.value.toFixed(2)}{currencySymbol}
                </AppText>
                <AppText size={14} style={{ color: theme.tabIconDefault }}>
                  ({c.percentage}%)
                </AppText>
              </View>
            </View>
          ))
        }
        </View>

        {/* Trend chart + average change */}
        <View style={[styles.chartCard,{backgroundColor:theme.card}]}>  
          <AppText
            weight="semibold"
            size={20}
            style={{ color: theme.text, marginBottom: 15 }}
          >
            {t('trend_' + (selectedPeriod === 'mes' ? 'monthly' : 'yearly'))}
          </AppText>    
          <LineChart 
            data={lineData} 
            width={screenWidth-50} 
            height={180} 
            withInnerLines={false} 
            withHorizontalLines={false} 
            chartConfig={{
              backgroundGradientFrom:theme.card,
              backgroundGradientTo:theme.card,
              decimalPlaces:2,
              color:()=>theme.tint,
              propsForDots: {
              r: "5",
              strokeWidth: "2",
              stroke: theme.tint,
            }}} bezier />
            {/* Leyenda de nuevas suscripciones por mes */}
            {selectedPeriod === 'mes' && (() => {
              const now = new Date();
              return trendData.map((point, idx) => {
                // Calcula el mes/año correspondiente
                const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
                // Busca suscripciones que empiezan en ese mes
                const newSubs = subscriptions
                  .filter(sub => {
                    const start = new Date(sub.startDate);
                    return start.getFullYear() === d.getFullYear() && start.getMonth() === d.getMonth();
                  })
                  .map(sub => sub.name);
                if (newSubs.length === 0) return null;
                return (
                  <AppText key={idx} style={{ color: theme.text, fontSize: 12, marginTop: 7, marginHorizontal: 30 }}>
                    {point.label}: + {newSubs.join(', ')}
                  </AppText>
                );
              });
            })()}
          
        </View>

        {/* Insights: pago más caro y categoría dominante */}
        <View style={[styles.chartCard,{backgroundColor:theme.card}]}>          
          {highestPayment && (
            <View style={styles.insightItem}>
              <Ionicons name="star" size={16} color="#FF6B6B" />
              <AppText weight="medium" size={14} style={{color: theme.text, marginLeft: 8}}>
                <AppText weight="bold">{highestPayment.name}</AppText> {t('insight.highest_payment', { amount: highestPayment.amount.toFixed(2), currency: currencySymbol })}
              </AppText>
            </View>
          )}
          {dominantCategory && (
            <View style={styles.insightItem}>
              <Ionicons name="trending-up" size={16} color="#4ECDC4" />
              <AppText weight="medium" size={14} style={{color: theme.text, marginLeft: 8}}>
                <AppText weight="bold">{t('category.' + dominantCategory.name)}</AppText> {t('insight.dominant_category', { percentage: dominantCategory.percentage })}
              </AppText>
            </View>
          )}
          {mostAccumulated && (
            <View style={styles.insightItem}>
              <Ionicons name="bar-chart" size={16} color="#FFA500" />
              <AppText weight="medium" size={14} style={{ color: theme.text, marginLeft: 8 }}>
                <AppText weight="bold">{mostAccumulated.name}</AppText> {t('insight.most_accumulated', { amount: mostAccumulated.totalSpent.toFixed(2), currency: currencySymbol })}
              </AppText>
            </View>
          )}
          {oldestSubscription && (
            <View style={styles.insightItem}>
              <Ionicons name="time-outline" size={16} color="#3498DB" />
              <AppText weight="medium" size={14} style={{ color: theme.text, marginLeft: 8 }}>
                <AppText weight="bold">{oldestSubscription.name}</AppText> {t('insight.oldest_subscription', { date: new Date(oldestSubscription.startDate).toLocaleDateString(i18n.language) })}
              </AppText>
            </View>
          )}
        </View>
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  selectorContainer: { 
    marginHorizontal:20,
    flexDirection: 'row', 
    paddingHorizontal:5, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: { flex:1, alignItems:'center', paddingVertical:8, borderBottomWidth:2, borderBottomColor:'transparent', borderRadius:18, marginVertical:4 },
  content: { padding:16 },
  cardsRow: { flexDirection:'row', justifyContent:'space-between', marginBottom:16 },
  statCard: { flex:1, borderRadius:12, padding:12, marginRight:8, alignItems:'center',shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2, },
  chartCard: { borderRadius:12, padding:12, marginBottom:16,shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2, },
  legendItem: { flexDirection:'row', alignItems:'center', marginTop:8, justifyContent:'space-between' },
  legendDot: { width:12, height:12, borderRadius:6, marginRight:8 },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingRight:10,

  },
  bottomSpacing: { height: 60 },
});
