import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { AppLayout } from './components/layout/AppLayout';
import { AuthLayout } from './components/layout/AuthLayout';

// Route Guards
import { ProtectedRoute } from './routes/ProtectedRoute';
import { GuestRoute } from './routes/GuestRoute';
import { CircleRequiredRoute } from './routes/CircleRequiredRoute';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { AcceptInvitationPage } from './pages/auth/AcceptInvitationPage';
import { CreateCirclePage } from './pages/onboarding/CreateCirclePage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { TasksPage } from './pages/tasks/TasksPage';
import { MedicationsPage } from './pages/medications/MedicationsPage';
import { CareNotesPage } from './pages/notes/CareNotesPage';
import { CareCirclePage } from './pages/circle/CareCirclePage';
import { SlicePlaceholderPage } from './pages/placeholder/SlicePlaceholderPage';
import { NotFoundPage } from './pages/errors/NotFoundPage';
import { ForbiddenPage } from './pages/errors/ForbiddenPage';

export default function App() {
  return (
    <Routes>
      {/* Guest / Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />
        <Route path="/invite" element={<AcceptInvitationPage />} />
        <Route path="/invite/:token" element={<AcceptInvitationPage />} />
      </Route>

      {/* Onboarding Wizard for new Care Circle */}
      <Route
        path="/onboarding/create-circle"
        element={
          <ProtectedRoute>
            <CreateCirclePage />
          </ProtectedRoute>
        }
      />

      {/* Authenticated Care Circle App Shell */}
      <Route
        element={
          <ProtectedRoute>
            <CircleRequiredRoute>
              <AppLayout />
            </CircleRequiredRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/medicines" element={<MedicationsPage />} />

        <Route
          path="/health"
          element={
            <SlicePlaceholderPage
              title="Health & Biometrics Telemetry"
              description="Record blood pressure, blood glucose, heart rate, SpO2, symptoms, and generate clinical Doctor's Briefs."
              icon="vital_signs"
              sliceNumber="Health & Symptoms Slice"
            />
          }
        />
        <Route path="/notes" element={<CareNotesPage />} />
        <Route
          path="/documents"
          element={
            <SlicePlaceholderPage
              title="Emergency Document Vault"
              description="Store insurance policies, advance directives, hospital discharge summaries, and medical IDs."
              icon="description"
              sliceNumber="Document Vault Slice"
            />
          }
        />
        <Route path="/circle" element={<CareCirclePage />} />

        <Route
          path="/notifications"
          element={
            <SlicePlaceholderPage
              title="Notifications"
              description="View vital alerts, missed dose warnings, and task assignment notifications."
              icon="notifications"
              sliceNumber="Notifications Slice"
            />
          }
        />
        <Route
          path="/settings"
          element={
            <SlicePlaceholderPage
              title="Settings & Profile"
              description="Manage your account profile, notification preferences, and care circle configuration."
              icon="settings"
              sliceNumber="Settings Slice"
            />
          }
        />
      </Route>

      {/* Error Routes */}
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
