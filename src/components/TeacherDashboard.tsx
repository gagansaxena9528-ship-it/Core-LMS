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
        color: lc.status === 'Live' ? '#f75f6a' : '#4f8ef7',
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
          <h2 className="text-2xl font-extrabold font-syne text-white">Welcome, Prof. {user.name}</h2>
          <p className="text-sm text-[#6b7599] mt-1">Here's what's happening with your courses today.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/analytics" className="bg-[#1a2035] border border-[#242b40] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#242b40] transition-colors flex items-center gap-2">
            <BarChart3 size={14} /> Performance Analytics
          </Link>
          <button className="bg-[#2ecc8a] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#27af76] transition-colors">
            Start Live Class
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard 
          icon={<BookOpen className="text-[#4f8ef7]" />} 
          value={courses.length} 
          label="Courses" 
          color="blue"
        />
        <StatCard 
          icon={<Layers className="text-[#7c5fe6]" />} 
          value={batches.length} 
          label="Batches" 
          color="purple"
        />
        <StatCard 
          icon={<Users className="text-[#2ecc8a]" />} 
          value={students.length} 
          label="Students" 
          color="green"
        />
        <StatCard 
          icon={<Clock className="text-[#f7d04f]" />} 
          value={todayClasses.length} 
          label="Today's Classes" 
          color="yellow"
        />
        <StatCard 
          icon={<ClipboardCheck className="text-[#f75f6a]" />} 
          value={pendingAssignments} 
          label="Pending Tasks" 
          color="red"
        />
        <StatCard 
          icon={<Bell className="text-[#4f8ef7]" />} 
          value={notifications.length} 
          label="Notifications" 
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Today's Classes" headerAction={<span className="text-[10px] font-bold text-[#2ecc8a] uppercase tracking-widest">Live Now</span>}>
          <div className="space-y-4 mt-2">
            {todayClasses.map((event, i) => (
              <div key={i} className="flex gap-4 p-4 bg-[#1a2035] border border-[#242b40] rounded-xl border-l-4" style={{ borderLeftColor: event.color }}>
                <div className="w-16 flex-shrink-0 font-syne font-bold text-xs text-[#e8ecf5]">{event.time}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-[#e8ecf5] truncate">{event.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-[#6b7599]">{event.type}</span>
                    {event.status === 'Live' && (
                      <span className="flex items-center gap-1 text-[9px] font-black text-[#f75f6a] uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f75f6a] animate-pulse" /> Live
                      </span>
                    )}
                  </div>
                </div>
                <button className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                  event.status === 'Live' ? "bg-[#f75f6a] text-white" : "bg-[#242b40] text-[#6b7599] hover:text-white"
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
              <div key={n.id} className="p-4 bg-[#1a2035] border border-[#242b40] rounded-xl hover:bg-[#242b40]/50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-[13px] font-bold text-[#e8ecf5] group-hover:text-[#2ecc8a] transition-colors">{n.title}</h4>
                  <span className="text-[10px] text-[#6b7599]">{n.time}</span>
                </div>
                <p className="text-[11px] text-[#6b7599]">{n.message}</p>
              </div>
            ))}
            <button className="w-full py-2 text-[11px] font-bold text-[#4f8ef7] hover:underline">View All Notifications</button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Pending Assignments" className="lg:col-span-2" headerAction={<span className="px-2 py-1 rounded-full bg-red-500/10 text-[#f75f6a] text-[10px] font-bold">{pendingAssignments} Total</span>}>
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1a2035]">
                  <th className="px-6 py-3 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Assignment</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242b40]">
                {students.slice(0, 5).map((s) => (
                  <tr key={s.uid} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-blue-500/10 text-[#4f8ef7] flex items-center justify-center font-bold text-[10px]">
                          {s.name.charAt(0)}
                        </div>
                        <span className="text-[13px] font-medium">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[12px] text-[#6b7599]">Assignment #4: Marketing Strategy</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[11px] font-bold text-[#4f8ef7] hover:underline bg-blue-500/5 px-3 py-1 rounded-lg">Grade</button>
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
                <span className="text-[#6b7599] font-bold uppercase">Course Completion</span>
                <span className="text-white font-bold">78%</span>
              </div>
              <div className="h-2 bg-[#1a2035] rounded-full overflow-hidden">
                <div className="h-full bg-[#2ecc8a]" style={{ width: '78%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#6b7599] font-bold uppercase">Student Feedback</span>
                <span className="text-white font-bold">4.9/5.0</span>
              </div>
              <div className="h-2 bg-[#1a2035] rounded-full overflow-hidden">
                <div className="h-full bg-[#4f8ef7]" style={{ width: '98%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#6b7599] font-bold uppercase">Attendance Rate</span>
                <span className="text-white font-bold">92%</span>
              </div>
              <div className="h-2 bg-[#1a2035] rounded-full overflow-hidden">
                <div className="h-full bg-[#f7d04f]" style={{ width: '92%' }}></div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-[#242b40]">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-[#1a2035] rounded-xl">
                  <div className="text-xl font-black text-white">42</div>
                  <div className="text-[9px] text-[#6b7599] font-bold uppercase tracking-widest">Classes Taken</div>
                </div>
                <div className="text-center p-3 bg-[#1a2035] rounded-xl">
                  <div className="text-xl font-black text-white">156</div>
                  <div className="text-[9px] text-[#6b7599] font-bold uppercase tracking-widest">Hours Taught</div>
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
