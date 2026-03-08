import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { PostCard } from './PostCard';
import type { Post } from '../../types';

interface PostDetailModalProps {
    post: Post;
    onClose: () => void;
    onDelete: () => void;
    onPinToggle?: (postId: string, isPinned: boolean) => void;
    currentUserId: string;
    isAdmin: boolean;
}

export function PostDetailModal({ post, onClose, onDelete, onPinToggle, currentUserId, isAdmin }: PostDetailModalProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl mx-4 my-8 max-h-[calc(100vh-4rem)] flex flex-col bg-surface rounded-2xl shadow-2xl border border-line overflow-hidden z-10">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-surface/80 backdrop-blur text-muted hover:text-heading hover:bg-surface-hover transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1">
                    <PostCard
                        post={post}
                        onDelete={onDelete}
                        onPinToggle={onPinToggle}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                        compact={false}
                    />
                </div>
            </div>
        </div>,
        document.body
    );
}
