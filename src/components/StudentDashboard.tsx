import React, { useState, useEffect } from 'react';
import { StatCard, Card } from './ui/Card';
import { 
  BookOpen, 
  TrendingUp, 
  CheckCircle2, 
  Award,
  Play,
  Calendar,
  Clock,
  FileText,
  Video,
  Bell
} from 'lucide-react';
import { subscribeToCollection, subscribeToQuery } from '../services/firestore';
import { Course, User, LiveClass, Assignment, Exam, Attendance, Certificate, Teacher } from '../types';
import { useNavigate } from 'react-router-dom';

interface StudentDashboardProps {
  user: User;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [assignedTeachers, setAssignedTeachers] = useState<Teacher[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Fetch enrolled courses
    const unsubCourses = subscribeToCollection('courses', (data) => {
      const studentCourseId = (user as any).courseId;
      if (studentCourseId || user.course) {
        setCourses(data.filter(c => c.id === studentCourseId || c.title === user.course));
      } else {
        setCourses([]);
      }
    });

    // Fetch notifications
    const unsubNotifs = subscribeToCollection('notifications', (data) => {
      const student = user as any;
      setNotifications(data.filter(n => 
        n.type === 'All' || 
        (n.type === 'Course' && n.targetId === student.courseId) || 
        (n.type === 'Batch' && n.targetId === student.batchId) ||
        (n.type === 'Individual' && n.targetId === user.uid)
      ).slice(0, 3));
    });

    // Fetch live classes for user's batch
    const unsubLive = subscribeToCollection('live_classes', (data) => {
      if (user.batch) {
        setLiveClasses(data.filter(c => c.status !== 'Completed'));
      }
    });

    // Fetch assignments
    const unsubAssignments = subscribeToCollection('assignments', (data) => {
      const studentCourseId = (user as any).courseId;
      const studentBatchId = (user as any).batchId;
      setAssignments(data.filter(a => 
        a.status === 'Active' && 
        (a.courseId === studentCourseId || a.batchId === studentBatchId)
      ));
    });

    // Fetch exams
    const unsubExams = subscribeToCollection('exams', (data) => {
      setExams(data.filter(e => e.status === 'Active'));
    });

    // Fetch attendance for this student
    const unsubAttendance = subscribeToCollection('attendance', (data) => {
      setAttendance(data.filter(a => a.studentId === user.uid));
    });

    // Fetch certificates
    const unsubCertificates = subscribeToCollection('certificates', (data) => {
      setCertificates(data.filter(c => c.studentId === user.uid));
    });

    // Fetch teachers info
    const unsubTeachers = subscribeToCollection('users', (data) => {
      // Find the current student's data in the collection to get the most up-to-date teacher assignments
      const currentStudent = data.find(u => u.uid === user.uid);
      if (!currentStudent) return;

      const studentTeacherId = (currentStudent as any).teacherId;
      const studentTeacherIds = (currentStudent as any).teacherIds || [];
      
      const teachers = data.filter(u => 
        u.role === 'teacher' && 
        (u.uid === studentTeacherId || studentTeacherIds.includes(u.uid))
      ) as Teacher[];
      
      setAssignedTeachers(teachers);
    });

    return () => {
      unsubCourses();
      unsubLive();
      unsubAssignments();
      unsubExams();
      unsubAttendance();
      unsubCertificates();
      unsubTeachers();
      unsubNotifs();
    };
  }, [user]);

  const attendanceRate = attendance.length > 0 
    ? Math.round((attendance.filter(a => a.status === 'Present').length / attendance.length) * 100)
    : 100;

  const upcomingEvents = [
    ...liveClasses.map(c => ({ icon: <Video size={16} />, title: `Live: ${c.title}`, sub: `${c.date} ${c.startTime}`, color: 'var(--color-primary)', type: 'live' })),
    ...exams.map(e => ({ icon: <FileText size={16} />, title: `Exam: ${e.title}`, sub: `Duration: ${e.duration}m`, color: 'var(--color-warning)', type: 'exam' })),
    ...assignments.map(a => ({ icon: <Calendar size={16} />, title: `Task: ${a.title}`, sub: `Due: ${a.dueDate}`, color: 'var(--color-secondary)', type: 'assignment' })),
  ].sort((a, b) => a.sub.localeCompare(b.sub)).slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-secondary/10 to-accent/10 border border-secondary/20 rounded-2xl p-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center font-bold text-2xl text-foreground font-syne">
            {user?.av || 'S'}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold font-syne text-foreground">Welcome back, {user?.name?.split(' ')[0] || 'Student'}! 👋</h1>
            <p className="text-sm text-muted-foreground mt-1">{user?.course || 'No Course'} · {user?.batch || 'No Batch'} · Last login: Today 9:30 AM</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard 
          icon={<BookOpen className="text-secondary" />} 
          value={courses.length.toString()} 
          label="Active Courses" 
          color="blue"
        />
        <StatCard 
          icon={<TrendingUp className="text-success" />} 
          value={`${(user as any).progress || 0}%`} 
          label="Overall Progress" 
          color="green"
        />
        <StatCard 
          icon={<CheckCircle2 className="text-warning" />} 
          value={`${attendanceRate}%`} 
          label="Attendance" 
          color="orange"
        />
      </div>

      {assignedTeachers.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-bold text-muted uppercase tracking-widest">My Assigned Teachers</h3>
            <button 
              onClick={() => navigate('/my-teachers')}
              className="text-[11px] font-bold text-secondary hover:underline uppercase tracking-widest"
            >
              View All
            </button>
          </div>
          <div className="flex flex-wrap gap-4">
            {assignedTeachers.map(teacher => (
              <div key={teacher.uid} className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4 min-w-[240px] flex-1 sm:flex-none">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary font-bold text-lg overflow-hidden border border-secondary/20">
                  {teacher.profilePhoto || teacher.av ? (
                    <img src={teacher.profilePhoto || teacher.av} alt={teacher.name} className="w-full h-full object-cover" />
                  ) : (
                    teacher.name ? teacher.name[0] : 'T'
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">{teacher.name}</div>
                  <div className="text-[11px] text-secondary">{teacher.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="My Courses">
          <div className="space-y-4">
            {courses.length > 0 ? courses.map((course) => (
              <div key={course.id} className="p-4 bg-muted/30 border border-border rounded-xl flex items-center gap-6">
                <div className="w-20 h-14 rounded-lg bg-gradient-to-br from-background to-muted/50 flex items-center justify-center text-3xl">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                  ) : (
                    '📱'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14.5px] font-bold text-foreground truncate">{course.title}</div>
                  <div className="mt-2 h-1.5 bg-card rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-secondary to-accent" style={{ width: `${(user as any).progress || 0}%` }} />
                  </div>
                  <div className="flex justify-between mt-2 text-[11px] text-muted-foreground">
                    <span>{(course as any).modules?.length || 0} Modules</span>
                    <span>{(user as any).progress || 0}% complete</span>
                  </div>
                </div>
                <button 
                  onClick={() => navigate(`/course-player/${course.id}`)}
                  className="bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors"
                >
                  <Play size={12} fill="currentColor" /> Continue
                </button>
              </div>
            )) : (
              <div className="text-center py-8">
                <BookOpen size={32} className="mx-auto text-border mb-2" />
                <p className="text-sm text-muted-foreground">No courses assigned yet</p>
              </div>
            )}
          </div>
        </Card>

        <Card title="Upcoming Events">
          <div className="space-y-4">
            {upcomingEvents.length > 0 ? upcomingEvents.map((event, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: `${event.color}15`, color: event.color }}>
                  {event.icon}
                </div>
                <div>
                  <div className="text-[13.5px] font-semibold text-foreground">{event.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{event.sub}</div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <Calendar size={32} className="mx-auto text-border mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming events</p>
              </div>
            )}
          </div>
        </Card>

        {notifications.length > 0 && (
          <Card title="Recent Notifications">
            <div className="space-y-4">
              {notifications.map((notif) => (
                <div key={notif.id} className="flex items-start gap-4 py-3 border-b border-border last:border-0">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                    <Bell size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-foreground truncate">{notif.title}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{notif.message}</div>
                    <div className="text-[10px] text-muted mt-1 uppercase font-bold tracking-wider">{notif.createdAt}</div>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => navigate('/notifications')}
                className="w-full py-2 text-xs font-bold text-secondary hover:bg-secondary/5 rounded-lg transition-colors mt-2"
              >
                View All Notifications
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
