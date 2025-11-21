import { useState, useEffect } from 'react';
import { Plus, Trash2, ExternalLink, FileText, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';

interface CompetitionDocument {
    id: string;
    competition_id: string;
    name: string;
    url: string;
    type: 'link' | 'file';
    created_at: string;
}

interface CompetitionDocumentsProps {
    competitionId: string;
}

export function CompetitionDocuments({ competitionId }: CompetitionDocumentsProps) {
    const { hub } = useHub();
    const [documents, setDocuments] = useState<CompetitionDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newDocName, setNewDocName] = useState('');
    const [newDocUrl, setNewDocUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [docType, setDocType] = useState<'link' | 'file'>('link');

    useEffect(() => {
        fetchDocuments();
    }, [competitionId]);

    const fetchDocuments = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('competition_documents')
            .select('*')
            .eq('competition_id', competitionId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching documents:', error);
            setError('Failed to load documents');
        } else {
            setDocuments(data as any || []);
        }
        setLoading(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
            // Auto-fill name if empty
            if (!newDocName) {
                setNewDocName(e.target.files[0].name);
            }
        }
    };

    const handleAddDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDocName) return;
        if (docType === 'link' && !newDocUrl) return;
        if (docType === 'file' && !selectedFile) return;

        setSubmitting(true);
        setError(null);

        try {
            let finalUrl = newDocUrl;

            if (docType === 'file' && selectedFile) {
                setUploading(true);
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                const filePath = `${competitionId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('Competitions')
                    .upload(filePath, selectedFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('Competitions')
                    .getPublicUrl(filePath);

                finalUrl = publicUrl;
                setUploading(false);
            }

            const { error } = await supabase
                .from('competition_documents')
                .insert({
                    competition_id: competitionId,
                    name: newDocName,
                    url: finalUrl,
                    type: docType
                });

            if (error) throw error;

            setNewDocName('');
            setNewDocUrl('');
            setSelectedFile(null);
            setDocType('link');
            setIsAdding(false);
            fetchDocuments();
        } catch (err: any) {
            console.error('Error adding document:', err);
            setError(err.message || 'Failed to add document');
            setUploading(false);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteDocument = async (doc: CompetitionDocument) => {
        if (!confirm('Are you sure you want to delete this document?')) return;

        try {
            // If it's a file, delete from storage first
            if (doc.type === 'file') {
                // Extract path from URL
                // Assuming URL format: .../storage/v1/object/public/Competitions/competitionId/filename
                const urlParts = doc.url.split('/Competitions/');
                if (urlParts.length > 1) {
                    const filePath = urlParts[1];
                    const { error: storageError } = await supabase.storage
                        .from('Competitions')
                        .remove([filePath]);

                    if (storageError) console.error('Error deleting file from storage:', storageError);
                }
            }

            const { error } = await supabase
                .from('competition_documents')
                .delete()
                .eq('id', doc.id);

            if (error) throw error;

            setDocuments(prev => prev.filter(d => d.id !== doc.id));
        } catch (err: any) {
            console.error('Error deleting document:', err);
            setError('Failed to delete document');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div>
            <div className="mb-4 flex justify-end">
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                >
                    <Plus className="-ml-0.5 mr-1.5 h-4 w-4 text-slate-400" />
                    {isAdding ? 'Cancel' : 'Add Document'}
                </button>
            </div>

            {error && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
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

            {isAdding && (
                <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <h3 className="mb-3 text-sm font-medium text-slate-900">Add New Document</h3>
                    <form onSubmit={handleAddDocument} className="space-y-3">
                        <div className="flex space-x-4 mb-3">
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    className="form-radio text-brand-600"
                                    name="docType"
                                    value="link"
                                    checked={docType === 'link'}
                                    onChange={() => setDocType('link')}
                                />
                                <span className="ml-2 text-sm text-slate-700">Link</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    className="form-radio text-brand-600"
                                    name="docType"
                                    value="file"
                                    checked={docType === 'file'}
                                    onChange={() => setDocType('file')}
                                />
                                <span className="ml-2 text-sm text-slate-700">File Upload</span>
                            </label>
                        </div>

                        <div>
                            <label htmlFor="doc-name" className="block text-xs font-medium text-slate-700">Name</label>
                            <input
                                type="text"
                                id="doc-name"
                                value={newDocName}
                                onChange={(e) => setNewDocName(e.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                                placeholder="e.g., Meet Packet"
                                required
                            />
                        </div>

                        {docType === 'link' ? (
                            <div>
                                <label htmlFor="doc-url" className="block text-xs font-medium text-slate-700">URL</label>
                                <input
                                    type="url"
                                    id="doc-url"
                                    value={newDocUrl}
                                    onChange={(e) => setNewDocUrl(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                                    placeholder="https://..."
                                    required
                                />
                            </div>
                        ) : (
                            <div>
                                <label htmlFor="doc-file" className="block text-xs font-medium text-slate-700">File</label>
                                <input
                                    type="file"
                                    id="doc-file"
                                    onChange={handleFileChange}
                                    className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                                    required
                                />
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting || uploading}
                                className="inline-flex justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Uploading...
                                    </>
                                ) : submitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    'Add Document'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                {documents.length > 0 ? (
                    <ul role="list" className="divide-y divide-slate-200">
                        {documents.map((doc) => (
                            <li key={doc.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                                <div className="flex items-center overflow-hidden">
                                    <div className="mr-3 flex-shrink-0">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                                            <FileText className="h-5 w-5 text-brand-600" />
                                        </div>
                                    </div>
                                    <div className="min-w-0 truncate">
                                        <p className="truncate text-sm font-medium text-slate-900">{doc.name}</p>
                                        <a
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center truncate text-xs text-slate-500 hover:text-brand-600"
                                        >
                                            {doc.url}
                                            <ExternalLink className="ml-1 h-3 w-3" />
                                        </a>
                                    </div>
                                </div>
                                <div className="ml-4 flex-shrink-0">
                                    <button
                                        onClick={() => handleDeleteDocument(doc)}
                                        className="rounded-md bg-white text-slate-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                                    >
                                        <span className="sr-only">Delete</span>
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="p-8 text-center">
                        <FileText className="mx-auto h-12 w-12 text-slate-300" />
                        <h3 className="mt-2 text-sm font-semibold text-slate-900">No documents</h3>
                        <p className="mt-1 text-sm text-slate-500">Get started by adding a link to this competition.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
