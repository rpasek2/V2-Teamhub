import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, Loader2, Award, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';

interface Certification {
    id: string;
    name: string;
    issuer: string | null;
    issue_date: string | null;
    expiry_date: string | null;
    created_at: string;
}

interface StaffCertificationsSectionProps {
    staffUserId: string;
    canEdit: boolean;
}

export function StaffCertificationsSection({ staffUserId, canEdit }: StaffCertificationsSectionProps) {
    const { hubId } = useParams();

    const [certifications, setCertifications] = useState<Certification[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [issuer, setIssuer] = useState('');
    const [issueDate, setIssueDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');

    useEffect(() => {
        fetchCertifications();
    }, [staffUserId, hubId]);

    const fetchCertifications = async () => {
        if (!hubId) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('staff_certifications')
            .select('*')
            .eq('hub_id', hubId)
            .eq('staff_user_id', staffUserId)
            .order('expiry_date', { ascending: true, nullsFirst: false });

        if (error) {
            console.error('Error fetching certifications:', error);
        } else {
            setCertifications(data || []);
        }
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!hubId || !name.trim()) return;
        setSaving(true);

        const { error } = await supabase
            .from('staff_certifications')
            .insert({
                hub_id: hubId,
                staff_user_id: staffUserId,
                name: name.trim(),
                issuer: issuer.trim() || null,
                issue_date: issueDate || null,
                expiry_date: expiryDate || null,
            });

        if (error) {
            console.error('Error adding certification:', error);
        } else {
            await fetchCertifications();
            setShowAddForm(false);
            setName('');
            setIssuer('');
            setIssueDate('');
            setExpiryDate('');
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase
            .from('staff_certifications')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting certification:', error);
        } else {
            setCertifications(certifications.filter(c => c.id !== id));
        }
    };

    const getCertStatus = (expiryDate: string | null) => {
        if (!expiryDate) return { status: 'valid', label: 'No Expiry', color: 'text-slate-500 bg-slate-50' };

        const expiry = parseISO(expiryDate);
        const daysUntil = differenceInDays(expiry, new Date());

        if (isPast(expiry)) {
            return { status: 'expired', label: 'Expired', color: 'text-red-600 bg-red-50' };
        } else if (daysUntil <= 30) {
            return { status: 'expiring', label: `Expires in ${daysUntil} days`, color: 'text-amber-600 bg-amber-50' };
        } else if (daysUntil <= 90) {
            return { status: 'warning', label: `Expires in ${daysUntil} days`, color: 'text-orange-600 bg-orange-50' };
        }
        return { status: 'valid', label: 'Valid', color: 'text-green-600 bg-green-50' };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-800">Certifications & Credentials</h3>
                {canEdit && !showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Add Certification
                    </button>
                )}
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Certification Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., USAG Safety Certified"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Issuing Organization</label>
                            <input
                                type="text"
                                value={issuer}
                                onChange={(e) => setIssuer(e.target.value)}
                                placeholder="e.g., USA Gymnastics"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Issue Date</label>
                            <input
                                type="date"
                                value={issueDate}
                                onChange={(e) => setIssueDate(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                            <input
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAdd}
                            disabled={saving || !name.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Add
                        </button>
                    </div>
                </div>
            )}

            {/* Certifications List */}
            {certifications.length === 0 ? (
                <div className="text-center py-8">
                    <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">
                        No certifications added yet.
                        {canEdit && ' Click "Add Certification" to get started.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {certifications.map((cert) => {
                        const certStatus = getCertStatus(cert.expiry_date);

                        return (
                            <div
                                key={cert.id}
                                className={`p-4 rounded-lg border ${
                                    certStatus.status === 'expired'
                                        ? 'bg-red-50 border-red-200'
                                        : certStatus.status === 'expiring'
                                        ? 'bg-amber-50 border-amber-200'
                                        : 'bg-white border-slate-200'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg ${
                                            certStatus.status === 'expired'
                                                ? 'bg-red-100'
                                                : certStatus.status === 'expiring' || certStatus.status === 'warning'
                                                ? 'bg-amber-100'
                                                : 'bg-green-100'
                                        }`}>
                                            {certStatus.status === 'expired' ? (
                                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                            ) : certStatus.status === 'expiring' || certStatus.status === 'warning' ? (
                                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                                            ) : (
                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-slate-800">{cert.name}</h4>
                                            {cert.issuer && (
                                                <p className="text-sm text-slate-500">{cert.issuer}</p>
                                            )}
                                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                                {cert.issue_date && (
                                                    <span>Issued: {format(parseISO(cert.issue_date), 'MMM d, yyyy')}</span>
                                                )}
                                                {cert.expiry_date && (
                                                    <span>Expires: {format(parseISO(cert.expiry_date), 'MMM d, yyyy')}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${certStatus.color}`}>
                                            {certStatus.label}
                                        </span>
                                        {canEdit && (
                                            <button
                                                onClick={() => handleDelete(cert.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
