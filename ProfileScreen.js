import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Switch } from 'react-native';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', session.user.id)
      .single();
    if (error) console.error(error);
    else setProfile(data);
    setLoading(false);
  }

  if (loading) return <View style={[styles.center, { backgroundColor: theme.bg }]}><ActivityIndicator /></View>;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {profile?.avatar_url ? (
        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>{profile?.full_name?.[0]?.toUpperCase() || '?'}</Text>
        </View>
      )}

      <Text style={[styles.name, { color: theme.text }]}>{profile?.full_name || 'Unknown'}</Text>
      <Text style={[styles.email, { color: theme.sub }]}>{session.user.email}</Text>

      <View style={[styles.row, { backgroundColor: theme.card }]}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>Dark Mode</Text>
        <Switch value={theme.dark} onValueChange={toggle} />
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 100, height: 100, borderRadius: 50, marginTop: 40, marginBottom: 16 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', marginTop: 40, marginBottom: 16 },
  avatarInitial: { fontSize: 40, color: '#fff', fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  email: { fontSize: 13, marginBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 16, borderRadius: 12, marginBottom: 12 },
  rowLabel: { fontSize: 15 },
  signOutBtn: { marginTop: 16, width: '100%', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FF3B30', alignItems: 'center' },
  signOutText: { color: '#FF3B30', fontWeight: '600', fontSize: 15 },
});