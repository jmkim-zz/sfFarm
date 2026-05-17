import { createClient } from '@supabase/supabase-js';

/**
 * 서버 환경(Server Components, API Routes)에서 호출될 때마다 
 * 새로운 인스턴스를 생성하여 반환하는 Supabase 클라이언트 팩토리 함수
 */
export const createServerSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
};