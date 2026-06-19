import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// ==================== LAZY IMPORTS - PUBLIC PAGES ====================
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Verify = lazy(() => import("./pages/Verify"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const LoginSuccess = lazy(() => import("./pages/LoginSuccess"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// ==================== LAZY IMPORTS - SUBSCRIPTION PAGES ====================
const Subscription = lazy(() => import("./pages/user/Subscription"));
const PersonalCheckout = lazy(
  () => import("./pages/user/checkout/PersonalCheckout"),
);
const EnterpriseCheckout = lazy(
  () => import("./pages/user/checkout/EnterpriseCheckout"),
);
const AcceptEnterpriseInvite = lazy(() =>
  import("./pages/user/AcceptEnterpriseInvite")
);

// ==================== DIRECT IMPORTS - LAYOUTS ====================
import AdminLayout from "./layouts/AdminLayout";
import UserLayout from "./layouts/UserLayout";

// ==================== DIRECT IMPORTS - ADMIN PAGES ====================
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminLessons from "./pages/admin/AdminLessons";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminTasks from "./pages/admin/AdminTasks";

// ==================== DIRECT IMPORTS - USER PAGES ====================
import DashboardHome from "./pages/user/DashboardHome";
import AIChat from "./pages/user/AIChatbot/AIChat";
import Journal from "./pages/user/Journal";
import Courses from "./pages/user/Courses";
import CourseDetails from "./pages/user/CourseDetails";
import TasksPage from "./pages/user/TasksPage";
import Settings from "./pages/user/Settings";

// ==================== DIRECT IMPORTS - COMPONENTS ====================
import PrivateRoute from "./components/PrivateRoute";
import PublicOnlyRoute from "./components/PublicOnlyRoute";
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
          <Route
            path="/"
            element={
              <PublicOnlyRoute>
                <Landing />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/login-success"
            element={
              <PublicOnlyRoute>
                <LoginSuccess />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicOnlyRoute>
                <ForgotPassword />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicOnlyRoute>
                <ResetPassword />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/verify"
            element={
              <PublicOnlyRoute>
                <Verify />
              </PublicOnlyRoute>
            }
          />
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
            {/* Protected routes (require authentication) - moved here to protect subscription flows */}
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

            <Route path="/dashboard" element={<UserLayout />}>
              {/* Dashboard Home - Main landing page for authenticated users */}
              <Route index element={<DashboardHome />} />

              {/* AI Chat - Premium feature for AI-powered chatbot assistance */}
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

              {/* Journal - User personal journal with vectorized entries */}
              <Route path="journal" element={<Journal />} />

              {/* Courses - Premium feature displaying all available courses */}
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

              {/* Daily Tasks - Premium feature for task management and progress tracking */}
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

              {/* Settings */}
              <Route path="settings" element={<Settings />} />

              {/* Enterprise Manager (EnterpriseAdmin only) */}
              <Route
                path="enterprise-manager"
                element={
                  <PrivateRoute allowedRoles={["enterpriseAdmin"]}>
                    <EnterpriseAdmin />
                  </PrivateRoute>
                }
              />

              {/* Course Details - Premium feature displaying detailed lesson content for a specific course */}
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

          {/* ==================== PROTECTED ADMIN ROUTES ====================
              Routes exclusive to admin users for system management
              Protected by PrivateRoute component with admin role restriction
              Includes: User management, Course management, Tasks, Subscriptions */}
          <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
            <Route path="/admin" element={<AdminLayout />}>
              {/* Admin Dashboard - Default admin page showing user management */}
              <Route index element={<AdminUsers />} />

              {/* User Management - View, edit, and manage all platform users */}
              <Route path="users" element={<AdminUsers />} />

              {/* Course Management - Create, edit, and manage courses */}
              <Route path="courses" element={<AdminCourses />} />

              {/* Lesson Management - Manage lessons within a specific course */}
              <Route
                path="courses/:courseId/lessons"
                element={<AdminLessons />}
              />

              {/* Task Management - Create and manage tasks */}
              <Route path="tasks" element={<AdminTasks />} />

              {/* Subscription Management - View and manage user subscriptions */}
              <Route path="subscriptions" element={<AdminSubscriptions />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
