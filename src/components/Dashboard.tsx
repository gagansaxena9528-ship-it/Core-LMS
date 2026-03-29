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
  TrendingUp
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { subscribeToCollection } from '../services/firestore';
import { User, Course, Batch } from '../types';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  useEffect(() => {
    const unsubUsers = subscribeToCollection('users', (data) => {
      setStudents(data.filter(u => u.role === 'student'));
      setTeachers(data.filter(u => u.role === 'teacher'));
    });
    const unsubCourses = subscribeToCollection('courses', setCourses);
    const unsubBatches = subscribeToCollection('batches', setBatches);

    return () => {
      unsubUsers();
      unsubCourses();
      unsubBatches();
    };
  }, []);

  const revenueData = [
    { month: 'Apr', revenue: 240000 },
    { month: 'May', revenue: 320000 },
    { month: 'Jun', revenue: 280000 },
    { month: 'Jul', revenue: 450000 },
    { month: 'Aug', revenue: 380000 },
    { month: 'Sep', revenue: 520000 },
    { month: 'Oct', revenue: 480000 },
    { month: 'Nov', revenue: 610000 },
    { month: 'Dec', revenue: 550000 },
    { month: 'Jan', revenue: 680000 },
    { month: 'Feb', revenue: 720000 },
    { month: 'Mar', revenue: 850000 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-white">System Overview</h2>
          <p className="text-sm text-[#6b7599] mt-1">Real-time analytics and management</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-[#131726] border border-[#242b40] rounded-xl shadow-lg">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2ecc8a] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#2ecc8a]"></span>
          </div>
          <span className="text-xs font-bold text-[#e8ecf5] uppercase tracking-widest">System Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3 md:gap-4">
        <StatCard 
          icon={<Users className="text-[#4f8ef7]" />} 
          value={students.length} 
          label="Total Students" 
          change="12% this month" 
          trend="up" 
          color="blue"
          onClick={() => navigate('/students')}
        />
        <StatCard 
          icon={<UserSquare2 className="text-[#7c5fe6]" />} 
          value={teachers.length} 
          label="Active Teachers" 
          change="2 new" 
          trend="up" 
          color="purple"
          onClick={() => navigate('/teachers')}
        />
        <StatCard 
          icon={<BookOpen className="text-[#2ecc8a]" />} 
          value={courses.length} 
          label="Total Courses" 
          change="3 new" 
          trend="up" 
          color="green"
          onClick={() => navigate('/courses')}
        />
        <StatCard 
          icon={<Layers className="text-[#f7924f]" />} 
          value={batches.length} 
          label="Active Batches" 
          color="orange"
          onClick={() => navigate('/batches')}
        />
        <StatCard 
          icon={<IndianRupee className="text-[#2ecc8a]" />} 
          value="₹3.2L" 
          label="Monthly Revenue" 
          change="18%" 
          trend="up" 
          color="green"
        />
        <StatCard 
          icon={<ClipboardList className="text-[#f75f6a]" />} 
          value="47" 
          label="Pending Tasks" 
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card title="Revenue (12 Months)" headerAction={<span className="text-[11px] font-bold text-[#4f8ef7] bg-blue-500/10 px-2 py-1 rounded-full">₹38.4L Total</span>}>
          <div className="h-[250px] md:h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#242b40" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7599', fontSize: 10 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7599', fontSize: 10 }}
                  tickFormatter={(val) => `₹${val/1000}k`}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(79, 142, 247, 0.05)' }}
                  contentStyle={{ 
                    backgroundColor: '#131726', 
                    border: '1px solid #242b40', 
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#e8ecf5'
                  }}
                  itemStyle={{ color: '#4f8ef7' }}
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {revenueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === revenueData.length - 1 ? '#4f8ef7' : '#4f8ef780'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Recent Activity">
          <div className="space-y-6 mt-2">
            {[
              { color: '#4f8ef7', msg: 'Priya enrolled in Digital Marketing', time: '2 min ago' },
              { color: '#2ecc8a', msg: 'New video uploaded — SEO Strategies', time: '20 min ago' },
              { color: '#f7924f', msg: 'Payment received from Arjun ₹4,999', time: '1 hr ago' },
              { color: '#7c5fe6', msg: 'Batch DM-2026-March class scheduled', time: '2 hrs ago' },
              { color: '#f75f6a', msg: 'Assignment #4 deadline tomorrow', time: '3 hrs ago' },
            ].map((activity, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: activity.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium text-[#e8ecf5]">{activity.msg}</div>
                  <div className="text-[11px] text-[#6b7599] mt-1">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2.5 text-[12px] font-bold text-[#4f8ef7] bg-blue-500/5 hover:bg-blue-500/10 rounded-xl transition-colors flex items-center justify-center gap-2">
            View All Activity <ArrowUpRight size={14} />
          </button>
        </Card>
      </div>

      <Card 
        title="Recent Students" 
        headerAction={
          <button 
            onClick={() => navigate('/students')}
            className="text-[11px] font-bold text-[#4f8ef7] hover:underline"
          >
            View All
          </button>
        }
      >
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a2035]">
                <th className="px-6 py-3 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Course</th>
                <th className="px-6 py-3 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Progress</th>
                <th className="px-6 py-3 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242b40]">
              {students.slice(0, 5).map((s) => (
                <tr key={s.uid} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 text-[#4f8ef7] flex items-center justify-center font-bold text-xs">
                        {s.av}
                      </div>
                      <div>
                        <div className="text-[13px] font-medium">{s.name}</div>
                        <div className="text-[11px] text-[#6b7599]">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-[#6b7599]">Digital Marketing</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-[#1a2035] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#4f8ef7] to-[#7c5fe6]" style={{ width: '72%' }} />
                      </div>
                      <span className="text-[11px] text-[#6b7599]">72%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-[#2ecc8a] text-[10px] font-bold uppercase">
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
