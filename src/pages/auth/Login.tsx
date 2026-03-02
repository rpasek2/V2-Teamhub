import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, Calendar, Trophy, MessageSquare, ChevronRight, Users } from 'lucide-react';
import teamhubLogo from '../../assets/teamhub-logo.png';
import landingLogo from '../../assets/landing-logo.png';

const features = [
    {
        icon: Users,
        title: 'Team Management',
        description: 'Organize your roster, track athletes, and manage staff all in one place.'
    },
    {
        icon: Calendar,
        title: 'Smart Scheduling',
        description: 'Plan practices, competitions, and events with an intuitive calendar.'
    },
    {
        icon: Trophy,
        title: 'Competition Tracking',
        description: 'Manage competition rosters, sessions, and keep everyone informed.'
    },
    {
        icon: MessageSquare,
        title: 'Team Communication',
        description: 'Stay connected with built-in messaging and group discussions.'
    }
];

export function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : '';
            if (message.toLowerCase().includes('invalid login credentials')) {
                setError('Incorrect email or password. Please try again.');
            } else if (message.toLowerCase().includes('email not confirmed')) {
                setError('Your email address has not been confirmed. Please check your inbox for a confirmation link.');
            } else if (message.toLowerCase().includes('too many requests')) {
                setError('Too many login attempts. Please wait a moment and try again.');
            } else {
                setError(message || 'An unexpected error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Hero Section */}
            <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-accent-500 via-accent-600 to-accent-800 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-surface rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-300 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
                    <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-accent-200 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center items-center px-12 xl:px-20 text-center">
                    {/* Logo/Brand */}
                    <div className="mb-12">
                        <div className="flex items-center justify-center mb-8">
                            <img src={landingLogo} alt="The Gymnastics TeamHub" className="h-72 xl:h-80 w-auto" />
                        </div>
                        <p className="text-lg text-accent-100 max-w-md">
                            The all-in-one platform for managing your gymnastics team, from roster to competitions.
                        </p>
                    </div>

                    {/* Features */}
                    <div className="space-y-6">
                        {features.map((feature, index) => (
                            <div key={index} className="flex items-start gap-4 group">
                                <div className="flex-shrink-0 w-10 h-10 bg-surface/10 backdrop-blur-sm rounded-lg flex items-center justify-center group-hover:bg-surface/20 transition-colors">
                                    <feature.icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                                    <p className="text-accent-200 text-sm">{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center px-6 py-12 bg-surface">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <img src={teamhubLogo} alt="The Gymnastics TeamHub" className="h-20 w-auto mx-auto" />
                    </div>

                    {/* Form Header */}
                    <div className="text-center lg:text-left mb-8">
                        <h2 className="text-2xl font-bold text-heading mb-2">
                            Welcome back
                        </h2>
                        <p className="text-subtle">
                            Sign in to access your team dashboard
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-body mb-1.5">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="block w-full px-4 py-3 rounded-xl border border-line-strong text-heading placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-shadow"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="password" className="block text-sm font-medium text-body">
                                    Password
                                </label>
                                <Link to="/forgot-password" className="text-sm font-medium text-accent-600 hover:text-accent-500">
                                    Forgot password?
                                </Link>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="block w-full px-4 py-3 rounded-xl border border-line-strong text-heading placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-shadow"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
                                <>
                                    Sign in
                                    <ChevronRight className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-line" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-surface text-muted">New to The Gymnastics TeamHub?</span>
                        </div>
                    </div>

                    {/* Sign Up Link */}
                    <Link
                        to="/register"
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-line text-body font-semibold hover:border-accent-300 hover:text-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 transition-colors"
                    >
                        Create an account
                    </Link>

                    {/* Footer */}
                    <p className="mt-8 text-center text-xs text-muted">
                        By signing in, you agree to our{' '}
                        <a href="https://twotreesapps-site.web.app/teamhub-terms.html" target="_blank" rel="noopener noreferrer" className="text-accent-600 hover:underline">Terms of Service</a>
                        {' '}and{' '}
                        <a href="https://twotreesapps-site.web.app/teamhub-privacy.html" target="_blank" rel="noopener noreferrer" className="text-accent-600 hover:underline">Privacy Policy</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
