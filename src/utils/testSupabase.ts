import { supabase } from '../config/supabase';

export const testSupabaseConnection = async () => {
  try {
    // Test 1: Check connection
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Supabase Error:', error);
      return false;
    }

    console.log('✅ Supabase Connected!');
    console.log('📊 Data:', data);
    return true;
  } catch (error) {
    console.error('❌ Connection Error:', error);
    return false;
  }
};