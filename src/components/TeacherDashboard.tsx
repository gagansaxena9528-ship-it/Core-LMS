import React, { useState, useEffect } from 'react';
import { StatCard, Card } from './ui/Card';
import { 
  BookOpen, 
  Layers, 
  Users, 
  ClipboardCheck,
  Calendar,
  Clock,
  ArrowRight
} from 'lucide-react';
import { subscribeToQuery } from '../services/firestore';
import { Course, Batch, User } from '../types';

interface TeacherDashboardProps {
  user: User;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<User[]>([]);

  useEffect(() => {
    const unsubCourses = subscribeToQuery('courses', 'teacherId', '==', user.uid, setCourses);
    const unsubBatches = subscribeToQuery('batches', 'teacherId', '==', user.uid, setBatches);
    const unsubStudents = subscribeToQuery('users', 'role', '==', 'student', (data) => {
      // In real app, filter students assigned to this teacher's batches
      setStudents(data);
    });

    return () => {
      unsubCourses();
      unsubBatches();
      unsubStudents();
    };
  }, [user.uid]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<BookOpen className="text-[#4f8ef7]" />} 
          value={courses.length} 
          label="My Courses" 
          color="blue"
        />
        <StatCard 
          icon={<Layers className="text-[#7c5fe6]" />} 
          value={batches.length} 
          label="Active Batches" 
          color="purple"
        />
        <StatCard 
          icon={<Users className="text-[#2ecc8a]" />} 
          value={students.length} 
          label="My Students" 
          color="green"
        />
        <StatCard 
          icon={<ClipboardCheck className="text-[#f75f6a]" />} 
          value="12" 
          label="Pending Reviews" 
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Today's Schedule">
          <div className="space-y-4 mt-2">
            {[
              { title: 'Digital Marketing — Week 4', time: '10:00 AM', type: 'Live Class', color: '#f75f6a' },
              { title: 'Assignment Review', time: '02:00 PM', type: 'Workshop', color: '#f7924f' },
              { title: '1-on-1: Priya Sharma', time: '04:00 PM', type: 'Mentoring', color: '#4f8ef7' },
            ].map((event, i) => (
              <div key={i} className="flex gap-4 p-4 bg-[#1a2035] border border-[#242b40] rounded-xl border-l-4" style={{ borderLeftColor: event.color }}>
                <div className="w-16 flex-shrink-0 font-syne font-bold text-xs text-[#e8ecf5]">{event.time}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-[#e8ecf5] truncate">{event.title}</div>
                  <div className="text-[11px] text-[#6b7599] mt-1">{event.type}</div>
                </div>
                <button className="p-2 hover:bg-[#242b40] rounded-lg transition-colors text-[#6b7599]">
                  <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Pending Submissions" headerAction={<span className="px-2 py-1 rounded-full bg-red-500/10 text-[#f75f6a] text-[10px] font-bold">12 Total</span>}>
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
                {students.slice(0, 4).map((s) => (
                  <tr key={s.uid} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-blue-500/10 text-[#4f8ef7] flex items-center justify-center font-bold text-[10px]">
                          {s.av}
                        </div>
                        <span className="text-[13px] font-medium">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[12px] text-[#6b7599]">Assignment #4</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[11px] font-bold text-[#4f8ef7] hover:underline bg-blue-500/5 px-3 py-1 rounded-lg">Grade</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboard;
