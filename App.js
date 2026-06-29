import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';

const Tab = createBottomTabNavigator();

const STUDY_SPACES = [
  { id: '1', name: 'Kate Edger Information Commons', building: 'City Campus', noise: 'Quiet', wifi: true, power: true, floors: '1-4' },
  { id: '2', name: 'General Library', building: 'City Campus', noise: 'Silent', wifi: true, power: true, floors: '1-5' },
  { id: '3', name: 'Science Library', building: 'Science Campus', noise: 'Quiet', wifi: true, power: true, floors: '1-2' },
  { id: '4', name: 'Engineering Library', building: 'Engineering', noise: 'Quiet', wifi: true, power: true, floors: '1' },
  { id: '5', name: 'Business School Level 3', building: 'Owen G Glenn', noise: 'Moderate', wifi: true, power: false, floors: '3' },
  { id: '6', name: 'ClockTower Building', building: 'City Campus', noise: 'Quiet', wifi: true, power: false, floors: '1-3' },
  { id: '7', name: 'Philson Library', building: 'Grafton Campus', noise: 'Silent', wifi: true, power: true, floors: '1-2' },
];

//display a single study space as a card
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
  return (
    <FlatList
      data={STUDY_SPACES}
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