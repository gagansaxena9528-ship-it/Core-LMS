import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { subscribeToAuth } from './services/auth';
import { User } from './types';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import Students from './components/Students';
import Teachers from './components/Teachers';
import Courses from './components/Courses';
import Batches from './components/Batches';
import ContentManagement from './components/ContentManagement';
import Exams from './components/Exams';
import Assignments from './components/Assignments';
import LiveClasses from './components/LiveClasses';
import Payments from './components/Payments';
import Settings from './components/Settings';
import Profile from './components/Profile';
import Attendance from './components/Attendance';
import Certificates from './components/Certificates';
import CertificateVerification from './components/CertificateVerification';
import CoursePlayer from './components/CoursePlayer';
import Reports from './components/Reports';

import { SettingsProvider } from './SettingsContext';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((userData) => {
      setUser(userData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0e17]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white font-medium">CoreLMS Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SettingsProvider>
      <Router>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
          <Route path="/verify-certificate/:id" element={<CertificateVerification />} />
          <Route path="/verify-certificate" element={<CertificateVerification />} />
          
          <Route element={user ? <Layout user={user} /> : <Navigate to="/login" />}>
            <Route path="/" element={
              user?.role === 'admin' ? <Dashboard user={user} /> : 
              user?.role === 'teacher' ? <TeacherDashboard user={user} /> : 
              <StudentDashboard user={user} />
            } />
            
            {/* Admin & Shared Routes */}
            <Route path="/students" element={<Students />} />
            <Route path="/teachers" element={<Teachers />} />
            <Route path="/courses" element={<Courses user={user!} />} />
            <Route path="/batches" element={<Batches />} />
            <Route path="/content" element={<ContentManagement user={user!} />} />
            <Route path="/exams" element={<Exams user={user!} />} />
            <Route path="/assignments" element={<Assignments user={user!} />} />
            <Route path="/live-classes" element={<LiveClasses user={user!} />} />
            <Route path="/payments" element={<Payments user={user!} />} />
            <Route path="/attendance" element={<Attendance user={user!} />} />
            <Route path="/certificates" element={<Certificates user={user!} />} />
            <Route path="/reports" element={<Reports user={user!} />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile user={user!} />} />
            
            {/* Student Specific */}
            <Route path="/course-player/:courseId" element={<CoursePlayer />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </SettingsProvider>
  );
};

export default App;
