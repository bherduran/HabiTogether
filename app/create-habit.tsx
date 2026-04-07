import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/colors';
import { router, useLocalSearchParams } from 'expo-router';
import ScreenWrapper from '../components/ScreenWrapper';


const CATEGORIES = ['Sağlık', 'Spor', 'Öğrenme', 'İlişki', 'Diğer'];
const ICONS = ['💪', '📚', '🧘', '💑', '🏃', '💧', '🎯', '🌱'];
const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function CreateHabitScreen() {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [category, setCategory] = useState('Sağlık');
  const [isShared, setIsShared] = useState(false);
  const [loading, setLoading] = useState(false);
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const [frequencyType, setFrequencyType] = useState<'daily' | 'weekly' | 'custom'>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

    useEffect(() => {
  if (editId) {
    supabase.from('habits').select('*').eq('id', editId).single().then(({ data }) => {
      if (data) {
        setName(data.name);
        setIcon(data.icon);
        setCategory(data.category);
        setIsShared(data.is_shared);
      }
       
       if (data.frequency) {
  setFrequencyType(data.frequency.type);
  setSelectedDays(data.frequency.days || []);
}

    });
    }
    }, [editId]);

  async function handleCreate() {
  if (!name.trim()) return Alert.alert('Hata', 'Habit adı boş olamaz');
  setLoading(true);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (editId) {
    await supabase.from('habits').update({
      name: name.trim(), icon, category, is_shared: isShared,
    }).eq('id', editId);
  } else {
    await supabase.from('habits').insert({
      owner_id: user.id,
      name: name.trim(),
      icon,
      category,
      is_shared: isShared,
      frequency: { type: frequencyType, days: frequencyType === 'custom' ? selectedDays : [] },
    });
  }

  setLoading(false);
  router.back();
}

  return (
    <ScreenWrapper>
        <View style={styles.container}>
      <Text style={styles.title}>{editId ? 'Düzenle' : 'Yeni Alışkanlık'}</Text>

      <Text style={styles.label}>İkon Seç</Text>
      <View style={styles.iconRow}>
        {ICONS.map(i => (
          <TouchableOpacity
            key={i}
            style={[styles.iconButton, icon === i && styles.iconSelected]}
            onPress={() => setIcon(i)}
          >
            <Text style={styles.iconText}>{i}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Alışkanlık Adı</Text>
      <TextInput
        style={styles.input}
        placeholder="örn. Her gün spor yap"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Kategori</Text>
      <View style={styles.categoryRow}>
        {CATEGORIES.map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.categoryButton, category === c && styles.categorySelected]}
            onPress={() => setCategory(c)}
          >
            <Text style={[styles.categoryText, category === c && styles.categoryTextSelected]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Sıklık</Text>
<View style={styles.categoryRow}>
  {(['daily', 'weekly', 'custom'] as const).map(type => (
    <TouchableOpacity
      key={type}
      style={[styles.categoryButton, frequencyType === type && styles.categorySelected]}
      onPress={() => setFrequencyType(type)}
    >
      <Text style={[styles.categoryText, frequencyType === type && styles.categoryTextSelected]}>
        {type === 'daily' ? 'Her Gün' : type === 'weekly' ? 'Haftalık' : 'Özel Günler'}
      </Text>
    </TouchableOpacity>
  ))}
</View>

{frequencyType === 'custom' && (
  <View style={styles.categoryRow}>
    {DAYS.map((day, index) => (
      <TouchableOpacity
        key={index}
        style={[styles.dayButton, selectedDays.includes(index) && styles.dayButtonSelected]}
        onPress={() => {
          setSelectedDays(prev =>
            prev.includes(index) ? prev.filter(d => d !== index) : [...prev, index]
          );
        }}
      >
        <Text style={[styles.categoryText, selectedDays.includes(index) && styles.categoryTextSelected]}>
          {day}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
)}

      <View style={styles.sharedRow}>
        <Text style={styles.label}>Ortak Alışkanlık</Text>
        <Switch
          value={isShared}
          onValueChange={setIsShared}
          trackColor={{ true: Colors.primary }}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Kaydediliyor...' : 'Oluştur'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.cancel}>İptal</Text>
      </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.black, marginTop: 48, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.black, marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, backgroundColor: Colors.white },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconButton: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  iconSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  iconText: { fontSize: 24 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  categorySelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryText: { color: Colors.black, fontSize: 13 },
  categoryTextSelected: { color: Colors.white },
  sharedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  button: { backgroundColor: Colors.primary, padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  buttonText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  cancel: { textAlign: 'center', color: Colors.gray, marginTop: 12 },
  dayButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  dayButtonSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
});