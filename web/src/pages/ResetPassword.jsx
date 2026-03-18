import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/authApi';

const ResetPassword = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const email = location.state?.email;

    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await resetPassword({ email, otp, newPassword });
            alert("Password changed successfully!");
            navigate('/login');
        } catch (err) {
            alert(err.response?.data?.message || "Reset failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-blue-50 dark:bg-gray-950 transition-colors">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-2xl">
                <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white text-center">Set New Password</h2>
                <p className="text-slate-500 dark:text-slate-400 text-center mt-2 mb-8">Enter the code sent to {email}</p>
                
                <form onSubmit={handleReset} className="space-y-5">
                    <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">6-Digit Code</label>
                        <input
                            type="text"
                            maxLength="6"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-center text-2xl tracking-widest font-bold"
                            placeholder="000000"
                            onChange={(e) => setOtp(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">New Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                            placeholder="••••••••"
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 transition shadow-lg"
                    >
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;