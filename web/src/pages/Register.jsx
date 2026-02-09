import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/authApi';
import { useTheme } from '../context/ThemeContext';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub, FaFacebook } from 'react-icons/fa';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(formData);
      // Redirect to Verify Page passing the email
      navigate('/verify', { state: { email: formData.email } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300 bg-blue-50 dark:bg-gray-900">
      <div className="max-w-5xl w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[650px]">
        
        {/* LEFT SIDE - FORM */}
        <div className="w-full md:w-1/2 p-10 flex flex-col justify-center bg-[#dbeafe] dark:bg-slate-800 transition-colors duration-300">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2 opacity-80">Serani AI</h2>
            <h1 className="text-3xl font-bold text-white">Create Account</h1>
          </div>

          {error && <p className="text-red-500 text-center mb-4 bg-white/80 p-2 rounded">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm mx-auto">
            <div>
              <label className="block text-white text-sm mb-1">Full Name</label>
              <input
                name="name"
                type="text"
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-lg border-none focus:ring-2 focus:ring-blue-400 text-gray-800"
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-white text-sm mb-1">Email</label>
              <input
                name="email"
                type="email"
                placeholder="username@gmail.com"
                className="w-full px-4 py-3 rounded-lg border-none focus:ring-2 focus:ring-blue-400 text-gray-800"
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-white text-sm mb-1">Password</label>
              <input
                name="password"
                type="password"
                placeholder="Create a password"
                className="w-full px-4 py-3 rounded-lg border-none focus:ring-2 focus:ring-blue-400 text-gray-800"
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0f172a] dark:bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-900 transition duration-300 shadow-lg disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white text-sm mb-4">or register with</p>
            <div className="flex justify-center gap-4">
              <button className="bg-white p-2 rounded-full shadow hover:scale-110 transition"><FcGoogle size={24} /></button>
              <button className="bg-white p-2 rounded-full shadow hover:scale-110 transition"><FaGithub size={24} /></button>
              <button className="bg-white p-2 rounded-full shadow hover:scale-110 transition"><FaFacebook size={24} className="text-blue-600" /></button>
            </div>
            <p className="text-white text-xs mt-6">
              Already have an account? <Link to="/" className="font-bold hover:underline">Login here</Link>
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
          <h1 className="text-5xl font-bold text-black dark:text-white mb-2 transition-colors">Join SeraniAI</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 font-medium transition-colors">Start your journey today</p>
          
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

export default Register;