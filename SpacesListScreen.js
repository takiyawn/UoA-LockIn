import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from './supabase';
import { useTheme } from './ThemeContext';
import Skeleton from './Skeleton';
import { FONTS } from './fonts';

const NOISE_LEVELS = ['Any', 'Silent', 'Quiet', 'Moderate', 'Loud'];

function SpaceCard({ space, onPress, isFav, onToggleFav, theme }) {
  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: theme.card }]} onPress={onPress}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[styles.cardTitle, { color: theme.text, flex: 1 }]}>{space.name}</Text>
        <TouchableOpacity onPress={onToggleFav}>
          <Text style={{ fontSize: 20 }}>{isFav ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.cardSub, { color: theme.sub }]}>{space.building}</Text>
      {space.avgRating && (
        <Text style={{ color: theme.amber, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
          ★ {space.avgRating}
        </Text>
      )}

      {space.occupancy && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: space.occupancy === 'busy' ? theme.red : theme.green }} />
          <Text style={{ color: theme.sub, fontSize: 12 }}>{space.occupancy === 'busy' ? 'Busy' : 'Quiet'} right now</Text>
        </View>
      )}

      <View style={styles.tags}>
        <Text style={[styles.tag, { backgroundColor: theme.tag, color: theme.tagText }]}>{space.noise}</Text>
        {space.wifi && <Text style={[styles.tag, { backgroundColor: theme.tag, color: theme.tagText }]}>WiFi</Text>}
        {space.power && <Text style={[styles.tag, { backgroundColor: theme.tag, color: theme.tagText }]}>Power</Text>}
      </View>
    </TouchableOpacity>
  );
}

function NoiseChips({ value, onChange, theme }) {
  return (
    <View style={styles.chipRow}>
      {NOISE_LEVELS.map(n => {
        const active = n === value;
        return (
          <TouchableOpacity
            key={n}
            onPress={() => onChange(n)}
            style={[styles.chip, { backgroundColor: active ? theme.accent : theme.tag }]}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : theme.text }}>
              {n === 'Any' ? 'All' : n}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function SpacesListScreen({ navigation, getFavourites, toggleFavourite }) {
  const { theme } = useTheme();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favourites, setFavourites] = useState([]);
  const [noise, setNoise] = useState('Any');
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  async function load() {
    const { data, error } = await supabase.from('spaces').select('*');
    if (error) console.error(error);

    const { data: ratings } = await supabase.rpc('get_space_ratings');

    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: occupancyData } = await supabase
      .from('occupancy')
      .select('space_id, status')
      .gte('created_at', cutoff);

    const occMap = {};
    for (const r of occupancyData || []) {
      if (!occMap[r.space_id]) occMap[r.space_id] = { busy: 0, quiet: 0 };
      occMap[r.space_id][r.status]++;
    }

    const avgMap = {};
    for (const r of ratings || []) {
      avgMap[r.space_id] = { total: r.avg_rating, count: r.review_count };
    }

    const spacesWithRatings = (data || []).map(s => ({
      ...s,
      avgRating: avgMap[s.id] ? avgMap[s.id].total : null,
      occupancy: occMap[s.id]
        ? (occMap[s.id].busy / (occMap[s.id].busy + occMap[s.id].quiet) > 0.5 ? 'busy' : 'quiet')
        : null,
    }));

    setSpaces(spacesWithRatings);
    const favs = await getFavourites();
    setFavourites(favs.map((f) => f.id));
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(load, 30000);
      return () => clearInterval(interval);
    }, [])
  );

  async function handleToggleFav(space) {
    const isNowFav = await toggleFavourite(space);
    setFavourites((prev) =>
      isNowFav ? [...prev, space.id] : prev.filter((id) => id !== space.id)
    );
  }

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const filtered = spaces.filter(s => {
    if (noise !== 'Any' && s.noise !== noise) return false;
    if (search.trim() && !s.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: 16 }}>
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} height={100} borderRadius={12} style={{ marginBottom: 12 }} />
        ))}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
          placeholder="Search spaces..."
          placeholderTextColor={theme.sub}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <View style={{ paddingLeft: 16, paddingTop: 12, paddingBottom: 4 }}>
        <NoiseChips value={noise} onChange={setNoise} theme={theme} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SpaceCard
            space={item}
            theme={theme}
            onPress={() => navigation.navigate('SpaceDetail', { space: item })}
            isFav={favourites.includes(item.id)}
            onToggleFav={() => handleToggleFav(item)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.sub }]}>No spaces match your filters.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 16, fontFamily: FONTS.headingSemi, marginBottom: 4 },
  cardSub: { fontSize: 13, fontFamily: FONTS.body, marginBottom: 8 },
  tags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, fontSize: 12, fontFamily: FONTS.bodyMedium },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  searchInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: FONTS.body },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14, fontFamily: FONTS.body },
});
