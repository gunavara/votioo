import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Radius, Shadow } from '../../constants/theme';
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

  const handleChangePassword = () => {
    Alert.prompt(
      'Change Password',
      'Enter your new password:',
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Change',
          onPress: async (newPassword: string | undefined) => {
            if (!newPassword || newPassword.length < 8) {
              Alert.alert('Error', 'Password must be at least 8 characters');
              return;
            }

            try {
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
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(profile?.username ?? 'U')[0].toUpperCase()}</Text>
          </View>
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
              <Ionicons name="pencil" size={14} color={Colors.brand} />
            </TouchableOpacity>
          </View>

          {/* Stats */}
          {loading ? (
            <ActivityIndicator color={Colors.brand} />
          ) : (
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{questionsCount}</Text>
                <Text style={styles.statLabel}>Questions</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statNum}>{votesCount}</Text>
                <Text style={styles.statLabel}>Votes cast</Text>
              </View>
            </View>
          )}
        </View>

        {/* Settings rows */}
        <View style={styles.section}>
          {/* Profile Visibility */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => setPrivacyModalVisible(true)}
          >
            <Ionicons name="eye-outline" size={20} color={Colors.brand} />
            <Text style={styles.rowLabel}>Profile visibility: {profile?.is_public ? 'Public' : 'Private'}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>

          {/* My Questions */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/my-questions')}
          >
            <Ionicons name="list-outline" size={20} color={Colors.brand} />
            <Text style={styles.rowLabel}>My questions</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>

          {/* Edit Profile */}
          <TouchableOpacity
            style={styles.row}
            onPress={handleChangePassword}
          >
            <Ionicons name="settings-outline" size={20} color={Colors.brand} />
            <Text style={styles.rowLabel}>Edit profile</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>

          {/* Privacy Policy */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => setPrivacyModalVisible(true)}
          >
            <Ionicons name="shield-outline" size={20} color={Colors.brand} />
            <Text style={styles.rowLabel}>Privacy policy</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>

          {/* Sign Out */}
          <TouchableOpacity style={[styles.row, styles.rowLast]} onPress={signOut}>
            <Ionicons name="log-out-outline" size={20} color={Colors.no} />
            <Text style={[styles.rowLabel, { color: Colors.no }]}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bio Edit Modal */}
      <Modal
        visible={bioModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBioModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
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

          <View style={styles.modalContent}>
            <TextInput
              style={styles.bioInput}
              placeholder="Write something about yourself..."
              placeholderTextColor={Colors.textTertiary}
              value={editBio}
              onChangeText={setEditBio}
              multiline
              maxLength={160}
            />
            <Text style={styles.charCount}>{editBio.length}/160</Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={privacyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Privacy Policy</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.policyText}>
              <Text style={styles.policyHeading}>Privacy Policy</Text>
              {'\n\n'}
              Votioo respects your privacy. We collect minimal personal information to provide our services.
              {'\n\n'}
              <Text style={styles.policySubheading}>Data Collection:</Text>
              {'\n'}
              • Email address and username for account creation
              • Questions and votes you submit
              • Profile information you choose to share
              {'\n\n'}
              <Text style={styles.policySubheading}>Data Usage:</Text>
              {'\n'}
              • To provide and improve our services
              • To communicate with you about your account
              • To show your profile publicly (if enabled)
              {'\n\n'}
              <Text style={styles.policySubheading}>Your Rights:</Text>
              {'\n'}
              • You can edit or delete your profile at any time
              • You can make your profile private
              • You can request data deletion by contacting support
              {'\n\n'}
              For more information, contact: support@votioo.app
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
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  guestIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 10,
  },
  guestText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  signInBtn: {
    backgroundColor: Colors.brand,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: Radius.full,
  },
  signInText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    ...Shadow.card,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.brand,
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  bioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  bio: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
  editBioBtn: {
    padding: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  stat: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.brand,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalCancel: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  modalSave: {
    fontSize: 16,
    color: Colors.brand,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  bioInput: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 8,
    textAlign: 'right',
  },
  policyText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  policyHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  policySubheading: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.brand,
  },
});
