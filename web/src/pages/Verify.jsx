import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyOtp } from '../api/authApi';
import { useTheme } from '../context/ThemeContext';

const Verify = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  
  // Get email passed from Register page
  const email = location.state?.email;

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await verifyOtp({ email, otp });
      
      // Auto-Login: Save token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      alert('Verification Successful!');
      navigate('/dashboard'); // Go straight to dashboard
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300 bg-blue-50 dark:bg-gray-900">
      <div className="max-w-5xl w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[600px]">
        
        {/* LEFT SIDE - FORM */}
        <div className="w-full md:w-1/2 p-10 flex flex-col justify-center bg-[#dbeafe] dark:bg-slate-800 transition-colors duration-300">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2 opacity-80">Serani AI</h2>
            <h1 className="text-3xl font-bold text-white">Verify Email</h1>
            <p className="text-white/80 mt-2">
              We sent a code to <br/> <span className="font-bold text-white">{email || 'your email'}</span>
            </p>
          </div>

          {error && <p className="text-red-500 text-center mb-4 bg-white/80 p-2 rounded">{error}</p>}

          <form onSubmit={handleVerify} className="space-y-6 w-full max-w-sm mx-auto">
            <div>
              <label className="block text-white text-sm mb-1 text-center">Enter 6-Digit Code</label>
              <input
                type="text"
                placeholder="000000"
                maxLength="6"
                className="w-full px-4 py-4 rounded-lg border-none focus:ring-2 focus:ring-blue-400 text-center text-3xl tracking-[0.5em] font-bold text-gray-800"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition duration-300 shadow-lg disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white text-xs">
              Didn't receive code? <button className="font-bold hover:underline">Resend</button>
            </p>
            <p className="text-white text-xs mt-4">
              <button onClick={() => navigate('/register')} className="hover:underline">Back to Register</button>
            </p>
          </div>
        </div>

        {/* RIGHT SIDE - ROBOT & TOGGLE */}
        <div className="hidden md:flex w-1/2 bg-[#f0f9ff] dark:bg-gray-800 flex-col items-center justify-center relative transition-colors duration-300">
          <img 
            src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png" 
            alt="Serani AI Robot" 
            className="w-64 h-64 object-contain mb-6 animate-bounce drop-shadow-xl"
          />
          <h1 className="text-5xl font-bold text-black dark:text-white mb-2 transition-colors">Almost There!</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 font-medium transition-colors">Secure your account</p>
          
          {/* THEME TOGGLE */}
          <div className="mt-8 flex bg-white dark:bg-gray-700 rounded-full p-1 shadow-md transition-colors">
            <button 
              onClick={() => toggleTheme('light')}
              className={`px-4 py-1 rounded-full text-sm font-medium transition-all duration-300 ${theme === 'light' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
            >
              Light mode
            </button>
            <button 
              onClick={() => toggleTheme('dark')}
              className={`px-4 py-1 rounded-full text-sm font-medium transition-all duration-300 ${theme === 'dark' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
            >
              Dark mode
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Verify;