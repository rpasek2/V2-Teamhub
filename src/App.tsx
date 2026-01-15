import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RootLayout } from './components/layout/RootLayout';
import { HubLayout } from './components/layout/HubLayout';
import { PageLoader } from './components/ui/PageLoader';

// Lazy load all page components
const HubSelection = lazy(() => import('./pages/hubs/HubSelection').then(m => ({ default: m.HubSelection })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Roster = lazy(() => import('./pages/Roster').then(m => ({ default: m.Roster })));
const Calendar = lazy(() => import('./pages/Calendar').then(m => ({ default: m.Calendar })));
const Messages = lazy(() => import('./pages/Messages'));
const Groups = lazy(() => import('./pages/groups/Groups'));
const GroupDetails = lazy(() => import('./pages/groups/GroupDetails'));
const Competitions = lazy(() => import('./pages/competitions/Competitions').then(m => ({ default: m.Competitions })));
const CompetitionDetails = lazy(() => import('./pages/competitions/CompetitionDetails').then(m => ({ default: m.CompetitionDetails })));
const Scores = lazy(() => import('./pages/Scores').then(m => ({ default: m.Scores })));
const Skills = lazy(() => import('./pages/Skills').then(m => ({ default: m.Skills })));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Mentorship = lazy(() => import('./pages/Mentorship').then(m => ({ default: m.Mentorship })));
const Staff = lazy(() => import('./pages/Staff').then(m => ({ default: m.Staff })));
const StaffDetails = lazy(() => import('./pages/StaffDetails').then(m => ({ default: m.StaffDetails })));
const Assignments = lazy(() => import('./pages/Assignments').then(m => ({ default: m.Assignments })));
const Resources = lazy(() => import('./pages/Resources').then(m => ({ default: m.Resources })));
const Schedule = lazy(() => import('./pages/Schedule').then(m => ({ default: m.Schedule })));
const Attendance = lazy(() => import('./pages/Attendance').then(m => ({ default: m.Attendance })));
const PrivateLessons = lazy(() => import('./pages/PrivateLessons'));
const GymnastDetails = lazy(() => import('./pages/GymnastDetails').then(m => ({ default: m.GymnastDetails })));
const Login = lazy(() => import('./pages/auth/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/auth/Register').then(m => ({ default: m.Register })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const UserSettings = lazy(() => import('./pages/UserSettings').then(m => ({ default: m.UserSettings })));

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              {/* Root Layout (Hub Selection) */}
              <Route element={<RootLayout />}>
                <Route path="/" element={<HubSelection />} />
                <Route path="/settings" element={<UserSettings />} />
              </Route>

              {/* Hub Layout (Full App) */}
              <Route path="/hub/:hubId" element={<HubLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="roster" element={<Roster />} />
                <Route path="roster/:gymnastId" element={<GymnastDetails />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="messages" element={<Messages />} />
                <Route path="competitions" element={<Competitions />} />
                <Route path="competitions/:competitionId" element={<CompetitionDetails />} />
                <Route path="scores" element={<Scores />} />
                <Route path="skills" element={<Skills />} />
                <Route path="marketplace" element={<Marketplace />} />
                <Route path="groups" element={<Groups />} />
                <Route path="groups/:groupId" element={<GroupDetails />} />
                <Route path="mentorship" element={<Mentorship />} />
                <Route path="assignments" element={<Assignments />} />
                <Route path="resources" element={<Resources />} />
                <Route path="schedule" element={<Schedule />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="private-lessons" element={<PrivateLessons />} />
                <Route path="staff" element={<Staff />} />
                <Route path="staff/:staffUserId" element={<StaffDetails />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
