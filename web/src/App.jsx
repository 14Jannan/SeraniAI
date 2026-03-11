import React, {lazy, Suspense} from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Public Pages
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Verify = lazy(() => import('./pages/Verify'));
const Subscription = lazy(() => import('./pages/Subscription'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const LoginSuccess = lazy(()=>import('./pages/LoginSuccess'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// Admin Pages
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));  
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));

// User Pages (New Imports)
import UserLayout from './layouts/UserLayout';
import DashboardHome from './pages/user/DashboardHome';
import AIChat from './pages/user/AIChat';
import Journal from './pages/user/Journal';
import Courses from './pages/user/Courses';

// Components
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="loader"></div></div>}>

      <Routes>
        {/* --- PUBLIC ROUTES --- */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/login-success" element={<LoginSuccess />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/subscription" element={<Subscription />} />

        {/* --- PROTECTED USER DASHBOARD ROUTES --- */}
        {/* Accessible by 'user', 'enterprise', and 'admin' roles */}
        <Route element={<PrivateRoute allowedRoles={['user', 'enterprise', 'admin']} />}>
          <Route path="/dashboard" element={<UserLayout />}>
            {/* Default page when going to /dashboard */}
            <Route index element={<DashboardHome />} />
            
            {/* Sub-pages */}
            <Route path="chat" element={<AIChat />} />
            <Route path="journal" element={<Journal />} />
            <Route path="courses" element={<Courses />} />
          </Route>
        </Route>

        {/* --- PROTECTED ADMIN ROUTES --- */}
        {/* Accessible ONLY by 'admin' role */}
        <Route element={<PrivateRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminUsers />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
        </Route>
      </Routes>
</Suspense>

    </Router>
  );
}

export default App;