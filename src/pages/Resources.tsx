import { useState, useMemo } from 'react';
import { Plus, Search, FolderOpen, Settings, Loader2 } from 'lucide-react';
import { useHub } from '../context/HubContext';
import { useResources, useResourceCategories, useDeleteResource } from '../hooks/useResources';
import { ResourceCard } from '../components/resources/ResourceCard';
import { CreateResourceModal } from '../components/resources/CreateResourceModal';
import { ManageCategoriesModal } from '../components/resources/ManageCategoriesModal';

export function Resources() {
    const { hub, currentRole } = useHub();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

    const { resources, loading, refetch } = useResources({
        hubId: hub?.id,
        category: selectedCategory
    });
    const { categories, refetch: refetchCategories } = useResourceCategories(hub?.id);
    const { deleteResource } = useDeleteResource();

    const isStaff = ['owner', 'director', 'admin', 'coach'].includes(currentRole || '');

    // Filter resources by search query
    const filteredResources = useMemo(() => {
        if (!searchQuery.trim()) return resources;
        const query = searchQuery.toLowerCase();
        return resources.filter(
            (r) =>
                r.name.toLowerCase().includes(query) ||
                r.description?.toLowerCase().includes(query) ||
                r.category?.toLowerCase().includes(query)
        );
    }, [resources, searchQuery]);

    const handleDeleteResource = async (id: string, fileUrl?: string) => {
        if (!confirm('Are you sure you want to delete this resource?')) return;

        const success = await deleteResource(id, fileUrl);
        if (success) {
            refetch();
        }
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="sm:flex sm:items-center sm:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Resources</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Helpful documents, guides, and links for your team
                    </p>
                </div>
                {isStaff && (
                    <div className="mt-4 sm:mt-0 flex items-center gap-2">
                        <button
                            onClick={() => setIsCategoriesModalOpen(true)}
                            className="btn-ghost"
                            title="Manage categories"
                        >
                            <Settings className="w-4 h-4" />
                            <span className="hidden sm:inline">Categories</span>
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="btn-primary"
                        >
                            <Plus className="w-4 h-4" />
                            Add Resource
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search resources..."
                        className="input w-full pl-10"
                    />
                </div>

                {/* Category Filter */}
                {categories.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                selectedCategory === null
                                    ? 'bg-mint-100 text-mint-700'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            All
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.name)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                    selectedCategory === cat.name
                                        ? 'bg-mint-100 text-mint-700'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-mint-500 animate-spin" />
                </div>
            ) : filteredResources.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredResources.map((resource) => (
                        <ResourceCard
                            key={resource.id}
                            resource={resource}
                            canDelete={isStaff}
                            onDelete={() => handleDeleteResource(resource.id, resource.type === 'file' ? resource.url : undefined)}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <FolderOpen className="w-8 h-8 text-slate-400" />
                    </div>
                    {searchQuery || selectedCategory ? (
                        <>
                            <h3 className="text-lg font-medium text-slate-900 mb-1">No resources found</h3>
                            <p className="text-slate-500 mb-4">
                                Try adjusting your search or filter criteria
                            </p>
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedCategory(null);
                                }}
                                className="btn-ghost"
                            >
                                Clear filters
                            </button>
                        </>
                    ) : (
                        <>
                            <h3 className="text-lg font-medium text-slate-900 mb-1">No resources yet</h3>
                            <p className="text-slate-500 mb-4">
                                {isStaff
                                    ? 'Add helpful documents, links, and guides for your team.'
                                    : 'Resources will appear here once they are added.'}
                            </p>
                            {isStaff && (
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="btn-primary"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add First Resource
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Modals */}
            {hub && (
                <>
                    <CreateResourceModal
                        isOpen={isCreateModalOpen}
                        onClose={() => setIsCreateModalOpen(false)}
                        onResourceCreated={() => {
                            refetch();
                            refetchCategories();
                        }}
                        hubId={hub.id}
                        categories={categories}
                        onCategoryCreated={refetchCategories}
                    />
                    <ManageCategoriesModal
                        isOpen={isCategoriesModalOpen}
                        onClose={() => setIsCategoriesModalOpen(false)}
                        hubId={hub.id}
                        categories={categories}
                        onCategoriesChanged={() => {
                            refetchCategories();
                            refetch();
                        }}
                    />
                </>
            )}
        </div>
    );
}
