import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Public Pages
import Landing from './pages/Landing'; 
import Login from './pages/Login';
import Register from './pages/Register';
import Verify from './pages/Verify';

// Admin Pages
import AdminLayout from './layouts/AdminLayout';
import AdminUsers from './pages/admin/AdminUsers';

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
      <Routes>
        {/* --- PUBLIC ROUTES --- */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<Verify />} />

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
    </Router>
  );
}

export default App;