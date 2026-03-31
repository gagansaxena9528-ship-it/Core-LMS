import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { User } from '../types';
import { logout } from '../services/auth';
import { useSettings } from '../SettingsContext';
import { 
  LayoutDashboard, 
  Users, 
  UserSquare2, 
  BookOpen, 
  Layers, 
  Video, 
  FileText, 
  Award, 
  CreditCard, 
  Settings, 
  LogOut, 
  Bell, 
  Search, 
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Menu,
  X,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  user: User;
}

const Layout: React.FC<LayoutProps> = ({ user }) => {
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = {
    admin: [
      { label: 'Overview', items: [
        { id: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
      ]},
      { label: 'Management', items: [
        { id: '/students', icon: <Users size={18} />, label: 'Students' },
        { id: '/teachers', icon: <UserSquare2 size={18} />, label: 'Teachers' },
        { id: '/courses', icon: <BookOpen size={18} />, label: 'Courses' },
        { id: '/batches', icon: <Layers size={18} />, label: 'Batches' },
        { id: '/reports', icon: <BarChart3 size={18} />, label: 'Reports & Analytics' },
      ]},
      { label: 'Academics', items: [
        { id: '/content', icon: <Video size={18} />, label: 'Content & Videos' },
        { id: '/exams', icon: <FileText size={18} />, label: 'Exams' },
        { id: '/assignments', icon: <FileText size={18} />, label: 'Assignments' },
        { id: '/live-classes', icon: <Video size={18} />, label: 'Live Classes' },
        { id: '/attendance', icon: <CheckCircle2 size={18} />, label: 'Attendance' },
        { id: '/certificates', icon: <Award size={18} />, label: 'Certificates' },
      ]},
      { label: 'Finance', items: [
        { id: '/payments', icon: <CreditCard size={18} />, label: 'Payments' },
      ]},
      { label: 'System', items: [
        { id: '/settings', icon: <Settings size={18} />, label: 'Settings' },
      ]},
    ],
    teacher: [
      { label: 'Overview', items: [
        { id: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
        { id: '/analytics', icon: <BarChart3 size={18} />, label: 'Performance & Analytics' },
      ]},
      { label: 'Academic Management', items: [
        { id: '/courses', icon: <BookOpen size={18} />, label: 'My Courses' },
        { id: '/batches', icon: <Layers size={18} />, label: 'Batches' },
        { id: '/live-classes', icon: <Video size={18} />, label: 'Live Classes' },
        { id: '/attendance', icon: <CheckCircle2 size={18} />, label: 'Attendance' },
      ]},
      { label: 'Assessments', items: [
        { id: '/assignments', icon: <FileText size={18} />, label: 'Assignments' },
        { id: '/exams', icon: <FileText size={18} />, label: 'Exams' },
      ]},
      { label: 'Students & Content', items: [
        { id: '/students', icon: <Users size={18} />, label: 'Students' },
        { id: '/content', icon: <Video size={18} />, label: 'Content' },
        { id: '/notifications', icon: <Bell size={18} />, label: 'Notifications' },
      ]},
      { label: 'Account', items: [
        { id: '/profile', icon: <UserIcon size={18} />, label: 'Profile' },
      ]},
    ],
    student: [
      { label: 'Learn', items: [
        { id: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
        { id: '/courses', icon: <BookOpen size={18} />, label: 'My Courses' },
        { id: '/live-classes', icon: <Video size={18} />, label: 'Live Classes' },
      ]},
      { label: 'Academics', items: [
        { id: '/exams', icon: <FileText size={18} />, label: 'Exams' },
        { id: '/assignments', icon: <FileText size={18} />, label: 'Assignments' },
        { id: '/attendance', icon: <CheckCircle2 size={18} />, label: 'Attendance' },
        { id: '/certificates', icon: <Award size={18} />, label: 'Certificates' },
      ]},
      { label: 'Account', items: [
        { id: '/payments', icon: <CreditCard size={18} />, label: 'Fees' },
        { id: '/profile', icon: <UserIcon size={18} />, label: 'Profile' },
      ]},
    ]
  };

  const currentNav = navItems[user.role] || navItems.admin;

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Fallback: just redirect anyway
      window.location.href = '/login';
    }
  };

  const adminLogo = settings?.branding?.adminLogo || settings?.branding?.headerLogo;
  const siteName = settings?.general?.siteName || 'CoreLMS';

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex overflow-hidden">
      {/* Sidebar Backdrop for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[60] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-screen bg-card border-r border-border flex flex-col z-[70] transition-transform duration-300 md:translate-x-0 md:w-[240px]",
        isSidebarOpen ? "translate-x-0 w-[260px]" : "-translate-x-full w-[240px]"
      )}>
        <div className="p-5 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {adminLogo ? (
              <img src={adminLogo} alt="Logo" className="h-9 w-auto object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center font-bold text-lg text-foreground font-syne">
                {siteName.charAt(0)}
              </div>
            )}
            <span className="font-syne font-extrabold text-lg text-foreground">
              {siteName.includes('CoreLMS') ? (
                <>Core<span className="text-secondary">LMS</span></>
              ) : (
                siteName
              )}
            </span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-muted-foreground hover:text-foreground md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mx-3 my-3 p-2 px-3 rounded-lg bg-card/50 border border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{user.role}</span>
            <span className="px-1.5 py-0.5 rounded bg-success/10 text-success text-[8px] font-bold uppercase tracking-tighter">Live</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-success shadow-lg shadow-success/50"></div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
          {currentNav.map((section, idx) => (
            <div key={idx} className="mb-4">
              <div className="px-5 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[1.2px]">
                {section.label}
              </div>
              {section.items.map((item) => (
                <Link
                  key={item.id}
                  to={item.id}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-200 group relative",
                    location.pathname === item.id 
                      ? "bg-secondary/10 text-secondary font-medium" 
                      : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
                  )}
                >
                  {location.pathname === item.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3/5 bg-secondary rounded-r-full" />
                  )}
                  <span className={cn(
                    "transition-colors",
                    location.pathname === item.id ? "text-secondary" : "group-hover:text-foreground"
                  )}>
                    {item.icon}
                  </span>
                  <span className="text-[13.5px]">{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center font-bold text-sm text-foreground flex-shrink-0">
            {user.av}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate text-foreground">{user.name}</div>
            <div className="text-[11px] text-muted-foreground capitalize">{user.role}</div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg bg-card/50 border border-border flex items-center justify-center text-muted-foreground hover:text-secondary hover:bg-secondary/10 transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden md:ml-[240px]">
        {/* Header */}
        <header className="h-[60px] bg-card border-b border-border flex items-center px-4 md:px-6 gap-4 z-40 sticky top-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-muted-foreground hover:text-foreground md:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2 md:gap-4 flex-1 overflow-hidden">
            <button onClick={() => navigate(-1)} className="p-1.5 md:p-2 hover:bg-card/50 rounded-lg transition-colors hidden sm:block">
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-syne font-bold text-sm md:text-base truncate text-foreground">
              {location.pathname === '/' ? 'Dashboard' : location.pathname.split('/')[1].replace('-', ' ').toUpperCase()}
            </h2>
            <button onClick={() => navigate(1)} className="p-1.5 md:p-2 hover:bg-card/50 rounded-lg transition-colors hidden sm:block">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden lg:flex items-center gap-2 bg-card/50 border border-border rounded-lg px-3 py-1.5 w-[200px]">
              <Search size={14} className="text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none outline-none text-[13px] w-full placeholder-muted-foreground text-foreground"
              />
            </div>
            
            <button 
              onClick={() => setNotifOpen(!notifOpen)}
              className="w-9 h-9 rounded-lg bg-card/50 border border-border flex items-center justify-center relative hover:bg-border transition-colors"
            >
              <Bell size={16} />
              <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-secondary rounded-full border border-card"></div>
            </button>

            <Link 
              to="/profile"
              className="w-9 h-9 rounded-lg bg-card/50 border border-border flex items-center justify-center hover:bg-border transition-colors"
            >
              <UserIcon size={16} />
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide">
          <Outlet />
        </main>
      </div>

      {/* Notifications Panel */}
      <AnimatePresence>
        {notifOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNotifOpen(false)}
              className="fixed inset-0 bg-background/50 z-[80] backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 w-full sm:w-[320px] h-screen bg-card border-l border-border z-[90] shadow-2xl"
            >
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h3 className="font-syne font-bold text-foreground">Notifications</h3>
                <div className="flex items-center gap-3">
                  <button className="text-[12px] text-secondary hover:underline">Mark all read</button>
                  <button onClick={() => setNotifOpen(false)} className="md:hidden p-1 text-foreground">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto h-[calc(100vh-65px)] scrollbar-hide">
                {[
                  { title: 'New student enrolled', desc: 'Rahul Kumar joined Digital Marketing', time: '2 min ago', unread: true },
                  { title: 'Assignment submitted', desc: 'Priya Sharma submitted Assignment #4', time: '15 min ago', unread: true },
                  { title: 'Payment received', desc: '₹4,999 received from Arjun Patel', time: '1 hr ago', unread: false },
                ].map((n, i) => (
                  <div key={i} className={cn(
                    "p-4 border-b border-border cursor-pointer hover:bg-card/50 transition-colors",
                    n.unread && "border-l-2 border-l-secondary"
                  )}>
                    <div className={cn("text-[13.5px]", n.unread ? "font-medium text-foreground" : "text-foreground")}>{n.title}</div>
                    <div className="text-[12px] text-muted-foreground mt-1">{n.desc}</div>
                    <div className="text-[11px] text-muted-foreground mt-2">{n.time}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Layout;
