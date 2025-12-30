import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, ImagePlus, Trash2, DollarSign, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useHub } from '../../context/HubContext';
import { validateFile, generateSecureFileName, FILE_LIMITS } from '../../utils/fileValidation';
import type { MarketplaceCategory, MarketplaceCondition } from '../../types';
import { MARKETPLACE_CATEGORIES, MARKETPLACE_CONDITIONS } from '../../types';

interface CreateItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onItemCreated: () => void;
}

export function CreateItemModal({ isOpen, onClose, onItemCreated }: CreateItemModalProps) {
    const { user } = useAuth();
    const { hub } = useHub();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadingImages, setUploadingImages] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [isFree, setIsFree] = useState(false);
    const [category, setCategory] = useState<MarketplaceCategory>('leos');
    const [condition, setCondition] = useState<MarketplaceCondition>('good');
    const [size, setSize] = useState('');
    const [brand, setBrand] = useState('');
    const [phone, setPhone] = useState('');
    const [images, setImages] = useState<string[]>([]);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setPrice('');
        setIsFree(false);
        setCategory('leos');
        setCondition('good');
        setSize('');
        setBrand('');
        setPhone('');
        setImages([]);
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !user) return;

        if (images.length + files.length > 5) {
            setError('Maximum 5 images allowed');
            return;
        }

        // Validate all files first
        const validFiles: File[] = [];
        for (const file of Array.from(files)) {
            const validation = validateFile(file, 'marketplaceImage');
            if (validation.valid) {
                validFiles.push(file);
            } else {
                setError(validation.error || 'Invalid image file');
                return;
            }
        }

        setUploadingImages(true);
        setError(null);

        try {
            const uploadPromises = validFiles.map(async (file) => {
                const fileName = `${user.id}/${generateSecureFileName(file.name)}`;

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
            setImages(prev => [...prev, ...newUrls]);
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

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !hub) return;

        // Validation
        if (!title.trim()) {
            setError('Title is required');
            return;
        }
        if (!description.trim()) {
            setError('Description is required');
            return;
        }
        if (!isFree && (!price || parseFloat(price) < 0)) {
            setError('Please enter a valid price');
            return;
        }
        if (!phone.trim()) {
            setError('Phone number is required for contact');
            return;
        }
        if (images.length === 0) {
            setError('Please add at least one image');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const { error: insertError } = await supabase
                .from('marketplace_items')
                .insert({
                    hub_id: hub.id,
                    seller_id: user.id,
                    title: title.trim(),
                    description: description.trim(),
                    price: isFree ? 0 : parseFloat(price),
                    category,
                    condition,
                    size: size.trim() || null,
                    brand: brand.trim() || null,
                    phone: phone.trim(),
                    images,
                    status: 'active'
                });

            if (insertError) throw insertError;

            onItemCreated();
            handleClose();
        } catch (err: unknown) {
            console.error('Error creating item:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to create listing';
            setError(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/50 transition-opacity"
                    onClick={handleClose}
                />

                {/* Modal */}
                <div className="relative w-full max-w-2xl transform rounded-xl bg-white shadow-xl transition-all">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <h2 className="text-lg font-semibold text-slate-900">List an Item</h2>
                        <button
                            onClick={handleClose}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Images */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Photos <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-5 gap-3">
                                {images.map((url, index) => (
                                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="h-5 w-5 text-white" />
                                        </button>
                                        {index === 0 && (
                                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-brand-600 text-white text-xs font-medium">
                                                Main
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {images.length < 5 && (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingImages}
                                        className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors disabled:opacity-50"
                                    >
                                        {uploadingImages ? (
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                        ) : (
                                            <>
                                                <ImagePlus className="h-6 w-6" />
                                                <span className="text-xs mt-1">Add</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                                Add up to 5 photos (max {FILE_LIMITS.marketplaceImage.maxSizeLabel} each). First photo will be the main image.
                            </p>
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., GK Elite Pink Competition Leo"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                maxLength={100}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe your item, include any details about condition, sizing, etc."
                                rows={4}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            />
                        </div>

                        {/* Price */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Price <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-4">
                                <div className="relative flex-1">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        disabled={isFree}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-slate-100 disabled:text-slate-400"
                                    />
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isFree}
                                        onChange={(e) => {
                                            setIsFree(e.target.checked);
                                            if (e.target.checked) setPrice('');
                                        }}
                                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    <span className="text-sm text-slate-700">Free item</span>
                                </label>
                            </div>
                        </div>

                        {/* Category & Condition */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Category <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value as MarketplaceCategory)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                >
                                    {Object.entries(MARKETPLACE_CATEGORIES).map(([key, { label }]) => (
                                        <option key={key} value={key}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Condition <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={condition}
                                    onChange={(e) => setCondition(e.target.value as MarketplaceCondition)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                >
                                    {Object.entries(MARKETPLACE_CONDITIONS).map(([key, label]) => (
                                        <option key={key} value={key}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Size & Brand */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Size
                                </label>
                                <input
                                    type="text"
                                    value={size}
                                    onChange={(e) => setSize(e.target.value)}
                                    placeholder="e.g., CM, AS, 4-6"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Brand
                                </label>
                                <input
                                    type="text"
                                    value={brand}
                                    onChange={(e) => setBrand(e.target.value)}
                                    placeholder="e.g., GK Elite, Destira"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Phone Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="(555) 123-4567"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            />
                            <p className="mt-1 text-xs text-slate-500">
                                Buyers outside your hub will see this number to contact you.
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-red-800">
                                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                            >
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                List Item
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
}
