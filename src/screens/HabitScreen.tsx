import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Habit } from '../types';
import { StorageService } from '../utils/storageService';
import { DailyResetService } from '../utils/dailyResetService';
import { NotificationService } from '../utils/notificationService';

const HabitScreen: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [timeUntilReset, setTimeUntilReset] = useState('');

  // Load habits on mount
  useEffect(() => {
    loadHabits();
  }, []);

  // Update countdown timer every second
  useEffect(() => {
    const updateTimer = () => {
      const timeString = DailyResetService.getNextResetTimeString();
      setTimeUntilReset(timeString);
    };

    updateTimer(); // Initial call
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadHabits = async () => {
    const savedHabits = await StorageService.getHabits();
    if (savedHabits.length > 0) {
      setHabits(savedHabits);
    } else {
      const defaultHabits = [
        { id: 1, name: 'Olahraga Pagi', completed: false, streak: 5 },
        { id: 2, name: 'Minum 8 Gelas Air', completed: true, streak: 12 },
        { id: 3, name: 'Baca Buku 30 Menit', completed: false, streak: 3 },
        { id: 4, name: 'Meditasi 10 Menit', completed: true, streak: 8 },
      ];
      setHabits(defaultHabits);
      await StorageService.saveHabits(defaultHabits);
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
    
    // Check for milestone (7, 14, 30, 60, 100 days)
    const habit = updatedHabits.find(h => h.id === id);
    if (habit && !habit.completed) {
      const newStreak = habit.streak + 1;
      const milestones = [7, 14, 30, 60, 100];
      
      if (milestones.includes(newStreak)) {
        // Send milestone notification
        await NotificationService.sendStreakMilestone(habit.name, newStreak);
      }
    }
    
    setHabits(updatedHabits);
    await StorageService.saveHabits(updatedHabits);
  };

  const addHabit = async (): Promise<void> => {
    if (newHabitName.trim() === '') {
      Alert.alert('Error', 'Nama kebiasaan tidak boleh kosong!');
      return;
    }

    const newHabit: Habit = {
      id: Date.now(),
      name: newHabitName.trim(),
      completed: false,
      streak: 0,
    };

    const updatedHabits = [...habits, newHabit];
    setHabits(updatedHabits);
    await StorageService.saveHabits(updatedHabits);
    
    setNewHabitName('');
    setShowAddModal(false);
    Alert.alert('Success', 'Kebiasaan baru berhasil ditambahkan!');
  };

  const deleteHabit = async (id: number): Promise<void> => {
    Alert.alert(
      'Hapus Kebiasaan',
      'Apakah kamu yakin ingin menghapus kebiasaan ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const updatedHabits = habits.filter(h => h.id !== id);
            setHabits(updatedHabits);
            await StorageService.saveHabits(updatedHabits);
          },
        },
      ]
    );
  };

  const completedCount = habits.filter(h => h.completed).length;
  const totalCount = habits.length;
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kebiasaan Saya</Text>
        <Text style={styles.headerSubtitle}>Bangun rutinitas positif</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Card */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Progress Hari Ini</Text>
          <View style={styles.progressBarContainer}>
            <View
              style={[styles.progressBarFill, { width: `${percentage}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            {completedCount} dari {totalCount} kebiasaan selesai
          </Text>
        </View>

        {/* Next Reset Timer */}
        <View style={styles.resetCard}>
          <View style={styles.resetHeader}>
            <Text style={styles.resetIcon}>🔄</Text>
            <View>
              <Text style={styles.resetTitle}>Reset Otomatis</Text>
              <Text style={styles.resetSubtitle}>
                Kebiasaan akan direset dalam:
              </Text>
            </View>
          </View>
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{timeUntilReset}</Text>
          </View>
        </View>

        {/* Habits List */}
        <View style={styles.habitsContainer}>
          {habits.map(habit => (
            <View key={habit.id} style={styles.habitCard}>
              <TouchableOpacity
                style={styles.habitContent}
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
                  <View style={styles.habitInfo}>
                    <Text
                      style={[
                        styles.habitName,
                        habit.completed && styles.habitNameCompleted,
                      ]}
                    >
                      {habit.name}
                    </Text>
                    <Text style={styles.habitMeta}>Target: Setiap hari</Text>
                  </View>
                </View>
                <View style={styles.streakContainer}>
                  <Text style={styles.streakNumber}>{habit.streak}</Text>
                  <Text style={styles.streakLabel}>🔥 hari</Text>
                </View>
              </TouchableOpacity>

              {/* Delete Button */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteHabit(habit.id)}
              >
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Add Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>+ Tambah Kebiasaan Baru</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Habit Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tambah Kebiasaan Baru</Text>

            <TextInput
              style={styles.input}
              placeholder="Contoh: Olahraga pagi"
              value={newHabitName}
              onChangeText={setNewHabitName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewHabitName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={addHabit}
              >
                <Text style={styles.saveButtonText}>Simpan</Text>
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
    backgroundColor: '#8B5CF6',
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
    color: '#DDD6FE',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  progressCard: {
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
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  habitsContainer: {
    paddingHorizontal: 16,
  },
  habitCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  habitContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  habitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    marginBottom: 2,
  },
  habitNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  habitMeta: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  streakContainer: {
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  streakNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D97706',
  },
  streakLabel: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
  },
  addButton: {
    backgroundColor: '#8B5CF6',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  resetCard: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  resetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resetIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  resetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#78350F',
  },
  resetSubtitle: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 2,
  },
  timerContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F59E0B',
    fontVariant: ['tabular-nums'],
  },
});

export default HabitScreen;