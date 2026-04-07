import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import { router } from 'expo-router';

type Habit = {
  id: string;
  name: string;
  icon: string;
  category: string;
  is_shared: boolean;
};

export default function HomeScreen() {
  const [displayName, setDisplayName] = useState('');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<string[]>([]); // tamamlanan habit id'leri
  const [allCompletions, setAllCompletions] = useState<{habit_id: string, completed_date: string}[]>([]);
  //Determines Profiles
  async function getProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
      if (data) setDisplayName(data.display_name);
    }
  }


  //Gets Profiles Habits
  async function getHabits() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('habits')
      .select('*')
      .eq('owner_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });
    if (data) setHabits(data);
  }

  //Gets Completed Habits & Helps Streak 
  async function getCompletions() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const today = new Date().toISOString().split('T')[0];
  const { data: todayData } = await supabase
    .from('completions')
    .select('habit_id')
    .eq('user_id', user.id)
    .eq('completed_date', today);
  if (todayData) setCompletions(todayData.map(c => c.habit_id));

  const { data: allData } = await supabase
    .from('completions')
    .select('habit_id, completed_date')
    .eq('user_id', user.id);
  if (allData) setAllCompletions(allData);
  }

  //Determines A Habit Is Completed
  async function toggleCompletion(habitId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const today = new Date().toISOString().split('T')[0];
  const isCompleted = completions.includes(habitId);

  if (isCompleted) {
    await supabase.from('completions').delete()
      .eq('habit_id', habitId)
      .eq('user_id', user.id)
      .eq('completed_date', today);
    setCompletions(prev => prev.filter(id => id !== habitId));
    setAllCompletions(prev => prev.filter(c => !(c.habit_id === habitId && c.completed_date === today)));
  } else {
    await supabase.from('completions').insert({
      habit_id: habitId,
      user_id: user.id,
      completed_date: today,
    });
    setCompletions(prev => [...prev, habitId]);
    setAllCompletions(prev => [...prev, { habit_id: habitId, completed_date: today }]);
  }
}
  useEffect(() => {
    getProfile();
    getHabits();
    getCompletions();
  }, []);

  //Calculates Streak
   function calculateStreak(habitId: string, allCompletions: {habit_id: string, completed_date: string}[]) {
  const dates = allCompletions
    .filter(c => c.habit_id === habitId)
    .map(c => c.completed_date)
    .sort((a, b) => b.localeCompare(a));

  if (dates.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Bugün tamamlandıysa 0'dan, tamamlanmadıysa dünden başla
  const startOffset = dates[0] === todayStr ? 0 : 1;

  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - (i + startOffset));
    const expectedStr = expected.toISOString().split('T')[0];
    if (dates[i] === expectedStr) streak++;
    else break;
  }
  return streak;
  }

  return (
  <View style={styles.container}>
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>Merhaba, {displayName} 👋</Text>
        <Text style={styles.subtitle}>Bugünkü alışkanlıkların</Text>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={() => router.push('/create-habit')}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
    {habits.filter(h => {
  const streak = calculateStreak(h.id, allCompletions);
  const completedToday = completions.includes(h.id);
  return streak > 0 && !completedToday;
}).length > 0 && (
  <View style={styles.warningCard}>
    <Text style={styles.warningText}>
      ⚠️ {habits.filter(h => {
        const streak = calculateStreak(h.id, allCompletions);
        return streak > 0 && !completions.includes(h.id);
      }).length} streak bugün tehlikede!
    </Text>
  </View>
)}
    <FlatList
      data={habits}
      keyExtractor={item => item.id}
      contentContainerStyle={{ paddingTop: 16 }}
      ListEmptyComponent={
        <Text style={styles.empty}>Henüz alışkanlık yok. + ile ekle!</Text>
      }
      renderItem={({ item }) => {
        const isCompleted = completions.includes(item.id);
        const streak = calculateStreak(item.id, allCompletions);
        return (
          <TouchableOpacity
            style={[styles.habitCard, isCompleted && styles.habitCardCompleted]}
            onPress={() => toggleCompletion(item.id)}
          >
            <Text style={styles.habitIcon}>{item.icon}</Text>
            <View style={styles.habitInfo}>
              <Text style={[styles.habitName, isCompleted && styles.habitNameCompleted]}>{item.name}</Text>
              <Text style={styles.habitCategory}>{item.category} {item.is_shared ? '· Ortak 💕' : ''}</Text>
              {streak > 0 && <Text style={styles.streak}>🔥 {streak} gün</Text>}
            </View>
            <Text style={styles.checkbox}>{isCompleted ? '✅' : '⬜'}</Text>
          </TouchableOpacity>
        );
      }}
    />
  </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: Colors.primaryLight },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 48 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: Colors.black },
  subtitle: { fontSize: 16, color: Colors.gray, marginTop: 4 },
  addButton: { backgroundColor: Colors.primary, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: Colors.white, fontSize: 28, lineHeight: 32 },
  habitCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  habitIcon: { fontSize: 32, marginRight: 16 },
  habitInfo: { flex: 1 },
  habitName: { fontSize: 16, fontWeight: '600', color: Colors.black },
  habitCategory: { fontSize: 13, color: Colors.gray, marginTop: 2 },
  empty: { textAlign: 'center', color: Colors.gray, marginTop: 48, fontSize: 15 },
  habitCardCompleted: { opacity: 0.6 },
  habitNameCompleted: { textDecorationLine: 'line-through', color: Colors.gray },
  checkbox: { fontSize: 24 },
  streak: { fontSize: 12, color: Colors.accent, marginTop: 2, fontWeight: '600' },
  warningCard: { backgroundColor: '#FFF3E0', borderRadius: 12, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: Colors.accent },
  warningText: { color: '#E65100', fontWeight: '600', fontSize: 14 },
});