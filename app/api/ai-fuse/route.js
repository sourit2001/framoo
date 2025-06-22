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

const VALID_DIMENSIONS = [
  { width: 1024, height: 1024 }, { width: 1152, height: 896 },
  { width: 896, height: 1152 }, { width: 1216, height: 832 },
  { width: 832, height: 1216 }, { width: 1344, height: 768 },
  { width: 768, height: 1344 }, { width: 1536, height: 640 },
  { width: 640, height: 1536 },
];

function findClosestValidDimensions(originalWidth, originalHeight) {
  const originalAspectRatio = originalWidth / originalHeight;
  let closestMatch = VALID_DIMENSIONS[0];
  let smallestDiff = Infinity;

  VALID_DIMENSIONS.forEach(dim => {
    const aspectRatio = dim.width / dim.height;
    const diff = Math.abs(originalAspectRatio - aspectRatio);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestMatch = dim;
    }
  });

  return closestMatch;
}

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

    const sharp = (await import('sharp')).default;
    const subjectArrayBuffer = await subjectImageFile.arrayBuffer();
    const subjectBuffer = Buffer.from(subjectArrayBuffer);
    const subjectMeta = await sharp(subjectBuffer).metadata();
    console.log(`Original subject image dimensions: ${subjectMeta.width}x${subjectMeta.height}`);

    // Step 1: Remove background from the subject image using ClipDrop
    console.log('Removing background from subject image...');
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
    const transparentSubjectBuffer = Buffer.from(clipdropResponse.data);
    console.log('Successfully removed background.');

    // Step 2: Create a mask from the subject's alpha channel.
    const subjectMaskBuffer = await sharp(transparentSubjectBuffer)
      .ensureAlpha()
      .extractChannel('alpha')
      .toBuffer();

    // Step 3: Invert the mask. The subject becomes black (preserved) and the background becomes white (to be inpainted).
    const invertedMaskBuffer = await sharp(subjectMaskBuffer).negate().toBuffer();
    console.log('Created and inverted mask for inpainting.');

    // Step 4: Prepare images for Inpainting, ensuring they use valid SDXL dimensions
    let workingSubject = transparentSubjectBuffer;
    let workingMask = invertedMaskBuffer;
    let needsResize = false;
    
    const isAlreadyValid = VALID_DIMENSIONS.some(
      d => d.width === subjectMeta.width && d.height === subjectMeta.height
    );

    if (!isAlreadyValid) {
      needsResize = true;
      const targetDimensions = findClosestValidDimensions(subjectMeta.width, subjectMeta.height);
      console.log(
        `Resizing image for inpainting from ${subjectMeta.width}x${subjectMeta.height} to closest valid dimensions ${targetDimensions.width}x${targetDimensions.height}`
      );
      // Use 'fill' to stretch to the nearest valid aspect ratio. This is usually a minor stretch.
      const resizeOptions = { 
        width: targetDimensions.width, 
        height: targetDimensions.height, 
        fit: 'fill' 
      };
      workingSubject = await sharp(transparentSubjectBuffer).resize(resizeOptions).png().toBuffer();
      workingMask = await sharp(invertedMaskBuffer).resize(resizeOptions).toBuffer();
    } else {
        console.log(`Image dimensions ${subjectMeta.width}x${subjectMeta.height} are already valid for SDXL.`);
    }

    // Step 5: Use Stability AI Inpainting to generate the background and blend it seamlessly
    console.log('Calling Stability AI for inpainting...');
    const engineId = 'stable-diffusion-xl-1024-v1-0';
    const apiHost = 'https://api.stability.ai';
    const apiUrl = `${apiHost}/v1/generation/${engineId}/image-to-image/masking`;

    const inpaintingFormData = new FormData();
    inpaintingFormData.append('init_image', workingSubject, 'init_image.png');
    inpaintingFormData.append('mask_source', 'MASK_IMAGE_WHITE'); // Inpaint the white areas (the background)
    inpaintingFormData.append('mask_image', workingMask, 'mask.png');
    // Enhanced prompt for better quality and lighting integration
    const enhancedPrompt = `${prompt}, ultra high definition, 8k, UHD, photorealistic, sharp focus, cinematic lighting, professional photography, masterpiece, detailed, intricate details`;
    inpaintingFormData.append('text_prompts[0][text]', enhancedPrompt);
    inpaintingFormData.append('cfg_scale', 7);
    inpaintingFormData.append('steps', 25); // Reduced steps to lower cost and fit within budget
    inpaintingFormData.append('samples', 1);
    inpaintingFormData.append('style_preset', 'photographic'); // Use photographic style for realism

    const inpaintingResponse = await axios.post(
      apiUrl,
      inpaintingFormData,
      {
        headers: {
          ...inpaintingFormData.getHeaders(),
          Accept: 'application/json',
          Authorization: `Bearer ${stabilityApiKey}`,
        },
        responseType: 'json' // Expect a JSON response
      }
    );

    let finalBuffer = Buffer.from(inpaintingResponse.data.artifacts[0].base64, 'base64');
    console.log('Successfully received inpainted image from Stability AI.');

    // Step 6: If the image was downsized, resize it back to the original dimensions
    if (needsResize) {
      console.log(`Resizing final output back to original: ${subjectMeta.width}x${subjectMeta.height}`);
      finalBuffer = await sharp(finalBuffer)
        .resize(subjectMeta.width, subjectMeta.height, { fit: 'cover' })
        .png()
        .toBuffer();
    }

    // Step 7: Upload the final image to Supabase
    console.log('Uploading final image to Supabase...');
    const finalFileName = `ai-fused-${Date.now()}.png`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(finalFileName, finalBuffer, { contentType: 'image/png' });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw new Error(`Failed to upload fused image: ${uploadError.message}`);
    }

    // Step 8: Get public URL and return
    const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(finalFileName);
    console.log('Successfully generated and uploaded AI-fused image:', publicUrlData.publicUrl);

    return NextResponse.json({ fusedImageUrl: publicUrlData.publicUrl, finalPrompt: enhancedPrompt });

  } catch (error) {
    console.error('An unexpected error occurred in /api/ai-fuse:', error.response ? error.response.data : error.message);
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    return NextResponse.json({ error: errorMessage || 'An unexpected error occurred.' }, { status: 500 });
  }
}
