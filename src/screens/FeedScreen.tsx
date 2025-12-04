import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';

interface RouteItem {
  id: string;
  title: string;
  description: string;
  sport_type: 'running' | 'cycling' | 'walking';
  distance: number;
  duration: string;
  safety_rating?: 'safe' | 'moderate' | 'unsafe';
  likes_count: number;
  created_at: string;
  profiles: {
    username: string;
    avatar_url?: string;
  };
  location_points: { photo_url?: string }[];
}

interface FeedScreenProps {
  navigation: any;
}

const FeedScreen: React.FC<FeedScreenProps> = ({ navigation }) => {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          profiles!routes_user_id_fkey (username, avatar_url),
          location_points (photo_url)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setRoutes(data || []);
    } catch (error) {
      console.error('Error loading routes:', error);
      Alert.alert('Error', 'Gagal memuat feed');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoutes();
    setRefreshing(false);
  };

  const handleLike = async (routeId: string) => {
    if (!user) return;

    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('route_likes')
        .select('*')
        .eq('route_id', routeId)
        .eq('user_id', user.id)
        .single();

      if (existingLike) {
        // Unlike
        await supabase
          .from('route_likes')
          .delete()
          .eq('route_id', routeId)
          .eq('user_id', user.id);
      } else {
        // Like
        await supabase
          .from('route_likes')
          .insert({
            route_id: routeId,
            user_id: user.id,
          });
      }

      // Reload routes to update like count
      await loadRoutes();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // ✅ FIX: Load full route data before navigation (sama seperti ProfileScreen)
  const loadFullRoute = async (routeId: string) => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          profiles!routes_user_id_fkey (username, avatar_url),
          location_points (*)
        `)
        .eq('id', routeId)
        .single();

      if (error) throw error;

      // Convert polyline to coordinates format
      const coordinates = [
        ...(data.polyline || []).map((point: any) => ({
          id: `${Date.now()}-${Math.random()}`,
          latitude: point.lat,
          longitude: point.lng,
          timestamp: new Date(),
        })),
        ...(data.location_points || []).map((point: any) => ({
          id: point.id,
          latitude: point.latitude,
          longitude: point.longitude,
          timestamp: new Date(point.created_at),
          note: point.note,
          photo_url: point.photo_url,
        })),
      ];

      navigation.navigate('RouteDetail', {
        routeId: data.id,
        routeData: {
          ...data,
          coordinates,
        },
      });
    } catch (error) {
      console.error('Error loading route:', error);
      Alert.alert('Error', 'Gagal memuat detail rute');
    }
  };

  const getSportIcon = (type: string) => {
    switch (type) {
      case 'running':
        return '🏃';
      case 'cycling':
        return '🚴';
      case 'walking':
        return '🚶';
      default:
        return '📍';
    }
  };

  const getSafetyColor = (rating?: string) => {
    switch (rating) {
      case 'safe':
        return '#10B981';
      case 'moderate':
        return '#F59E0B';
      case 'unsafe':
        return '#EF4444';
      default:
        return '#9CA3AF';
    }
  };

  const getSafetyLabel = (rating?: string) => {
    switch (rating) {
      case 'safe':
        return '✅ Aman';
      case 'moderate':
        return '⚠️ Hati-hati';
      case 'unsafe':
        return '🚫 Berbahaya';
      default:
        return '';
    }
  };

  const renderRouteCard = ({ item }: { item: RouteItem }) => {
    const coverPhoto = item.location_points?.[0]?.photo_url;

    return (
      <TouchableOpacity
        style={styles.routeCard}
        onPress={() => loadFullRoute(item.id)}
        activeOpacity={0.9}
      >
        {/* Cover Image */}
        {coverPhoto ? (
          <Image source={{ uri: coverPhoto }} style={styles.coverImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderIcon}>
              {getSportIcon(item.sport_type)}
            </Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.profiles.username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.username}>@{item.profiles.username}</Text>
                <Text style={styles.timestamp}>
                  {new Date(item.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </View>
            </View>
            <View style={styles.sportBadge}>
              <Text style={styles.sportIcon}>{getSportIcon(item.sport_type)}</Text>
            </View>
          </View>

          {/* Title & Description */}
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>📏</Text>
              <Text style={styles.statText}>{item.distance.toFixed(1)} km</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>⏱️</Text>
              <Text style={styles.statText}>{item.duration}</Text>
            </View>
            {item.safety_rating && (
              <View
                style={[
                  styles.safetyBadge,
                  { backgroundColor: getSafetyColor(item.safety_rating) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.safetyText,
                    { color: getSafetyColor(item.safety_rating) },
                  ]}
                >
                  {getSafetyLabel(item.safety_rating)}
                </Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleLike(item.id)}
            >
              <Text style={styles.actionIcon}>❤️</Text>
              <Text style={styles.actionText}>{item.likes_count}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => loadFullRoute(item.id)}
            >
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionText}>Lihat Detail</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🗺️</Text>
      <Text style={styles.emptyTitle}>Belum Ada Rute</Text>
      <Text style={styles.emptyText}>
        Jadilah yang pertama membagikan rute olahraga!
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('Track')}
      >
        <Text style={styles.emptyButtonText}>+ Buat Rute Pertama</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Memuat feed...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RouteMate</Text>
        <Text style={styles.headerSubtitle}>Discover Running Routes</Text>
      </View>

      {/* Feed List */}
      <FlatList
        data={routes}
        renderItem={renderRouteCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmpty}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  routeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  coverImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  placeholderImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 64,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  sportBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportIcon: {
    fontSize: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  safetyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  safetyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  actionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  actionText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default FeedScreen;