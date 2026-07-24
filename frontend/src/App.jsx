import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import FitnessPage from './pages/FitnessPage.jsx'
import HabitsPage from './pages/HabitsPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import TasksPage from './pages/TasksPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/habits" element={<HabitsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/fitness" element={<FitnessPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
