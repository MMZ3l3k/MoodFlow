import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import TestsPage from './pages/TestsPage';
import ResultsPage from './pages/ResultsPage';
import SettingsPage from './pages/SettingsPage';
import TakeAssessmentPage from './pages/TakeAssessmentPage';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Main app with bottom navigation */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<HomePage />} />
            <Route path="tests" element={<TestsPage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Take assessment — full screen, outside layout */}
          <Route
            path="/app/take/:id"
            element={
              <ProtectedRoute>
                <TakeAssessmentPage />
              </ProtectedRoute>
            }
          />

          {/* Legacy redirects */}
          <Route path="/dashboard" element={<Navigate to="/app/home" replace />} />
          <Route path="/assessments" element={<Navigate to="/app/tests" replace />} />
          <Route path="/results" element={<Navigate to="/app/results" replace />} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
