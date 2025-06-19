// lib/supabaseClient.js
'use client' // Required for Supabase client-side usage in Next.js App Router

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL. Please ensure it's set in your .env.local file and Vercel environment variables.");
}
if (!supabaseAnonKey) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY. Please ensure it's set in your .env.local file and Vercel environment variables.");
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);