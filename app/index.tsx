import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export default function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#4CAF50" />
    </View>
  );

  return session
    ? <Redirect href="/(tabs)/" />
    : <Redirect href="/(auth)/login" />;
}