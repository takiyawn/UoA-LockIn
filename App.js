import MapView, { Marker, Callout } from 'react-native-maps';
import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Button, ScrollView } from 'react-native';
import { supabase } from './supabase';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function SpaceCard({ space, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.cardTitle}>{space.name}</Text>
      <Text style={styles.cardSub}>{space.building}</Text>
      <View style={styles.tags}>
        <Text style={styles.tag}>{space.noise}</Text>
        {space.wifi && <Text style={styles.tag}>WiFi</Text>}
        {space.power && <Text style={styles.tag}>Power</Text>}
      </View>
    </TouchableOpacity>
  );
}

function SpacesListScreen({ navigation }) {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSpaces() {
      const { data, error } = await supabase.from('spaces').select('*');
      if (error) console.error(error);
      else setSpaces(data);
      setLoading(false);
    }
    fetchSpaces();
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;

  return (
    <FlatList
      data={spaces}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <SpaceCard space={item} onPress={() => navigation.navigate('SpaceDetail', { space: item })} />
      )}
      contentContainerStyle={styles.list}
    />
  );
}

function SpaceDetailScreen({ route }) {
  const { space } = route.params;
  const [reviews, setReviews] = useState([]);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState('5');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
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
    const { error } = await supabase.from('reviews').insert({
      space_id: space.id,
      rating: parseInt(rating),
      comment: comment.trim(),
    });
    if (error) console.error(error);
    else {
      setComment('');
      setRating('5');
      fetchReviews();
    }
    setSubmitting(false);
  }

  return (
    <ScrollView style={styles.detail}>
      <Text style={styles.detailTitle}>{space.name}</Text>
      <Text style={styles.cardSub}>{space.building}</Text>
      <View style={styles.tags}>
        <Text style={styles.tag}>{space.noise}</Text>
        {space.wifi && <Text style={styles.tag}>WiFi</Text>}
        {space.power && <Text style={styles.tag}>Power</Text>}
        <Text style={styles.tag}>Floors: {space.floors}</Text>
      </View>

      <Text style={styles.sectionTitle}>Leave a Review</Text>
      <TextInput
        style={styles.input}
        placeholder="Write your review..."
        value={comment}
        onChangeText={setComment}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="Rating (1-5)"
        value={rating}
        onChangeText={setRating}
        keyboardType="numeric"
      />
      <Button title={submitting ? 'Submitting...' : 'Submit Review'} onPress={submitReview} disabled={submitting} />

      <Text style={styles.sectionTitle}>Reviews</Text>
      {loading ? <ActivityIndicator /> : reviews.length === 0 ? (
        <Text style={styles.cardSub}>No reviews yet. Be the first!</Text>
      ) : (
        reviews.map((r) => (
          <View key={r.id} style={styles.reviewCard}>
            <Text style={styles.reviewRating}>{'⭐'.repeat(r.rating)}</Text>
            <Text style={styles.reviewComment}>{r.comment}</Text>
            <Text style={styles.reviewDate}>{new Date(r.created_at).toLocaleDateString()}</Text>
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

function FavouritesScreen() {
  return <View style={styles.center}><Text>Favourites coming soon</Text></View>;
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Map" component={MapScreen} />
        <Tab.Screen name="Spaces" component={SpacesScreen} options={{ headerShown: false }} />
        <Tab.Screen name="Favourites" component={FavouritesScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  detail: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewCard: {
    backgroundColor: '#fff',
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
  cardSub: { fontSize: 13, color: '#666', marginBottom: 8 },
  tags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 12,
    color: '#333',
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  reviewRating: { fontSize: 16, marginBottom: 4 },
  reviewComment: { fontSize: 14, marginBottom: 4 },
  reviewDate: { fontSize: 12, color: '#999' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});