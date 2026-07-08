import { useState, useEffect} from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, TouchableOpacity, ScrollView, Image, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import ThemeSwitch from './ThemeSwitch';
import Skeleton from './Skeleton';
import * as Haptics from 'expo-haptics';
import AccountSheet from './AccountSheet';
import { getFavourites, toggleFavourite } from './App';
import { FlatList } from 'react-native';

const PERIODS = ['Day', 'Weekly', 'Monthly', 'Yearly'];
const screenWidth = Dimensions.get('window').width - 32;

function getDateRange(period) {
  const now = new Date();
  switch (period) {
    case 'Day':
      return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), slots: 24, label: (i) => `${i}h` };
    case 'Weekly':
      return { start: new Date(now - 6 * 24 * 60 * 60 * 1000), slots: 7, label: (i) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][(new Date(now - (6-i) * 24 * 60 * 60 * 1000)).getDay()] };
    case 'Monthly':
      return { 
        start: new Date(now.getFullYear(), now.getMonth(), 1), 
        slots: 4, 
        label: (i) => `W${i+1}` 
      };
    case 'Yearly':
      return { start: new Date(now.getFullYear(), 0, 1), slots: 12, label: (i) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i] };
  }
}

function buildChartData(sessions, period) {
  const now = new Date();
  const { slots, label } = getDateRange(period);
  const data = new Array(slots).fill(0);

  for (const s of sessions) {
    const d = new Date(s.completed_at);
    let idx;
    if (period === 'Day') {
      idx = d.getHours();
    } else if (period === 'Weekly') {
      const diffDays = Math.floor((now - d) / (24 * 60 * 60 * 1000));
      idx = 6 - diffDays;
    } else if (period === 'Monthly') {
      idx = Math.floor((d.getDate() - 1) / 7);
      if (idx > 3) idx = 3;
    } else if (period === 'Yearly') {
      idx = d.getMonth();
    }
    if (idx >= 0 && idx < slots) data[idx] += s.duration_minutes / 60;
  }

  // For monthly, only show every 5th label to avoid clutter
  const labels = Array.from({ length: slots }, (_, i) => {
    if (period === 'Monthly' && (i + 1) % 5 !== 0 && i !== 0) return '';
    return label(i);
  });

  return { labels, datasets: [{ data: data.map(v => parseFloat(v.toFixed(2))) }] };
}

function CustomBarChart({ data, theme }) {
  const max = Math.max(...data.datasets[0].data, 0.01);
  const bars = data.datasets[0].data;
  const labels = data.labels;
  const CHART_HEIGHT = 120;
  const LABEL_SPACE = 14;
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <View style={{ height: 160 }}>
      <View style={{ position: 'absolute', top: LABEL_SPACE, left: 0, right: 0, height: CHART_HEIGHT }}>
        {gridLines.map((frac, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              bottom: frac * CHART_HEIGHT,
              left: 0,
              right: 0,
              height: StyleSheet.hairlineWidth,
              backgroundColor: theme.border,
            }}
          />
        ))}
      </View>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
        {bars.map((val, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            <Text style={{ fontSize: 8, color: theme.sub, marginBottom: 2 }}>
              {val > 0 ? `${val.toFixed(1)}h` : ''}
            </Text>
            <View style={{
              width: '80%',
              height: val > 0 ? Math.max((val / max) * CHART_HEIGHT, 4) : 3,
              backgroundColor: val > 0 ? '#007AFF' : theme.border,
              borderRadius: 4,
            }} />
            <Text style={{ fontSize: 9, color: theme.sub, marginTop: 4 }}>{labels[i]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function FavouritesList({ navigation, theme }) {
  const [favourites, setFavourites] = useState([]);

  useEffect(() => {
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation]);

  async function load() {
    const favs = await getFavourites();

    if (favs.length === 0) { setFavourites([]); return; }

    // Fetch occupancy for favourited spaces
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: occupancyData } = await supabase
      .from('occupancy')
      .select('space_id, status')
      .in('space_id', favs.map(f => f.id))
      .gte('created_at', cutoff);

    const occMap = {};
    for (const r of occupancyData || []) {
      if (!occMap[r.space_id]) occMap[r.space_id] = { busy: 0, quiet: 0 };
      occMap[r.space_id][r.status]++;
    }

    const favsWithOccupancy = favs.map(s => ({
      ...s,
      occupancy: occMap[s.id]
        ? (occMap[s.id].busy / (occMap[s.id].busy + occMap[s.id].quiet) > 0.5 ? 'busy' : 'quiet')
        : null,
    }));

    setFavourites(favsWithOccupancy);
  }

  async function handleUnfavourite(space) {
    await toggleFavourite(space);
    load();
  }

  return (
    <View style={{ marginTop: 24 }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 12 }}>Favourite Spots</Text>
      {favourites.length === 0 ? (
        <TouchableOpacity
          style={{ backgroundColor: theme.card, borderRadius: 12, padding: 16, alignItems: 'center' }}
          onPress={() => navigation.navigate('Spaces')}
        >
          <Text style={{ color: theme.sub, fontSize: 14 }}>No favourite spots yet. Tap ❤️ on any space →</Text>
        </TouchableOpacity>
      ) : (
        favourites.map(space => (
          <TouchableOpacity
            key={space.id}
            style={{ backgroundColor: theme.card, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            onPress={() => navigation.navigate('Spaces', { screen: 'SpaceDetail', params: { space } })}
          >
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {space.occupancy && (
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: space.occupancy === 'busy' ? '#FF3B30' : '#34C759' }} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: theme.text, fontSize: 14 }}>{space.name}</Text>
                <Text style={{ fontSize: 11, color: theme.sub }}>{space.building}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => handleUnfavourite(space)} style={{ paddingLeft: 10 }}>
              <Text style={{ fontSize: 16 }}>❤️</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { session, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [period, setPeriod] = useState('Weekly');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalHours, setTotalHours] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [streak, setStreak] = useState(0);
  const [showAccountSheet, setShowAccountSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    supabase.from('profiles').select('avatar_url').eq('id', session.user.id).single()
      .then(({ data }) => { if (data) setAvatarUrl(data.avatar_url); });
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [period]);

  async function fetchSessions() {
    setLoading(true);
    const { start } = getDateRange(period);
    const { data, error } = await supabase
      .from('sessions')
      .select('duration_minutes, completed_at')
      .eq('user_id', session.user.id)
      .gte('completed_at', start.toISOString());

    if (error) { console.error(error); setLoading(false); return; }
    setSessions(data || []);
    const total = (data || []).reduce((sum, s) => sum + s.duration_minutes, 0);
    setTotalHours((total / 60).toFixed(1));
    setTotalSessions((data || []).length);

    // Fetch all sessions for streak calculation
    const { data: allSessions } = await supabase
      .from('sessions')
      .select('completed_at')
      .eq('user_id', session.user.id);

    const sessionDates = new Set(
      (allSessions || []).map(s =>
        new Date(s.completed_at).toDateString()
      )
    );

    let currentStreak = 0;

    let currentDay = new Date();
    currentDay.setHours(0, 0, 0, 0);

    // If the user hasn't studied today yet,
    // continue counting from yesterday.
    if (!sessionDates.has(currentDay.toDateString())) {
      currentDay.setDate(currentDay.getDate() - 1);
    }

    while (sessionDates.has(currentDay.toDateString())) {
      currentStreak++;
      currentDay.setDate(currentDay.getDate() - 1);
    }
    console.log("All sessions:", allSessions);
    console.log("Streak:", currentStreak);
    setStreak(currentStreak);
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchSessions();
    setRefreshing(false);
  }

  const chartData = sessions.length > 0 ? buildChartData(sessions, period) : {
    labels: ['No data'],
    datasets: [{ data: [0] }],
  };

  return (
    <>
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={{ padding: 16, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 8 }}>
        <Text style={[styles.greeting, { color: theme.text, marginBottom: 0 }]}>
          Hey, {session.user.user_metadata?.full_name?.split(' ')[0] || 'there'} 👋
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ThemeSwitch value={theme.dark} onValueChange={toggle} />
          <TouchableOpacity onPress={() => setShowAccountSheet(true)}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            ) : (
              <Ionicons name="person-circle-outline" size={36} color={theme.text} />
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Period selector */}
      <View style={styles.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, { backgroundColor: theme.tag }, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, { color: theme.tagText }, period === p && { color: '#fff' }]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

     {/* Stats */}
      {loading || refreshing ? (
        <>
          <Skeleton width="100%" height={100} borderRadius={16} style={{ marginBottom: 12 }} />
          <View style={styles.statsRow}>
            <Skeleton width={null} height={80} borderRadius={12} style={{ flex: 1 }} />
            <Skeleton width={null} height={80} borderRadius={12} style={{ flex: 1 }} />
          </View>
        </>
      ) : (
        <>
          <View style={[styles.primaryStatCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.primaryStatValue, { color: theme.text }]}>{totalHours}h</Text>
            <Text style={[styles.primaryStatLabel, { color: theme.sub }]}>Study time</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.statValue, { color: theme.text }]}>{totalSessions}</Text>
              <Text style={[styles.statLabel, { color: theme.sub }]}>Sessions</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.statValue, { color: theme.text, opacity: streak > 0 ? 1 : 0.35 }]}>🔥 {streak}</Text>
              <Text style={[styles.statLabel, { color: theme.sub }]}>Day Streak</Text>
            </View>
          </View>
        </>
      )}

      {/* Chart */}
      {loading || refreshing ? (
        <Skeleton width="100%" height={220} borderRadius={12} />
      ) : (
        <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>Hours studied</Text>
          <CustomBarChart data={chartData} theme={theme} />
        </View>
      )}
      <FavouritesList navigation={navigation} theme={theme} />
    </ScrollView>
    <AccountSheet
      visible={showAccountSheet}
      onClose={() => setShowAccountSheet(false)}
      name={session.user.user_metadata?.full_name || 'Account'}
      email={session.user.email}
      onSignOut={signOut}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  greeting: { fontSize: 24, fontWeight: '700', marginBottom: 20, marginTop: 8 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  periodBtnActive: { backgroundColor: '#007AFF' },
  periodText: { fontSize: 12, fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16, },
  primaryStatCard: { borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  primaryStatValue: { fontSize: 40, fontWeight: '800', marginBottom: 4 },
  primaryStatLabel: { fontSize: 14, fontWeight: '500' },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  statValue: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 12 },
  chartCard: { borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  chartTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  center: { height: 200, alignItems: 'center', justifyContent: 'center' },
});