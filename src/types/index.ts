// Types untuk Habit
export interface Habit {
  id: number;
  name: string;
  completed: boolean;
  streak: number;
}

// Types untuk Location Point
export interface LocationPoint {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  note?: string;
  photoUri?: string;
  photo_url?: string;
  title?: string;
}

// Types untuk Route
export interface Route {
  id: string;
  date: string;
  duration: string;
  distance: string;
  points: number;
  coordinates: LocationPoint[];
}

// Types untuk Tracking State
export interface TrackingState {
  isTracking: boolean;
  duration: string;
  distance: string;
  points: number;
  currentRoute: LocationPoint[];
}

// Types untuk Stats
export interface WeeklyStats {
  day: string;
  completed: number;
}

export interface OverallStats {
  totalCompleted: number;
  averageDaily: number;
  weeklyData: WeeklyStats[];
}