'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [subjectImage, setSubjectImage] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [subjectPreview, setSubjectPreview] = useState('');
  const [backgroundPreview, setBackgroundPreview] = useState('');
  const [isFusing, setIsFusing] = useState(false);
  const [fusionError, setFusionError] = useState('');
  const [fusionResultUrl, setFusionResultUrl] = useState(''); // To store the URL of the background-removed image

  useEffect(() => {
    async function getUserSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      } else {
        router.push('/login');
      }
      setLoading(false);
    }
    getUserSession();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSubjectImage(null);
    setBackgroundImage(null);
    if (subjectPreview) URL.revokeObjectURL(subjectPreview);
    if (backgroundPreview) URL.revokeObjectURL(backgroundPreview);
    setSubjectPreview('');
    setBackgroundPreview('');
    setFusionResultUrl('');
    setFusionError('');
    router.push('/login');
  };

  const handleImageChange = (e, imageType) => {
    const file = e.target.files[0];
    if (imageType === 'subject') {
      if (subjectPreview) URL.revokeObjectURL(subjectPreview);
      setSubjectImage(file || null);
      setSubjectPreview(file ? URL.createObjectURL(file) : '');
      setFusionResultUrl(''); // Clear previous result when subject changes
      setFusionError('');
    } else if (imageType === 'background') {
      if (backgroundPreview) URL.revokeObjectURL(backgroundPreview);
      setBackgroundImage(file || null);
      setBackgroundPreview(file ? URL.createObjectURL(file) : '');
      setFusionError('');
    }
  };

  useEffect(() => {
    return () => {
      if (subjectPreview) URL.revokeObjectURL(subjectPreview);
      if (backgroundPreview) URL.revokeObjectURL(backgroundPreview);
    };
  }, [subjectPreview, backgroundPreview]);

  const handleFusion = async () => {
    if (!subjectImage) { // Background image is not strictly needed for just background removal
      alert('Please select a subject image before starting fusion.');
      return;
    }
    setIsFusing(true);
    setFusionError('');
    setFusionResultUrl('');

    const formData = new FormData();
    formData.append('subjectImage', subjectImage);
    // formData.append('backgroundImage', backgroundImage); // Not sending background if only removing subject's BG

    try {
      const response = await fetch('/api/fuse', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `API Error: ${response.status}`);
      }
      setFusionResultUrl(result.transparentImageUrl); // Expecting this from the backend
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
    return <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '18px' }}>Authenticating...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '40px auto', backgroundColor: '#f9f9f9', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#333' }}>AI Background Removal</h1>
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
          Upload a <strong>subject image</strong>. The AI will remove its background.
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

          {/* Background Image Upload - Optional for this step, can be removed or kept for future fusion */}
          <div style={{ border: '2px dashed #28a745', padding: '25px', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '18px', color: '#28a745' }}>2. Upload Background Image (Optional)</h3>
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
            {!backgroundPreview && <p style={{fontSize: '14px', color: '#777'}}>No background image selected.</p>}
          </div>
        </section>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <button 
            onClick={handleFusion} 
            disabled={!subjectImage || isFusing} // Only subjectImage needed for background removal
            style={{
              padding: '12px 25px',
              fontSize: '18px',
              color: 'white',
              backgroundColor: (!subjectImage || isFusing) ? '#ccc' : '#007bff',
              border: 'none',
              borderRadius: '5px',
              cursor: (!subjectImage || isFusing) ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s ease, transform 0.1s ease',
              boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
              outline: 'none'
            }}
            onMouseOver={e => {
              if (!subjectImage || isFusing) return;
              e.currentTarget.style.backgroundColor = '#0056b3';
            }}
            onMouseOut={e => {
              if (!subjectImage || isFusing) return;
              e.currentTarget.style.backgroundColor = '#007bff';
            }}
            onMouseDown={e => {
              if (!subjectImage || isFusing) return;
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={e => {
              if (!subjectImage || isFusing) return;
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isFusing ? 'Processing...' : 'Remove Background'}
          </button>
        </div>

        {fusionError && (
          <div style={{ marginTop: '20px', padding: '10px', color: 'red', backgroundColor: '#ffebee', border: '1px solid red', borderRadius: '4px', textAlign: 'center' }}>
            <strong>Error:</strong> {fusionError}
          </div>
        )}

        {fusionResultUrl && (
          <section style={{ marginTop: '30px', padding: '20px', border: '2px solid #28a745', borderRadius: '8px', backgroundColor: 'white', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '20px', color: '#28a745' }}>Processed Subject Image:</h3>
            <img 
              src={fusionResultUrl} 
              alt="Background Removed Subject" 
              style={{ maxWidth: '100%', maxHeight: '400px', border: '2px solid #28a745', borderRadius: '4px', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
            />
          </section>
        )}
      </main>
    </div>
  );
}