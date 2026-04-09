import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Radius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { devError, devLog } from '../../lib/devLog';
import { uploadAvatarForUser } from '../../lib/storage';
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
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);

  // Fetch user stats
  useEffect(() => {
    if (isLoggedIn && user) {
      fetchUserStats();
      loadAvatarUrl();
    }
  }, [user, isLoggedIn]);

  const loadAvatarUrl = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      } else {
        setAvatarUrl(null);
      }
    } catch (error) {
      setAvatarUrl(null);
    }
  };

  const fetchUserStats = async () => {
    try {
      setLoading(true);

      // Fetch questions count
      const { count: qCount, error: qError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      if (qError) {
        devError('Error fetching questions:', qError.message);
      } else {
        setQuestionsCount(qCount || 0);
      }

      // Fetch votes count
      const { count: vCount, error: vError } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      if (vError) {
        devError('Error fetching votes:', vError.message);
      } else {
        setVotesCount(vCount || 0);
      }

      setLoading(false);
    } catch (error) {
      devError('Error fetching stats:', error);
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

  const handleChangeAvatar = async () => {
    Alert.alert('Change avatar', 'Choose how you want to update your avatar.', [
      { text: 'Camera', onPress: takeAvatarPhoto },
      { text: 'Gallery', onPress: pickAvatarFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickAvatarFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your photo library to change your avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      await uploadAvatar(result.assets[0].uri);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to pick photo');
    }
  };

  const takeAvatarPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your camera to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      await uploadAvatar(result.assets[0].uri);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to take photo');
    }
  };

  const uploadAvatar = async (imageUri: string) => {
    if (!user) return;

    try {
      setUploadingAvatar(true);
      const publicUrl = await uploadAvatarForUser(user.id, imageUri);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        Alert.alert('Error', 'Failed to save avatar URL: ' + updateError.message);
        return;
      }

      setAvatarUrl(publicUrl);
      await refreshProfile();
      Alert.alert('Success', 'Avatar updated!');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const openPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordModalVisible(true);
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'No account email found for this user.');
      return;
    }

    if (!currentPassword) {
      Alert.alert('Error', 'Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    try {
      setSavingPassword(true);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        Alert.alert('Error', 'Current password is incorrect.');
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
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
            style={styles.avatar}
            onPress={handleChangeAvatar}
            disabled={uploadingAvatar}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
                onError={() => {
                  devLog('Avatar image failed to load');
                  setAvatarUrl(null);
                }}
              />
            ) : (
              <Text style={styles.avatarText}>{(profile?.username ?? 'U')[0].toUpperCase()}</Text>
            )}
            {uploadingAvatar && <ActivityIndicator style={styles.uploadingOverlay} color="white" />}
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap photo to change avatar</Text>
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
            onPress={openPasswordModal}
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
                  onPress: () => signOut(),
                },
              ]);
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
            <Text style={[styles.rowLabel, styles.dangerText]}>Sign Out</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <Modal visible={passwordModalVisible} animationType="slide" transparent>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Change Password</Text>
                <TouchableOpacity onPress={handleChangePassword} disabled={savingPassword}>
                  {savingPassword ? (
                    <ActivityIndicator color={Colors.brand} />
                  ) : (
                    <Text style={styles.modalSave}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formHelper}>
                  Choose a new password with at least 8 characters.
                </Text>

                <Text style={styles.inputLabel}>Current password</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter current password"
                  placeholderTextColor={Colors.textTertiary}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!savingPassword}
                />

                <Text style={styles.inputLabel}>New password</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="At least 8 characters"
                  placeholderTextColor={Colors.textTertiary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!savingPassword}
                />

                <Text style={styles.inputLabel}>Confirm new password</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Repeat new password"
                  placeholderTextColor={Colors.textTertiary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!savingPassword}
                />
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Bio Modal */}
        <Modal visible={bioModalVisible} animationType="slide" transparent>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setBioModalVisible(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Edit Bio</Text>
                <TouchableOpacity onPress={handleSaveBio} disabled={savingBio}>
                  {savingBio ? (
                    <ActivityIndicator color={Colors.brand} />
                  ) : (
                    <Text style={styles.modalSave}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.bioInput}
                placeholder="Tell us about yourself..."
                placeholderTextColor={Colors.textTertiary}
                value={editBio}
                onChangeText={setEditBio}
                multiline
                maxLength={160}
              />
              <Text style={styles.charCount}>{160 - editBio.length} characters left</Text>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Privacy Policy Modal */}
        <Modal visible={privacyModalVisible} animationType="slide" transparent>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
                  <Text style={styles.modalClose}>Close</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Privacy Policy</Text>
                <View style={{ width: 50 }} />
              </View>
              <ScrollView style={styles.privacyContent}>
                <Text style={styles.privacyText}>
                  Your privacy is important to us. This app collects minimal personal information
                  and uses it only to provide the service. We do not share your data with third
                  parties without your consent.
                </Text>
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  uploadingOverlay: {
    position: 'absolute',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },
  avatarHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 8,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  bioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  bio: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  editBioBtn: {
    marginLeft: 8,
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.brand,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  section: {
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: Colors.text,
  },
  dangerRow: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: Colors.danger,
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  guestIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  guestText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  signInBtn: {
    backgroundColor: Colors.brand,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  signInText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    marginHorizontal: 8,
    marginBottom: 8,
    maxHeight: '78%',
    minHeight: 360,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  modalCancel: {
    fontSize: 16,
    color: Colors.textSecondary,
    minWidth: 72,
  },
  modalClose: {
    fontSize: 16,
    color: Colors.brand,
    minWidth: 72,
  },
  modalSave: {
    fontSize: 16,
    color: Colors.brand,
    fontWeight: '600',
    minWidth: 72,
    textAlign: 'right',
  },
  formSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  formHelper: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  bioInput: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    fontSize: 16,
    color: Colors.text,
    textAlignVertical: 'top',
    minHeight: 220,
    maxHeight: 320,
  },
  charCount: {
    marginHorizontal: 16,
    marginTop: 8,
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'right',
  },
  privacyContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  privacyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
