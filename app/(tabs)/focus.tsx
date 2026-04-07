import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import ScreenWrapper from '../../components/ScreenWrapper';

export default function FocusScreen() {
  const [focusMin, setFocusMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [seconds, setSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [totalFocusMin, setTotalFocusMin] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [tempFocus, setTempFocus] = useState('25');
  const [tempBreak, setTempBreak] = useState('5');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [habits, setHabits] = useState<{id: string, name: string, icon: string}[]>([]);
  const [linkedHabitId, setLinkedHabitId] = useState<string | null>(null);
  const [showHabitPicker, setShowHabitPicker] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState<'idle' | 'focusing' | 'break'>('idle');
  const [partnerName, setPartnerName] = useState('');

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            handleTimerEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

    useEffect(() => {
  loadHistory();
    }, []);

  async function loadHistory() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('focus_sessions')
    .select('duration_min')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .gte('started_at', today);
  if (data) {
    setSessionsCompleted(data.length);
    setTotalFocusMin(data.reduce((sum, s) => sum + s.duration_min, 0));
  }
  }

  useEffect(() => {
  loadHabits();
}, []);

async function loadHabits() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data } = await supabase
    .from('habits')
    .select('id, name, icon')
    .eq('owner_id', user.id)
    .eq('is_archived', false);
  if (data) setHabits(data);
}

useEffect(() => {
  loadPartnerStatus();

  const channel = supabase
    .channel('partner-focus')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'focus_sessions',
    }, () => {
      loadPartnerStatus();
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, []);

async function loadPartnerStatus() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('partner_id')
    .eq('id', user.id)
    .single();

  if (!profile?.partner_id) return;

  const { data: partnerData } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', profile.partner_id)
    .single();
  if (partnerData) setPartnerName(partnerData.display_name);

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: session } = await supabase
    .from('focus_sessions')
    .select('status, started_at, duration_min')
    .eq('user_id', profile.partner_id)
    .eq('status', 'active')
    .gte('started_at', fiveMinAgo)
    .single();

  if (session) setPartnerStatus('focusing');
  else setPartnerStatus('idle');
}


  async function handleTimerEnd() {
    setIsRunning(false);
    if (!isBreak) {
      setSessionsCompleted(prev => prev + 1);
      await saveSession();
      setIsBreak(true);
      setSeconds(breakMin * 60);
    } else {
      setIsBreak(false);
      setSeconds(focusMin * 60);
    }
  }

  async function startSession() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('focus_sessions').insert({
    user_id: user.id,
    duration_min: focusMin,
    status: 'active',
    started_at: new Date().toISOString(),
    linked_habit_id: linkedHabitId,
  });
  setIsRunning(true);
}



  async function saveSession() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('focus_sessions').insert({
    user_id: user.id,
    duration_min: focusMin,
    status: 'completed',
    started_at: new Date().toISOString(),
    linked_habit_id: linkedHabitId,
  });

  if (linkedHabitId) {
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('completions').upsert({
      habit_id: linkedHabitId,
      user_id: user.id,
      completed_date: today,
    });
  }
  loadHistory();
}

  function reset() {
    setIsRunning(false);
    setIsBreak(false);
    setSeconds(focusMin * 60);
  }

  function applySettings() {
    const f = parseInt(tempFocus) || 25;
    const b = parseInt(tempBreak) || 5;
    setFocusMin(f);
    setBreakMin(b);
    setSeconds(f * 60);
    setIsRunning(false);
    setIsBreak(false);
    setShowSettings(false);
  }

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Odak Modu ⏱️</Text>
          <TouchableOpacity onPress={() => { setTempFocus(String(focusMin)); setTempBreak(String(breakMin)); setShowSettings(true); }}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.modeLabel}>{isBreak ? '☕ Mola' : '🎯 Odak'}</Text>

        <View style={styles.timerCircle}>
          <Text style={styles.timerText}>
            {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </Text>
          <Text style={styles.timerSub}>{isBreak ? `${breakMin} dk mola` : `${focusMin} dk odak`}</Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.resetButton} onPress={reset}>
            <Text style={styles.resetText}>↺</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.playButton} onPress={() => isRunning ? setIsRunning(false) : startSession()}>
            <Text style={styles.playText}>{isRunning ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
        </View>

          {partnerName ? (
         <View style={styles.partnerStatusCard}>
          <Text style={styles.partnerStatusText}>
             {partnerStatus === 'focusing' ? '🎯' : '💤'} {partnerName}:{' '}
              {partnerStatus === 'focusing' ? 'Odaklanıyor' : 'Boşta'}
          </Text>
         </View>
            ) : null}



        <Text style={styles.sessionsText}>
          Bugün: {sessionsCompleted} oturum · {totalFocusMin} dakika odak
        </Text>

<TouchableOpacity
  style={styles.habitLinkButton}
  onPress={() => setShowHabitPicker(true)}
>
  <Text style={styles.habitLinkText}>
    {linkedHabitId
      ? `🔗 ${habits.find(h => h.id === linkedHabitId)?.icon} ${habits.find(h => h.id === linkedHabitId)?.name}`
      : '🔗 Habit bağla (opsiyonel)'}
  </Text>
</TouchableOpacity>

<Modal visible={showHabitPicker} transparent animationType="slide">
  <View style={styles.modalOverlay}>
    <View style={styles.modalCard}>
      <Text style={styles.modalTitle}>Habit Seç</Text>
      <TouchableOpacity
        style={styles.habitPickerItem}
        onPress={() => { setLinkedHabitId(null); setShowHabitPicker(false); }}
      >
        <Text style={styles.habitPickerText}>❌ Bağlantıyı kaldır</Text>
      </TouchableOpacity>
      {habits.map(h => (
        <TouchableOpacity
          key={h.id}
          style={[styles.habitPickerItem, linkedHabitId === h.id && styles.habitPickerSelected]}
          onPress={() => { setLinkedHabitId(h.id); setShowHabitPicker(false); }}
        >
          <Text style={styles.habitPickerText}>{h.icon} {h.name}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity onPress={() => setShowHabitPicker(false)}>
        <Text style={styles.modalCancel}>İptal</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

        <Modal visible={showSettings} transparent animationType="slide">
          <KeyboardAvoidingView 
           style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
          <View style={styles.modalOverlay}>
           <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Süreleri Ayarla</Text>
            <Text style={styles.modalLabel}>Odak süresi (dakika)</Text>
            <TextInput
              style={styles.modalInput}
              value={tempFocus}
              onChangeText={setTempFocus}
               keyboardType="number-pad"
             />
              <Text style={styles.modalLabel}>Mola süresi (dakika)</Text>
              <TextInput
              style={styles.modalInput}
              value={tempBreak}
              onChangeText={setTempBreak}
              keyboardType="number-pad"
           />
        <TouchableOpacity style={styles.modalButton} onPress={applySettings}>
          <Text style={styles.modalButtonText}>Uygula</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowSettings(false)}>
          <Text style={styles.modalCancel}>İptal</Text>
        </TouchableOpacity>
      </View>
    </View>
  </KeyboardAvoidingView>
</Modal>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { position: 'absolute', top: 16, width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.black },
  settingsIcon: { fontSize: 24 },
  modeLabel: { fontSize: 16, color: Colors.gray, marginBottom: 48 },
  timerCircle: { width: 220, height: 220, borderRadius: 110, backgroundColor: Colors.white, borderWidth: 6, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 48, shadowColor: Colors.primary, shadowOpacity: 0.2, shadowRadius: 20, elevation: 8 },
  timerText: { fontSize: 52, fontWeight: 'bold', color: Colors.black },
  timerSub: { fontSize: 12, color: Colors.gray, marginTop: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  playButton: { backgroundColor: Colors.primary, width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  playText: { fontSize: 28 },
  resetButton: { backgroundColor: Colors.primaryLight, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  resetText: { fontSize: 24, color: Colors.primary },
  sessionsText: { marginTop: 48, fontSize: 14, color: Colors.gray },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.black, marginBottom: 16 },
  modalLabel: { fontSize: 14, color: Colors.gray, marginBottom: 6 },
  modalInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  modalButton: { backgroundColor: Colors.primary, padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  modalButtonText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  modalCancel: { textAlign: 'center', color: Colors.gray, padding: 8 },
  habitLinkButton: { marginTop: 16, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },  
  habitLinkText: { color: Colors.gray, textAlign: 'center', fontSize: 14 },
  habitPickerItem: { padding: 14, borderRadius: 8, marginBottom: 8, backgroundColor: Colors.primaryLight },
  habitPickerSelected: { backgroundColor: Colors.primary },
  habitPickerText: { fontSize: 15, color: Colors.black },
  partnerStatusCard: { marginTop: 24, padding: 12, borderRadius: 8, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  partnerStatusText: { textAlign: 'center', fontSize: 14, color: Colors.black },
});