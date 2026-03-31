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
  Video
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
  const [teacher, setTeacher] = useState<Teacher | null>(null);

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

    // Fetch teacher info if available
    if ((user as any).teacherId) {
      const unsubTeacher = subscribeToCollection('users', (data) => {
        const t = data.find(u => u.uid === (user as any).teacherId && u.role === 'teacher');
        if (t) setTeacher(t as Teacher);
      });
      return () => {
        unsubCourses();
        unsubLive();
        unsubAssignments();
        unsubExams();
        unsubAttendance();
        unsubCertificates();
        unsubTeacher();
      };
    }

    return () => {
      unsubCourses();
      unsubLive();
      unsubAssignments();
      unsubExams();
      unsubAttendance();
      unsubCertificates();
    };
  }, [user]);

  const attendanceRate = attendance.length > 0 
    ? Math.round((attendance.filter(a => a.status === 'Present').length / attendance.length) * 100)
    : 100;

  const upcomingEvents = [
    ...liveClasses.map(c => ({ icon: <Video size={16} />, title: `Live: ${c.title}`, sub: `${c.date} ${c.time}`, color: 'var(--color-primary)', type: 'live' })),
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <StatCard 
          icon={<Award className="text-accent" />} 
          value={certificates.length.toString()} 
          label="Certificates" 
          color="purple"
        />
      </div>

      {teacher && (
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center text-secondary font-bold text-lg overflow-hidden border border-border">
            {teacher.av ? (
              <img src={teacher.av} alt={teacher.name} className="w-full h-full object-cover" />
            ) : (
              teacher.name ? teacher.name[0] : 'T'
            )}
          </div>
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assigned Teacher</div>
            <div className="text-sm font-bold text-foreground">{teacher.name}</div>
            <div className="text-[11px] text-secondary">{teacher.email}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="My Course Progress">
          <div className="p-4 bg-muted/30 border border-border rounded-xl flex items-center gap-6">
            <div className="w-20 h-14 rounded-lg bg-gradient-to-br from-background to-muted/50 flex items-center justify-center text-3xl">📱</div>
            <div className="flex-1 min-w-0">
              <div className="text-[14.5px] font-bold text-foreground truncate">{user?.course || 'No Course'}</div>
              <div className="mt-2 h-1.5 bg-card rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-secondary to-accent" style={{ width: `${(user as any).progress || 0}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-[11px] text-muted-foreground">
                <span>Module 0 of 0</span>
                <span>{(user as any).progress || 0}% complete</span>
              </div>
            </div>
            <button 
              onClick={() => navigate('/course-player/1')}
              className="bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors"
            >
              <Play size={12} fill="currentColor" /> Continue
            </button>
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
      </div>

      {certificates.length > 0 && (
        <Card title="My Certificates">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {certificates.map((cert) => (
              <div key={cert.id} className="p-4 bg-muted/30 border border-border rounded-xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                  <Award size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-bold text-foreground truncate">{cert.courseName}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Issued on {cert.issueDate}</div>
                </div>
                <button 
                  onClick={() => window.open(cert.url, '_blank')}
                  className="p-2 text-secondary hover:bg-secondary/10 rounded-lg transition-colors"
                  title="Download Certificate"
                >
                  <Award size={18} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default StudentDashboard;
