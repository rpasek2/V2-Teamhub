import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Loader2, Camera, User, Save, Check, Building2, Bell, Moon, Sun, Lock, Trash2, AlertTriangle, Bug, MessageSquarePlus, Send } from 'lucide-react';

export function UserSettings() {
    const { user, signOut } = useAuth();
    const { isDark, toggleDark } = useTheme();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [fullName, setFullName] = useState('');
    const [organization, setOrganization] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    // Password change state
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    // Feedback form state
    const [feedbackType, setFeedbackType] = useState<'bug' | 'feature_request'>('bug');
    const [feedbackTitle, setFeedbackTitle] = useState('');
    const [feedbackDescription, setFeedbackDescription] = useState('');
    const [submittingFeedback, setSubmittingFeedback] = useState(false);

    // Delete account state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, organization, avatar_url, notifications_enabled')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            setFullName(data.full_name || '');
            setOrganization(data.organization || '');
            setAvatarUrl(data.avatar_url);
            setNotificationsEnabled(data.notifications_enabled !== false);
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmNewPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        if (newPassword.length < 8) {
            setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
            return;
        }

        setChangingPassword(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setShowPasswordForm(false);
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (error: unknown) {
            console.error('Error changing password:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to change password.';
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setChangingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') {
            setMessage({ type: 'error', text: 'Please type DELETE to confirm.' });
            return;
        }

        setDeleting(true);
        setMessage(null);

        try {
            // Note: Full account deletion requires a server-side function
            // For now, we'll delete the profile and sign out
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', user?.id);

            if (error) throw error;

            await signOut();
            navigate('/login');
        } catch (error: unknown) {
            console.error('Error deleting account:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete account.';
            setMessage({ type: 'error', text: errorMessage });
            setDeleting(false);
        }
    };

    const handleSubmitFeedback = async () => {
        if (!user || !feedbackTitle.trim() || !feedbackDescription.trim()) return;
        setSubmittingFeedback(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('feedback_reports')
                .insert({
                    user_id: user.id,
                    type: feedbackType,
                    title: feedbackTitle.trim(),
                    description: feedbackDescription.trim(),
                });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Thank you! Your feedback has been submitted.' });
            setFeedbackTitle('');
            setFeedbackDescription('');
            setFeedbackType('bug');
        } catch (error: unknown) {
            console.error('Error submitting feedback:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to submit feedback.';
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setSubmittingFeedback(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setSaving(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName.trim(),
                    organization: organization.trim() || null,
                })
                .eq('id', user.id);

            if (error) throw error;

            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error: unknown) {
            console.error('Error updating profile:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update profile.';
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please select an image file.' });
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Image must be less than 5MB.' });
            return;
        }

        setUploadingAvatar(true);
        setMessage(null);

        try {
            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/avatar.${fileExt}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            // Add cache buster to force refresh
            const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

            // Update profile with new avatar URL
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: urlWithCacheBuster })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setAvatarUrl(urlWithCacheBuster);
            setMessage({ type: 'success', text: 'Avatar updated successfully!' });
        } catch (error: unknown) {
            console.error('Error uploading avatar:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to upload avatar.';
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setUploadingAvatar(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent-600" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-heading">Account Settings</h1>
                <p className="mt-1 text-subtle">Manage your profile and account preferences.</p>
            </div>

            {message && (
                <div className={`p-4 rounded-md flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                    {message.type === 'success' && <Check className="h-5 w-5" />}
                    {message.text}
                </div>
            )}

            {/* Profile Photo Section */}
            <div className="bg-surface shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-heading mb-4">Profile Photo</h2>

                <div className="flex items-center gap-6">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={handleAvatarClick}
                            disabled={uploadingAvatar}
                            className="relative w-24 h-24 rounded-full overflow-hidden bg-surface-hover border-2 border-line hover:border-accent-300 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <User className="w-12 h-12 text-faint absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            )}

                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                {uploadingAvatar ? (
                                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                                ) : (
                                    <Camera className="h-6 w-6 text-white" />
                                )}
                            </div>
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                        />
                    </div>

                    <div>
                        <p className="text-sm text-body font-medium">Click to upload a new photo</p>
                        <p className="text-xs text-muted mt-1">JPG, PNG or GIF. Max 5MB.</p>
                    </div>
                </div>
            </div>

            {/* Profile Information Section */}
            <div className="bg-surface shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-heading mb-4">Profile Information</h2>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-body">
                            Full Name
                        </label>
                        <div className="mt-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-faint" />
                            </div>
                            <input
                                type="text"
                                id="fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-line-strong rounded-md shadow-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 sm:text-sm"
                                placeholder="Enter your full name"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="organization" className="block text-sm font-medium text-body">
                            Organization <span className="text-faint font-normal">(Optional)</span>
                        </label>
                        <div className="mt-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Building2 className="h-5 w-5 text-faint" />
                            </div>
                            <input
                                type="text"
                                id="organization"
                                value={organization}
                                onChange={(e) => setOrganization(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-line-strong rounded-md shadow-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 sm:text-sm"
                                placeholder="Enter your organization"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-accent-600 hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Notifications Section */}
            <div className="bg-surface shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-heading mb-4">Notifications</h2>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent-500/10">
                            <Bell className="h-5 w-5 text-accent-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-heading">Enable Notifications</p>
                            <p className="text-xs text-muted">Receive notifications from your hubs</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={async () => {
                            const newValue = !notificationsEnabled;
                            setNotificationsEnabled(newValue);
                            await supabase
                                .from('profiles')
                                .update({ notifications_enabled: newValue })
                                .eq('id', user?.id);
                        }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 ${
                            notificationsEnabled ? 'bg-accent-600' : 'bg-surface-active'
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                                notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>

                <p className="mt-4 text-xs text-muted">
                    You can configure notification preferences for each hub in the hub's settings.
                </p>
            </div>

            {/* Appearance Section */}
            <div className="bg-surface shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-heading mb-4">Appearance</h2>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-surface-hover">
                            {isDark ? (
                                <Moon className="h-5 w-5 text-subtle" />
                            ) : (
                                <Sun className="h-5 w-5 text-amber-500" />
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-heading">Dark Mode</p>
                            <p className="text-xs text-muted">Switch between light and dark themes</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={toggleDark}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 ${
                            isDark ? 'bg-accent-600' : 'bg-surface-active'
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                                isDark ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>
            </div>

            {/* Security Section */}
            <div className="bg-surface shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-heading mb-4">Security</h2>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Lock className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-heading">Password</p>
                            <p className="text-xs text-muted">Update your account password</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowPasswordForm(!showPasswordForm)}
                        className="text-sm font-medium text-accent-600 hover:text-accent-500"
                    >
                        {showPasswordForm ? 'Cancel' : 'Change Password'}
                    </button>
                </div>

                {showPasswordForm && (
                    <div className="mt-4 pt-4 border-t border-line space-y-4">
                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-body">
                                New Password
                            </label>
                            <input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-line-strong rounded-md shadow-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 sm:text-sm"
                                placeholder="Enter new password"
                            />
                        </div>
                        <div>
                            <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-body">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                id="confirmNewPassword"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-line-strong rounded-md shadow-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 sm:text-sm"
                                placeholder="Confirm new password"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleChangePassword}
                            disabled={changingPassword || !newPassword || !confirmNewPassword}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-accent-600 hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {changingPassword ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Lock className="h-4 w-4 mr-2" />
                            )}
                            Update Password
                        </button>
                    </div>
                )}
            </div>

            {/* Account Info Section */}
            <div className="bg-surface shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-heading mb-4">Account Information</h2>

                <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-line">
                        <span className="text-muted">User ID</span>
                        <span className="text-heading font-mono text-xs">{user?.id}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-line">
                        <span className="text-muted">Auth Email</span>
                        <span className="text-heading">{user?.email}</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-muted">Account Created</span>
                        <span className="text-heading">
                            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Feedback & Support */}
            <div className="bg-surface shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-heading mb-4">Feedback & Support</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-body mb-2">Type</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setFeedbackType('bug')}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                                    feedbackType === 'bug'
                                        ? 'bg-red-500/10 border-red-500/30 text-red-600'
                                        : 'bg-surface border-line-strong text-subtle hover:bg-surface-hover'
                                }`}
                            >
                                <Bug className="h-4 w-4" />
                                Bug Report
                            </button>
                            <button
                                type="button"
                                onClick={() => setFeedbackType('feature_request')}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                                    feedbackType === 'feature_request'
                                        ? 'bg-accent-500/10 border-accent-500/30 text-accent-600'
                                        : 'bg-surface border-line-strong text-subtle hover:bg-surface-hover'
                                }`}
                            >
                                <MessageSquarePlus className="h-4 w-4" />
                                Feature Request
                            </button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="feedbackTitle" className="block text-sm font-medium text-body">
                            Title
                        </label>
                        <input
                            type="text"
                            id="feedbackTitle"
                            value={feedbackTitle}
                            onChange={(e) => setFeedbackTitle(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-line-strong rounded-md shadow-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 sm:text-sm"
                            placeholder={feedbackType === 'bug' ? 'Brief description of the bug' : 'Your feature idea'}
                        />
                    </div>

                    <div>
                        <label htmlFor="feedbackDescription" className="block text-sm font-medium text-body">
                            Description
                        </label>
                        <textarea
                            id="feedbackDescription"
                            rows={4}
                            value={feedbackDescription}
                            onChange={(e) => setFeedbackDescription(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-line-strong rounded-md shadow-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 sm:text-sm"
                            placeholder={feedbackType === 'bug' ? 'What happened? What did you expect to happen?' : 'Describe the feature and how it would help you'}
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleSubmitFeedback}
                            disabled={submittingFeedback || !feedbackTitle.trim() || !feedbackDescription.trim()}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-accent-600 hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submittingFeedback ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4 mr-2" />
                            )}
                            Submit Feedback
                        </button>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-surface shadow rounded-lg p-6 border border-red-500/20">
                <h2 className="text-lg font-medium text-red-600 mb-4">Danger Zone</h2>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-500/10">
                            <Trash2 className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-heading">Delete Account</p>
                            <p className="text-xs text-muted">Permanently delete your account and all data</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                        className="text-sm font-medium text-red-600 hover:text-red-500"
                    >
                        {showDeleteConfirm ? 'Cancel' : 'Delete Account'}
                    </button>
                </div>

                {showDeleteConfirm && (
                    <div className="mt-4 pt-4 border-t border-red-500/20">
                        <div className="flex items-start gap-3 p-4 bg-red-500/10 rounded-lg mb-4">
                            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-red-600">
                                <p className="font-medium">This action cannot be undone.</p>
                                <p className="mt-1">This will permanently delete your account and remove all your data from our servers.</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="deleteConfirm" className="block text-sm font-medium text-body">
                                    Type <span className="font-bold">DELETE</span> to confirm
                                </label>
                                <input
                                    type="text"
                                    id="deleteConfirm"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-line-strong rounded-md shadow-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:text-sm"
                                    placeholder="DELETE"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                disabled={deleting || deleteConfirmText !== 'DELETE'}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {deleting ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4 mr-2" />
                                )}
                                Permanently Delete Account
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
