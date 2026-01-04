interface NotificationBadgeProps {
    type: 'count' | 'dot';
    value: number | boolean;
    collapsed?: boolean;
}

export function NotificationBadge({ type, value, collapsed }: NotificationBadgeProps) {
    // Count badge for messages
    if (type === 'count' && typeof value === 'number' && value > 0) {
        if (collapsed) {
            return (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] font-bold text-white bg-error-500 rounded-full flex items-center justify-center z-10">
                    {value > 99 ? '99+' : value}
                </span>
            );
        }
        return (
            <span className="ml-auto h-5 min-w-5 px-1.5 text-xs font-semibold text-white bg-error-500 rounded-full flex items-center justify-center flex-shrink-0">
                {value > 99 ? '99+' : value}
            </span>
        );
    }

    // Dot badge for other features
    if (type === 'dot' && value === true) {
        if (collapsed) {
            return (
                <span className="absolute top-0 right-0 h-2 w-2 bg-error-500 rounded-full z-10" />
            );
        }
        return (
            <span className="ml-auto h-2 w-2 bg-error-500 rounded-full flex-shrink-0" />
        );
    }

    return null;
}
