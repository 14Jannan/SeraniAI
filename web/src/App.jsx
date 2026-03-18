import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

/* ---------------- PUBLIC PAGES ---------------- */

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Verify from "./pages/Verify";

/* ---------------- ADMIN PAGES ---------------- */

import AdminLayout from "./layouts/AdminLayout";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminLessons from "./pages/admin/AdminLessons";

/* ---------------- USER PAGES ---------------- */

import UserLayout from "./layouts/UserLayout";
import DashboardHome from "./pages/user/DashboardHome";
import AIChat from "./pages/user/AIChat";
import Journal from "./pages/user/Journal";
import Courses from "./pages/user/Courses";
import CourseDetails from "./pages/user/CourseDetails";

/* ---------------- COMPONENTS ---------------- */

import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <Router>
      <Routes>

        {/* ---------- PUBLIC ROUTES ---------- */}

        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<Verify />} />



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

            {/* Course Details Page */}
            <Route
              path="course/:courseId"
              element={<CourseDetails />}
            />

          </Route>
        </Route>



        {/* ---------- ADMIN ROUTES ---------- */}

        <Route
          element={<PrivateRoute allowedRoles={["admin"]} />}
        >
          <Route path="/admin" element={<AdminLayout />}>

            {/* Admin Dashboard */}
            <Route index element={<AdminUsers />} />

            {/* Users */}
            <Route path="users" element={<AdminUsers />} />

            {/* Courses */}
            <Route path="courses" element={<AdminCourses />} />

            {/* Lessons inside a course */}
            <Route
              path="courses/:courseId/lessons"
              element={<AdminLessons />}
            />

          </Route>
        </Route>

      </Routes>
    </Router>
  );
}

export default App;