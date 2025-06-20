'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createSupabaseBrowserClient } from '../../lib/supabaseClient'; // Correctly import the function
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  // Call the function to get a Supabase client instance
  const supabase = createSupabaseBrowserClient(); 
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Added for better loading state

  useEffect(() => {
    // Ensure supabase client is available before proceeding
    if (!supabase) {
      console.error("Supabase client is not available in LoginPage.");
      setIsLoading(false);
      setSessionChecked(true); // Allow UI to render an error or fallback
      return;
    }

    async function checkInitialSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push('/');
        } else {
          setSessionChecked(true);
        }
      } catch (error) {
        console.error("Error checking initial session:", error);
        setSessionChecked(true); // Allow UI to render even if there's an error
      } finally {
        setIsLoading(false);
      }
    }
    checkInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          router.push('/');
        }
      }
    );

    // Cleanup function
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      } else if (authListener && typeof authListener.unsubscribe === 'function') {
        // Fallback for older versions or different structures
        authListener.unsubscribe();
      }
    };
  }, [router, supabase]); // Add supabase to dependency array

  if (isLoading || !sessionChecked) {
    return <div>Loading...</div>;
  }

  // Ensure supabase client is available before rendering Auth UI
  if (!supabase) {
    return <div>Error: Supabase client could not be initialized. Please check console.</div>;
  }

  return (
    <div style={{ maxWidth: '420px', margin: '96px auto' }}>
      <Auth 
        supabaseClient={supabase} 
        appearance={{ theme: ThemeSupa }} 
        providers={['google', 'github']} 
        redirectTo={typeof window !== 'undefined' ? window.location.origin : ''} // Ensure redirectTo is a full URL for OAuth
      />
    </div>
  );
}