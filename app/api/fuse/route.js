import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import FormData from 'form-data'; // Use form-data for creating multipart/form-data streams
import { Readable } from 'stream';
import axios from 'axios';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Get ClipDrop API Key
const clipdropApiKey = process.env.CLIPDROP_API_KEY;
const BUCKET_NAME = 'fusion-images';

export async function POST(request) {
  if (!clipdropApiKey) {
    console.error('ClipDrop API key is not configured.');
    return NextResponse.json({ error: 'Server configuration error: Missing ClipDrop API key.' }, { status: 500 });
  }

  try {
    const requestFormData = await request.formData();
    const subjectImageFile = requestFormData.get('subjectImage');

    if (!subjectImageFile) {
      return NextResponse.json({ error: 'Subject image is required.' }, { status: 400 });
    }

    // 1. Call ClipDrop API directly with the image file
    const clipdropFormData = new FormData(); // From 'form-data' library
    // Convert the File object to a Buffer, then to a ReadableStream for form-data library
    const imageArrayBuffer = await subjectImageFile.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);
    const imageStream = Readable.from(imageBuffer);

    // Append the Stream, providing the filename, contentType, and knownLength in an options object
    clipdropFormData.append('image_file', imageStream, {
      filename: subjectImageFile.name || 'image.jpg',
      contentType: subjectImageFile.type,
      knownLength: imageBuffer.length
    });

    console.log('Sending image file to ClipDrop:', subjectImageFile.name, subjectImageFile.type, subjectImageFile.size);

    // 使用 axios 发送 form-data，解决 fetch/undici 不能正确处理 form-data 的问题
    let clipdropResponse;
    try {
      clipdropResponse = await axios.post(
        'https://clipdrop-api.co/remove-background/v1',
        clipdropFormData,
        {
          headers: {
            'x-api-key': clipdropApiKey,
            ...clipdropFormData.getHeaders(),
          },
          responseType: 'arraybuffer', // 返回 Buffer
        }
      );
    } catch (error) {
      const status = error.response?.status || 500;
      const errorBody = error.response?.data?.toString() || error.message;
      console.error('ClipDrop API error:', status, errorBody);
      throw new Error(`ClipDrop API failed: ${errorBody}`);
    }

    // 2. 获取 ClipDrop 返回的透明图像 Buffer
    const transparentImageBuffer = Buffer.from(clipdropResponse.data);
    console.log('Received transparent image from ClipDrop, size:', transparentImageBuffer.length);

    // 3. Upload the new transparent image to Supabase
    const transparentFileName = `subject-transparent-${Date.now()}.png`;
    const { error: transparentUploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(transparentFileName, transparentImageBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (transparentUploadError) {
      console.error('Error uploading transparent image:', transparentUploadError);
      throw new Error('Failed to upload transparent image.');
    }

    // 5. Get the public URL for the final transparent image
    const { data: { publicUrl: transparentImageUrl } } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(transparentFileName);

    console.log('Transparent image uploaded, public URL:', transparentImageUrl);

    // 5. Return the URL to the frontend
    return NextResponse.json({ transparentImageUrl });

  } catch (error) {
    console.error('Error in /api/fuse:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.', details: error.message }, { status: 500 });
  }
}
