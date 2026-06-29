import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from './supabase';

const Tab = createBottomTabNavigator();

function SpaceCard({ space }) {
  return (
    <TouchableOpacity style={styles.card}>
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

function SpacesScreen() {
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
      renderItem={({ item }) => <SpaceCard space={item} />}
      contentContainerStyle={styles.list}
    />
  );
}

function MapScreen() {
  return <View style={styles.center}><Text>Map coming soon</Text></View>;
}

function FavouritesScreen() {
  return <View style={styles.center}><Text>Favourites coming soon</Text></View>;
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Map" component={MapScreen} />
        <Tab.Screen name="Spaces" component={SpacesScreen} />
        <Tab.Screen name="Favourites" component={FavouritesScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
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
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#666', marginBottom: 8 },
  tags: { flexDirection: 'row', gap: 8 },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 12,
    color: '#333',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});