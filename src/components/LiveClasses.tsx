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
  X,
  Trash2,
  Edit2
} from 'lucide-react';
import { subscribeToCollection, addDoc, updateDoc, deleteDoc } from '../services/firestore';
import { sendEmail, getLiveClassEmailTemplate } from '../services/emailService';
import { LiveClass, Course, Batch, User as UserType, Student, Teacher } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { format, isAfter, isBefore, addMinutes, subMinutes, parse } from 'date-fns';

interface LiveClassesProps {
  user: UserType;
}

const LiveClasses: React.FC<LiveClassesProps> = ({ user }) => {
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editingClass, setEditingClass] = useState<LiveClass | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubLive = subscribeToCollection('liveClasses', setLiveClasses);
    const unsubCourses = subscribeToCollection('courses', setCourses);
    const unsubBatches = subscribeToCollection('batches', setBatches);
    const unsubUsers = subscribeToCollection('users', (data) => {
      setStudents(data.filter(u => u.role === 'student') as Student[]);
      setTeachers(data.filter(u => u.role === 'teacher') as Teacher[]);
    });

    return () => {
      unsubLive();
      unsubCourses();
      unsubBatches();
      unsubUsers();
    };
  }, []);

  const getStatus = (date: string, startTime: string, endTime: string): 'Upcoming' | 'Live' | 'Completed' => {
    const classStart = parse(`${date} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const classEnd = parse(`${date} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());

    if (isAfter(currentTime, classEnd)) return 'Completed';
    if (isAfter(currentTime, subMinutes(classStart, 10)) && isBefore(currentTime, classEnd)) return 'Live';
    return 'Upcoming';
  };

  const handleAddClass = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const classData: Partial<LiveClass> = {
      title: formData.get('title') as string,
      courseId: formData.get('courseId') as string,
      batchId: formData.get('batchId') as string,
      teacherId: formData.get('teacherId') as string || user.uid,
      date: formData.get('date') as string,
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
      meetingLink: formData.get('meetingLink') as string,
      meetingType: formData.get('meetingType') as any,
      status: getStatus(
        formData.get('date') as string, 
        formData.get('startTime') as string, 
        formData.get('endTime') as string
      ),
      createdAt: new Date().toISOString(),
    };

    try {
      if (editingClass) {
        await updateDoc('liveClasses', editingClass.id, classData);
      } else {
        await addDoc('liveClasses', classData);
        
        // Notify students about new live class
        const batchStudents = students.filter(s => s.batchId === classData.batchId || !classData.batchId);
        for (const student of batchStudents) {
          const html = getLiveClassEmailTemplate(
            student.name, 
            classData.title!, 
            classData.date!, 
            classData.startTime!, 
            classData.endTime!, 
            classData.meetingLink!, 
            classData.meetingType!
          );
          await sendEmail(student.email, `New Live Class: ${classData.title}`, html);
        }
      }

      setShowModal(false);
      setEditingClass(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      await deleteDoc('liveClasses', id);
    }
  };

  const isAdminOrTeacher = user.role === 'admin' || user.role === 'teacher';

  const filteredClasses = liveClasses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
    if (user.role === 'student') {
      const student = students.find(s => s.uid === user.uid);
      if (!student) return false;
      
      const matchesCourse = !c.courseId || c.courseId === student.courseId;
      const matchesBatch = !c.batchId || c.batchId === student.batchId;
      
      return matchesSearch && matchesCourse && matchesBatch;
    }
    return matchesSearch;
  }).sort((a, b) => new Date(`${a.date} ${a.startTime}`).getTime() - new Date(`${b.date} ${b.startTime}`).getTime());

  const canJoin = (c: LiveClass) => {
    const classStart = parse(`${c.date} ${c.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const classEnd = parse(`${c.date} ${c.endTime}`, 'yyyy-MM-dd HH:mm', new Date());
    
    // Can join 10 minutes early until end time
    return isAfter(currentTime, subMinutes(classStart, 10)) && isBefore(currentTime, classEnd);
  };

  const handleSetReminder = (c: LiveClass) => {
    alert(`Reminder set for "${c.title}"! You will receive an email, SMS, and WhatsApp notification 10 minutes before the class starts.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-white">Live Classes</h2>
          <p className="text-sm text-[#6b7599] mt-1">Interactive sessions with instructors</p>
        </div>
        {isAdminOrTeacher && (
          <button 
            onClick={() => {
              setEditingClass(null);
              setShowModal(true);
            }}
            className="bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors w-fit"
          >
            <Plus size={18} /> Schedule Class
          </button>
        )}
      </div>

      {/* Live Now Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {liveClasses.filter(c => getStatus(c.date, c.startTime, c.endTime) === 'Live').map(c => (
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
                  <User size={14} /> {teachers.find(t => t.uid === c.teacherId)?.name || 'Instructor'}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#6b7599]">
                  <Clock size={14} /> {c.startTime} - {c.endTime}
                </div>
              </div>
              <button 
                onClick={() => window.open(c.meetingLink, '_blank')}
                className="w-full bg-[#2ecc8a] hover:bg-[#27ae60] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20"
              >
                Join Now <ExternalLink size={16} />
              </button>
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
        {filteredClasses.map(c => {
          const status = getStatus(c.date, c.startTime, c.endTime);
          const joinable = canJoin(c);

          return (
            <div key={c.id} className="bg-[#131726] border border-[#242b40] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#4f8ef7]/50 transition-all group">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  status === 'Live' ? "bg-green-500/10 text-[#2ecc8a]" : 
                  status === 'Upcoming' ? "bg-blue-500/10 text-[#4f8ef7]" : 
                  "bg-[#1a2035] text-[#6b7599]"
                )}>
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#e8ecf5]">{c.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                    <span className="text-[12px] text-[#6b7599] font-medium">
                      {courses.find(course => course.id === c.courseId)?.title} · {batches.find(b => b.id === c.batchId)?.name}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#6b7599]">
                      <Clock size={12} /> {c.date} | {c.startTime} - {c.endTime}
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                      status === 'Live' ? "bg-green-500/10 text-[#2ecc8a]" :
                      status === 'Upcoming' ? "bg-blue-500/10 text-[#4f8ef7]" : 
                      "bg-gray-500/10 text-[#6b7599]"
                    )}>
                      {status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isAdminOrTeacher ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setEditingClass(c);
                        setShowModal(true);
                      }}
                      className="p-2 hover:bg-blue-500/10 rounded-lg text-[#6b7599] hover:text-[#4f8ef7] transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(c.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-[#6b7599] hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {status === 'Upcoming' && (
                      <button 
                        onClick={() => handleSetReminder(c)}
                        className="px-4 py-2 rounded-xl font-bold text-xs bg-[#1a2035] border border-[#242b40] text-[#4f8ef7] hover:bg-[#242b40] transition-all"
                      >
                        Set Reminder
                      </button>
                    )}
                    <button 
                      disabled={!joinable}
                      onClick={() => window.open(c.meetingLink, '_blank')}
                      className={cn(
                        "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                        joinable ? "bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white shadow-lg shadow-blue-500/20" : 
                        status === 'Completed' ? "bg-[#1a2035] text-[#6b7599] cursor-not-allowed" :
                        "bg-[#1a2035] border border-[#242b40] text-[#6b7599] cursor-not-allowed"
                      )}
                    >
                      {status === 'Completed' ? 'Ended' : joinable ? 'Join Now' : 'Join in 10m'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

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
                <h3 className="text-xl font-extrabold font-syne">
                  {editingClass ? 'Edit Live Class' : 'Schedule Live Class'}
                </h3>
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
                    defaultValue={editingClass?.title}
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
                      defaultValue={editingClass?.courseId}
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
                      defaultValue={editingClass?.batchId}
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                    >
                      <option value="">Select Batch</option>
                      {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                {user.role === 'admin' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Teacher</label>
                    <select 
                      name="teacherId"
                      required
                      defaultValue={editingClass?.teacherId || user.uid}
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Date</label>
                    <input 
                      name="date"
                      type="date"
                      required
                      defaultValue={editingClass?.date}
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Start Time</label>
                    <input 
                      name="startTime"
                      type="time"
                      required
                      defaultValue={editingClass?.startTime}
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">End Time</label>
                    <input 
                      name="endTime"
                      type="time"
                      required
                      defaultValue={editingClass?.endTime}
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Platform</label>
                    <select 
                      name="meetingType"
                      required
                      defaultValue={editingClass?.meetingType || 'Zoom'}
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                    >
                      <option value="Zoom">Zoom</option>
                      <option value="Meet">Google Meet</option>
                      <option value="Custom">Custom Link</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Meeting Link</label>
                    <input 
                      name="meetingLink"
                      required
                      defaultValue={editingClass?.meetingLink}
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingClass ? 'Update Class' : 'Schedule Class'}
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
