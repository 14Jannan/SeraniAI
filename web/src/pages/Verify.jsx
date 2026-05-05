import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyOtp, resendOtp } from '../api/authApi';
import { useTheme } from '../context/ThemeContext';

const Verify = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false); // add this
  const [resendMessage, setResendMessage] = useState('');
  
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

  const handleResend = async()=>{
    if(!email){
      setError('Email not found. Please go back and register again');
      return;
    }

    setResendLoading(true);
    setError('');
    setResendMessage('');

    try{
      await resendOtp({ email });
      setResendMessage('OTP resent successfully! Please check your email.');
      setOtp('');
    }catch(err){
      setError(err.response?.data?.message || 'Failed to resend OTP. Please try again.');
    }finally{
      setResendLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300 bg-blue-50 dark:bg-gray-900">
      <div className="max-w-5xl w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[600px]">
        
        {/* LEFT SIDE - FORM */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center bg-blue-100/50 dark:bg-slate-800/50 transition-colors duration-500">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2 opacity-80">Serani AI</h2>
            <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white">Verify Email</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              We sent a code to <br/> <span className="font-bold text-slate-700 dark:text-white">{email || 'your email'}</span>
            </p>
          </div>

          {error && <p className="text-red-500 text-center mb-4 bg-white/80 p-2 rounded">{error}</p>}

          <form onSubmit={handleVerify} className="space-y-6 w-full max-w-sm mx-auto">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2 text-center">Enter 6-Digit Code</label>
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
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-8">
              Didn't receive code? <button onClick={handleResend} disabled={resendLoading} className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
              >{resendLoading ? 'Sending...':'Resend'}</button>
            </p>
            {resendMessage && <p className="text-green-300 text-xs mt-2">{resendMessage}</p>}
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
              <button onClick={() => navigate('/register')} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Back to Register</button>
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