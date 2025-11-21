import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { CreateHubModal } from '../../components/hubs/CreateHubModal';

interface Hub {
    id: string;
    name: string;
    role: string;
}

export function HubSelection() {
    const { user } = useAuth();
    const [hubs, setHubs] = useState<Hub[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchMyHubs = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('hub_members')
                .select(`
          role,
          hub:hubs (
            id,
            name
          )
        `)
                .eq('user_id', user.id);

            if (error) throw error;

            const formattedHubs = data.map((item: any) => ({
                id: item.hub.id,
                name: item.hub.name,
                role: item.role,
            }));

            setHubs(formattedHubs);
        } catch (error) {
            console.error('Error fetching hubs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyHubs();
    }, [user]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Hubs</h1>
                    <p className="mt-1 text-slate-600">Select a hub to manage or create a new one.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                    <Plus className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                    Create Hub
                </button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {hubs.map((hub) => (
                    <Link
                        key={hub.id}
                        to={`/hub/${hub.id}`}
                        className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-brand-200"
                    >
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-brand-600">
                                {hub.name}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 capitalize">{hub.role}</p>
                        </div>
                        <div className="mt-4 flex items-center text-sm font-medium text-brand-600">
                            Enter Hub
                            <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                    </Link>
                ))}

                {/* Join Hub Card */}
                <button className="group relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-all hover:border-brand-300 hover:bg-brand-50">
                    <div className="rounded-full bg-white p-3 shadow-sm ring-1 ring-slate-200 group-hover:ring-brand-200">
                        <Plus className="h-6 w-6 text-slate-400 group-hover:text-brand-600" />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-slate-900">Join a Hub</h3>
                    <p className="mt-1 text-xs text-slate-500">Have an invite code?</p>
                </button>
            </div>

            <CreateHubModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onHubCreated={fetchMyHubs}
            />
        </div>
    );
}
