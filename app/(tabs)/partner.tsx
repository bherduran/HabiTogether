import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import ScreenWrapper from '../../components/ScreenWrapper';

type Profile = {
  id: string;
  display_name: string;
  invite_code: string;
  partner_id: string | null;
};

type Habit = {
  id: string;
  name: string;
  icon: string;
  category: string;
};

export default function PartnerScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null);
  const [partnerHabits, setPartnerHabits] = useState<Habit[]>([]);
  const [inviteInput, setInviteInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  loadProfile();
  }, []);

    
  useEffect(() => {
    if (!partnerProfile) return;

    const channel = supabase
    .channel('partner-completions')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'completions',
    }, () => {
      if (partnerProfile) loadPartner(partnerProfile.id);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data);
      if (data.partner_id) loadPartner(data.partner_id);
    }
  }

  async function loadPartner(partnerId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', partnerId)
      .single();
    if (data) setPartnerProfile(data);

    const { data: habits } = await supabase
      .from('habits')
      .select('*')
      .eq('owner_id', partnerId)
      .eq('is_archived', false);
    if (habits) setPartnerHabits(habits);
  }

  async function linkPartner() {
    if (!inviteInput.trim()) return;
    setLoading(true);

    const { data: partnerData } = await supabase
      .from('profiles')
      .select('id')
      .eq('invite_code', inviteInput.trim().toUpperCase())
      .single();

    if (!partnerData) {
      Alert.alert('Hata', 'Geçersiz kod');
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('profiles').update({ partner_id: partnerData.id }).eq('id', user.id);
    await supabase.from('profiles').update({ partner_id: user.id }).eq('id', partnerData.id);

    setLoading(false);
    Alert.alert('Başarılı', 'Partner bağlandı! 💕');
    loadProfile();
  }

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Partner 💕</Text>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Davet Kodun</Text>
          <Text style={styles.code}>{profile?.invite_code}</Text>
          <Text style={styles.codeHint}>Partnerine bu kodu ver</Text>
        </View>

        {!partnerProfile ? (
          <View style={styles.linkSection}>
            <Text style={styles.sectionTitle}>Partner Bağla</Text>
            <TextInput
              style={styles.input}
              placeholder="Partner kodunu gir"
              value={inviteInput}
              onChangeText={setInviteInput}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.button} onPress={linkPartner} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Bağlanıyor...' : 'Bağlan'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={styles.partnerCard}>
              <Text style={styles.partnerName}>👤 {partnerProfile.display_name}</Text>
              <Text style={styles.partnerStatus}>Bağlı ✓</Text>
            </View>

            <Text style={styles.sectionTitle}>Partnerinin Alışkanlıkları</Text>
            {partnerHabits.map(habit => (
              <View key={habit.id} style={styles.habitCard}>
                <Text style={styles.habitIcon}>{habit.icon}</Text>
                <Text style={styles.habitName}>{habit.name}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.black, marginTop: 16, marginBottom: 24 },
  codeCard: { backgroundColor: Colors.primary, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  codeLabel: { fontSize: 14, color: Colors.white, opacity: 0.8 },
  code: { fontSize: 36, fontWeight: 'bold', color: Colors.white, letterSpacing: 6, marginVertical: 8 },
  codeHint: { fontSize: 12, color: Colors.white, opacity: 0.7 },
  linkSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.black, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, backgroundColor: Colors.white, marginBottom: 12, fontSize: 16, letterSpacing: 2 },
  button: { backgroundColor: Colors.primary, padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  partnerCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  partnerName: { fontSize: 16, fontWeight: '600', color: Colors.black },
  partnerStatus: { fontSize: 14, color: Colors.primary },
  habitCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 8 },
  habitIcon: { fontSize: 28, marginRight: 12 },
  habitName: { fontSize: 15, color: Colors.black },
});