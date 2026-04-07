import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import ScreenWrapper from '../../components/ScreenWrapper';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

export default function SettingsScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? '');
      const { data } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
      if (data) setDisplayName(data.display_name);
    }
    loadUser();
  }, []);

  async function handleLogout() {
    Alert.alert('Çıkış Yap', 'Emin misin?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        }
      }
    ]);
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Ayarlar ⚙️</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{email}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.black, marginTop: 16, marginBottom: 24 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 24, gap: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: Colors.white },
  name: { fontSize: 16, fontWeight: '600', color: Colors.black },
  email: { fontSize: 13, color: Colors.gray, marginTop: 2 },
  logoutButton: { backgroundColor: Colors.primaryLight, borderRadius: 8, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.primary },
  logoutText: { color: Colors.primary, fontWeight: 'bold', fontSize: 16 },
});