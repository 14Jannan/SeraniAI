import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/authApi';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub, FaFacebook } from 'react-icons/fa';
import { FiEye, FiEyeOff } from 'react-icons/fi'; // Import Eye icons
import { useTheme } from '../context/ThemeContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // State for visibility
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
        navigate('/admin/users');
      } else if (data.user.role === 'enterprise') {
        navigate('/enterprise/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 transition-colors duration-500 bg-blue-50 dark:bg-gray-950">
      
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] transition-all duration-500">
        
        {/* LEFT SIDE - LOGIN FORM */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center bg-blue-100/50 dark:bg-slate-800/50 transition-colors duration-500">
          
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Serani AI</h2>
            <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white">Welcome Back</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Please enter your details to sign in.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-100 border border-red-200 text-red-600 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 w-full max-w-sm mx-auto">
            
            {/* Email Input */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2 ml-1">Email Address</label>
              <input
                type="email"
                placeholder="username@gmail.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password Input with Eye Icon */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                >
                  {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>
              <div className="text-right mt-2">
                <Link to="/forgot-password" gap-4 className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">Forgot Password?</Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 dark:bg-blue-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-slate-800 dark:hover:bg-blue-700 transform hover:-translate-y-0.5 transition-all duration-300 shadow-lg disabled:opacity-70"
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
              <a href="http://localhost:7001/api/auth/google" className="p-3 rounded-full bg-white shadow-md hover:scale-110 transition duration-300 border border-slate-100 dark:border-slate-600">
                <FcGoogle size={24} />
              </a>
              <a href="http://localhost:7001/api/auth/github" className="p-3 rounded-full bg-white shadow-md hover:scale-110 transition duration-300 border border-slate-100 dark:border-slate-600">
                <FaGithub size={24} className="text-black" />
              </a>
              <a href="http://localhost:7001/api/auth/facebook" className="p-3 rounded-full bg-white shadow-md hover:scale-110 transition duration-300 border border-slate-100 dark:border-slate-600">
                <FaFacebook size={24} className="text-blue-600" />
              </a>
            </div>

            <p className="text-slate-500 dark:text-slate-400 text-sm mt-8">
              Don't have an account? <Link to="/register" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Register for free</Link>
            </p>
          </div>
        </div>

        {/* RIGHT SIDE - ROBOT & TOGGLE */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-800 flex-col items-center justify-center relative transition-colors duration-500 border-l border-slate-100 dark:border-slate-700">
          <div className="relative">
            <div className="absolute -inset-4 bg-blue-400/20 dark:bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
            <img 
              src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png" 
              alt="Serani AI Robot" 
              className="w-72 h-72 object-contain mb-8 animate-bounce relative z-10 drop-shadow-2xl"
            />
          </div>
          
          <h1 className="text-5xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">SeraniAI</h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium">Your Intelligent Companion</p>
          
          <div className="mt-10 flex bg-slate-200 dark:bg-slate-700 rounded-full p-1.5 shadow-inner">
            <button 
              onClick={() => toggleTheme('light')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${theme === 'light' ? 'bg-white text-blue-600 shadow-md transform scale-105' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Light
            </button>
            <button 
              onClick={() => toggleTheme('dark')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${theme === 'dark' ? 'bg-slate-800 text-blue-400 shadow-md transform scale-105' : 'text-slate-500 dark:text-slate-400'}`}
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