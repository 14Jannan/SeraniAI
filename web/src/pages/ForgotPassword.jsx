import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword } from '../api/authApi';
import { useTheme } from '../context/ThemeContext';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const { theme } = useTheme();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await forgotPassword({ email });
            // Move to reset page and pass email along
            navigate('/reset-password', { state: { email } });
        } catch (err) {
            alert(err.response?.data?.message || "Error sending OTP");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-blue-50 dark:bg-gray-950 transition-colors">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-2xl">
                <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white text-center">Forgot Password?</h2>
                <p className="text-slate-500 dark:text-slate-400 text-center mt-3 mb-8">Enter your email and we'll send you a 6-digit reset code.</p>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2 ml-1">Email Address</label>
                        <input
                            type="email"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="your-email@example.com"
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#0F172A] dark:bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:opacity-90 transition shadow-lg disabled:opacity-50"
                    >
                        {loading ? 'Sending Code...' : 'Send Reset Code'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForgotPassword;