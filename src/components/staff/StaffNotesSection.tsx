import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, Loader2, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { format, parseISO } from 'date-fns';

interface Note {
    id: string;
    content: string;
    created_by: string;
    created_at: string;
    creator?: {
        full_name: string;
    };
}

interface StaffNotesSectionProps {
    staffUserId: string;
}

export function StaffNotesSection({ staffUserId }: StaffNotesSectionProps) {
    const { hubId } = useParams();
    const { user } = useAuth();

    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [newNote, setNewNote] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchNotes();
    }, [staffUserId, hubId]);

    const fetchNotes = async () => {
        if (!hubId) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('staff_notes')
            .select(`
                *,
                creator:profiles!staff_notes_created_by_fkey(full_name)
            `)
            .eq('hub_id', hubId)
            .eq('staff_user_id', staffUserId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching notes:', error);
        } else {
            setNotes(data || []);
        }
        setLoading(false);
    };

    const handleAddNote = async () => {
        if (!hubId || !newNote.trim() || !user?.id) return;
        setSaving(true);

        const { error } = await supabase
            .from('staff_notes')
            .insert({
                hub_id: hubId,
                staff_user_id: staffUserId,
                content: newNote.trim(),
                created_by: user.id,
            });

        if (error) {
            console.error('Error adding note:', error);
        } else {
            await fetchNotes();
            setNewNote('');
        }
        setSaving(false);
    };

    const handleDeleteNote = async (id: string) => {
        const { error } = await supabase
            .from('staff_notes')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting note:', error);
        } else {
            setNotes(notes.filter(n => n.id !== id));
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium text-slate-800">Internal Notes</h3>
                <span className="text-xs text-slate-400">(Owner only)</span>
            </div>

            {/* Add Note Form */}
            <div className="space-y-2">
                <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                    placeholder="Add a private note about this staff member..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                <div className="flex justify-end">
                    <button
                        onClick={handleAddNote}
                        disabled={saving || !newNote.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4" />
                        )}
                        Add Note
                    </button>
                </div>
            </div>

            {/* Notes List */}
            {notes.length === 0 ? (
                <div className="text-center py-8">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No notes yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notes.map((note) => (
                        <div
                            key={note.id}
                            className="p-4 bg-amber-50 rounded-lg border border-amber-200"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                                    <p className="text-xs text-slate-400 mt-2">
                                        {note.creator?.full_name || 'Unknown'} - {format(parseISO(note.created_at), 'MMM d, yyyy h:mm a')}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
