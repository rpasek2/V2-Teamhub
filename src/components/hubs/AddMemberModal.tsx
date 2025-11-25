import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Upload, UserPlus, Users, Trash2, ChevronDown, User, Heart, Phone, Shield } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';

interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMemberAdded: () => void;
    initialData?: any;
}

type Role = 'parent' | 'coach' | 'admin' | 'director';
type AddMode = 'select' | 'single' | 'bulk';

export function AddMemberModal({ isOpen, onClose, onMemberAdded, initialData }: AddMemberModalProps) {
    const { hub, levels } = useHub();
    const [mode, setMode] = useState<AddMode>('select');
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [addingGymnastProfile, setAddingGymnastProfile] = useState(false);

    // Single member state
    const [email, setEmail] = useState('');


    // Gymnast profile state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
    const [level, setLevel] = useState('');
    const [memberId, setMemberId] = useState('');
    const [memberIdType, setMemberIdType] = useState<'USAG' | 'AAU' | 'Other' | ''>('');
    const [tshirtSize, setTshirtSize] = useState<'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | ''>('');
    const [leoSize, setLeoSize] = useState<'XS' | 'S' | 'M' | 'L' | 'XL' | 'AS' | 'AM' | 'AL' | 'AXL' | ''>('');

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
    const [medicalNotes, setMedicalNotes] = useState('');

    // Bulk import state
    const [bulkEmails, setBulkEmails] = useState('');
    const [bulkFile, setBulkFile] = useState<File | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleClose = onClose;

    const resetForm = () => {
        setMode('select');
        setSelectedRole(null);
        setAddingGymnastProfile(false);
        setEmail('');

        setFirstName('');
        setLastName('');
        setDateOfBirth('');
        setGender('');
        setLevel('');
        setMemberId('');
        setMemberIdType('');
        setTshirtSize('');
        setLeoSize('');
        setG1FirstName('');
        setG1LastName('');
        setG1Email('');
        setG1Phone('');
        setG2FirstName('');
        setG2LastName('');
        setG2Email('');
        setG2Phone('');
        setAllergies('');
        setMedications('');
        setConditions('');
        setMedicalNotes('');
        setBulkEmails('');
        setBulkFile(null);
        setError(null);
        setSuccess(null);
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            setLoading(false);
            setError(null);
            setSuccess(null);

            if (initialData) {
                // Pre-fill form for editing
                if (initialData.type === 'gymnast_profile') {
                    setMode('single');
                    setAddingGymnastProfile(true);

                    // Get the full profile data (either directly or from full_profile property)
                    const profile = initialData.full_profile || initialData;

                    // Basic Info
                    setFirstName(profile.first_name || initialData.name?.split(' ')[0] || '');
                    setLastName(profile.last_name || initialData.name?.split(' ').slice(1).join(' ') || '');
                    setDateOfBirth(profile.date_of_birth || profile.dob || '');
                    setGender(profile.gender || '');
                    setLevel(profile.level || initialData.level || '');
                    setMemberId(profile.member_id || '');
                    setMemberIdType(profile.member_id_type || '');
                    setTshirtSize(profile.tshirt_size || '');
                    setLeoSize(profile.leo_size || '');

                    // Guardian 1
                    if (profile.guardian_1) {
                        setG1FirstName(profile.guardian_1.first_name || '');
                        setG1LastName(profile.guardian_1.last_name || '');
                        setG1Email(profile.guardian_1.email || '');
                        setG1Phone(profile.guardian_1.phone || '');
                    } else if (initialData.guardian_name) {
                        const parts = initialData.guardian_name.split(' ');
                        setG1FirstName(parts[0] || '');
                        setG1LastName(parts.slice(1).join(' ') || '');
                        setG1Phone(initialData.guardian_phone || '');
                        setG1Email(initialData.email || ''); // Fallback
                    }

                    // Guardian 2
                    if (profile.guardian_2) {
                        setG2FirstName(profile.guardian_2.first_name || '');
                        setG2LastName(profile.guardian_2.last_name || '');
                        setG2Email(profile.guardian_2.email || '');
                        setG2Phone(profile.guardian_2.phone || '');
                    }

                    // Medical Info
                    if (profile.medical_info) {
                        setAllergies(profile.medical_info.allergies || '');
                        setMedications(profile.medical_info.medications || '');
                        setConditions(profile.medical_info.conditions || '');
                        setMedicalNotes(profile.medical_info.notes || '');
                    }
                } else {
                    // Editing a regular member
                    setMode('single');
                    setSelectedRole(initialData.role as Role);
                    setEmail(initialData.email || '');

                }
            } else {
                resetForm();
            }
        }
    }, [isOpen, initialData]);

    const parseRollSheet = (htmlContent: string): Array<{
        firstName: string;
        lastName: string;
        dateOfBirth: string;
        gender: 'Male' | 'Female' | 'Other' | '';
        level: string;
        guardianFirstName: string;
        guardianLastName: string;
        guardianEmail: string;
        guardianPhone: string;
    }> => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const gymnasts: any[] = [];

        // Find all headers that define a class section
        const headers = doc.querySelectorAll('.full-width-header');

        headers.forEach((header) => {
            // Extract class/level name for this section
            const classNameElement = header.querySelector('span');
            const className = classNameElement?.textContent?.trim() || '';

            if (!className) return;

            // Find the container for this page/section
            // The header is inside a div that contains the table for this class
            const pageContainer = header.parentElement;

            if (!pageContainer) return;

            // Find all student rows within this specific page/section
            const studentCells = pageContainer.querySelectorAll('td.student');

            studentCells.forEach((studentCell) => {
                try {
                    // Get student name
                    const nameElement = studentCell.querySelector('.student-name strong');
                    const fullName = nameElement?.textContent?.trim() || '';

                    if (!fullName) return;

                    // Parse name (handle both "FIRST LAST" and "Last, First" formats)
                    let firstName = '';
                    let lastName = '';
                    if (fullName.includes(',')) {
                        const parts = fullName.split(',').map(p => p.trim());
                        lastName = parts[0];
                        firstName = parts[1] || '';
                    } else {
                        const parts = fullName.split(' ');
                        firstName = parts[0] || '';
                        lastName = parts.slice(1).join(' ') || '';
                    }

                    // Get student info (gender and birthdate)
                    const infoElement = studentCell.querySelector('.student-info');
                    const infoText = infoElement?.textContent?.trim() || '';
                    const infoLines = infoText.split('\n').map(l => l.trim()).filter(l => l);

                    let gender: 'Male' | 'Female' | 'Other' | '' = '';
                    let dateOfBirth = '';

                    infoLines.forEach(line => {
                        if (line === 'Male' || line === 'Female') {
                            gender = line;
                        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(line)) {
                            // Convert MM/DD/YYYY to YYYY-MM-DD
                            const [month, day, year] = line.split('/');
                            dateOfBirth = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                        }
                    });

                    // Get guardian info (in the next cell)
                    const row = studentCell.closest('tr');
                    const guardianCell = row?.querySelector('td.guardian');

                    let guardianFirstName = '';
                    let guardianLastName = '';
                    let guardianEmail = '';
                    let guardianPhone = '';

                    if (guardianCell) {
                        const guardianNameElement = guardianCell.querySelector('.guardian-name strong');
                        const guardianFullName = guardianNameElement?.textContent?.trim() || '';

                        if (guardianFullName.includes(',')) {
                            const parts = guardianFullName.split(',').map(p => p.trim());
                            guardianLastName = parts[0];
                            guardianFirstName = parts[1] || '';
                        } else {
                            const parts = guardianFullName.split(' ');
                            guardianFirstName = parts[0] || '';
                            guardianLastName = parts.slice(1).join(' ') || '';
                        }

                        const emailElement = guardianCell.querySelector('.guardian-email');
                        guardianEmail = emailElement?.textContent?.trim() || '';

                        const phoneElement = guardianCell.querySelector('.guardian-phone');
                        guardianPhone = phoneElement?.textContent?.trim() || '';
                    }

                    gymnasts.push({
                        firstName,
                        lastName,
                        dateOfBirth,
                        gender,
                        level: className, // Use the class name from the current section
                        guardianFirstName,
                        guardianLastName,
                        guardianEmail,
                        guardianPhone,
                    });
                } catch (err) {
                    console.error('Error parsing student:', err);
                }
            });
        });

        return gymnasts;
    };

    const handleBulkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hub) return;

        // For gymnast profiles, require file upload
        if (addingGymnastProfile) {
            if (!bulkFile) {
                setError('Please upload a roll sheet file.');
                return;
            }

            setLoading(true);
            setError(null);
            setSuccess(null);

            try {
                // Read the file
                const fileContent = await bulkFile.text();
                const gymnasts = parseRollSheet(fileContent);

                if (gymnasts.length === 0) {
                    throw new Error('No gymnasts found in the roll sheet. Please check the file format.');
                }

                // Create gymnast profiles
                const profilesData = gymnasts.map(g => ({
                    user_id: null,
                    hub_id: hub.id,
                    first_name: g.firstName,
                    last_name: g.lastName,
                    date_of_birth: g.dateOfBirth,
                    gender: g.gender || null,
                    level: g.level,
                    member_id: null,
                    member_id_type: null,
                    tshirt_size: null,
                    leo_size: null,
                    guardian_1: g.guardianFirstName || g.guardianEmail || g.guardianPhone ? {
                        first_name: g.guardianFirstName,
                        last_name: g.guardianLastName,
                        email: g.guardianEmail,
                        phone: g.guardianPhone,
                    } : null,
                    guardian_2: null,
                    medical_info: null,
                }));

                const { error: insertError } = await supabase
                    .from('gymnast_profiles')
                    .insert(profilesData);

                if (insertError) throw insertError;

                setSuccess(`Successfully imported ${gymnasts.length} gymnast(s)!`);
                setBulkFile(null);
                onMemberAdded();

                setTimeout(() => {
                    onClose();
                    resetForm();
                }, 2000);

            } catch (err: any) {
                console.error('Error bulk importing gymnasts:', err);
                setError(err.message || 'Failed to import gymnasts');
            } finally {
                setLoading(false);
            }
            return;
        }

        // Original email-based import for non-gymnasts
        if (!bulkEmails.trim()) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Parse emails (one per line or comma-separated)
            const emailList = bulkEmails
                .split(/[\n,]/)
                .map(e => e.trim().toLowerCase())
                .filter(e => e && e.includes('@'));

            if (emailList.length === 0) {
                throw new Error('Please enter at least one valid email address.');
            }

            // Fetch all profiles matching emails
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, email')
                .in('email', emailList);

            if (profileError) throw profileError;

            if (!profiles || profiles.length === 0) {
                throw new Error('No registered users found with those emails.');
            }

            // Check for existing members
            const { data: existingMembers } = await supabase
                .from('hub_members')
                .select('user_id')
                .eq('hub_id', hub.id)
                .in('user_id', profiles.map(p => p.id));

            const existingIds = new Set(existingMembers?.map(m => m.user_id) || []);
            const newMembers = profiles.filter(p => !existingIds.has(p.id));

            if (newMembers.length === 0) {
                throw new Error('All users with these emails are already members of this hub.');
            }

            // Add new members
            const { error: insertError } = await supabase
                .from('hub_members')
                .insert(
                    newMembers.map(p => ({
                        hub_id: hub.id,
                        user_id: p.id,
                        role: selectedRole
                    }))
                );

            if (insertError) throw insertError;

            setSuccess(`Successfully added ${newMembers.length} member(s)!`);
            setBulkEmails('');
            onMemberAdded();

            setTimeout(() => {
                onClose();
                resetForm();
            }, 2000);

        } catch (err: any) {
            console.error('Error bulk adding members:', err);
            setError(err.message || 'Failed to add members');
        } finally {
            setLoading(false);
        }
    };



    const handleRoleSelect = (role: Role) => {
        setSelectedRole(role);
        setMode('single');
    };

    const handleBack = () => {
        setSelectedRole(null);
        setAddingGymnastProfile(false);
        setMode('select');
    };

    const handleSingleGymnastSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hub) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const profileData = {
                hub_id: hub.id,
                first_name: firstName,
                last_name: lastName,
                date_of_birth: dateOfBirth,
                gender: gender || null,
                level: level || null,
                member_id: memberId || null,
                member_id_type: memberIdType || null,
                tshirt_size: tshirtSize || null,
                leo_size: leoSize || null,
                guardian_1: (g1FirstName || g1LastName || g1Email || g1Phone) ? {
                    first_name: g1FirstName,
                    last_name: g1LastName,
                    email: g1Email,
                    phone: g1Phone,
                } : null,
                guardian_2: (g2FirstName || g2LastName || g2Email || g2Phone) ? {
                    first_name: g2FirstName,
                    last_name: g2LastName,
                    email: g2Email,
                    phone: g2Phone,
                } : null,
                medical_info: (allergies || medications || conditions || medicalNotes) ? {
                    allergies,
                    medications,
                    conditions,
                    notes: medicalNotes,
                } : null,
            };

            if (initialData && initialData.type === 'gymnast_profile') {
                // Update existing gymnast - use the actual profile ID
                const profileId = initialData.full_profile?.id || initialData.id;
                const { error: updateError } = await supabase
                    .from('gymnast_profiles')
                    .update(profileData)
                    .eq('id', profileId);

                if (updateError) throw updateError;
            } else {
                // Create new gymnast
                const { error: insertError } = await supabase
                    .from('gymnast_profiles')
                    .insert([profileData]);

                if (insertError) throw insertError;
            }

            onMemberAdded();
            onClose();
            resetForm();

        } catch (err: any) {
            console.error('Error saving gymnast:', err);
            setError(err.message || 'Failed to save gymnast');
        } finally {
            setLoading(false);
        }
    };

    const handleSingleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hub || !selectedRole) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Check if user exists
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email.toLowerCase())
                .single();

            if (profileError || !profiles) {
                throw new Error('User with this email does not exist. They must sign up first.');
            }

            if (initialData && initialData.role) {
                // Update existing member role
                const { error: updateError } = await supabase
                    .from('hub_members')
                    .update({ role: selectedRole })
                    .eq('hub_id', hub.id)
                    .eq('user_id', profiles.id);

                if (updateError) throw updateError;
            } else {
                // Add new member
                // Check if already a member
                const { data: existingMember } = await supabase
                    .from('hub_members')
                    .select('id')
                    .eq('hub_id', hub.id)
                    .eq('user_id', profiles.id)
                    .single();

                if (existingMember) {
                    throw new Error('User is already a member of this hub.');
                }

                const { error: insertError } = await supabase
                    .from('hub_members')
                    .insert([{
                        hub_id: hub.id,
                        user_id: profiles.id,
                        role: selectedRole
                    }]);

                if (insertError) throw insertError;
            }

            onMemberAdded();
            onClose();
            resetForm();

        } catch (err: any) {
            console.error('Error saving member:', err);
            setError(err.message || 'Failed to save member');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!initialData || !hub) return;

        if (!window.confirm('Are you sure you want to remove this member? This action cannot be undone.')) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (initialData.type === 'gymnast_profile') {
                // Use the actual profile ID
                const profileId = initialData.full_profile?.id || initialData.id;
                const { error: deleteError } = await supabase
                    .from('gymnast_profiles')
                    .delete()
                    .eq('id', profileId);

                if (deleteError) throw deleteError;
                setSuccess('Gymnast removed successfully');
            } else {
                // Remove regular member
                // We need the user_id, which should be in initialData.id (mapped from user_id in Roster.tsx)
                const { error: deleteError } = await supabase
                    .from('hub_members')
                    .delete()
                    .eq('hub_id', hub.id)
                    .eq('user_id', initialData.id);

                if (deleteError) throw deleteError;
                setSuccess('Member removed successfully');
            }

            onMemberAdded(); // Refresh list
            onClose();
            resetForm();

        } catch (err: any) {
            console.error('Error deleting member:', err);
            setError(err.message || 'Failed to delete member');
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Edit Member" : "Add Member"}
        >
            <div className="space-y-6">
                {/* Role Selection */}
                {!selectedRole && !addingGymnastProfile && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">What would you like to add?</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setAddingGymnastProfile(true)}
                                className="flex flex-col items-center justify-center rounded-lg border-2 border-slate-200 p-4 hover:border-brand-500 hover:bg-brand-50 transition-colors"
                            >
                                <Users className="h-8 w-8 text-brand-600 mb-2" />
                                <span className="font-medium">Athlete</span>
                                <span className="text-xs text-slate-500 mt-1">Gymnast profile</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRoleSelect('parent')}
                                className="flex flex-col items-center justify-center rounded-lg border-2 border-slate-200 p-4 hover:border-brand-500 hover:bg-brand-50 transition-colors"
                            >
                                <UserPlus className="h-8 w-8 text-brand-600 mb-2" />
                                <span className="font-medium">Parent</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRoleSelect('coach')}
                                className="flex flex-col items-center justify-center rounded-lg border-2 border-slate-200 p-4 hover:border-brand-500 hover:bg-brand-50 transition-colors"
                            >
                                <UserPlus className="h-8 w-8 text-brand-600 mb-2" />
                                <span className="font-medium">Coach</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRoleSelect('admin')}
                                className="flex flex-col items-center justify-center rounded-lg border-2 border-slate-200 p-4 hover:border-brand-500 hover:bg-brand-50 transition-colors"
                            >
                                <UserPlus className="h-8 w-8 text-brand-600 mb-2" />
                                <span className="font-medium">Admin</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Athlete: Single vs Bulk Selection */}
                {addingGymnastProfile && mode === 'select' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-600">How would you like to add athletes?</p>
                            <button
                                type="button"
                                onClick={handleBack}
                                className="text-sm text-brand-600 hover:text-brand-700"
                            >
                                Back
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setMode('single')}
                                className="flex flex-col items-center justify-center rounded-lg border-2 border-slate-200 p-4 hover:border-brand-500 hover:bg-brand-50 transition-colors"
                            >
                                <UserPlus className="h-8 w-8 text-brand-600 mb-2" />
                                <span className="font-medium">Add One</span>
                                <span className="text-xs text-slate-500 mt-1">Single athlete</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('bulk')}
                                className="flex flex-col items-center justify-center rounded-lg border-2 border-slate-200 p-4 hover:border-brand-500 hover:bg-brand-50 transition-colors"
                            >
                                <Upload className="h-8 w-8 text-brand-600 mb-2" />
                                <span className="font-medium">Bulk Import</span>
                                <span className="text-xs text-slate-500 mt-1">Multiple athletes</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Gymnast Profile Form */}
                {
                    addingGymnastProfile && mode === 'single' && (
                        <form onSubmit={handleSingleGymnastSubmit} className="max-h-[70vh] overflow-y-auto -mx-6 px-6">
                            {/* Header */}
                            <div className="flex items-center justify-between sticky top-0 bg-white pb-4 pt-1 z-10 border-b border-slate-100 -mx-6 px-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100">
                                        <Users className="h-5 w-5 text-brand-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900">{initialData ? 'Edit Athlete' : 'New Athlete'}</h4>
                                        <p className="text-xs text-slate-500">Enter gymnast information</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
                                >
                                    <ChevronDown className="h-4 w-4 rotate-90" />
                                    Back
                                </button>
                            </div>

                            <div className="space-y-6 pt-6">
                                {/* Basic Information Card */}
                                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                                        <User className="h-4 w-4 text-slate-500" />
                                        <h5 className="text-sm font-semibold text-slate-700">Basic Information</h5>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1.5">First Name <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    value={firstName}
                                                    onChange={(e) => setFirstName(e.target.value)}
                                                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                                                    placeholder="Jane"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1.5">Last Name <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    value={lastName}
                                                    onChange={(e) => setLastName(e.target.value)}
                                                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                                                    placeholder="Doe"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1.5">Date of Birth <span className="text-red-500">*</span></label>
                                                <input
                                                    type="date"
                                                    value={dateOfBirth}
                                                    onChange={(e) => setDateOfBirth(e.target.value)}
                                                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1.5">Gender</label>
                                                <select
                                                    value={gender}
                                                    onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other' | '')}
                                                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow bg-white"
                                                >
                                                    <option value="">Select...</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1.5">Level</label>
                                                {levels.length > 0 ? (
                                                    <select
                                                        value={level}
                                                        onChange={(e) => setLevel(e.target.value)}
                                                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow bg-white"
                                                    >
                                                        <option value="">Select level...</option>
                                                        {levels.map((lvl) => (
                                                            <option key={lvl} value={lvl}>{lvl}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={level}
                                                        onChange={(e) => setLevel(e.target.value)}
                                                        placeholder="e.g., Level 3"
                                                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                                                    />
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 mb-1.5">ID Type</label>
                                                    <select
                                                        value={memberIdType}
                                                        onChange={(e) => setMemberIdType(e.target.value as 'USAG' | 'AAU' | 'Other' | '')}
                                                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow bg-white"
                                                    >
                                                        <option value="">-</option>
                                                        <option value="USAG">USAG</option>
                                                        <option value="AAU">AAU</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Member ID</label>
                                                    <input
                                                        type="text"
                                                        value={memberId}
                                                        onChange={(e) => setMemberId(e.target.value)}
                                                        placeholder="ID #"
                                                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1.5">T-Shirt Size</label>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                                                        <button
                                                            key={size}
                                                            type="button"
                                                            onClick={() => setTshirtSize(tshirtSize === size ? '' : size as any)}
                                                            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${tshirtSize === size
                                                                    ? 'bg-brand-600 text-white border-brand-600'
                                                                    : 'bg-white text-slate-600 border-slate-300 hover:border-brand-300'
                                                                }`}
                                                        >
                                                            {size}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1.5">Leo Size</label>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {['XS', 'S', 'M', 'L', 'XL', 'AS', 'AM', 'AL', 'AXL'].map((size) => (
                                                        <button
                                                            key={size}
                                                            type="button"
                                                            onClick={() => setLeoSize(leoSize === size ? '' : size as any)}
                                                            className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-all ${leoSize === size
                                                                    ? 'bg-brand-600 text-white border-brand-600'
                                                                    : 'bg-white text-slate-600 border-slate-300 hover:border-brand-300'
                                                                }`}
                                                        >
                                                            {size}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Primary Guardian Card */}
                                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                                        <Phone className="h-4 w-4 text-slate-500" />
                                        <h5 className="text-sm font-semibold text-slate-700">Primary Guardian</h5>
                                    </div>
                                    <div className="p-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1.5">First Name</label>
                                                <input
                                                    type="text"
                                                    value={g1FirstName}
                                                    onChange={(e) => setG1FirstName(e.target.value)}
                                                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                                                    placeholder="First name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1.5">Last Name</label>
                                                <input
                                                    type="text"
                                                    value={g1LastName}
                                                    onChange={(e) => setG1LastName(e.target.value)}
                                                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                                                    placeholder="Last name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
                                                <input
                                                    type="email"
                                                    value={g1Email}
                                                    onChange={(e) => setG1Email(e.target.value)}
                                                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                                                    placeholder="email@example.com"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1.5">Phone</label>
                                                <input
                                                    type="tel"
                                                    value={g1Phone}
                                                    onChange={(e) => setG1Phone(e.target.value)}
                                                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                                                    placeholder="(555) 123-4567"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Secondary Guardian Card */}
                                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                                        <Heart className="h-4 w-4 text-slate-500" />
                                        <h5 className="text-sm font-semibold text-slate-700">Secondary Guardian</h5>
                                        <span className="text-xs text-slate-400 ml-auto">Optional</span>
                                    </div>
                                    <div className="p-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1.5">First Name</label>
                                                <input
                                                    type="text"
                                                    value={g2FirstName}
                                                    onChange={(e) => setG2FirstName(e.target.value)}
                                                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                                                    placeholder="First name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1.5">Last Name</label>
                                                <input
                                                    type="text"
                                                    value={g2LastName}
                                                    onChange={(e) => setG2LastName(e.target.value)}
                                                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                                                    placeholder="Last name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
                                                <input
                                                    type="email"
                                                    value={g2Email}
                                                    onChange={(e) => setG2Email(e.target.value)}
                                                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                                                    placeholder="email@example.com"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1.5">Phone</label>
                                                <input
                                                    type="tel"
                                                    value={g2Phone}
                                                    onChange={(e) => setG2Phone(e.target.value)}
                                                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                                                    placeholder="(555) 123-4567"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Medical Information Card */}
                                <div className="rounded-xl border border-red-200 bg-white overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-200">
                                        <Shield className="h-4 w-4 text-red-500" />
                                        <h5 className="text-sm font-semibold text-red-700">Medical Information</h5>
                                        <span className="text-xs text-red-400 ml-auto">Confidential</span>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1.5">Allergies</label>
                                                <textarea
                                                    value={allergies}
                                                    onChange={(e) => setAllergies(e.target.value)}
                                                    rows={2}
                                                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow resize-none"
                                                    placeholder="List any allergies..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1.5">Medications</label>
                                                <textarea
                                                    value={medications}
                                                    onChange={(e) => setMedications(e.target.value)}
                                                    rows={2}
                                                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow resize-none"
                                                    placeholder="Current medications..."
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Medical Conditions</label>
                                            <textarea
                                                value={conditions}
                                                onChange={(e) => setConditions(e.target.value)}
                                                rows={2}
                                                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow resize-none"
                                                placeholder="Any conditions coaches should be aware of..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Additional Notes</label>
                                            <textarea
                                                value={medicalNotes}
                                                onChange={(e) => setMedicalNotes(e.target.value)}
                                                rows={2}
                                                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow resize-none"
                                                placeholder="Other important information..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Error/Success Messages */}
                                {error && (
                                    <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-red-800">Error</p>
                                            <p className="text-sm text-red-700 mt-0.5">{error}</p>
                                        </div>
                                    </div>
                                )}

                                {success && (
                                    <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-start gap-3">
                                        <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-green-800">Success</p>
                                            <p className="text-sm text-green-700 mt-0.5">{success}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center gap-3 pt-2 pb-4 sticky bottom-0 bg-white border-t border-slate-100 -mx-6 px-6 mt-6">
                                    {initialData && (
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            disabled={loading || !!success}
                                            className="inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </button>
                                    )}
                                    <div className="flex-1" />
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || !!success}
                                        className="inline-flex items-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-sm"
                                    >
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {initialData ? 'Save Changes' : 'Add Athlete'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )
                }

                {
                    mode === 'single' && selectedRole && !addingGymnastProfile && (
                        <form onSubmit={handleSingleSubmit} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-slate-900">
                                    Add {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                                </h4>
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="text-sm text-brand-600 hover:text-brand-700"
                                >
                                    Back
                                </button>
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                                    placeholder="user@example.com"
                                    required
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    The user must already have an account.
                                </p>
                            </div>

                            {error && (
                                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 flex items-center">
                                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
                                    {success}
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 pt-4">
                                {initialData && (
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={loading || !!success}
                                        className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 mr-auto"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2 inline-block" />
                                        Delete
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !!success}
                                    className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                                >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {initialData ? 'Save Changes' : 'Add Member'}
                                </button>
                            </div>
                        </form>
                    )
                }

                {/* Bulk Import Form */}
                {
                    mode === 'bulk' && addingGymnastProfile && (
                        <form onSubmit={handleBulkSubmit} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-slate-900">Bulk Import Gymnasts</h4>
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="text-sm text-brand-600 hover:text-brand-700"
                                >
                                    Back
                                </button>
                            </div>

                            <div>
                                <label htmlFor="rollSheetFile" className="block text-sm font-medium text-slate-700">
                                    Upload Roll Sheet
                                </label>
                                <div className="mt-2">
                                    <label
                                        htmlFor="rollSheetFile"
                                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100"
                                    >
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 mb-2 text-slate-500" />
                                            <p className="mb-2 text-sm text-slate-500">
                                                <span className="font-semibold">Click to upload</span> or drag and drop
                                            </p>
                                            <p className="text-xs text-slate-500">iClassPro roll sheet (HTML file)</p>
                                            {bulkFile && (
                                                <p className="mt-2 text-sm text-brand-600 font-medium">{bulkFile.name}</p>
                                            )}
                                        </div>
                                        <input
                                            id="rollSheetFile"
                                            type="file"
                                            className="hidden"
                                            accept=".html,.htm"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setBulkFile(e.target.files[0]);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                    Upload an iClassPro roll sheet HTML file. The system will automatically extract gymnast names, birthdates, gender, level, and guardian information.
                                </p>
                            </div>

                            {error && (
                                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 flex items-start">
                                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {success && (
                                <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
                                    {success}
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !!success}
                                    className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                                >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Import Gymnasts
                                </button>
                            </div>
                        </form>
                    )
                }
            </div>
        </Modal>
    );
}
