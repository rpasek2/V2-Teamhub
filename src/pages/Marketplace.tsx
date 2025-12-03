import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, ShoppingBag, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { useAuth } from '../context/AuthContext';
import { MarketplaceItemCard } from '../components/marketplace/MarketplaceItemCard';
import { CreateItemModal } from '../components/marketplace/CreateItemModal';
import { ItemDetailModal } from '../components/marketplace/ItemDetailModal';
import type { MarketplaceItem, MarketplaceCategory } from '../types';
import { MARKETPLACE_CATEGORIES } from '../types';

type SortOption = 'newest' | 'price_low' | 'price_high';
type HubFilter = 'all' | 'this_hub';

export default function Marketplace() {
    const { hub, currentRole } = useHub();
    const { user } = useAuth();
    const [items, setItems] = useState<MarketplaceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<MarketplaceCategory | 'all'>('all');
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [hubFilter, setHubFilter] = useState<HubFilter>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
    const [linkedHubIds, setLinkedHubIds] = useState<string[]>([]);

    useEffect(() => {
        if (hub) {
            fetchLinkedHubs();
            fetchItems();
        }
    }, [hub]);

    const fetchLinkedHubs = async () => {
        if (!hub?.id) return;

        try {
            // Get all active links where this hub is involved
            const { data, error } = await supabase
                .from('marketplace_hub_links')
                .select('requester_hub_id, target_hub_id')
                .eq('status', 'active')
                .or(`requester_hub_id.eq.${hub.id},target_hub_id.eq.${hub.id}`);

            if (error) throw error;

            // Extract the linked hub IDs (the other hub in each link)
            const linkedIds = (data || []).map(link =>
                link.requester_hub_id === hub.id ? link.target_hub_id : link.requester_hub_id
            );
            setLinkedHubIds(linkedIds);
        } catch (error) {
            console.error('Error fetching linked hubs:', error);
        }
    };

    const fetchItems = async () => {
        if (!hub?.id) return;
        setLoading(true);

        try {
            // Fetch items - RLS policy will handle filtering to only show items from this hub and linked hubs
            const { data, error } = await supabase
                .from('marketplace_items')
                .select(`
                    *,
                    profiles:seller_id (id, full_name, avatar_url),
                    hubs:hub_id (id, name)
                `)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error('Error fetching marketplace items:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredAndSortedItems = useMemo(() => {
        let result = [...items];

        // Filter by hub
        if (hubFilter === 'this_hub') {
            result = result.filter(item => item.hub_id === hub?.id);
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                item =>
                    item.title.toLowerCase().includes(query) ||
                    item.description.toLowerCase().includes(query) ||
                    item.brand?.toLowerCase().includes(query)
            );
        }

        // Filter by category
        if (selectedCategory !== 'all') {
            result = result.filter(item => item.category === selectedCategory);
        }

        // Sort
        switch (sortBy) {
            case 'price_low':
                result.sort((a, b) => a.price - b.price);
                break;
            case 'price_high':
                result.sort((a, b) => b.price - a.price);
                break;
            case 'newest':
            default:
                result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        return result;
    }, [items, searchQuery, selectedCategory, sortBy, hubFilter, hub?.id]);

    const hasLinkedHubs = linkedHubIds.length > 0;

    const canModerate = useMemo(() => {
        const staffRoles = ['owner', 'director', 'admin', 'coach'];
        return currentRole ? staffRoles.includes(currentRole) : false;
    }, [currentRole]);

    const handleItemUpdated = () => {
        fetchItems();
        setSelectedItem(null);
    };

    const handleItemDeleted = () => {
        fetchItems();
        setSelectedItem(null);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <ShoppingBag className="h-7 w-7 text-brand-600" />
                                Marketplace
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Buy and sell gear with your team community
                            </p>
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            List an Item
                        </button>
                    </div>

                    {/* Search and Filters */}
                    <div className="mt-6 flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search items..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            />
                        </div>

                        {/* Filter Toggle (Mobile) */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="sm:hidden inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                            {selectedCategory !== 'all' && (
                                <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-brand-100 text-brand-700 text-xs font-medium">
                                    1
                                </span>
                            )}
                        </button>

                        {/* Category Filter (Desktop) */}
                        <div className="hidden sm:flex items-center gap-2">
                            {/* Hub Filter - only show if there are linked hubs */}
                            {hasLinkedHubs && (
                                <select
                                    value={hubFilter}
                                    onChange={(e) => setHubFilter(e.target.value as HubFilter)}
                                    className="rounded-lg border border-slate-300 px-3 py-2.5 pr-8 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                >
                                    <option value="all">All Linked Hubs</option>
                                    <option value="this_hub">This Hub Only</option>
                                </select>
                            )}

                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value as MarketplaceCategory | 'all')}
                                className="rounded-lg border border-slate-300 px-3 py-2.5 pr-8 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            >
                                <option value="all">All Categories</option>
                                {Object.entries(MARKETPLACE_CATEGORIES).map(([key, { label }]) => (
                                    <option key={key} value={key}>
                                        {label}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                className="rounded-lg border border-slate-300 px-3 py-2.5 pr-8 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            >
                                <option value="newest">Newest First</option>
                                <option value="price_low">Price: Low to High</option>
                                <option value="price_high">Price: High to Low</option>
                            </select>
                        </div>
                    </div>

                    {/* Mobile Filters */}
                    {showFilters && (
                        <div className="sm:hidden mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                            {/* Hub Filter - only show if there are linked hubs */}
                            {hasLinkedHubs && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Hub
                                    </label>
                                    <select
                                        value={hubFilter}
                                        onChange={(e) => setHubFilter(e.target.value as HubFilter)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    >
                                        <option value="all">All Linked Hubs</option>
                                        <option value="this_hub">This Hub Only</option>
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Category
                                </label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value as MarketplaceCategory | 'all')}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                >
                                    <option value="all">All Categories</option>
                                    {Object.entries(MARKETPLACE_CATEGORIES).map(([key, { label }]) => (
                                        <option key={key} value={key}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Sort By
                                </label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="price_low">Price: Low to High</option>
                                    <option value="price_high">Price: High to Low</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Active Filters */}
                    {selectedCategory !== 'all' && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-sm">
                                {MARKETPLACE_CATEGORIES[selectedCategory].label}
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className="hover:text-brand-900"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    // Skeleton loading
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="animate-pulse rounded-xl bg-white shadow-sm overflow-hidden">
                                <div className="aspect-square bg-slate-200" />
                                <div className="p-4 space-y-3">
                                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                                    <div className="h-6 bg-slate-200 rounded w-1/3" />
                                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredAndSortedItems.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredAndSortedItems.map((item) => (
                            <MarketplaceItemCard
                                key={item.id}
                                item={item}
                                currentHubId={hub?.id}
                                onClick={() => setSelectedItem(item)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <ShoppingBag className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-4 text-lg font-medium text-slate-900">
                            {searchQuery || selectedCategory !== 'all'
                                ? 'No items found'
                                : 'No items listed yet'}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                            {searchQuery || selectedCategory !== 'all'
                                ? 'Try adjusting your search or filters'
                                : 'Be the first to list an item for sale!'}
                        </p>
                        {!searchQuery && selectedCategory === 'all' && (
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                            >
                                <Plus className="h-4 w-4" />
                                List an Item
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Create Item Modal */}
            <CreateItemModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onItemCreated={fetchItems}
            />

            {/* Item Detail Modal */}
            {selectedItem && (
                <ItemDetailModal
                    item={selectedItem}
                    isOpen={!!selectedItem}
                    onClose={() => setSelectedItem(null)}
                    canEdit={selectedItem.seller_id === user?.id && selectedItem.hub_id === hub?.id}
                    canDelete={(selectedItem.seller_id === user?.id || canModerate) && selectedItem.hub_id === hub?.id}
                    onItemUpdated={handleItemUpdated}
                    onItemDeleted={handleItemDeleted}
                    currentHubId={hub?.id}
                />
            )}
        </div>
    );
}
