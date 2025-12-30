import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Link, Upload, Loader2, AlertCircle, Plus, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCreateResource, useCreateCategory, uploadResourceFile } from '../../hooks/useResources';
import type { HubResourceCategory } from '../../types';

interface CreateResourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onResourceCreated: () => void;
    hubId: string;
    categories: HubResourceCategory[];
    onCategoryCreated: () => void;
}

export function CreateResourceModal({
    isOpen,
    onClose,
    onResourceCreated,
    hubId,
    categories,
    onCategoryCreated
}: CreateResourceModalProps) {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [resourceType, setResourceType] = useState<'link' | 'file'>('link');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [category, setCategory] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);

    const { createResource, loading: creating } = useCreateResource();
    const { createCategory, loading: creatingCategory } = useCreateCategory();

    const resetForm = () => {
        setResourceType('link');
        setName('');
        setDescription('');
        setUrl('');
        setSelectedFile(null);
        setCategory('');
        setNewCategoryName('');
        setIsAddingCategory(false);
        setError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Max 50MB
            if (file.size > 50 * 1024 * 1024) {
                setError('File size must be less than 50MB');
                return;
            }
            setSelectedFile(file);
            // Auto-fill name if empty
            if (!name) {
                setName(file.name.replace(/\.[^/.]+$/, '')); // Remove extension
            }
            setError('');
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;

        const result = await createCategory(hubId, newCategoryName.trim());
        if (result) {
            setCategory(result.name);
            setNewCategoryName('');
            setIsAddingCategory(false);
            onCategoryCreated();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) {
            setError('Name is required');
            return;
        }

        if (resourceType === 'link' && !url.trim()) {
            setError('URL is required');
            return;
        }

        if (resourceType === 'file' && !selectedFile) {
            setError('Please select a file');
            return;
        }

        setUploading(true);

        try {
            let fileUrl = url;
            let fileType: string | undefined;
            let fileSize: number | undefined;

            if (resourceType === 'file' && selectedFile) {
                const uploadResult = await uploadResourceFile(selectedFile, hubId);
                if (!uploadResult) {
                    setError('Failed to upload file. Please try again.');
                    setUploading(false);
                    return;
                }
                fileUrl = uploadResult.url;
                fileType = uploadResult.fileType;
                fileSize = uploadResult.fileSize;
            }

            const result = await createResource({
                hub_id: hubId,
                name: name.trim(),
                description: description.trim() || undefined,
                url: fileUrl,
                type: resourceType,
                category: category || undefined,
                file_type: fileType,
                file_size: fileSize,
                created_by: user?.id
            });

            if (result) {
                onResourceCreated();
                handleClose();
            } else {
                setError('Failed to create resource. Please try again.');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        }

        setUploading(false);
    };

    const isSubmitting = creating || uploading;

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-slate-900/50 transition-opacity"
                    onClick={handleClose}
                />

                {/* Modal */}
                <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900">Add Resource</h2>
                        <button
                            onClick={handleClose}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-error-50 text-error-600 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Resource Type Toggle */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Resource Type
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setResourceType('link')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
                                        resourceType === 'link'
                                            ? 'bg-mint-100 border-mint-500 text-mint-700'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <Link className="w-4 h-4" />
                                    Link
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setResourceType('file')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
                                        resourceType === 'file'
                                            ? 'bg-mint-100 border-mint-500 text-mint-700'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <Upload className="w-4 h-4" />
                                    File Upload
                                </button>
                            </div>
                        </div>

                        {/* Link URL or File Upload */}
                        {resourceType === 'link' ? (
                            <div>
                                <label htmlFor="url" className="block text-sm font-medium text-slate-700 mb-1">
                                    URL *
                                </label>
                                <input
                                    id="url"
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://example.com/resource"
                                    className="input w-full"
                                    required
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    File *
                                </label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.mov,.webm"
                                />
                                {selectedFile ? (
                                    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                                        <FileText className="w-8 h-8 text-slate-400" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">
                                                {selectedFile.name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedFile(null);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                            className="p-1 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full p-6 border-2 border-dashed border-slate-200 rounded-lg hover:border-mint-500 hover:bg-mint-50/50 transition-colors"
                                    >
                                        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                                        <p className="text-sm text-slate-600">
                                            Click to upload or drag and drop
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            PDF, DOC, Images, Videos up to 50MB
                                        </p>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                                Name *
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., At Home Conditioning Guide"
                                className="input w-full"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                                Description <span className="text-slate-400">(optional)</span>
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add a brief description..."
                                rows={2}
                                className="input w-full resize-none"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1">
                                Category <span className="text-slate-400">(optional)</span>
                            </label>
                            {isAddingCategory ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="Category name"
                                        className="input flex-1"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddCategory();
                                            }
                                            if (e.key === 'Escape') {
                                                setIsAddingCategory(false);
                                                setNewCategoryName('');
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCategory}
                                        disabled={creatingCategory || !newCategoryName.trim()}
                                        className="btn-primary py-2"
                                    >
                                        {creatingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsAddingCategory(false);
                                            setNewCategoryName('');
                                        }}
                                        className="btn-ghost py-2"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <select
                                        id="category"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="input flex-1"
                                    >
                                        <option value="">No category</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.name}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingCategory(true)}
                                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                                        title="Add new category"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="btn-ghost"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {uploading ? 'Uploading...' : 'Creating...'}
                                    </>
                                ) : (
                                    'Add Resource'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
}
