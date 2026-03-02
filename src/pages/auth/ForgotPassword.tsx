import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import teamhubLogo from '../../assets/teamhub-logo.png';

export function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            setError(error.message);
        } else {
            setSent(true);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-alt px-6 py-12">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <img src={teamhubLogo} alt="The Gymnastics TeamHub" className="h-16 w-auto mx-auto mb-6" />
                </div>

                {sent ? (
                    <div className="bg-surface rounded-2xl shadow-sm border border-line p-8 text-center">
                        <div className="w-12 h-12 bg-accent-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-6 h-6 text-accent-600" />
                        </div>
                        <h2 className="text-xl font-bold text-heading mb-2">Check your email</h2>
                        <p className="text-sm text-subtle mb-6">
                            We sent a password reset link to <span className="font-medium">{email}</span>. Click the link in the email to reset your password.
                        </p>
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-sm font-medium text-accent-600 hover:text-accent-500"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to sign in
                        </Link>
                    </div>
                ) : (
                    <div className="bg-surface rounded-2xl shadow-sm border border-line p-8">
                        <h2 className="text-xl font-bold text-heading mb-2">Forgot your password?</h2>
                        <p className="text-sm text-subtle mb-6">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-body mb-1.5">
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    className="block w-full px-4 py-3 rounded-xl border border-line-strong text-heading placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-shadow"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
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
                                    'Send reset link'
                                )}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 text-sm font-medium text-accent-600 hover:text-accent-500"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to sign in
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
