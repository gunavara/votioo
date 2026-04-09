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
import { CATEGORIES } from '../../constants/mockData';
import { Colors, Radius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { uploadPostImage } from '../../lib/storage';
import { supabase } from '../../lib/supabase';

const CATEGORY_COLORS: Record<string, string> = {
  Shopping: '#EC4899',
  Tech: '#3B82F6',
  Fashion: '#F59E0B',
  Food: '#EF4444',
  Travel: '#10B981',
  Relationships: '#F43F5E',
  Lifestyle: '#8B5CF6',
  Home: '#F97316',
  Other: '#6366F1',
};

export default function CreateScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [question, setQuestion] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const appendPhotos = (newPhotos: string[]) => {
    setSelectedPhotos((prev) => {
      const combined = [...prev, ...newPhotos];
      if (combined.length > 3) {
        return prev.concat(newPhotos.slice(0, 3 - prev.length));
      }
      return combined;
    });
  };

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

  const pickPhotosFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'We need access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 3,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        appendPhotos(result.assets.map((asset) => asset.uri));
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to pick photos');
    }
  };

  const takePhotoWithCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'We need access to your camera.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        appendPhotos([result.assets[0].uri]);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to take photo');
    }
  };

  const openPhotoSourcePicker = () => {
    Alert.alert('Add photo', 'Choose how you want to add a photo.', [
      { text: 'Camera', onPress: takePhotoWithCamera },
      { text: 'Gallery', onPress: pickPhotosFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
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

      const { data: postResult, error: postError } = await supabase
        .from('posts')
        .insert([postData])
        .select('id')
        .single();

      if (postError) {
        Alert.alert('Error', 'Failed to post question: ' + postError.message);
        return;
      }

      const postId = postResult?.id;

      // Upload images if any
      if (selectedPhotos.length > 0 && postId) {
        for (let i = 0; i < selectedPhotos.length; i++) {
          const photoUri = selectedPhotos[i];
          try {
            const imageUrl = await uploadPostImage(postId, photoUri, i);

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
              throw dbError;
            }
          } catch (imgError: any) {
            Alert.alert(
              'Image Upload Failed',
              imgError?.message || `Photo ${i + 1} could not be uploaded.`
            );
            return;
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
            router.push('/(tabs)');
          },
        },
      ]);
    } catch (error: any) {
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
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>Keep it quick and visual</Text>
          <Text style={styles.introText}>
            A short question plus 1 to 3 clear photos usually gets the best responses.
          </Text>
        </View>

        {/* Question Input */}
        <View style={styles.section}>
          <Text style={styles.label}>YOUR QUESTION</Text>
          <TextInput
            style={styles.input}
            placeholder="Should I buy this? Which one looks better?"
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
          <View style={styles.categoryWrap}>
            {CATEGORIES.map((cat) => (
              (() => {
                const color = CATEGORY_COLORS[cat.name] || Colors.brand;
                const selected = selectedCats.includes(cat.name);
                return (
              <TouchableOpacity
                key={cat.name}
                style={[
                  styles.categoryBtn,
                  { borderColor: color },
                  selected && styles.categoryBtnActive,
                  selected && { backgroundColor: `${color}14` },
                ]}
                onPress={() => toggleCat(cat.name)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.categoryName,
                    { color },
                    selected && styles.categoryNameActive,
                  ]}
                >
                  #{cat.name}
                </Text>
              </TouchableOpacity>
                );
              })()
            ))}
          </View>
          <Text style={styles.helperText}>Choose the categories where this question fits best.</Text>
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

          <TouchableOpacity style={styles.photoBtn} onPress={openPhotoSourcePicker}>
            <Ionicons name="image-outline" size={24} color={Colors.brand} />
            <View style={styles.photoBtnCopy}>
              <Text style={styles.photoBtnText}>
                Add up to 3 photos ({selectedPhotos.length}/3)
              </Text>
              <Text style={styles.photoBtnHint}>Camera or gallery, whatever is faster.</Text>
            </View>
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
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 14,
  },
  introCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 18,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  introText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: 20,
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
    fontSize: 15,
    color: Colors.text,
    minHeight: 92,
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
  helperText: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 10,
    lineHeight: 18,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryBtn: {
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryBtnActive: {
    transform: [{ translateY: -1 }],
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryNameActive: {
    fontWeight: '700',
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
  photoBtnCopy: {
    alignItems: 'center',
    gap: 2,
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.brand,
  },
  photoBtnHint: {
    fontSize: 12,
    color: Colors.textTertiary,
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
