import { useState, useEffect} from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import ThemeSwitch from './ThemeSwitch';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
 
  return (
    <View style={{ height: 160, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
      {bars.map((val, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Text style={{ fontSize: 8, color: theme.sub, marginBottom: 2 }}>
            {val > 0 ? `${val.toFixed(1)}h` : ''}
          </Text>
          <View style={{
            width: '80%',
            height: Math.max((val / max) * 120, val > 0 ? 4 : 0),
            backgroundColor: '#007AFF',
            borderRadius: 4,
          }} />
          <Text style={{ fontSize: 9, color: theme.sub, marginTop: 4 }}>{labels[i]}</Text>
        </View>
      ))}
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
    const json = await AsyncStorage.getItem('favourites');
    const favs = json ? JSON.parse(json) : [];
 
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
    const json = await AsyncStorage.getItem('favourites');
    const favs = json ? JSON.parse(json) : [];
    const updated = favs.filter(f => f.id !== space.id);
    await AsyncStorage.setItem('favourites', JSON.stringify(updated));
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
            style={{ backgroundColor: theme.card, borderRadius: 12, padding: 16, marginBottom: 10 }}
            onPress={() => navigation.navigate('Spaces', { screen: 'SpaceDetail', params: { space } })}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: theme.text, fontSize: 15 }}>{space.name}</Text>
                <Text style={{ fontSize: 12, color: theme.sub, marginTop: 2 }}>{space.building}</Text>
                {space.occupancy && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: space.occupancy === 'busy' ? '#FF3B30' : '#34C759' }} />
                    <Text style={{ color: theme.sub, fontSize: 12 }}>{space.occupancy === 'busy' ? 'Busy' : 'Quiet'} right now</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => handleUnfavourite(space)} style={{ paddingLeft: 12 }}>
                <Text style={{ fontSize: 20 }}>❤️</Text>
              </TouchableOpacity>
            </View>
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
 
  const chartData = sessions.length > 0 ? buildChartData(sessions, period) : {
    labels: ['No data'],
    datasets: [{ data: [0] }],
  };
 
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={{ padding: 16, paddingTop: 60 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 8 }}>
        <Text style={[styles.greeting, { color: theme.text, marginBottom: 0 }]}>
          Hey, {session.user.user_metadata?.full_name?.split(' ')[0] || 'there'} 👋
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ThemeSwitch value={theme.dark} onValueChange={toggle} />
          <TouchableOpacity onPress={() => {
            Alert.alert(
              session.user.user_metadata?.full_name || 'Account',
              session.user.email,
              [
                { text: 'Sign Out', style: 'destructive', onPress: signOut },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          }}>
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
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>{totalHours}h</Text>
            <Text style={[styles.statLabel, { color: theme.sub }]}>Study time</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>{totalSessions}</Text>
            <Text style={[styles.statLabel, { color: theme.sub }]}>Sessions</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>🔥 {streak}</Text>
            <Text style={[styles.statLabel, { color: theme.sub }]}>Day Streak</Text>
          </View>
        </View>
 
      {/* Chart */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>Hours studied</Text>
          <CustomBarChart data={chartData} theme={theme} />
        </View>
      )}
      <FavouritesList navigation={navigation} theme={theme} />
    </ScrollView>
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
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  statValue: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 12 },
  chartCard: { borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  chartTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  center: { height: 200, alignItems: 'center', justifyContent: 'center' },
});