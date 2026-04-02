import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Background from './components/Background';
import Home from './pages/Home';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Register from './pages/Register';
import Rules from './pages/Rules';
import Faculty from './pages/Faculty';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';

import ProtectedRoute from './components/ProtectedRoute';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PaymentReviewDashboard from './pages/PaymentReviewDashboard';
import ContentReviewDashboard from './pages/ContentReviewDashboard';
import AdminLogin from './pages/AdminLogin';

// Layout component to handle scroll restoration properly
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/register/:eventId" element={<ProtectedRoute><Register /></ProtectedRoute>} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/faculty" element={<Faculty />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          
          {/* Protected Dashboards */}
          <Route 
            path="/dashboard" 
            element={<ProtectedRoute allowedRoles={['user', 'admin']}><UserDashboard /></ProtectedRoute>} 
          />
          <Route 
            path="/admin" 
            element={<ProtectedRoute allowedRoles={['admin']} redirectPath="/admin/login"><AdminDashboard /></ProtectedRoute>} 
          />
          <Route 
            path="/payments" 
            element={<ProtectedRoute allowedRoles={['admin', 'payment_reviewer']} redirectPath="/admin/login"><PaymentReviewDashboard /></ProtectedRoute>} 
          />
          <Route 
            path="/content" 
            element={<ProtectedRoute allowedRoles={['admin', 'content_reviewer']} redirectPath="/admin/login"><ContentReviewDashboard /></ProtectedRoute>} 
          />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      <div className="relative min-h-screen selection:bg-fest-pink selection:text-white overflow-x-hidden">
        <Background />
        <Navbar />
        <ScrollToTop />
        <AnimatedRoutes />
        <Footer />
      </div>
    </Router>
  );
}

