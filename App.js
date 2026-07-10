import { useEffect, useState, useCallback } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Button, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { supabase } from './supabase';
import * as Haptics from 'expo-haptics';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider, useTheme } from './ThemeContext';
import ErrorBoundary from './ErrorBoundary';
import LoginScreen from './LoginScreen';
import TimerScreen from './TimerScreen';
import SpacesListScreen from './SpacesListScreen';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './HomeScreen';
import * as Sentry from '@sentry/react-native';
import { FONTS } from './fonts';

SplashScreen.preventAutoHideAsync().catch(() => {});

Sentry.init({
  dsn: 'https://5f53b3cb7822b0eb990e90bfd3389df7@o4511702163062784.ingest.us.sentry.io/4511702163259392',
  sendDefaultPii: true,
  enableLogs: false,
});

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

export async function getFavourites() {
  const json = await AsyncStorage.getItem('favourites');
  return json ? JSON.parse(json) : [];
}

export async function toggleFavourite(space) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const favs = await getFavourites();
  const exists = favs.find((f) => f.id === space.id);
  const updated = exists ? favs.filter((f) => f.id !== space.id) : [...favs, space];
  await AsyncStorage.setItem('favourites', JSON.stringify(updated));
  return !exists;
}

function SpaceDetailScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { space } = route.params;
  const [reviews, setReviews] = useState([]);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState('0');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    fetchReviews();
    fetchOccupancy();
    getFavourites().then((favs) => setIsFav(!!favs.find((f) => f.id === space.id)));
  }, []);

  async function fetchReviews() {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, profiles(full_name)')
      .eq('space_id', space.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) console.error(error);
    else setReviews(data);
    setLoading(false);
  }

  const [occupancy, setOccupancy] = useState(null);
  const [reporting, setReporting] = useState(false);

  async function fetchOccupancy() {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('occupancy')
      .select('status')
      .eq('space_id', space.id)
      .gte('created_at', cutoff);

    if (!data || data.length === 0) { setOccupancy(null); return; }
    const busy = data.filter(r => r.status === 'busy').length;
    setOccupancy(busy / data.length > 0.5 ? 'busy' : 'quiet');
  }

  async function reportOccupancy(status) {
    setReporting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setReporting(false); return; }
    const { error } = await supabase.from('occupancy').insert({
      space_id: space.id,
      user_id: user.id,
      status,
    });
    if (error) {
      Alert.alert('Slow down', 'You can only report once every 5 minutes per space.');
      setReporting(false);
      return;
    }
    fetchOccupancy();
    setReporting(false);
  }

  async function submitReview() {
    if (!comment.trim() || parseInt(rating) === 0) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }
    const { error } = await supabase.from('reviews').upsert({
      space_id: space.id,
      rating: parseInt(rating),
      comment: comment.trim(),
      user_id: user.id,
    }, { onConflict: 'user_id,space_id' });
    if (error) console.error(error);
    else {
      setComment('');
      setRating('0');
      fetchReviews();
    }
    setSubmitting(false);
  }

  async function handleToggleFav() {
    const isNowFav = await toggleFavourite(space);
    setIsFav(isNowFav);
  }

  return (
    <ScrollView style={[styles.detail, { backgroundColor: theme.bg }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[styles.detailTitle, { color: theme.text, flex: 1 }]}>{space.name}</Text>
        <TouchableOpacity onPress={handleToggleFav}>
          <Text style={{ fontSize: 28 }}>{isFav ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.cardSub, { color: theme.sub }]}>{space.building}</Text>
      <View style={styles.tags}>
        <Text style={[styles.tag, { backgroundColor: theme.tag, color: theme.tagText }]}>{space.noise}</Text>
        {space.wifi && <Text style={[styles.tag, { backgroundColor: theme.tag, color: theme.tagText }]}>WiFi</Text>}
        {space.power && <Text style={[styles.tag, { backgroundColor: theme.tag, color: theme.tagText }]}>Power</Text>}
        <Text style={[styles.tag, { backgroundColor: theme.tag, color: theme.tagText }]}>Floors: {space.floors}</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        {occupancy && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: occupancy === 'busy' ? theme.red : theme.green }} />
            <Text style={{ color: theme.sub, fontSize: 13 }}>{occupancy === 'busy' ? 'Usually busy' : 'Usually quiet'} right now</Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <TouchableOpacity
          style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: theme.redSoft, alignItems: 'center' }}
          onPress={() => reportOccupancy('busy')}
          disabled={reporting}
        >
          <Text style={{ color: theme.red, fontWeight: '600' }}>🔴 It's busy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: theme.greenSoft, alignItems: 'center' }}
          onPress={() => reportOccupancy('quiet')}
          disabled={reporting}
        >
          <Text style={{ color: theme.green, fontWeight: '600' }}>🟢 It's quiet</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Leave a Review</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
        placeholder="Write your review..."
        placeholderTextColor={theme.sub}
        value={comment}
        onChangeText={setComment}
        multiline
      />
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => setRating(String(star))}>
            <Text style={{ fontSize: 32, color: star <= parseInt(rating) ? theme.amber : theme.border }}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={{ backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}
        onPress={submitReview}
        disabled={submitting}
      >
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>{submitting ? 'Submitting...' : 'Submit Review'}</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Reviews</Text>
      {loading ? <ActivityIndicator color={theme.accent} /> : reviews.length === 0 ? (
        <Text style={[styles.cardSub, { color: theme.sub }]}>No reviews yet. Be the first!</Text>
      ) : (
        reviews.map((r) => (
          <View key={r.id} style={[styles.reviewCard, { backgroundColor: theme.card }]}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text, marginBottom: 4 }}>
              {r.profiles?.full_name || 'Unknown'}
            </Text>
            <Text style={[styles.reviewRating, { color: theme.amber }]}>{'★'.repeat(r.rating)}</Text>
            <Text style={[styles.reviewComment, { color: theme.text }]}>{r.comment}</Text>
            <Text style={[styles.reviewDate, { color: theme.sub }]}>{new Date(r.created_at).toLocaleDateString()}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function SpacesScreen() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="SpacesList" options={{ title: 'Study Spaces' }}>
        {(props) => (
          <SpacesListScreen
            {...props}
            getFavourites={getFavourites}
            toggleFavourite={toggleFavourite}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="SpaceDetail" component={SpaceDetailScreen} options={({ route }) => ({ title: route.params.space.name })} />
    </Stack.Navigator>
  );
}

function MapScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <WebView
        source={{ uri: 'https://maps.auckland.ac.nz' }}
        style={{ flex: 1 }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function MainApp() {
  const { session, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) return <View style={[styles.center, { backgroundColor: theme.bg }]}><ActivityIndicator color={theme.accent} /></View>;
  if (!session) return <LoginScreen />;

  const navTheme = {
    ...(theme.dark ? DarkTheme : DefaultTheme),
    colors: { ...(theme.dark ? DarkTheme.colors : DefaultTheme.colors), primary: theme.accent, background: theme.bg, card: theme.card, border: theme.border, text: theme.text },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarStyle: { backgroundColor: theme.tabBar, borderTopColor: theme.border },
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.sub,
          tabBarIcon: ({ focused, color, size }) => {
            const icons = {
              Map: focused ? 'map' : 'map-outline',
              Spaces: focused ? 'business' : 'business-outline',
              Home: focused ? 'home' : 'home-outline',
              Timer: focused ? 'timer' : 'timer-outline',
            };
            return <Ionicons name={icons[route.name]} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Map" component={MapScreen} options={{ headerShown: false }} />
        <Tab.Screen name="Spaces" component={SpacesScreen} options={{ headerShown: false }} />
        <Tab.Screen name="Home" options={{ headerShown: false }}>
          {(props) => <HomeScreen {...props} />}
        </Tab.Screen>
        <Tab.Screen name="Timer" component={TimerScreen} options={{ headerShown: true }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default Sentry.wrap(function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const onLayout = useCallback(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <View style={{ flex: 1 }} onLayout={onLayout}>
            <MainApp />
          </View>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
});

const styles = StyleSheet.create({
  detail: { padding: 16 },
  reviewCard: { borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  detailTitle: { fontSize: 22, fontFamily: FONTS.headingBold, marginBottom: 4 },
  cardSub: { fontSize: 13, marginBottom: 8 },
  tags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, fontSize: 12 },
  sectionTitle: { fontSize: 18, fontFamily: FONTS.bodySemi, marginTop: 24, marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 14 },
  reviewRating: { fontSize: 16, marginBottom: 4 },
  reviewComment: { fontSize: 14, marginBottom: 4 },
  reviewDate: { fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
