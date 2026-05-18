/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase credentials missing! To fix this in Vercel or GitHub:\n' +
    '1. Go to project settings > Environment Variables.\n' +
    '2. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n' +
    '3. Re-deploy the application.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
