import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = ({ allowedRoles }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token || !user) {
    // Not logged in, redirect to login
    return <Navigate to="/" replace />;
  }

  // Check if the user's role is in the allowedRoles array
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Logged in but wrong role, redirect to a "not authorized" page or dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // User is authenticated and authorized, render the child components
  return <Outlet />;
};

export default PrivateRoute;