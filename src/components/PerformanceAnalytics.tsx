import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  BookOpen, 
  Star, 
  CheckCircle2, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Calendar,
  Download
} from 'lucide-react';
import { User, Course, Batch, Student, LiveClass, Attendance, Result, Review } from '../types';
import { subscribeToCollection } from '../services/firestore';
import { cn } from '../lib/utils';
import { Video } from 'lucide-react';

interface PerformanceAnalyticsProps {
  user: User;
}

const PerformanceAnalytics: React.FC<PerformanceAnalyticsProps> = ({ user }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    const unsubCourses = subscribeToCollection('courses', (data) => {
      if (user.role === 'teacher') {
        setCourses(data.filter(c => c.teacherId === user.uid));
      } else {
        setCourses(data);
      }
    });

    const unsubBatches = subscribeToCollection('batches', (data) => {
      if (user.role === 'teacher') {
        setBatches(data.filter(b => b.teacherId === user.uid || b.assistantTeacherId === user.uid));
      } else {
        setBatches(data);
      }
    });

    const unsubStudents = subscribeToCollection('students', (data) => {
      if (user.role === 'teacher') {
        setStudents(data.filter(s => s.teacherId === user.uid));
      } else {
        setStudents(data);
      }
    });

    const unsubLiveClasses = subscribeToCollection('live-classes', (data) => {
      if (user.role === 'teacher') {
        setLiveClasses(data.filter(lc => lc.teacherId === user.uid));
      } else {
        setLiveClasses(data);
      }
    });

    const unsubAttendance = subscribeToCollection('attendance', (data) => {
      if (user.role === 'teacher') {
        const teacherBatchIds = batches.map(b => b.id);
        setAttendance(data.filter(a => teacherBatchIds.includes(a.batchId)));
      } else {
        setAttendance(data);
      }
    });

    const unsubResults = subscribeToCollection('results', (data) => {
      if (user.role === 'teacher') {
        const teacherStudentIds = students.map(s => s.uid);
        setResults(data.filter(r => teacherStudentIds.includes(r.studentId)));
      } else {
        setResults(data);
      }
    });

    const unsubReviews = subscribeToCollection('reviews', (data) => {
      if (user.role === 'teacher') {
        const teacherCourseIds = courses.map(c => c.id);
        setReviews(data.filter(r => teacherCourseIds.includes(r.courseId)));
      } else {
        setReviews(data);
      }
    });

    return () => {
      unsubCourses();
      unsubBatches();
      unsubStudents();
      unsubLiveClasses();
      unsubAttendance();
      unsubResults();
      unsubReviews();
    };
  }, [user, batches.length, students.length, courses.length]);

  // Calculate real stats
  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : courses.length > 0 
      ? (courses.reduce((acc, c) => acc + (c.rating || 0), 0) / courses.length).toFixed(1)
      : '0.0';

  const feedbackDistribution = [5, 4, 3, 2, 1].map(star => {
    const count = reviews.filter(r => r.rating === star).length;
    const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
    return { name: `${star} Star`, value: percentage, count };
  });

  const recentReviews = reviews
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4)
    .map(review => ({
      name: review.studentName,
      course: courses.find(c => c.id === review.courseId)?.title || 'Course',
      rating: review.rating,
      comment: review.comment,
      date: new Date(review.date).toLocaleDateString()
    }));

  const avgCompletion = students.length > 0
    ? Math.round(students.reduce((acc, s) => acc + (s.progress || 0), 0) / students.length)
    : 0;

  const engagementRate = students.length > 0
    ? Math.round((students.filter(s => s.status === 'Active').length / students.length) * 100)
    : 0;

  // Calculate attendance trend (last 7 days)
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  };

  const attendanceTrend = getLast7Days().map(date => {
    const dayAttendance = attendance.filter(a => a.date === date);
    const presentCount = dayAttendance.filter(a => a.status === 'Present').length;
    const totalCount = dayAttendance.length;
    const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
    
    return {
      name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      rate
    };
  });

  // Calculate course completion data
  const courseCompletionData = courses.slice(0, 5).map(course => {
    const courseStudents = students.filter(s => s.courseId === course.id);
    const avgProgress = courseStudents.length > 0
      ? Math.round(courseStudents.reduce((acc, s) => acc + (s.progress || 0), 0) / courseStudents.length)
      : 0;
    
    return {
      name: course.title.length > 15 ? course.title.substring(0, 12) + '...' : course.title,
      completion: avgProgress
    };
  });

  const COLORS = ['#4f8ef7', '#7c5fe6', '#2ecc8a', '#f7924f', '#f75f6a'];

  const stats = [
    { 
      label: 'Classes Taken', 
      value: liveClasses.filter(lc => lc.status === 'Completed').length, 
      trend: '+12%', 
      isUp: true, 
      icon: Video, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10' 
    },
    { 
      label: 'Avg. Rating', 
      value: avgRating, 
      trend: '+0.2', 
      isUp: true, 
      icon: Star, 
      color: 'text-yellow-500', 
      bg: 'bg-yellow-500/10' 
    },
    { 
      label: 'Avg. Progress', 
      value: `${avgCompletion}%`, 
      trend: '+5%', 
      isUp: true, 
      icon: CheckCircle2, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10' 
    },
    { 
      label: 'Active Students', 
      value: `${engagementRate}%`, 
      trend: '-2%', 
      isUp: false, 
      icon: Users, 
      color: 'text-purple-500', 
      bg: 'bg-purple-500/10' 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-foreground">Performance & Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">Track your teaching impact and student progress</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-card p-1 rounded-xl border border-border">
            {['7d', '30d', '90d', 'all'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                  timeRange === range ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {range}
              </button>
            ))}
          </div>
          <button className="p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-foreground transition-colors">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="p-5 border-border">
            <div className="flex items-start justify-between mb-4">
              <div className={cn("p-2.5 rounded-xl", stat.bg, stat.color)}>
                <stat.icon size={20} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg",
                stat.isUp ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              )}>
                {stat.isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {stat.trend}
              </div>
            </div>
            <div className="text-2xl font-bold font-syne text-foreground">{stat.value}</div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend */}
        <Card className="lg:col-span-2 p-6 border-border">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold font-syne text-foreground">Attendance Overview</h3>
              <p className="text-xs text-muted-foreground">Daily average attendance across all batches</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Attendance %</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrend}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--muted-foreground)" 
                  fontSize={10} 
                  fontWeight="bold"
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="var(--muted-foreground)" 
                  fontSize={10} 
                  fontWeight="bold"
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                  itemStyle={{ color: 'var(--foreground)', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="var(--primary)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRate)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Student Feedback */}
        <Card className="p-6 border-border">
          <h3 className="text-lg font-bold font-syne text-foreground mb-2">Student Feedback</h3>
          <p className="text-xs text-muted-foreground mb-8">Rating distribution from course reviews</p>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={feedbackDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {feedbackDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                  itemStyle={{ color: 'var(--foreground)', fontSize: '12px', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-2xl font-bold text-foreground">{avgRating}</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Avg Rating</div>
            </div>
          </div>
          <div className="space-y-3 mt-4">
            {feedbackDistribution.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-[11px] font-bold text-muted-foreground">{item.name}</span>
                </div>
                <span className="text-[11px] font-bold text-foreground">{item.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Completion */}
        <Card className="p-6 border-border">
          <h3 className="text-lg font-bold font-syne text-foreground mb-2">Course Completion Rate</h3>
          <p className="text-xs text-muted-foreground mb-8">Progress of students across assigned courses</p>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseCompletionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="var(--muted-foreground)" 
                  fontSize={10} 
                  fontWeight="bold"
                  axisLine={false}
                  tickLine={false}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: 'var(--secondary)' }}
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                />
                <Bar 
                  dataKey="completion" 
                  fill="var(--accent)" 
                  radius={[0, 4, 4, 0]} 
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent Feedback List */}
        <Card className="p-6 border-border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold font-syne text-foreground">Recent Student Feedback</h3>
            <button className="text-[11px] font-bold text-primary hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {recentReviews.length > 0 ? recentReviews.map((feedback, i) => (
              <div key={i} className="p-4 bg-secondary rounded-2xl border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                      {feedback.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">{feedback.name}</div>
                      <div className="text-[10px] text-muted-foreground">{feedback.course}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-0.5 text-warning">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={10} fill={i < feedback.rating ? "currentColor" : "none"} />
                      ))}
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-1">{feedback.date}</div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground italic">"{feedback.comment}"</p>
              </div>
            )) : (
              <div className="text-center py-12">
                <Star size={32} className="mx-auto text-muted mb-2" />
                <p className="text-sm text-muted-foreground">No feedback yet</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceAnalytics;
