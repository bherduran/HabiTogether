import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Modal } from 'react-native';
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
  const [completions, setCompletions] = useState<string[]>([]);
  const [allCompletions, setAllCompletions] = useState<{habit_id: string, completed_date: string}[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [partnerCompletions, setPartnerCompletions] = useState<{habit_id: string, completed_date: string}[]>([]);
  const [nudgeAlert, setNudgeAlert] = useState(false);

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

  // Partner completions
  const { data: profile } = await supabase
    .from('profiles')
    .select('partner_id')
    .eq('id', user.id)
    .single();

  if (profile?.partner_id) {
    const { data: partnerData } = await supabase
      .from('completions')
      .select('habit_id, completed_date')
      .eq('user_id', profile.partner_id);
    if (partnerData) setPartnerCompletions(partnerData);
  }
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
      setAllCompletions(prev => prev.filter(c => !(c.habit_id === habitId && c.completed_date === today)));
    } else {
      await supabase.from('completions').insert({
        habit_id: habitId,
        user_id: user.id,
        completed_date: today,
      });
      setCompletions(prev => [...prev, habitId]);
      const newAllCompletions = [...allCompletions, { habit_id: habitId, completed_date: today }];
      setAllCompletions(newAllCompletions);
      const newStreak = calculateStreak(habitId, newAllCompletions);
      if ([7, 30, 100].includes(newStreak)) setMilestone(newStreak);
    }
  }

  useEffect(() => {
  getProfile();
  getHabits();
  getCompletions();

  let channel: ReturnType<typeof supabase.channel>;

  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;
    channel = supabase
      .channel('home-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'completions' }, () => getCompletions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habits' }, () => getHabits())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'nudges',
        filter: `to_user_id=eq.${user.id}`,
      }, () => {
        setNudgeAlert(true);
        setTimeout(() => setNudgeAlert(false), 5000);
      })
      .subscribe();
  });

  return () => { if (channel) supabase.removeChannel(channel); };
}, []);

  function calculateStreak(habitId: string, allCompletions: {habit_id: string, completed_date: string}[], isShared: boolean = false, partnerCompletions: {habit_id: string, completed_date: string}[] = []) {
  const dates = allCompletions
    .filter(c => c.habit_id === habitId)
    .map(c => c.completed_date)
    .sort((a, b) => b.localeCompare(a));

  if (dates.length === 0) return 0;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  let streak = 0;
  const startOffset = dates[0] === todayStr ? 0 : 1;

  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - (i + startOffset));
    const expectedStr = expected.toISOString().split('T')[0];
    if (dates[i] === expectedStr) {
      if (isShared) {
        const partnerDone = partnerCompletions.some(
          c => c.habit_id === habitId && c.completed_date === expectedStr
        );
        if (!partnerDone) break;
      }
      streak++;
    } else break;
  }
  return streak;
}

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([getProfile(), getHabits(), getCompletions()]);
    setRefreshing(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          {nudgeAlert && (
  <View style={styles.nudgeAlertCard}>
    <Text style={styles.nudgeAlertText}>👈 Partnerin seni dürtükledi!</Text>
  </View>
)}
          <Text style={styles.greeting}>Merhaba, {displayName} 👋</Text>
          <Text style={styles.subtitle}>Bugünkü alışkanlıkların</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/create-habit')}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {habits.filter(h => {
        const streak = calculateStreak(h.id, allCompletions);
        return streak > 0 && !completions.includes(h.id);
      }).length > 0 && (
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            ⚠️ {habits.filter(h => {
              const streak = calculateStreak(h.id, allCompletions, h.is_shared, partnerCompletions);
              return streak > 0 && !completions.includes(h.id);
            }).length} streak bugün tehlikede!
          </Text>
        </View>
      )}

      <FlatList
        data={habits}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingTop: 16, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Henüz alışkanlık yok. + ile ekle!</Text>
        }
        renderItem={({ item }) => {
          const isCompleted = completions.includes(item.id);
          const streak = calculateStreak(item.id, allCompletions, item.is_shared, partnerCompletions);
          return (
            <TouchableOpacity
              style={[styles.habitCard, isCompleted && styles.habitCardCompleted]}
              onPress={() => toggleCompletion(item.id)}
              onLongPress={() => router.push({ pathname: '/habit-detail', params: { id: item.id } })}
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

      <Modal visible={milestone !== null} transparent animationType="fade">
        <View style={styles.milestoneOverlay}>
          <View style={styles.milestoneCard}>
            <Text style={styles.milestoneEmoji}>🎉</Text>
            <Text style={styles.milestoneTitle}>{milestone} Gün Streak!</Text>
            <Text style={styles.milestoneText}>Harika gidiyorsun, böyle devam!</Text>
            <TouchableOpacity style={styles.milestoneButton} onPress={() => setMilestone(null)}>
              <Text style={styles.milestoneButtonText}>Teşekkürler 💕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  milestoneOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  milestoneCard: { backgroundColor: Colors.white, borderRadius: 24, padding: 32, alignItems: 'center', margin: 32 },
  milestoneEmoji: { fontSize: 64, marginBottom: 16 },
  milestoneTitle: { fontSize: 28, fontWeight: 'bold', color: Colors.primary, marginBottom: 8 },
  milestoneText: { fontSize: 16, color: Colors.gray, textAlign: 'center', marginBottom: 24 },
  milestoneButton: { backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  milestoneButtonText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  nudgeAlertCard: { backgroundColor: Colors.primary, borderRadius: 12, padding: 14, marginBottom: 12 },
  nudgeAlertText: { color: Colors.white, fontWeight: '600', fontSize: 14, textAlign: 'center' },
});