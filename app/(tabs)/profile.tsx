import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Radius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const isLoggedIn = !!user;

  const [questionsCount, setQuestionsCount] = useState(0);
  const [votesCount, setVotesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bioModalVisible, setBioModalVisible] = useState(false);
  const [editBio, setEditBio] = useState(profile?.bio || '');
  const [savingBio, setSavingBio] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);

  // Fetch user stats
  useEffect(() => {
    if (isLoggedIn && user) {
      fetchUserStats();
    }
  }, [user, isLoggedIn]);

  const fetchUserStats = async () => {
    try {
      setLoading(true);

      // Fetch questions count
      const { count: qCount, error: qError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      if (qError) {
        console.log('❌ Error fetching questions:', qError.message);
      } else {
        setQuestionsCount(qCount || 0);
      }

      // Fetch votes count
      const { count: vCount, error: vError } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      if (vError) {
        console.log('❌ Error fetching votes:', vError.message);
      } else {
        setVotesCount(vCount || 0);
      }

      setLoading(false);
    } catch (error) {
      console.log('❌ Error fetching stats:', error);
      setLoading(false);
    }
  };

  const handleSaveBio = async () => {
    if (!user) return;

    try {
      setSavingBio(true);

      const { error } = await supabase
        .from('profiles')
        .update({ bio: editBio })
        .eq('id', user.id);

      if (error) {
        Alert.alert('Error', 'Failed to save bio: ' + error.message);
        return;
      }

      // Refresh profile data
      await refreshProfile();
      setBioModalVisible(false);
      Alert.alert('Success', 'Bio updated!');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save bio');
    } finally {
      setSavingBio(false);
    }
  };

  const handlePickAvatar = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your photo library to change your avatar.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      const imageUri = result.assets[0].uri;
      await uploadAvatar(imageUri);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to pick image');
    }
  };

  const uploadAvatar = async (imageUri: string) => {
    if (!user) return;

    try {
      setUploadingAvatar(true);

      // Read the image file
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Generate unique filename (just filename, no subfolder)
      const filename = `${user.id}-${Date.now()}.jpg`;

      // Upload to Supabase storage (directly to bucket root)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filename, blob, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        Alert.alert('Upload Error', uploadError.message);
        return;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filename);

      const publicUrl = data.publicUrl;

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        Alert.alert('Error', 'Failed to save avatar URL');
        return;
      }

      // Update local state and refresh profile
      setAvatarUrl(publicUrl);
      await refreshProfile();
      Alert.alert('Success', 'Avatar updated!');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = () => {
    // Step 1: Ask for current password
    Alert.prompt(
      'Change Password',
      'Enter your current password:',
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Next',
          onPress: (currentPassword: string | undefined) => {
            if (!currentPassword) {
              Alert.alert('Error', 'Please enter your current password');
              return;
            }

            // Step 2: Ask for new password
            Alert.prompt(
              'Change Password',
              'Enter your new password (min 8 characters):',
              [
                {
                  text: 'Cancel',
                  onPress: () => {},
                  style: 'cancel',
                },
                {
                  text: 'Next',
                  onPress: (newPassword: string | undefined) => {
                    if (!newPassword || newPassword.length < 8) {
                      Alert.alert('Error', 'Password must be at least 8 characters');
                      return;
                    }

                    // Step 3: Ask for confirmation
                    Alert.prompt(
                      'Change Password',
                      'Repeat your new password:',
                      [
                        {
                          text: 'Cancel',
                          onPress: () => {},
                          style: 'cancel',
                        },
                        {
                          text: 'Change',
                          onPress: async (confirmPassword: string | undefined) => {
                            if (confirmPassword !== newPassword) {
                              Alert.alert('Error', 'Passwords do not match');
                              return;
                            }

                            try {
                              // Verify current password by attempting to sign in
                              const { error: signInError } = await supabase.auth.signInWithPassword({
                                email: user?.email || '',
                                password: currentPassword,
                              });

                              if (signInError) {
                                Alert.alert('Error', 'Current password is incorrect');
                                return;
                              }

                              // Update to new password
                              const { error } = await supabase.auth.updateUser({
                                password: newPassword,
                              });

                              if (error) {
                                Alert.alert('Error', error.message);
                              } else {
                                Alert.alert('Success', 'Password changed successfully!');
                              }
                            } catch (error: any) {
                              Alert.alert('Error', error?.message || 'Failed to change password');
                            }
                          },
                        },
                      ],
                      'secure-text'
                    );
                  },
                },
              ],
              'secure-text'
            );
          },
        },
      ],
      'secure-text'
    );
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>
        <View style={styles.guestContainer}>
          <Text style={styles.guestIcon}>👤</Text>
          <Text style={styles.guestTitle}>Join Votioo</Text>
          <Text style={styles.guestText}>
            Sign in to vote, ask questions, and get feedback from people around the world.
          </Text>
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.signInText}>Sign in / Sign up</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar & Info */}
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(profile?.username ?? 'U')[0].toUpperCase()}</Text>
              </View>
            )}
            {uploadingAvatar && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="white" />
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={20} color="white" />
            </View>
          </TouchableOpacity>
          <Text style={styles.username}>@{profile?.username ?? 'user'}</Text>
          
          {/* Bio with edit button */}
          <View style={styles.bioContainer}>
            <Text style={styles.bio}>{profile?.bio || 'No bio yet'}</Text>
            <TouchableOpacity
              style={styles.editBioBtn}
              onPress={() => {
                setEditBio(profile?.bio || '');
                setBioModalVisible(true);
              }}
            >
              <Ionicons name="pencil" size={16} color={Colors.brand} />
            </TouchableOpacity>
          </View>

          {/* Stats */}
          {loading ? (
            <ActivityIndicator size="small" color={Colors.brand} />
          ) : (
            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{questionsCount}</Text>
                <Text style={styles.statLabel}>Questions</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{votesCount}</Text>
                <Text style={styles.statLabel}>Votes</Text>
              </View>
            </View>
          )}
        </View>

        {/* Settings rows */}
        <View style={styles.section}>
          {/* My Questions */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/my-questions')}
          >
            <Ionicons name="help-circle-outline" size={20} color={Colors.brand} />
            <Text style={styles.rowLabel}>My Questions</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>

          {/* Edit Profile */}
          <TouchableOpacity
            style={styles.row}
            onPress={handleChangePassword}
          >
            <Ionicons name="lock-closed-outline" size={20} color={Colors.brand} />
            <Text style={styles.rowLabel}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>

          {/* Privacy Policy */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => setPrivacyModalVisible(true)}
          >
            <Ionicons name="document-text-outline" size={20} color={Colors.brand} />
            <Text style={styles.rowLabel}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>

          {/* Sign Out */}
          <TouchableOpacity
            style={[styles.row, styles.dangerRow]}
            onPress={() => {
              Alert.alert('Sign Out', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out',
                  style: 'destructive',
                  onPress: signOut,
                },
              ]);
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={[styles.rowLabel, { color: '#EF4444' }]}>Sign Out</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bio Edit Modal */}
      <Modal
        visible={bioModalVisible}
        animationType="slide"
        transparent={true}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setBioModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Bio</Text>
            <TouchableOpacity
              onPress={handleSaveBio}
              disabled={savingBio}
            >
              <Text style={[styles.modalSave, savingBio && { opacity: 0.5 }]}>
                {savingBio ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TextInput
              style={styles.bioInput}
              placeholder="Write your bio..."
              placeholderTextColor={Colors.textTertiary}
              value={editBio}
              onChangeText={setEditBio}
              multiline
              maxLength={160}
            />
            <Text style={styles.charCount}>
              {editBio.length}/160
            </Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={privacyModalVisible}
        animationType="slide"
        transparent={true}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
              <Text style={styles.modalCancel}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Privacy Policy</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.privacyText}>
              <Text style={styles.privacyTitle}>Privacy Policy for Votioo</Text>
              {'\n\n'}
              <Text style={styles.privacySubtitle}>1. Introduction</Text>
              {'\n'}
              Votioo is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information.
              {'\n\n'}
              <Text style={styles.privacySubtitle}>2. Information We Collect</Text>
              {'\n'}
              We collect information you provide directly, such as when you create an account, post questions, or vote on polls.
              {'\n\n'}
              <Text style={styles.privacySubtitle}>3. How We Use Your Information</Text>
              {'\n'}
              Your information is used to provide, maintain, and improve our services, and to communicate with you about your account.
              {'\n\n'}
              <Text style={styles.privacySubtitle}>4. Data Security</Text>
              {'\n'}
              We implement appropriate technical and organizational measures to protect your personal data against unauthorized access.
              {'\n\n'}
              <Text style={styles.privacySubtitle}>5. Your Rights</Text>
              {'\n'}
              You have the right to access, update, or delete your personal information at any time.
              {'\n\n'}
              <Text style={styles.privacySubtitle}>6. Contact Us</Text>
              {'\n'}
              If you have questions about this Privacy Policy, please contact us at support@votioo.app
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  bioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  bio: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
  editBioBtn: {
    padding: 6,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 40,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.brand,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  section: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    gap: 12,
  },
  dangerRow: {
    backgroundColor: '#FEE2E2',
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  guestIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  guestText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  signInBtn: {
    backgroundColor: Colors.brand,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  signInText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSafe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  modalCancel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  bioInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'right',
  },
  privacyText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  privacySubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});
