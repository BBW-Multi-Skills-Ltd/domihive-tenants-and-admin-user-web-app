import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

const ShellLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--page-bg,#f8f9fa)]">
    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent-color,#9f7539)]"></div>
  </div>
);

export const RequireAuth = ({ children }) => {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) return <ShellLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export const RequireGuest = ({ children }) => {
  const { loading, isAuthenticated } = useAuth();

  if (loading) return <ShellLoader />;

  if (isAuthenticated) {
    return <Navigate to="/dashboard/rent/overview" replace />;
  }

  return children;
};

export default ShellLoader;
