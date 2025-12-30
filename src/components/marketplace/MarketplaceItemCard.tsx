import { memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Tag, Clock, Link2 } from 'lucide-react';
import type { MarketplaceItem } from '../../types';
import { MARKETPLACE_CATEGORIES, MARKETPLACE_CONDITIONS } from '../../types';

interface MarketplaceItemCardProps {
    item: MarketplaceItem;
    currentHubId?: string;
    onClick: () => void;
}

// Default placeholder image (defined outside component to avoid recreation)
const defaultImage = 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
        <rect width="400" height="400" fill="#f1f5f9"/>
        <text x="200" y="200" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="48" fill="#94a3b8">No Image</text>
    </svg>
`);

export const MarketplaceItemCard = memo(function MarketplaceItemCard({ item, currentHubId, onClick }: MarketplaceItemCardProps) {
    const category = MARKETPLACE_CATEGORIES[item.category];
    const condition = MARKETPLACE_CONDITIONS[item.condition];
    const isFromLinkedHub = currentHubId && item.hub_id !== currentHubId;

    const formatPrice = (price: number) => {
        if (price === 0) return 'Free';
        return `$${price.toFixed(2)}`;
    };

    return (
        <button
            onClick={onClick}
            className="group text-left w-full rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:border-brand-300 transition-all"
        >
            {/* Image */}
            <div className="aspect-square relative overflow-hidden bg-slate-100">
                <img
                    src={item.images[0] || defaultImage}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {item.price === 0 && (
                        <span className="px-2 py-1 rounded-full bg-green-500 text-white text-xs font-semibold">
                            FREE
                        </span>
                    )}
                    {isFromLinkedHub && item.hubs?.name && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500 text-white text-xs font-medium">
                            <Link2 className="h-3 w-3" />
                            {item.hubs.name}
                        </span>
                    )}
                </div>
                <span className="absolute top-2 right-2 px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-medium shadow-sm">
                    {category.label}
                </span>
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="font-semibold text-slate-900 truncate group-hover:text-brand-600 transition-colors">
                    {item.title}
                </h3>

                <div className="mt-2 flex items-baseline gap-2">
                    <span className={`text-xl font-bold ${item.price === 0 ? 'text-green-600' : 'text-slate-900'}`}>
                        {formatPrice(item.price)}
                    </span>
                    {item.size && (
                        <span className="text-sm text-slate-500">
                            Size {item.size}
                        </span>
                    )}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                        <Tag className="h-3.5 w-3.5" />
                        {condition}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                </div>
            </div>
        </button>
    );
});
