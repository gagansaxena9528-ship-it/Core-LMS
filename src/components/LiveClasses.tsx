import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { 
  Video, 
  Calendar, 
  Clock, 
  User, 
  ExternalLink, 
  Plus, 
  Search, 
  MoreVertical,
  PlayCircle,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { subscribeToCollection, addDoc, updateDoc, deleteDoc } from '../services/firestore';
import { sendEmail, getNewRecordTemplate } from '../services/emailService';
import { LiveClass, Course, Batch, User as UserType, Student } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface LiveClassesProps {
  user: UserType;
}

const LiveClasses: React.FC<LiveClassesProps> = ({ user }) => {
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsubLive = subscribeToCollection('live_classes', setLiveClasses);
    const unsubCourses = subscribeToCollection('courses', setCourses);
    const unsubBatches = subscribeToCollection('batches', setBatches);
    const unsubStudents = subscribeToCollection('users', (data) => {
      setStudents(data.filter(u => u.role === 'student') as Student[]);
    });

    return () => {
      unsubLive();
      unsubCourses();
      unsubBatches();
      unsubStudents();
    };
  }, []);

  const handleAddClass = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const newClass: Partial<LiveClass> = {
      title: formData.get('title') as string,
      courseId: formData.get('courseId') as string,
      batchId: formData.get('batchId') as string,
      teacherId: user.uid,
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      status: 'Upcoming',
      meetLink: formData.get('meetLink') as string,
    };

    try {
      const docRef = await addDoc('live_classes', newClass);
      
      // Notify students about new live class
      const batchStudents = students.filter(s => s.batchId === newClass.batchId || !newClass.batchId);
      for (const student of batchStudents) {
        const course = courses.find(c => c.id === newClass.courseId);
        const details = `A new live class "${newClass.title}" has been scheduled for course "${course?.title || 'Unknown'}". Date: ${newClass.date}, Time: ${newClass.time}. Join Link: ${newClass.meetLink}`;
        const html = getNewRecordTemplate('Live Class', student.name, details);
        await sendEmail(student.email, `New Live Class Scheduled: ${newClass.title}`, html);
      }

      setShowModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isAdminOrTeacher = user.role === 'admin' || user.role === 'teacher';

  const filteredClasses = liveClasses.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-white">Live Classes</h2>
          <p className="text-sm text-[#6b7599] mt-1">Interactive sessions with instructors</p>
        </div>
        {isAdminOrTeacher && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors w-fit"
          >
            <Plus size={18} /> Schedule Class
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Live Now Section */}
        {liveClasses.filter(c => c.status === 'Live').map(c => (
          <Card key={c.id} className="border-[#2ecc8a]/30 bg-[#2ecc8a]/5 relative overflow-hidden group">
            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-[#2ecc8a] text-white px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
              <div className="w-1 h-1 rounded-full bg-white" /> LIVE
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#2ecc8a]/10 text-[#2ecc8a] flex items-center justify-center">
                <Video size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#e8ecf5]">{c.title}</h3>
                <p className="text-sm text-[#6b7599] mt-1">
                  {courses.find(course => course.id === c.courseId)?.title}
                </p>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-1.5 text-xs text-[#6b7599]">
                  <User size={14} /> Instructor
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#6b7599]">
                  <Clock size={14} /> Started 20m ago
                </div>
              </div>
              <a 
                href={c.meetLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full bg-[#2ecc8a] hover:bg-[#27ae60] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20"
              >
                Join Now <ExternalLink size={16} />
              </a>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-[#131726] border border-[#242b40] rounded-xl px-4 py-2 w-full max-w-md">
        <Search size={16} className="text-[#6b7599]" />
        <input 
          type="text" 
          placeholder="Search classes..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm w-full placeholder-[#6b7599]"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredClasses.filter(c => c.status !== 'Live').map(c => (
          <div key={c.id} className="bg-[#131726] border border-[#242b40] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#4f8ef7]/50 transition-all group">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                c.status === 'Upcoming' ? "bg-blue-500/10 text-[#4f8ef7]" : "bg-[#1a2035] text-[#6b7599]"
              )}>
                <Calendar size={24} />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[#e8ecf5]">{c.title}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  <span className="text-[12px] text-[#6b7599] font-medium">
                    {courses.find(course => course.id === c.courseId)?.title}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#6b7599]">
                    <Clock size={12} /> {c.date} at {c.time}
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                    c.status === 'Upcoming' ? "bg-blue-500/10 text-[#4f8ef7]" : "bg-gray-500/10 text-[#6b7599]"
                  )}>
                    {c.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {c.status === 'Upcoming' && (
                <button className="text-[#4f8ef7] hover:text-[#3a7ae8] text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-500/5 transition-all">
                  Set Reminder
                </button>
              )}
              {isAdminOrTeacher ? (
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-[#1a2035] rounded-lg text-[#6b7599] transition-colors">
                    <MoreVertical size={18} />
                  </button>
                </div>
              ) : (
                <button 
                  disabled={c.status === 'Completed'}
                  className={cn(
                    "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                    c.status === 'Upcoming' ? "bg-[#1a2035] border border-[#242b40] text-[#e8ecf5] hover:bg-[#242b40]" : "bg-[#1a2035] text-[#6b7599] cursor-not-allowed"
                  )}
                >
                  {c.status === 'Completed' ? 'Ended' : 'Join Class'}
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredClasses.length === 0 && (
          <div className="text-center py-12 bg-[#131726] border border-[#242b40] border-dashed rounded-2xl">
            <Video size={48} className="mx-auto text-[#242b40] mb-4" />
            <p className="text-[#6b7599]">No live classes scheduled</p>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#131726] border border-[#242b40] rounded-2xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold font-syne">Schedule Live Class</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-red-500/10 text-[#6b7599] hover:text-red-500 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddClass} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Class Title</label>
                  <input 
                    name="title"
                    required
                    className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                    placeholder="e.g. Advanced SEO Techniques"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Course</label>
                    <select 
                      name="courseId"
                      required
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                    >
                      <option value="">Select Course</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Batch</label>
                    <select 
                      name="batchId"
                      required
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                    >
                      <option value="">Select Batch</option>
                      {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Date</label>
                    <input 
                      name="date"
                      type="date"
                      required
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Time</label>
                    <input 
                      name="time"
                      type="time"
                      required
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Meeting Link (Zoom/Meet)</label>
                  <input 
                    name="meetLink"
                    required
                    className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                    placeholder="https://meet.google.com/..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Scheduling...' : 'Schedule Class'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 bg-[#1a2035] border border-[#242b40] text-[#e8ecf5] rounded-xl font-bold text-sm hover:bg-[#242b40] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveClasses;
