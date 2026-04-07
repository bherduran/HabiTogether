import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

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
      <Text style={styles.greeting}>Merhaba, {displayName} 👋</Text>
      <Text style={styles.subtitle}>Bugünkü alışkanlıkların</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: Colors.primaryLight },
  greeting: { fontSize: 24, fontWeight: 'bold', color: Colors.black, marginTop: 48 },
  subtitle: { fontSize: 16, color: Colors.gray, marginTop: 8 },
});