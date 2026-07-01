import { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from './AuthContext';

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
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
    <View style={styles.center}>
      <Text style={styles.title}>UoA Study Spaces</Text>
      <Text style={styles.sub}>Sign in with your @aucklanduni.ac.nz account</Text>
      {busy ? <ActivityIndicator /> : <Button title="Sign in with Google" onPress={handlePress} />}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  sub: { fontSize: 13, color: '#666', marginBottom: 24, textAlign: 'center' },
});
