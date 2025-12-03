import { useState, useMemo } from 'react';
import { Image, X, ChevronLeft, ChevronRight, Download, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Post, PostAttachment } from '../../types';

interface GroupPhotosProps {
    groupId: string;
    posts: Post[];
}

interface PhotoItem {
    url: string;
    postId: string;
    postContent: string;
    createdAt: string;
    authorName: string;
}

export function GroupPhotos({ posts }: GroupPhotosProps) {
    const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

    // Extract all photos from posts
    const photos = useMemo(() => {
        const allPhotos: PhotoItem[] = [];

        posts.forEach(post => {
            // Legacy image_url
            if (post.image_url) {
                allPhotos.push({
                    url: post.image_url,
                    postId: post.id,
                    postContent: post.content,
                    createdAt: post.created_at,
                    authorName: post.profiles?.full_name || 'Unknown'
                });
            }

            // New attachments format
            const attachments = (post.attachments || []) as PostAttachment[];
            attachments.forEach(att => {
                if (att.type === 'images') {
                    att.urls.forEach(url => {
                        allPhotos.push({
                            url,
                            postId: post.id,
                            postContent: post.content,
                            createdAt: post.created_at,
                            authorName: post.profiles?.full_name || 'Unknown'
                        });
                    });
                }
            });
        });

        // Sort by date (newest first)
        return allPhotos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [posts]);

    const handlePrevious = () => {
        if (selectedPhoto !== null && selectedPhoto > 0) {
            setSelectedPhoto(selectedPhoto - 1);
        }
    };

    const handleNext = () => {
        if (selectedPhoto !== null && selectedPhoto < photos.length - 1) {
            setSelectedPhoto(selectedPhoto + 1);
        }
    };

    const handleDownload = async (url: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `photo-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error('Error downloading:', err);
        }
    };

    if (photos.length === 0) {
        return (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto">
                    <Image className="h-8 w-8 text-purple-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">No photos yet</h3>
                <p className="mt-1 text-sm text-slate-500">Photos from posts will appear here</p>
            </div>
        );
    }

    return (
        <>
            {/* Photo Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {photos.map((photo, index) => (
                    <button
                        key={`${photo.postId}-${index}`}
                        onClick={() => setSelectedPhoto(index)}
                        className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 hover:ring-2 hover:ring-brand-500 hover:ring-offset-2 transition-all"
                    >
                        <img
                            src={photo.url}
                            alt=""
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-2 left-2 right-2">
                                <p className="text-white text-xs font-medium truncate">{photo.authorName}</p>
                                <p className="text-white/70 text-xs">
                                    {formatDistanceToNow(new Date(photo.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Lightbox */}
            {selectedPhoto !== null && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
                    {/* Close button */}
                    <button
                        onClick={() => setSelectedPhoto(null)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
                    >
                        <X className="h-6 w-6" />
                    </button>

                    {/* Download button */}
                    <button
                        onClick={() => handleDownload(photos[selectedPhoto].url)}
                        className="absolute top-4 right-16 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
                        title="Download"
                    >
                        <Download className="h-6 w-6" />
                    </button>

                    {/* Navigation */}
                    {selectedPhoto > 0 && (
                        <button
                            onClick={handlePrevious}
                            className="absolute left-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                        >
                            <ChevronLeft className="h-8 w-8" />
                        </button>
                    )}
                    {selectedPhoto < photos.length - 1 && (
                        <button
                            onClick={handleNext}
                            className="absolute right-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                        >
                            <ChevronRight className="h-8 w-8" />
                        </button>
                    )}

                    {/* Main image */}
                    <div className="max-w-5xl max-h-[85vh] px-16">
                        <img
                            src={photos[selectedPhoto].url}
                            alt=""
                            className="max-w-full max-h-[85vh] object-contain rounded-lg"
                        />
                    </div>

                    {/* Photo info */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                        <div className="max-w-5xl mx-auto">
                            <p className="text-white font-medium">{photos[selectedPhoto].authorName}</p>
                            <div className="flex items-center gap-2 text-white/70 text-sm mt-1">
                                <Calendar className="h-4 w-4" />
                                {formatDistanceToNow(new Date(photos[selectedPhoto].createdAt), { addSuffix: true })}
                            </div>
                            {photos[selectedPhoto].postContent && (
                                <p className="text-white/80 text-sm mt-2 line-clamp-2">{photos[selectedPhoto].postContent}</p>
                            )}
                        </div>
                    </div>

                    {/* Counter */}
                    <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm">
                        {selectedPhoto + 1} / {photos.length}
                    </div>

                    {/* Thumbnail strip */}
                    <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto">
                        {photos.slice(Math.max(0, selectedPhoto - 4), Math.min(photos.length, selectedPhoto + 5)).map((photo, idx) => {
                            const actualIndex = Math.max(0, selectedPhoto - 4) + idx;
                            return (
                                <button
                                    key={`thumb-${actualIndex}`}
                                    onClick={() => setSelectedPhoto(actualIndex)}
                                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all ${
                                        actualIndex === selectedPhoto
                                            ? 'ring-2 ring-white scale-110'
                                            : 'opacity-50 hover:opacity-80'
                                    }`}
                                >
                                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
}
