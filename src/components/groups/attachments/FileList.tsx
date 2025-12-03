import { Download, FileText, FileImage, FileSpreadsheet, FileCode, File } from 'lucide-react';
import type { FileAttachment } from '../../../types';

interface FileListProps {
    files: FileAttachment[];
}

export function FileList({ files }: FileListProps) {
    if (files.length === 0) return null;

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return FileImage;
        if (mimeType.includes('pdf')) return FileText;
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return FileSpreadsheet;
        if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html') || mimeType.includes('css')) return FileCode;
        if (mimeType.includes('document') || mimeType.includes('word')) return FileText;
        return File;
    };

    const getFileColor = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return 'text-blue-500 bg-blue-50';
        if (mimeType.includes('pdf')) return 'text-red-500 bg-red-50';
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'text-emerald-500 bg-emerald-50';
        if (mimeType.includes('document') || mimeType.includes('word')) return 'text-blue-600 bg-blue-50';
        return 'text-slate-500 bg-slate-50';
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const getFileExtension = (name: string) => {
        const parts = name.split('.');
        return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
            <div className="divide-y divide-slate-100">
                {files.map((file, index) => {
                    const Icon = getFileIcon(file.mimeType);
                    const colorClass = getFileColor(file.mimeType);
                    const extension = getFileExtension(file.name);

                    return (
                        <a
                            key={index}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={file.name}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100 transition-colors group"
                        >
                            <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                                <p className="text-xs text-slate-500">
                                    {extension && <span className="uppercase">{extension} • </span>}
                                    {formatFileSize(file.size)}
                                </p>
                            </div>
                            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Download className="h-5 w-5 text-slate-400" />
                            </div>
                        </a>
                    );
                })}
            </div>
        </div>
    );
}
