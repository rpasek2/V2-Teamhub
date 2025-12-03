import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Loader2, ChevronLeft, ChevronRight, Phone,
    Trash2, Edit2, Tag, Clock, User, ImagePlus, DollarSign, AlertCircle, Check
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { MarketplaceItem, MarketplaceCategory, MarketplaceCondition } from '../../types';
import { MARKETPLACE_CATEGORIES, MARKETPLACE_CONDITIONS } from '../../types';

interface ItemDetailModalProps {
    item: MarketplaceItem;
    isOpen: boolean;
    onClose: () => void;
    canEdit: boolean;
    canDelete: boolean;
    onItemUpdated: () => void;
    onItemDeleted: () => void;
    currentHubId?: string;
}

export function ItemDetailModal({
    item,
    isOpen,
    onClose,
    canEdit,
    canDelete,
    onItemUpdated,
    onItemDeleted,
    currentHubId
}: ItemDetailModalProps) {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadingImages, setUploadingImages] = useState(false);

    // Determine if this item is from a linked hub
    const isFromLinkedHub = currentHubId && item.hub_id !== currentHubId;

    // Edit form state
    const [editTitle, setEditTitle] = useState(item.title);
    const [editDescription, setEditDescription] = useState(item.description);
    const [editPrice, setEditPrice] = useState(item.price.toString());
    const [editIsFree, setEditIsFree] = useState(item.price === 0);
    const [editCategory, setEditCategory] = useState<MarketplaceCategory>(item.category);
    const [editCondition, setEditCondition] = useState<MarketplaceCondition>(item.condition);
    const [editSize, setEditSize] = useState(item.size || '');
    const [editBrand, setEditBrand] = useState(item.brand || '');
    const [editPhone, setEditPhone] = useState(item.phone);
    const [editImages, setEditImages] = useState<string[]>(item.images);
    const [editStatus, setEditStatus] = useState(item.status);

    // Reset edit state when item changes
    useEffect(() => {
        setEditTitle(item.title);
        setEditDescription(item.description);
        setEditPrice(item.price.toString());
        setEditIsFree(item.price === 0);
        setEditCategory(item.category);
        setEditCondition(item.condition);
        setEditSize(item.size || '');
        setEditBrand(item.brand || '');
        setEditPhone(item.phone);
        setEditImages(item.images);
        setEditStatus(item.status);
        setCurrentImageIndex(0);
    }, [item]);

    const formatPrice = (price: number) => {
        if (price === 0) return 'Free';
        return `$${price.toFixed(2)}`;
    };

    const category = MARKETPLACE_CATEGORIES[item.category];
    const condition = MARKETPLACE_CONDITIONS[item.condition];

    const nextImage = () => {
        if (item.images.length > 1) {
            setCurrentImageIndex((prev) => (prev + 1) % item.images.length);
        }
    };

    const prevImage = () => {
        if (item.images.length > 1) {
            setCurrentImageIndex((prev) => (prev - 1 + item.images.length) % item.images.length);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !user) return;

        if (editImages.length + files.length > 5) {
            setError('Maximum 5 images allowed');
            return;
        }

        setUploadingImages(true);
        setError(null);

        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('marketplace-images')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('marketplace-images')
                    .getPublicUrl(fileName);

                return publicUrl;
            });

            const newUrls = await Promise.all(uploadPromises);
            setEditImages(prev => [...prev, ...newUrls]);
        } catch (err) {
            console.error('Error uploading images:', err);
            setError('Failed to upload images');
        } finally {
            setUploadingImages(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const removeEditImage = (index: number) => {
        setEditImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!editTitle.trim()) {
            setError('Title is required');
            return;
        }
        if (!editDescription.trim()) {
            setError('Description is required');
            return;
        }
        if (!editIsFree && (!editPrice || parseFloat(editPrice) < 0)) {
            setError('Please enter a valid price');
            return;
        }
        if (!editPhone.trim()) {
            setError('Phone number is required');
            return;
        }
        if (editImages.length === 0) {
            setError('Please add at least one image');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('marketplace_items')
                .update({
                    title: editTitle.trim(),
                    description: editDescription.trim(),
                    price: editIsFree ? 0 : parseFloat(editPrice),
                    category: editCategory,
                    condition: editCondition,
                    size: editSize.trim() || null,
                    brand: editBrand.trim() || null,
                    phone: editPhone.trim(),
                    images: editImages,
                    status: editStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', item.id);

            if (updateError) throw updateError;

            setIsEditing(false);
            onItemUpdated();
        } catch (err: unknown) {
            console.error('Error updating item:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to update item';
            setError(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        setError(null);

        try {
            const { error: deleteError } = await supabase
                .from('marketplace_items')
                .delete()
                .eq('id', item.id);

            if (deleteError) throw deleteError;

            onItemDeleted();
        } catch (err: unknown) {
            console.error('Error deleting item:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete item';
            setError(errorMessage);
        } finally {
            setDeleting(false);
        }
    };

    if (!isOpen) return null;

    const defaultImage = 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
            <rect width="400" height="400" fill="#f1f5f9"/>
            <text x="200" y="200" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="48" fill="#94a3b8">No Image</text>
        </svg>
    `);

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/50 transition-opacity"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative w-full max-w-4xl transform rounded-xl bg-white shadow-xl transition-all max-h-[90vh] overflow-hidden">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-600 hover:bg-white hover:text-slate-900 shadow-sm"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="grid md:grid-cols-2">
                        {/* Image Gallery */}
                        <div className="relative bg-slate-100 aspect-square md:aspect-auto md:min-h-[500px]">
                            <img
                                src={item.images[currentImageIndex] || defaultImage}
                                alt={item.title}
                                className="w-full h-full object-cover"
                            />

                            {/* Image Navigation */}
                            {item.images.length > 1 && (
                                <>
                                    <button
                                        onClick={prevImage}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-600 hover:bg-white hover:text-slate-900 shadow-sm"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={nextImage}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-600 hover:bg-white hover:text-slate-900 shadow-sm"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </button>

                                    {/* Image Dots */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                        {item.images.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setCurrentImageIndex(index)}
                                                className={`w-2 h-2 rounded-full transition-colors ${
                                                    index === currentImageIndex
                                                        ? 'bg-white'
                                                        : 'bg-white/50 hover:bg-white/75'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Status Badges */}
                            <div className="absolute top-4 left-4 flex flex-col gap-2">
                                {item.price === 0 && (
                                    <span className="px-3 py-1 rounded-full bg-green-500 text-white text-sm font-semibold">
                                        FREE
                                    </span>
                                )}
                                <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-slate-700 text-sm font-medium shadow-sm">
                                    {category.label}
                                </span>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="p-6 overflow-y-auto max-h-[90vh] md:max-h-none">
                            {isEditing ? (
                                /* Edit Mode */
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-slate-900">Edit Listing</h3>

                                    {/* Edit Images */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Photos
                                        </label>
                                        <div className="grid grid-cols-5 gap-2">
                                            {editImages.map((url, index) => (
                                                <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeEditImage(index)}
                                                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-white" />
                                                    </button>
                                                </div>
                                            ))}
                                            {editImages.length < 5 && (
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={uploadingImages}
                                                    className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-brand-400 hover:text-brand-500"
                                                >
                                                    {uploadingImages ? (
                                                        <Loader2 className="h-5 w-5 animate-spin" />
                                                    ) : (
                                                        <ImagePlus className="h-5 w-5" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                    </div>

                                    {/* Title */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                        <input
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                        <textarea
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            rows={3}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                        />
                                    </div>

                                    {/* Price */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Price</label>
                                        <div className="flex items-center gap-3">
                                            <div className="relative flex-1">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input
                                                    type="number"
                                                    value={editPrice}
                                                    onChange={(e) => setEditPrice(e.target.value)}
                                                    disabled={editIsFree}
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-slate-100"
                                                />
                                            </div>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editIsFree}
                                                    onChange={(e) => {
                                                        setEditIsFree(e.target.checked);
                                                        if (e.target.checked) setEditPrice('0');
                                                    }}
                                                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                />
                                                <span className="text-sm text-slate-700">Free</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Category & Condition */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                            <select
                                                value={editCategory}
                                                onChange={(e) => setEditCategory(e.target.value as MarketplaceCategory)}
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                            >
                                                {Object.entries(MARKETPLACE_CATEGORIES).map(([key, { label }]) => (
                                                    <option key={key} value={key}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Condition</label>
                                            <select
                                                value={editCondition}
                                                onChange={(e) => setEditCondition(e.target.value as MarketplaceCondition)}
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                            >
                                                {Object.entries(MARKETPLACE_CONDITIONS).map(([key, label]) => (
                                                    <option key={key} value={key}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Size & Brand */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Size</label>
                                            <input
                                                type="text"
                                                value={editSize}
                                                onChange={(e) => setEditSize(e.target.value)}
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                                            <input
                                                type="text"
                                                value={editBrand}
                                                onChange={(e) => setEditBrand(e.target.value)}
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            value={editPhone}
                                            onChange={(e) => setEditPhone(e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                        />
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                        <select
                                            value={editStatus}
                                            onChange={(e) => setEditStatus(e.target.value as 'active' | 'pending' | 'sold')}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                        >
                                            <option value="active">Active</option>
                                            <option value="pending">Pending</option>
                                            <option value="sold">Sold</option>
                                        </select>
                                    </div>

                                    {/* Error */}
                                    {error && (
                                        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-red-800">
                                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                            <p className="text-sm">{error}</p>
                                        </div>
                                    )}

                                    {/* Edit Actions */}
                                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEditing(false);
                                                setError(null);
                                            }}
                                            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                                        >
                                            {saving ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Check className="mr-2 h-4 w-4" />
                                            )}
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* View Mode */
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900">{item.title}</h2>
                                        <div className="mt-2 flex items-baseline gap-3">
                                            <span className={`text-3xl font-bold ${item.price === 0 ? 'text-green-600' : 'text-slate-900'}`}>
                                                {formatPrice(item.price)}
                                            </span>
                                            {item.size && (
                                                <span className="text-lg text-slate-500">Size {item.size}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Meta Info */}
                                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                                        <span className="inline-flex items-center gap-1.5">
                                            <Tag className="h-4 w-4 text-slate-400" />
                                            {condition}
                                        </span>
                                        {item.brand && (
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="text-slate-400">Brand:</span>
                                                {item.brand}
                                            </span>
                                        )}
                                        <span className="inline-flex items-center gap-1.5">
                                            <Clock className="h-4 w-4 text-slate-400" />
                                            Listed {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <h3 className="text-sm font-medium text-slate-700 mb-2">Description</h3>
                                        <p className="text-slate-600 whitespace-pre-wrap">{item.description}</p>
                                    </div>

                                    {/* Seller Info */}
                                    <div className="border-t border-slate-200 pt-6">
                                        <h3 className="text-sm font-medium text-slate-700 mb-3">Seller</h3>
                                        <div className="flex items-center gap-3">
                                            {item.profiles?.avatar_url ? (
                                                <img
                                                    src={item.profiles.avatar_url}
                                                    alt=""
                                                    className="h-10 w-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <User className="h-5 w-5 text-slate-400" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-slate-900">
                                                    {item.profiles?.full_name || 'Unknown'}
                                                </p>
                                                {isFromLinkedHub && item.hubs?.name && (
                                                    <p className="text-xs text-purple-600">
                                                        From {item.hubs.name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact Buttons */}
                                    {user?.id !== item.seller_id && (
                                        <div className="border-t border-slate-200 pt-6 space-y-3">
                                            <a
                                                href={`tel:${item.phone}`}
                                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
                                            >
                                                <Phone className="h-5 w-5" />
                                                Call {item.phone}
                                            </a>
                                            {isFromLinkedHub && (
                                                <p className="text-xs text-center text-slate-500">
                                                    This item is from a linked hub.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Error */}
                                    {error && (
                                        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-red-800">
                                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                            <p className="text-sm">{error}</p>
                                        </div>
                                    )}

                                    {/* Edit/Delete Actions */}
                                    {(canEdit || canDelete) && (
                                        <div className="border-t border-slate-200 pt-6">
                                            {showDeleteConfirm ? (
                                                <div className="bg-red-50 rounded-lg p-4">
                                                    <p className="text-sm text-red-800 mb-3">
                                                        Are you sure you want to delete this listing? This cannot be undone.
                                                    </p>
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() => setShowDeleteConfirm(false)}
                                                            className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={handleDelete}
                                                            disabled={deleting}
                                                            className="flex-1 inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                                        >
                                                            {deleting ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                'Delete'
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex gap-3">
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => setIsEditing(true)}
                                                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                            Edit
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => setShowDeleteConfirm(true)}
                                                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
