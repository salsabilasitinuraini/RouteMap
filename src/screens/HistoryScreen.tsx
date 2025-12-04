import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Route } from '../types';
import { StorageService } from '../utils/storageService';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type HistoryScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MainTabs'
>;

interface HistoryScreenProps {
  navigation: HistoryScreenNavigationProp;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  const [routes, setRoutes] = useState<Route[]>([]);

  // Load routes on mount and when screen focused
  useEffect(() => {
    loadRoutes();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadRoutes();
    }, [])
  );

  const loadRoutes = async () => {
    const savedRoutes = await StorageService.getRoutes();
    setRoutes(savedRoutes);
  };

  const viewRouteDetail = (route: Route): void => {
    navigation.navigate('RouteDetail', {
      routeId: route.id,
      routeData: route,
    });
  };

  const deleteRoute = async (id: string): Promise<void> => {
    Alert.alert(
      'Hapus Riwayat',
      'Apakah kamu yakin ingin menghapus riwayat ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deleteRoute(id);
            await loadRoutes();
          },
        },
      ]
    );
  };

  const totalDistance = routes.reduce((acc, route) => {
    const distance = parseFloat(route.distance.replace(' km', ''));
    return acc + distance;
  }, 0);

  const totalRoutes = routes.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Riwayat Perjalanan</Text>
        <Text style={styles.headerSubtitle}>Lihat semua rute harian</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>🗺️</Text>
            <View>
              <Text style={styles.summaryValue}>{totalRoutes}</Text>
              <Text style={styles.summaryLabel}>Total Rute</Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>📍</Text>
            <View>
              <Text style={styles.summaryValue}>{totalDistance.toFixed(1)} km</Text>
              <Text style={styles.summaryLabel}>Total Jarak</Text>
            </View>
          </View>
        </View>

        {/* Routes List */}
        <View style={styles.routesContainer}>
          {routes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={styles.emptyTitle}>Belum Ada Riwayat</Text>
              <Text style={styles.emptyText}>
                Mulai tracking perjalanan untuk melihat riwayat
              </Text>
            </View>
          ) : (
            routes.map((route, index) => (
              <TouchableOpacity
                key={route.id}
                style={styles.routeCard}
                onPress={() => viewRouteDetail(route)}
                activeOpacity={0.7}
              >
                <View style={styles.routeHeader}>
                  <View style={styles.routeDateContainer}>
                    <View style={styles.dateIconContainer}>
                      <Text style={styles.dateIcon}>📅</Text>
                    </View>
                    <View>
                      <Text style={styles.routeDate}>{route.date}</Text>
                      <Text style={styles.routeIndex}>Rute #{routes.length - index}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteIconButton}
                    onPress={() => deleteRoute(route.id)}
                  >
                    <Text style={styles.deleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.routeStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statIcon}>⏱️</Text>
                    <View>
                      <Text style={styles.statValue}>{route.duration}</Text>
                      <Text style={styles.statLabel}>Durasi</Text>
                    </View>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={styles.statIcon}>📏</Text>
                    <View>
                      <Text style={styles.statValue}>{route.distance}</Text>
                      <Text style={styles.statLabel}>Jarak</Text>
                    </View>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={styles.statIcon}>📌</Text>
                    <View>
                      <Text style={styles.statValue}>{route.points}</Text>
                      <Text style={styles.statLabel}>Titik</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>Lihat Detail →</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
    color: '#D1FAE5',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: 'white',
    margin: 16,
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
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIcon: {
    fontSize: 32,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  routesContainer: {
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
    marginBottom: 16,
  },
  routeDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateIcon: {
    fontSize: 24,
  },
  routeDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  routeIndex: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  deleteIconButton: {
    padding: 8,
  },
  deleteIcon: {
    fontSize: 20,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  viewButton: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default HistoryScreen;