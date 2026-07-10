import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import GClockMark from './GClockMark';
import { FONTS } from './fonts';

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
      <View style={[styles.markWrap, { backgroundColor: theme.card }]}>
        <GClockMark size={64} color={theme.accent} />
      </View>

      <Text style={[styles.title, { color: theme.text }]}>UoA LockIn</Text>
      <Text style={[styles.sub, { color: theme.sub }]}>Track your study time. Find your spot.</Text>

      <Text style={[styles.domainNote, { color: theme.sub }]}>
        Sign in with your @aucklanduni.ac.nz account
      </Text>

      {busy ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 8 }} />
      ) : (
        <TouchableOpacity
          style={[styles.googleBtn, { backgroundColor: theme.accent }]}
          onPress={handlePress}
          activeOpacity={0.85}
        >
          <Text style={styles.googleBtnText}>Sign in with Google</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  markWrap: {
    width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  title: { fontSize: 28, fontFamily: FONTS.headingBold, marginBottom: 6, letterSpacing: -0.5 },
  sub: { fontSize: 14, fontFamily: FONTS.body, marginBottom: 28, textAlign: 'center' },
  domainNote: { fontSize: 12, fontFamily: FONTS.body, marginBottom: 16, textAlign: 'center' },
  googleBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 32,
    minWidth: 240,
    alignItems: 'center',
  },
  googleBtnText: { fontSize: 15, fontFamily: FONTS.bodySemi, color: '#fff' },
});
