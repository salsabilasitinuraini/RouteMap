import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from './storageService';

const LAST_RESET_DATE_KEY = '@habitumap_last_reset_date';

export class DailyResetService {
  /**
   * Get last reset date
   */
  private static async getLastResetDate(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LAST_RESET_DATE_KEY);
    } catch (error) {
      console.error('Error getting last reset date:', error);
      return null;
    }
  }

  /**
   * Save last reset date
   */
  private static async saveLastResetDate(date: string): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_RESET_DATE_KEY, date);
    } catch (error) {
      console.error('Error saving last reset date:', error);
    }
  }

  /**
   * Get current date string (YYYY-MM-DD)
   */
  private static getCurrentDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Check if it's a new day and reset if needed
   */
  static async checkAndResetDaily(): Promise<boolean> {
    try {
      const currentDate = this.getCurrentDateString();
      const lastResetDate = await this.getLastResetDate();

      console.log('Current date:', currentDate);
      console.log('Last reset date:', lastResetDate);

      // If it's a new day, reset habits
      if (lastResetDate !== currentDate) {
        console.log('New day detected! Resetting habits...');
        
        const success = await StorageService.resetDailyHabits();
        
        if (success) {
          await this.saveLastResetDate(currentDate);
          console.log('Habits reset successfully!');
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error in daily reset check:', error);
      return false;
    }
  }

  /**
   * Force reset (for testing or manual reset)
   */
  static async forceReset(): Promise<boolean> {
    try {
      const success = await StorageService.resetDailyHabits();
      if (success) {
        const currentDate = this.getCurrentDateString();
        await this.saveLastResetDate(currentDate);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error in force reset:', error);
      return false;
    }
  }

  /**
   * Calculate time until next reset (midnight)
   */
  static getTimeUntilNextReset(): {
    hours: number;
    minutes: number;
    seconds: number;
  } {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds };
  }

  /**
   * Get next reset time as formatted string
   */
  static getNextResetTimeString(): string {
    const time = this.getTimeUntilNextReset();
    return `${time.hours}h ${time.minutes}m ${time.seconds}s`;
  }

  /**
   * Initialize daily reset check (call on app start)
   */
  static async initialize(): Promise<void> {
    console.log('Initializing daily reset service...');
    await this.checkAndResetDaily();
  }

  /**
   * Start interval checker (checks every minute)
   */
  static startIntervalCheck(): NodeJS.Timeout {
    console.log('Starting interval check for daily reset...');
    
    // Check immediately
    this.checkAndResetDaily();

    // Then check every minute
    const interval = setInterval(() => {
      this.checkAndResetDaily();
    }, 60000); // 60 seconds

    return interval;
  }

  /**
   * Stop interval checker
   */
  static stopIntervalCheck(interval: NodeJS.Timeout): void {
    clearInterval(interval);
  }
}