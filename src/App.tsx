import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RootLayout } from './components/layout/RootLayout';
import { HubLayout } from './components/layout/HubLayout';
import { TabGuard } from './components/layout/TabGuard';
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
                <Route path="roster" element={<TabGuard tabId="roster"><Roster /></TabGuard>} />
                <Route path="roster/:gymnastId" element={<TabGuard tabId="roster"><GymnastDetails /></TabGuard>} />
                <Route path="calendar" element={<TabGuard tabId="calendar"><Calendar /></TabGuard>} />
                <Route path="messages" element={<TabGuard tabId="messages"><Messages /></TabGuard>} />
                <Route path="competitions" element={<TabGuard tabId="competitions"><Competitions /></TabGuard>} />
                <Route path="competitions/:competitionId" element={<TabGuard tabId="competitions"><CompetitionDetails /></TabGuard>} />
                <Route path="scores" element={<TabGuard tabId="scores"><Scores /></TabGuard>} />
                <Route path="skills" element={<TabGuard tabId="skills"><Skills /></TabGuard>} />
                <Route path="marketplace" element={<TabGuard tabId="marketplace"><Marketplace /></TabGuard>} />
                <Route path="groups" element={<TabGuard tabId="groups"><Groups /></TabGuard>} />
                <Route path="groups/:groupId" element={<TabGuard tabId="groups"><GroupDetails /></TabGuard>} />
                <Route path="mentorship" element={<TabGuard tabId="mentorship"><Mentorship /></TabGuard>} />
                <Route path="assignments" element={<TabGuard tabId="assignments"><Assignments /></TabGuard>} />
                <Route path="resources" element={<TabGuard tabId="resources"><Resources /></TabGuard>} />
                <Route path="schedule" element={<TabGuard tabId="schedule"><Schedule /></TabGuard>} />
                <Route path="attendance" element={<TabGuard tabId="attendance"><Attendance /></TabGuard>} />
                <Route path="private-lessons" element={<TabGuard tabId="private_lessons"><PrivateLessons /></TabGuard>} />
                <Route path="staff" element={<TabGuard tabId="staff"><Staff /></TabGuard>} />
                <Route path="staff/:staffUserId" element={<TabGuard tabId="staff"><StaffDetails /></TabGuard>} />
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
