import React, { useState } from 'react';
import { X, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    onPostCreated: () => void;
}

export function CreatePostModal({ isOpen, onClose, groupId, onPostCreated }: CreatePostModalProps) {
    const { user } = useHub();
    const [content, setContent] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !content.trim()) return;

        setLoading(true);
        setError(null);

        try {
            let imageUrl = null;

            // Upload image if selected
            if (selectedImage) {
                const fileExt = selectedImage.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                const filePath = `posts/${groupId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('Competitions')
                    .upload(filePath, selectedImage);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('Competitions')
                    .getPublicUrl(filePath);

                imageUrl = publicUrl;
            }

            const { error: postError } = await supabase
                .from('posts')
                .insert({
                    group_id: groupId,
                    user_id: user.id,
                    content,
                    image_url: imageUrl
                });

            if (postError) throw postError;

            onPostCreated();
            onClose();
            setContent('');
            setSelectedImage(null);
        } catch (err: any) {
            console.error('Error creating post:', err);
            setError(err.message || 'Failed to create post');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>

            {/* Modal Content */}
            <div className="relative z-[10000] w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                <div className="absolute top-4 right-4">
                    <button
                        type="button"
                        className="rounded-md text-gray-400 hover:text-gray-500"
                        onClick={onClose}
                    >
                        <span className="sr-only">Close</span>
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div>
                    <h3 className="text-lg font-medium text-gray-900" id="modal-title">
                        Create Post
                    </h3>
                </div>

                {error && (
                    <div className="mt-4 rounded-md bg-red-50 p-4">
                        <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <textarea
                            rows={4}
                            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            placeholder="What's on your mind?"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Add Image (Optional)</label>
                        <div className="mt-1 flex items-center gap-2">
                            <label
                                htmlFor="file-upload"
                                className="relative cursor-pointer rounded-md border border-gray-300 px-3 py-2 shadow-sm hover:bg-gray-50"
                            >
                                <div className="flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5 text-gray-400" />
                                    <span className="text-sm text-gray-600">
                                        {selectedImage ? selectedImage.name : 'Upload a file'}
                                    </span>
                                </div>
                                <input
                                    id="file-upload"
                                    name="file-upload"
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setSelectedImage(e.target.files[0]);
                                        }
                                    }}
                                />
                            </label>
                            {selectedImage && (
                                <button
                                    type="button"
                                    className="text-sm text-red-600 hover:text-red-500"
                                    onClick={() => setSelectedImage(null)}
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !content.trim()}
                            className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Posting...
                                </>
                            ) : (
                                'Post'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
