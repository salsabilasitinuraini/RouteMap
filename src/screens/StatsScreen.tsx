import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { WeeklyStats } from '../types';
import { StorageService } from '../utils/storageService';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const StatsScreen: React.FC = () => {
  const [weeklyData, setWeeklyData] = useState<WeeklyStats[]>([]);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [averageDaily, setAverageDaily] = useState('0.0');
  const [maxCompleted, setMaxCompleted] = useState(0);
  const [bestDay, setBestDay] = useState('-');
  const [longestStreak, setLongestStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [totalHabits, setTotalHabits] = useState(0);

  // Load data on mount and when screen focused
  useEffect(() => {
    loadStatistics();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadStatistics();
    }, [])
  );

  const loadStatistics = async () => {
    try {
      const habits = await StorageService.getHabits();
      
      // Calculate total habits
      setTotalHabits(habits.length);

      // Get last 7 days data
      const last7Days = getLast7Days();
      const weekData: WeeklyStats[] = last7Days.map(day => ({
        day: day.label,
        completed: 0, // Will be updated with real data
      }));

      // For demo: count completed habits today
      const completedToday = habits.filter(h => h.completed).length;
      weekData[6].completed = completedToday; // Today is the last day

      // Simulate weekly data (in real app, you'd track this daily)
      // For now, we'll use random-ish data based on streaks
      weekData[0].completed = Math.min(habits.length, Math.floor(Math.random() * 3) + 1);
      weekData[1].completed = Math.min(habits.length, Math.floor(Math.random() * 4) + 1);
      weekData[2].completed = Math.min(habits.length, Math.floor(Math.random() * 3));
      weekData[3].completed = Math.min(habits.length, Math.floor(Math.random() * 4) + 1);
      weekData[4].completed = Math.min(habits.length, Math.floor(Math.random() * 3) + 1);
      weekData[5].completed = Math.min(habits.length, Math.floor(Math.random() * 4) + 1);

      setWeeklyData(weekData);

      // Calculate statistics
      const total = weekData.reduce((acc, day) => acc + day.completed, 0);
      setTotalCompleted(total);

      const average = habits.length > 0 ? (total / 7).toFixed(1) : '0.0';
      setAverageDaily(average);

      const max = Math.max(...weekData.map(d => d.completed));
      setMaxCompleted(max);

      const maxDay = weekData.find(d => d.completed === max);
      setBestDay(maxDay?.day || '-');

      // Calculate longest streak from all habits
      const streaks = habits.map(h => h.streak);
      const longest = streaks.length > 0 ? Math.max(...streaks) : 0;
      setLongestStreak(longest);

    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const getLast7Days = () => {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const today = new Date().getDay();
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const dayIndex = (today - i + 7) % 7;
      result.push({
        label: days[dayIndex],
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      });
    }

    return result;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStatistics();
    setRefreshing(false);
  };

  const getCompletionRate = () => {
    if (totalHabits === 0) return '0';
    const todayCompleted = weeklyData[6]?.completed || 0;
    return ((todayCompleted / totalHabits) * 100).toFixed(0);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Statistik</Text>
        <Text style={styles.headerSubtitle}>Pantau progres mingguan</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Completion Rate Today */}
        <View style={styles.rateCard}>
          <Text style={styles.rateLabel}>Completion Rate Hari Ini</Text>
          <View style={styles.rateCircle}>
            <Text style={styles.rateValue}>{getCompletionRate()}%</Text>
          </View>
          <Text style={styles.rateSubtext}>
            {weeklyData[6]?.completed || 0} dari {totalHabits} kebiasaan
          </Text>
        </View>

        {/* Weekly Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>📊 Kebiasaan Selesai (Minggu Ini)</Text>

          <View style={styles.chart}>
            {weeklyData.map((day, index) => {
              const maxHeight = Math.max(...weeklyData.map(d => d.completed), 1);
              const heightPercentage = (day.completed / maxHeight) * 100;
              const isToday = index === 6;

              return (
                <View key={index} style={styles.barContainer}>
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        { height: `${Math.max(heightPercentage, 5)}%` },
                        isToday && styles.barToday,
                      ]}
                    >
                      {day.completed > 0 && (
                        <Text style={styles.barValue}>{day.completed}</Text>
                      )}
                    </View>
                  </View>
                  <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                    {day.day}
                  </Text>
                  {isToday && <Text style={styles.todayIndicator}>•</Text>}
                </View>
              );
            })}
          </View>
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.summaryCardGreen]}>
            <Text style={styles.summaryIcon}>✅</Text>
            <Text style={styles.summaryValue}>{totalCompleted}</Text>
            <Text style={styles.summaryLabel}>Total Diselesaikan</Text>
            <Text style={styles.summarySubtext}>minggu ini</Text>
          </View>

          <View style={[styles.summaryCard, styles.summaryCardBlue]}>
            <Text style={styles.summaryIcon}>📈</Text>
            <Text style={styles.summaryValue}>{averageDaily}</Text>
            <Text style={styles.summaryLabel}>Rata-rata Harian</Text>
            <Text style={styles.summarySubtext}>kebiasaan/hari</Text>
          </View>

          <View style={[styles.summaryCard, styles.summaryCardPurple]}>
            <Text style={styles.summaryIcon}>🏆</Text>
            <Text style={styles.summaryValue}>{maxCompleted}</Text>
            <Text style={styles.summaryLabel}>Best Day</Text>
            <Text style={styles.summarySubtext}>hari {bestDay}</Text>
          </View>

          <View style={[styles.summaryCard, styles.summaryCardOrange]}>
            <Text style={styles.summaryIcon}>🔥</Text>
            <Text style={styles.summaryValue}>{longestStreak}</Text>
            <Text style={styles.summaryLabel}>Streak Terpanjang</Text>
            <Text style={styles.summarySubtext}>hari berturut</Text>
          </View>
        </View>

        {/* Insights */}
        <View style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>💡 Insights</Text>

          {maxCompleted > 0 ? (
            <View style={styles.insightItem}>
              <Text style={styles.insightIcon}>🎯</Text>
              <View style={styles.insightContent}>
                <Text style={styles.insightText}>
                  Kamu paling produktif di{' '}
                  <Text style={styles.insightBold}>hari {bestDay}</Text> dengan{' '}
                  {maxCompleted} kebiasaan diselesaikan
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.insightItem}>
            <Text style={styles.insightIcon}>📅</Text>
            <View style={styles.insightContent}>
              <Text style={styles.insightText}>
                Rata-rata{' '}
                <Text style={styles.insightBold}>{averageDaily} kebiasaan</Text>{' '}
                diselesaikan per hari minggu ini
              </Text>
            </View>
          </View>

          {longestStreak >= 7 ? (
            <View style={styles.insightItem}>
              <Text style={styles.insightIcon}>🔥</Text>
              <View style={styles.insightContent}>
                <Text style={styles.insightText}>
                  Luar biasa! Streak terpanjang kamu sudah{' '}
                  <Text style={styles.insightBold}>{longestStreak} hari</Text>!
                  Pertahankan konsistensi ini!
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.insightItem}>
              <Text style={styles.insightIcon}>⚡</Text>
              <View style={styles.insightContent}>
                <Text style={styles.insightText}>
                  {totalCompleted > 0
                    ? 'Terus tingkatkan konsistensi untuk membangun streak yang lebih panjang!'
                    : 'Mulai selesaikan kebiasaan untuk melihat progress!'}
                </Text>
              </View>
            </View>
          )}

          {parseInt(getCompletionRate()) === 100 && totalHabits > 0 ? (
            <View style={styles.insightItem}>
              <Text style={styles.insightIcon}>🌟</Text>
              <View style={styles.insightContent}>
                <Text style={styles.insightText}>
                  <Text style={styles.insightBold}>Perfect day!</Text> Kamu
                  menyelesaikan semua kebiasaan hari ini! 🎉
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Refresh Hint */}
        <View style={styles.refreshHint}>
          <Text style={styles.refreshHintText}>
            💡 Tarik ke bawah untuk refresh data
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
    backgroundColor: '#F59E0B',
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
    color: '#FEF3C7',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  rateCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  rateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 16,
  },
  rateCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EFF6FF',
    borderWidth: 8,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  rateValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  rateSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  chartCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
    paddingBottom: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barWrapper: {
    width: '100%',
    height: 180,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  bar: {
    width: '100%',
    backgroundColor: '#6366F1',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 6,
    minHeight: 30,
  },
  barToday: {
    backgroundColor: '#F59E0B',
  },
  barValue: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dayLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontWeight: '600',
  },
  dayLabelToday: {
    color: '#F59E0B',
    fontWeight: 'bold',
  },
  todayIndicator: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: -4,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  summaryCard: {
    width: (width - 44) / 2,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryCardGreen: {
    backgroundColor: '#D1FAE5',
  },
  summaryCardBlue: {
    backgroundColor: '#DBEAFE',
  },
  summaryCardPurple: {
    backgroundColor: '#E9D5FF',
  },
  summaryCardOrange: {
    backgroundColor: '#FED7AA',
  },
  summaryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 2,
  },
  summarySubtext: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  insightsCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 4,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  insightIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  insightBold: {
    fontWeight: 'bold',
    color: '#1F2937',
  },
  refreshHint: {
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 16,
  },
  refreshHintText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});

export default StatsScreen;