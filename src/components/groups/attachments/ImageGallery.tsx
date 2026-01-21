import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageGalleryProps {
    urls: string[];
}

export function ImageGallery({ urls }: ImageGalleryProps) {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    if (urls.length === 0) return null;

    const openLightbox = (index: number) => {
        setCurrentIndex(index);
        setLightboxOpen(true);
    };

    const closeLightbox = () => {
        setLightboxOpen(false);
    };

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? urls.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev === urls.length - 1 ? 0 : prev + 1));
    };

    // Grid layout based on number of images
    const getGridClass = () => {
        switch (urls.length) {
            case 1:
                return 'grid-cols-1';
            case 2:
                return 'grid-cols-2';
            case 3:
                return 'grid-cols-3';
            case 4:
                return 'grid-cols-2';
            default:
                return 'grid-cols-3';
        }
    };

    const getImageClass = (index: number) => {
        if (urls.length === 1) return 'aspect-video';
        if (urls.length === 3 && index === 0) return 'row-span-2 aspect-square';
        return 'aspect-square';
    };

    return (
        <>
            {/* Gallery Grid */}
            <div className={`grid ${getGridClass()} gap-1 rounded-xl overflow-hidden`}>
                {urls.slice(0, 6).map((url, index) => (
                    <button
                        key={url}
                        onClick={() => openLightbox(index)}
                        className={`relative ${getImageClass(index)} bg-slate-100 overflow-hidden group`}
                    >
                        <img
                            src={url}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        {/* Show count overlay on last visible image if there are more */}
                        {index === 5 && urls.length > 6 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <span className="text-white text-2xl font-bold">+{urls.length - 6}</span>
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Lightbox */}
            {lightboxOpen && (
                <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center">
                    {/* Close button */}
                    <button
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X className="h-8 w-8" />
                    </button>

                    {/* Image counter */}
                    <div className="absolute top-4 left-4 text-white/80 text-sm">
                        {currentIndex + 1} / {urls.length}
                    </div>

                    {/* Previous button */}
                    {urls.length > 1 && (
                        <button
                            onClick={goToPrevious}
                            className="absolute left-4 p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                        >
                            <ChevronLeft className="h-10 w-10" />
                        </button>
                    )}

                    {/* Current image */}
                    <img
                        src={urls[currentIndex]}
                        alt=""
                        className="max-w-[90vw] max-h-[90vh] object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Next button */}
                    {urls.length > 1 && (
                        <button
                            onClick={goToNext}
                            className="absolute right-4 p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                        >
                            <ChevronRight className="h-10 w-10" />
                        </button>
                    )}

                    {/* Thumbnails */}
                    {urls.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                            {urls.map((url, index) => (
                                <button
                                    key={url}
                                    onClick={() => setCurrentIndex(index)}
                                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                                        index === currentIndex
                                            ? 'border-white scale-110'
                                            : 'border-transparent opacity-60 hover:opacity-100'
                                    }`}
                                >
                                    <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
