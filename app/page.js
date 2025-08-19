'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { fuseImages, fuseImagesToCanvas } from '../utils/clientFusion';
import { createSupabaseBrowserClient } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 步骤状态
  const [step, setStep] = useState(1);
  const [mattingFile, setMattingFile] = useState(null);
  const [mattingUrl, setMattingUrl] = useState(null);
  const [originalUrl, setOriginalUrl] = useState(null);
  const [isMatting, setIsMatting] = useState(false);
  const [selectedBg, setSelectedBg] = useState(null);
  const [fusedResult, setFusedResult] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 色彩转移参数
  const [ctEnabled, setCtEnabled] = useState(true);
  const [ctStrength, setCtStrength] = useState(0.6);
  const [ctStdLow, setCtStdLow] = useState(0.9);
  const [ctStdHigh, setCtStdHigh] = useState(1.1);
  const [ctPreserveHighlights, setCtPreserveHighlights] = useState(true);
  
  // 实时预览
  const [previewUrl, setPreviewUrl] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [autoPreview, setAutoPreview] = useState(true);
  const [previewError, setPreviewError] = useState('');
  const previewCanvasRef = useRef(null);
  const [isFusing, setIsFusing] = useState(false);
  // 使左侧参数面板与右侧大预览顶部对齐：测量缩略图区高度
  const thumbRowRef = useRef(null);
  const [thumbOffset, setThumbOffset] = useState(0);
  useEffect(() => {
    const el = thumbRowRef.current;
    if (!el) return;
    const update = () => setThumbOffset(el.offsetHeight || 0);
    update();
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      ro.observe(el);
    } else {
      window.addEventListener('resize', update);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', update);
    };
  }, [mattingUrl, selectedBg]);
  
  // 打光参数
  const [ltEnabled, setLtEnabled] = useState(true);
  const [ltDirection, setLtDirection] = useState('left-top');
  const [ltIntensity, setLtIntensity] = useState(0.6);
  const [ltSoftness, setLtSoftness] = useState(0.75);
  const [ltShadowIntensity, setLtShadowIntensity] = useState(0.3);
  const [groundEnabled, setGroundEnabled] = useState(true);
  const [groundOpacity, setGroundOpacity] = useState(0.22);
  const [groundWidthScale, setGroundWidthScale] = useState(0.5);
  const [groundOffsetY, setGroundOffsetY] = useState(4);

  // Supabase 客户端
  const supabase = createSupabaseBrowserClient();

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

  // 实时预览（防抖）
  useEffect(() => {
    if (!autoPreview || step !== 3 || !mattingUrl || !selectedBg) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      try {
        setIsPreviewLoading(true);
        setPreviewError('');
        const canvas = previewCanvasRef.current;
        if (!canvas) return;
        await fuseImagesToCanvas(mattingUrl, selectedBg, {
          lighting: ltEnabled ? {
            enabled: true,
            direction: ltDirection,
            intensity: ltIntensity,
            softness: ltSoftness,
            shadowIntensity: ltShadowIntensity,
            ground: { enabled: groundEnabled, opacity: groundOpacity, widthScale: groundWidthScale, offsetY: groundOffsetY },
          } : false,
          colorTransfer: ctEnabled ? {
            enabled: true,
            strength: ctStrength,
            stdClamp: [ctStdLow],
          } : false,
        }, canvas);
      } catch (error) {
        if (!cancelled) setPreviewError(`预览失败: ${error.message}`);
      } finally {
        if (!cancelled) setIsPreviewLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [autoPreview, step, selectedBg, mattingUrl, ctEnabled, ctStrength, ctStdLow, ctStdHigh, ctPreserveHighlights, ltEnabled, ltDirection, ltIntensity, ltSoftness, ltShadowIntensity, groundEnabled, groundOpacity, groundWidthScale, groundOffsetY]);

  // 上传图片并进行抠图处理
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setMattingFile(file);
    const originalUrl = URL.createObjectURL(file);
    setOriginalUrl(originalUrl);
    setIsMatting(true);
    
    try {
      // 调用后端API进行抠图处理
      const formData = new FormData();
      formData.append('action', 'remove-background');
      formData.append('imageFile', file);
      
      const response = await fetch('/api/ai-fuse', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '抠图失败');
      }
      
      setMattingUrl(result.mattingUrl);
      setStep(2);
    } catch (error) {
      alert(`抠图失败: ${error.message}`);
      // 如果抠图失败，仍然可以使用原图
      setMattingUrl(originalUrl);
      setStep(2);
    } finally {
      setIsMatting(false);
    }
  };

  // 生成背景
  const handleGenerateBg = async () => {
    if (!prompt.trim()) {
      alert('请输入背景描述');
      return;
    }
    
    if (!mattingFile) {
      alert('请先上传前景图片');
      return;
    }
    
    setIsGenerating(true);
    try {
      // 使用 FormData 发送文件数据
      const formData = new FormData();
      formData.append('action', 'generate-background');
      formData.append('prompt', prompt.trim());
      formData.append('mattingFile', mattingFile);
      
      const response = await fetch('/api/ai-fuse', {
        method: 'POST',
        body: formData, // 不设置 Content-Type，让浏览器自动设置
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '生成失败');
      }
      
      setSelectedBg(result.backgroundUrl);
      setStep(3);
    } catch (error) {
      alert(`背景生成失败: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // 最终融合
  const handleFinalFusion = async () => {
    if (!mattingUrl || !selectedBg) return;
    
    try {
      setIsFusing(true);
      const fusedDataUrl = await fuseImages(mattingUrl, selectedBg, {
        // 使用 UI 可调参数
        lighting: ltEnabled ? {
          enabled: true,
          direction: ltDirection,
          intensity: ltIntensity,
          softness: ltSoftness,
          shadowIntensity: ltShadowIntensity,
          ground: { enabled: groundEnabled, opacity: groundOpacity, widthScale: groundWidthScale, offsetY: groundOffsetY },
        } : false,
        colorTransfer: ctEnabled ? {
          enabled: true,
          strength: ctStrength,
          stdClamp: [ctStdLow],
        } : false,
      });
      
      setFusedResult(fusedDataUrl);
    } catch (error) {
      alert(`融合失败: ${error.message}`);
    } finally {
      setIsFusing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '18px' }}>Loading page content...</div>;
  }

  if (!user) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Authenticating...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <header style={{ backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0' }}>
            <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', margin: 0 }}>背景融合工具</h1>
            <button onClick={handleLogout} style={{ backgroundColor: '#e5e7eb', color: '#374151', fontWeight: '500', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>退出登录</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        {/* 步骤指示器 */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px' }}>
            {[1, 2, 3, 4].map((num) => (
              <div key={num} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '600',
                  backgroundColor: step >= num ? '#3b82f6' : '#d1d5db'
                }}>
                  {num}
                </div>
                <span style={{
                  marginLeft: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: step >= num ? '#2563eb' : '#6b7280'
                }}>
                  {num === 1 && '上传前景'}
                  {num === 2 && '生成背景'}
                  {num === 3 && '调节参数'}
                  {num === 4 && '完成融合'}
                </span>
                {num < 4 && <div style={{ width: '64px', height: '2px', backgroundColor: '#d1d5db', marginLeft: '16px' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* 步骤 1: 上传前景图片 */}
        {step === 1 && (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>步骤 1: 上传前景图片（抠图）</h2>
            
            {!originalUrl && (
              <div style={{ border: '2px dashed #d1d5db', borderRadius: '8px', padding: '24px', textAlign: 'center' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  style={{ display: 'none' }}
                  id="matting-upload"
                  disabled={isMatting}
                />
                <label htmlFor="matting-upload" style={{ cursor: isMatting ? 'not-allowed' : 'pointer' }}>
                  <div style={{ color: '#4b5563' }}>
                    <svg style={{ margin: '0 auto', height: '48px', width: '48px', color: '#9ca3af' }} stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p style={{ marginTop: '8px', fontSize: '14px', color: '#4b5563' }}>
                      <span style={{ fontWeight: '500', color: '#2563eb' }}>点击上传</span> 或拖拽图片到此处
                    </p>
                    <p style={{ fontSize: '12px', color: '#6b7280' }}>支持 PNG, JPG, JPEG 格式，将自动进行抠图处理</p>
                  </div>
                </label>
              </div>
            )}
            
            {isMatting && (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #f3f4f6', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>正在进行AI抠图处理...</p>
              </div>
            )}
            
            {originalUrl && mattingUrl && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>原图</h3>
                    <img src={originalUrl} alt="原图" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>抠图结果</h3>
                    <img src={mattingUrl} alt="抠图结果" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button
                    onClick={() => setStep(2)}
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      fontWeight: '500',
                      padding: '8px 24px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    继续下一步
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 步骤 2: 选择背景 */}
        {step === 2 && (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>步骤 2: 选择背景图片</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>方式 1: AI 生成背景</h3>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="请描述您希望的背景场景，例如：一个美丽的日落海滩，有椿树和温暖的阳光"
                    rows={3}
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '12px', fontSize: '14px', outline: 'none' }}
                  />
                  <button
                    onClick={handleGenerateBg}
                    disabled={!prompt.trim() || isGenerating}
                    style={{
                      backgroundColor: (!prompt.trim() || isGenerating) ? '#d1d5db' : '#3b82f6',
                      color: 'white',
                      fontWeight: '500',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: (!prompt.trim() || isGenerating) ? 'not-allowed' : 'pointer',
                      marginTop: '12px',
                      width: '100%'
                    }}
                  >
                    {isGenerating ? 'AI 生成中...' : 'AI 生成背景'}
                  </button>
                  {isGenerating && (
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', textAlign: 'center' }}>
                      若遇到速率限制，请稍后重试或使用上传背景功能
                    </p>
                  )}
                </div>
                
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>方式 2: 上传背景图片</h3>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setSelectedBg(URL.createObjectURL(file));
                        setStep(3);
                      }
                    }}
                    style={{ display: 'none' }}
                    id="bg-upload"
                  />
                  <label htmlFor="bg-upload" style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px',
                    border: '2px dashed #3b82f6',
                    borderRadius: '6px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#f8fafc',
                    color: '#3b82f6',
                    fontWeight: '500'
                  }}>
                    点击上传背景图片
                  </label>
                </div>
              </div>
              <div>
                <div style={{ textAlign: 'center' }}>
                  <img src={mattingUrl} alt="前景" style={{ maxWidth: '100%', maxHeight: '256px', margin: '0 auto', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>前景图片</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 步骤 3: 调节参数 */}
        {step === 3 && (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>步骤 3: 调节融合参数</h2>

            {/* 缩略图置顶，避免与大预览之间隔开控制区 */}
            <div ref={thumbRowRef} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>前景</p>
                <img src={mattingUrl} alt="前景" style={{ width: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #d1d5db' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>背景</p>
                <img src={selectedBg} alt="背景" style={{ width: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #d1d5db' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
              {/* 右侧: 参数控制（在视觉上放右侧，通过 order 控制） */}
              <div style={{ order: 2, position: 'sticky', top: '12px', maxHeight: '70vh', overflow: 'auto' }}>
                {/* 光影参数 */}
                <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '16px' }}>光影设置</h3>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>光影方向</label>
                    <select value={ltDirection} onChange={(e) => setLtDirection(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}>
                      <option value="left-top">左上</option>
                      <option value="right-top">右上</option>
                    </select>
                  </div>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>光影强度: {ltIntensity}</label>
                    <input type="range" min="0" max="10" step="0.1" value={ltIntensity} onChange={(e) => setLtIntensity(parseFloat(e.target.value))} style={{ width: '100%' }} />
                  </div>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>柔和度: {ltSoftness}</label>
                    <input type="range" min="0" max="10" step="0.1" value={ltSoftness} onChange={(e) => setLtSoftness(parseFloat(e.target.value))} style={{ width: '100%' }} />
                  </div>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>阴影强度: {ltShadowIntensity}</label>
                    <input type="range" min="0" max="10" step="0.1" value={ltShadowIntensity} onChange={(e) => setLtShadowIntensity(parseFloat(e.target.value))} style={{ width: '100%' }} />
                  </div>
                </div>
                
                {/* 色彩转移参数 */}
                <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '16px' }}>色彩调整</h3>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>色彩强度: {ctStrength}</label>
                    <input type="range" min="0" max="10" step="0.1" value={ctStrength} onChange={(e) => setCtStrength(parseFloat(e.target.value))} style={{ width: '100%' }} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>对比度: {ctStdLow.toFixed(2)}</label>
                    <input type="range" min="0" max="10" step="0.1" value={ctStdLow} onChange={(e) => setCtStdLow(parseFloat(e.target.value))} style={{ width: '100%' }} />
                  </div>


                </div>
                
                <button
                  onClick={handleFinalFusion}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    fontWeight: '500',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  {isFusing ? '生成中…' : '生成图片'}
                </button>
              </div>

              {/* 左侧: 预览（通过 order 放在第一列） */}
              <div style={{ order: 1, position: 'sticky', top: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>实时预览</h3>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>融合预览</p>
                  {previewError ? (
                    <div style={{ padding: '20px', border: '1px solid #fca5a5', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#dc2626' }}>
                      {previewError}
                    </div>
                  ) : (
                    <div style={{ width: '100%', borderRadius: '4px', border: '1px solid #d1d5db', overflow: 'hidden', maxHeight: '70vh' }}>
                      <canvas ref={previewCanvasRef} style={{ maxWidth: '100%', width: 'auto', height: 'auto', display: 'block', margin: '0 auto' }} />
                    </div>
                  )}
                </div>

                {fusedResult && (
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>已生成图片</p>
                    <img src={fusedResult} alt="最终融合结果" style={{ maxWidth: '100%', borderRadius: '6px', border: '1px solid #e5e7eb' }} />
                    <div style={{ marginTop: '12px' }}>
                      <a href={fusedResult} download="fused-image.png" style={{ backgroundColor: '#10b981', color: 'white', fontWeight: '500', padding: '10px 20px', borderRadius: '6px', textDecoration: 'none', display: 'inline-block' }}>下载结果</a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}