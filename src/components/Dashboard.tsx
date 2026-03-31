import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard, Card } from './ui/Card';
import { 
  Users, 
  UserSquare2, 
  BookOpen, 
  Layers, 
  IndianRupee, 
  ClipboardList,
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { subscribeToCollection } from '../services/firestore';
import { User, Course, Batch, Payment, AssignmentSubmission, Notification as AppNotification } from '../types';
import Modal from './ui/Modal';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, formatDistanceToNow } from 'date-fns';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  // Modal States
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedMonthData, setSelectedMonthData] = useState<any>(null);

  useEffect(() => {
    const unsubUsers = subscribeToCollection('users', (data) => {
      setStudents(data.filter(u => u.role === 'student'));
      setTeachers(data.filter(u => u.role === 'teacher'));
    });
    const unsubCourses = subscribeToCollection('courses', setCourses);
    const unsubBatches = subscribeToCollection('batches', setBatches);
    const unsubPayments = subscribeToCollection('payments', setPayments);
    const unsubSubmissions = subscribeToCollection('assignmentSubmissions', setSubmissions);
    const unsubNotifications = subscribeToCollection('notifications', (data: AppNotification[]) => {
      const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setActivities(sorted.slice(0, 10).map(n => ({
        color: n.type === 'success' ? 'var(--color-success)' : n.type === 'warning' ? 'var(--color-warning)' : n.type === 'error' ? 'var(--color-destructive)' : 'var(--color-secondary)',
        msg: n.message,
        time: formatDistanceToNow(new Date(n.date)) + ' ago',
        type: n.title,
        fullDate: n.date
      })));
    });

    return () => {
      unsubUsers();
      unsubCourses();
      unsubBatches();
      unsubPayments();
      unsubSubmissions();
      unsubNotifications();
    };
  }, []);

  // Calculate Real Revenue Data
  const revenueData = Array.from({ length: 12 }).map((_, i) => {
    const date = subMonths(new Date(), 11 - i);
    const monthName = format(date, 'MMM');
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    const monthlyTotal = payments
      .filter(p => {
        const pDate = parseISO(p.date);
        return isWithinInterval(pDate, { start, end });
      })
      .reduce((sum, p) => sum + (Number(p.paid) || 0), 0);

    return { month: monthName, revenue: monthlyTotal, date };
  });

  const currentMonthRevenue = revenueData[11].revenue;
  const lastMonthRevenue = revenueData[10].revenue;
  const revenueGrowth = lastMonthRevenue === 0 ? 100 : Math.round(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100);

  const pendingTasksCount = submissions.filter(s => s.status === 'Pending').length;
  const totalRevenueAllTime = payments.reduce((sum, p) => sum + (Number(p.paid) || 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-foreground">System Overview</h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time analytics and management</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-card border border-border rounded-xl shadow-lg">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
          </div>
          <span className="text-xs font-bold text-foreground uppercase tracking-widest">System Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3 md:gap-4">
        <StatCard 
          icon={<Users className="text-secondary" />} 
          value={students.length} 
          label="Total Students" 
          change="12% this month" 
          trend="up" 
          color="blue"
          onClick={() => navigate('/students')}
        />
        <StatCard 
          icon={<UserSquare2 className="text-accent" />} 
          value={teachers.length} 
          label="Active Teachers" 
          change="2 new" 
          trend="up" 
          color="purple"
          onClick={() => navigate('/teachers')}
        />
        <StatCard 
          icon={<BookOpen className="text-success" />} 
          value={courses.length} 
          label="Total Courses" 
          change="3 new" 
          trend="up" 
          color="green"
          onClick={() => navigate('/courses')}
        />
        <StatCard 
          icon={<Layers className="text-warning" />} 
          value={batches.length} 
          label="Active Batches" 
          color="orange"
          onClick={() => navigate('/batches')}
        />
        <StatCard 
          icon={<IndianRupee className="text-success" />} 
          value={`₹${(currentMonthRevenue / 1000).toFixed(1)}k`} 
          label="Monthly Revenue" 
          change={`${revenueGrowth}%`} 
          trend={revenueGrowth >= 0 ? 'up' : 'down'} 
          color="green"
          onClick={() => navigate('/payments')}
        />
        <StatCard 
          icon={<ClipboardList className="text-destructive" />} 
          value={pendingTasksCount} 
          label="Pending Tasks" 
          color="red"
          onClick={() => setIsTasksModalOpen(true)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card title="Revenue (12 Months)" headerAction={<span className="text-[11px] font-bold text-secondary bg-secondary/10 px-2 py-1 rounded-full">₹{(totalRevenueAllTime / 100000).toFixed(1)}L Total</span>}>
          <div className="h-[250px] md:h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={revenueData}
                onClick={(data: any) => {
                  if (data && data.activePayload) {
                    setSelectedMonthData(data.activePayload[0].payload);
                    setIsRevenueModalOpen(true);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--color-muted)', fontSize: 10 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--color-muted)', fontSize: 10 }}
                  tickFormatter={(val) => `₹${val/1000}k`}
                />
                <Tooltip 
                  cursor={{ fill: 'var(--color-secondary-muted)' }}
                  contentStyle={{ 
                    backgroundColor: 'var(--color-card)', 
                    border: '1px solid var(--color-border)', 
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: 'var(--color-foreground)'
                  }}
                  itemStyle={{ color: 'var(--color-secondary)' }}
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {revenueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === revenueData.length - 1 ? 'var(--color-secondary)' : 'var(--color-secondary-muted)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Recent Activity">
          <div className="space-y-6 mt-2">
            {activities.length > 0 ? activities.slice(0, 5).map((activity, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: activity.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium text-foreground">{activity.msg}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{activity.time}</div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-muted-foreground text-sm italic">No recent activity</div>
            )}
          </div>
          <button 
            onClick={() => setIsActivityModalOpen(true)}
            className="w-full mt-6 py-2.5 text-[12px] font-bold text-secondary bg-secondary/5 hover:bg-secondary/10 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            View All Activity <ArrowUpRight size={14} />
          </button>
        </Card>
      </div>

      {/* Modals */}
      <Modal 
        isOpen={isRevenueModalOpen} 
        onClose={() => setIsRevenueModalOpen(false)} 
        title={`Revenue Details - ${selectedMonthData?.month || ''}`}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-background border border-border rounded-2xl">
              <div className="text-[11px] text-muted-foreground font-bold uppercase mb-1">Total Revenue</div>
              <div className="text-2xl font-bold text-foreground">₹{selectedMonthData?.revenue.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-background border border-border rounded-2xl">
              <div className="text-[11px] text-muted-foreground font-bold uppercase mb-1">Payments</div>
              <div className="text-2xl font-bold text-success">
                {payments.filter(p => {
                  const pDate = parseISO(p.date);
                  return isWithinInterval(pDate, { 
                    start: startOfMonth(selectedMonthData?.date || new Date()), 
                    end: endOfMonth(selectedMonthData?.date || new Date()) 
                  });
                }).length}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-foreground">Recent Payments this Month</h4>
            {payments
              .filter(p => {
                const pDate = parseISO(p.date);
                return isWithinInterval(pDate, { 
                  start: startOfMonth(selectedMonthData?.date || new Date()), 
                  end: endOfMonth(selectedMonthData?.date || new Date()) 
                });
              })
              .slice(0, 5)
              .map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-secondary" />
                    <span className="text-sm text-foreground">Payment ID: {p.id.slice(0, 8)}</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">₹{p.paid.toLocaleString()}</span>
                </div>
              ))}
            {payments.filter(p => {
              const pDate = parseISO(p.date);
              return isWithinInterval(pDate, { 
                start: startOfMonth(selectedMonthData?.date || new Date()), 
                end: endOfMonth(selectedMonthData?.date || new Date()) 
              });
            }).length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-xs">No payments recorded for this period</div>
            )}
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isTasksModalOpen} 
        onClose={() => setIsTasksModalOpen(false)} 
        title="Pending Tasks"
      >
        <div className="space-y-4">
          {submissions.filter(s => s.status === 'Pending').length > 0 ? (
            submissions.filter(s => s.status === 'Pending').map((task, i) => (
              <div key={i} className="group p-4 bg-card border border-border rounded-2xl hover:border-secondary/30 transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-xl bg-muted/50 text-muted-foreground group-hover:text-secondary transition-colors">
                    <ClipboardList size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">Assignment: {task.assignmentId.slice(0, 8)}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-destructive/10 text-destructive">
                        Pending
                      </span>
                    </div>
                    <div className="text-[12px] text-foreground mb-1">Student: {task.studentName}</div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Clock size={12} /> Submitted: {format(parseISO(task.submissionDate), 'PPP')}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="text-foreground font-bold">All caught up!</h4>
              <p className="text-muted-foreground text-sm mt-1">No pending assignment submissions to check.</p>
            </div>
          )}
        </div>
      </Modal>

      <Modal 
        isOpen={isActivityModalOpen} 
        onClose={() => setIsActivityModalOpen(false)} 
        title="All System Activity"
      >
        <div className="space-y-6">
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((item, j) => (
                <div key={j} className="flex gap-4 items-start p-3 hover:bg-muted/30 rounded-xl transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0" style={{ color: item.color }}>
                    <TrendingUp size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: item.color }}>{item.type}</span>
                      <span className="text-[11px] text-muted-foreground">{item.time}</span>
                    </div>
                    <div className="text-[13.5px] font-medium text-foreground">{item.msg}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">No activity logs found</div>
          )}
        </div>
      </Modal>

      <Card 
        title="Recent Students" 
        headerAction={
          <button 
            onClick={() => navigate('/students')}
            className="text-[11px] font-bold text-secondary hover:underline"
          >
            View All
          </button>
        }
      >
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Course</th>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Progress</th>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.slice(0, 5).map((s) => (
                <tr key={s.uid} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-bold text-xs">
                        {s.av}
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-foreground">{s.name}</div>
                        <div className="text-[11px] text-muted-foreground">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-muted-foreground">{s.course || 'No Course'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-secondary to-accent" style={{ width: `${(s as any).progress || 0}%` }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground">{(s as any).progress || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold uppercase">
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
