import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { 
  Plus, 
  Users, 
  Calendar, 
  Clock, 
  MoreVertical,
  X,
  Search,
  BookOpen,
  User,
  Edit2,
  Trash2,
  Video,
  FileText,
  Megaphone,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  PlusCircle,
  ChevronRight,
  Settings,
  UserPlus,
  UserMinus,
  Zap,
  Send,
  Bell
} from 'lucide-react';
import { subscribeToCollection, createDoc, updateDocument, deleteDocument } from '../services/firestore';
import { sendEmail, getNewRecordTemplate, getUpdateNotificationTemplate } from '../services/emailService';
import { Batch, Course, Teacher, Student, BatchAnnouncement, ScheduledClass, Attendance } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

const Batches: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [announcements, setAnnouncements] = useState<BatchAnnouncement[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageTab, setManageTab] = useState<'Students' | 'Schedule' | 'Attendance' | 'Announcements' | 'Analytics'>('Students');
  const [activeTab, setActiveTab] = useState<'basic' | 'schedule'>('basic');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    courseId: '',
    teacherId: '',
    assistantTeacherId: '',
    maxStudents: 30,
    startDate: '',
    endDate: '',
    classDays: 'Mon-Fri' as const,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    timeSlot: '10:00 AM - 12:00 PM',
    status: 'Upcoming' as const
  });

  // Announcement Form
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    type: 'Notice' as const
  });

  // Scheduled Class Form
  const [classForm, setClassForm] = useState({
    topic: '',
    date: '',
    time: '',
    duration: '1.5 Hours',
    link: '',
    linkType: 'Zoom' as const
  });

  useEffect(() => {
    const unsubBatches = subscribeToCollection('batches', setBatches);
    const unsubCourses = subscribeToCollection('courses', setCourses);
    const unsubTeachers = subscribeToCollection('users', (data) => {
      setTeachers(data.filter(u => u.role === 'teacher') as Teacher[]);
    });
    const unsubStudents = subscribeToCollection('users', (data) => {
      setStudents(data.filter(u => u.role === 'student') as Student[]);
    });
    const unsubAnnouncements = subscribeToCollection('batch_announcements', setAnnouncements);
    const unsubClasses = subscribeToCollection('scheduled_classes', setScheduledClasses);
    const unsubAttendance = subscribeToCollection('attendance', setAttendance);

    return () => {
      unsubBatches();
      unsubCourses();
      unsubTeachers();
      unsubStudents();
      unsubAnnouncements();
      unsubClasses();
      unsubAttendance();
    };
  }, []);

  const handleEdit = (batch: Batch) => {
    setEditingBatch(batch);
    setFormData({
      name: batch.name,
      courseId: batch.courseId,
      teacherId: batch.teacherId,
      assistantTeacherId: batch.assistantTeacherId || '',
      maxStudents: batch.maxStudents || 30,
      startDate: batch.startDate || '',
      endDate: batch.endDate || '',
      classDays: batch.classDays || 'Mon-Fri',
      days: batch.days || [],
      timeSlot: batch.timeSlot || '',
      status: batch.status
    });
    setShowModal(true);
  };

  const handleOpenDetails = (batch: Batch) => {
    setSelectedBatch(batch);
    setShowManageModal(true);
    setManageTab('Students');
  };

  const handleAssignStudent = async (batchId: string, studentId: string) => {
    try {
      const batch = batches.find(b => b.id === batchId);
      if (!batch) return;
      
      const updatedStudentIds = [...(batch.studentIds || []), studentId];
      await updateDocument('batches', batchId, { 
        studentIds: updatedStudentIds,
        studentsCount: updatedStudentIds.length
      });
      
      setBatches(batches.map(b => b.id === batchId ? { ...b, studentIds: updatedStudentIds, studentsCount: updatedStudentIds.length } : b));
      if (selectedBatch?.id === batchId) {
        setSelectedBatch({ ...selectedBatch, studentIds: updatedStudentIds, studentsCount: updatedStudentIds.length });
      }
    } catch (error) {
      console.error('Error assigning student:', error);
    }
  };

  const handleRemoveStudent = async (batchId: string, studentId: string) => {
    try {
      const batch = batches.find(b => b.id === batchId);
      if (!batch) return;
      
      const updatedStudentIds = (batch.studentIds || []).filter(id => id !== studentId);
      await updateDocument('batches', batchId, { 
        studentIds: updatedStudentIds,
        studentsCount: updatedStudentIds.length
      });
      
      setBatches(batches.map(b => b.id === batchId ? { ...b, studentIds: updatedStudentIds, studentsCount: updatedStudentIds.length } : b));
      if (selectedBatch?.id === batchId) {
        setSelectedBatch({ ...selectedBatch, studentIds: updatedStudentIds, studentsCount: updatedStudentIds.length });
      }
    } catch (error) {
      console.error('Error removing student:', error);
    }
  };

  const handleScheduleClass = async (batchId: string, classData: Partial<ScheduledClass>) => {
    try {
      await createDoc('scheduled_classes', { 
        ...classData, 
        batchId, 
        teacherId: selectedBatch?.teacherId || '',
        createdAt: new Date().toISOString() 
      });
    } catch (error) {
      console.error('Error scheduling class:', error);
    }
  };

  const handlePostAnnouncement = async (batchId: string, message: string) => {
    try {
      await createDoc('batch_announcements', { 
        batchId, 
        title: 'Batch Update',
        message, 
        type: 'Notice',
        date: new Date().toISOString(),
        authorId: 'admin',
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error posting announcement:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this batch?')) {
      try {
        await deleteDocument('batches', id);
      } catch (err: any) {
        console.error(err);
        alert('Failed to delete batch: ' + err.message);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...formData,
        studentsCount: editingBatch ? editingBatch.studentsCount : 0
      };

      if (editingBatch) {
        await updateDocument('batches', editingBatch.id, dataToSave);
      } else {
        await createDoc('batches', { ...dataToSave, createdAt: new Date().toISOString() });
      }
      setShowModal(false);
      setEditingBatch(null);
      resetFormData();
    } catch (err) {
      console.error(err);
    }
  };

  const resetFormData = () => {
    setFormData({
      name: '',
      courseId: '',
      teacherId: '',
      assistantTeacherId: '',
      maxStudents: 30,
      startDate: '',
      endDate: '',
      classDays: 'Mon-Fri',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      timeSlot: '10:00 AM - 12:00 PM',
      status: 'Upcoming'
    });
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(day) 
        ? prev.days.filter(d => d !== day) 
        : [...prev.days, day]
    }));
  };

  const filteredBatches = batches.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const batchStudents = students.filter(s => s.batchId === selectedBatch?.id);
  const unassignedStudents = students.filter(s => !s.batchId || s.batchId === '');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-white">Batch Management</h2>
          <p className="text-sm text-[#6b7599] mt-1">Organize students into scheduled learning groups</p>
        </div>
        <button 
          onClick={() => {
            resetFormData();
            setEditingBatch(null);
            setShowModal(true);
          }}
          className="bg-[#f75f6a] hover:bg-[#e04e59] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors w-fit"
        >
          <Plus size={18} /> Create New Batch
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7599]" size={18} />
          <input 
            type="text" 
            placeholder="Search batches by name..." 
            className="w-full bg-[#131726] border border-[#242b40] rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:border-[#f75f6a] transition-colors text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBatches.map((batch) => (
          <motion.div
            key={batch.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6 hover:border-[#f75f6a]/30 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(batch)} className="p-1.5 bg-[#1a2035] text-[#6b7599] hover:text-[#f75f6a] rounded-lg transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(batch.id)} className="p-1.5 bg-[#1a2035] text-[#6b7599] hover:text-red-500 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-[#4f8ef7] flex items-center justify-center">
                  <Users size={24} />
                </div>
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                  batch.status === 'Active' ? "bg-green-500/10 text-[#2ecc8a]" : 
                  batch.status === 'Upcoming' ? "bg-blue-500/10 text-[#4f8ef7]" : "bg-red-500/10 text-[#f75f6a]"
                )}>
                  {batch.status}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-1">{batch.name}</h3>
              <div className="flex items-center gap-2 text-[12px] text-[#6b7599] mb-4">
                <BookOpen size={14} /> {courses.find(c => c.id === batch.courseId)?.title || 'Course'}
              </div>

              <div className="space-y-3 pt-4 border-t border-[#242b40]">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#6b7599] flex items-center gap-1.5"><User size={14} /> Instructor</span>
                  <span className="text-[#e8ecf5] font-medium">{teachers.find(t => t.uid === batch.teacherId)?.name || 'Teacher'}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#6b7599] flex items-center gap-1.5"><Clock size={14} /> Timing</span>
                  <span className="text-[#e8ecf5] font-medium truncate max-w-[140px]">{batch.timeSlot}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#6b7599] flex items-center gap-1.5"><Users size={14} /> Students</span>
                  <span className="text-[#e8ecf5] font-medium">{batch.studentsCount || 0} / {batch.maxStudents || 30}</span>
                </div>
              </div>

              <div className="mt-6">
                <button 
                  onClick={() => handleOpenDetails(batch)}
                  className="w-full bg-[#1a2035] hover:bg-[#242b40] text-white py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  Manage Batch <ChevronRight size={16} />
                </button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Create/Edit Modal */}
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
              className="relative w-full max-w-[600px] bg-[#131726] border border-[#242b40] rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[#242b40] flex items-center justify-between">
                <h3 className="text-xl font-extrabold font-syne text-white">
                  {editingBatch ? 'Edit Batch' : 'Create New Batch'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-red-500/10 text-[#6b7599] hover:text-red-500 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex border-b border-[#242b40]">
                <button 
                  onClick={() => setActiveTab('basic')}
                  className={cn(
                    "flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors",
                    activeTab === 'basic' ? "text-[#f75f6a] border-b-2 border-[#f75f6a]" : "text-[#6b7599] hover:text-[#e8ecf5]"
                  )}
                >
                  Basic Info
                </button>
                <button 
                  onClick={() => setActiveTab('schedule')}
                  className={cn(
                    "flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors",
                    activeTab === 'schedule' ? "text-[#f75f6a] border-b-2 border-[#f75f6a]" : "text-[#6b7599] hover:text-[#e8ecf5]"
                  )}
                >
                  Schedule
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {activeTab === 'basic' ? (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Batch Name</label>
                      <input 
                        required
                        type="text" 
                        className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#f75f6a] transition-colors text-white"
                        placeholder="e.g. DM-2026-March"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Course</label>
                        <select 
                          required
                          className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#f75f6a] transition-colors text-white"
                          value={formData.courseId}
                          onChange={(e) => setFormData({...formData, courseId: e.target.value})}
                        >
                          <option value="">Choose Course</option>
                          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Status</label>
                        <select 
                          className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#f75f6a] transition-colors text-white"
                          value={formData.status}
                          onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                        >
                          <option value="Upcoming">Upcoming</option>
                          <option value="Active">Active</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Main Teacher</label>
                        <select 
                          required
                          className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#f75f6a] transition-colors text-white"
                          value={formData.teacherId}
                          onChange={(e) => setFormData({...formData, teacherId: e.target.value})}
                        >
                          <option value="">Assign Teacher</option>
                          {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Assistant Teacher</label>
                        <select 
                          className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#f75f6a] transition-colors text-white"
                          value={formData.assistantTeacherId}
                          onChange={(e) => setFormData({...formData, assistantTeacherId: e.target.value})}
                        >
                          <option value="">None</option>
                          {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Max Students</label>
                      <input 
                        type="number" 
                        className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#f75f6a] transition-colors text-white"
                        value={formData.maxStudents}
                        onChange={(e) => setFormData({...formData, maxStudents: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Start Date</label>
                        <input 
                          required
                          type="date" 
                          className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#f75f6a] transition-colors text-white"
                          value={formData.startDate}
                          onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">End Date</label>
                        <input 
                          required
                          type="date" 
                          className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#f75f6a] transition-colors text-white"
                          value={formData.endDate}
                          onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Time Slot</label>
                      <input 
                        required
                        type="text" 
                        className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#f75f6a] transition-colors text-white"
                        placeholder="e.g. 10:00 AM - 12:00 PM"
                        value={formData.timeSlot}
                        onChange={(e) => setFormData({...formData, timeSlot: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Class Days</label>
                      <div className="flex gap-3 mb-3">
                        {['Mon-Fri', 'Weekend', 'Custom'].map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              const days = type === 'Mon-Fri' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] : type === 'Weekend' ? ['Sat', 'Sun'] : [];
                              setFormData({...formData, classDays: type as any, days});
                            }}
                            className={cn(
                              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                              formData.classDays === type ? "bg-[#f75f6a] text-white" : "bg-[#1a2035] text-[#6b7599] border border-[#242b40]"
                            )}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={cn(
                              "w-10 h-10 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center",
                              formData.days.includes(day) 
                                ? 'bg-[#4f8ef7] text-white shadow-lg shadow-blue-500/20' 
                                : 'bg-[#1a2035] text-[#6b7599] border border-[#242b40]'
                            )}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button 
                    type="submit"
                    className="flex-1 bg-[#f75f6a] hover:bg-[#e04e59] text-white py-3 rounded-xl font-bold text-sm transition-colors"
                  >
                    {editingBatch ? 'Update Batch' : 'Create Batch'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-8 bg-[#1a2035] border border-[#242b40] text-[#e8ecf5] rounded-xl font-bold text-sm hover:bg-[#242b40] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detailed Management Modal */}
      <AnimatePresence>
        {showManageModal && selectedBatch && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowManageModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[900px] bg-[#131726] border border-[#242b40] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-[#242b40] bg-[#1a2035]/50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-extrabold font-syne text-white">{selectedBatch.name}</h3>
                  <p className="text-xs text-[#6b7599] mt-1">
                    {courses.find(c => c.id === selectedBatch.courseId)?.title} • {selectedBatch.status}
                  </p>
                </div>
                <button onClick={() => setShowManageModal(false)} className="p-2 hover:bg-red-500/10 text-[#6b7599] hover:text-red-500 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[#242b40] bg-[#131726]">
                {['Students', 'Schedule', 'Attendance', 'Announcements', 'Analytics'].map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setManageTab(tab as any)}
                    className={cn(
                      "flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all relative",
                      manageTab === tab ? "text-[#f75f6a]" : "text-[#6b7599] hover:text-[#e8ecf5]"
                    )}
                  >
                    {tab}
                    {manageTab === tab && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f75f6a]" />
                    )}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {manageTab === 'Students' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Enrolled Students</h4>
                      <div className="flex gap-2">
                        <select 
                          className="bg-[#1a2035] border border-[#242b40] rounded-lg px-3 py-1.5 text-xs outline-none text-white"
                          onChange={(e) => {
                            if (e.target.value) handleAssignStudent(selectedBatch.id, e.target.value);
                          }}
                          value=""
                        >
                          <option value="">Add Student...</option>
                          {students.filter(s => !selectedBatch.studentIds?.includes(s.uid)).map(s => (
                            <option key={s.uid} value={s.uid}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {students.filter(s => selectedBatch.studentIds?.includes(s.uid)).map(student => (
                        <div key={student.uid} className="bg-[#1a2035] border border-[#242b40] rounded-xl p-4 flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#242b40] flex items-center justify-center text-[#f75f6a] font-bold">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{student.name}</p>
                              <p className="text-[10px] text-[#6b7599]">{student.email}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveStudent(selectedBatch.id, student.uid)}
                            className="p-2 opacity-0 group-hover:opacity-100 text-[#6b7599] hover:text-red-500 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      {(!selectedBatch.studentIds || selectedBatch.studentIds.length === 0) && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-[#242b40] rounded-2xl">
                          <Users className="mx-auto text-[#242b40] mb-3" size={40} />
                          <p className="text-[#6b7599] text-sm">No students assigned yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {manageTab === 'Schedule' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Upcoming Classes</h4>
                      <button 
                        onClick={() => {
                          const topic = prompt('Enter class topic:');
                          if (topic) handleScheduleClass(selectedBatch.id, {
                            date: new Date().toISOString().split('T')[0],
                            time: selectedBatch.timeSlot,
                            topic,
                            duration: '2 Hours',
                            link: 'https://meet.google.com/abc-defg-hij'
                          });
                        }}
                        className="flex items-center gap-2 bg-[#4f8ef7] hover:bg-[#3b7ae0] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                      >
                        <Plus size={14} /> Schedule Class
                      </button>
                    </div>

                    <div className="space-y-4">
                      {scheduledClasses.filter(c => c.batchId === selectedBatch.id).map(cls => (
                        <div key={cls.id} className="bg-[#1a2035] border border-[#242b40] rounded-xl p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#242b40] flex flex-col items-center justify-center text-[#f75f6a]">
                              <span className="text-[10px] font-bold uppercase">{new Date(cls.date).toLocaleString('default', { month: 'short' })}</span>
                              <span className="text-lg font-black leading-none">{new Date(cls.date).getDate()}</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{cls.topic}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="flex items-center gap-1 text-[10px] text-[#6b7599]">
                                  <Clock size={10} /> {cls.time} ({cls.duration})
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <a 
                              href={cls.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-[#1a2035] border border-[#242b40] text-[#4f8ef7] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#242b40] transition-colors"
                            >
                              <Video size={14} /> Join Class
                            </a>
                            <button className="p-2 text-[#6b7599] hover:text-white transition-colors">
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {scheduledClasses.filter(c => c.batchId === selectedBatch.id).length === 0 && (
                        <div className="py-12 text-center border-2 border-dashed border-[#242b40] rounded-2xl">
                          <Calendar className="mx-auto text-[#242b40] mb-3" size={40} />
                          <p className="text-[#6b7599] text-sm">No classes scheduled yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {manageTab === 'Attendance' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Attendance Tracking</h4>
                      <div className="flex gap-2">
                        <input type="date" className="bg-[#1a2035] border border-[#242b40] rounded-lg px-3 py-1.5 text-xs text-white outline-none" defaultValue={new Date().toISOString().split('T')[0]} />
                        <button className="bg-[#f75f6a] text-white px-4 py-1.5 rounded-lg text-xs font-bold">Save Report</button>
                      </div>
                    </div>

                    <div className="bg-[#1a2035] border border-[#242b40] rounded-2xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-[#131726] border-b border-[#242b40]">
                            <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-widest">Student</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-widest">Avg. Attendance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#242b40]">
                          {students.filter(s => selectedBatch.studentIds?.includes(s.uid)).map(student => (
                            <tr key={student.uid} className="hover:bg-[#242b40]/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[#242b40] flex items-center justify-center text-[10px] text-[#f75f6a] font-bold">
                                    {student.name.charAt(0)}
                                  </div>
                                  <span className="text-xs font-bold text-white">{student.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex gap-2">
                                  <button className="px-3 py-1 bg-green-500/10 text-green-500 rounded-md text-[10px] font-bold border border-green-500/20">Present</button>
                                  <button className="px-3 py-1 bg-red-500/10 text-red-500 rounded-md text-[10px] font-bold border border-red-500/20 opacity-50">Absent</button>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-[#242b40] rounded-full overflow-hidden">
                                    <div className="h-full bg-[#4f8ef7]" style={{ width: '85%' }}></div>
                                  </div>
                                  <span className="text-[10px] font-bold text-white">85%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {manageTab === 'Announcements' && (
                  <div className="space-y-6">
                    <div className="bg-[#1a2035] border border-[#242b40] rounded-2xl p-6">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Post New Announcement</h4>
                      <textarea 
                        className="w-full bg-[#131726] border border-[#242b40] rounded-xl p-4 text-sm text-white outline-none focus:border-[#f75f6a] transition-colors resize-none h-32"
                        placeholder="Type your message to the batch..."
                        id="announcement-text"
                      ></textarea>
                      <div className="flex justify-end mt-4">
                        <button 
                          onClick={() => {
                            const textarea = document.getElementById('announcement-text') as HTMLTextAreaElement;
                            if (textarea.value) {
                              handlePostAnnouncement(selectedBatch.id, textarea.value);
                              textarea.value = '';
                            }
                          }}
                          className="flex items-center gap-2 bg-[#f75f6a] hover:bg-[#e04e59] text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors"
                        >
                          <Send size={16} /> Post Announcement
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {announcements.filter(a => a.batchId === selectedBatch.id).map(ann => (
                        <div key={ann.id} className="bg-[#1a2035] border border-[#242b40] rounded-2xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#f75f6a]/10 flex items-center justify-center text-[#f75f6a]">
                                <Bell size={14} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white">Batch Announcement</p>
                                <p className="text-[10px] text-[#6b7599]">{new Date(ann.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-[#e8ecf5] leading-relaxed">{ann.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {manageTab === 'Analytics' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-3 gap-6">
                      <div className="bg-[#1a2035] border border-[#242b40] rounded-2xl p-6">
                        <p className="text-[10px] font-bold text-[#6b7599] uppercase tracking-widest mb-2">Avg. Attendance</p>
                        <h5 className="text-2xl font-black text-white">88.4%</h5>
                        <div className="mt-4 h-1.5 bg-[#242b40] rounded-full overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: '88.4%' }}></div>
                        </div>
                      </div>
                      <div className="bg-[#1a2035] border border-[#242b40] rounded-2xl p-6">
                        <p className="text-[10px] font-bold text-[#6b7599] uppercase tracking-widest mb-2">Course Progress</p>
                        <h5 className="text-2xl font-black text-white">45.0%</h5>
                        <div className="mt-4 h-1.5 bg-[#242b40] rounded-full overflow-hidden">
                          <div className="h-full bg-[#4f8ef7]" style={{ width: '45%' }}></div>
                        </div>
                      </div>
                      <div className="bg-[#1a2035] border border-[#242b40] rounded-2xl p-6">
                        <p className="text-[10px] font-bold text-[#6b7599] uppercase tracking-widest mb-2">Avg. Quiz Score</p>
                        <h5 className="text-2xl font-black text-white">72/100</h5>
                        <div className="mt-4 h-1.5 bg-[#242b40] rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500" style={{ width: '72%' }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#1a2035] border border-[#242b40] rounded-2xl p-8">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Student Performance Matrix</h4>
                      <div className="space-y-6">
                        {students.filter(s => selectedBatch.studentIds?.includes(s.uid)).slice(0, 5).map(student => (
                          <div key={student.uid} className="space-y-2">
                            <div className="flex justify-between items-end">
                              <span className="text-xs font-bold text-white">{student.name}</span>
                              <span className="text-[10px] text-[#6b7599]">Overall: 82%</span>
                            </div>
                            <div className="flex gap-1">
                              {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
                                <div 
                                  key={i} 
                                  className={cn(
                                    "flex-1 h-3 rounded-sm",
                                    i < 8 ? "bg-[#4f8ef7]" : i < 10 ? "bg-[#4f8ef7]/30" : "bg-[#242b40]"
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Batches;
