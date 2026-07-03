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

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

async function getFavourites() {
  const json = await AsyncStorage.getItem('favourites');
  return json ? JSON.parse(json) : [];
}

async function toggleFavourite(space) {
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
      <View style={styles.tags}>
        <Text style={[styles.tag, { backgroundColor: theme.tag, color: theme.tagText }]}>{space.noise}</Text>
        {space.wifi && <Text style={[styles.tag, { backgroundColor: theme.tag, color: theme.tagText }]}>WiFi</Text>}
        {space.power && <Text style={[styles.tag, { backgroundColor: theme.tag, color: theme.tagText }]}>Power</Text>}
      </View>
    </TouchableOpacity>
  );
}

function SpacesListScreen({ navigation }) {
  const { theme } = useTheme();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favourites, setFavourites] = useState([]);

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

  if (loading) return <View style={[styles.center, { backgroundColor: theme.bg }]}><ActivityIndicator /></View>;

  return (
    <FlatList
      data={spaces}
      keyExtractor={(item) => item.id}
      style={{ backgroundColor: theme.bg }}
      renderItem={({ item }) => (
        <SpaceCard
          space={item}
          onPress={() => navigation.navigate('SpaceDetail', { space: item })}
          isFav={favourites.includes(item.id)}
          onToggleFav={() => handleToggleFav(item)}
        />
      )}
      contentContainerStyle={styles.list}
    />
  );
}

function SpaceDetailScreen({ route }) {
  const { theme } = useTheme();
  const { space } = route.params;
  const [reviews, setReviews] = useState([]);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState('5');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    fetchReviews();
    getFavourites().then((favs) => setIsFav(!!favs.find((f) => f.id === space.id)));
  }, []);

  async function fetchReviews() {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('space_id', space.id)
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    else setReviews(data);
    setLoading(false);
  }

  async function submitReview() {
    if (!comment.trim()) return;
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
      setRating('5');
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

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Leave a Review</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
        placeholder="Write your review..."
        placeholderTextColor={theme.sub}
        value={comment}
        onChangeText={setComment}
        multiline
      />
      <TextInput
        style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
        placeholder="Rating (1-5)"
        placeholderTextColor={theme.sub}
        value={rating}
        onChangeText={setRating}
        keyboardType="numeric"
      />
      <Button title={submitting ? 'Submitting...' : 'Submit Review'} onPress={submitReview} disabled={submitting} />

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Reviews</Text>
      {loading ? <ActivityIndicator /> : reviews.length === 0 ? (
        <Text style={[styles.cardSub, { color: theme.sub }]}>No reviews yet. Be the first!</Text>
      ) : (
        reviews.map((r) => (
          <View key={r.id} style={[styles.reviewCard, { backgroundColor: theme.card }]}>
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
      <Stack.Screen name="SpacesList" component={SpacesListScreen} options={{ title: 'Study Spaces' }} />
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

function FavouritesScreen({ navigation }) {
  const { theme } = useTheme();
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadFavourites);
    return unsubscribe;
  }, [navigation]);

  async function loadFavourites() {
    const favs = await getFavourites();
    setFavourites(favs);
    setLoading(false);
  }

  async function handleToggleFav(space) {
    await toggleFavourite(space);
    loadFavourites();
  }

  if (loading) return <View style={[styles.center, { backgroundColor: theme.bg }]}><ActivityIndicator /></View>;

  return favourites.length === 0 ? (
    <View style={[styles.center, { backgroundColor: theme.bg }]}>
      <Text style={[styles.cardSub, { color: theme.sub }]}>No favourites yet. Tap ❤️ on any space.</Text>
    </View>
  ) : (
    <FlatList
      data={favourites}
      keyExtractor={(item) => item.id}
      style={{ backgroundColor: theme.bg }}
      renderItem={({ item }) => (
        <SpaceCard
          space={item}
          onPress={() => navigation.navigate('Spaces', { screen: 'SpaceDetail', params: { space: item } })}
          isFav={true}
          onToggleFav={() => handleToggleFav(item)}
        />
      )}
      contentContainerStyle={styles.list}
    />
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
        screenOptions={{
          tabBarStyle: { backgroundColor: theme.tabBar },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: theme.sub,
        }}
      >
        <Tab.Screen name="Map" component={MapScreen} />
        <Tab.Screen name="Spaces" component={SpacesScreen} options={{ headerShown: false }} />
        <Tab.Screen name="Favourites" component={FavouritesScreen} />
        <Tab.Screen name="Timer" component={TimerScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
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
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  detailTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  cardSub: { fontSize: 13, marginBottom: 8 },
  tags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  reviewRating: { fontSize: 16, marginBottom: 4 },
  reviewComment: { fontSize: 14, marginBottom: 4 },
  reviewDate: { fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});