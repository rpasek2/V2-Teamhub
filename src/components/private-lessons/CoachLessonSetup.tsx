import { useState, useEffect } from 'react';
import { Loader2, Save, DollarSign, Clock, Users, BookOpen, Plus, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useHub } from '../../context/HubContext';
import type { CoachLessonProfile, LessonPackage } from '../../types';

// Event options for gymnastics
const EVENT_OPTIONS = [
    { value: 'vault', label: 'Vault' },
    { value: 'bars', label: 'Bars' },
    { value: 'beam', label: 'Beam' },
    { value: 'floor', label: 'Floor' },
    { value: 'pommel', label: 'Pommel Horse' },
    { value: 'rings', label: 'Rings' },
    { value: 'pbars', label: 'Parallel Bars' },
    { value: 'highbar', label: 'High Bar' },
    { value: 'all_around', label: 'All-Around' },
    { value: 'strength', label: 'Strength & Conditioning' },
    { value: 'flexibility', label: 'Flexibility' },
];

// Duration options in minutes
const DURATION_OPTIONS = [
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
];

interface PackageFormData {
    id?: string;
    name: string;
    duration_minutes: number;
    max_gymnasts: number;
    price: string;
    description: string;
    is_active: boolean;
}

const DEFAULT_PACKAGE: PackageFormData = {
    name: '',
    duration_minutes: 30,
    max_gymnasts: 1,
    price: '0',
    description: '',
    is_active: true,
};

interface CoachLessonSetupProps {
    onProfileUpdated?: () => void;
}

export function CoachLessonSetup({ onProfileUpdated }: CoachLessonSetupProps) {
    const { user } = useAuth();
    const { hub } = useHub();

    const [profile, setProfile] = useState<CoachLessonProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form state
    const [events, setEvents] = useState<string[]>([]);
    const [levels, setLevels] = useState<string[]>([]);
    const [bio, setBio] = useState('');
    const [isActive, setIsActive] = useState(true);

    // Package form state
    const [packageForms, setPackageForms] = useState<PackageFormData[]>([]);
    const [deletedPackageIds, setDeletedPackageIds] = useState<string[]>([]);

    // Get hub levels from settings
    const hubLevels = hub?.settings?.levels || [];

    useEffect(() => {
        if (hub && user) {
            fetchProfile();
        }
    }, [hub, user]);

    const fetchProfile = async () => {
        if (!hub || !user) return;

        setLoading(true);
        try {
            // Fetch profile
            const { data: profileData, error: profileError } = await supabase
                .from('coach_lesson_profiles')
                .select('*')
                .eq('hub_id', hub.id)
                .eq('coach_user_id', user.id)
                .maybeSingle();

            if (profileError) throw profileError;

            if (profileData) {
                setProfile(profileData);
                setEvents(profileData.events || []);
                setLevels(profileData.levels || []);
                setBio(profileData.bio || '');
                setIsActive(profileData.is_active);
            }

            // Fetch packages
            const { data: packagesData, error: packagesError } = await supabase
                .from('lesson_packages')
                .select('*')
                .eq('hub_id', hub.id)
                .eq('coach_user_id', user.id)
                .order('sort_order', { ascending: true });

            if (packagesError) throw packagesError;

            if (packagesData && packagesData.length > 0) {
                setPackageForms(
                    packagesData.map((pkg: LessonPackage) => ({
                        id: pkg.id,
                        name: pkg.name,
                        duration_minutes: pkg.duration_minutes,
                        max_gymnasts: pkg.max_gymnasts,
                        price: pkg.price.toString(),
                        description: pkg.description || '',
                        is_active: pkg.is_active,
                    }))
                );
            } else if (profileData) {
                // Migrate old single pricing to packages
                setPackageForms([{
                    name: `${profileData.lesson_duration_minutes} Min Private`,
                    duration_minutes: profileData.lesson_duration_minutes || 30,
                    max_gymnasts: profileData.max_gymnasts_per_slot || 1,
                    price: profileData.cost_per_lesson?.toString() || '0',
                    description: '',
                    is_active: true,
                }]);
            }
        } catch (err) {
            console.error('Error fetching coach lesson profile:', err);
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!hub || !user) return;

        if (events.length === 0) {
            setError('Please select at least one event you teach');
            return;
        }

        if (levels.length === 0) {
            setError('Please select at least one level you teach');
            return;
        }

        // Validate packages
        const activePackages = packageForms.filter(p => p.is_active);
        if (activePackages.length === 0 && isActive) {
            setError('Please add at least one active pricing package');
            return;
        }

        for (const pkg of packageForms) {
            if (!pkg.name.trim()) {
                setError('All packages must have a name');
                return;
            }
        }

        setError('');
        setSuccess('');
        setSaving(true);

        try {
            // Get default values from first active package for backwards compatibility
            const firstPackage = packageForms.find(p => p.is_active) || packageForms[0];
            const profileData = {
                hub_id: hub.id,
                coach_user_id: user.id,
                events,
                levels,
                cost_per_lesson: firstPackage ? parseFloat(firstPackage.price) || 0 : 0,
                max_gymnasts_per_slot: firstPackage ? firstPackage.max_gymnasts : 1,
                lesson_duration_minutes: firstPackage ? firstPackage.duration_minutes : 30,
                bio: bio.trim() || null,
                is_active: isActive,
                updated_at: new Date().toISOString(),
            };

            if (profile) {
                // Update existing profile
                const { error: updateError } = await supabase
                    .from('coach_lesson_profiles')
                    .update(profileData)
                    .eq('id', profile.id);

                if (updateError) throw updateError;
            } else {
                // Create new profile
                const { error: insertError } = await supabase
                    .from('coach_lesson_profiles')
                    .insert(profileData);

                if (insertError) throw insertError;
            }

            // Delete removed packages
            if (deletedPackageIds.length > 0) {
                const { error: deleteError } = await supabase
                    .from('lesson_packages')
                    .delete()
                    .in('id', deletedPackageIds);

                if (deleteError) throw deleteError;
            }

            // Upsert packages
            for (let i = 0; i < packageForms.length; i++) {
                const pkg = packageForms[i];
                const packageData = {
                    hub_id: hub.id,
                    coach_user_id: user.id,
                    name: pkg.name.trim(),
                    duration_minutes: pkg.duration_minutes,
                    max_gymnasts: pkg.max_gymnasts,
                    price: parseFloat(pkg.price) || 0,
                    description: pkg.description.trim() || null,
                    is_active: pkg.is_active,
                    sort_order: i,
                    updated_at: new Date().toISOString(),
                };

                if (pkg.id) {
                    // Update existing package
                    const { error: pkgError } = await supabase
                        .from('lesson_packages')
                        .update(packageData)
                        .eq('id', pkg.id);

                    if (pkgError) throw pkgError;
                } else {
                    // Create new package
                    const { error: pkgError } = await supabase
                        .from('lesson_packages')
                        .insert(packageData);

                    if (pkgError) throw pkgError;
                }
            }

            setSuccess('Profile saved successfully!');
            setDeletedPackageIds([]);
            fetchProfile();
            onProfileUpdated?.();
        } catch (err) {
            console.error('Error saving coach lesson profile:', err);
            setError('Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    const toggleEvent = (eventValue: string) => {
        setEvents(prev =>
            prev.includes(eventValue)
                ? prev.filter(e => e !== eventValue)
                : [...prev, eventValue]
        );
    };

    const toggleLevel = (level: string) => {
        setLevels(prev =>
            prev.includes(level)
                ? prev.filter(l => l !== level)
                : [...prev, level]
        );
    };

    const addPackage = () => {
        setPackageForms(prev => [...prev, { ...DEFAULT_PACKAGE }]);
    };

    const updatePackage = (index: number, field: keyof PackageFormData, value: string | number | boolean) => {
        setPackageForms(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const removePackage = (index: number) => {
        const pkg = packageForms[index];
        if (pkg.id) {
            setDeletedPackageIds(prev => [...prev, pkg.id!]);
        }
        setPackageForms(prev => prev.filter((_, i) => i !== index));
    };

    const getCapacityLabel = (max: number) => {
        if (max === 1) return 'Private (1 gymnast)';
        if (max === 2) return 'Semi-Private (2 gymnasts)';
        if (max <= 4) return `Small Group (${max} gymnasts)`;
        return `Group (${max} gymnasts)`;
    };

    if (loading) {
        return (
            <div className="card p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="card p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Lesson Setup</h2>
                        <p className="text-sm text-slate-500">Configure your private lesson offerings</p>
                    </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                        <p className="font-medium text-slate-900">Accept Bookings</p>
                        <p className="text-sm text-slate-500">
                            {isActive ? 'Parents can book lessons with you' : 'Your profile is hidden from parents'}
                        </p>
                    </div>
                    <button
                        onClick={() => setIsActive(!isActive)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            isActive ? 'bg-brand-500' : 'bg-slate-300'
                        }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isActive ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                    </button>
                </div>
            </div>

            {/* Events Section */}
            <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Events You Teach *</h3>
                <div className="flex flex-wrap gap-2">
                    {EVENT_OPTIONS.map(evt => (
                        <button
                            key={evt.value}
                            type="button"
                            onClick={() => toggleEvent(evt.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                events.includes(evt.value)
                                    ? 'bg-brand-100 text-brand-700 border-2 border-brand-300'
                                    : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
                            }`}
                        >
                            {evt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Levels Section */}
            <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Levels You Teach *</h3>
                {hubLevels.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {hubLevels.map(level => (
                            <button
                                key={level}
                                type="button"
                                onClick={() => toggleLevel(level)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    levels.includes(level)
                                        ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                                        : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
                                }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500">No levels configured in hub settings</p>
                )}
            </div>

            {/* Pricing Packages Section */}
            <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-700">Pricing Packages *</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Create different options for lesson durations, group sizes, and pricing
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={addPackage}
                        className="btn-secondary text-sm flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" />
                        Add Package
                    </button>
                </div>

                {packageForms.length === 0 ? (
                    <div className="bg-slate-50 rounded-lg p-6 text-center">
                        <DollarSign className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No pricing packages yet</p>
                        <p className="text-xs text-slate-400 mt-1">Add a package to set your lesson pricing</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {packageForms.map((pkg, index) => (
                            <div
                                key={pkg.id || `new-${index}`}
                                className={`border rounded-lg p-4 ${
                                    pkg.is_active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="text-slate-300 cursor-move mt-2">
                                        <GripVertical className="w-4 h-4" />
                                    </div>

                                    <div className="flex-1 space-y-3">
                                        {/* Package Name */}
                                        <div>
                                            <input
                                                type="text"
                                                value={pkg.name}
                                                onChange={(e) => updatePackage(index, 'name', e.target.value)}
                                                placeholder="Package name (e.g., '30 Min Private', '1 Hour Small Group')"
                                                className="input w-full font-medium"
                                            />
                                        </div>

                                        {/* Duration, Capacity, Price */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {/* Duration */}
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">
                                                    <Clock className="w-3 h-3 inline mr-1" />
                                                    Duration
                                                </label>
                                                <select
                                                    value={pkg.duration_minutes}
                                                    onChange={(e) => updatePackage(index, 'duration_minutes', parseInt(e.target.value))}
                                                    className="input w-full text-sm"
                                                >
                                                    {DURATION_OPTIONS.map(opt => (
                                                        <option key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Capacity */}
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">
                                                    <Users className="w-3 h-3 inline mr-1" />
                                                    Max Gymnasts
                                                </label>
                                                <select
                                                    value={pkg.max_gymnasts}
                                                    onChange={(e) => updatePackage(index, 'max_gymnasts', parseInt(e.target.value))}
                                                    className="input w-full text-sm"
                                                >
                                                    {[1, 2, 3, 4, 5, 6].map(n => (
                                                        <option key={n} value={n}>
                                                            {n} {n === 1 ? 'gymnast' : 'gymnasts'}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Price */}
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">
                                                    <DollarSign className="w-3 h-3 inline mr-1" />
                                                    Price
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="5"
                                                        value={pkg.price}
                                                        onChange={(e) => updatePackage(index, 'price', e.target.value)}
                                                        className="input w-full pl-7 text-sm"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description (optional) */}
                                        <div>
                                            <input
                                                type="text"
                                                value={pkg.description}
                                                onChange={(e) => updatePackage(index, 'description', e.target.value)}
                                                placeholder="Description (optional)"
                                                className="input w-full text-sm"
                                            />
                                        </div>

                                        {/* Summary */}
                                        <div className="text-xs text-slate-500">
                                            {getCapacityLabel(pkg.max_gymnasts)} • {DURATION_OPTIONS.find(d => d.value === pkg.duration_minutes)?.label || `${pkg.duration_minutes} min`} • ${parseFloat(pkg.price) || 0}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => updatePackage(index, 'is_active', !pkg.is_active)}
                                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                                                pkg.is_active
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}
                                        >
                                            {pkg.is_active ? 'Active' : 'Inactive'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removePackage(index)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bio Section */}
            <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Bio (Optional)</h3>
                <p className="text-xs text-slate-500 mb-3">
                    Tell parents about your experience and teaching style
                </p>
                <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="input w-full resize-none"
                    placeholder="Share your coaching background, certifications, and what makes your lessons special..."
                />
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                </div>
            )}
            {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    {success}
                </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary flex items-center gap-2"
                >
                    {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    Save Profile
                </button>
            </div>
        </div>
    );
}
