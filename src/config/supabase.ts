import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

// GANTI DENGAN API KEYS KAMU DARI STEP 2!
const supabaseUrl ='https://fxdwvgbhdkniddjcedlw.supabase.co'; // Ganti ini
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZHd2Z2JoZGtuaWRkamNlZGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MTcyMzAsImV4cCI6MjA4MDI5MzIzMH0.OUYEEpYIjOlP-ZT21bRZnx1X4SUh8HfvSDIQdafZ1N8'; // Ganti ini

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper functions
export const uploadPhoto = async (
  userId: string,
  routeId: string,
  photoUri: string
): Promise<string | null> => {
  try {
    const ext = photoUri.split('.').pop();
    const fileName = `${userId}/${routeId}/${Date.now()}.${ext}`;
    const contentType = `image/${ext}`;

    // Read the file from the URI as a base64 string
    const base64 = await FileSystem.readAsStringAsync(photoUri, {
      encoding: 'base64',
    });

    // Decode the base64 string into an ArrayBuffer
    const arrayBuffer = decode(base64);

    const { data, error } = await supabase.storage
      .from('route-photos')
      .upload(fileName, arrayBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('route-photos')
      .getPublicUrl(fileName);

    console.log('✅ Photo uploaded:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error uploading photo:', error);
    return null;
  }
};