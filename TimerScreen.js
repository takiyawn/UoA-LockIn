import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import { supabase } from './supabase';
import * as Haptics from 'expo-haptics';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import ProgressRing from './ProgressRing';

const PERIODS = ['Weekly', 'Monthly', 'Yearly', 'All Time'];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function TimerTab() {
  const { session } = useAuth();
  const { theme } = useTheme();
  const [workMinutes, setWorkMinutes] = useState('25');
  const [breakMinutes, setBreakMinutes] = useState('5');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);
  const intervalRef = useRef(null);
  const workSecs = parseInt(workMinutes) * 60 || 25 * 60;
  const breakSecs = parseInt(breakMinutes) * 60 || 5 * 60;

  useEffect(() => {
    fetchTodaySessions();
  }, []);

  const endTimeRef = useRef(null);

  useEffect(() => {
    if (running) {
      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + secondsLeft * 1000;
      }
      intervalRef.current = setInterval(() => {
        const remaining = Math.round((endTimeRef.current - Date.now()) / 1000);
        if (remaining <= 0) {
          clearInterval(intervalRef.current);
          setRunning(false);
          setSecondsLeft(0);
          endTimeRef.current = null;
          handleComplete();
        } else {
          setSecondsLeft(remaining);
        }
      }, 250);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  async function fetchTodaySessions() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .gte('completed_at', today.toISOString());
    setSessionsToday(count || 0);
  }

  async function handleComplete() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!isBreak) {
      const duration = parseInt(workMinutes) || 25;
      await supabase.from('sessions').insert({
        user_id: session.user.id,
        duration_minutes: duration,
      });
      setSessionsToday(prev => prev + 1);
      Alert.alert('Pomodoro complete!', 'Session logged. Take a break.');
      setIsBreak(true);
      setSecondsLeft(breakSecs);
    } else {
      Alert.alert('Break over!', 'Ready for another session?');
      setIsBreak(false);
      setSecondsLeft(workSecs);
    }
  }

  function handleStartStop() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRunning(r => {
      if (r) endTimeRef.current = null;
      return !r;
    });
  }

  function handleReset() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRunning(false);
    endTimeRef.current = null;
    setIsBreak(false);
    setSecondsLeft(workSecs);
  }

  function handleWorkChange(val) {
    const num = parseInt(val);
    const clamped = isNaN(num) ? val : Math.max(1, Math.min(180, num)).toString();
    setWorkMinutes(clamped);
    if (!running) setSecondsLeft((parseInt(clamped) || 25) * 60);
  }

  function handleBreakChange(val) {
    const num = parseInt(val);
    const clamped = isNaN(num) ? val : Math.max(1, Math.min(60, num)).toString();
    setBreakMinutes(clamped);
  }

  return (
    <ScrollView contentContainerStyle={[styles.center, { backgroundColor: theme.bg }]}>
      <View style={{ marginBottom: 8 }}>
        <ProgressRing
          progress={(isBreak ? breakSecs : workSecs) > 0 ? secondsLeft / (isBreak ? breakSecs : workSecs) : 0}
          color={isBreak ? '#34C759' : '#007AFF'}
          trackColor={theme.tag}
        />
        <View style={StyleSheet.absoluteFillObject}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[styles.modeLabel, { color: theme.sub }]}>{isBreak ? 'Break' : 'Focus'}</Text>
            <Text style={[styles.timer, { color: theme.text }]}>{formatTime(secondsLeft)}</Text>
          </View>
        </View>
      </View>
      <Text style={[styles.sub, { color: theme.sub }]}>Sessions today: {sessionsToday}</Text>

      <View style={styles.row}>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.sub }]}>Work (min)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
            value={workMinutes}
            onChangeText={handleWorkChange}
            keyboardType="numeric"
            editable={!running}
            placeholderTextColor={theme.sub}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.sub }]}>Break (min)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
            value={breakMinutes}
            onChangeText={handleBreakChange}
            keyboardType="numeric"
            editable={!running}
            placeholderTextColor={theme.sub}
          />
        </View>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, running && styles.btnStop]} onPress={handleStartStop}>
          <Text style={styles.btnText}>{running ? 'Pause' : 'Start'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.tag }]} onPress={handleReset}>
          <Text style={[styles.btnText, { color: theme.tagText }]}>Reset</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function LeaderboardTab() {
  const [period, setPeriod] = useState('Weekly');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  async function fetchLeaderboard() {
    setLoading(true);
    const now = new Date();
    let since;
    if (period === 'Weekly') {
      since = new Date(now - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'Monthly') {
      since = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    } else if (period === 'Yearly') {
      since = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    } else {
      since = new Date(0);
    }

    const { data: rowsRaw, error } = await supabase.rpc('get_leaderboard', { since: since.toISOString() });
    if (error) { console.error(error); setLoading(false); return; }

    if (!rowsRaw || rowsRaw.length === 0) { setData([]); setLoading(false); return; }

    const userIds = rowsRaw.map(r => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    const profileMap = {};
    for (const p of profiles || []) profileMap[p.id] = p;

    const rows = rowsRaw.map(row => ({ ...row, full_name: profileMap[row.user_id]?.full_name || 'Unknown' }));

    setData(rows);
    setLoading(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.periodRow, { backgroundColor: theme.bg }]}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, { backgroundColor: theme.tag }, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, { color: theme.tagText }, period === p && styles.periodTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <View style={[styles.center, { backgroundColor: theme.bg }]}><Text style={{ color: theme.text }}>Loading...</Text></View>
      ) : data.length === 0 ? (
        <View style={[styles.center, { backgroundColor: theme.bg }]}><Text style={[styles.sub, { color: theme.sub }]}>No sessions yet for this period.</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {data.map((row, i) => {
            const isMe = row.user_id === session.user.id;
            const hours = Math.floor(row.total / 60);
            const mins = row.total % 60;
            const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
            return (
              <View key={row.user_id} style={[styles.leaderRow, { backgroundColor: theme.card }, isMe && styles.leaderRowMe]}>
                <Text style={[styles.rank, { color: theme.text }]}>#{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.leaderName, { color: theme.text }]}>{isMe ? `${row.full_name} (You)` : row.full_name}</Text>
                  <Text style={[styles.leaderSub, { color: theme.sub }]}>{row.count} sessions</Text>
                </View>
                <Text style={styles.leaderTime}>{timeStr}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

export default function TimerScreen() {
  const [tab, setTab] = useState('timer');
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.tabRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'timer' && styles.tabBtnActive]} onPress={() => setTab('timer')}>
          <Text style={[styles.tabText, { color: theme.sub }, tab === 'timer' && styles.tabTextActive]}>Timer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'leaderboard' && styles.tabBtnActive]} onPress={() => setTab('leaderboard')}>
          <Text style={[styles.tabText, { color: theme.sub }, tab === 'leaderboard' && styles.tabTextActive]}>Leaderboard</Text>
        </TouchableOpacity>
      </View>
      {tab === 'timer' ? <TimerTab /> : <LeaderboardTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  modeLabel: { fontSize: 14, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  timer: { fontSize: 48, fontWeight: '700', fontVariant: ['tabular-nums'], marginBottom: 0 },
  sub: { fontSize: 13, marginBottom: 24 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  inputGroup: { alignItems: 'center' },
  inputLabel: { fontSize: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, width: 80, textAlign: 'center', fontSize: 16 },
  btn: { backgroundColor: '#007AFF', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  btnStop: { backgroundColor: '#FF3B30' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#007AFF' },
  tabText: { fontSize: 15 },
  tabTextActive: { color: '#007AFF', fontWeight: '600' },
  periodRow: { flexDirection: 'row', padding: 12, gap: 8 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  periodBtnActive: { backgroundColor: '#007AFF' },
  periodText: { fontSize: 12 },
  periodTextActive: { color: '#fff', fontWeight: '600' },
  leaderRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  leaderRowMe: { borderWidth: 2, borderColor: '#007AFF' },
  rank: { fontSize: 18, fontWeight: '700', width: 36 },
  leaderName: { fontSize: 15, fontWeight: '600' },
  leaderSub: { fontSize: 12 },
  leaderTime: { fontSize: 16, fontWeight: '700', color: '#007AFF' },
});