import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin-level access
// Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in your .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Role Key for server-side client.');
  // Potentially throw an error or handle this case more gracefully
  // For now, we'll log and let requests fail if Supabase client isn't configured.
}

// Create a single Supabase client instance to be reused.
const supabaseAdmin = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const BUCKET_NAME = 'fusion-images'; // IMPORTANT: Change this if your bucket name is different!

export async function POST(request) {
  try {
    const formData = await request.formData();
    const subjectImage = formData.get('subjectImage');
    const backgroundImage = formData.get('backgroundImage');

    if (!subjectImage || !backgroundImage) {
      return NextResponse.json({ error: 'Missing subjectImage or backgroundImage' }, { status: 400 });
    }

    // 在这里，你可以添加将文件保存到 Supabase Storage 或其他地方的逻辑
    // 以及调用 AI 模型进行图像融合的逻辑

    if (!supabaseAdmin) {
      console.error('Supabase admin client is not initialized. Check environment variables.');
      return NextResponse.json({ error: 'Server configuration error for Supabase.' }, { status: 500 });
    }

    console.log('Received subject image:', subjectImage.name, subjectImage.size, subjectImage.type);
    console.log('Received background image:', backgroundImage.name, backgroundImage.size, backgroundImage.type);

    // Helper function to upload a single file
    const uploadFile = async (file, fileType) => {
      const fileName = `${fileType}-${Date.now()}-${file.name}`;
      const filePath = `public/${fileName}`; // Example path structure within the bucket

      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false, // true to overwrite existing files, false to fail if file exists
        });

      if (error) {
        console.error(`Error uploading ${fileType} image to Supabase Storage:`, error);
        throw new Error(`Failed to upload ${fileType} image: ${error.message}`);
      }

      // Get public URL for the uploaded file
      const { data: publicUrlData } = supabaseAdmin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
      
      console.log(`Uploaded ${fileType} to:`, publicUrlData.publicUrl);
      return { path: data.path, publicUrl: publicUrlData.publicUrl, name: file.name, size: file.size, type: file.type };
    };

    // Upload both images
    const subjectImageData = await uploadFile(subjectImage, 'subject');
    const backgroundImageData = await uploadFile(backgroundImage, 'background');

    // Return a success response with the storage paths or public URLs
    return NextResponse.json({
      message: 'Images received and uploaded to Supabase Storage successfully.',
      subjectImage: subjectImageData,
      backgroundImage: backgroundImageData,
    });
  } catch (error) {
    console.error('Error processing image upload:', error);
    return NextResponse.json({ error: 'Error processing request', details: error.message }, { status: 500 });
  }
}
