import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import GClockMark from './GClockMark';

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const { theme } = useTheme();
  const [busy, setBusy] = useState(false);

  async function handlePress() {
    setBusy(true);
    try {
      const result = await signInWithGoogle();
      if (result.cancelled) {
        // user backed out of the browser, do nothing
      }
    } catch (err) {
      Alert.alert('Sign in failed', err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.center, { backgroundColor: theme.bg }]}>
      <View style={styles.mark}>
        <GClockMark size={88} color="#007AFF" />
      </View>

      <Text style={[styles.title, { color: theme.text }]}>UoA LockIn</Text>
      <Text style={[styles.sub, { color: theme.sub }]}>Track your study time. Find your spot.</Text>

      <Text style={[styles.domainNote, { color: theme.sub }]}>
        Sign in with your @aucklanduni.ac.nz account
      </Text>

      {busy ? (
        <ActivityIndicator color="#007AFF" style={{ marginTop: 8 }} />
      ) : (
        <TouchableOpacity
          style={[styles.googleBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={handlePress}
          activeOpacity={0.85}
        >
          <Text style={[styles.googleBtnText, { color: theme.text }]}>Sign in with Google</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  mark: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 6, letterSpacing: -0.5 },
  sub: { fontSize: 14, marginBottom: 28, textAlign: 'center' },
  domainNote: { fontSize: 12, marginBottom: 16, textAlign: 'center' },
  googleBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 240,
    alignItems: 'center',
  },
  googleBtnText: { fontSize: 15, fontWeight: '600' },
});