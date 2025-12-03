import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';

interface Hub {
    id: string;
    name: string;
    role: string;
}

interface DeleteHubModalProps {
    isOpen: boolean;
    onClose: () => void;
    hub: Hub;
    onHubDeleted: () => void;
}

export function DeleteHubModal({ isOpen, onClose, hub, onHubDeleted }: DeleteHubModalProps) {
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const expectedText = hub.name;
    const canDelete = confirmText === expectedText;

    const handleDelete = async () => {
        if (!canDelete) return;

        setLoading(true);
        setError(null);

        try {
            // Delete the hub - cascades will handle related data
            const { error: deleteError } = await supabase
                .from('hubs')
                .delete()
                .eq('id', hub.id);

            if (deleteError) throw deleteError;

            onHubDeleted();
            onClose();
        } catch (err: any) {
            console.error('Error deleting hub:', err);
            setError(err.message || 'Failed to delete hub');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setConfirmText('');
        setError(null);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Delete Hub">
            <div className="space-y-4">
                {/* Warning banner */}
                <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                        <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">
                                This action cannot be undone
                            </h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>
                                    Deleting <strong>{hub.name}</strong> will permanently remove:
                                </p>
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                    <li>All members and their access</li>
                                    <li>All gymnast profiles and data</li>
                                    <li>All calendar events</li>
                                    <li>All competitions and results</li>
                                    <li>All groups and posts</li>
                                    <li>All messages and channels</li>
                                    <li>All invite codes</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Confirmation input */}
                <div>
                    <label htmlFor="confirmDelete" className="block text-sm font-medium text-slate-700">
                        To confirm, type <span className="font-semibold text-slate-900">"{expectedText}"</span> below:
                    </label>
                    <input
                        type="text"
                        id="confirmDelete"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 sm:text-sm"
                        placeholder={expectedText}
                        autoComplete="off"
                    />
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={!canDelete || loading}
                        className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete Hub Permanently
                    </button>
                </div>
            </div>
        </Modal>
    );
}
