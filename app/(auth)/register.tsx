import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      Alert.alert('Hata', error.message);
      return;
    }
    if (data.user) {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await supabase.from('profiles').insert({
        id: data.user.id,
        display_name: displayName,
        invite_code: inviteCode,
      });
    }
    setLoading(false);
    Alert.alert('Başarılı', 'Hesabın oluşturuldu! Giriş yapabilirsin.');
    router.replace('/(auth)/login');
  }

  return (
  <KeyboardAvoidingView 
    style={{ flex: 1 }} 
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.title}>Kayıt Ol 💕</Text>
        <TextInput
          style={styles.input}
          placeholder="İsim"
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Şifre"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Kaydediliyor...' : 'Kayıt Ol'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.link}>Zaten hesabın var mı? Giriş yap</Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  </KeyboardAvoidingView>
);
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: Colors.primaryLight },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 32, color: Colors.black },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: Colors.white },
  button: { backgroundColor: Colors.primary, padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  link: { textAlign: 'center', color: Colors.primary },
});