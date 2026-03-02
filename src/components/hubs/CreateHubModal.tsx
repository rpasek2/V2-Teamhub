import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trophy, Music, Megaphone, Waves, Swords, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { SportType, HubFeatureTab } from '../../types';
import { SPORT_CONFIGS, HUB_FEATURE_TABS } from '../../types';

// Sports that are currently enabled for hub creation
// Add more sports here as they are implemented
const ENABLED_SPORTS: SportType[] = ['gymnastics'];

const SPORT_ICONS = {
    Trophy,
    Music,
    Megaphone,
    Waves,
    Swords
};

interface CreateHubModalProps {
    isOpen: boolean;
    onClose: () => void;
    onHubCreated: () => void;
}

export function CreateHubModal({ isOpen, onClose, onHubCreated }: CreateHubModalProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState<'info' | 'features'>('info');
    const [name, setName] = useState('');
    const [sportType, setSportType] = useState<SportType>('gymnastics');
    const [enabledTabs, setEnabledTabs] = useState<Set<HubFeatureTab>>(new Set(HUB_FEATURE_TABS.map(t => t.id)));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleClose = () => {
        setStep('info');
        setName('');
        setEnabledTabs(new Set(HUB_FEATURE_TABS.map(t => t.id)));
        setError(null);
        onClose();
    };

    const handleToggleTab = (tabId: HubFeatureTab) => {
        setEnabledTabs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tabId)) {
                if (newSet.size > 1) {
                    newSet.delete(tabId);
                }
            } else {
                newSet.add(tabId);
            }
            return newSet;
        });
    };

    const handleNextStep = () => {
        if (!name.trim()) return;
        setStep('features');
    };

    const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
        e?.preventDefault();
        // Only allow submission from the features step via explicit button click
        // This prevents form submission when Enter is pressed in the input
        if (step !== 'features') {
            return;
        }
        if (!user || !name.trim()) return;

        // Check subscription tier — only paid users can create hubs
        const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_tier')
            .eq('id', user.id)
            .single();
        if (!profile || profile.subscription_tier === 'free') {
            setError('Hub creation is available on paid plans.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Create Organization
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .insert({
                    name: name,
                    owner_id: user.id,
                })
                .select()
                .single();

            if (orgError) throw orgError;

            // 2. Create Hub with enabled tabs in settings
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            const uniqueSlug = `${slug}-${Math.random().toString(36).substring(2, 7)}`; // Ensure uniqueness

            const { data: hub, error: hubError } = await supabase
                .from('hubs')
                .insert({
                    name: name,
                    slug: uniqueSlug,
                    organization_id: org.id,
                    sport_type: sportType,
                    settings: {
                        enabledTabs: Array.from(enabledTabs)
                    }
                })
                .select()
                .single();

            if (hubError) throw hubError;

            // 3. Add Creator as Owner
            const { error: memberError } = await supabase
                .from('hub_members')
                .insert({
                    hub_id: hub.id,
                    user_id: user.id,
                    role: 'owner',
                });

            if (memberError) throw memberError;

            onHubCreated();
            handleClose();
            navigate(`/hub/${hub.id}`);

        } catch (err: any) {
            console.error('Error creating hub:', err);
            setError(err.message || 'Failed to create hub');
        } finally {
            setLoading(false);
        }
    };

    const getPlaceholder = () => {
        const config = SPORT_CONFIGS[sportType];
        const examples: Record<SportType, string> = {
            gymnastics: 'Elite Gymnastics Academy',
            dance: 'Premier Dance Studio',
            cheer: 'All-Star Cheer Athletics',
            swimming: 'Aquatic Swim Club',
            martial_arts: 'Dragon Martial Arts'
        };
        return `e.g. ${examples[config.id]}`;
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={step === 'info' ? 'Create New Hub' : 'Select Features'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {step === 'info' ? (
                    <>
                        {/* Sport Type Selection */}
                        <div>
                            <label className="block text-sm font-medium text-body mb-2">
                                Sport Type
                            </label>
                            <div className={`grid gap-2 ${ENABLED_SPORTS.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
                                {ENABLED_SPORTS.map((sport) => {
                                    const config = SPORT_CONFIGS[sport];
                                    const IconComponent = SPORT_ICONS[config.icon as keyof typeof SPORT_ICONS];
                                    const isSelected = sportType === sport;

                                    // Use explicit color classes for Tailwind purging
                                    const getColorClasses = (color: string, selected: boolean) => {
                                        if (!selected) return {
                                            button: 'border-line hover:border-line-strong hover:bg-surface-hover',
                                            icon: 'text-faint',
                                            text: 'text-subtle'
                                        };

                                        const colorMap: Record<string, { button: string; icon: string; text: string }> = {
                                            purple: { button: 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/20', icon: 'text-purple-600', text: 'text-purple-600' },
                                            pink: { button: 'border-pink-500 bg-pink-500/10 ring-2 ring-pink-500/20', icon: 'text-pink-600', text: 'text-pink-600' },
                                            red: { button: 'border-red-500 bg-red-500/10 ring-2 ring-red-500/20', icon: 'text-red-600', text: 'text-red-600' },
                                            blue: { button: 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20', icon: 'text-blue-600', text: 'text-blue-600' },
                                            amber: { button: 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20', icon: 'text-amber-600', text: 'text-amber-600' }
                                        };
                                        return colorMap[color] || colorMap.purple;
                                    };

                                    const colors = getColorClasses(config.color, isSelected);

                                    return (
                                        <button
                                            key={sport}
                                            type="button"
                                            onClick={() => setSportType(sport)}
                                            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${colors.button}`}
                                        >
                                            <IconComponent className={`h-6 w-6 ${colors.icon}`} />
                                            <span className={`text-sm font-medium ${colors.text}`}>
                                                {config.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            {ENABLED_SPORTS.length === 1 && (
                                <p className="mt-2 text-xs text-muted">
                                    More sports coming soon!
                                </p>
                            )}
                            {ENABLED_SPORTS.length > 1 && (
                                <p className="mt-2 text-xs text-muted">
                                    Choose the sport type for your hub. This determines the features and terminology used.
                                </p>
                            )}
                        </div>

                        {/* Hub Name */}
                        <div>
                            <label htmlFor="hubName" className="block text-sm font-medium text-body">
                                Hub Name
                            </label>
                            <input
                                type="text"
                                id="hubName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (name.trim()) {
                                            handleNextStep();
                                        }
                                    }
                                }}
                                className="mt-1 block w-full rounded-md border border-line-strong px-3 py-2 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 sm:text-sm"
                                placeholder={getPlaceholder()}
                                required
                            />
                            <p className="mt-1 text-xs text-muted">
                                This is the name of your hub, like a program or team (e.g., JO Team, Boys Team, Competition Squad).
                            </p>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="rounded-md border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-body hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleNextStep}
                                disabled={!name.trim()}
                                className="inline-flex items-center rounded-md border border-transparent bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Feature Tab Selection */}
                        <div>
                            <p className="text-sm text-subtle mb-4">
                                Choose which feature tabs to enable for <span className="font-semibold">{name}</span>. You can change these later in Settings.
                            </p>

                            <div className="grid gap-2">
                                {HUB_FEATURE_TABS.map((tab) => {
                                    const isEnabled = enabledTabs.has(tab.id);
                                    const isLastEnabled = isEnabled && enabledTabs.size === 1;

                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => handleToggleTab(tab.id)}
                                            disabled={isLastEnabled}
                                            className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                                                isEnabled
                                                    ? 'border-accent-500 bg-accent-500/10'
                                                    : 'border-line bg-surface-alt opacity-60'
                                            } ${isLastEnabled ? 'cursor-not-allowed' : 'hover:border-accent-300'}`}
                                            title={isLastEnabled ? 'At least one feature must be enabled' : undefined}
                                        >
                                            <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                                isEnabled
                                                    ? 'bg-accent-600 border-accent-600'
                                                    : 'border-line-strong bg-surface'
                                            }`}>
                                                {isEnabled && (
                                                    <Check className="h-3.5 w-3.5 text-white" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium ${isEnabled ? 'text-heading' : 'text-muted'}`}>
                                                    {tab.label}
                                                </p>
                                                <p className="text-xs text-muted mt-0.5">
                                                    {tab.description}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <p className="mt-3 text-xs text-muted">
                                {enabledTabs.size} of {HUB_FEATURE_TABS.length} features selected
                            </p>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-between pt-4">
                            <button
                                type="button"
                                onClick={() => setStep('info')}
                                className="inline-flex items-center rounded-md border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-body hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="inline-flex items-center rounded-md border border-transparent bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Hub
                            </button>
                        </div>
                    </>
                )}
            </form>
        </Modal>
    );
}
