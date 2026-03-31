import React, { useState, useEffect } from 'react';
import { StatCard, Card } from './ui/Card';
import { 
  BookOpen, 
  Layers, 
  Users, 
  ClipboardCheck,
  Calendar,
  Clock,
  ArrowRight,
  Bell,
  BarChart3
} from 'lucide-react';
import { subscribeToQuery, subscribeToCollection } from '../services/firestore';
import { Course, Batch, User, LiveClass } from '../types';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

interface TeacherDashboardProps {
  user: User;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const unsubCourses = subscribeToQuery('courses', 'teacherId', '==', user.uid, setCourses);
    const unsubBatches = subscribeToQuery('batches', 'teacherId', '==', user.uid, setBatches);
    
    // In a real app, we'd query students assigned to this teacher's batches
    const unsubStudents = subscribeToCollection('students', (data) => {
      setStudents(data.filter(s => s.teacherId === user.uid));
    });

    const unsubLiveClasses = subscribeToQuery('live-classes', 'teacherId', '==', user.uid, (data: LiveClass[]) => {
      const today = new Date().toISOString().split('T')[0];
      const todayClassesList = data.filter(lc => lc.date === today);
      setTodayClasses(todayClassesList.map(lc => ({
        title: lc.title,
        time: lc.startTime,
        type: 'Live Class',
        color: lc.status === 'Live' ? 'var(--color-primary)' : 'var(--color-secondary)',
        status: lc.status
      })));
    });

    setPendingAssignments(12);

    setNotifications([
      { id: 1, title: 'New Assignment Submission', message: 'Rahul Kumar submitted Assignment #4', time: '2 mins ago' },
      { id: 2, title: 'Batch Update', message: 'Batch DM-2026-March schedule updated', time: '1 hour ago' },
      { id: 3, title: 'System Message', message: 'New course material uploaded successfully', time: '3 hours ago' },
    ]);

    return () => {
      unsubCourses();
      unsubBatches();
      unsubStudents();
      unsubLiveClasses();
    };
  }, [user.uid]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-foreground">Welcome, Prof. {user.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your courses today.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/analytics" className="bg-card border border-border text-foreground px-4 py-2 rounded-xl text-xs font-bold hover:bg-muted/50 transition-colors flex items-center gap-2">
            <BarChart3 size={14} /> Performance Analytics
          </Link>
          <button className="bg-success text-foreground px-4 py-2 rounded-xl text-xs font-bold hover:bg-success/80 transition-colors">
            Start Live Class
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard 
          icon={<BookOpen className="text-secondary" />} 
          value={courses.length} 
          label="Courses" 
          color="blue"
        />
        <StatCard 
          icon={<Layers className="text-accent" />} 
          value={batches.length} 
          label="Batches" 
          color="purple"
        />
        <StatCard 
          icon={<Users className="text-success" />} 
          value={students.length} 
          label="Students" 
          color="green"
        />
        <StatCard 
          icon={<Clock className="text-warning" />} 
          value={todayClasses.length} 
          label="Today's Classes" 
          color="yellow"
        />
        <StatCard 
          icon={<ClipboardCheck className="text-primary" />} 
          value={pendingAssignments} 
          label="Pending Tasks" 
          color="red"
        />
        <StatCard 
          icon={<Bell className="text-secondary" />} 
          value={notifications.length} 
          label="Notifications" 
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Today's Classes" headerAction={<span className="text-[10px] font-bold text-success uppercase tracking-widest">Live Now</span>}>
          <div className="space-y-4 mt-2">
            {todayClasses.map((event, i) => (
              <div key={i} className="flex gap-4 p-4 bg-card border border-border rounded-xl border-l-4" style={{ borderLeftColor: event.color }}>
                <div className="w-16 flex-shrink-0 font-syne font-bold text-xs text-foreground">{event.time}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-foreground truncate">{event.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-muted-foreground">{event.type}</span>
                    {event.status === 'Live' && (
                      <span className="flex items-center gap-1 text-[9px] font-black text-primary uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Live
                      </span>
                    )}
                  </div>
                </div>
                <button className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                  event.status === 'Live' ? "bg-primary text-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"
                )}>
                  {event.status === 'Live' ? 'Join Now' : 'Details'}
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Recent Notifications">
          <div className="space-y-4 mt-2">
            {notifications.map((n) => (
              <div key={n.id} className="p-4 bg-card border border-border rounded-xl hover:bg-muted/30 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-[13px] font-bold text-foreground group-hover:text-success transition-colors">{n.title}</h4>
                  <span className="text-[10px] text-muted-foreground">{n.time}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{n.message}</p>
              </div>
            ))}
            <button className="w-full py-2 text-[11px] font-bold text-secondary hover:underline">View All Notifications</button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Pending Assignments" className="lg:col-span-2" headerAction={<span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold">{pendingAssignments} Total</span>}>
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30">
                  <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assignment</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.slice(0, 5).map((s) => (
                  <tr key={s.uid} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-bold text-[10px]">
                          {s.name.charAt(0)}
                        </div>
                        <span className="text-[13px] font-medium text-foreground">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[12px] text-muted-foreground">Assignment #4: Marketing Strategy</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[11px] font-bold text-secondary hover:underline bg-secondary/5 px-3 py-1 rounded-lg">Grade</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Performance Overview">
          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground font-bold uppercase">Course Completion</span>
                <span className="text-foreground font-bold">78%</span>
              </div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <div className="h-full bg-success" style={{ width: '78%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground font-bold uppercase">Student Feedback</span>
                <span className="text-foreground font-bold">4.9/5.0</span>
              </div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <div className="h-full bg-secondary" style={{ width: '98%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground font-bold uppercase">Attendance Rate</span>
                <span className="text-foreground font-bold">92%</span>
              </div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <div className="h-full bg-warning" style={{ width: '92%' }}></div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-card rounded-xl">
                  <div className="text-xl font-black text-foreground">42</div>
                  <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Classes Taken</div>
                </div>
                <div className="text-center p-3 bg-card rounded-xl">
                  <div className="text-xl font-black text-foreground">156</div>
                  <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Hours Taught</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboard;
