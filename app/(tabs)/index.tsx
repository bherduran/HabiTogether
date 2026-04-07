import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import { router } from 'expo-router';


export default function HomeScreen() {
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
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
    getProfile();
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: Colors.primaryLight },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 48 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: Colors.black, marginTop: 48 },
  subtitle: { fontSize: 16, color: Colors.gray, marginTop: 8 },
  addButton: { backgroundColor: Colors.primary, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: Colors.white, fontSize: 28, lineHeight: 32 },
});