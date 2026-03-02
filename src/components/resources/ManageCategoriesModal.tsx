import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Plus, Loader2, Tag } from 'lucide-react';
import { useCreateCategory, useDeleteCategory } from '../../hooks/useResources';
import type { HubResourceCategory } from '../../types';

interface ManageCategoriesModalProps {
    isOpen: boolean;
    onClose: () => void;
    hubId: string;
    categories: HubResourceCategory[];
    onCategoriesChanged: () => void;
}

export function ManageCategoriesModal({
    isOpen,
    onClose,
    hubId,
    categories,
    onCategoriesChanged
}: ManageCategoriesModalProps) {
    const [newCategoryName, setNewCategoryName] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const { createCategory, loading: creating } = useCreateCategory();
    const { deleteCategory, loading: deleting } = useDeleteCategory();

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;

        const result = await createCategory(hubId, newCategoryName.trim());
        if (result) {
            setNewCategoryName('');
            onCategoriesChanged();
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Delete this category? Resources in this category will be uncategorized.')) return;

        setDeletingId(id);
        const success = await deleteCategory(id);
        if (success) {
            onCategoriesChanged();
        }
        setDeletingId(null);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/50 transition-opacity"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative w-full max-w-md bg-surface rounded-xl shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-line">
                        <h2 className="text-lg font-semibold text-heading">Manage Categories</h2>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-md text-faint hover:text-subtle hover:bg-surface-hover transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-4">
                        {/* Add New Category */}
                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="New category name"
                                className="input flex-1"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddCategory();
                                    }
                                }}
                            />
                            <button
                                onClick={handleAddCategory}
                                disabled={creating || !newCategoryName.trim()}
                                className="btn-primary"
                            >
                                {creating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        Add
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Categories List */}
                        {categories.length > 0 ? (
                            <div className="space-y-2">
                                {categories.map((category) => (
                                    <div
                                        key={category.id}
                                        className="flex items-center justify-between p-3 rounded-lg border border-line bg-surface-alt"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Tag className="w-4 h-4 text-faint" />
                                            <span className="text-sm font-medium text-body">
                                                {category.name}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteCategory(category.id)}
                                            disabled={deleting && deletingId === category.id}
                                            className="p-1.5 rounded-md text-faint hover:text-error-600 hover:bg-error-50 transition-colors disabled:opacity-50"
                                            title="Delete category"
                                        >
                                            {deleting && deletingId === category.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-hover flex items-center justify-center">
                                    <Tag className="w-6 h-6 text-faint" />
                                </div>
                                <p className="text-muted text-sm">No categories yet</p>
                                <p className="text-faint text-xs mt-1">
                                    Add categories to organize your resources
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end p-4 border-t border-line">
                        <button onClick={onClose} className="btn-ghost">
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
