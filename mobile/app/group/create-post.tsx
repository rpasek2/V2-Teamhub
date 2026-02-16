import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { X, Send, ImagePlus, Trash2, BarChart3, ClipboardList, CalendarCheck } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, theme } from '../../src/constants/colors';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { PollCreator } from '../../src/components/groups/PollCreator';
import { SignupCreator } from '../../src/components/groups/SignupCreator';
import { RsvpCreator } from '../../src/components/groups/RsvpCreator';

interface PollData {
  question: string;
  options: string[];
  settings: {
    multipleChoice: boolean;
    allowChangeVote: boolean;
    showResultsBeforeVote: boolean;
  };
}

interface SignupData {
  title: string;
  description?: string;
  slots: { name: string; maxSignups?: number }[];
  settings?: { allowUserSlots?: boolean };
}

interface RsvpData {
  title: string;
  date?: string;
  time?: string;
  location?: string;
}

interface SelectedImage {
  uri: string;
  base64?: string;
  fileName: string;
}

// Helper to decode base64 to Uint8Array for upload
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default function CreatePostScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const user = useAuthStore((state) => state.user);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [poll, setPoll] = useState<PollData | null>(null);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [signup, setSignup] = useState<SignupData | null>(null);
  const [showSignupCreator, setShowSignupCreator] = useState(false);
  const [rsvp, setRsvp] = useState<RsvpData | null>(null);
  const [showRsvpCreator, setShowRsvpCreator] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const pickImages = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to add images.');
      return;
    }

    // Launch image picker (allow multiple)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: true,
      selectionLimit: 4 - images.length, // Max 4 images total
    });

    if (!result.canceled && result.assets) {
      const newImages: SelectedImage[] = result.assets.map((asset, index) => ({
        uri: asset.uri,
        base64: asset.base64 || undefined,
        fileName: asset.fileName || `image-${Date.now()}-${index}.jpg`,
      }));
      setImages((prev) => [...prev, ...newImages].slice(0, 4));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      setUploadProgress(`Uploading image ${i + 1} of ${images.length}...`);

      try {
        // Convert base64 to blob for upload
        if (!image.base64) continue;

        const fileName = `${groupId}/${Date.now()}-${image.fileName}`;
        const base64Data = image.base64;

        // Use Supabase storage upload with base64
        const { data, error } = await supabase.storage
          .from('group-files')
          .upload(fileName, decode(base64Data), {
            contentType: 'image/jpeg',
          });

        if (error) {
          console.error('Upload error:', error);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('group-files')
          .getPublicUrl(data.path);

        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl);
        }
      } catch (err) {
        console.error('Error uploading image:', err);
      }
    }

    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if ((!content.trim() && images.length === 0 && !poll && !signup && !rsvp) || !groupId || !user?.id || submitting) return;

    setSubmitting(true);
    try {
      // Upload images first if any
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadImages();
      }

      // Build attachments array (same format as web app)
      const attachments: any[] = [];
      if (imageUrls.length > 0) {
        attachments.push({
          type: 'images',
          urls: imageUrls,
        });
      }
      if (poll) {
        attachments.push({
          type: 'poll',
          question: poll.question,
          options: poll.options,
          settings: poll.settings,
        });
      }
      if (signup) {
        attachments.push({
          type: 'signup',
          title: signup.title,
          description: signup.description,
          slots: signup.slots,
          settings: signup.settings,
        });
      }
      if (rsvp) {
        attachments.push({
          type: 'rsvp',
          title: rsvp.title,
          date: rsvp.date,
          time: rsvp.time,
          location: rsvp.location,
        });
      }

      const { error } = await supabase.from('posts').insert({
        group_id: groupId,
        user_id: user.id,
        content: content.trim(),
        attachments: attachments.length > 0 ? attachments : null,
        // Legacy support: set first image to image_url
        image_url: imageUrls.length > 0 ? imageUrls[0] : null,
      });

      if (error) throw error;

      // Go back to refresh the posts list
      router.back();
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setSubmitting(false);
      setUploadProgress('');
    }
  };

  const handleClose = () => {
    if (content.trim() || images.length > 0 || poll || signup || rsvp) {
      Alert.alert(
        'Discard Post?',
        'You have unsaved changes. Are you sure you want to discard this post?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  const hasContent = content.trim() || images.length > 0 || poll || signup || rsvp;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <X size={24} color={colors.slate[600]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <TouchableOpacity
          style={[styles.postButton, !hasContent && styles.postButtonDisabled]}
          onPress={handleSubmit}
          disabled={!hasContent || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Send size={16} color={colors.white} />
              <Text style={styles.postButtonText}>Post</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.textInput}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.slate[400]}
          value={content}
          onChangeText={setContent}
          multiline
          autoFocus
          textAlignVertical="top"
        />

        {/* Image Previews */}
        {images.length > 0 && (
          <View style={styles.imagePreviewContainer}>
            {images.map((image, index) => (
              <View key={`${image.fileName}-${index}`} style={styles.imagePreview}>
                <Image source={{ uri: image.uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Trash2 size={14} color={colors.white} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Poll Preview */}
        {poll && !showPollCreator && (
          <View style={styles.pollPreview}>
            <View style={styles.pollPreviewHeader}>
              <BarChart3 size={16} color={colors.purple[600]} />
              <Text style={styles.pollPreviewTitle}>Poll: {poll.question}</Text>
              <TouchableOpacity onPress={() => setPoll(null)} style={styles.removePollButton}>
                <X size={16} color={colors.slate[400]} />
              </TouchableOpacity>
            </View>
            <Text style={styles.pollPreviewOptions}>
              {poll.options.length} options
            </Text>
          </View>
        )}

        {/* Poll Creator */}
        {showPollCreator && (
          <PollCreator
            onSave={(data) => {
              setPoll(data);
              setShowPollCreator(false);
            }}
            onCancel={() => setShowPollCreator(false)}
            initialData={poll || undefined}
          />
        )}

        {/* Signup Preview */}
        {signup && !showSignupCreator && (
          <View style={styles.signupPreview}>
            <View style={styles.signupPreviewHeader}>
              <ClipboardList size={16} color={colors.emerald[600]} />
              <Text style={styles.signupPreviewTitle}>Sign-Up: {signup.title}</Text>
              <TouchableOpacity onPress={() => setSignup(null)} style={styles.removeSignupButton}>
                <X size={16} color={colors.slate[400]} />
              </TouchableOpacity>
            </View>
            <Text style={styles.signupPreviewSlots}>
              {signup.slots.length} slot{signup.slots.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Signup Creator */}
        {showSignupCreator && (
          <SignupCreator
            onSave={(data) => {
              setSignup(data);
              setShowSignupCreator(false);
            }}
            onCancel={() => setShowSignupCreator(false)}
          />
        )}

        {/* RSVP Preview */}
        {rsvp && !showRsvpCreator && (
          <View style={styles.rsvpPreview}>
            <View style={styles.rsvpPreviewHeader}>
              <CalendarCheck size={16} color={colors.blue[600]} />
              <Text style={styles.rsvpPreviewTitle}>RSVP: {rsvp.title}</Text>
              <TouchableOpacity onPress={() => setRsvp(null)} style={styles.removeRsvpButton}>
                <X size={16} color={colors.slate[400]} />
              </TouchableOpacity>
            </View>
            <Text style={styles.rsvpPreviewDetails}>
              {rsvp.date ? new Date(rsvp.date).toLocaleDateString() : 'No date'}
              {rsvp.time ? ` at ${rsvp.time}` : ''}
              {rsvp.location ? ` - ${rsvp.location}` : ''}
            </Text>
          </View>
        )}

        {/* RSVP Creator */}
        {showRsvpCreator && (
          <RsvpCreator
            onSave={(data) => {
              setRsvp(data);
              setShowRsvpCreator(false);
            }}
            onCancel={() => setShowRsvpCreator(false)}
          />
        )}
      </ScrollView>

      {/* Footer with actions */}
      <View style={styles.footer}>
        <View style={styles.footerActions}>
          {images.length < 4 && (
            <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
              <ImagePlus size={20} color={colors.slate[600]} />
              <Text style={styles.addImageText}>Photos</Text>
            </TouchableOpacity>
          )}
          {!poll && !showPollCreator && (
            <TouchableOpacity style={styles.addPollButton} onPress={() => setShowPollCreator(true)}>
              <BarChart3 size={20} color={colors.purple[600]} />
              <Text style={styles.addPollText}>Poll</Text>
            </TouchableOpacity>
          )}
          {!signup && !showSignupCreator && (
            <TouchableOpacity style={styles.addSignupButton} onPress={() => setShowSignupCreator(true)}>
              <ClipboardList size={20} color={colors.emerald[600]} />
              <Text style={styles.addSignupText}>Sign-Up</Text>
            </TouchableOpacity>
          )}
          {!rsvp && !showRsvpCreator && (
            <TouchableOpacity style={styles.addRsvpButton} onPress={() => setShowRsvpCreator(true)}>
              <CalendarCheck size={20} color={colors.blue[600]} />
              <Text style={styles.addRsvpText}>RSVP</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.footerInfo}>
          {uploadProgress ? (
            <Text style={styles.uploadProgress}>{uploadProgress}</Text>
          ) : (
            <>
              {images.length > 0 && (
                <Text style={styles.imageCount}>{images.length}/4 photos</Text>
              )}
              <Text style={styles.charCount}>{content.length} characters</Text>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.slate[900],
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonDisabled: {
    backgroundColor: colors.slate[300],
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  textInput: {
    fontSize: 17,
    lineHeight: 24,
    color: colors.slate[900],
    minHeight: 150,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  imagePreview: {
    position: 'relative',
    width: '48%',
    aspectRatio: 1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
    marginRight: 8,
  },
  addImageText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[600],
  },
  addPollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.purple[50],
  },
  addPollText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.purple[600],
  },
  pollPreview: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.purple[200],
    backgroundColor: colors.purple[50],
  },
  pollPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pollPreviewTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.purple[700],
  },
  removePollButton: {
    padding: 4,
  },
  pollPreviewOptions: {
    fontSize: 12,
    color: colors.purple[500],
    marginTop: 4,
    marginLeft: 24,
  },
  addSignupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.emerald[50],
    marginLeft: 8,
  },
  addSignupText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.emerald[600],
  },
  signupPreview: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.emerald[200],
    backgroundColor: colors.emerald[50],
  },
  signupPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signupPreviewTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.emerald[700],
  },
  removeSignupButton: {
    padding: 4,
  },
  signupPreviewSlots: {
    fontSize: 12,
    color: colors.emerald[500],
    marginTop: 4,
    marginLeft: 24,
  },
  addRsvpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.blue[50],
    marginLeft: 8,
  },
  addRsvpText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.blue[600],
  },
  rsvpPreview: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.blue[200],
    backgroundColor: colors.blue[50],
  },
  rsvpPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rsvpPreviewTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.blue[700],
  },
  removeRsvpButton: {
    padding: 4,
  },
  rsvpPreviewDetails: {
    fontSize: 12,
    color: colors.blue[500],
    marginTop: 4,
    marginLeft: 24,
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  imageCount: {
    fontSize: 12,
    color: colors.slate[500],
  },
  charCount: {
    fontSize: 12,
    color: colors.slate[400],
  },
  uploadProgress: {
    fontSize: 12,
    color: theme.light.primary,
    fontWeight: '500',
  },
});
