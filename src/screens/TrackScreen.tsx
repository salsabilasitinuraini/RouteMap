import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { LocationPoint } from '../types';
import { LocationService } from '../utils/locationService';
import { supabase, uploadPhoto } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import AddNoteModal from '../components/AddNoteModal';

interface TrackingState {
  isTracking: boolean;
  duration: string;
  distance: string;
  points: number;
  currentRoute: LocationPoint[];
}

const TrackScreen: React.FC = () => {
  const mapRef = useRef<MapView>(null);
  const { user } = useAuth();

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
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [routeTitle, setRouteTitle] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [sportType, setSportType] = useState<'running' | 'cycling' | 'walking'>('running');
  const [safetyRating, setSafetyRating] = useState<'safe' | 'moderate' | 'unsafe'>('safe');

  useEffect(() => {
    getInitialLocation();
    return () => {
      LocationService.stopTracking();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (trackingState.isTracking) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
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

  const getInitialLocation = async () => {
    const hasPermission = await LocationService.requestPermission();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Aplikasi membutuhkan akses lokasi.');
      return;
    }

    const location = await LocationService.getCurrentLocation();
    if (location) {
      setCurrentLocation(location);
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

  const handleLocationUpdate = (point: LocationPoint) => {
    setTrackingState(prev => {
      const newRoute = [...prev.currentRoute, point];
      const distance = LocationService.calculateRouteDistance(newRoute);
      return {
        ...prev,
        currentRoute: newRoute,
        distance: `${distance.toFixed(2)} km`,
      };
    });

    setCurrentLocation(point);

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
      Alert.alert('Stop Tracking', 'Simpan rute ini?', [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Simpan',
          onPress: () => {
            LocationService.stopTracking();
            setTrackingState(prev => ({ ...prev, isTracking: false }));
            setShowSaveModal(true);
          },
        },
      ]);
    } else {
      const success = await LocationService.startTracking(handleLocationUpdate);
      if (success) {
        setStartTime(Date.now());
        setTrackingState({
          isTracking: true,
          duration: '0h 0m',
          distance: '0.0 km',
          points: 0,
          currentRoute: [],
        });
        setNotePoints([]);
        Alert.alert('Success', 'GPS Tracking dimulai!');
      } else {
        Alert.alert('Error', 'Tidak dapat memulai tracking.');
      }
    }
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
    }
  };

  const handleSaveNote = async (note: string, photoUri: string | null): Promise<void> => {
    if (!currentLocation || !user) return;

    const newPoint: LocationPoint = {
      ...currentLocation,
      id: Date.now().toString(),
      note,
      photoUri: photoUri || undefined,
    };

    setNotePoints([...notePoints, newPoint]);
    setTrackingState(prev => ({ ...prev, points: prev.points + 1 }));
    setShowNoteModal(false);
    Alert.alert('Success', 'Titik catatan berhasil ditambahkan! 📍');
  };

  const handleSaveRoute = async () => {
    if (!user) {
      Alert.alert('Error', 'User tidak ditemukan');
      return;
    }

    if (!routeTitle.trim()) {
      Alert.alert('Error', 'Judul rute wajib diisi!');
      return;
    }

    if (trackingState.currentRoute.length < 2) {
      Alert.alert('Error', 'Rute terlalu pendek! Tracking lebih lama.');
      return;
    }

    setIsSaving(true);

    try {
      // 1. Prepare polyline data
      const polyline = trackingState.currentRoute.map(point => ({
        lat: point.latitude,
        lng: point.longitude,
      }));

      // 2. Insert route to database
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .insert({
          user_id: user.id,
          title: routeTitle.trim(),
          description: routeDescription.trim() || null,
          sport_type: sportType,
          distance: parseFloat(trackingState.distance.replace(' km', '')),
          duration: trackingState.duration,
          safety_rating: safetyRating,
          polyline,
        })
        .select()
        .single();

      if (routeError) throw routeError;

      // 3. Upload photos and insert location points
      for (const point of notePoints) {
        let photoUrl: string | null = null;

        if (point.photoUri) {
          photoUrl = await uploadPhoto(user.id, routeData.id, point.photoUri);
        }

        await supabase.from('location_points').insert({
          route_id: routeData.id,
          latitude: point.latitude,
          longitude: point.longitude,
          photo_url: photoUrl,
          note: point.note || null,
          is_warning: safetyRating === 'unsafe',
        });
      }

      Alert.alert('Success! 🎉', 'Rute berhasil dibagikan!', [
        {
          text: 'OK',
          onPress: () => {
            setShowSaveModal(false);
            // Reset state
            setTrackingState({
              isTracking: false,
              duration: '0h 0m',
              distance: '0.0 km',
              points: 0,
              currentRoute: [],
            });
            setNotePoints([]);
            setRouteTitle('');
            setRouteDescription('');
            setSportType('running');
            setSafetyRating('safe');
          },
        },
      ]);
    } catch (error) {
      console.error('Error saving route:', error);
      Alert.alert('Error', 'Gagal menyimpan rute. Coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Track Route</Text>
        <Text style={styles.headerSubtitle}>Record & share your route</Text>
      </View>

      <ScrollView style={styles.content}>
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

            {notePoints.map((point) => (
              <Marker
                key={point.id}
                coordinate={{
                  latitude: point.latitude,
                  longitude: point.longitude,
                }}
                title={point.note || 'Note'}
                pinColor="purple"
              />
            ))}
          </MapView>

          <View style={styles.mapOverlay}>
            <View style={styles.trackingStatusBadge}>
              <View
                style={[
                  styles.statusDot,
                  trackingState.isTracking && styles.statusDotActive,
                ]}
              />
              <Text style={styles.statusText}>
                {trackingState.isTracking ? 'Tracking' : 'Stopped'}
              </Text>
            </View>
          </View>
        </View>

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
              {trackingState.isTracking ? '⏹ Stop & Save' : '▶ Start Tracking'}
            </Text>
          </TouchableOpacity>

          {trackingState.isTracking && (
            <>
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

              <TouchableOpacity
                style={styles.addPointButton}
                onPress={addLocationPoint}
                activeOpacity={0.8}
              >
                <Text style={styles.addPointButtonText}>📸 Tambah Foto & Catatan</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      <AddNoteModal
        visible={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSave={handleSaveNote}
        currentLocation={currentLocation}
      />

      {/* Save Route Modal */}
      <Modal visible={showSaveModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.saveModal}>
            <Text style={styles.modalTitle}>📍 Simpan Rute</Text>

            <TextInput
              style={styles.input}
              placeholder="Judul rute *"
              value={routeTitle}
              onChangeText={setRouteTitle}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Deskripsi (opsional)"
              value={routeDescription}
              onChangeText={setRouteDescription}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Jenis Olahraga:</Text>
            <View style={styles.optionsRow}>
              {['running', 'cycling', 'walking'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.optionButton,
                    sportType === type && styles.optionButtonActive,
                  ]}
                  onPress={() => setSportType(type as any)}
                >
                  <Text style={styles.optionText}>
                    {type === 'running' ? '🏃 Lari' : type === 'cycling' ? '🚴 Sepeda' : '🚶 Jalan'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Tingkat Keamanan:</Text>
            <View style={styles.optionsRow}>
              {[
                { value: 'safe', label: '✅ Aman', color: '#10B981' },
                { value: 'moderate', label: '⚠️ Hati-hati', color: '#F59E0B' },
                { value: 'unsafe', label: '🚫 Berbahaya', color: '#EF4444' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.safetyButton,
                    safetyRating === option.value && {
                      backgroundColor: option.color + '20',
                      borderColor: option.color,
                    },
                  ]}
                  onPress={() => setSafetyRating(option.value as any)}
                >
                  <Text style={[styles.safetyText, { color: option.color }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowSaveModal(false)}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveRoute}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Simpan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  addPointButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  saveModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  optionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  optionButtonActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  safetyButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  safetyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default TrackScreen;