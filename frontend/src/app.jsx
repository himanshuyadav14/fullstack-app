import { useEffect } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DashboardPage from "./pages/DashboardPage";
import KanbanPage from "./pages/KanbanPage";
import NotificationsPage from "./pages/NotificationsPage";
import MembersPage from "./pages/MembersPage";
import TeamsPage from "./pages/TeamsPage";
import { useAuthStore } from "./stores/authStore";

// Protected Route Guard: requires active session
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Guard: prevents logged-in users from seeing login/signup
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/" replace /> : children;
};

const App = () => {
  const { fetchMe } = useAuthStore();

  useEffect(() => {
    // Validate session on app initialization
    fetchMe();
  }, [fetchMe]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Protected App Routes with AppLayout Wrapper */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="board" element={<KanbanPage />} />
          <Route path="kanban" element={<KanbanPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        {/* Public Authentication Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route
          path="/verify-email"
          element={
            <PublicRoute>
              <VerifyEmail />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
