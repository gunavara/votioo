import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Colors, Radius } from '../../constants/theme';
import { CATEGORIES } from '../../constants/mockData';
import { useRouter } from 'expo-router';

export default function CreateScreen() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  const maxChars = 120;
  const charsLeft = maxChars - question.length;

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

  const handleSubmit = () => {
    if (!question.trim()) {
      Alert.alert('Question required', 'Please write your question first.');
      return;
    }
    if (selectedCats.length === 0) {
      Alert.alert('Category required', 'Please select at least one category.');
      return;
    }
    // Will connect to Supabase later
    Alert.alert('Sign in required', 'You need to sign in to post a question.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign in', onPress: () => router.push('/auth') },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Ask a question</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Question input */}
        <Text style={styles.label}>Your question</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="e.g. Is this outfit worth buying?"
            placeholderTextColor={Colors.textTertiary}
            value={question}
            onChangeText={(t) => {
              if (t.length <= maxChars) setQuestion(t);
            }}
            multiline
            maxLength={maxChars}
            returnKeyType="done"
          />
          <Text style={[styles.charCount, charsLeft < 20 && styles.charCountWarn]}>
            {charsLeft} chars left
          </Text>
        </View>

        {/* Categories */}
        <Text style={styles.label}>Category (max 2)</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map((cat) => {
            const active = selectedCats.includes(cat.name);
            return (
              <TouchableOpacity
                key={cat.name}
                style={[styles.catChip, active && styles.catChipActive]}
                onPress={() => toggleCat(cat.name)}
              >
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
                <Text style={[styles.catLabel, active && styles.catLabelActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Add image placeholder */}
        <Text style={styles.label}>Photos (optional)</Text>
        <TouchableOpacity style={styles.imagePicker}>
          <Text style={styles.imagePickerIcon}>📷</Text>
          <Text style={styles.imagePickerText}>Add up to 3 photos</Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (!question.trim() || !selectedCats.length) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
        >
          <Text style={styles.submitText}>Post question</Text>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
  },
  input: {
    fontSize: 16,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginTop: 6,
  },
  charCountWarn: {
    color: Colors.no,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  catChipActive: {
    backgroundColor: Colors.brandLight,
    borderColor: Colors.brand,
  },
  catEmoji: {
    fontSize: 14,
  },
  catLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  catLabelActive: {
    color: Colors.brand,
  },
  imagePicker: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexDirection: 'row',
  },
  imagePickerIcon: {
    fontSize: 22,
  },
  imagePickerText: {
    color: Colors.textTertiary,
    fontSize: 15,
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: Colors.brand,
    borderRadius: Radius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 14,
  },
});
