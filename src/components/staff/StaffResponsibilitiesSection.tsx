import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, Loader2, ClipboardList } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Responsibility {
    id: string;
    responsibility: string;
    created_at: string;
}

interface StaffResponsibilitiesSectionProps {
    staffUserId: string;
    canEdit: boolean;
}

export function StaffResponsibilitiesSection({ staffUserId, canEdit }: StaffResponsibilitiesSectionProps) {
    const { hubId } = useParams();

    const [responsibilities, setResponsibilities] = useState<Responsibility[]>([]);
    const [loading, setLoading] = useState(true);
    const [newResponsibility, setNewResponsibility] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchResponsibilities();
    }, [staffUserId, hubId]);

    const fetchResponsibilities = async () => {
        if (!hubId) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('staff_responsibilities')
            .select('*')
            .eq('hub_id', hubId)
            .eq('staff_user_id', staffUserId)
            .order('created_at');

        if (error) {
            console.error('Error fetching responsibilities:', error);
        } else {
            setResponsibilities(data || []);
        }
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!hubId || !newResponsibility.trim()) return;
        setSaving(true);

        const { error } = await supabase
            .from('staff_responsibilities')
            .insert({
                hub_id: hubId,
                staff_user_id: staffUserId,
                responsibility: newResponsibility.trim(),
            });

        if (error) {
            console.error('Error adding responsibility:', error);
        } else {
            await fetchResponsibilities();
            setNewResponsibility('');
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase
            .from('staff_responsibilities')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting responsibility:', error);
        } else {
            setResponsibilities(responsibilities.filter(r => r.id !== id));
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-accent-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-heading">Responsibilities</h3>

            {/* Add Form */}
            {canEdit && (
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newResponsibility}
                        onChange={(e) => setNewResponsibility(e.target.value)}
                        placeholder="Add a responsibility..."
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && newResponsibility.trim()) {
                                handleAdd();
                            }
                        }}
                        className="flex-1 px-3 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    />
                    <button
                        onClick={handleAdd}
                        disabled={saving || !newResponsibility.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4" />
                        )}
                        Add
                    </button>
                </div>
            )}

            {/* Responsibilities List */}
            {responsibilities.length === 0 ? (
                <div className="text-center py-8">
                    <ClipboardList className="w-10 h-10 text-faint mx-auto mb-3" />
                    <p className="text-sm text-muted">
                        No responsibilities assigned yet.
                        {canEdit && ' Add some above.'}
                    </p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {responsibilities.map((item) => (
                        <li
                            key={item.id}
                            className="flex items-center justify-between p-3 bg-surface-alt rounded-lg border border-line"
                        >
                            <span className="text-sm text-body">{item.responsibility}</span>
                            {canEdit && (
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-1.5 text-faint hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
