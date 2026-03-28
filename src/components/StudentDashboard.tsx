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
import { subscribeToCollection } from '../services/firestore';
import { Course, User } from '../types';
import { useNavigate } from 'react-router-dom';

interface StudentDashboardProps {
  user: User;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    // In real app, fetch only enrolled courses
    const unsubCourses = subscribeToCollection('courses', setCourses);

    return () => {
      unsubCourses();
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-[#4f8ef7]/10 to-[#7c5fe6]/10 border border-[#4f8ef7]/20 rounded-2xl p-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4f8ef7] to-[#7c5fe6] flex items-center justify-center font-bold text-2xl text-white font-syne">
            {user?.av || 'S'}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold font-syne text-white">Welcome back, {user?.name.split(' ')[0] || 'Student'}! 👋</h1>
            <p className="text-sm text-[#6b7599] mt-1">Digital Marketing · DM-2026-MAR · Last login: Today 9:30 AM</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<BookOpen className="text-[#4f8ef7]" />} 
          value="1" 
          label="Active Course" 
          color="blue"
        />
        <StatCard 
          icon={<TrendingUp className="text-[#2ecc8a]" />} 
          value="72%" 
          label="Overall Progress" 
          color="green"
        />
        <StatCard 
          icon={<CheckCircle2 className="text-[#f7924f]" />} 
          value="85%" 
          label="Attendance" 
          color="orange"
        />
        <StatCard 
          icon={<Award className="text-[#7c5fe6]" />} 
          value="1" 
          label="Certificates" 
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="My Course Progress">
          <div className="p-4 bg-[#1a2035] border border-[#242b40] rounded-xl flex items-center gap-6">
            <div className="w-20 h-14 rounded-lg bg-gradient-to-br from-[#0f2027] to-[#203a43] flex items-center justify-center text-3xl">📱</div>
            <div className="flex-1 min-w-0">
              <div className="text-[14.5px] font-bold text-[#e8ecf5] truncate">Digital Marketing Masterclass</div>
              <div className="mt-2 h-1.5 bg-[#131726] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#4f8ef7] to-[#7c5fe6]" style={{ width: '72%' }} />
              </div>
              <div className="flex justify-between mt-2 text-[11px] text-[#6b7599]">
                <span>Module 3 of 4</span>
                <span>72% complete</span>
              </div>
            </div>
            <button 
              onClick={() => navigate('/course-player/1')}
              className="bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors"
            >
              <Play size={12} fill="currentColor" /> Continue
            </button>
          </div>
        </Card>

        <Card title="Upcoming Events">
          <div className="space-y-4">
            {[
              { icon: <Video size={16} />, title: 'Live Class — Week 4', sub: 'Today 10:00 AM', color: '#f75f6a' },
              { icon: <FileText size={16} />, title: 'Mid Term Exam', sub: '25 Mar 2026', color: '#f7924f' },
              { icon: <Calendar size={16} />, title: 'Assignment #4 Due', sub: '28 Mar 2026', color: '#4f8ef7' },
            ].map((event, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-[#242b40] last:border-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: `${event.color}15`, color: event.color }}>
                  {event.icon}
                </div>
                <div>
                  <div className="text-[13.5px] font-semibold text-[#e8ecf5]">{event.title}</div>
                  <div className="text-[11px] text-[#6b7599] mt-0.5">{event.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
