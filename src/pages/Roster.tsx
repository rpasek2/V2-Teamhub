import { useEffect, useState } from 'react';
import { Plus, Search, MoreHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { AddMemberModal } from '../components/hubs/AddMemberModal';
import type { HubMember } from '../types';

interface Member extends Omit<HubMember, 'profiles'> {
    profile: {
        full_name: string;
        email: string;
    };
}

type TabType = 'All' | 'Admins' | 'Coaches' | 'Gymnasts' | 'Parents';

export function Roster() {
    const { hub } = useHub();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('All');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        if (hub) {
            fetchMembers();
        }
    }, [hub]);

    const fetchMembers = async () => {
        try {
            const { data, error } = await supabase
                .from('hub_members')
                .select(`
          user_id,
          role,
          profile:profiles (
            full_name,
            email
          )
        `)
                .eq('hub_id', hub?.id);

            if (error) throw error;

            setMembers(data as any);
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    };

    const tabs: { name: TabType; roles: string[] }[] = [
        { name: 'All', roles: [] },
        { name: 'Admins', roles: ['owner', 'admin', 'director'] },
        { name: 'Coaches', roles: ['coach'] },
        { name: 'Gymnasts', roles: ['gymnast'] },
        { name: 'Parents', roles: ['parent'] },
    ];

    const filteredMembers = members.filter((member) => {
        const matchesSearch =
            member.profile.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.profile.email.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (activeTab === 'All') return true;

        const currentTabRoles = tabs.find(t => t.name === activeTab)?.roles || [];
        return currentTabRoles.includes(member.role);
    });

    if (loading) return <div className="p-8">Loading roster...</div>;

    return (
        <div>
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-bold text-slate-900">Roster</h1>
                    <p className="mt-2 text-sm text-slate-700">
                        Manage your team members, assign roles, and view contact info.
                    </p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                    <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="block rounded-md bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                    >
                        <Plus className="inline-block -ml-0.5 mr-1.5 h-4 w-4" />
                        Add Member
                    </button>
                </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Tabs */}
                <div className="flex space-x-1 rounded-xl bg-slate-100 p-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.name}
                            onClick={() => setActiveTab(tab.name)}
                            className={`
                w-full rounded-lg py-2.5 px-4 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-brand-400 focus:outline-none focus:ring-2
                ${activeTab === tab.name
                                    ? 'bg-white text-brand-700 shadow'
                                    : 'text-slate-600 hover:bg-white/[0.12] hover:text-slate-800'
                                }
              `}
                        >
                            {tab.name}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative w-full max-w-xs">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-md border-0 py-1.5 pl-10 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                        placeholder="Search members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-slate-300">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">
                                            Name
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">
                                            Role
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">
                                            Email
                                        </th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {filteredMembers.length > 0 ? (
                                        filteredMembers.map((member) => (
                                            <tr key={member.user_id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">
                                                    {member.profile.full_name}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 capitalize">
                                                    {member.role}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                                                    {member.profile.email}
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <button className="text-slate-400 hover:text-slate-600">
                                                        <MoreHorizontal className="h-5 w-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-sm text-slate-500">
                                                No members found in this category.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <AddMemberModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onMemberAdded={fetchMembers}
            />
        </div>
    );
}
