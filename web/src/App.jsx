import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Public Pages
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Verify = lazy(() => import("./pages/Verify"));
const Subscription = lazy(() => import("./pages/Subscription"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const LoginSuccess = lazy(() => import("./pages/LoginSuccess"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Admin Pages

/* ---------------- ADMIN PAGES ---------------- */

import AdminLayout from "./layouts/AdminLayout";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminLessons from "./pages/admin/AdminLessons";
import AdminTasks from "./pages/admin/AdminTasks";

/* ---------------- USER PAGES ---------------- */

import UserLayout from "./layouts/UserLayout";
import DashboardHome from "./pages/user/DashboardHome";
import AIChat from "./pages/user/AIChatbot/AIChat";
import Journal from "./pages/user/Journal";
import Courses from "./pages/user/Courses";
import CourseDetails from "./pages/user/CourseDetails";
import TasksPage from "./pages/user/TasksPage";

/* ---------------- COMPONENTS ---------------- */

import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <Router>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen">
            <div className="loader"></div>
          </div>
        }
      >
        <Routes>
          {/* ---------- PUBLIC ROUTES ---------- */}

          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login-success" element={<LoginSuccess />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/subscription" element={<Subscription />} />

          {/* ---------- USER DASHBOARD ROUTES ---------- */}

          <Route
            element={
              <PrivateRoute allowedRoles={["user", "enterprise", "admin"]} />
            }
          >
            <Route path="/dashboard" element={<UserLayout />}>
              {/* Dashboard Home */}
              <Route index element={<DashboardHome />} />

              {/* Chat */}
              <Route path="chat" element={<AIChat />} />

              {/* Journal */}
              <Route path="journal" element={<Journal />} />

              {/* Courses Page */}
              <Route path="courses" element={<Courses />} />

              {/* Daily Tasks Page */}
              <Route path="tasks" element={<TasksPage />} />

              {/* Course Details Page */}
              <Route path="course/:courseId" element={<CourseDetails />} />
            </Route>
          </Route>

          {/* ---------- ADMIN ROUTES ---------- */}

          <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
            <Route path="/admin" element={<AdminLayout />}>
              {/* Admin Dashboard */}
              <Route index element={<AdminUsers />} />

              {/* Users */}
              <Route path="users" element={<AdminUsers />} />

              {/* Courses */}
              <Route path="courses" element={<AdminCourses />} />

              {/* Tasks */}
              <Route path="tasks" element={<AdminTasks />} />

              {/* Lessons inside a course */}
              <Route
                path="courses/:courseId/lessons"
                element={<AdminLessons />}
              />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
