import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Habit, TrackingState, LocationPoint, Route } from '../types';
import { LocationService } from '../utils/locationService';
import { StorageService } from '../utils/storageService';
import AddNoteModal from '../components/AddNoteModal';

const HomeScreen: React.FC = () => {
  const mapRef = useRef<MapView>(null);
  
  // State dengan TypeScript types
  const [trackingState, setTrackingState] = useState<TrackingState>({
    isTracking: false,
    duration: '0h 0m',
    distance: '0.0 km',
    points: 0,
    currentRoute: [],
  });

  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [notePoints, setNotePoints] = useState<LocationPoint[]>([]);

  const [habits, setHabits] = useState<Habit[]>([]);

  // Load habits from storage on mount
  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    const savedHabits = await StorageService.getHabits();
    if (savedHabits.length > 0) {
      setHabits(savedHabits);
    } else {
      // Default habits jika belum ada
      const defaultHabits = [
        { id: 1, name: 'Olahraga Pagi', completed: false, streak: 5 },
        { id: 2, name: 'Minum 8 Gelas Air', completed: true, streak: 12 },
        { id: 3, name: 'Baca Buku 30 Menit', completed: false, streak: 3 },
      ];
      setHabits(defaultHabits);
      await StorageService.saveHabits(defaultHabits);
    }
  };

  // Get initial location
  useEffect(() => {
    getInitialLocation();
    return () => {
      LocationService.stopTracking();
    };
  }, []);

  const getInitialLocation = async () => {
    const hasPermission = await LocationService.requestPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Aplikasi membutuhkan akses lokasi untuk tracking rute.'
      );
      return;
    }

    const location = await LocationService.getCurrentLocation();
    if (location) {
      setCurrentLocation(location);
      // Zoom to current location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    }
  };

  // Timer untuk tracking duration
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (trackingState.isTracking) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        setTrackingState(prev => ({
          ...prev,
          duration: `${hours}h ${minutes}m`,
        }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [trackingState.isTracking, startTime]);

  const handleLocationUpdate = (point: LocationPoint) => {
    setTrackingState(prev => {
      const newRoute = [...prev.currentRoute, point];
      
      // Calculate distance
      const distance = LocationService.calculateRouteDistance(newRoute);
      
      return {
        ...prev,
        currentRoute: newRoute,
        distance: `${distance.toFixed(2)} km`,
      };
    });

    setCurrentLocation(point);

    // Auto zoom to new location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: point.latitude,
        longitude: point.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const toggleTracking = async (): Promise<void> => {
    if (trackingState.isTracking) {
      // Stop tracking
      Alert.alert(
        'Stop Tracking',
        'Apakah kamu yakin ingin menghentikan tracking?',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Stop',
            style: 'destructive',
            onPress: async () => {
              LocationService.stopTracking();
              
              // Save route to storage
              const newRoute: Route = {
                id: Date.now().toString(),
                date: new Date().toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }),
                duration: trackingState.duration,
                distance: trackingState.distance,
                points: notePoints.length,
                coordinates: [...trackingState.currentRoute, ...notePoints],
              };
              
              await StorageService.addRoute(newRoute);
              await StorageService.clearCurrentTracking();
              
              setTrackingState(prev => ({
                ...prev,
                isTracking: false,
              }));
              setNotePoints([]);
              
              Alert.alert(
                'Tracking Selesai',
                `Rute berhasil disimpan!\n\nDurasi: ${trackingState.duration}\nJarak: ${trackingState.distance}\nTitik Catatan: ${notePoints.length}`
              );
            },
          },
        ]
      );
    } else {
      // Start tracking
      const success = await LocationService.startTracking(handleLocationUpdate);
      
      if (success) {
        setStartTime(Date.now());
        const newTrackingState = {
          isTracking: true,
          duration: '0h 0m',
          distance: '0.0 km',
          points: 0,
          currentRoute: [],
        };
        setTrackingState(newTrackingState);
        
        // Save tracking state
        await StorageService.saveCurrentTracking({
          startTime: Date.now(),
          ...newTrackingState,
        });
        
        Alert.alert('Success', 'GPS Tracking dimulai!');
      } else {
        Alert.alert(
          'Error',
          'Tidak dapat memulai tracking. Pastikan GPS dan permission aktif.'
        );
      }
    }
  };

  const toggleHabit = async (id: number): Promise<void> => {
    const updatedHabits = habits.map(habit =>
      habit.id === id
        ? {
            ...habit,
            completed: !habit.completed,
            streak: !habit.completed ? habit.streak + 1 : habit.streak,
          }
        : habit
    );
    setHabits(updatedHabits);
    await StorageService.saveHabits(updatedHabits);
  };

  const addLocationPoint = async (): Promise<void> => {
    if (!trackingState.isTracking) {
      Alert.alert('Error', 'Mulai tracking terlebih dahulu!');
      return;
    }

    const location = await LocationService.getCurrentLocation();
    if (location) {
      setCurrentLocation(location);
      setShowNoteModal(true);
    } else {
      Alert.alert('Error', 'Tidak dapat mengambil lokasi saat ini');
    }
  };

  const handleSaveNote = async (note: string, photoUri: string | null): Promise<void> => {
    if (!currentLocation) return;

    const newPoint: LocationPoint = {
      ...currentLocation,
      id: Date.now().toString(),
      note,
      photoUri: photoUri || undefined,
    };

    setNotePoints([...notePoints, newPoint]);
    setTrackingState(prev => ({
      ...prev,
      points: prev.points + 1,
    }));

    setShowNoteModal(false);
    Alert.alert('Success', 'Titik catatan berhasil ditambahkan! 📍');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HabituMap</Text>
        <Text style={styles.headerSubtitle}>Track your habits & journey</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Map Section */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: currentLocation?.latitude || -7.7956,
              longitude: currentLocation?.longitude || 110.3695,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation
            showsMyLocationButton
            followsUserLocation={trackingState.isTracking}
          >
            {/* Polyline untuk menampilkan rute */}
            {trackingState.currentRoute.length > 1 && (
              <Polyline
                coordinates={trackingState.currentRoute.map(point => ({
                  latitude: point.latitude,
                  longitude: point.longitude,
                }))}
                strokeColor="#6366F1"
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* Marker untuk start point */}
            {trackingState.currentRoute.length > 0 && (
              <Marker
                coordinate={{
                  latitude: trackingState.currentRoute[0].latitude,
                  longitude: trackingState.currentRoute[0].longitude,
                }}
                title="Start Point"
                pinColor="green"
              />
            )}

            {/* Markers untuk note points */}
            {notePoints.map((point) => (
              <Marker
                key={point.id}
                coordinate={{
                  latitude: point.latitude,
                  longitude: point.longitude,
                }}
                title={point.note || 'Catatan'}
                description={point.photoUri ? '📷 Ada foto' : undefined}
                pinColor="purple"
              />
            ))}
          </MapView>

          {/* Overlay Info */}
          <View style={styles.mapOverlay}>
            <View style={styles.trackingStatusBadge}>
              <View
                style={[
                  styles.statusDot,
                  trackingState.isTracking && styles.statusDotActive,
                ]}
              />
              <Text style={styles.statusText}>
                {trackingState.isTracking ? 'Tracking Aktif' : 'Tracking Off'}
              </Text>
            </View>
          </View>
        </View>

        {/* Tracking Controls */}
        <View style={styles.controlsCard}>
          <TouchableOpacity
            style={[
              styles.trackingButton,
              trackingState.isTracking && styles.trackingButtonActive,
            ]}
            onPress={toggleTracking}
            activeOpacity={0.8}
          >
            <Text style={styles.trackingButtonText}>
              {trackingState.isTracking ? '⏹ Stop Tracking' : '▶ Mulai Tracking'}
            </Text>
          </TouchableOpacity>

          {/* Stats ketika tracking aktif */}
          {trackingState.isTracking && (
            <View style={styles.statsContainer}>
              <View style={[styles.statBox, styles.statBoxBlue]}>
                <Text style={styles.statIcon}>⏱</Text>
                <Text style={styles.statLabel}>Durasi</Text>
                <Text style={styles.statValue}>{trackingState.duration}</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxGreen]}>
                <Text style={styles.statIcon}>📍</Text>
                <Text style={styles.statLabel}>Jarak</Text>
                <Text style={styles.statValue}>{trackingState.distance}</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxPurple]}>
                <Text style={styles.statIcon}>📌</Text>
                <Text style={styles.statLabel}>Titik</Text>
                <Text style={styles.statValue}>{trackingState.points}</Text>
              </View>
            </View>
          )}

          {/* Tombol Tambah Titik */}
          <TouchableOpacity
            style={[
              styles.addPointButton,
              !trackingState.isTracking && styles.addPointButtonDisabled,
            ]}
            onPress={addLocationPoint}
            disabled={!trackingState.isTracking}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.addPointButtonText,
                !trackingState.isTracking && styles.addPointButtonTextDisabled,
              ]}
            >
              + Tambah Titik Catatan
            </Text>
          </TouchableOpacity>
        </View>

        {/* Habits Section */}
        <View style={styles.habitsCard}>
          <Text style={styles.sectionTitle}>📋 Kebiasaan Hari Ini</Text>

          {habits.map(habit => (
            <TouchableOpacity
              key={habit.id}
              style={styles.habitItem}
              onPress={() => toggleHabit(habit.id)}
              activeOpacity={0.7}
            >
              <View style={styles.habitLeft}>
                <View
                  style={[
                    styles.checkbox,
                    habit.completed && styles.checkboxChecked,
                  ]}
                >
                  {habit.completed && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text
                  style={[
                    styles.habitName,
                    habit.completed && styles.habitNameCompleted,
                  ]}
                >
                  {habit.name}
                </Text>
              </View>
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>🔥 {habit.streak}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Add Note Modal */}
      <AddNoteModal
        visible={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSave={handleSaveNote}
        currentLocation={currentLocation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#6366F1',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#C7D2FE',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    height: 350,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
  },
  trackingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9CA3AF',
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  controlsCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  trackingButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  trackingButtonActive: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  trackingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 10,
  },
  statBox: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  statBoxBlue: {
    backgroundColor: '#EFF6FF',
  },
  statBoxGreen: {
    backgroundColor: '#F0FDF4',
  },
  statBoxPurple: {
    backgroundColor: '#FAF5FF',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addPointButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addPointButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  addPointButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  addPointButtonTextDisabled: {
    color: '#9CA3AF',
  },
  habitsCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  habitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  habitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  habitName: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  habitNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  streakBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  streakText: {
    fontSize: 13,
    color: '#D97706',
    fontWeight: '700',
  },
});

export default HomeScreen;