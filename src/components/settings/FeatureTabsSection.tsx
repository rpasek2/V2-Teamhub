import { useState } from 'react';
import { Loader2, Save, LayoutGrid, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { getTabDependents } from '../../lib/permissions';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import type { HubFeatureTab } from '../../types';
import { HUB_FEATURE_TABS } from '../../types';

interface FeatureTabsSectionProps {
    enabledTabs: Set<HubFeatureTab>;
    setEnabledTabs: React.Dispatch<React.SetStateAction<Set<HubFeatureTab>>>;
}

export function FeatureTabsSection({ enabledTabs, setEnabledTabs }: FeatureTabsSectionProps) {
    const { hub, refreshHub } = useHub();
    const [savingTabs, setSavingTabs] = useState(false);
    const [tabsMessage, setTabsMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleToggleTab = (tabId: HubFeatureTab) => {
        setEnabledTabs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tabId)) {
                // Don't allow disabling all tabs - keep at least one
                if (newSet.size > 1) {
                    newSet.delete(tabId);
                    // Auto-disable dependent tabs (e.g., schedule OFF -> attendance OFF)
                    const dependents = getTabDependents(tabId);
                    dependents.forEach(dep => newSet.delete(dep as HubFeatureTab));
                }
            } else {
                newSet.add(tabId);
            }
            return newSet;
        });
    };

    const handleSaveTabs = async () => {
        if (!hub) return;
        setSavingTabs(true);
        setTabsMessage(null);

        try {
            // Validate: only allow known tab IDs
            const validTabIds = new Set(HUB_FEATURE_TABS.map(t => t.id));
            const validatedTabs = Array.from(enabledTabs).filter(t => validTabIds.has(t)) as HubFeatureTab[];

            const updatedSettings = {
                ...hub.settings,
                enabledTabs: validatedTabs
            };

            const { error } = await supabase
                .from('hubs')
                .update({ settings: updatedSettings })
                .eq('id', hub.id);

            if (error) throw error;

            await refreshHub();
            setTabsMessage({ type: 'success', text: 'Feature tabs saved successfully.' });
        } catch (err: unknown) {
            console.error('Error saving feature tabs:', err);
            setTabsMessage({ type: 'error', text: 'Failed to save feature tabs.' });
        } finally {
            setSavingTabs(false);
        }
    };

    return (
        <CollapsibleSection
            title="Feature Tabs"
            icon={LayoutGrid}
            description="Choose which features are available in your hub"
            actions={
                <button
                    onClick={handleSaveTabs}
                    disabled={savingTabs}
                    className="btn-primary disabled:opacity-50"
                >
                    {savingTabs ? (
                        <>
                            <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="-ml-1 mr-2 h-4 w-4" />
                            Save Tabs
                        </>
                    )}
                </button>
            }
        >
            {tabsMessage && (
                <div className={`mb-4 p-4 rounded-md ${tabsMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {tabsMessage.text}
                </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
                {HUB_FEATURE_TABS.map((tab) => {
                    const isEnabled = enabledTabs.has(tab.id);
                    const isLastEnabled = isEnabled && enabledTabs.size === 1;
                    // Check if this tab is force-disabled by a parent dependency
                    const isForceDisabled = tab.id === 'attendance' && !enabledTabs.has('schedule');

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleToggleTab(tab.id)}
                            disabled={isLastEnabled || isForceDisabled}
                            className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                                isEnabled && !isForceDisabled
                                    ? 'border-mint-500 bg-mint-50'
                                    : 'border-slate-200 bg-slate-50 opacity-60'
                            } ${isLastEnabled || isForceDisabled ? 'cursor-not-allowed' : 'hover:border-mint-400'}`}
                            title={isForceDisabled ? 'Requires Schedule to be enabled' : isLastEnabled ? 'At least one tab must be enabled' : undefined}
                        >
                            <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                isEnabled && !isForceDisabled
                                    ? 'bg-mint-500 border-mint-500'
                                    : 'border-slate-300 bg-white'
                            }`}>
                                {isEnabled && !isForceDisabled && (
                                    <Check className="h-3.5 w-3.5 text-white" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${isEnabled && !isForceDisabled ? 'text-slate-900' : 'text-slate-500'}`}>
                                    {tab.label}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {tab.description}
                                </p>
                                {isForceDisabled && (
                                    <p className="text-xs text-amber-600 mt-1">Requires Schedule to be enabled</p>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </CollapsibleSection>
    );
}
