import { useState, useEffect } from 'react';
import { Loader2, User, Users as UsersIcon, Heart, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import type { Guardian, MedicalInfo } from '../../types';

interface GymnastProfileFormProps {
    userId: string;
    onSaved?: () => void;
}

export function GymnastProfileForm({ userId, onSaved }: GymnastProfileFormProps) {
    const { hub } = useHub();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Basic Info
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [level, setLevel] = useState('');
    const [memberId, setMemberId] = useState('');
    const [memberIdType, setMemberIdType] = useState<'USAG' | 'AAU' | 'Other' | ''>('');
    const [tshirtSize, setTshirtSize] = useState<string>('');
    const [leoSize, setLeoSize] = useState<string>('');
    const [gender, setGender] = useState<string>('');

    // Guardian 1
    const [g1FirstName, setG1FirstName] = useState('');
    const [g1LastName, setG1LastName] = useState('');
    const [g1Email, setG1Email] = useState('');
    const [g1Phone, setG1Phone] = useState('');

    // Guardian 2
    const [g2FirstName, setG2FirstName] = useState('');
    const [g2LastName, setG2LastName] = useState('');
    const [g2Email, setG2Email] = useState('');
    const [g2Phone, setG2Phone] = useState('');

    // Medical Info
    const [allergies, setAllergies] = useState('');
    const [medications, setMedications] = useState('');
    const [conditions, setConditions] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (userId && hub) {
            fetchProfile();
        }
    }, [userId, hub]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('gymnast_profiles')
                .select('*')
                .eq('user_id', userId)
                .eq('hub_id', hub?.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                setFirstName(data.first_name || '');
                setLastName(data.last_name || '');
                setDateOfBirth(data.date_of_birth || '');
                setLevel(data.level || '');
                setMemberId(data.member_id || '');
                setMemberIdType(data.member_id_type || '');
                setTshirtSize(data.tshirt_size || '');
                setLeoSize(data.leo_size || '');
                setGender(data.gender || '');

                const g1 = data.guardian_1 as Guardian | null;
                if (g1) {
                    setG1FirstName(g1.first_name || '');
                    setG1LastName(g1.last_name || '');
                    setG1Email(g1.email || '');
                    setG1Phone(g1.phone || '');
                }

                const g2 = data.guardian_2 as Guardian | null;
                if (g2) {
                    setG2FirstName(g2.first_name || '');
                    setG2LastName(g2.last_name || '');
                    setG2Email(g2.email || '');
                    setG2Phone(g2.phone || '');
                }

                const medical = data.medical_info as MedicalInfo | null;
                if (medical) {
                    setAllergies(medical.allergies || '');
                    setMedications(medical.medications || '');
                    setConditions(medical.conditions || '');
                    setNotes(medical.notes || '');
                }
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hub || !userId) return;

        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const guardian1: Guardian | null = g1FirstName || g1LastName || g1Email || g1Phone
                ? { first_name: g1FirstName, last_name: g1LastName, email: g1Email, phone: g1Phone }
                : null;

            const guardian2: Guardian | null = g2FirstName || g2LastName || g2Email || g2Phone
                ? { first_name: g2FirstName, last_name: g2LastName, email: g2Email, phone: g2Phone }
                : null;

            const medicalInfo: MedicalInfo | null = allergies || medications || conditions || notes
                ? { allergies, medications, conditions, notes }
                : null;

            const profileData = {
                user_id: userId,
                hub_id: hub.id,
                first_name: firstName,
                last_name: lastName,
                date_of_birth: dateOfBirth || null,
                level: level || null,
                member_id: memberId || null,
                member_id_type: memberIdType || null,
                tshirt_size: tshirtSize || null,
                leo_size: leoSize || null,
                gender: gender || null,
                guardian_1: guardian1,
                guardian_2: guardian2,
                medical_info: medicalInfo,
                updated_at: new Date().toISOString(),
            };

            const { error: upsertError } = await supabase
                .from('gymnast_profiles')
                .upsert(profileData, {
                    onConflict: 'user_id,hub_id',
                });

            if (upsertError) throw upsertError;

            setSuccess(true);
            onSaved?.();

            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            console.error('Error saving profile:', err);
            setError(err.message || 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-brand-600" />
                    <h3 className="text-lg font-medium text-slate-900">Basic Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">First Name *</label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Last Name *</label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Date of Birth *</label>
                        <input
                            type="date"
                            value={dateOfBirth}
                            onChange={(e) => setDateOfBirth(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Gender</label>
                        <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                            <option value="">Select...</option>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Level</label>
                        <input
                            type="text"
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                            placeholder="e.g., Level 4, Xcel Silver"
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Member ID Type</label>
                        <select
                            value={memberIdType}
                            onChange={(e) => setMemberIdType(e.target.value as any)}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                            <option value="">Select...</option>
                            <option value="USAG">USAG</option>
                            <option value="AAU">AAU</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Member ID Number</label>
                        <input
                            type="text"
                            value={memberId}
                            onChange={(e) => setMemberId(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">T-Shirt Size</label>
                        <select
                            value={tshirtSize}
                            onChange={(e) => setTshirtSize(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                            <option value="">Select...</option>
                            <option value="XS">XS</option>
                            <option value="S">S</option>
                            <option value="M">M</option>
                            <option value="L">L</option>
                            <option value="XL">XL</option>
                            <option value="XXL">XXL</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Leo Size</label>
                        <select
                            value={leoSize}
                            onChange={(e) => setLeoSize(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                            <option value="">Select...</option>
                            <option value="XS">Child XS</option>
                            <option value="S">Child S</option>
                            <option value="M">Child M</option>
                            <option value="L">Child L</option>
                            <option value="XL">Child XL</option>
                            <option value="AS">Adult S</option>
                            <option value="AM">Adult M</option>
                            <option value="AL">Adult L</option>
                            <option value="AXL">Adult XL</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Guardian 1 */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <UsersIcon className="h-5 w-5 text-brand-600" />
                    <h3 className="text-lg font-medium text-slate-900">Guardian 1</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">First Name</label>
                        <input
                            type="text"
                            value={g1FirstName}
                            onChange={(e) => setG1FirstName(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Last Name</label>
                        <input
                            type="text"
                            value={g1LastName}
                            onChange={(e) => setG1LastName(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Email</label>
                        <input
                            type="email"
                            value={g1Email}
                            onChange={(e) => setG1Email(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Phone</label>
                        <input
                            type="tel"
                            value={g1Phone}
                            onChange={(e) => setG1Phone(e.target.value)}
                            placeholder="(555) 555-5555"
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>
                </div>
            </div>

            {/* Guardian 2 */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <UsersIcon className="h-5 w-5 text-brand-600" />
                    <h3 className="text-lg font-medium text-slate-900">Guardian 2 (Optional)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">First Name</label>
                        <input
                            type="text"
                            value={g2FirstName}
                            onChange={(e) => setG2FirstName(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Last Name</label>
                        <input
                            type="text"
                            value={g2LastName}
                            onChange={(e) => setG2LastName(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Email</label>
                        <input
                            type="email"
                            value={g2Email}
                            onChange={(e) => setG2Email(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Phone</label>
                        <input
                            type="tel"
                            value={g2Phone}
                            onChange={(e) => setG2Phone(e.target.value)}
                            placeholder="(555) 555-5555"
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>
                </div>
            </div>

            {/* Medical Information */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Heart className="h-5 w-5 text-brand-600" />
                    <h3 className="text-lg font-medium text-slate-900">Medical Information</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Allergies</label>
                        <textarea
                            value={allergies}
                            onChange={(e) => setAllergies(e.target.value)}
                            rows={2}
                            placeholder="List any allergies..."
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Medications</label>
                        <textarea
                            value={medications}
                            onChange={(e) => setMedications(e.target.value)}
                            rows={2}
                            placeholder="List any medications..."
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Medical Conditions</label>
                        <textarea
                            value={conditions}
                            onChange={(e) => setConditions(e.target.value)}
                            rows={2}
                            placeholder="List any medical conditions..."
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Additional Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Any additional medical information or notes..."
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>
                </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="rounded-md bg-red-50 p-4 flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-red-800">{error}</span>
                </div>
            )}

            {success && (
                <div className="rounded-md bg-green-50 p-4">
                    <span className="text-sm text-green-800">Profile saved successfully!</span>
                </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center rounded-md bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Profile
                </button>
            </div>
        </form>
    );
}
