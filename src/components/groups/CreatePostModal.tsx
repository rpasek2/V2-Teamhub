import { useState, useRef } from 'react';
import { X, Loader2, Image as ImageIcon, Paperclip, BarChart3, ClipboardList, CalendarCheck, Send, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { PollCreator, SignupCreator, RsvpCreator } from './attachments';
import { validateFile, generateSecureFileName, FILE_LIMITS } from '../../utils/fileValidation';
import type { PostAttachment, FileAttachment, PollSettings, SignupSlot } from '../../types';

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    onPostCreated: () => void;
}

type ActiveCreator = 'poll' | 'signup' | 'rsvp' | null;

export function CreatePostModal({ isOpen, onClose, groupId, onPostCreated }: CreatePostModalProps) {
    const { user } = useHub();
    const [content, setContent] = useState('');
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [attachments, setAttachments] = useState<PostAttachment[]>([]);
    const [activeCreator, setActiveCreator] = useState<ActiveCreator>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const hasInteractiveAttachment = attachments.some(a =>
        a.type === 'poll' || a.type === 'signup' || a.type === 'rsvp'
    );

    const handleClose = () => {
        setContent('');
        setSelectedImages([]);
        setSelectedFiles([]);
        setAttachments([]);
        setActiveCreator(null);
        setError(null);
        onClose();
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const validImages: File[] = [];

        for (const file of files) {
            const validation = validateFile(file, 'postImage');
            if (validation.valid) {
                validImages.push(file);
            } else {
                setError(validation.error || 'Invalid image file');
            }
        }

        setSelectedImages(prev => [...prev, ...validImages].slice(0, 10)); // Max 10 images
        e.target.value = '';
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const validFiles: File[] = [];

        for (const file of files) {
            const validation = validateFile(file, 'postFile');
            if (validation.valid) {
                validFiles.push(file);
            } else {
                setError(validation.error || 'Invalid file');
            }
        }

        setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
        e.target.value = '';
    };

    const handleRemoveImage = (index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddPoll = (data: { question: string; options: string[]; settings: PollSettings }) => {
        setAttachments(prev => [...prev, { type: 'poll', ...data }]);
        setActiveCreator(null);
    };

    const handleAddSignup = (data: { title: string; description?: string; slots: SignupSlot[]; settings?: { allowUserSlots: boolean } }) => {
        setAttachments(prev => [...prev, { type: 'signup', ...data }]);
        setActiveCreator(null);
    };

    const handleAddRsvp = (data: { title: string; date?: string; time?: string; location?: string }) => {
        setAttachments(prev => [...prev, { type: 'rsvp', ...data }]);
        setActiveCreator(null);
    };

    const handleRemoveAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !content.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const finalAttachments: PostAttachment[] = [...attachments];

            // Upload images
            if (selectedImages.length > 0) {
                const imageUrls: string[] = [];
                for (const image of selectedImages) {
                    const fileName = generateSecureFileName(image.name);
                    const filePath = `posts/${groupId}/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('post-attachments')
                        .upload(filePath, image, {
                            cacheControl: '3600',
                            upsert: false
                        });

                    if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

                    const { data: { publicUrl } } = supabase.storage
                        .from('post-attachments')
                        .getPublicUrl(filePath);

                    imageUrls.push(publicUrl);
                }
                finalAttachments.push({ type: 'images', urls: imageUrls });
            }

            // Upload files
            if (selectedFiles.length > 0) {
                const fileAttachments: FileAttachment[] = [];
                for (const file of selectedFiles) {
                    const fileName = generateSecureFileName(file.name);
                    const filePath = `posts/${groupId}/files/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('post-attachments')
                        .upload(filePath, file, {
                            cacheControl: '3600',
                            upsert: false
                        });

                    if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);

                    const { data: { publicUrl } } = supabase.storage
                        .from('post-attachments')
                        .getPublicUrl(filePath);

                    fileAttachments.push({
                        url: publicUrl,
                        name: file.name,
                        size: file.size,
                        mimeType: file.type
                    });
                }
                finalAttachments.push({ type: 'files', files: fileAttachments });
            }

            // Create post
            const { error: postError } = await supabase
                .from('posts')
                .insert({
                    group_id: groupId,
                    user_id: user.id,
                    content,
                    attachments: finalAttachments,
                    is_pinned: false
                });

            if (postError) throw postError;

            onPostCreated();
            handleClose();
        } catch (err: any) {
            console.error('Error creating post:', err);
            setError(err.message || 'Failed to create post');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose}></div>

            {/* Modal Content */}
            <div className="relative z-[10000] w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center">
                            <Send className="h-5 w-5 text-brand-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Create Post</h3>
                            <p className="text-xs text-slate-500">Share with your group</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        onClick={handleClose}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {error && (
                        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
                            <p className="text-sm font-medium text-red-800">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Content */}
                        <div>
                            <textarea
                                rows={4}
                                className="block w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-400 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow resize-none"
                                placeholder="What's on your mind?"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                required
                            />
                        </div>

                        {/* Image Previews */}
                        {selectedImages.length > 0 && (
                            <div className="rounded-xl border border-slate-200 p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-slate-600">
                                        Images ({selectedImages.length}/10)
                                    </span>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {selectedImages.map((img) => (
                                        <div key={`${img.name}-${img.size}-${img.lastModified}`} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100">
                                            <img
                                                src={URL.createObjectURL(img)}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveImage(selectedImages.indexOf(img))}
                                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* File Previews */}
                        {selectedFiles.length > 0 && (
                            <div className="rounded-xl border border-slate-200 p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-slate-600">
                                        Files ({selectedFiles.length}/5)
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {selectedFiles.map((file) => (
                                        <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Paperclip className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                                <span className="text-sm text-slate-700 truncate">{file.name}</span>
                                                <span className="text-xs text-slate-400 flex-shrink-0">
                                                    {formatFileSize(file.size)}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveFile(selectedFiles.indexOf(file))}
                                                className="p-1 text-slate-400 hover:text-red-500"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Attachment Previews */}
                        {attachments.map((attachment, idx) => (
                            <div key={attachment.type === 'poll' ? `poll-${attachment.question}` : attachment.type === 'signup' ? `signup-${attachment.title}` : attachment.type === 'rsvp' ? `rsvp-${attachment.title}` : `attachment-${idx}`} className="relative">
                                {attachment.type === 'poll' && (
                                    <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <BarChart3 className="h-5 w-5 text-purple-600" />
                                                <div>
                                                    <p className="font-medium text-purple-900">Poll</p>
                                                    <p className="text-sm text-purple-700">{attachment.question}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAttachment(attachments.indexOf(attachment))}
                                                className="p-1 text-purple-400 hover:text-red-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="mt-2 space-y-1">
                                            {attachment.options.map((opt) => (
                                                <div key={opt} className="text-sm text-purple-600 pl-7">• {opt}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {attachment.type === 'signup' && (
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <ClipboardList className="h-5 w-5 text-emerald-600" />
                                                <div>
                                                    <p className="font-medium text-emerald-900">Sign-Up</p>
                                                    <p className="text-sm text-emerald-700">{attachment.title}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAttachment(attachments.indexOf(attachment))}
                                                className="p-1 text-emerald-400 hover:text-red-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="mt-2 space-y-1">
                                            {attachment.slots.map((slot) => (
                                                <div key={slot.name} className="text-sm text-emerald-600 pl-7">
                                                    • {slot.name} {slot.maxSignups && `(max ${slot.maxSignups})`}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {attachment.type === 'rsvp' && (
                                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <CalendarCheck className="h-5 w-5 text-blue-600" />
                                                <div>
                                                    <p className="font-medium text-blue-900">RSVP Request</p>
                                                    <p className="text-sm text-blue-700">{attachment.title}</p>
                                                    {(attachment.date || attachment.location) && (
                                                        <p className="text-xs text-blue-500 mt-1">
                                                            {attachment.date && new Date(attachment.date).toLocaleDateString()}
                                                            {attachment.time && ` at ${attachment.time}`}
                                                            {attachment.location && ` • ${attachment.location}`}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAttachment(attachments.indexOf(attachment))}
                                                className="p-1 text-blue-400 hover:text-red-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Active Creator */}
                        {activeCreator === 'poll' && (
                            <PollCreator
                                onSave={handleAddPoll}
                                onCancel={() => setActiveCreator(null)}
                            />
                        )}
                        {activeCreator === 'signup' && (
                            <SignupCreator
                                onSave={handleAddSignup}
                                onCancel={() => setActiveCreator(null)}
                            />
                        )}
                        {activeCreator === 'rsvp' && (
                            <RsvpCreator
                                onSave={handleAddRsvp}
                                onCancel={() => setActiveCreator(null)}
                            />
                        )}
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                    {/* Attachment Toolbar */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleImageSelect}
                            />
                            <button
                                type="button"
                                onClick={() => imageInputRef.current?.click()}
                                disabled={selectedImages.length >= 10 || loading}
                                className="p-2.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={`Add images (max ${FILE_LIMITS.postImage.maxSizeLabel} each)`}
                            >
                                <ImageIcon className="h-5 w-5" />
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={selectedFiles.length >= 5 || loading}
                                className="p-2.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={`Add files (max ${FILE_LIMITS.postFile.maxSizeLabel} each)`}
                            >
                                <Paperclip className="h-5 w-5" />
                            </button>

                            <div className="w-px h-6 bg-slate-200 mx-1" />

                            <button
                                type="button"
                                onClick={() => setActiveCreator('poll')}
                                disabled={hasInteractiveAttachment || activeCreator !== null || loading}
                                className="p-2.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Add poll"
                            >
                                <BarChart3 className="h-5 w-5" />
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveCreator('signup')}
                                disabled={hasInteractiveAttachment || activeCreator !== null || loading}
                                className="p-2.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Add sign-up"
                            >
                                <ClipboardList className="h-5 w-5" />
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveCreator('rsvp')}
                                disabled={hasInteractiveAttachment || activeCreator !== null || loading}
                                className="p-2.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Add RSVP"
                            >
                                <CalendarCheck className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                onClick={handleSubmit}
                                disabled={loading || !content.trim()}
                                className="inline-flex items-center px-5 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Posting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        Post
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
