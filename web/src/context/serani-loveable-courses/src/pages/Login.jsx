import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/authApi';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub, FaFacebook } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login({ email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.user.role === 'admin') {
        navigate('/admin/users'); // Admins go to User Management
      } else if (data.user.role === 'enterprise') {
        navigate('/enterprise/dashboard'); // Future enterprise route
      } else {
        navigate('/dashboard'); // Normal users go to dashboard
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    // MAIN CONTAINER
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 transition-colors duration-500 bg-blue-50 dark:bg-gray-950">
      
      {/* CARD CONTAINER */}
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] transition-all duration-500">
        
        {/* LEFT SIDE - LOGIN FORM */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center bg-blue-100/50 dark:bg-slate-800/50 transition-colors duration-500">
          
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Serani AI</h2>
            <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white">Welcome Back</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Please enter your details to sign in.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-100 border border-red-200 text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 w-full max-w-sm mx-auto">
            
            {/* Email Input */}
            <div>
              <label className="block text-slate-600 dark:text-slate-300 text-sm font-semibold mb-2 ml-1">Email Address</label>
              <input
                type="email"
                placeholder="username@gmail.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300 placeholder-slate-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-slate-600 dark:text-slate-300 text-sm font-semibold mb-2 ml-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300 placeholder-slate-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="text-right mt-2">
                <a href="#" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">Forgot Password?</a>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 dark:bg-blue-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-slate-800 dark:hover:bg-blue-700 transform hover:-translate-y-0.5 transition-all duration-300 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Social Login */}
          <div className="mt-8 text-center">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-bold">Or continue with</span>
              <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
            </div>

            <div className="flex justify-center gap-4 mt-4">
              <button className="bg-white dark:bg-slate-700 p-3 rounded-full shadow-md hover:shadow-lg hover:scale-110 transition-all duration-300 border border-slate-100 dark:border-slate-600">
                <FcGoogle size={24} />
              </button>
              <button className="bg-white dark:bg-slate-700 p-3 rounded-full shadow-md hover:shadow-lg hover:scale-110 transition-all duration-300 border border-slate-100 dark:border-slate-600">
                <FaGithub size={24} className="text-slate-800 dark:text-white" />
              </button>
              <button className="bg-white dark:bg-slate-700 p-3 rounded-full shadow-md hover:shadow-lg hover:scale-110 transition-all duration-300 border border-slate-100 dark:border-slate-600">
                <FaFacebook size={24} className="text-blue-600" />
              </button>
            </div>

            <p className="text-slate-500 dark:text-slate-400 text-sm mt-8">
              Don't have an account? <Link to="/register" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Register for free</Link>
            </p>
          </div>
        </div>

        {/* RIGHT SIDE - ROBOT & TOGGLE (Hidden on Mobile) */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-800 flex-col items-center justify-center relative transition-colors duration-500 border-l border-slate-100 dark:border-slate-700">
          
          {/* Robot Image with Glow Effect */}
          <div className="relative">
            <div className="absolute -inset-4 bg-blue-400/20 dark:bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
            <img 
              src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png" 
              alt="Serani AI Robot" 
              className="w-72 h-72 object-contain mb-8 animate-bounce relative z-10 drop-shadow-2xl"
            />
          </div>
          
          <h1 className="text-5xl font-black text-slate-800 dark:text-white mb-3 tracking-tight transition-colors">SeraniAI</h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium transition-colors">Your Intelligent Companion</p>
          
          {/* THEME TOGGLE PILL */}
          <div className="mt-10 flex bg-slate-200 dark:bg-slate-700 rounded-full p-1.5 shadow-inner transition-colors">
            <button 
              onClick={() => toggleTheme('light')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                theme === 'light' 
                  ? 'bg-white text-blue-600 shadow-md transform scale-105' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Light
            </button>
            <button 
              onClick={() => toggleTheme('dark')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                theme === 'dark' 
                  ? 'bg-slate-800 text-blue-400 shadow-md transform scale-105' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Dark
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Login;