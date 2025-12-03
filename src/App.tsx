import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RootLayout } from './components/layout/RootLayout';
import { HubLayout } from './components/layout/HubLayout';
import { HubSelection } from './pages/hubs/HubSelection';
import { Dashboard } from './pages/Dashboard';
import { Roster } from './pages/Roster';
import { Calendar } from './pages/Calendar';
import Messages from './pages/Messages';
import Groups from './pages/groups/Groups';
import GroupDetails from './pages/groups/GroupDetails';
import { Competitions } from './pages/competitions/Competitions';
import { CompetitionDetails } from './pages/competitions/CompetitionDetails';
import { Scores } from './pages/Scores';
import { Skills } from './pages/Skills';
import Marketplace from './pages/Marketplace';
import { Mentorship } from './pages/Mentorship';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Settings } from './pages/Settings';
import { UserSettings } from './pages/UserSettings';

function App() {
  return (
    <AuthProvider>
      <Router>
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
              <Route path="calendar" element={<Calendar />} /> {/* Added Calendar route */}
              <Route path="messages" element={<Messages />} /> {/* Added Messages route */}
              <Route path="competitions" element={<Competitions />} />
              <Route path="competitions/:competitionId" element={<CompetitionDetails />} />
              <Route path="scores" element={<Scores />} />
              <Route path="skills" element={<Skills />} />
              <Route path="marketplace" element={<Marketplace />} />
              <Route path="groups" element={<Groups />} />
              <Route path="groups/:groupId" element={<GroupDetails />} />
              <Route path="mentorship" element={<Mentorship />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
