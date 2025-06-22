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
  const [prompt, setPrompt] = useState('');
  const [subjectPreview, setSubjectPreview] = useState('');
  const [isFusing, setIsFusing] = useState(false);
  const [fusionError, setFusionError] = useState('');
  const [fusionResultUrl, setFusionResultUrl] = useState('');
  const [finalPrompt, setFinalPrompt] = useState('');
  const [fusionMethod, setFusionMethod] = useState('ai');

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

  useEffect(() => {
    return () => {
      if (subjectPreview) URL.revokeObjectURL(subjectPreview);
    };
  }, [subjectPreview]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSubjectImage(null);
    setPrompt('');
    if (subjectPreview) URL.revokeObjectURL(subjectPreview);
    setSubjectPreview('');
    setFusionResultUrl('');
    setFusionError('');
    setFinalPrompt('');
    router.push('/login');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (subjectPreview) URL.revokeObjectURL(subjectPreview);
    setSubjectImage(file || null);
    setSubjectPreview(file ? URL.createObjectURL(file) : '');
    setFusionResultUrl('');
    setFusionError('');
    setFinalPrompt('');
  };

  useEffect(() => {
    return () => {
      if (subjectPreview) URL.revokeObjectURL(subjectPreview);
    };
  }, [subjectPreview]);

  const handleFusion = async () => {
    if (!subjectImage || !prompt.trim()) {
      alert('Please upload a subject image and enter a background prompt.');
      return;
    }
    setIsFusing(true);
    setFusionError('');
    setFusionResultUrl('');
    setFinalPrompt('');

    const formData = new FormData();
    formData.append('subjectImage', subjectImage);
    formData.append('prompt', prompt);

    try {
      const endpoint = fusionMethod === 'ai' ? '/api/ai-fuse' : '/api/fuse';
      console.log(`Using ${fusionMethod} fusion method, calling ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `API Error: ${response.status}`);
      }
      setFusionResultUrl(result.fusedImageUrl);
      setFinalPrompt(result.finalPrompt);
    } catch (error) {
      console.error('Fusion API call failed:', error);
      setFusionError(error.message);
      alert(`Generation failed: ${error.message}`);
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
        <h1 style={{ margin: 0, fontSize: '28px', color: '#333' }}>AI Background Generator</h1>
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
          Upload a <strong>subject image</strong>, then <strong>describe the background</strong> you want the AI to create.
        </p>
        
        <section style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginBottom: '30px' }}>
          {/* Subject Image Upload */}
          <div style={{ border: '2px dashed #007bff', padding: '25px', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '18px', color: '#007bff' }}>1. Upload Subject Image</h3>
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/webp" 
              onChange={handleImageChange} 
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

          {/* AI Background Prompt Input */}
          <div style={{ border: '2px dashed #28a745', padding: '25px', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '18px', color: '#28a745' }}>2. Describe the Background</h3>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A beautiful beach at sunset, with waves crashing on the shore"
              style={{ 
                width: '95%', 
                minHeight: '80px', 
                padding: '10px', 
                border: '1px solid #ccc', 
                borderRadius: '4px', 
                fontSize: '16px',
                lineHeight: '1.5'
              }}
            />
          </div>

          {/* Fusion Method Selection */}
          <div style={{ border: '2px dashed #6c757d', padding: '25px', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '18px', color: '#6c757d' }}>3. Choose Fusion Method</h3>
            <select
              value={fusionMethod}
              onChange={(e) => setFusionMethod(e.target.value)}
              style={{ 
                width: '95%', 
                padding: '10px', 
                border: '1px solid #ccc', 
                borderRadius: '4px', 
                fontSize: '16px',
                lineHeight: '1.5'
              }}
            >
              <option value="ai">AI-Powered Fusion (Recommended)</option>
              <option value="classic">Classic Fusion (Debug Version)</option>
            </select>
            <div style={{ marginTop: '10px', fontSize: '14px', color: '#666', textAlign: 'left' }}>
              <p style={{ margin: '5px 0' }}><strong>AI-Powered Fusion:</strong> Uses AI models for natural, seamless compositing. Faster and more realistic results.</p>
              <p style={{ margin: '5px 0' }}><strong>Classic Fusion:</strong> Manual pixel-level processing with detailed logging. Slower but with dimension debugging.</p>
            </div>
          </div>
        </section>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <button 
            onClick={handleFusion} 
            disabled={!subjectImage || !prompt.trim() || isFusing}
            style={{
              padding: '12px 25px',
              fontSize: '18px',
              color: 'white',
              backgroundColor: (!subjectImage || !prompt.trim() || isFusing) ? '#ccc' : '#007bff',
              border: 'none',
              borderRadius: '5px',
              cursor: (!subjectImage || !prompt.trim() || isFusing) ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s ease, transform 0.1s ease',
              boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
              transform: isFusing ? 'scale(0.98)' : 'scale(1)',
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = (!subjectImage || !prompt.trim() || isFusing) ? '#ccc' : '#0056b3'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = (!subjectImage || !prompt.trim() || isFusing) ? '#ccc' : '#007bff'}
          >
            {isFusing ? 'Generating...' : 'Generate AI Background'}
          </button>
        </div>

        {fusionError && (
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', borderRadius: '4px', textAlign: 'center' }}>
            <strong>Error:</strong> {fusionError}
          </div>
        )}

        {fusionResultUrl && (
          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '20px', fontSize: '24px', color: '#333' }}>Fusion Result</h2>
            <div style={{ border: '3px solid #28a745', padding: '10px', borderRadius: '8px', backgroundColor: 'white', display: 'inline-block', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
              <img 
                src={fusionResultUrl} 
                alt="Fusion result" 
                style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '4px', objectFit: 'contain' }} 
              />
            </div>
            {finalPrompt && (
              <div style={{ 
                marginTop: '20px', 
                padding: '15px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '8px', 
                maxWidth: '700px', 
                margin: '20px auto', 
                textAlign: 'left',
                border: '1px solid #dee2e6'
              }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#495057', fontWeight: 'bold' }}>Final prompt sent to AI:</p>
                <p style={{ margin: 0, fontSize: '16px', color: '#212529', fontFamily: 'monospace', wordWrap: 'break-word', lineHeight: '1.5' }}>{finalPrompt}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}