import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase, supabaseAdmin } from '../../lib/supabase';

const CATEGORIES = [
  { name: 'Shopping', emoji: '🛍️' },
  { name: 'Tech', emoji: '🖥️' },
  { name: 'Fashion', emoji: '👗' },
  { name: 'Food', emoji: '🍕' },
  { name: 'Health', emoji: '🌿' },
];

export default function CreateScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [question, setQuestion] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleCat = (name: string) => {
    setSelectedCats((prev) => {
      if (prev.includes(name)) return prev.filter((c) => c !== name);
      if (prev.length >= 2) {
        Alert.alert('Max 2 categories', 'You can select up to 2 categories per question.');
        return prev;
      }
      return [...prev, name];
    });
  };

  const pickPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'We need access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: [ImagePicker.MediaType.image],
        allowsMultiple: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map((asset) => asset.uri);
        setSelectedPhotos((prev) => {
          const combined = [...prev, ...newPhotos];
          if (combined.length > 3) {
            return prev.concat(newPhotos.slice(0, 3 - prev.length));
          }
          return combined;
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to pick photos');
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!question.trim()) {
      Alert.alert('Question required', 'Please write your question first.');
      return;
    }

    if (selectedCats.length === 0) {
      Alert.alert('Category required', 'Please select at least one category.');
      return;
    }

    if (!user) {
      Alert.alert('Sign in required', 'You need to sign in to post a question.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/auth') },
      ]);
      return;
    }

    try {
      setSubmitting(true);

      // Insert question into posts table
      const postData: any = {
        user_id: user.id,
        question_text: question,
        username_snapshot: profile?.username || user.email || 'Anonymous',
      };

      // Add categories if selected
      if (selectedCats.length > 0) {
        postData.primary_category = selectedCats[0];
      }
      if (selectedCats.length > 1) {
        postData.secondary_category = selectedCats[1];
      }

      console.log('📝 Creating post with data:', postData);

      const { data: postResult, error: postError } = await supabase
        .from('posts')
        .insert([postData])
        .select('id')
        .single();

      if (postError) {
        console.log('❌ Post error:', postError);
        Alert.alert('Error', 'Failed to post question: ' + postError.message);
        return;
      }

      const postId = postResult?.id;
      console.log('✅ Post created with ID:', postId);

      // Upload images if any
      if (selectedPhotos.length > 0 && postId) {
        console.log('📸 Uploading', selectedPhotos.length, 'photos...');

        for (let i = 0; i < selectedPhotos.length; i++) {
          const photoUri = selectedPhotos[i];
          try {
            console.log('📤 Reading image', i + 1, 'from:', photoUri);
            
            // Read the image file using fetch
            console.log('📤 Fetching image from URI:', photoUri);
            const imgResponse = await fetch(photoUri);
            
            if (!imgResponse.ok) {
              throw new Error(`Failed to fetch image: ${imgResponse.statusText}`);
            }
            
            const imgBlob = await imgResponse.blob();
            console.log('✅ Image fetched successfully, blob size:', imgBlob.size, 'bytes');
            
            if (imgBlob.size === 0) {
              throw new Error('Image blob is empty - file may not exist or is corrupted');
            }

            const filename = `post-${postId}-${i}-${Date.now()}.jpg`;
            const filepath = `posts/${postId}/${filename}`;

            // Convert blob to Uint8Array for proper Supabase storage handling
            const imgArrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as ArrayBuffer);
              reader.onerror = reject;
              reader.readAsArrayBuffer(imgBlob);
            });
            const imgUint8Array = new Uint8Array(imgArrayBuffer);
            console.log('📦 Converted to Uint8Array, size:', imgUint8Array.length, 'bytes');
            console.log('⬆️ Uploading image', i + 1, 'to:', filepath);

            const { error: uploadError } = await supabaseAdmin.storage
              .from('post-images')
              .upload(filepath, imgUint8Array, { 
                upsert: true,
                contentType: 'image/jpeg',
              });

            if (uploadError) {
              console.log('❌ Image upload error:', uploadError);
              continue;
            }
            
            console.log('✅ Image uploaded successfully to:', filepath);
            console.log('📦 Uploaded blob size was:', imgBlob.size, 'bytes');

            // Get public URL
            const { data: urlData } = supabaseAdmin.storage
              .from('post-images')
              .getPublicUrl(filepath);

            const imageUrl = urlData.publicUrl;
            console.log('🔗 Image URL:', imageUrl);
            
            // Verify the file was uploaded by checking its size
            try {
              const verifyImgResponse = await fetch(imageUrl);
              const verifyImgBlob = await verifyImgResponse.blob();
              console.log('📊 Image file size from server:', verifyImgBlob.size, 'bytes');
              if (verifyImgBlob.size === 0) {
                console.warn('⚠️ Warning: Image file on server is empty!');
              }
            } catch (e) {
              console.log('⚠️ Could not verify file:', e);
            }
            
            console.log('📝 Saving image record to database...');

            // Insert into post_images table
            const { error: dbError } = await supabase
              .from('post_images')
              .insert([
                {
                  post_id: postId,
                  image_url: imageUrl,
                  sort_order: i,
                },
              ]);

            if (dbError) {
              console.log('❌ DB error for image:', dbError);
            } else {
              console.log('✅ Image', i + 1, 'saved to database');
            }
          } catch (imgError: any) {
            console.error('❌ Error uploading image', i + 1, ':', imgError?.message || imgError);
          }
        }
      }

      Alert.alert('Success', 'Question posted!', [
        {
          text: 'OK',
          onPress: () => {
            setQuestion('');
            setSelectedCats([]);
            setSelectedPhotos([]);
            router.back();
          },
        },
      ]);
    } catch (error: any) {
      console.log('Post error:', error);
      Alert.alert('Error', error?.message || 'Failed to post question');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.signInPrompt}>
          <Text style={styles.signInText}>Sign in to ask a question</Text>
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.signInBtnText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Ask a question</Text>

        {/* Question Input */}
        <View style={styles.section}>
          <Text style={styles.label}>YOUR QUESTION</Text>
          <TextInput
            style={styles.input}
            placeholder="What's your question?"
            placeholderTextColor={Colors.textTertiary}
            value={question}
            onChangeText={setQuestion}
            multiline
            maxLength={120}
          />
          <Text style={styles.charCount}>{120 - question.length} chars left</Text>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.label}>CATEGORY (MAX 2)</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.name}
                style={[
                  styles.categoryBtn,
                  selectedCats.includes(cat.name) && styles.categoryBtnActive,
                ]}
                onPress={() => toggleCat(cat.name)}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text
                  style={[
                    styles.categoryName,
                    selectedCats.includes(cat.name) && styles.categoryNameActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.label}>PHOTOS (MAX 3)</Text>

          {selectedPhotos.length > 0 && (
            <View style={styles.photoPreviewContainer}>
              {selectedPhotos.map((uri, idx) => (
                <View key={idx} style={styles.photoPreview}>
                  <Image source={{ uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => removePhoto(idx)}
                  >
                    <Ionicons name="close" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.photoBtn} onPress={pickPhotos}>
            <Ionicons name="image-outline" size={24} color={Colors.brand} />
            <Text style={styles.photoBtnText}>
              Add up to 3 photos ({selectedPhotos.length}/3)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitBtnText}>Post question</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By posting you agree to our content guidelines. English only.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 8,
    textAlign: 'right',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBtn: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  categoryBtnActive: {
    backgroundColor: Colors.brandLight,
    borderColor: Colors.brand,
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  categoryNameActive: {
    color: Colors.brand,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.brandLight,
    borderStyle: 'dashed',
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.brand,
  },
  photoPreviewContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  photoPreview: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  submitBtn: {
    backgroundColor: Colors.brand,
    borderRadius: Radius.md,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: 24,
  },
  signInPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  signInBtn: {
    backgroundColor: Colors.brand,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  signInBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
