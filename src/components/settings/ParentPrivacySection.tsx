import { useState, useEffect } from 'react';
import { Loader2, Save, Shield, Check, Mail, Phone, Award, Cake } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { useAuth } from '../../context/AuthContext';
import { CollapsibleSection } from '../ui/CollapsibleSection';

interface ParentPrivacySettingsData {
    show_email: boolean;
    show_phone: boolean;
    show_gymnast_level: boolean;
    show_gymnast_birthday: boolean;
}

const DEFAULT_PRIVACY_SETTINGS: ParentPrivacySettingsData = {
    show_email: false,
    show_phone: false,
    show_gymnast_level: true,
    show_gymnast_birthday: false,
};

export function ParentPrivacySection() {
    const { hub } = useHub();
    const { user } = useAuth();
    const [privacySettings, setPrivacySettings] = useState<ParentPrivacySettingsData>(DEFAULT_PRIVACY_SETTINGS);
    const [loadingPrivacy, setLoadingPrivacy] = useState(true);
    const [savingPrivacy, setSavingPrivacy] = useState(false);
    const [privacyMessage, setPrivacyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [hasExistingPrivacyRecord, setHasExistingPrivacyRecord] = useState(false);

    useEffect(() => {
        if (hub && user) {
            fetchPrivacySettings();
        }
    }, [hub, user]);

    const fetchPrivacySettings = async () => {
        if (!hub || !user) return;
        setLoadingPrivacy(true);

        try {
            const { data, error } = await supabase
                .from('parent_privacy_settings')
                .select('show_email, show_phone, show_gymnast_level, show_gymnast_birthday')
                .eq('hub_id', hub.id)
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setPrivacySettings({
                    show_email: data.show_email ?? false,
                    show_phone: data.show_phone ?? false,
                    show_gymnast_level: data.show_gymnast_level ?? true,
                    show_gymnast_birthday: data.show_gymnast_birthday ?? false,
                });
                setHasExistingPrivacyRecord(true);
            } else {
                setPrivacySettings(DEFAULT_PRIVACY_SETTINGS);
                setHasExistingPrivacyRecord(false);
            }
        } catch (error) {
            console.error('Error fetching privacy settings:', error);
        } finally {
            setLoadingPrivacy(false);
        }
    };

    const handleSavePrivacy = async () => {
        if (!hub || !user) return;
        setSavingPrivacy(true);
        setPrivacyMessage(null);

        try {
            if (hasExistingPrivacyRecord) {
                const { error } = await supabase
                    .from('parent_privacy_settings')
                    .update({
                        ...privacySettings,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('hub_id', hub.id)
                    .eq('user_id', user.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('parent_privacy_settings')
                    .insert({
                        hub_id: hub.id,
                        user_id: user.id,
                        ...privacySettings,
                    });

                if (error) throw error;
                setHasExistingPrivacyRecord(true);
            }

            setPrivacyMessage({ type: 'success', text: 'Privacy settings saved!' });
        } catch (error) {
            console.error('Error saving privacy settings:', error);
            setPrivacyMessage({ type: 'error', text: 'Failed to save settings.' });
        } finally {
            setSavingPrivacy(false);
        }
    };

    const handlePrivacyToggle = (key: keyof ParentPrivacySettingsData) => {
        setPrivacySettings(prev => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    return (
        <CollapsibleSection
            title="Privacy Settings"
            icon={Shield}
            defaultOpen={true}
            description="Control what other parents can see about you"
        >
            {loadingPrivacy ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
            ) : (
                <>
                    {privacyMessage && (
                        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
                            privacyMessage.type === 'success'
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                            {privacyMessage.type === 'success' && <Check className="h-4 w-4" />}
                            {privacyMessage.text}
                        </div>
                    )}

                    <p className="text-sm text-slate-600 mb-4">
                        Your gymnast's name and your name are always visible to other parents in this hub.
                        Choose what additional information you'd like to share:
                    </p>

                    <div className="space-y-3">
                        {/* Email Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Mail className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Email Address</p>
                                    <p className="text-xs text-slate-500">Allow other parents to see your email</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={privacySettings.show_email}
                                onClick={() => handlePrivacyToggle('show_email')}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                                    privacySettings.show_email ? 'bg-brand-600' : 'bg-slate-200'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        privacySettings.show_email ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>

                        {/* Phone Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <Phone className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Phone Number</p>
                                    <p className="text-xs text-slate-500">Allow other parents to see your phone number</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={privacySettings.show_phone}
                                onClick={() => handlePrivacyToggle('show_phone')}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                                    privacySettings.show_phone ? 'bg-brand-600' : 'bg-slate-200'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        privacySettings.show_phone ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>

                        {/* Level Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Award className="h-4 w-4 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Gymnast's Level</p>
                                    <p className="text-xs text-slate-500">Allow other parents to see your gymnast's level</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={privacySettings.show_gymnast_level}
                                onClick={() => handlePrivacyToggle('show_gymnast_level')}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                                    privacySettings.show_gymnast_level ? 'bg-brand-600' : 'bg-slate-200'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        privacySettings.show_gymnast_level ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>

                        {/* Birthday Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-pink-100 rounded-lg">
                                    <Cake className="h-4 w-4 text-pink-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Gymnast's Birthday</p>
                                    <p className="text-xs text-slate-500">Allow other parents to see your gymnast's birthday</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={privacySettings.show_gymnast_birthday}
                                onClick={() => handlePrivacyToggle('show_gymnast_birthday')}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                                    privacySettings.show_gymnast_birthday ? 'bg-brand-600' : 'bg-slate-200'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        privacySettings.show_gymnast_birthday ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="button"
                            onClick={handleSavePrivacy}
                            disabled={savingPrivacy}
                            className="btn-primary disabled:opacity-50"
                        >
                            {savingPrivacy ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Settings
                                </>
                            )}
                        </button>
                    </div>
                </>
            )}
        </CollapsibleSection>
    );
}
