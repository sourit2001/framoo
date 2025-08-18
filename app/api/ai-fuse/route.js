import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const sharp = require('sharp');
import { v4 as uuidv4 } from 'uuid';

/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSL representation
 */
function rgbToHsl(r, g, b) {
  r /= 255, g /= 255, b /= 255;

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return [ h * 360, s, l ]; // Return hue in degrees
}

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper: 上传图片 buffer 到 Supabase
async function uploadImageToSupabase(buffer, fileName) {
  const { error } = await supabase.storage
    .from('fusion-images')
    .upload(fileName, buffer, { contentType: 'image/png' });
  if (error) {
    throw new Error(`Supabase upload error: ${error.message}`);
  }
  const { data: { publicUrl } } = supabase.storage
    .from('fusion-images')
    .getPublicUrl(fileName);
  return publicUrl;
}

export async function POST(req) {
  try {
    const { action, prompt, mattingUrl, backgroundUrl } = await req.json();

    // --- Action 1: 生成背景图片 ---
    if (action === "generate-background") {
      if (!prompt || !mattingUrl) {
        return NextResponse.json({ error: '缺少prompt或抠图URL参数' }, { status: 400 });
      }

      // --- 智能光影分析 --- 
      let lightAndColorPrompt = '';
      try {
        const mattingResponse = await fetch(mattingUrl);
        const mattingBuffer = Buffer.from(await mattingResponse.arrayBuffer());
        const stats = await sharp(mattingBuffer).stats();
        const { r, g, b } = stats.dominant;
        const [h, s, l] = rgbToHsl(r, g, b);

        let lightingDesc = l > 0.6 ? 'bright lighting' : l < 0.4 ? 'dim lighting' : 'moderate lighting';
        let tempDesc = h < 60 || h > 300 ? 'warm tones' : h > 180 && h < 270 ? 'cool tones' : '';
        let saturationDesc = s > 0.6 ? 'vibrant colors' : s < 0.3 ? 'muted colors' : '';
        
        lightAndColorPrompt = [lightingDesc, tempDesc, saturationDesc].filter(Boolean).join(', ');
        console.log('智能分析得到的光影提示:', lightAndColorPrompt);

      } catch (e) {
        console.error('无法分析抠图光影:', e.message);
      }


      // --- AI动态提示词增强逻辑 ---
      const metaPrompt = `As a prompt engineer for a text-to-image AI, expand the user's simple prompt into a rich, detailed, photorealistic scene. It is crucial to include specific keywords related to image clarity (e.g., '8k', 'ultra-detailed', 'sharp focus'), lighting (e.g., 'cinematic lighting', 'soft light', 'volumetric lighting'), and style (e.g., 'photorealistic', 'masterpiece', 'professional photography').

The lighting and color should match the following characteristics derived from the subject: '${lightAndColorPrompt}'.

User's simple prompt: "${prompt}"

Your expanded, detailed prompt in English:`

      // 使用 OpenRouter API 进行英文提示词扩写
      const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
      const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemma-3n-e2b-it:free',
          messages: [
            { role: 'user', content: metaPrompt }
          ],
          max_tokens: 256,
          temperature: 0.8
        }),
      });
      const orData = await orResponse.json();
      let enhancedPrompt = prompt;
      if (orData.choices && orData.choices[0] && orData.choices[0].message && orData.choices[0].message.content) {
        enhancedPrompt = orData.choices[0].message.content.trim();
        console.log('AI-Generated Enhanced Prompt:', enhancedPrompt);
      } else {
        console.error('OpenRouter prompt expansion failed:', orData);
        return NextResponse.json({ error: orData?.error?.message || 'AI prompt generation failed' }, { status: 502 });
      }

      // 从抠图URL获取图片尺寸
      const mattingResponse = await fetch(mattingUrl);
      if (!mattingResponse.ok) {
        return NextResponse.json({ error: "无法下载抠图以获取尺寸" }, { status: 500 });
      }
      const mattingBuffer = Buffer.from(await mattingResponse.arrayBuffer());
      const mattingMeta = await sharp(mattingBuffer).metadata();

      const roundTo64 = (n) => Math.max(64, Math.round(n / 64) * 64);
      const targetWidth = roundTo64(mattingMeta.width);
      const targetHeight = roundTo64(mattingMeta.height);
      console.log(`以原图比例为准，生成背景尺寸: ${targetWidth}x${targetHeight}`);

      const maxDim = 1024;
      let scale = Math.min(maxDim / targetWidth, maxDim / targetHeight, 1);
      let scaledWidth = roundTo64(Math.floor(targetWidth * scale));
      let scaledHeight = roundTo64(Math.floor(targetHeight * scale));
      console.log(`实际请求尺寸: ${scaledWidth}x${scaledHeight}`);

      // --- 背景生成逻辑 (piapi.ai FLUX txt2img) ---
      const piapiApiKey = process.env.PIAPI_API_KEY;
      if (!piapiApiKey) {
        return NextResponse.json({ error: 'PiAPI API key not configured' }, { status: 500 });
      }

      const createTaskRes = await fetch('https://api.piapi.ai/api/v1/task', {
        method: 'POST',
        headers: {
          'X-API-Key': piapiApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'Qubico/flux1-dev',
          task_type: 'txt2img',
          input: {
            prompt: enhancedPrompt,
            width: scaledWidth,
            height: scaledHeight
          }
        })
      });
      if (!createTaskRes.ok) {
        const err = await createTaskRes.text();
        console.error('PiAPI create task failed:', err);
        return NextResponse.json({ error: '背景生成任务提交失败: ' + err }, { status: 502 });
      }
      const taskData = await createTaskRes.json();
      const taskId = taskData?.data?.task_id;
      if (!taskId) {
        return NextResponse.json({ error: '未获取到生成任务ID' }, { status: 502 });
      }

      let imageUrl = null;
      for (let i = 0; i < 30; i++) {
        await new Promise(res => setTimeout(res, 2000));
        const pollRes = await fetch(`https://api.piapi.ai/api/v1/task/${taskId}`, {
          headers: { 'X-API-Key': piapiApiKey }
        });
        if (!pollRes.ok) continue;
        const pollData = await pollRes.json();
        if (pollData?.data?.status === 'completed' && pollData?.data?.output?.image_url) {
          imageUrl = pollData.data.output.image_url;
          break;
        } else if (pollData?.data?.status === 'failed') {
          return NextResponse.json({ error: '背景生成失败: ' + (pollData?.data?.error?.message || '未知错误') }, { status: 502 });
        }
      }
      if (!imageUrl) {
        return NextResponse.json({ error: '背景生成超时，请稍后重试' }, { status: 504 });
      }

      const imgRes = await fetch(imageUrl);
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      const bgFileName = `${uuidv4()}-background.png`;
      const publicUrl = await uploadImageToSupabase(imgBuffer, bgFileName);
      return NextResponse.json({ backgrounds: [publicUrl] });
    }

    // --- Action 2: 融合图片 --- 
    else if (action === "fuse-image") {
      if (!mattingUrl || !backgroundUrl) {
        return NextResponse.json({ error: "缺少抠图或背景图URL参数" }, { status: 400 });
      }

      const [backgroundResponse, mattingResponse] = await Promise.all([
        fetch(backgroundUrl),
        fetch(mattingUrl)
      ]);

      if (!backgroundResponse.ok || !mattingResponse.ok) {
        return NextResponse.json({ error: "无法下载用于融合的图片" }, { status: 500 });
      }

      const backgroundBuffer = Buffer.from(await backgroundResponse.arrayBuffer());
      const mattingBuffer = Buffer.from(await mattingResponse.arrayBuffer());

      const mattingMeta = await sharp(mattingBuffer).metadata();
      const finalWidth = mattingMeta.width;
      const finalHeight = mattingMeta.height;
      console.log(`融合目标尺寸将以原图为准: ${finalWidth}x${finalHeight}`);

      const resizedBackgroundBuffer = await sharp(backgroundBuffer)
        .resize(finalWidth, finalHeight, { fit: 'cover', position: 'center' })
        .png()
        .toBuffer();

      // --- 色彩转移算法(Sharp实现)：让前景色彩分布与背景一致 ---
      const mattingSharp = sharp(mattingBuffer);
      const mattingMetaForAlpha = await mattingSharp.metadata();

      let alphaChannelBuffer = null;
      if (mattingMetaForAlpha.hasAlpha) {
        // 重新创建一个sharp实例来提取alpha，避免操作同一个可变对象
        alphaChannelBuffer = await sharp(mattingBuffer).extractChannel('alpha').raw().toBuffer();
      }

      // 移除alpha通道（如果存在），获取纯RGB数据用于统计和变换
      const { data: mattingRgbBuffer, info: rgbInfo } = await mattingSharp.removeAlpha().raw().toBuffer({ resolveWithObject: true });

      // 统计前景和背景的色彩数据
      const fgStats = await sharp(mattingRgbBuffer, { raw: rgbInfo }).stats();
      const bgStats = await sharp(resizedBackgroundBuffer).stats();

      const [fgR, fgG, fgB] = fgStats.channels;
      const [bgR, bgG, bgB] = bgStats.channels;

      // 计算线性变换参数 a, b (output = input * a + b)
      const a = [
        (bgR.stdev || 1) / (fgR.stdev || 1),
        (bgG.stdev || 1) / (fgG.stdev || 1),
        (bgB.stdev || 1) / (fgB.stdev || 1)
      ];
      const b = [
        bgR.mean - a[0] * fgR.mean,
        bgG.mean - a[1] * fgG.mean,
        bgB.mean - a[2] * fgB.mean
      ];

      // 应用色彩转换
      const colorCorrectedRgbBuffer = await sharp(mattingRgbBuffer, { raw: rgbInfo })
        .linear(a, b)
        .toBuffer();

      // 优化V2：为保留亮度，切换到LAB颜色空间进行操作，绕过blend:color的兼容性问题
      // 1. 将原始前景图和经过色彩校正的图都转为LAB空间
      const originalLabBuffer = await sharp(mattingBuffer).lab().toBuffer();
      const correctedLabBuffer = await sharp(colorCorrectedRgbBuffer, { raw: rgbInfo }).lab().toBuffer();

      // 2. 提取原始前景的L通道（亮度）和校正后图的A, B通道（色彩）
      const lChannel = await sharp(originalLabBuffer, { raw: { width: rgbInfo.width, height: rgbInfo.height, channels: 3 } })
        .extractChannel(0)
        .toBuffer();
      const aChannel = await sharp(correctedLabBuffer, { raw: { width: rgbInfo.width, height: rgbInfo.height, channels: 3 } })
        .extractChannel(1)
        .toBuffer();
      const bChannel = await sharp(correctedLabBuffer, { raw: { width: rgbInfo.width, height: rgbInfo.height, channels: 3 } })
        .extractChannel(2)
        .toBuffer();

      // 3. 将三通道重新合成为新的LAB图像，并转回sRGB
      const newLabCombined = await sharp(lChannel, { raw: { width: rgbInfo.width, height: rgbInfo.height, channels: 1 } })
        .joinChannel([aChannel, bChannel], { raw: { width: rgbInfo.width, height: rgbInfo.height, channels: 2 } })
        .toColourspace('srgb') // 注意这里方法名是toColourspace
        .toBuffer();

      // 4. 如果原始图像有alpha通道，则重新附加
      let finalMattingSharp;
      if (alphaChannelBuffer) {
        finalMattingSharp = sharp(newLabCombined, { raw: { width: rgbInfo.width, height: rgbInfo.height, channels: 3 } })
          .joinChannel(alphaChannelBuffer, { raw: { width: rgbInfo.width, height: rgbInfo.height, channels: 1 } });
      } else {
        finalMattingSharp = sharp(newLabCombined, { raw: { width: rgbInfo.width, height: rgbInfo.height, channels: 3 } });
      }

      const adjustedMattingBuffer = await finalMattingSharp.png().toBuffer();

      // 最终合成
      const finalFusedBuffer = await sharp(resizedBackgroundBuffer)
        .composite([
          { input: adjustedMattingBuffer, blend: 'over' }
        ])
        .png()
        .toBuffer();

      const fusedUrl = await uploadImageToSupabase(finalFusedBuffer, `fused-${uuidv4()}.png`);
      return NextResponse.json({ fusedUrl });
    }

    return NextResponse.json({ error: "无效的操作" }, { status: 400 });

  } catch (e) {
    console.error('AI Fuse API error:', e);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
