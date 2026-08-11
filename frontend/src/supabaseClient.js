import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jdkduznbbwdcftyuqvod.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FPICPexdGCBc1xLp0rJ8Tw_3_3oDsRo'; // Replace with your full publishable key

// Ensure 'export' is written right before 'const supabase'
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);