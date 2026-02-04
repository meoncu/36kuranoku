import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reader from './pages/Reader';
import SurahIndex from './pages/SurahIndex';
import JuzIndex from './pages/JuzIndex';
import Bookmarks from './pages/Bookmarks';
import MonthlyTracker from './pages/MonthlyTracker';
import AdminDashboard from './pages/AdminDashboard';
import PendingApproval from './pages/PendingApproval';
import Layout from './components/Layout';

function App() {
    const { user, profile, loading } = useAuth(); // profile comes from useAuth

    if (loading) {
        return (
            <div className="min-h-screen grid place-items-center bg-background">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Check approval status
    if (user && profile && profile.isApproved === false) {
        return <PendingApproval />;
    }

    return (
        <Router>
            <Routes>
                <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />

                <Route element={user ? <Layout /> : <Navigate to="/login" />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/juz/:id" element={<Reader />} />
                    <Route path="/surahs" element={<SurahIndex />} />
                    <Route path="/juzs" element={<JuzIndex />} />
                    <Route path="/juz/monthly/:id" element={<MonthlyTracker />} />
                    <Route path="/bookmarks" element={<Bookmarks />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
