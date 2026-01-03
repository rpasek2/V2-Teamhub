import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, Calendar, Trophy, MessageSquare, ChevronRight, Users } from 'lucide-react';
import teamhubLogo from '../../assets/teamhub-logo.svg';

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
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Hero Section */}
            <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-300 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
                    <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-brand-200 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center items-center px-12 xl:px-20 text-center">
                    {/* Logo/Brand */}
                    <div className="mb-12">
                        <div className="flex items-center justify-center gap-3 mb-8">
                            <img src={teamhubLogo} alt="TeamHub" className="h-64 xl:h-80 w-auto" />
                        </div>
                        <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
                            Your Team's<br />
                            <span className="text-brand-200">Command Center</span>
                        </h1>
                        <p className="text-lg text-brand-100 max-w-md">
                            The all-in-one platform for managing your gymnastics team, from roster to competitions.
                        </p>
                    </div>

                    {/* Features */}
                    <div className="space-y-6">
                        {features.map((feature, index) => (
                            <div key={index} className="flex items-start gap-4 group">
                                <div className="flex-shrink-0 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                    <feature.icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                                    <p className="text-brand-200 text-sm">{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center px-6 py-12 bg-white">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <img src={teamhubLogo} alt="TeamHub" className="h-48 w-auto mx-auto" />
                    </div>

                    {/* Form Header */}
                    <div className="text-center lg:text-left mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                            Welcome back
                        </h2>
                        <p className="text-slate-600">
                            Sign in to access your team dashboard
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="block w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                                    Password
                                </label>
                                <button type="button" className="text-sm text-brand-600 hover:text-brand-500 font-medium">
                                    Forgot password?
                                </button>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="block w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
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
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                            <div className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-slate-500">New to TeamHub?</span>
                        </div>
                    </div>

                    {/* Sign Up Link */}
                    <Link
                        to="/register"
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:border-brand-300 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
                    >
                        Create an account
                    </Link>

                    {/* Footer */}
                    <p className="mt-8 text-center text-xs text-slate-500">
                        By signing in, you agree to our{' '}
                        <a href="#" className="text-brand-600 hover:underline">Terms of Service</a>
                        {' '}and{' '}
                        <a href="#" className="text-brand-600 hover:underline">Privacy Policy</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
