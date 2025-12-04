import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '../config/supabase';
import { Route, LocationPoint } from '../types';

const { width } = Dimensions.get('window');

interface RouteDetailScreenProps {
  route: {
    params: {
      routeId: string;
      routeData: Route;
    };
  };
  navigation: any;
}

interface Comment {
  id: string;
  text: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url?: string;
  };
}

const RouteDetailScreen: React.FC<RouteDetailScreenProps> = ({ route, navigation }) => {
  const { routeData } = route.params;
  const [selectedPoint, setSelectedPoint] = useState<LocationPoint | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Load current user
  useEffect(() => {
    loadCurrentUser();
    loadComments();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadComments = async () => {
    try {
      setLoadingComments(true);
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles (username, avatar_url)
        `)
        .eq('route_id', routeData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Komentar tidak boleh kosong');
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'Silakan login untuk berkomentar');
      return;
    }

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          route_id: routeData.id,
          user_id: currentUser.id,
          text: newComment.trim(),
        });

      if (error) throw error;
      
      setNewComment('');
      await loadComments();
      Alert.alert('Berhasil', 'Komentar berhasil ditambahkan!');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Gagal menambahkan komentar');
    }
  };

  // Separate route coordinates from note points
  const routeCoordinates = routeData.coordinates?.filter(
    coord => !coord.note && !coord.photoUri
  ) || [];

  const notePoints = routeData.coordinates?.filter(
    coord => coord.note || coord.photoUri
  ) || [];

  // Calculate map region to fit all coordinates
  const getMapRegion = () => {
    if (!routeData.coordinates || routeData.coordinates.length === 0) {
      return {
        latitude: -7.7956,
        longitude: 110.3695,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    const lats = routeData.coordinates.map(c => c.latitude);
    const lngs = routeData.coordinates.map(c => c.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latDelta = (maxLat - minLat) * 1.5 || 0.01;
    const lngDelta = (maxLng - minLng) * 1.5 || 0.01;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  const handleMarkerPress = (point: LocationPoint) => {
    setSelectedPoint(point);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Kembali</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{routeData.date}</Text>
          <Text style={styles.headerSubtitle}>Detail Perjalanan</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Map Section */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={getMapRegion()}
          >
            {/* Polyline untuk rute */}
            {routeCoordinates.length > 1 && (
              <Polyline
                coordinates={routeCoordinates.map(point => ({
                  latitude: point.latitude,
                  longitude: point.longitude,
                }))}
                strokeColor="#6366F1"
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* Start marker */}
            {routeCoordinates.length > 0 && (
              <Marker
                coordinate={{
                  latitude: routeCoordinates[0].latitude,
                  longitude: routeCoordinates[0].longitude,
                }}
                title="Start Point"
                pinColor="green"
              />
            )}

            {/* End marker */}
            {routeCoordinates.length > 1 && (
              <Marker
                coordinate={{
                  latitude: routeCoordinates[routeCoordinates.length - 1].latitude,
                  longitude: routeCoordinates[routeCoordinates.length - 1].longitude,
                }}
                title="End Point"
                pinColor="red"
              />
            )}

            {/* Note point markers */}
            {notePoints.map((point, index) => (
              <Marker
                key={point.id}
                coordinate={{
                  latitude: point.latitude,
                  longitude: point.longitude,
                }}
                title={`Catatan #${index + 1}`}
                description={point.note || 'Lihat detail'}
                pinColor="purple"
                onPress={() => handleMarkerPress(point)}
              />
            ))}
          </MapView>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>⏱️</Text>
            <View>
              <Text style={styles.statValue}>{routeData.duration}</Text>
              <Text style={styles.statLabel}>Durasi</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statIcon}>📏</Text>
            <View>
              <Text style={styles.statValue}>{routeData.distance}</Text>
              <Text style={styles.statLabel}>Jarak</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statIcon}>📌</Text>
            <View>
              <Text style={styles.statValue}>{notePoints.length}</Text>
              <Text style={styles.statLabel}>Catatan</Text>
            </View>
          </View>
        </View>

        {/* Note Points Section */}
        {notePoints.length > 0 ? (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>📍 Catatan Perjalanan</Text>
            
            {notePoints.map((point, index) => (
              <View key={point.id} style={styles.noteCard}>
                <View style={styles.noteHeader}>
                  <View style={styles.noteNumber}>
                    <Text style={styles.noteNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.noteHeaderText}>
                    <Text style={styles.noteTitle}>
                      Titik Catatan #{index + 1}
                    </Text>
                    <Text style={styles.noteTime}>
                      {new Date(point.timestamp).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>

                {(point.photoUri || point.photo_url) && (
                  <TouchableOpacity
                    style={styles.photoContainer}
                    onPress={() => {
                      Alert.alert('Foto', 'Fitur zoom foto coming soon!');
                    }}
                  >
                    <Image
                      source={{ uri: point.photoUri || point.photo_url }}
                      style={styles.notePhoto}
                      resizeMode="cover"
                    />
                    <View style={styles.photoOverlay}>
                      <Text style={styles.photoOverlayText}>🔍 Tap untuk zoom</Text>
                    </View>
                  </TouchableOpacity>
                )}

                {point.note && (
                  <View style={styles.noteContent}>
                    <Text style={styles.noteText}>{point.note}</Text>
                  </View>
                )}

                <View style={styles.noteCoords}>
                  <Text style={styles.coordsIcon}>🌐</Text>
                  <Text style={styles.coordsText}>
                    {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.viewOnMapButton}
                  onPress={() => handleMarkerPress(point)}
                >
                  <Text style={styles.viewOnMapText}>📍 Lihat di Peta</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyNotes}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>Tidak Ada Catatan</Text>
            <Text style={styles.emptyText}>
              Perjalanan ini tidak memiliki catatan atau foto
            </Text>
          </View>
        )}

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>💬 Komentar ({comments.length})</Text>
          
          {/* Comment Input */}
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Tulis komentar..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton,
                !newComment.trim() && styles.sendButtonDisabled
              ]}
              onPress={handleAddComment}
              disabled={!newComment.trim()}
            >
              <Text style={styles.sendButtonText}>Kirim</Text>
            </TouchableOpacity>
          </View>

          {/* Loading Comments */}
          {loadingComments ? (
            <View style={styles.loadingComments}>
              <ActivityIndicator color="#6366F1" />
              <Text style={styles.loadingText}>Memuat komentar...</Text>
            </View>
          ) : comments.length > 0 ? (
            // Comments List
            comments.map(comment => (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>
                      {comment.profiles.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.commentContent}>
                    <Text style={styles.commentUsername}>
                      @{comment.profiles.username}
                    </Text>
                    <Text style={styles.commentText}>{comment.text}</Text>
                    <Text style={styles.commentTime}>
                      {new Date(comment.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyComments}>
              <Text style={styles.emptyCommentsText}>
                Belum ada komentar. Jadilah yang pertama!
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Selected Point Banner */}
      {selectedPoint && (
        <View style={styles.selectedPointBanner}>
          <Text style={styles.bannerText}>
            ✓ Marker dipilih di peta
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#10B981',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContent: {
    marginTop: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#D1FAE5',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    height: 300,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  map: {
    flex: 1,
  },
  statsCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    fontSize: 28,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  notesSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  noteCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  noteNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  noteNumberText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noteHeaderText: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  noteTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  notePhoto: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    alignItems: 'center',
  },
  photoOverlayText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  noteContent: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  noteText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  noteCoords: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  coordsIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  coordsText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  viewOnMapButton: {
    backgroundColor: '#8B5CF6',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewOnMapText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyNotes: {
    alignItems: 'center',
    paddingVertical: 40,
    marginHorizontal: 16,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  commentsSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  commentInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingComments: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  commentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  commentHeader: {
    flexDirection: 'row',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  commentAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginTop: 8,
  },
  emptyCommentsText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  selectedPointBanner: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  bannerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RouteDetailScreen;