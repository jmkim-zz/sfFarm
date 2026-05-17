import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

/**
 * 브라우저(Client Components)에서 재사용할 단일 Supabase 인스턴스
 * 사용자의 세션을 유지하고 DB 데이터 Fetch 시 사용됩니다.
 */
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');