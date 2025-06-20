'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '../lib/supabaseClient'; // Correct path from app/page.js
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  // Ensure supabase client is initialized only once, or handle potential re-renders carefully.
  // For simplicity here, we call it directly. Consider useMemo if needed for complex scenarios.
  const supabase = createSupabaseBrowserClient(); 
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // State for image uploads
  const [subjectImage, setSubjectImage] = useState(null); // Stores the File object
  const [backgroundImage, setBackgroundImage] = useState(null); // Stores the File object
  const [subjectPreview, setSubjectPreview] = useState(''); // Stores the URL for preview
  const [backgroundPreview, setBackgroundPreview] = useState(''); // Stores the URL for preview
  const [isFusing, setIsFusing] = useState(false); // For loading state during API call
  const [fusionError, setFusionError] = useState(''); // For displaying API errors

  useEffect(() => {
    async function getUser() {
      if (!supabase) {
        console.error("Supabase client not available in HomePage useEffect.");
        setLoading(false);
        // router.push('/login'); // Avoid redirect if supabase itself is the issue
        return;
      }
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    getUser();
  }, [router, supabase]); // supabase is a dependency

  const handleLogout = async () => {
    if (!supabase) {
      console.error("Supabase client not available for logout.");
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    // Clear image states on logout
    setSubjectImage(null);
    setBackgroundImage(null);
    if (subjectPreview) URL.revokeObjectURL(subjectPreview);
    if (backgroundPreview) URL.revokeObjectURL(backgroundPreview);
    setSubjectPreview('');
    setBackgroundPreview('');
    router.push('/login');
  };

  const handleImageChange = (e, imageType) => {
    const file = e.target.files[0];
    
    // Clean up previous object URL for the specific image type being changed
    if (imageType === 'subject') {
      if (subjectPreview) URL.revokeObjectURL(subjectPreview);
      setSubjectImage(file || null); // Set to null if no file
      setSubjectPreview(file ? URL.createObjectURL(file) : '');
    } else if (imageType === 'background') {
      if (backgroundPreview) URL.revokeObjectURL(backgroundPreview);
      setBackgroundImage(file || null); // Set to null if no file
      setBackgroundPreview(file ? URL.createObjectURL(file) : '');
    }
  };

  // Effect for cleaning up object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (subjectPreview) {
        URL.revokeObjectURL(subjectPreview);
      }
      if (backgroundPreview) {
        URL.revokeObjectURL(backgroundPreview);
      }
    };
  }, [subjectPreview, backgroundPreview]);

  const handleFusion = async () => {
    if (!subjectImage || !backgroundImage) {
      alert('Please select both subject and background images before starting fusion.');
      return;
    }

    setIsFusing(true);
    setFusionError('');

    const formData = new FormData();
    formData.append('subjectImage', subjectImage);
    formData.append('backgroundImage', backgroundImage);

    try {
      const response = await fetch('/api/fuse', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `API Error: ${response.status}`);
      }

      console.log('Fusion API Response:', result);
      alert(`Fusion successful! Server says: ${result.message}`);
      // TODO: Handle the fused image result (e.g., display it)

    } catch (error) {
      console.error('Fusion API call failed:', error);
      setFusionError(error.message);
      alert(`Fusion failed: ${error.message}`);
    } finally {
      setIsFusing(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '18px' }}>Loading page content...</div>;
  }

  if (!user) {
    // This state should ideally be brief as useEffect redirects.
    // You could show a more specific "Redirecting to login..." or a spinner.
    return <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '18px' }}>Authenticating...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '40px auto', backgroundColor: '#f9f9f9', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#333' }}>AI Image Fusion</h1>
        <div>
          <span style={{ marginRight: '15px', fontSize: '14px', color: '#555' }}>Logged in as: <strong>{user.email}</strong></span>
          <button 
            onClick={handleLogout} 
            style={{
              padding: '8px 12px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#c82333'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#dc3545'}
          >
            Logout
          </button>
        </div>
      </header>
      
      <main>
        <p style={{ marginBottom: '25px', fontSize: '16px', color: '#555', lineHeight: '1.6' }}>
          Welcome! To begin, please upload a <strong>subject image</strong> (e.g., a person, an object) and a <strong>background image</strong>. The AI will then attempt to intelligently blend your subject into the chosen background.
        </p>
        
        <section style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginBottom: '30px' }}>
          {/* Subject Image Upload */}
          <div style={{ border: '2px dashed #007bff', padding: '25px', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '18px', color: '#007bff' }}>1. Upload Subject Image</h3>
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/webp" 
              onChange={(e) => handleImageChange(e, 'subject')} 
              style={{ display: 'block', margin: '0 auto 15px auto', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }} 
            />
            {subjectPreview && (
              <div style={{ marginTop: '10px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333', fontWeight: 'bold' }}>Subject Preview:</p>
                <img 
                  src={subjectPreview} 
                  alt="Subject Preview" 
                  style={{ maxWidth: '100%', maxHeight: '250px', border: '2px solid #007bff', borderRadius: '4px', objectFit: 'contain', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }} 
                />
              </div>
            )}
            {!subjectPreview && <p style={{fontSize: '14px', color: '#777'}}>No subject image selected. Please choose a PNG, JPG, or WEBP file.</p>}
          </div>

          {/* Background Image Upload */}
          <div style={{ border: '2px dashed #28a745', padding: '25px', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '18px', color: '#28a745' }}>2. Upload Background Image</h3>
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/webp" 
              onChange={(e) => handleImageChange(e, 'background')} 
              style={{ display: 'block', margin: '0 auto 15px auto', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }} 
            />
            {backgroundPreview && (
              <div style={{ marginTop: '10px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333', fontWeight: 'bold' }}>Background Preview:</p>
                <img 
                  src={backgroundPreview} 
                  alt="Background Preview" 
                  style={{ maxWidth: '100%', maxHeight: '250px', border: '2px solid #28a745', borderRadius: '4px', objectFit: 'contain', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }} 
                />
              </div>
            )}
            {!backgroundPreview && <p style={{fontSize: '14px', color: '#777'}}>No background image selected. Please choose a PNG, JPG, or WEBP file.</p>}
          </div>
        </section>

        <button 
          onClick={handleFusion} 
          disabled={!subjectImage || !backgroundImage}
          style={{
            display: 'block',
            width: '100%',
            padding: '15px 20px',
            backgroundColor: (!subjectImage || !backgroundImage) ? '#6c757d' : '#0056b3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (!subjectImage || !backgroundImage) ? 'not-allowed' : 'pointer',
            fontSize: '18px',
            fontWeight: 'bold',
            transition: 'background-color 0.2s ease, transform 0.1s ease'
          }}
          onMouseOver={e => { if (subjectImage && backgroundImage) e.currentTarget.style.backgroundColor = '#004494'; }}
          onMouseOut={e => { if (subjectImage && backgroundImage) e.currentTarget.style.backgroundColor = '#0056b3'; }}
          onMouseDown={e => { if (subjectImage && backgroundImage) e.currentTarget.style.transform = 'scale(0.98)'; }}
          onMouseUp={e => { if (subjectImage && backgroundImage) e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {isFusing ? 'Fusing Images...' : 'Start Fusion'}
        </button>
        {fusionError && <p style={{ color: 'red', textAlign: 'center', marginTop: '10px' }}>Error: {fusionError}</p>}
      </main>
    </div>
  );
}