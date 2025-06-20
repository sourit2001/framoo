import { createBrowserClient } from '@supabase/ssr';

// This function creates a new Supabase client instance for the browser.
// It should be called within a React component or a client-side function
// to ensure environment variables are loaded correctly.
export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key is missing from environment variables. Check .env.local and ensure the Next.js development server was restarted after changes.');
    // Returning null or a mock client might be an option here,
    // but allowing it to proceed to createBrowserClient will also result in an error,
    // clearly indicating the missing env vars.
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}