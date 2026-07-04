import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { supabase } from './supabase';
import { useTheme } from './ThemeContext';

const NOISE_LEVELS = ['Any', 'Silent', 'Quiet', 'Moderate', 'Loud'];
const BUILDINGS = ['Any', 'City Campus', 'Engineering', 'Grafton Campus', 'Owen G Glenn', 'Science Campus'];

function SpaceCard({ space, onPress, isFav, onToggleFav }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: theme.card }]} onPress={onPress}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[styles.cardTitle, { color: theme.text, flex: 1 }]}>{space.name}</Text>
        <TouchableOpacity onPress={onToggleFav}>
          <Text style={{ fontSize: 20 }}>{isFav ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.cardSub, { color: theme.sub }]}>{space.building}</Text>
      <View style={styles.tags}>
        <Text style={[styles.tag, { backgroundColor: theme.tag, color: theme.tagText }]}>{space.noise}</Text>
        {space.wifi && <Text style={[styles.tag, { backgroundColor: theme.tag, color: theme.tagText }]}>WiFi</Text>}
        {space.power && <Text style={[styles.tag, { backgroundColor: theme.tag, color: theme.tagText }]}>Power</Text>}
      </View>
    </TouchableOpacity>
  );
}

function Dropdown({ label, value, options, onChange, theme }) {
  const [open, setOpen] = useState(false);
  const isActive = value !== 'Any';

  return (
    <>
      <TouchableOpacity
        style={[styles.dropdown, { backgroundColor: theme.card, borderColor: isActive ? '#007AFF' : theme.border }]}
        onPress={() => setOpen(true)}
      >
        <Text style={[styles.dropdownText, { color: isActive ? '#007AFF' : theme.text }]} numberOfLines={1}>
          {value === 'Any' ? label : value}
        </Text>
        <Text style={{ color: isActive ? '#007AFF' : theme.sub, fontSize: 10 }}>▼</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[styles.dropdownMenu, { backgroundColor: theme.card }]}>
            <Text style={[styles.dropdownMenuTitle, { color: theme.sub }]}>{label}</Text>
            {options.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.dropdownOption, { borderBottomColor: theme.border }]}
                onPress={() => { onChange(opt === value ? 'Any' : opt); setOpen(false); }}
              >
                <Text style={[styles.dropdownOptionText, { color: theme.text }]}>
                  {opt === 'Any' ? `All ${label}s` : opt}
                </Text>
                {value === opt && <Text style={{ color: '#007AFF' }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function SpacesListScreen({ navigation, getFavourites, toggleFavourite }) {
  const { theme } = useTheme();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favourites, setFavourites] = useState([]);
  const [noise, setNoise] = useState('Any');
  const [building, setBuilding] = useState('Any');

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('spaces').select('*');
      if (error) console.error(error);
      else setSpaces(data);
      const favs = await getFavourites();
      setFavourites(favs.map((f) => f.id));
      setLoading(false);
    }
    load();
  }, []);

  async function handleToggleFav(space) {
    const isNowFav = await toggleFavourite(space);
    setFavourites((prev) =>
      isNowFav ? [...prev, space.id] : prev.filter((id) => id !== space.id)
    );
  }

  const filtered = spaces.filter(s => {
    if (noise !== 'Any' && s.noise !== noise) return false;
    if (building !== 'Any' && s.building !== building) return false;
    return true;
  });

  if (loading) return <View style={[styles.center, { backgroundColor: theme.bg }]}><ActivityIndicator /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.filterBar, { borderBottomColor: theme.border }]}>
        <Dropdown label="Noise Level" value={noise} options={NOISE_LEVELS} onChange={setNoise} theme={theme} />
        <Dropdown label="Building" value={building} options={BUILDINGS} onChange={setBuilding} theme={theme} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SpaceCard
            space={item}
            onPress={() => navigation.navigate('SpaceDetail', { space: item })}
            isFav={favourites.includes(item.id)}
            onToggleFav={() => handleToggleFav(item)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.sub }]}>No spaces match your filters.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardSub: { fontSize: 13, marginBottom: 8 },
  tags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, fontSize: 12 },
  filterBar: { flexDirection: 'row', gap: 10, padding: 12, borderBottomWidth: 1 },
  dropdown: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  dropdownText: { fontSize: 13, fontWeight: '500', flex: 1, marginRight: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  dropdownMenu: { borderRadius: 14, overflow: 'hidden' },
  dropdownMenuTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 1, padding: 16, paddingBottom: 8 },
  dropdownOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  dropdownOptionText: { fontSize: 16 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});