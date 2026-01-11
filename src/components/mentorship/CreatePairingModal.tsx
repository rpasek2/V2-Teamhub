import { useState, useEffect } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import type { GymnastProfile } from '../../types';

interface CreatePairingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
    hubId: string;
}

export function CreatePairingModal({ isOpen, onClose, onCreated, hubId }: CreatePairingModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [loadingGymnasts, setLoadingGymnasts] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [gymnasts, setGymnasts] = useState<GymnastProfile[]>([]);
    const [bigGymnastId, setBigGymnastId] = useState('');
    const [littleGymnastIds, setLittleGymnastIds] = useState<string[]>([]);
    const [notes, setNotes] = useState('');

    const [bigSearch, setBigSearch] = useState('');
    const [littleSearch, setLittleSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchGymnasts();
            resetForm();
        }
    }, [isOpen, hubId]);

    const resetForm = () => {
        setBigGymnastId('');
        setLittleGymnastIds([]);
        setNotes('');
        setBigSearch('');
        setLittleSearch('');
        setError(null);
    };

    const fetchGymnasts = async () => {
        setLoadingGymnasts(true);
        const { data, error } = await supabase
            .from('gymnast_profiles')
            .select('*')
            .eq('hub_id', hubId)
            .order('level', { ascending: true })
            .order('first_name', { ascending: true });

        if (error) {
            console.error('Error fetching gymnasts:', error);
        } else {
            setGymnasts(data || []);
        }
        setLoadingGymnasts(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bigGymnastId || littleGymnastIds.length === 0) {
            setError('Please select a Big and at least one Little gymnast');
            return;
        }

        if (littleGymnastIds.includes(bigGymnastId)) {
            setError('A gymnast cannot be paired with themselves');
            return;
        }

        setLoading(true);
        setError(null);

        // Insert one row per Little gymnast
        const pairingsToInsert = littleGymnastIds.map(littleId => ({
            hub_id: hubId,
            big_gymnast_id: bigGymnastId,
            little_gymnast_id: littleId,
            notes: notes || null,
            created_by: user?.id
        }));

        const { error: insertError } = await supabase
            .from('mentorship_pairs')
            .insert(pairingsToInsert);

        if (insertError) {
            if (insertError.code === '23505') {
                setError('One or more pairings already exist');
            } else {
                setError(insertError.message);
            }
            setLoading(false);
            return;
        }

        setLoading(false);
        onCreated();
    };

    const handleAddLittle = (gymnastId: string) => {
        if (gymnastId && !littleGymnastIds.includes(gymnastId) && gymnastId !== bigGymnastId) {
            setLittleGymnastIds(prev => [...prev, gymnastId]);
        }
    };

    const handleRemoveLittle = (gymnastId: string) => {
        setLittleGymnastIds(prev => prev.filter(id => id !== gymnastId));
    };

    // Filter gymnasts based on search
    const filterGymnasts = (search: string) => {
        if (!search) return gymnasts;
        const query = search.toLowerCase();
        return gymnasts.filter(g =>
            `${g.first_name} ${g.last_name}`.toLowerCase().includes(query) ||
            g.level.toLowerCase().includes(query)
        );
    };

    const filteredBigGymnasts = filterGymnasts(bigSearch);
    const filteredLittleGymnasts = filterGymnasts(littleSearch);

    const getGymnastDisplay = (g: GymnastProfile) =>
        `${g.first_name} ${g.last_name} (${g.level})`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Pairing">
            <form onSubmit={handleSubmit} className="space-y-4">
                {loadingGymnasts ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                    </div>
                ) : (
                    <>
                        {/* Big Gymnast Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Big (Mentor)
                            </label>
                            <div className="relative mb-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search gymnasts..."
                                    value={bigSearch}
                                    onChange={(e) => setBigSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                            </div>
                            <select
                                value={bigGymnastId}
                                onChange={(e) => setBigGymnastId(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                size={5}
                            >
                                <option value="">Select a gymnast...</option>
                                {filteredBigGymnasts.map((g) => (
                                    <option
                                        key={g.id}
                                        value={g.id}
                                        disabled={littleGymnastIds.includes(g.id)}
                                    >
                                        {getGymnastDisplay(g)}
                                    </option>
                                ))}
                            </select>
                            {bigGymnastId && (
                                <p className="mt-1 text-sm text-brand-600">
                                    Selected: {getGymnastDisplay(gymnasts.find(g => g.id === bigGymnastId)!)}
                                </p>
                            )}
                        </div>

                        {/* Little Gymnast Selection - Multi-select */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Little(s) (Mentee) - Select one or more
                            </label>

                            {/* Selected Littles as chips */}
                            {littleGymnastIds.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {littleGymnastIds.map(id => {
                                        const gymnast = gymnasts.find(g => g.id === id);
                                        if (!gymnast) return null;
                                        return (
                                            <span
                                                key={id}
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-sm"
                                            >
                                                {gymnast.first_name} {gymnast.last_name}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveLittle(id)}
                                                    className="hover:bg-pink-200 rounded-full p-0.5"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="relative mb-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search gymnasts..."
                                    value={littleSearch}
                                    onChange={(e) => setLittleSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                            </div>
                            <select
                                value=""
                                onChange={(e) => {
                                    handleAddLittle(e.target.value);
                                    e.target.value = '';
                                }}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                size={5}
                            >
                                <option value="">Click to add a gymnast...</option>
                                {filteredLittleGymnasts
                                    .filter(g => g.id !== bigGymnastId && !littleGymnastIds.includes(g.id))
                                    .map((g) => (
                                        <option key={g.id} value={g.id}>
                                            {getGymnastDisplay(g)}
                                        </option>
                                    ))}
                            </select>
                            <p className="mt-1 text-xs text-slate-500">
                                {littleGymnastIds.length} gymnast{littleGymnastIds.length !== 1 ? 's' : ''} selected
                            </p>
                        </div>

                        {/* Notes */}
                        <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
                                Notes (Optional)
                            </label>
                            <textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                placeholder="Any notes about this pairing..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !bigGymnastId || littleGymnastIds.length === 0}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Create Pairing{littleGymnastIds.length > 1 ? 's' : ''}
                            </button>
                        </div>
                    </>
                )}
            </form>
        </Modal>
    );
}
