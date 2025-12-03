import { useMemo } from 'react';
import { FileText, Download, File, FileSpreadsheet, FileImage, FileVideo, FileAudio, Archive, Calendar, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Post, PostAttachment, FileAttachment } from '../../types';

interface GroupFilesProps {
    groupId: string;
    posts: Post[];
}

interface FileItem extends FileAttachment {
    postId: string;
    createdAt: string;
    authorName: string;
}

const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="h-5 w-5 text-blue-500" />;
    if (mimeType.includes('image')) return <FileImage className="h-5 w-5 text-purple-500" />;
    if (mimeType.includes('video')) return <FileVideo className="h-5 w-5 text-pink-500" />;
    if (mimeType.includes('audio')) return <FileAudio className="h-5 w-5 text-amber-500" />;
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return <Archive className="h-5 w-5 text-slate-500" />;
    return <File className="h-5 w-5 text-slate-400" />;
};

const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileExtension = (name: string) => {
    return name.split('.').pop()?.toUpperCase() || 'FILE';
};

export function GroupFiles({ posts }: GroupFilesProps) {
    // Extract all files from posts
    const files = useMemo(() => {
        const allFiles: FileItem[] = [];

        posts.forEach(post => {
            const attachments = (post.attachments || []) as PostAttachment[];
            attachments.forEach(att => {
                if (att.type === 'files') {
                    att.files.forEach(file => {
                        allFiles.push({
                            ...file,
                            postId: post.id,
                            createdAt: post.created_at,
                            authorName: post.profiles?.full_name || 'Unknown'
                        });
                    });
                }
            });
        });

        // Sort by date (newest first)
        return allFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [posts]);

    if (files.length === 0) {
        return (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto">
                    <FileText className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">No files yet</h3>
                <p className="mt-1 text-sm text-slate-500">Files from posts will appear here</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">Shared Files</h3>
                            <p className="text-sm text-slate-500">{files.length} file{files.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* File list */}
            <div className="divide-y divide-slate-100">
                {files.map((file, index) => (
                    <div
                        key={`${file.postId}-${index}`}
                        className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
                    >
                        {/* File icon */}
                        <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                            {getFileIcon(file.mimeType)}
                        </div>

                        {/* File info */}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">{file.name}</p>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium">
                                    {getFileExtension(file.name)}
                                </span>
                                <span>{formatFileSize(file.size)}</span>
                                <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {file.authorName}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                                </span>
                            </div>
                        </div>

                        {/* Download button */}
                        <a
                            href={file.url}
                            download={file.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 p-2.5 rounded-xl text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Download"
                        >
                            <Download className="h-5 w-5" />
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}
