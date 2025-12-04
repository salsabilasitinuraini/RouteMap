import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '../config/supabase';

interface ExploreRoute {
    id: string;
    title: string;
    sport_type: 'running' | 'cycling' | 'walking';
    distance: number;
    duration?: string;  
    polyline: { lat: number; lng: number }[];
    profiles: {
        username: string;
        avatar_url?: string;
    };
}

interface ExploreScreenProps {
    navigation: any;
}

const ExploreScreen: React.FC<ExploreScreenProps> = ({ navigation }) => {
    const mapRef = useRef<MapView>(null);
    const [routes, setRoutes] = useState<ExploreRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRoute, setSelectedRoute] = useState<ExploreRoute | null>(null);
    const [filterType, setFilterType] = useState<string>('all');

    useEffect(() => {
        loadRoutes();
    }, []);

    const loadRoutes = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('routes')
                .select(`
          id,
          title,
          sport_type,
          distance,
          polyline,
          profiles!routes_user_id_fkey (username)
        `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            // Transform data to match the ExploreRoute interface
            const formattedData = data
                ? data.map(route => ({
                    ...route,
                    // Supabase may return a joined table as an array, take the first object.
                    profiles: Array.isArray(route.profiles)
                        ? route.profiles[0]
                        : route.profiles,
                }))
                : [];

            // Filter out any routes that don't have a valid profile after transformation
            const validRoutes = formattedData.filter(route => !!route.profiles);

            setRoutes(validRoutes);

            // Fit map to show all routes
            if (validRoutes && validRoutes.length > 0 && mapRef.current) {
                const coordinates = validRoutes.flatMap(route =>
                    route.polyline.map((point: any) => ({
                        latitude: point.lat,
                        longitude: point.lng,
                    }))
                );

                if (coordinates.length > 0) {
                    mapRef.current.fitToCoordinates(coordinates, {
                        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                        animated: true,
                    });
                }
            }
        } catch (error) {
            console.error('Error loading routes:', error);
            Alert.alert('Error', 'Gagal memuat rute');
        } finally {
            setLoading(false);
        }
    };

    // ✅ FIX: Load full route data before navigation (sama seperti FeedScreen & ProfileScreen)
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
                    photoUri: point.photo_url,
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

    const handleMarkerPress = (route: ExploreRoute) => {
        setSelectedRoute(route);

        // Zoom to route
        if (mapRef.current && route.polyline.length > 0) {
            const coordinates = route.polyline.map(point => ({
                latitude: point.lat,
                longitude: point.lng,
            }));

            mapRef.current.fitToCoordinates(coordinates, {
                edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
                animated: true,
            });
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

    const getSportColor = (type: string) => {
        switch (type) {
            case 'running':
                return '#EF4444';
            case 'cycling':
                return '#3B82F6';
            case 'walking':
                return '#10B981';
            default:
                return '#6366F1';
        }
    };

    const filteredRoutes = routes.filter(route =>
        filterType === 'all' ? true : route.sport_type === filterType
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Explore Routes</Text>
                <Text style={styles.headerSubtitle}>
                    {filteredRoutes.length} rute ditemukan
                </Text>
            </View>

            {/* Map */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                    latitude: -7.7956,
                    longitude: 110.3695,
                    latitudeDelta: 0.5,
                    longitudeDelta: 0.5,
                }}
                showsUserLocation
            >
                {/* Draw all routes as polylines */}
                {filteredRoutes.map(route => (
                    <Polyline
                        key={`polyline-${route.id}`}
                        coordinates={route.polyline.map(point => ({
                            latitude: point.lat,
                            longitude: point.lng,
                        }))}
                        strokeColor={getSportColor(route.sport_type)}
                        strokeWidth={3}
                        tappable
                        onPress={() => handleMarkerPress(route)}
                    />
                ))}

                {/* Start point markers */}
                {filteredRoutes.map(route =>
                    route.polyline.length > 0 ? (
                        <Marker
                            key={`marker-${route.id}`}
                            coordinate={{
                                latitude: route.polyline[0].lat,
                                longitude: route.polyline[0].lng,
                            }}
                            onPress={() => handleMarkerPress(route)}
                        >
                            <View
                                style={[
                                    styles.markerContainer,
                                    { backgroundColor: getSportColor(route.sport_type) },
                                ]}
                            >
                                <Text style={styles.markerText}>{getSportIcon(route.sport_type)}</Text>
                            </View>
                        </Marker>
                    ) : null
                )}
            </MapView>

            {/* Filter Buttons */}
            <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {[
                        { value: 'all', label: '🗺️ Semua', count: routes.length },
                        {
                            value: 'running',
                            label: '🏃 Lari',
                            count: routes.filter(r => r.sport_type === 'running').length,
                        },
                        {
                            value: 'cycling',
                            label: '🚴 Sepeda',
                            count: routes.filter(r => r.sport_type === 'cycling').length,
                        },
                        {
                            value: 'walking',
                            label: '🚶 Jalan',
                            count: routes.filter(r => r.sport_type === 'walking').length,
                        },
                    ].map(filter => (
                        <TouchableOpacity
                            key={filter.value}
                            style={[
                                styles.filterButton,
                                filterType === filter.value && styles.filterButtonActive,
                            ]}
                            onPress={() => setFilterType(filter.value)}
                        >
                            <Text
                                style={[
                                    styles.filterButtonText,
                                    filterType === filter.value && styles.filterButtonTextActive,
                                ]}
                            >
                                {filter.label}
                            </Text>
                            <View style={styles.filterBadge}>
                                <Text style={styles.filterBadgeText}>{filter.count}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Selected Route Card */}
            {selectedRoute && (
                <View style={styles.selectedCard}>
                    <View style={styles.selectedHeader}>
                        <View>
                            <Text style={styles.selectedTitle}>{selectedRoute.title}</Text>
                            <Text style={styles.selectedUsername}>
                                by @{selectedRoute.profiles.username}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setSelectedRoute(null)}
                        >
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.selectedStats}>
                        <View style={styles.selectedStat}>
                            <Text style={styles.selectedStatIcon}>
                                {getSportIcon(selectedRoute.sport_type)}
                            </Text>
                            <Text style={styles.selectedStatText}>
                                {selectedRoute.sport_type === 'running'
                                    ? 'Lari'
                                    : selectedRoute.sport_type === 'cycling'
                                        ? 'Sepeda'
                                        : 'Jalan'}
                            </Text>
                        </View>
                        <View style={styles.selectedStat}>
                            <Text style={styles.selectedStatIcon}>📏</Text>
                            <Text style={styles.selectedStatText}>
                                {selectedRoute.distance.toFixed(1)} km
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.viewDetailButton}
                        onPress={() => loadFullRoute(selectedRoute.id)}
                    >
                        <Text style={styles.viewDetailButtonText}>Lihat Detail →</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Loading Overlay */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>Memuat rute...</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        backgroundColor: '#6366F1',
        paddingTop: 50,
        paddingBottom: 16,
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
    map: {
        flex: 1,
    },
    markerContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    markerText: {
        fontSize: 18,
    },
    filterContainer: {
        position: 'absolute',
        top: 120,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    filterButtonActive: {
        backgroundColor: '#6366F1',
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginRight: 8,
    },
    filterButtonTextActive: {
        color: 'white',
    },
    filterBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 24,
        alignItems: 'center',
    },
    filterBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#374151',
    },
    selectedCard: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 10,
    },
    selectedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    selectedTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    selectedUsername: {
        fontSize: 13,
        color: '#9CA3AF',
    },
    closeButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonText: {
        fontSize: 18,
        color: '#6B7280',
        fontWeight: '300',
    },
    selectedStats: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    selectedStat: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    selectedStatIcon: {
        fontSize: 16,
        marginRight: 6,
    },
    selectedStatText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
    },
    viewDetailButton: {
        backgroundColor: '#6366F1',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    viewDetailButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
    },
});

export default ExploreScreen;