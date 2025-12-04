import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, Route } from '../types';

// Storage Keys
const STORAGE_KEYS = {
  HABITS: '@habitumap_habits',
  ROUTES: '@habitumap_routes',
  CURRENT_TRACKING: '@habitumap_current_tracking',
};

export class StorageService {
  // ============= HABITS =============
  
  /**
   * Save habits to storage
   */
  static async saveHabits(habits: Habit[]): Promise<boolean> {
    try {
      const jsonValue = JSON.stringify(habits);
      await AsyncStorage.setItem(STORAGE_KEYS.HABITS, jsonValue);
      return true;
    } catch (error) {
      console.error('Error saving habits:', error);
      return false;
    }
  }

  /**
   * Get habits from storage
   */
  static async getHabits(): Promise<Habit[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.HABITS);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Error loading habits:', error);
      return [];
    }
  }

  /**
   * Add new habit
   */
  static async addHabit(habit: Habit): Promise<boolean> {
    try {
      const habits = await this.getHabits();
      habits.push(habit);
      return await this.saveHabits(habits);
    } catch (error) {
      console.error('Error adding habit:', error);
      return false;
    }
  }

  /**
   * Update habit
   */
  static async updateHabit(habitId: number, updatedHabit: Partial<Habit>): Promise<boolean> {
    try {
      const habits = await this.getHabits();
      const index = habits.findIndex(h => h.id === habitId);
      if (index !== -1) {
        habits[index] = { ...habits[index], ...updatedHabit };
        return await this.saveHabits(habits);
      }
      return false;
    } catch (error) {
      console.error('Error updating habit:', error);
      return false;
    }
  }

  /**
   * Delete habit
   */
  static async deleteHabit(habitId: number): Promise<boolean> {
    try {
      const habits = await this.getHabits();
      const filtered = habits.filter(h => h.id !== habitId);
      return await this.saveHabits(filtered);
    } catch (error) {
      console.error('Error deleting habit:', error);
      return false;
    }
  }

  /**
   * Reset all habits completion (call this daily at midnight)
   */
  static async resetDailyHabits(): Promise<boolean> {
    try {
      const habits = await this.getHabits();
      const resetHabits = habits.map(h => ({ ...h, completed: false }));
      return await this.saveHabits(resetHabits);
    } catch (error) {
      console.error('Error resetting habits:', error);
      return false;
    }
  }

  // ============= ROUTES =============

  /**
   * Save routes to storage
   */
  static async saveRoutes(routes: Route[]): Promise<boolean> {
    try {
      const jsonValue = JSON.stringify(routes);
      await AsyncStorage.setItem(STORAGE_KEYS.ROUTES, jsonValue);
      return true;
    } catch (error) {
      console.error('Error saving routes:', error);
      return false;
    }
  }

  /**
   * Get routes from storage
   */
  static async getRoutes(): Promise<Route[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.ROUTES);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Error loading routes:', error);
      return [];
    }
  }

  /**
   * Add new route
   */
  static async addRoute(route: Route): Promise<boolean> {
    try {
      const routes = await this.getRoutes();
      routes.unshift(route); // Add to beginning (newest first)
      return await this.saveRoutes(routes);
    } catch (error) {
      console.error('Error adding route:', error);
      return false;
    }
  }

  /**
   * Delete route
   */
  static async deleteRoute(routeId: string): Promise<boolean> {
    try {
      const routes = await this.getRoutes();
      const filtered = routes.filter(r => r.id !== routeId);
      return await this.saveRoutes(filtered);
    } catch (error) {
      console.error('Error deleting route:', error);
      return false;
    }
  }

  /**
   * Get route by ID
   */
  static async getRouteById(routeId: string): Promise<Route | null> {
    try {
      const routes = await this.getRoutes();
      return routes.find(r => r.id === routeId) || null;
    } catch (error) {
      console.error('Error getting route:', error);
      return null;
    }
  }

  // ============= CURRENT TRACKING =============

  /**
   * Save current tracking state (for app restore)
   */
  static async saveCurrentTracking(data: any): Promise<boolean> {
    try {
      const jsonValue = JSON.stringify(data);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_TRACKING, jsonValue);
      return true;
    } catch (error) {
      console.error('Error saving current tracking:', error);
      return false;
    }
  }

  /**
   * Get current tracking state
   */
  static async getCurrentTracking(): Promise<any | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_TRACKING);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error loading current tracking:', error);
      return null;
    }
  }

  /**
   * Clear current tracking
   */
  static async clearCurrentTracking(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_TRACKING);
      return true;
    } catch (error) {
      console.error('Error clearing current tracking:', error);
      return false;
    }
  }

  // ============= UTILITIES =============

  /**
   * Clear all app data
   */
  static async clearAllData(): Promise<boolean> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.HABITS,
        STORAGE_KEYS.ROUTES,
        STORAGE_KEYS.CURRENT_TRACKING,
      ]);
      return true;
    } catch (error) {
      console.error('Error clearing all data:', error);
      return false;
    }
  }

  /**
   * Get storage info (for debugging)
   */
  static async getStorageInfo(): Promise<{
    habitsCount: number;
    routesCount: number;
    hasTracking: boolean;
  }> {
    try {
      const habits = await this.getHabits();
      const routes = await this.getRoutes();
      const tracking = await this.getCurrentTracking();
      
      return {
        habitsCount: habits.length,
        routesCount: routes.length,
        hasTracking: tracking !== null,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        habitsCount: 0,
        routesCount: 0,
        hasTracking: false,
      };
    }
  }
}