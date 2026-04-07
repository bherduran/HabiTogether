import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/colors';
import ScreenWrapper from '../components/ScreenWrapper';
import { router, useLocalSearchParams } from 'expo-router';

type Habit = {
  id: string;
  name: string;
  icon: string;
  category: string;
  is_shared: boolean;
  is_archived: boolean;
};

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [completionDates, setCompletionDates] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    loadHabit();
    loadCompletions();
  }, []);

  async function loadHabit() {
    const { data } = await supabase.from('habits').select('*').eq('id', id).single();
    if (data) setHabit(data);
  }

  async function loadCompletions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('completions')
      .select('completed_date')
      .eq('habit_id', id)
      .eq('user_id', user.id)
      .order('completed_date', { ascending: false });
    if (data) {
      const dates = data.map(c => c.completed_date);
      setCompletionDates(dates);
      setStreak(calcStreak(dates));
    }
  }

  function calcStreak(dates: string[]) {
    if (dates.length === 0) return 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    let streak = 0;
    const startOffset = dates[0] === todayStr ? 0 : 1;
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - (i + startOffset));
      if (dates[i] === expected.toISOString().split('T')[0]) streak++;
      else break;
    }
    return streak;
  }

  async function handleArchive() {
    Alert.alert('Arşivle', 'Bu alışkanlığı arşivlemek istiyor musun?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Arşivle', style: 'destructive', onPress: async () => {
          await supabase.from('habits').update({ is_archived: true }).eq('id', id);
          router.back();
        }
      }
    ]);
  }

  async function handleDelete() {
    Alert.alert('Sil', 'Bu alışkanlığı kalıcı olarak silmek istiyor musun?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          await supabase.from('habits').delete().eq('id', id);
          router.back();
        }
      }
    ]);
  }

  // Son 30 günü üret
  const last30Days = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  return {
    date: d.toISOString().split('T')[0],
    day: d.getDate(),
  };
});

  if (!habit) return null;

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.icon}>{habit.icon}</Text>
          <Text style={styles.name}>{habit.name}</Text>
          <Text style={styles.category}>{habit.category} {habit.is_shared ? '· Ortak 💕' : ''}</Text>
        </View>

        <View style={styles.streakCard}>
          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={styles.streakLabel}>🔥 Günlük Streak</Text>
        </View>

        <Text style={styles.sectionTitle}>Son 30 Gün</Text>
<View style={styles.calendar}>
  {last30Days.map(({ date, day }) => {
    const done = completionDates.includes(date);
    return (
      <View key={date} style={[styles.calendarCell, done && styles.calendarCellDone]}>
        <Text style={[styles.calendarDayText, done && styles.calendarDayTextDone]}>
          {day}
        </Text>
      </View>
    );
  })}
</View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push({ pathname: '/create-habit', params: { editId: id } })}
        >
          <Text style={styles.editButtonText}>✏️ Düzenle</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.archiveButton} onPress={handleArchive}>
          <Text style={styles.archiveButtonText}>📦 Arşivle</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>🗑️ Sil</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  backButton: { marginTop: 8, marginBottom: 16 },
  backText: { color: Colors.primary, fontSize: 16 },
  header: { alignItems: 'center', marginBottom: 24 },
  icon: { fontSize: 56, marginBottom: 8 },
  name: { fontSize: 22, fontWeight: 'bold', color: Colors.black },
  category: { fontSize: 14, color: Colors.gray, marginTop: 4 },
  streakCard: { backgroundColor: Colors.primary, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  streakNumber: { fontSize: 48, fontWeight: 'bold', color: Colors.white },
  streakLabel: { fontSize: 14, color: Colors.white, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.black, marginBottom: 12 },
  calendar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 24 },
  calendarCell: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  calendarCellDone: { backgroundColor: Colors.primary },
  calendarDayText: { fontSize: 12, color: Colors.gray, fontWeight: '500' },
  calendarDayTextDone: { color: Colors.white, fontWeight: 'bold' },
  editButton: { backgroundColor: Colors.white, borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  editButtonText: { color: Colors.black, fontWeight: '600', fontSize: 16 },
  archiveButton: { backgroundColor: Colors.white, borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  archiveButtonText: { color: Colors.black, fontWeight: '600', fontSize: 16 },
  deleteButton: { backgroundColor: '#FFF0F0', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 32, borderWidth: 1, borderColor: '#FFCDD2' },
  deleteButtonText: { color: '#E53935', fontWeight: '600', fontSize: 16 },
});