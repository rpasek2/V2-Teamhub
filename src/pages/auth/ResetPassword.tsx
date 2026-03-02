import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, CheckCircle } from 'lucide-react';
import teamhubLogo from '../../assets/teamhub-logo.png';

export function ResetPassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setError(error.message);
        } else {
            setSuccess(true);
            setTimeout(() => navigate('/'), 2000);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-alt px-6 py-12">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <img src={teamhubLogo} alt="The Gymnastics TeamHub" className="h-16 w-auto mx-auto mb-6" />
                </div>

                <div className="bg-surface rounded-2xl shadow-sm border border-line p-8">
                    {success ? (
                        <div className="text-center">
                            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-6 h-6 text-emerald-600" />
                            </div>
                            <h2 className="text-xl font-bold text-heading mb-2">Password updated</h2>
                            <p className="text-sm text-subtle">Redirecting you to the dashboard...</p>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-heading mb-2">Set new password</h2>
                            <p className="text-sm text-subtle mb-6">
                                Enter your new password below.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-body mb-1.5">
                                        New password
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        required
                                        className="block w-full px-4 py-3 rounded-xl border border-line-strong text-heading placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-shadow"
                                        placeholder="At least 6 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-body mb-1.5">
                                        Confirm password
                                    </label>
                                    <input
                                        id="confirmPassword"
                                        type="password"
                                        required
                                        className="block w-full px-4 py-3 rounded-xl border border-line-strong text-heading placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-shadow"
                                        placeholder="Re-enter your password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>

                                {error && (
                                    <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent-600 text-white font-semibold hover:bg-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {loading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        'Update password'
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
