import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Linking,
  Switch,
} from 'react-native';
import { StorageService } from '../utils/storageService';
import { DailyResetService } from '../utils/dailyResetService';
import { NotificationService } from '../utils/notificationService';


const SettingsScreen: React.FC = () => {
  const [storageInfo, setStorageInfo] = useState({
    habitsCount: 0,
    routesCount: 0,
    hasTracking: false,
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    loadStorageInfo();
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    const settings = await NotificationService.getSettings();
    setNotificationsEnabled(settings.enabled);
  };

  const loadStorageInfo = async () => {
    const info = await StorageService.getStorageInfo();
    setStorageInfo(info);
  };

  const handleClearAllData = () => {
    Alert.alert(
      '⚠️ Hapus Semua Data',
      'Apakah kamu yakin ingin menghapus SEMUA data?\n\nIni akan menghapus:\n• Semua kebiasaan\n• Semua riwayat rute\n• Semua foto & catatan\n\n⚠️ Aksi ini tidak bisa dibatalkan!',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Semua',
          style: 'destructive',
          onPress: async () => {
            const success = await StorageService.clearAllData();
            if (success) {
              Alert.alert(
                'Berhasil',
                'Semua data telah dihapus. Aplikasi akan restart.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Force reload storage info
                      loadStorageInfo();
                    },
                  },
                ]
              );
            } else {
              Alert.alert('Error', 'Gagal menghapus data');
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const habits = await StorageService.getHabits();
      const routes = await StorageService.getRoutes();

      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        habits,
        routes: routes.map(route => ({
          ...route,
          // Remove photo URIs for smaller file size
          coordinates: route.coordinates.map(coord => ({
            ...coord,
            photoUri: coord.photoUri ? '[PHOTO_REMOVED]' : undefined,
          })),
        })),
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Share as text (could be saved to file)
      await Share.share({
        message: jsonString,
        title: 'HabituMap Data Export',
      });
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Gagal export data');
    }
  };

  const handleResetHabits = async () => {
    Alert.alert(
      'Reset Kebiasaan',
      'Reset completion status semua kebiasaan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            await DailyResetService.forceReset();
            Alert.alert('Berhasil', 'Semua kebiasaan telah direset');
            loadStorageInfo();
          },
        },
      ]
    );
  };

  const handleTestAutoReset = async () => {
    Alert.alert(
      '🧪 Test Auto-Reset',
      'Test apakah auto-reset bekerja dengan baik?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Test',
          onPress: async () => {
            const wasReset = await DailyResetService.checkAndResetDaily();
            if (wasReset) {
              Alert.alert('✅ Reset Dilakukan', 'Hari baru terdeteksi, habits telah direset!');
            } else {
              Alert.alert('ℹ️ Tidak Ada Reset', 'Masih hari yang sama, belum perlu reset.');
            }
            loadStorageInfo();
          },
        },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'Tentang HabituMap',
      'HabituMap v1.0.0\n\n' +
      '📱 Habit & Route Tracker\n\n' +
      'Aplikasi untuk tracking kebiasaan harian dan mencatat perjalanan dengan GPS.\n\n' +
      '✨ Fitur:\n' +
      '• Habit tracking dengan streak\n' +
      '• GPS route tracking\n' +
      '• Catatan lokasi + foto\n' +
      '• Statistik mingguan\n' +
      '• Riwayat perjalanan\n\n' +
      '© 2024 HabituMap\n' +
      'Built with React Native & Expo'
    );
  };

  const handleRateApp = () => {
    Alert.alert(
      '⭐ Rate App',
      'Terima kasih! Fitur rating akan tersedia di versi production.',
      [{ text: 'OK' }]
    );
  };

  const handleHelp = () => {
    Alert.alert(
      '📖 Bantuan',
      'Cara menggunakan HabituMap:\n\n' +
      '1️⃣ HOME\n' +
      '• Tekan "Mulai Tracking" untuk mulai merekam rute\n' +
      '• Tambah catatan + foto di lokasi tertentu\n' +
      '• Tekan "Stop" untuk menyimpan rute\n\n' +
      '2️⃣ HABIT\n' +
      '• Tambah kebiasaan yang ingin dilacak\n' +
      '• Centang setiap hari untuk streak\n\n' +
      '3️⃣ HISTORY\n' +
      '• Lihat semua rute yang pernah dibuat\n' +
      '• Tap untuk melihat detail + foto\n\n' +
      '4️⃣ STATS\n' +
      '• Lihat grafik progress mingguan\n' +
      '• Analisa kebiasaan terbaik'
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      '🔒 Privasi',
      'HabituMap menghormati privasi Anda:\n\n' +
      '✓ Semua data disimpan LOKAL di device\n' +
      '✓ Tidak ada data dikirim ke server\n' +
      '✓ Lokasi GPS hanya untuk tracking rute\n' +
      '✓ Foto disimpan di storage lokal\n\n' +
      'Data Anda sepenuhnya milik Anda!'
    );
  };

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      // Enable notifications
      const success = await NotificationService.enableNotifications(9, 0, 20, 0);
      if (success) {
        setNotificationsEnabled(true);
        Alert.alert(
          '🔔 Notifikasi Aktif',
          'Reminder akan dikirim:\n• Pagi: 09:00\n• Malam: 20:00'
        );
      } else {
        Alert.alert('Error', 'Gagal mengaktifkan notifikasi. Periksa permission.');
      }
    } else {
      // Disable notifications
      const success = await NotificationService.disableNotifications();
      if (success) {
        setNotificationsEnabled(false);
        Alert.alert('Notifikasi Dinonaktifkan', 'Reminder telah dibatalkan.');
      }
    }
  };

  const handleTestNotification = async () => {
    await NotificationService.sendInstantNotification(
      '✅ Test Notification',
      'Notifikasi berfungsi dengan baik! 🎉'
    );
    Alert.alert('Terkirim', 'Cek notification tray!');
  };

  const handleViewScheduledNotifications = async () => {
    const scheduled = await NotificationService.getAllScheduledNotifications();
    if (scheduled.length === 0) {
      Alert.alert('Tidak Ada', 'Belum ada notifikasi terjadwal.');
    } else {
      const list = scheduled
        .map((notif, index) => {
          const trigger = notif.trigger as any;
          return `${index + 1}. ${notif.content.title}\n   Waktu: ${trigger.hour}:${String(trigger.minute).padStart(2, '0')}`;
        })
        .join('\n\n');
      Alert.alert('Notifikasi Terjadwal', list);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pengaturan</Text>
        <Text style={styles.headerSubtitle}>Kelola aplikasi & data</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Storage Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💾 Info Penyimpanan</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>{storageInfo.habitsCount}</Text>
              <Text style={styles.infoLabel}>Kebiasaan</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>{storageInfo.routesCount}</Text>
              <Text style={styles.infoLabel}>Rute</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>
                {storageInfo.hasTracking ? '✓' : '✗'}
              </Text>
              <Text style={styles.infoLabel}>Tracking</Text>
            </View>
          </View>
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notifikasi</Text>

          <View style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Text style={styles.menuIconText}>🔔</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Reminder Harian</Text>
              <Text style={styles.menuSubtitle}>
                {notificationsEnabled ? 'Pagi 09:00 & Malam 20:00' : 'Nonaktif'}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#D1D5DB', true: '#8B5CF6' }}
              thumbColor={notificationsEnabled ? '#6366F1' : '#F3F4F6'}
            />
          </View>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleTestNotification}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <Text style={styles.menuIconText}>🧪</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Test Notifikasi</Text>
              <Text style={styles.menuSubtitle}>Kirim notifikasi sekarang</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleViewScheduledNotifications}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <Text style={styles.menuIconText}>📋</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Lihat Jadwal Notifikasi</Text>
              <Text style={styles.menuSubtitle}>Notifikasi terjadwal</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗂️ Manajemen Data</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleExportData}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <Text style={styles.menuIconText}>📤</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Export Data</Text>
              <Text style={styles.menuSubtitle}>Backup data ke JSON</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleResetHabits}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <Text style={styles.menuIconText}>🔄</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Reset Kebiasaan Harian</Text>
              <Text style={styles.menuSubtitle}>Reset completion status</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleTestAutoReset}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <Text style={styles.menuIconText}>🧪</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Test Auto-Reset</Text>
              <Text style={styles.menuSubtitle}>Cek sistem reset otomatis</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemDanger]}
            onPress={handleClearAllData}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <Text style={styles.menuIconText}>🗑️</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, styles.menuTitleDanger]}>
                Hapus Semua Data
              </Text>
              <Text style={styles.menuSubtitle}>Tidak bisa dibatalkan!</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* App Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Aplikasi</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleAbout}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <Text style={styles.menuIconText}>ℹ️</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Tentang HabituMap</Text>
              <Text style={styles.menuSubtitle}>Versi 1.0.0</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleHelp}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <Text style={styles.menuIconText}>📖</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Bantuan & Tutorial</Text>
              <Text style={styles.menuSubtitle}>Cara menggunakan app</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handlePrivacy}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <Text style={styles.menuIconText}>🔒</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Privasi & Keamanan</Text>
              <Text style={styles.menuSubtitle}>Data 100% lokal</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleRateApp}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <Text style={styles.menuIconText}>⭐</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Rate App</Text>
              <Text style={styles.menuSubtitle}>Beri rating & review</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>HabituMap v1.0.0</Text>
          <Text style={styles.footerSubtext}>
            Made with ❤️ using React Native
          </Text>
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
  infoCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  infoDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemDanger: {
    backgroundColor: '#FEF2F2',
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuIconText: {
    fontSize: 24,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  menuTitleDanger: {
    color: '#DC2626',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  menuArrow: {
    fontSize: 24,
    color: '#D1D5DB',
    fontWeight: '300',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default SettingsScreen;