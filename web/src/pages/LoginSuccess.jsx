import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// ✅ Version 4+ uses a named import: { jwtDecode }
import { jwtDecode } from 'jwt-decode'; 

const LoginSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (!token) {
      console.error('No token found in URL');
      navigate('/login', { replace: true });
      return;
    }

    try {
      // 1. Save the short-lived Access Token
      localStorage.setItem('token', token);

      // 2. Decode the token to get user info (id, role, etc.)
      const decoded = jwtDecode(token); 
      
      // 3. Store the user object
      // Make sure the structure matches what your manual login stores
      const userObj = {
        id: decoded.id,
        role: decoded.role,
        name: decoded.name || 'User', // Fallback if name isn't in JWT
      };
      localStorage.setItem('user', JSON.stringify(userObj));

      // 4. Role-based Redirect
      const role = decoded?.role || 'user';
      
      if (role === 'admin') {
        navigate('/admin/users', { replace: true });
      } else if (role === 'enterprise') {
        navigate('/enterprise/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }

    } catch (err) {
      console.error('Login process failed:', err);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login', { replace: true });
    }
  }, [location, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-blue-50 dark:bg-gray-950 text-slate-800 dark:text-white">
       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
       <p className="text-lg font-semibold tracking-tight">Securing your session...</p>
    </div>
  );
};

export default LoginSuccess;