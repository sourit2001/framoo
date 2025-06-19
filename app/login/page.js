// app/login/page.js
'use client' // This directive is necessary for using client-side hooks like useEffect and useRouter

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../../lib/supabaseClient' // Adjusted path to lib folder
import { useRouter } from 'next/navigation' // Use 'next/navigation' for App Router
import { useEffect, useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    // Check initial session state on component mount
    async function checkInitialSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/');
      } else {
        setSessionChecked(true); // Only allow rendering Auth UI if no active session
      }
    }
    checkInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          router.push('/');
        } else {
          // Handle logout or session expiry if needed
          // if (router.pathname !== '/login') { // Avoid redirect loops
          //   router.push('/login');
          // }
        }
      }
    );

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      } else if (authListener && typeof authListener.unsubscribe === 'function') {
        authListener.unsubscribe();
      }
    };
  }, [router]);

  if (!sessionChecked) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px', background: '#f0f2f5' }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '30px', border: '1px solid #d9d9d9', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: 'white' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '24px', fontWeight: '500', color: '#333' }}>
          Sign In
        </h2>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google', 'github']} // Example social providers
          theme="default"
          socialLayout="horizontal"
          showLinks={true}
        />
      </div>
    </div>
  );
}