import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rdwqxoyxtsdgnforlltd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkd3F4b3l4dHNkZ25mb3JsbHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MDkxNzIsImV4cCI6MjA5ODI4NTE3Mn0.vHiRL4Gz5X42CN0qdGn1pxWteXYgYq8XGszNexy3exk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);