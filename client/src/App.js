import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { useEffect } from 'react';
import { AuthProvider } from "./contexts/AuthContext"
import { NotificationProvider } from './contexts/NotificationContext'
import ProtectedRoute from "./components/ProtectedRoute"
import AdminRoute from "./components/AdminRoute"
import SuperAdminRoute from "./components/SuperAdminRoute"
import SubscriptionProtectedRoute from "./components/SubscriptionProtectedRoute"

import LandingPage from './pages/LandingPage';
// In your App.js file, add these routes

import Company from './pages/Company';
import Resources from './pages/Resources';
import LegalPolicies from './pages/LegalPolicies'
import Features from './components/Features';
   import NotFound from './pages/NotFound';
// Auth Pages
import Login from "./pages/auth/Login"
import Register from "./pages/auth/Register"
import ForgotPassword from "./pages/auth/ForgotPassword"
import ResetPassword from "./pages/auth/ResetPassword"
import VerifyEmail from "./pages/auth/VerifyEmail"
import DeviceManagement from "./pages/auth/DeviceMangement"

// Add this route
// User Pages
import Home from "./pages/user/Home"
import Profile from "./pages/user/Profile"
import Competitions from "./pages/user/Competitions"
import CompetitionDetails from "./pages/user/CompetitionDetails"
import CompetitionQuiz from "./pages/user/CompetitionQuiz"
import CompetitionCompletion from "./pages/user/CompetitionCompletion"
import CompetitionLeaderboard from "./pages/user/CompetitionLeaderboard"
import CompetitionHistory from "./pages/user/competitionHistory"

import Videos from "./pages/user/Videos"
import Notes from "./pages/user/Notes"
import NoteReader from "./pages/user/NoteReader"
import AIAssistant from "./pages/user/AIAssistant"
import Materials from "./pages/user/Materials"
import ResultsHistory from "./pages/user/ResultsHistory"
import QuestionSearch from "./pages/user/QuestionSearch"
import Bookmarks from "./pages/user/Bookmarks"

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin"
import AdminDashboard from "./pages/admin/AdminDashboard"
import CourseOfStudyManagement from './pages/admin/CourseOfStudyManagement';

// Add this route to your router configuration
//SuperAdmin
import SuperAdminLogin from './pages/superadmin/SuperAdminLogin';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';



import ReportsManagement from "./pages/admin/ReportsManagement"
import AdminQuizManagement from "./pages/admin/AdminQuizManagement"
import VideoManagement from "./pages/admin/VideoManagement"
import NoteManagement from "./pages/admin/NoteManagement"
import MaterialManagement from "./pages/admin/MaterialManagement"
import CompetitionManagement from "./pages/admin/CompetitionManagement"
import AdminCompetitionDetails from "./pages/admin/CompetitionDetails"
import AdminCompetitionLeaderboard from "./pages/admin/AdminCompetitionLeaderboard"
import UsersPage from "./pages/admin/UsersPage"
import NotificationsPage from "./pages/admin/NotificationsPage"

// Payment Pages
import PaymentCallback from "./pages/payment/PaymentCallback"

// Study/Mock Pages
import CourseSelection from "./pages/user/CourseSelection"
import Study from "./pages/user/Study"
import Mock from "./pages/user/Mock"
import Results from "./pages/user/Results"
import Correction from "./pages/user/Correction"
import AOS from 'aos';
import 'aos/dist/aos.css';



function App() {
useEffect(() => {
  AOS.init({
    duration: 800,
    once: true
  });
}, []);

  return (
    <AuthProvider>
            <NotificationProvider>
  
      <Router>
        <div className="App">
       
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/features" element={<Features />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/dashboard"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />

<Route path="/superadmin/login" element={<SuperAdminLogin />} />
<Route path="/superadmin/dashboard" element={
  <SuperAdminRoute>
                <SuperAdminDashboard />
              </SuperAdminRoute>
            } />

            <Route
              path="/admin/quiz"
              element={
                <AdminRoute>
                  <AdminQuizManagement />
                </AdminRoute>
              }
            />
            

            <Route
              path="/admin/reports"
              element={
                <AdminRoute>
                  <ReportsManagement />
                </AdminRoute>
              }
            />

<Route path="/admin/courseofstudy" element={ <AdminRoute>
                  <CourseOfStudyManagement/>
                </AdminRoute>} />

            <Route
              path="/admin/videos"
              element={
                <AdminRoute>
                  <VideoManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/notes"
              element={
                <AdminRoute>
                  <NoteManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/materials"
              element={
                <AdminRoute>
                  <MaterialManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/competitions"
              element={
                <AdminRoute>
                  <CompetitionManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/competitions/:id"
              element={
                <AdminRoute>
                  <AdminCompetitionDetails />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/competitions/:id/leaderboard"
              element={
                <AdminRoute>
                  <AdminCompetitionLeaderboard />
                </AdminRoute>
              }
            />
             <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <UsersPage />
                </AdminRoute>
              }
            />
             <Route
              path="/admin/notifications"
              element={
                <AdminRoute>
                  <NotificationsPage />
                </AdminRoute>
              }
            />

            {/* Protected User Routes */}
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
               <Route
              path="/device-manager"
              element={
                <ProtectedRoute>
                  <DeviceManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/competitions"
              element={
                <ProtectedRoute>
                  <Competitions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/competitions/:id"
              element={
                <ProtectedRoute>
                  <CompetitionDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/competitions/:id/leaderboard"
              element={
                <ProtectedRoute>
                  <CompetitionLeaderboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/competition-quiz"
              element={
                <ProtectedRoute>
                  <SubscriptionProtectedRoute>
                    <CompetitionQuiz />
                  </SubscriptionProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/competition-completion"
              element={
                <ProtectedRoute>
                  <CompetitionCompletion />
                </ProtectedRoute>
              }
            />
              <Route
              path="/competition-history"
              element={
                <ProtectedRoute>
                  <CompetitionHistory />
                </ProtectedRoute>
              }
            />

            {/* Subscription Protected Routes */}
            <Route
              path="/course-selection"
              element={
                <ProtectedRoute>
                  <SubscriptionProtectedRoute>
                    <CourseSelection />
                  </SubscriptionProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/study"
              element={
                <ProtectedRoute>
                  <SubscriptionProtectedRoute>
                    <Study />
                  </SubscriptionProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mock"
              element={
                <ProtectedRoute>
                  <SubscriptionProtectedRoute>
                    <Mock />
                  </SubscriptionProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/results"
              element={
                <ProtectedRoute>
                  <SubscriptionProtectedRoute>
                    <Results />
                  </SubscriptionProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/correction"
              element={
                <ProtectedRoute>
                  <SubscriptionProtectedRoute>
                    <Correction />
                  </SubscriptionProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/results-history"
              element={
                <ProtectedRoute>
                  <SubscriptionProtectedRoute>
                    <ResultsHistory />
                  </SubscriptionProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/question-search"
              element={
                <ProtectedRoute>
                  <SubscriptionProtectedRoute>
                    <QuestionSearch />
                  </SubscriptionProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/bookmarks"
              element={
                <ProtectedRoute>
                  <SubscriptionProtectedRoute>
                    <Bookmarks />
                  </SubscriptionProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/videos"
              element={
                <ProtectedRoute>
                  <SubscriptionProtectedRoute>
                    <Videos />
                  </SubscriptionProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notes"
              element={
                <ProtectedRoute>
                  <SubscriptionProtectedRoute>
                    <Notes />
                  </SubscriptionProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/note-reader/:noteId"
              element={
                <ProtectedRoute>
                  <SubscriptionProtectedRoute>
                    <NoteReader />
                  </SubscriptionProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/AI-assistant"
              element={
                <ProtectedRoute>
                  <SubscriptionProtectedRoute>
                    <AIAssistant />
                  </SubscriptionProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/materials"
              element={
                <ProtectedRoute>
                  <SubscriptionProtectedRoute>
                    <Materials />
                  </SubscriptionProtectedRoute>
                </ProtectedRoute>
              }
            />
            {/* Payment Routes */}
            <Route
              path="/payment/callback"
              element={
                <ProtectedRoute>
                  <PaymentCallback />
                </ProtectedRoute>
              }
            />

               


             <Route path="/" element={<LandingPage />} />
                 {/* Your existing routes */}
        <Route path="/company" element={<Company />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/legal" element={<LegalPolicies />} />
              {/* Fallback route - redirect to landing page */}
                   {/* 404 Not Found Route */}
              <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
    </NotificationProvider>

    </AuthProvider>
  )
}

export default App
