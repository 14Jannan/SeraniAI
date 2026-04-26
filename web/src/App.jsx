import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Public Pages
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Verify = lazy(() => import("./pages/Verify"));
const Subscription = lazy(() => import("./pages/user/Subscription"));
const PersonalCheckout = lazy(() =>
  import("./pages/user/checkout/PersonalCheckout")
);
const EnterpriseCheckout = lazy(() =>
  import("./pages/user/checkout/EnterpriseCheckout")
);
const AcceptEnterpriseInvite = lazy(() =>
  import("./pages/user/AcceptEnterpriseInvite")
);
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const LoginSuccess = lazy(() => import("./pages/LoginSuccess"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Admin Pages

/* ---------------- ADMIN PAGES ---------------- */

import AdminLayout from "./layouts/AdminLayout";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminLessons from "./pages/admin/AdminLessons";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminTasks from "./pages/admin/AdminTasks";
import EnterpriseAdmin from "./pages/user/enterpriseAdmin/EnterpriseAdmin";

/* ---------------- USER PAGES ---------------- */

import UserLayout from "./layouts/UserLayout";
import DashboardHome from "./pages/user/DashboardHome";
import AIChat from "./pages/user/AIChatbot/AIChat";
import Courses from "./pages/user/Courses";
import CourseDetails from "./pages/user/CourseDetails";
import TasksPage from "./pages/user/TasksPage";

/* ---------------- COMPONENTS ---------------- */

import PrivateRoute from "./components/PrivateRoute";
import JournalRouteGuard from "./components/JournalRouteGuard";
import PlanFeatureGate from "./components/PlanFeatureGate";

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
          <Route
            path="/enterprise/invite/accept"
            element={<AcceptEnterpriseInvite />}
          />
          <Route path="/subscription" element={<Subscription />} />
          <Route
            path="/subscription/checkout/personal/:planId"
            element={<PersonalCheckout />}
          />
          <Route
            path="/subscription/checkout/enterprise/:planId"
            element={<EnterpriseCheckout />}
          />

          {/* ---------- USER DASHBOARD ROUTES ---------- */}

          <Route
            element={
              <PrivateRoute
                allowedRoles={[
                  "user",
                  "enterpriseUser",
                  "enterpriseAdmin",
                  "enterprise",
                  "(Pro)PlanUser",
                  "admin",
                ]}
              />
            }
          >
            <Route path="/dashboard" element={<UserLayout />}>
              {/* Dashboard Home */}
              <Route index element={<DashboardHome />} />

              {/* Chat */}
              <Route
                path="chat"
                element={
                  <PlanFeatureGate
                    featureName="AI Chat"
                    description="AI Chat is available on Premium. Upgrade to continue with unlimited assistant support."
                  >
                    <AIChat />
                  </PlanFeatureGate>
                }
              />

              {/* Journal */}
              <Route path="journal" element={<JournalRouteGuard />} />

              {/* Courses Page */}
              <Route
                path="courses"
                element={
                  <PlanFeatureGate
                    featureName="Courses"
                    description="Courses are available on Premium. Upgrade to access your full learning path."
                  >
                    <Courses />
                  </PlanFeatureGate>
                }
              />

              {/* Daily Tasks */}
              <Route
                path="tasks"
                element={
                  <PlanFeatureGate
                    featureName="Daily Tasks"
                    description="Daily tasks and progress tracking are available on Premium."
                  >
                    <TasksPage />
                  </PlanFeatureGate>
                }
              />

              {/* Enterprise Manager (EnterpriseAdmin only) */}
              <Route
                path="enterprise-manager"
                element={
                  <PrivateRoute allowedRoles={["enterpriseAdmin"]}>
                    <EnterpriseAdmin />
                  </PrivateRoute>
                }
              />

              {/* Course Details Page */}
              <Route
                path="course/:courseId"
                element={
                  <PlanFeatureGate
                    featureName="Course Details"
                    description="Detailed lessons and course content are available on Premium."
                  >
                    <CourseDetails />
                  </PlanFeatureGate>
                }
              />

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

              {/* Lessons inside a course */}
              <Route
                path="courses/:courseId/lessons"
                element={<AdminLessons />}
              />

              {/* Tasks */}
              <Route path="tasks" element={<AdminTasks />} />

              {/* Subscriptions */}
              <Route path="subscriptions" element={<AdminSubscriptions />} />
            </Route>
          </Route>

        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
