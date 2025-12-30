import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, Check, ChevronRight, ArrowLeft, X } from 'lucide-react';
import teamhubLogo from '../../assets/teamhub-logo.svg';

// Password strength validation
interface PasswordStrength {
    score: number; // 0-4
    label: string;
    color: string;
    requirements: {
        minLength: boolean;
        hasUppercase: boolean;
        hasLowercase: boolean;
        hasNumber: boolean;
    };
}

function getPasswordStrength(password: string): PasswordStrength {
    const requirements = {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
    };

    const score = Object.values(requirements).filter(Boolean).length;

    let label = 'Too weak';
    let color = 'bg-red-500';

    if (score === 4) {
        label = 'Strong';
        color = 'bg-green-500';
    } else if (score === 3) {
        label = 'Good';
        color = 'bg-yellow-500';
    } else if (score === 2) {
        label = 'Fair';
        color = 'bg-orange-500';
    }

    return { score, label, color, requirements };
}

const benefits = [
    'Unlimited team members and athletes',
    'Competition and event management',
    'Built-in messaging and groups',
    'Mobile-friendly access anywhere',
    'Secure cloud storage for documents',
    'Real-time updates and notifications'
];

export function Register() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [organization, setOrganization] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
    const isPasswordValid = passwordStrength.score >= 3; // Require at least "Good" strength

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate password strength before submitting
        if (!isPasswordValid) {
            setError('Please create a stronger password that meets all requirements');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        organization: organization || null,
                    },
                },
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
            <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-purple-600 via-brand-600 to-brand-700 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-300 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
                    <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-purple-300 rounded-full blur-3xl" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center items-center px-12 xl:px-20 text-center">
                    {/* Logo/Brand */}
                    <div className="mb-12">
                        <div className="flex items-center justify-center gap-3 mb-8">
                            <img src={teamhubLogo} alt="TeamHub" className="h-64 xl:h-80 w-auto" />
                        </div>
                        <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
                            Start Managing<br />
                            <span className="text-purple-200">Your Team Today</span>
                        </h1>
                        <p className="text-lg text-purple-100 max-w-md">
                            Join thousands of coaches and team managers who trust TeamHub for their organization needs.
                        </p>
                    </div>

                    {/* Benefits List */}
                    <div className="space-y-4">
                        <h3 className="text-white font-semibold text-lg mb-4">Everything you need:</h3>
                        {benefits.map((benefit, index) => (
                            <div key={index} className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-purple-100">{benefit}</span>
                            </div>
                        ))}
                    </div>

                    {/* Quote */}
                    <div className="mt-12 pt-8 border-t border-white/10">
                        <blockquote className="text-purple-100 italic text-lg">
                            "TeamHub transformed how we manage our gymnastics program. Everything is organized and accessible."
                        </blockquote>
                        <div className="mt-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold">JD</span>
                            </div>
                            <div>
                                <div className="text-white font-medium">Jane Doe</div>
                                <div className="text-purple-200 text-sm">Head Coach, Elite Gymnastics</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Register Form */}
            <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center px-6 py-12 bg-white">
                <div className="w-full max-w-md">
                    {/* Back to Login - Mobile */}
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-600 mb-6 lg:mb-8"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to sign in
                    </Link>

                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <img src={teamhubLogo} alt="TeamHub" className="h-48 w-auto mx-auto" />
                    </div>

                    {/* Form Header */}
                    <div className="text-center lg:text-left mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                            Create your account
                        </h2>
                        <p className="text-slate-600">
                            Get started with TeamHub in just a few steps
                        </p>
                    </div>

                    {/* Register Form */}
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Full name
                            </label>
                            <input
                                id="fullName"
                                name="fullName"
                                type="text"
                                required
                                className="block w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
                                placeholder="John Smith"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>

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
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                className="block w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
                                placeholder="Create a strong password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            {/* Password Strength Indicator */}
                            {password.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {/* Strength Bar */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                                                style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                                            />
                                        </div>
                                        <span className={`text-xs font-medium ${
                                            passwordStrength.score >= 3 ? 'text-green-600' : 'text-slate-500'
                                        }`}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>

                                    {/* Requirements Checklist */}
                                    <div className="grid grid-cols-2 gap-1">
                                        <div className={`flex items-center gap-1 text-xs ${
                                            passwordStrength.requirements.minLength ? 'text-green-600' : 'text-slate-400'
                                        }`}>
                                            {passwordStrength.requirements.minLength ? (
                                                <Check className="w-3 h-3" />
                                            ) : (
                                                <X className="w-3 h-3" />
                                            )}
                                            8+ characters
                                        </div>
                                        <div className={`flex items-center gap-1 text-xs ${
                                            passwordStrength.requirements.hasUppercase ? 'text-green-600' : 'text-slate-400'
                                        }`}>
                                            {passwordStrength.requirements.hasUppercase ? (
                                                <Check className="w-3 h-3" />
                                            ) : (
                                                <X className="w-3 h-3" />
                                            )}
                                            Uppercase letter
                                        </div>
                                        <div className={`flex items-center gap-1 text-xs ${
                                            passwordStrength.requirements.hasLowercase ? 'text-green-600' : 'text-slate-400'
                                        }`}>
                                            {passwordStrength.requirements.hasLowercase ? (
                                                <Check className="w-3 h-3" />
                                            ) : (
                                                <X className="w-3 h-3" />
                                            )}
                                            Lowercase letter
                                        </div>
                                        <div className={`flex items-center gap-1 text-xs ${
                                            passwordStrength.requirements.hasNumber ? 'text-green-600' : 'text-slate-400'
                                        }`}>
                                            {passwordStrength.requirements.hasNumber ? (
                                                <Check className="w-3 h-3" />
                                            ) : (
                                                <X className="w-3 h-3" />
                                            )}
                                            Number
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="organization" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Organization name <span className="text-slate-400 font-normal">(optional)</span>
                            </label>
                            <input
                                id="organization"
                                name="organization"
                                type="text"
                                className="block w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
                                placeholder="Your gym or club name"
                                value={organization}
                                onChange={(e) => setOrganization(e.target.value)}
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
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    Create account
                                    <ChevronRight className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Sign In Link */}
                    <p className="mt-6 text-center text-sm text-slate-600">
                        Already have an account?{' '}
                        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-500">
                            Sign in
                        </Link>
                    </p>

                    {/* Footer */}
                    <p className="mt-8 text-center text-xs text-slate-500">
                        By creating an account, you agree to our{' '}
                        <a href="#" className="text-brand-600 hover:underline">Terms of Service</a>
                        {' '}and{' '}
                        <a href="#" className="text-brand-600 hover:underline">Privacy Policy</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
