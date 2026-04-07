import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import ScreenWrapper from '../../components/ScreenWrapper';
import { BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

type HabitStat = {
  id: string;
  name: string;
  icon: string;
  streak: number;
  weeklyCount: number;
};

export default function ProgressScreen() {
  const [stats, setStats] = useState<HabitStat[]>([]);
  const [totalThisWeek, setTotalThisWeek] = useState(0);
  const [weeklyData, setWeeklyData] = useState<number[]>([0,0,0,0,0,0,0]);
  const [coupleScore, setCoupleScore] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: habits } = await supabase
      .from('habits')
      .select('id, name, icon')
      .eq('owner_id', user.id)
      .eq('is_archived', false);

    const { data: completions } = await supabase
      .from('completions')
      .select('habit_id, completed_date')
      .eq('user_id', user.id);

    if (!habits || !completions) return;

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);

    const habitStats = habits.map(habit => {
      const habitCompletions = completions
        .filter(c => c.habit_id === habit.id)
        .map(c => c.completed_date)
        .sort((a, b) => b.localeCompare(a));

      // streak
      let streak = 0;
      for (let i = 0; i < habitCompletions.length; i++) {
        const expected = new Date(today);
        expected.setDate(today.getDate() - i);
        if (habitCompletions[i] === expected.toISOString().split('T')[0]) streak++;
        else break;
      }

      // bu hafta
      const weeklyCount = habitCompletions.filter(d => {
        const date = new Date(d);
        return date >= weekStart && date <= today;
      }).length;

      return { ...habit, streak, weeklyCount };
    });

    setStats(habitStats);
    setTotalThisWeek(habitStats.reduce((sum, h) => sum + h.weeklyCount, 0));
    // Couple Score: bu hafta tamamlanan / bu hafta olması gereken * 100
const totalPossible = habits.length * 7;
const score = totalPossible > 0 ? Math.round((totalThisWeek / totalPossible) * 100) : 0;
setCoupleScore(score);
    const days = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return d.toISOString().split('T')[0];
});

const dailyCounts = days.map(day =>
  completions.filter(c => c.completed_date === day).length
);
setWeeklyData(dailyCounts);
  }

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>İlerleme 📊</Text>

        <View style={styles.summaryCard}>
          <View style={styles.coupleScoreCard}>
           <Text style={styles.coupleScoreLabel}>💕 Couple Score</Text>
            <Text style={styles.coupleScoreNumber}>{coupleScore}</Text>
          <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${coupleScore}%` }]} />
           </View>
          <Text style={styles.coupleScoreHint}>Bu hafta tutarlılık puanın</Text>
          </View>
          <Text style={styles.summaryNumber}>{totalThisWeek}</Text>
          <Text style={styles.summaryLabel}>Bu hafta tamamlanan</Text>
        </View>
        <Text style={styles.sectionTitle}>Bu Hafta</Text>
<BarChart
  data={{
    labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
    datasets: [{ data: weeklyData }],
  }}
  width={Dimensions.get('window').width - 48}
  height={180}
  chartConfig={{
    backgroundColor: Colors.white,
    backgroundGradientFrom: Colors.white,
    backgroundGradientTo: Colors.white,
    color: () => Colors.primary,
    labelColor: () => Colors.gray,
    barPercentage: 0.6,
  }}
  style={{ borderRadius: 12, marginBottom: 24 }}
  showValuesOnTopOfBars
  withInnerLines={false}
  yAxisLabel=""
  yAxisSuffix=""
/>

        <Text style={styles.sectionTitle}>Alışkanlık Streakları</Text>

        {stats.map(habit => (
          <View key={habit.id} style={styles.statCard}>
            <Text style={styles.habitIcon}>{habit.icon}</Text>
            <View style={styles.habitInfo}>
              <Text style={styles.habitName}>{habit.name}</Text>
              <Text style={styles.habitWeekly}>Bu hafta: {habit.weeklyCount} gün</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {habit.streak}</Text>
            </View>
          </View>
        ))}

        {stats.length === 0 && (
          <Text style={styles.empty}>Henüz alışkanlık yok.</Text>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.black, marginTop: 16, marginBottom: 24 },
  summaryCard: { backgroundColor: Colors.primary, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  summaryNumber: { fontSize: 48, fontWeight: 'bold', color: Colors.white },
  summaryLabel: { fontSize: 14, color: Colors.white, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.black, marginBottom: 12 },
  statCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  habitIcon: { fontSize: 32, marginRight: 16 },
  habitInfo: { flex: 1 },
  habitName: { fontSize: 15, fontWeight: '600', color: Colors.black },
  habitWeekly: { fontSize: 13, color: Colors.gray, marginTop: 2 },
  streakBadge: { backgroundColor: Colors.primaryLight, borderRadius: 8, padding: 8 },
  streakText: { fontSize: 14, fontWeight: 'bold', color: Colors.primaryDark },
  empty: { textAlign: 'center', color: Colors.gray, marginTop: 48 },
  coupleScoreCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 20, marginBottom: 24 },
  coupleScoreLabel: { fontSize: 14, color: Colors.gray, marginBottom: 4 },
  coupleScoreNumber: { fontSize: 42, fontWeight: 'bold', color: Colors.primary, marginBottom: 12 },
  progressBar: { height: 8, backgroundColor: Colors.primaryLight, borderRadius: 4, marginBottom: 8 },
  progressFill: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  coupleScoreHint: { fontSize: 12, color: Colors.gray },
});