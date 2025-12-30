import { ExternalLink, FileText, Image, Video, File, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { HubResource } from '../../types';

interface ResourceCardProps {
    resource: HubResource;
    onDelete?: () => void;
    canDelete?: boolean;
}

export function ResourceCard({ resource, onDelete, canDelete = false }: ResourceCardProps) {
    const getIcon = () => {
        if (resource.type === 'link') {
            return <ExternalLink className="w-6 h-6" />;
        }

        // File type icons
        const fileType = resource.file_type?.toLowerCase();
        if (fileType === 'pdf') {
            return <FileText className="w-6 h-6" />;
        }
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileType || '')) {
            return <Image className="w-6 h-6" />;
        }
        if (['mp4', 'mov', 'webm', 'avi'].includes(fileType || '')) {
            return <Video className="w-6 h-6" />;
        }
        return <File className="w-6 h-6" />;
    };

    const getIconBgColor = () => {
        if (resource.type === 'link') {
            return 'bg-blue-100 text-blue-600';
        }
        const fileType = resource.file_type?.toLowerCase();
        if (fileType === 'pdf') {
            return 'bg-red-100 text-red-600';
        }
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileType || '')) {
            return 'bg-purple-100 text-purple-600';
        }
        if (['mp4', 'mov', 'webm', 'avi'].includes(fileType || '')) {
            return 'bg-pink-100 text-pink-600';
        }
        return 'bg-slate-100 text-slate-600';
    };

    const formatFileSize = (bytes: number | null): string => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleClick = () => {
        window.open(resource.url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="group relative rounded-lg border border-slate-200 bg-white p-4 hover:border-mint-500/50 hover:shadow-md transition-all">
            {/* Delete button */}
            {canDelete && onDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 bg-slate-100 text-slate-500 hover:bg-error-100 hover:text-error-600 transition-all"
                    title="Delete resource"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}

            {/* Clickable area */}
            <div
                onClick={handleClick}
                className="cursor-pointer"
            >
                {/* Icon + Title */}
                <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getIconBgColor()}`}>
                        {getIcon()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 line-clamp-2 group-hover:text-mint-600 transition-colors">
                            {resource.name}
                        </h3>
                        {resource.file_type && resource.type === 'file' && (
                            <p className="text-xs text-slate-400 mt-0.5">
                                {resource.file_type.toUpperCase()}
                                {resource.file_size ? ` • ${formatFileSize(resource.file_size)}` : ''}
                            </p>
                        )}
                    </div>
                </div>

                {/* Description */}
                {resource.description && (
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                        {resource.description}
                    </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    {/* Category */}
                    {resource.category && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            {resource.category}
                        </span>
                    )}
                    {!resource.category && <span />}

                    {/* Added by + Date */}
                    <div className="text-xs text-slate-400 text-right">
                        {resource.profiles?.full_name && (
                            <span>Added by {resource.profiles.full_name}</span>
                        )}
                        <span className="block">
                            {format(new Date(resource.created_at), 'MMM d, yyyy')}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
