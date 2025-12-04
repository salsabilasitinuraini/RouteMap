import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_SETTINGS_KEY = '@habitumap_notification_settings';

export interface NotificationSettings {
  enabled: boolean;
  reminderTime: {
    hour: number;
    minute: number;
  };
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permission denied');
        return false;
      }

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366F1',
        });

        await Notifications.setNotificationChannelAsync('habits', {
          name: 'Habit Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8B5CF6',
          sound: 'default',
        });
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Schedule daily habit reminder
   */
  static async scheduleDailyReminder(
    hour: number = 9,
    minute: number = 0
  ): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      // Cancel existing reminders first
      await this.cancelAllReminders();

      const trigger: Notifications.DailyTriggerInput = {
        hour,
        minute,
        repeats: true,
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Kebiasaan Harian',
          body: 'Jangan lupa cek kebiasaan hari ini! 💪',
          data: { type: 'daily_reminder' },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger,
      });

      console.log(`Daily reminder scheduled: ${notificationId} at ${hour}:${minute}`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling daily reminder:', error);
      return null;
    }
  }

  /**
   * Schedule evening reminder
   */
  static async scheduleEveningReminder(
    hour: number = 20,
    minute: number = 0
  ): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const trigger: Notifications.DailyTriggerInput = {
        hour,
        minute,
        repeats: true,
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌙 Review Harian',
          body: 'Sudah selesai semua kebiasaan hari ini?',
          data: { type: 'evening_reminder' },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger,
      });

      console.log(`Evening reminder scheduled: ${notificationId} at ${hour}:${minute}`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling evening reminder:', error);
      return null;
    }
  }

  /**
   * Send instant notification (for testing)
   */
  static async sendInstantNotification(
    title: string,
    body: string
  ): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'instant' },
          sound: true,
        },
        trigger: null, // Send immediately
      });

      console.log('Instant notification sent');
    } catch (error) {
      console.error('Error sending instant notification:', error);
    }
  }

  /**
   * Cancel all scheduled reminders
   */
  static async cancelAllReminders(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All reminders cancelled');
    } catch (error) {
      console.error('Error cancelling reminders:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  static async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Save notification settings
   */
  static async saveSettings(settings: NotificationSettings): Promise<boolean> {
    try {
      const jsonValue = JSON.stringify(settings);
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, jsonValue);
      return true;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      return false;
    }
  }

  /**
   * Get notification settings
   */
  static async getSettings(): Promise<NotificationSettings> {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (jsonValue) {
        return JSON.parse(jsonValue);
      }
    } catch (error) {
      console.error('Error getting notification settings:', error);
    }

    // Default settings
    return {
      enabled: false,
      reminderTime: {
        hour: 9,
        minute: 0,
      },
    };
  }

  /**
   * Enable notifications
   */
  static async enableNotifications(
    morningHour: number = 9,
    morningMinute: number = 0,
    eveningHour: number = 20,
    eveningMinute: number = 0
  ): Promise<boolean> {
    try {
      // Schedule both reminders
      const morningId = await this.scheduleDailyReminder(morningHour, morningMinute);
      const eveningId = await this.scheduleEveningReminder(eveningHour, eveningMinute);

      if (morningId && eveningId) {
        const settings: NotificationSettings = {
          enabled: true,
          reminderTime: {
            hour: morningHour,
            minute: morningMinute,
          },
        };
        await this.saveSettings(settings);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error enabling notifications:', error);
      return false;
    }
  }

  /**
   * Disable notifications
   */
  static async disableNotifications(): Promise<boolean> {
    try {
      await this.cancelAllReminders();
      const settings: NotificationSettings = {
        enabled: false,
        reminderTime: {
          hour: 9,
          minute: 0,
        },
      };
      await this.saveSettings(settings);
      return true;
    } catch (error) {
      console.error('Error disabling notifications:', error);
      return false;
    }
  }

  /**
   * Send habit completion reminder
   */
  static async sendHabitReminder(habitName: string): Promise<void> {
    await this.sendInstantNotification(
      '⏰ Reminder',
      `Jangan lupa: ${habitName}`
    );
  }

  /**
   * Send streak milestone notification
   */
  static async sendStreakMilestone(habitName: string, streak: number): Promise<void> {
    await this.sendInstantNotification(
      '🔥 Milestone Achieved!',
      `${habitName}: ${streak} hari berturut-turut! Luar biasa! 🎉`
    );
  }
}