// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./auth/AuthProvider";
import ProtectedRoute from "./auth/ProtectedRoute";
import TopBar from "./components/ui/TopBar";
import LoginPage from "./pages/LoginPage";

// New imports for dashboards
import AdminPage from "./pages/AdminPage";
import DistrictDashboard from "./pages/DistrictDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import TeachersManager from "./pages/TeachersManager";
import StudentsManager from "./pages/StudentsManager";

// 🔹 Add import for PolicyManager
import { PolicyManager } from "./components/policies/PolicyManager";

// Existing feature pages
import QuestionBank from "./components/questions/QuestionBank";
import CompetencyModelBuilder from "./components/competencies/CompetencyModelBuilder";
import EvidenceModelBuilder from "./components/evidences/EvidenceModelBuilder";
import TaskModelBuilder from "./components/taskModels/TaskModelBuilder";
import TasksManager from "./components/tasks/TasksManager";
import SessionBuilder from "./components/sessions/SessionBuilder";
import SessionPlayer from "./components/sessions/SessionPlayer";
import AnalyticsPanel from "./components/AnalyticsPanel";

import Footer from "./components/ui/Footer";
import Toast from "./components/ui/Toast";
import NavBar from "./components/ui/NavBar";

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <TopBar />
        <Toaster position="top-right" />

        <div className="app-container">
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Admin */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute expectedRole="admin">
                  <Routes>
                    <Route index element={<AdminPage />} />
                    {/* Add more admin-only tools here */}
                    <Route path="teachers" element={<TeachersManager />} />
                    <Route path="students" element={<StudentsManager />} />

                    {/* 🔹 New: Admin can manage adaptive policies */}
                    <Route path="policies" element={<PolicyManager />} />                    
                  </Routes>
                </ProtectedRoute>
              }
            />

            {/* District */}
            <Route
              path="/district/*"
              element={
                <ProtectedRoute expectedRole="district">
                <Routes>
                    <Route index element={<DistrictDashboard />} />
                    {/* Add more district user tools */}
                    <Route path="competencies" element={<CompetencyModelBuilder />} />
                    <Route path="evidence" element={<EvidenceModelBuilder />} />
                    <Route path="tasks" element={<TaskModelBuilder />} />
                    <Route path="questions" element={<QuestionBank />} />
                    <Route path="manage-tasks" element={<TasksManager />} />
                    <Route path="sessions/build" element={<SessionBuilder />} />
                    <Route path="sessions/play" element={<SessionPlayer />} />

                    {/* ✅ District review route (same player in teacher mode) */}
                    <Route
                      path="sessions/:sessionId/review"
                      element={
                        <ProtectedRoute expectedRole="district">
                          <SessionPlayer mode="teacher" />
                        </ProtectedRoute>
                      }
                    />                    
                    <Route path="analytics" element={<AnalyticsPanel />} />
                </Routes>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teacher/*"
              element={
                <ProtectedRoute expectedRole="teacher">
                <Routes>
                  <Route index element={<TeacherDashboard />} />
                    {/* Add more teacher tools */}
                    <Route path="tasks" element={<TasksManager />} />
                    <Route path="sessions/build" element={<SessionBuilder />} />
                    <Route path="sessions/play" element={<SessionPlayer />} />

                    {/* Secure teacher review route (mode='teacher') */}
                    <Route
                      path="sessions/:sessionId/review"
                      element={
                        <ProtectedRoute expectedRole="teacher">
                          <SessionPlayer mode="teacher" />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="analytics" element={<AnalyticsPanel />} />
                </Routes>
                </ProtectedRoute>
              }
            />

            <Route
              path="/student/*"
              element={
                <ProtectedRoute expectedRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            {/* Default → landing/login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
        <Footer />
      </AuthProvider>
    </Router>
  );
}
