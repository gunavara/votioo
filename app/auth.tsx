import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView, Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Radius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

type Step = 'choice' | 'register' | 'login' | 'reset';
const PASSWORD_RESET_REDIRECT = 'votioo://auth?mode=reset';

// Password strength validator
const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: Colors.no };
  if (score <= 2) return { score: 2, label: 'Fair', color: '#F59E0B' };
  if (score <= 3) return { score: 3, label: 'Good', color: '#3B82F6' };
  return { score: 4, label: 'Strong', color: Colors.yes };
};

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string;
    access_token?: string;
    refresh_token?: string;
  }>();
  const { signUp, signIn } = useAuth();

  const [step, setStep] = useState<Step>('choice');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);

  const passwordStrength = getPasswordStrength(password);
  const quickTrustPoints = ['Fast yes / no answers', 'Photo-first questions', 'Helpful comments'];

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const validateUsername = (u: string) => /^[a-zA-Z0-9_]{3,20}$/.test(u);
  const changeStep = (nextStep: Step) => {
    setStep(nextStep);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setResetPassword('');
    setResetConfirmPassword('');
    setShowResetPassword(false);
    setShowResetConfirmPassword(false);
    setLoading(false);
  };

  useEffect(() => {
    const accessToken = typeof params.access_token === 'string' ? params.access_token : null;
    const refreshToken = typeof params.refresh_token === 'string' ? params.refresh_token : null;
    const mode = typeof params.mode === 'string' ? params.mode : null;

    if (mode === 'reset' && accessToken && refreshToken) {
      supabase.auth
        .setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        .then(({ error }) => {
          if (error) {
            Alert.alert('Reset link issue', 'This password reset link is invalid or expired.');
            return;
          }
          changeStep('reset');
        });
    }
  }, [params.access_token, params.mode, params.refresh_token]);

  const handleRegister = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    if (!validateUsername(username)) {
      Alert.alert('Error', 'Username must be 3-20 characters (letters, numbers, underscore only)');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, username);
    setLoading(false);

    if (error) {
      Alert.alert('Registration Failed', error);
    } else {
      Alert.alert('Success', 'Account created! You are now signed in.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    }
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password, stayLoggedIn);
    setLoading(false);

    if (error) {
      Alert.alert('Login Failed', error);
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Enter email', 'Add your account email first, then try again.');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: PASSWORD_RESET_REDIRECT,
      });
      if (error) {
        Alert.alert('Reset failed', error.message);
        return;
      }
      Alert.alert(
        'Email sent',
        'If this email exists, a password reset link has been sent. Make sure your Supabase redirect URLs allow the votioo app scheme.'
      );
    } catch (error: any) {
      Alert.alert('Reset failed', error?.message || 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (resetPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: resetPassword,
      });

      if (error) {
        Alert.alert('Reset failed', error.message);
        return;
      }

      Alert.alert('Password updated', 'Your password has been changed successfully.', [
        { text: 'OK', onPress: () => changeStep('login') },
      ]);
    } catch (error: any) {
      Alert.alert('Reset failed', error?.message || 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {step !== 'choice' && (
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => changeStep('choice')}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.brand} />
          </TouchableOpacity>
        )}

        <Text style={styles.logo}>votioo</Text>
        <Text style={styles.tagline}>Ask. Vote. Decide.</Text>

        {step === 'choice' && (
          <>
            <Text style={styles.heading}>Welcome to Votioo</Text>
            <Text style={styles.subheading}>
              Ask fast, honest questions and get real reactions in minutes.
            </Text>

            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>Built for quick decisions</Text>
              <Text style={styles.heroBody}>
                Snap a photo, add a short question, and let people vote without friction.
              </Text>
              <View style={styles.heroPoints}>
                {quickTrustPoints.map((point) => (
                  <View key={point} style={styles.heroPoint}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.brand} />
                    <Text style={styles.heroPointText}>{point}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.largeBtn, styles.primaryBtn]}
                onPress={() => changeStep('register')}
              >
                <Text style={styles.largeBtnText}>Create Account →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.largeBtn, styles.secondaryBtn]}
                onPress={() => changeStep('login')}
              >
                <Text style={[styles.largeBtnText, { color: Colors.brand }]}>Sign In →</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.legal}>
              By continuing you agree to our{' '}
              <Text style={styles.legalLink}>Terms of Service</Text> and{' '}
              <Text style={styles.legalLink}>Privacy Policy</Text>.
            </Text>
          </>
        )}

        {step === 'register' && (
          <>
            <Text style={styles.heading}>Create Account</Text>
            <Text style={styles.subheading}>
              Create your profile and start asking better questions.
            </Text>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color={Colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor={Colors.textTertiary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color={Colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="username_123"
                    placeholderTextColor={Colors.textTertiary}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
                <Text style={styles.hint}>3-20 characters, letters, numbers, underscore only</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.textTertiary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={Colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
                {password && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBar}>
                      <View
                        style={[
                          styles.strengthFill,
                          {
                            width: `${(passwordStrength.score / 4) * 100}%`,
                            backgroundColor: passwordStrength.color
                          }
                        ]}
                      />
                    </View>
                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                      {passwordStrength.label}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.textTertiary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={Colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.largeBtn, styles.primaryBtn, styles.submitBtn, loading && { opacity: 0.6 }]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.largeBtnText}>Create Account →</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => changeStep('login')}>
                <Text style={styles.switchLink}>Already have an account? Sign in</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 'login' && (
          <>
            <Text style={styles.heading}>Sign In</Text>
            <Text style={styles.subheading}>
              Welcome back. Pick up where you left off.
            </Text>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color={Colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor={Colors.textTertiary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.textTertiary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={Colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <Pressable
                style={styles.checkboxRow}
                onPress={() => setStayLoggedIn(!stayLoggedIn)}
              >
                <View style={[styles.checkbox, stayLoggedIn && styles.checkboxChecked]}>
                  {stayLoggedIn && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Keep me signed in</Text>
              </Pressable>

              <Text style={styles.sessionHint}>
                Best on your personal phone. You can sign out anytime from Profile.
              </Text>

              <TouchableOpacity
                style={[styles.largeBtn, styles.primaryBtn, styles.submitBtn, loading && { opacity: 0.6 }]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.largeBtnText}>Sign In →</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => changeStep('register')}>
                <Text style={styles.switchLink}>New here? Create an account</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 'reset' && (
          <>
            <Text style={styles.heading}>Set New Password</Text>
            <Text style={styles.subheading}>
              Choose a strong new password and get back into your account.
            </Text>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.textTertiary}
                    value={resetPassword}
                    onChangeText={setResetPassword}
                    secureTextEntry={!showResetPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowResetPassword(!showResetPassword)}>
                    <Ionicons
                      name={showResetPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={Colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.textTertiary}
                    value={resetConfirmPassword}
                    onChangeText={setResetConfirmPassword}
                    secureTextEntry={!showResetConfirmPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowResetConfirmPassword(!showResetConfirmPassword)}>
                    <Ionicons
                      name={showResetConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={Colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.largeBtn, styles.primaryBtn, styles.submitBtn, loading && { opacity: 0.6 }]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.largeBtnText}>Save New Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 8,
  },
  logo: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.brand,
    letterSpacing: -1,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginBottom: 32,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  heroCard: {
    width: '100%',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: 18,
    marginBottom: 28,
    gap: 10,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  heroPoints: {
    gap: 8,
    marginTop: 4,
  },
  heroPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroPointText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  largeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 20,
    width: '100%',
    height: 60,
  },
  primaryBtn: {
    backgroundColor: Colors.brand,
  },
  secondaryBtn: {
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  largeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  form: {
    width: '100%',
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  hint: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  strengthContainer: {
    gap: 6,
  },
  strengthBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  checkboxLabel: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  sessionHint: {
    marginTop: -8,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textTertiary,
  },
  submitBtn: {
    marginTop: 8,
    height: 60,
  },
  forgotLink: {
    fontSize: 14,
    color: Colors.brand,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  switchLink: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  legal: {
    marginTop: 32,
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: Colors.brand,
    fontWeight: '600',
  },
});
