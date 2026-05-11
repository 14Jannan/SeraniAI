import React from "react";
import { Navigate } from "react-router-dom";
import {
  getAuthDestination,
  getStoredUser,
  hasStoredAuth,
} from "../utils/authStorage";

const PublicOnlyRoute = ({ children }) => {
  if (hasStoredAuth()) {
    return <Navigate to={getAuthDestination(getStoredUser())} replace />;
  }

  return children;
};

export default PublicOnlyRoute;
