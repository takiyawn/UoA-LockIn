import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';

export default function AccountSheet({ visible, onClose, name, email, onSignOut }) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.sheet, { backgroundColor: theme.card }]}>
          <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
          <Text style={[styles.email, { color: theme.sub }]}>{email}</Text>

          <TouchableOpacity
            style={[styles.signOutBtn, { backgroundColor: theme.red }]}
            onPress={() => { onClose(); onSignOut(); }}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: theme.tag }]} onPress={onClose}>
            <Text style={[styles.cancelText, { color: theme.text }]}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,12,30,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  signOutBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  signOutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
