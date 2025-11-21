import { useState } from 'react';

interface UseFormSubmitOptions<T> {
    onSubmit: (data: T) => Promise<void>;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export function useFormSubmit<T = any>({ onSubmit, onSuccess, onError }: UseFormSubmitOptions<T>) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (data: T) => {
        setLoading(true);
        setError(null);

        try {
            await onSubmit(data);
            onSuccess?.();
        } catch (err: any) {
            const errorMessage = err.message || 'An error occurred';
            setError(errorMessage);
            onError?.(err);
            console.error('Form submission error:', err);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setLoading(false);
        setError(null);
    };

    return {
        loading,
        error,
        setError,
        handleSubmit,
        reset,
    };
}
