import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import ScreenWrapper from '../../components/ScreenWrapper';

const FOCUS_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;

export default function FocusScreen() {
  const [seconds, setSeconds] = useState(FOCUS_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  async function handleTimerEnd() {
    setIsRunning(false);
    if (!isBreak) {
      setSessionsCompleted(prev => prev + 1);
      await saveSession();
      setIsBreak(true);
      setSeconds(BREAK_DURATION);
    } else {
      setIsBreak(false);
      setSeconds(FOCUS_DURATION);
    }
  }

  async function saveSession() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('focus_sessions').insert({
      user_id: user.id,
      duration_min: 25,
      status: 'completed',
      started_at: new Date().toISOString(),
    });
  }

  function reset() {
    setIsRunning(false);
    setIsBreak(false);
    setSeconds(FOCUS_DURATION);
  }

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progress = isBreak
    ? (BREAK_DURATION - seconds) / BREAK_DURATION
    : (FOCUS_DURATION - seconds) / FOCUS_DURATION;

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Odak Modu ⏱️</Text>
        <Text style={styles.modeLabel}>{isBreak ? '☕ Mola' : '🎯 Odak'}</Text>

        <View style={styles.timerCircle}>
          <Text style={styles.timerText}>
            {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.resetButton} onPress={reset}>
            <Text style={styles.resetText}>↺</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.playButton} onPress={() => setIsRunning(prev => !prev)}>
            <Text style={styles.playText}>{isRunning ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sessionsText}>Bugün tamamlanan: {sessionsCompleted} oturum</Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.black, marginBottom: 8 },
  modeLabel: { fontSize: 16, color: Colors.gray, marginBottom: 48 },
  timerCircle: {
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: Colors.white, borderWidth: 6,
    borderColor: Colors.primary, alignItems: 'center',
    justifyContent: 'center', marginBottom: 48,
    shadowColor: Colors.primary, shadowOpacity: 0.2,
    shadowRadius: 20, elevation: 8,
  },
  timerText: { fontSize: 52, fontWeight: 'bold', color: Colors.black },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  playButton: { backgroundColor: Colors.primary, width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  playText: { fontSize: 28 },
  resetButton: { backgroundColor: Colors.primaryLight, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  resetText: { fontSize: 24, color: Colors.primary },
  sessionsText: { marginTop: 48, fontSize: 14, color: Colors.gray },
});