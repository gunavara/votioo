import { supabase } from './supabase';

function getFileExtension(uri: string, fallback = 'jpg') {
  const cleanUri = uri.split('?')[0] || uri;
  const ext = cleanUri.split('.').pop()?.toLowerCase();
  return ext && ext.length <= 5 ? ext : fallback;
}

function getContentType(extension: string) {
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    default:
      return 'image/jpeg';
  }
}

async function uriToArrayBuffer(uri: string) {
  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error(`Failed to read image: ${response.statusText}`);
  }

  const blob = await response.blob();

  if (blob.size === 0) {
    throw new Error('Image file is empty or unreadable');
  }

  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image data'));
    reader.readAsArrayBuffer(blob);
  });

  return {
    arrayBuffer,
    size: blob.size,
  };
}

export async function uploadAvatarForUser(userId: string, imageUri: string) {
  const extension = getFileExtension(imageUri);
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  const { arrayBuffer } = await uriToArrayBuffer(imageUri);

  const { error } = await supabase.storage.from('avatars').upload(path, arrayBuffer, {
    cacheControl: '3600',
    upsert: false,
    contentType: getContentType(extension),
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPostImage(postId: string, imageUri: string, index: number) {
  const extension = getFileExtension(imageUri);
  const filename = `post-${postId}-${index}-${Date.now()}.${extension}`;
  const path = `posts/${postId}/${filename}`;
  const { arrayBuffer } = await uriToArrayBuffer(imageUri);

  const { error } = await supabase.storage.from('post-images').upload(path, arrayBuffer, {
    upsert: false,
    contentType: getContentType(extension),
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('post-images').getPublicUrl(path);
  return data.publicUrl;
}
