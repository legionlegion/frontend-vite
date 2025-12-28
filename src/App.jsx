import './App.css'
import { AuthProvider } from './context/AuthContext'
import Login from './components/Login';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import RequestsReceived from './components/RequestsReceived'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>} />
            <Route path="/requests-received" element={
              <ProtectedRoute>
                <RequestsReceived />
              </ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Router>
      </div>
    </AuthProvider>
  )
}

export default App
