import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';

interface MyRoute {
    id: string;
    title: string;
    sport_type: string;
    distance: number;
    duration: string;
    likes_count: number;
    created_at: string;
}

interface ProfileScreenProps {
    navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
    const { user, profile, signOut, updateProfile } = useAuth();
    const [myRoutes, setMyRoutes] = useState<MyRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editUsername, setEditUsername] = useState('');
    const [editBio, setEditBio] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadMyRoutes();
        if (profile) {
            setEditUsername(profile.username);
            setEditBio(profile.bio || '');
        }
    }, [profile]);

    const loadMyRoutes = async () => {
        if (!user) return;

        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('routes')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setMyRoutes(data || []);
        } catch (error) {
            console.error('Error loading my routes:', error);
            Alert.alert('Error', 'Gagal memuat rute');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadMyRoutes();
        setRefreshing(false);
    };

    const handleSaveProfile = async () => {
        if (!editUsername.trim()) {
            Alert.alert('Error', 'Username tidak boleh kosong');
            return;
        }

        setIsSaving(true);

        const success = await updateProfile({
            username: editUsername.trim(),
            bio: editBio.trim() || undefined,
        });

        setIsSaving(false);

        if (success) {
            Alert.alert('Success', 'Profile berhasil diupdate!');
            setShowEditModal(false);
        } else {
            Alert.alert('Error', 'Gagal update profile');
        }
    };

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

    const handleDeleteRoute = async (routeId: string) => {
        Alert.alert('Hapus Rute', 'Yakin ingin menghapus rute ini?', [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Hapus',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const { error } = await supabase
                            .from('routes')
                            .delete()
                            .eq('id', routeId);

                        if (error) throw error;

                        Alert.alert('Success', 'Rute berhasil dihapus');
                        await loadMyRoutes();
                    } catch (error) {
                        console.error('Error deleting route:', error);
                        Alert.alert('Error', 'Gagal menghapus rute');
                    }
                },
            },
        ]);
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Yakin ingin keluar?', [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: signOut,
            },
        ]);
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

    const totalDistance = myRoutes.reduce((acc, route) => acc + route.distance, 0);
    const totalLikes = myRoutes.reduce((acc, route) => acc + route.likes_count, 0);

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>Memuat profile...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {profile?.username?.charAt(0).toUpperCase() || 'U'}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.username}>@{profile?.username}</Text>
                    {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
                    <Text style={styles.email}>{user?.email}</Text>

                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => setShowEditModal(true)}
                    >
                        <Text style={styles.editButtonText}>✏️ Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{myRoutes.length}</Text>
                        <Text style={styles.statLabel}>Rute</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{totalDistance.toFixed(1)}</Text>
                        <Text style={styles.statLabel}>Total KM</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{totalLikes}</Text>
                        <Text style={styles.statLabel}>Likes</Text>
                    </View>
                </View>

                {/* My Routes */}
                <View style={styles.routesSection}>
                    <Text style={styles.sectionTitle}>Rute Saya</Text>

                    {myRoutes.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>📍</Text>
                            <Text style={styles.emptyTitle}>Belum Ada Rute</Text>
                            <Text style={styles.emptyText}>
                                Mulai tracking dan bagikan rute pertama kamu!
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyButton}
                                onPress={() => navigation.navigate('Track')}
                            >
                                <Text style={styles.emptyButtonText}>+ Buat Rute</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        myRoutes.map(route => (
                            <View key={route.id} style={styles.routeCard}>
                                <View style={styles.routeHeader}>
                                    <View style={styles.routeInfo}>
                                        <Text style={styles.sportIcon}>
                                            {getSportIcon(route.sport_type)}
                                        </Text>
                                        <View style={styles.routeTitleContainer}>
                                            <Text style={styles.routeTitle}>{route.title}</Text>
                                            <Text style={styles.routeDate}>
                                                {new Date(route.created_at).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => handleDeleteRoute(route.id)}
                                    >
                                        <Text style={styles.deleteButtonText}>🗑️</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.routeStats}>
                                    <View style={styles.routeStat}>
                                        <Text style={styles.routeStatIcon}>📏</Text>
                                        <Text style={styles.routeStatText}>
                                            {route.distance.toFixed(1)} km
                                        </Text>
                                    </View>
                                    <View style={styles.routeStat}>
                                        <Text style={styles.routeStatIcon}>⏱️</Text>
                                        <Text style={styles.routeStatText}>{route.duration}</Text>
                                    </View>
                                    <View style={styles.routeStat}>
                                        <Text style={styles.routeStatIcon}>❤️</Text>
                                        <Text style={styles.routeStatText}>{route.likes_count}</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.viewButton}
                                    onPress={() => {
                                        // ✅ FIX: Load full route data first
                                        loadFullRoute(route.id);
                                    }}
                                >
                                    <Text style={styles.viewButtonText}>Lihat Detail →</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>🚪 Logout</Text>
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal visible={showEditModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.editModal}>
                        <Text style={styles.modalTitle}>Edit Profile</Text>

                        <Text style={styles.label}>Username</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Username"
                            value={editUsername}
                            onChangeText={setEditUsername}
                            autoCapitalize="none"
                        />

                        <Text style={styles.label}>Bio (opsional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Ceritakan tentang diri kamu..."
                            value={editBio}
                            onChangeText={setEditBio}
                            multiline
                            numberOfLines={3}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowEditModal(false)}
                                disabled={isSaving}
                            >
                                <Text style={styles.cancelButtonText}>Batal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleSaveProfile}
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
    header: {
        backgroundColor: '#6366F1',
        paddingTop: 60,
        paddingBottom: 30,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    avatarContainer: {
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#818CF8',
    },
    avatarText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#6366F1',
    },
    username: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 4,
    },
    bio: {
        fontSize: 14,
        color: '#C7D2FE',
        textAlign: 'center',
        marginBottom: 4,
        paddingHorizontal: 40,
    },
    email: {
        fontSize: 13,
        color: '#C7D2FE',
        marginBottom: 16,
    },
    editButton: {
        backgroundColor: 'white',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20,
    },
    editButtonText: {
        color: '#6366F1',
        fontSize: 14,
        fontWeight: '600',
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginTop: -20,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E5E7EB',
    },
    routesSection: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 16,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
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
        marginBottom: 24,
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
    routeCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    routeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    routeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    sportIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    routeTitleContainer: {
        flex: 1,
    },
    routeTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 2,
    },
    routeDate: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    deleteButton: {
        padding: 8,
    },
    deleteButtonText: {
        fontSize: 20,
    },
    routeStats: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    routeStat: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    routeStatIcon: {
        fontSize: 14,
        marginRight: 6,
    },
    routeStatText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
    },
    viewButton: {
        backgroundColor: '#EEF2FF',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    viewButtonText: {
        color: '#6366F1',
        fontSize: 13,
        fontWeight: '600',
    },
    logoutButton: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#EF4444',
    },
    logoutButtonText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    editModal: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
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
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
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

export default ProfileScreen;