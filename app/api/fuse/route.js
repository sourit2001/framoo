import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import FormData from 'form-data';

import axios from 'axios';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// API Keys
const clipdropApiKey = process.env.CLIPDROP_API_KEY;
const stabilityApiKey = process.env.STABILITY_API_KEY;
const BUCKET_NAME = 'fusion-images';

export async function POST(request) {
  if (!clipdropApiKey || !stabilityApiKey) {
    console.error('API keys are not configured.');
    return NextResponse.json({ error: 'Server configuration error: Missing API keys.' }, { status: 500 });
  }

  try {
    const requestFormData = await request.formData();
    const subjectImageFile = requestFormData.get('subjectImage');
    const prompt = requestFormData.get('prompt');

    if (!subjectImageFile || !prompt) {
      return NextResponse.json({ error: 'Subject image and a prompt are required.' }, { status: 400 });
    }

    // Step 1: Generate background image using Stability AI, matching subject dimensions
    const sharp = (await import('sharp')).default;
    const subjectArrayBuffer = await subjectImageFile.arrayBuffer();
    const subjectBuffer = Buffer.from(subjectArrayBuffer);
    const subjectMeta = await sharp(subjectBuffer).metadata();
    console.log(`Original subject image dimensions: ${subjectMeta.width}x${subjectMeta.height}`);

    // --- Dimension Clamping for Stability AI ---
    // Ensure dimensions are within the allowed range [320, 1536] and are multiples of 64.
    const MAX_DIM = 1536;
    const MIN_DIM = 320;
    const STEP = 64;

    const { width: oWidth, height: oHeight } = subjectMeta;

    // Calculate the valid scale factor range
    const lowerBound = Math.max(MIN_DIM / oWidth, MIN_DIM / oHeight);
    const upperBound = Math.min(MAX_DIM / oWidth, MAX_DIM / oHeight);

    if (lowerBound > upperBound) {
      const errorMsg = `Image aspect ratio (${oWidth}:${oHeight}) is not supported. Please use an image with a less extreme aspect ratio.`;
      console.error(errorMsg);
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    // Use the upper bound of the scale to get the largest possible image
    const scale = upperBound;
    let width = Math.round((oWidth * scale) / STEP) * STEP;
    let height = Math.round((oHeight * scale) / STEP) * STEP;

    // Final check to ensure dimensions are clamped within the exact limits
    width = Math.max(MIN_DIM, Math.min(MAX_DIM, width));
    height = Math.max(MIN_DIM, Math.min(MAX_DIM, height));

    const stabilityApiHost = 'https://api.stability.ai';
    const stabilityEngineId = 'stable-diffusion-v1-6';

    const stabilityResponse = await axios.post(
      `${stabilityApiHost}/v1/generation/${stabilityEngineId}/text-to-image`,
      {
        text_prompts: [{ text: prompt }],
        cfg_scale: 7,
        height: height,
        width: width,
        steps: 30,
        samples: 1,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${stabilityApiKey}`,
        },
      }
    );

    const backgroundBuffer = Buffer.from(stabilityResponse.data.artifacts[0].base64, 'base64');
    console.log('Successfully generated background from Stability AI.');
    const bgMeta = await sharp(backgroundBuffer).metadata();
    console.log(`AI background dimensions: ${bgMeta.width}x${bgMeta.height}`);

    // Step 2: Remove background from the subject image using ClipDrop
    const clipdropFormData = new FormData();
    clipdropFormData.append('image_file', subjectBuffer, 'subject.png');

    const clipdropResponse = await axios.post(
      'https://clipdrop-api.co/remove-background/v1',
      clipdropFormData,
      {
        headers: {
          ...clipdropFormData.getHeaders(),
          'x-api-key': clipdropApiKey,
        },
        responseType: 'arraybuffer',
      }
    );
    const transparentImageBuffer = Buffer.from(clipdropResponse.data);
    console.log('Received transparent image from ClipDrop.');

    // Step 3: Process and composite images

    // --- Canvas Preparation ---
    // Resize the AI-generated background to match the original subject's exact dimensions.
    // This becomes our canvas for all subsequent operations.
    const canvasBuffer = await sharp(backgroundBuffer)
      .resize(subjectMeta.width, subjectMeta.height)
      .toBuffer();
    console.log(`Canvas resized to: ${subjectMeta.width}x${subjectMeta.height}`);

    // --- Subject Preparation ---
    // Resize the transparent subject to be 60% of the canvas width.
    const targetSubjectWidth = subjectMeta.width * 0.6;
    const fgResizedBuffer = await sharp(transparentImageBuffer)
      .resize({ width: Math.round(targetSubjectWidth) })
      .toBuffer();
    const fgResizedMeta = await sharp(fgResizedBuffer).metadata();
    console.log(`Subject resized to: ${fgResizedMeta.width}x${fgResizedMeta.height}`);

    // --- Advanced Color & Tone Matching + Edge Feathering ---
    // 1. Extract the original alpha channel from the resized subject and blur it for soft edges.
    const blurredAlpha = await sharp(fgResizedBuffer)
      .ensureAlpha()
      .extractChannel('alpha')
      .blur(5)
      .toBuffer();

    // 2. Remove alpha to create a pure RGB image for color correction.
    const fgRgbBuffer = await sharp(fgResizedBuffer)
      .removeAlpha()
      .toBuffer();

    // 3. Simplified color correction (skipping expensive Lab transfer for now)
    // Use faster RGB-based color matching
    const canvasStats = await sharp(canvasBuffer).stats();
    const fgRgbStats = await sharp(fgRgbBuffer).stats();
    const redFactor = fgRgbStats.channels[0].mean > 0 ? Math.min(2.0, canvasStats.channels[0].mean / fgRgbStats.channels[0].mean) : 1;
    const greenFactor = fgRgbStats.channels[1].mean > 0 ? Math.min(2.0, canvasStats.channels[1].mean / fgRgbStats.channels[1].mean) : 1;
    const blueFactor = fgRgbStats.channels[2].mean > 0 ? Math.min(2.0, canvasStats.channels[2].mean / fgRgbStats.channels[2].mean) : 1;
    
    const fgColorAdjustedRgbBuffer = await sharp(fgRgbBuffer)
      .linear([redFactor, greenFactor, blueFactor], [0, 0, 0])
      .toBuffer();
    console.log(`Applied RGB color correction with factors: R=${redFactor.toFixed(2)}, G=${greenFactor.toFixed(2)}, B=${blueFactor.toFixed(2)}`);

    // 4. Join the corrected color image with the blurred alpha mask.
    const fgAdjustedBuffer = await sharp(fgColorAdjustedRgbBuffer)
      .joinChannel(blurredAlpha)
      .png()
      .toBuffer();

    // --- Final Compositing ---
    // Composite the processed subject onto the correctly sized canvas.
    const fgAdjustedMeta = await sharp(fgAdjustedBuffer).metadata();
    console.log(`Final subject dimensions: ${fgAdjustedMeta.width}x${fgAdjustedMeta.height}`);
    
    const compositedBuffer = await sharp(canvasBuffer)
      .composite([{
        input: fgAdjustedBuffer,
        left: Math.round((subjectMeta.width - fgAdjustedMeta.width) / 2),
        top: Math.round((subjectMeta.height - fgAdjustedMeta.height) / 2)
      }])
      .png()
      .toBuffer();

    // Verify composited dimensions
    const compositedMeta = await sharp(compositedBuffer).metadata();
    console.log(`Composited image dimensions: ${compositedMeta.width}x${compositedMeta.height}`);

    // --- Enforce final output size to match original upload ---
    const finalBuffer = await sharp(compositedBuffer)
      .resize(subjectMeta.width, subjectMeta.height, { fit: 'fill' })
      .png()
      .toBuffer();

    const finalMeta = await sharp(finalBuffer).metadata();
    console.log(`Final output dimensions: ${finalMeta.width}x${finalMeta.height} (should match ${subjectMeta.width}x${subjectMeta.height})`);

    console.log('Successfully composited and resized image to original dimensions.');

    // Step 4: Upload the final image to Supabase
    const finalFileName = `fused-ai-${Date.now()}.png`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(finalFileName, finalBuffer, { contentType: 'image/png' });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw new Error(`Failed to upload fused image: ${uploadError.message}`);
    }

    // Step 5: Get public URL and return
    const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(finalFileName);
    console.log('Successfully generated and uploaded fused image:', publicUrlData.publicUrl);

    return NextResponse.json({ fusedImageUrl: publicUrlData.publicUrl });

  } catch (error) {
    console.error('An unexpected error occurred in /api/fuse:', error.response ? error.response.data : error.message);
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    return NextResponse.json({ error: errorMessage || 'An unexpected error occurred.' }, { status: 500 });
  }
}
