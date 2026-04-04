import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Radius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Step = 'email' | 'code';

export default function AuthScreen() {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setStep('code');
    }
  };

  const handleVerifyCode = async () => {
    if (code.trim().length < 6) {
      Alert.alert('Грешка', 'Въведи пълния код от имейла.');
      return;
    }
    setLoading(true);

    try {
      // Стъпка 1: верифициране на OTP
      let result = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: 'magiclink',
      });

      if (result.error) {
        result = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: code.trim(),
          type: 'email',
        });
      }

      if (result.error) {
        setLoading(false);
        Alert.alert('Грешка при верификация', result.error.message);
        return;
      }

      if (!result.data?.session) {
        setLoading(false);
        Alert.alert('Грешка', 'Сесията не е получена. Поискай нов код.');
        return;
      }

      // Изрично запазваме сесията и обновяваме контекста
      await supabase.auth.setSession({
        access_token: result.data.session.access_token,
        refresh_token: result.data.session.refresh_token,
      });

      await refreshAuth();
      setLoading(false);
      router.replace('/(tabs)');

    } catch (err: any) {
      setLoading(false);
      Alert.alert('Неочаквана грешка', err?.message ?? String(err));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.logo}>votioo</Text>
        <Text style={styles.tagline}>Ask. Vote. Decide.</Text>

        {step === 'email' ? (
          <>
            <Text style={styles.heading}>Join the conversation</Text>
            <Text style={styles.subheading}>
              Sign in to vote, comment, and post your own questions.
            </Text>

            {/* Apple & Google (coming soon) */}
            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => Alert.alert('Coming soon', 'Apple Sign In will be added when publishing to App Store.')}
              >
                <Text style={styles.socialIcon}>🍎</Text>
                <Text style={styles.socialBtnText}>Continue with Apple</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialBtn, styles.googleBtn]}
                onPress={() => Alert.alert('Coming soon', 'Google Sign In will be added in the next update.')}
              >
                <Text style={[styles.socialIcon, { color: Colors.text }]}>G</Text>
                <Text style={[styles.socialBtnText, styles.googleText]}>Continue with Google</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or use email</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.emailSection}>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={Colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
                onPress={handleSendCode}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Send me a code ✨</Text>
                }
              </TouchableOpacity>
              <Text style={styles.note}>
                We'll send a 6-digit code to your email. No password needed.
              </Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.heading}>Check your email</Text>
            <Text style={styles.subheading}>
              We sent a 6-digit code to{'\n'}
              <Text style={{ color: Colors.brand, fontWeight: '700' }}>{email}</Text>
            </Text>

            <View style={styles.emailSection}>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="00000000"
                placeholderTextColor={Colors.textTertiary}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={8}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
                onPress={handleVerifyCode}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Sign in →</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setStep('email'); setCode(''); }}>
                <Text style={styles.backLink}>← Use a different email</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSendCode}>
                <Text style={styles.resendLink}>Resend code</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={styles.legal}>
          By continuing you agree to our{' '}
          <Text style={styles.legalLink}>Terms of Service</Text> and{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1, backgroundColor: Colors.background,
    padding: 24, paddingTop: 60, alignItems: 'center',
  },
  closeBtn: { position: 'absolute', top: 20, right: 20, padding: 6 },
  logo: { fontSize: 32, fontWeight: '900', color: Colors.brand, letterSpacing: -1, marginBottom: 4 },
  tagline: { fontSize: 14, color: Colors.textTertiary, marginBottom: 32, fontWeight: '500', letterSpacing: 0.5 },
  heading: { fontSize: 24, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: 8 },
  subheading: {
    fontSize: 15, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 22, marginBottom: 32, paddingHorizontal: 16,
  },
  socialButtons: { width: '100%', gap: 12 },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: Colors.text, borderRadius: Radius.md, padding: 15,
  },
  googleBtn: { backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.border },
  socialIcon: { fontSize: 18, color: '#fff', fontWeight: '800' },
  socialBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  googleText: { color: Colors.text },
  divider: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', marginVertical: 24, gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textTertiary, fontSize: 13, fontWeight: '500' },
  emailSection: { width: '100%', gap: 12 },
  input: {
    backgroundColor: Colors.card, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border,
    padding: 14, fontSize: 15, color: Colors.text,
  },
  codeInput: {
    fontSize: 28, fontWeight: '700', textAlign: 'center',
    letterSpacing: 8, paddingVertical: 18,
  },
  primaryBtn: { backgroundColor: Colors.brand, borderRadius: Radius.md, padding: 15, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  note: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center', lineHeight: 18 },
  backLink: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 4 },
  resendLink: { fontSize: 14, color: Colors.brand, fontWeight: '600', textAlign: 'center' },
  legal: { marginTop: 32, fontSize: 12, color: Colors.textTertiary, textAlign: 'center', lineHeight: 18 },
  legalLink: { color: Colors.brand, fontWeight: '600' },
});
