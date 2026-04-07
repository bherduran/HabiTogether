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

  useEffect(() => {
    getProfile();
    getHabits();
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
        renderItem={({ item }) => (
          <View style={styles.habitCard}>
            <Text style={styles.habitIcon}>{item.icon}</Text>
            <View style={styles.habitInfo}>
              <Text style={styles.habitName}>{item.name}</Text>
              <Text style={styles.habitCategory}>{item.category} {item.is_shared ? '· Ortak 💕' : ''}</Text>
            </View>
          </View>
        )}
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
});