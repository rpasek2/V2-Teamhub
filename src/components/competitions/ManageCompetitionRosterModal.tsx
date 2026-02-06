import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Loader2, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';

interface ManageCompetitionRosterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRosterUpdated: () => void;
    competitionId: string;
    currentRosterIds: string[];
}

interface Gymnast {
    id: string;
    first_name: string;
    last_name: string;
    level: string | null;
    gymnast_id: string;
}

export function ManageCompetitionRosterModal({ isOpen, onClose, onRosterUpdated, competitionId, currentRosterIds }: ManageCompetitionRosterModalProps) {
    const { hub } = useHub();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allGymnasts, setAllGymnasts] = useState<Gymnast[]>([]);
    const [selectedGymnasts, setSelectedGymnasts] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen && hub) {
            fetchAllGymnasts();
            setSelectedGymnasts(currentRosterIds);
        }
    }, [isOpen, hub, currentRosterIds]);

    const fetchAllGymnasts = async () => {
        if (!hub) return;
        // Fetch from gymnast_profiles table instead of hub_members
        const { data, error } = await supabase
            .from('gymnast_profiles')
            .select('id, first_name, last_name, level, gymnast_id')
            .eq('hub_id', hub.id);

        if (error) {
            console.error('Error fetching gymnasts:', error);
        } else {
            // Sort by level (using hub settings order) then by last name
            const hubLevels = hub?.settings?.levels || [];
            const sortedData = (data || []).sort((a, b) => {
                const aLevelIndex = a.level ? hubLevels.indexOf(a.level) : 999;
                const bLevelIndex = b.level ? hubLevels.indexOf(b.level) : 999;
                const aLevelOrder = aLevelIndex === -1 ? 998 : aLevelIndex;
                const bLevelOrder = bLevelIndex === -1 ? 998 : bLevelIndex;

                if (aLevelOrder !== bLevelOrder) {
                    return aLevelOrder - bLevelOrder;
                }

                return (a.last_name || '').localeCompare(b.last_name || '');
            });
            setAllGymnasts(sortedData);
        }
    };

    const toggleGymnast = (gymnastId: string) => {
        setSelectedGymnasts(prev =>
            prev.includes(gymnastId)
                ? prev.filter(id => id !== gymnastId)
                : [...prev, gymnastId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const toAdd = selectedGymnasts.filter(id => !currentRosterIds.includes(id));
            const toRemove = currentRosterIds.filter(id => !selectedGymnasts.includes(id));

            if (toAdd.length > 0) {
                const { error: addError } = await supabase
                    .from('competition_gymnasts')
                    .insert(toAdd.map(gymnastProfileId => ({
                        competition_id: competitionId,
                        gymnast_profile_id: gymnastProfileId
                    })));
                if (addError) throw addError;
            }

            if (toRemove.length > 0) {
                const { error: removeError } = await supabase
                    .from('competition_gymnasts')
                    .delete()
                    .eq('competition_id', competitionId)
                    .in('gymnast_profile_id', toRemove);
                if (removeError) throw removeError;
            }

            onRosterUpdated();
            onClose();
        } catch (err: any) {
            console.error('Error updating roster:', err);
            setError(err.message || 'Failed to update roster');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                                    <button
                                        type="button"
                                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <X className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>

                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 w-full text-center sm:ml-4 sm:mt-0 sm:text-left">
                                        <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                                            Manage Competition Roster
                                        </Dialog.Title>
                                        <div className="mt-2">
                                            <form onSubmit={handleSubmit} className="space-y-4">
                                                {error && (
                                                    <div className="rounded-md bg-red-50 p-4">
                                                        <div className="flex">
                                                            <div className="flex-shrink-0">
                                                                <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                                                            </div>
                                                            <div className="ml-3">
                                                                <h3 className="text-sm font-medium text-red-800">{error}</h3>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div>
                                                    <label className="block text-sm font-medium leading-6 text-gray-900">
                                                        Select Gymnasts
                                                    </label>
                                                    <div className="mt-2 max-h-[400px] overflow-y-auto rounded-md border border-gray-200 p-2">
                                                        {allGymnasts.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {allGymnasts.map((gymnast) => (
                                                                    <div
                                                                        key={gymnast.id}
                                                                        className={`flex cursor-pointer items-center justify-between rounded-md p-2 hover:bg-gray-50 ${selectedGymnasts.includes(gymnast.id) ? 'bg-brand-50' : ''
                                                                            }`}
                                                                        onClick={() => toggleGymnast(gymnast.id)}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm text-gray-900">
                                                                                {gymnast.first_name} {gymnast.last_name}
                                                                            </span>
                                                                            {gymnast.level && (
                                                                                <span className="text-xs text-gray-500">
                                                                                    {gymnast.level}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {selectedGymnasts.includes(gymnast.id) && (
                                                                            <Check className="h-4 w-4 text-brand-600" />
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-500">No gymnasts found in hub.</p>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {selectedGymnasts.length} selected
                                                    </p>
                                                </div>

                                                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                                    <button
                                                        type="submit"
                                                        disabled={loading}
                                                        className="inline-flex w-full justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:ml-3 sm:w-auto disabled:opacity-50"
                                                    >
                                                        {loading ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                Saving...
                                                            </>
                                                        ) : (
                                                            'Save Roster'
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                                        onClick={onClose}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
