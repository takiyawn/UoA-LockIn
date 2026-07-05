import { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Button, ScrollView } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider, useTheme } from './ThemeContext';
import LoginScreen from './LoginScreen';
import TimerScreen from './TimerScreen';
import ProfileScreen from './ProfileScreen';
import SpacesListScreen from './SpacesListScreen';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './HomeScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

export async function getFavourites() {
  const json = await AsyncStorage.getItem('favourites');
  return json ? JSON.parse(json) : [];
}

export async function toggleFavourite(space) {
  const favs = await getFavourites();
  const exists = favs.find((f) => f.id === space.id);
  const updated = exists ? favs.filter((f) => f.id !== space.id) : [...favs, space];
  await AsyncStorage.setItem('favourites', JSON.stringify(updated));
  return !exists;
}

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
      {space.avgRating && (
        <Text style={{ color: '#FFD700', fontSize: 13, marginBottom: 6 }}>⭐ {space.avgRating}</Text>
      )}
      <View style={styles.tags}>
        <Text style={[styles.tag, { backgroundColor: theme.tag, color: theme.tagText }]}>{space.noise}</Text>
        {space.wifi && <Text style={[styles.tag, { backgroundColor: theme.tag, color: theme.tagText }]}>WiFi</Text>}
        {space.power && <Text style={[styles.tag, { backgroundColor: theme.tag, color: theme.tagText }]}>Power</Text>}
      </View>
    </TouchableOpacity>
  );
}

function SpaceDetailScreen({ route }) {
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
      .order('created_at', { ascending: false });
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
    await supabase.from('occupancy').insert({
      space_id: space.id,
      user_id: user.id,
      status,
    });
    fetchOccupancy();
    setReporting(false);
  }

  async function submitReview() {
    if (!comment.trim() || parseInt(rating) === 0) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('reviews').insert({
      space_id: space.id,
      rating: parseInt(rating),
      comment: comment.trim(),
      user_id: user.id,
    });
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
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: occupancy === 'busy' ? '#FF3B30' : '#34C759' }} />
      <Text style={{ color: theme.sub, fontSize: 13 }}>{occupancy === 'busy' ? 'Usually busy' : 'Usually quiet'} right now</Text>
    </View>
  )}
</View>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <TouchableOpacity
          style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#FF3B30', alignItems: 'center' }}
          onPress={() => reportOccupancy('busy')}
          disabled={reporting}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>🔴 It's busy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#34C759', alignItems: 'center' }}
          onPress={() => reportOccupancy('quiet')}
          disabled={reporting}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>🟢 It's quiet</Text>
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
            <Text style={{ fontSize: 32, color: star <= parseInt(rating) ? '#FFD700' : theme.border }}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Button title={submitting ? 'Submitting...' : 'Submit Review'} onPress={submitReview} disabled={submitting} />

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Reviews</Text>
      {loading ? <ActivityIndicator /> : reviews.length === 0 ? (
        <Text style={[styles.cardSub, { color: theme.sub }]}>No reviews yet. Be the first!</Text>
      ) : (
        reviews.map((r) => (
          <View key={r.id} style={[styles.reviewCard, { backgroundColor: theme.card }]}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text, marginBottom: 4 }}>
              {r.profiles?.full_name || 'Unknown'}
            </Text>
            <Text style={styles.reviewRating}>{'⭐'.repeat(r.rating)}</Text>
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

function MapScreen({ navigation }) {
  const [spaces, setSpaces] = useState([]);

  useEffect(() => {
    async function fetchSpaces() {
      const { data, error } = await supabase.from('spaces').select('*');
      if (error) console.error(error);
      else setSpaces(data);
    }
    fetchSpaces();
  }, []);

  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: -36.8523,
        longitude: 174.7691,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      {spaces.map((space) => (
        <Marker
          key={space.id}
          coordinate={{ latitude: space.lat, longitude: space.lng }}
          title={space.name}
        >
          <Callout onPress={() => navigation.navigate('Spaces', { screen: 'SpaceDetail', params: { space } })}>
            <View style={{ padding: 8, maxWidth: 200 }}>
              <Text style={{ fontWeight: '600' }}>{space.name}</Text>
              <Text style={{ color: '#666', fontSize: 12 }}>{space.building}</Text>
              <Text style={{ color: '#007AFF', fontSize: 12, marginTop: 4 }}>Tap to view →</Text>
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}

function MainApp() {
  const { session, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) return <View style={[styles.center, { backgroundColor: theme.bg }]}><ActivityIndicator /></View>;
  if (!session) return <LoginScreen />;

  return (
    <NavigationContainer theme={theme.dark ? DarkTheme : DefaultTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarStyle: { backgroundColor: theme.tabBar },
          tabBarActiveTintColor: '#007AFF',
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
        <Tab.Screen name="Map" component={MapScreen} options={{headerShown: false}} />
        <Tab.Screen name="Spaces" component={SpacesScreen} options={{ headerShown: false }} />
        <Tab.Screen name="Home" options={{headerShown: false}}>
          {(props) => <HomeScreen {...props} />}
        </Tab.Screen>
        <Tab.Screen name="Timer" component={TimerScreen} options={{headerShown: true}} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  detail: { padding: 16 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  reviewCard: { borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  detailTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  cardSub: { fontSize: 13, marginBottom: 8 },
  tags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 },
  reviewRating: { fontSize: 16, marginBottom: 4 },
  reviewComment: { fontSize: 14, marginBottom: 4 },
  reviewDate: { fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});