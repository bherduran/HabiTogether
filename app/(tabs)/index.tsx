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

  async function getCompletions() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('completions')
    .select('habit_id')
    .eq('user_id', user.id)
    .eq('completed_date', today);
  if (data) setCompletions(data.map(c => c.habit_id));
  }
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
  } else {
    await supabase.from('completions').insert({
      habit_id: habitId,
      user_id: user.id,
      completed_date: today,
    });
    setCompletions(prev => [...prev, habitId]);
  }
  }
  useEffect(() => {
    getProfile();
    getHabits();
    getCompletions();
  }, []);

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

    <FlatList
      data={habits}
      keyExtractor={item => item.id}
      contentContainerStyle={{ paddingTop: 16 }}
      ListEmptyComponent={
        <Text style={styles.empty}>Henüz alışkanlık yok. + ile ekle!</Text>
      }
      renderItem={({ item }) => {
        const isCompleted = completions.includes(item.id);
        return (
          <TouchableOpacity
            style={[styles.habitCard, isCompleted && styles.habitCardCompleted]}
            onPress={() => toggleCompletion(item.id)}
          >
            <Text style={styles.habitIcon}>{item.icon}</Text>
            <View style={styles.habitInfo}>
              <Text style={[styles.habitName, isCompleted && styles.habitNameCompleted]}>{item.name}</Text>
              <Text style={styles.habitCategory}>{item.category} {item.is_shared ? '· Ortak 💕' : ''}</Text>
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
});