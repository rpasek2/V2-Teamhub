/**
 * File validation utility for consistent upload validation across the app
 */

export type FileCategory =
    | 'avatar'
    | 'postImage'
    | 'postFile'
    | 'marketplaceImage'
    | 'resource'
    | 'competitionDoc';

interface FileLimits {
    maxSize: number;
    maxSizeLabel: string;
    mimeTypes: string[];
    extensions: string[];
}

export const FILE_LIMITS: Record<FileCategory, FileLimits> = {
    avatar: {
        maxSize: 2 * 1024 * 1024, // 2MB
        maxSizeLabel: '2MB',
        mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    },
    postImage: {
        maxSize: 10 * 1024 * 1024, // 10MB
        maxSizeLabel: '10MB',
        mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    },
    postFile: {
        maxSize: 25 * 1024 * 1024, // 25MB
        maxSizeLabel: '25MB',
        mimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/csv',
        ],
        extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'],
    },
    marketplaceImage: {
        maxSize: 10 * 1024 * 1024, // 10MB
        maxSizeLabel: '10MB',
        mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    },
    resource: {
        maxSize: 50 * 1024 * 1024, // 50MB
        maxSizeLabel: '50MB',
        mimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'image/jpeg',
            'image/png',
            'image/gif',
            'video/mp4',
            'video/quicktime',
            'video/webm',
        ],
        extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'webm'],
    },
    competitionDoc: {
        maxSize: 25 * 1024 * 1024, // 25MB
        maxSizeLabel: '25MB',
        mimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
        ],
        extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'],
    },
};

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validates a file against the specified category limits
 */
export function validateFile(file: File, category: FileCategory): ValidationResult {
    const limits = FILE_LIMITS[category];

    // Check file size
    if (file.size > limits.maxSize) {
        return {
            valid: false,
            error: `File size exceeds ${limits.maxSizeLabel} limit`,
        };
    }

    // Check MIME type
    const isValidMimeType = limits.mimeTypes.some(type => {
        if (type.endsWith('/*')) {
            // Handle wildcard types like 'image/*'
            return file.type.startsWith(type.replace('/*', '/'));
        }
        return file.type === type;
    });

    if (!isValidMimeType && file.type) {
        // Get file extension as fallback check
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        if (!limits.extensions.includes(extension)) {
            return {
                valid: false,
                error: `File type not allowed. Accepted types: ${limits.extensions.join(', ')}`,
            };
        }
    }

    return { valid: true };
}

/**
 * Validates multiple files against the specified category limits
 */
export function validateFiles(files: File[], category: FileCategory): ValidationResult {
    for (const file of files) {
        const result = validateFile(file, category);
        if (!result.valid) {
            return {
                valid: false,
                error: `${file.name}: ${result.error}`,
            };
        }
    }
    return { valid: true };
}

/**
 * Generates a secure random filename using crypto.randomUUID
 */
export function generateSecureFileName(originalName: string): string {
    const extension = originalName.split('.').pop()?.toLowerCase() || '';
    return `${crypto.randomUUID()}.${extension}`;
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
