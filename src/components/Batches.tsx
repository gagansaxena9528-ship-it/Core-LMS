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
  User as UserIcon, 
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
import { sendEmail, getNewRecordTemplate, getUpdateNotificationTemplate, getAttendanceEmailTemplate } from '../services/emailService';
import { Batch, Course, Teacher, Student, BatchAnnouncement, ScheduledClass, Attendance, Result, Lesson, User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface BatchesProps {
  user?: User;
}

const Batches: React.FC<BatchesProps> = ({ user }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [announcements, setAnnouncements] = useState<BatchAnnouncement[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageTab, setManageTab] = useState<'Students' | 'Schedule' | 'Attendance' | 'Announcements' | 'Analytics'>('Students');
  const [activeTab, setActiveTab] = useState<'basic' | 'schedule'>('basic');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  // Attendance State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'Present' | 'Absent'>>({});

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
    const unsubBatches = subscribeToCollection('batches', (data) => {
      if (user?.role === 'teacher') {
        setBatches(data.filter(b => b.teacherId === user.uid || b.assistantTeacherId === user.uid));
      } else {
        setBatches(data);
      }
    });
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
    const unsubResults = subscribeToCollection('results', setResults);
    const unsubLessons = subscribeToCollection('lessons', setLessons);

    return () => {
      unsubBatches();
      unsubCourses();
      unsubTeachers();
      unsubStudents();
      unsubAnnouncements();
      unsubClasses();
      unsubAttendance();
      unsubResults();
      unsubLessons();
    };
  }, [user?.uid, user?.role]);

  // Update attendance map when date or batch changes
  useEffect(() => {
    if (selectedBatch && attendanceDate) {
      const dayAttendance = attendance.filter(a => a.batchId === selectedBatch.id && a.date === attendanceDate);
      const map: Record<string, 'Present' | 'Absent'> = {};
      dayAttendance.forEach(a => {
        map[a.studentId] = a.status;
      });
      setAttendanceMap(map);
    }
  }, [selectedBatch, attendanceDate, attendance]);

  const handleMarkAttendance = async (studentId: string, status: 'Present' | 'Absent') => {
    if (!selectedBatch) return;
    
    try {
      const existing = attendance.find(a => a.batchId === selectedBatch.id && a.studentId === studentId && a.date === attendanceDate);
      const student = students.find(s => s.uid === studentId);
      
      if (existing) {
        if (existing.status === status) {
          await deleteDocument('attendance', existing.id);
        } else {
          await updateDocument('attendance', existing.id, { status });
          if (student) {
            const html = getAttendanceEmailTemplate(student.name, attendanceDate, status, selectedBatch.name);
            await sendEmail(student.email, `Attendance Update: ${status}`, html);
          }
        }
      } else {
        const newId = Math.random().toString(36).substring(2, 15);
        await createDoc('attendance', {
          id: newId,
          studentId,
          batchId: selectedBatch.id,
          courseId: selectedBatch.courseId,
          date: attendanceDate,
          status,
          createdAt: new Date().toISOString()
        }, newId);

        if (student) {
          const html = getAttendanceEmailTemplate(student.name, attendanceDate, status, selectedBatch.name);
          await sendEmail(student.email, `Attendance Marked: ${status}`, html);
        }
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
    }
  };

  const handleMarkAll = async (status: 'Present' | 'Absent') => {
    if (!selectedBatch) return;
    
    const batchStudents = students.filter(s => selectedBatch.studentIds?.includes(s.uid));
    
    for (const student of batchStudents) {
      const existing = attendance.find(a => a.batchId === selectedBatch.id && a.studentId === student.uid && a.date === attendanceDate);
      
      if (!existing) {
        const newId = Math.random().toString(36).substring(2, 15);
        await createDoc('attendance', {
          id: newId,
          studentId: student.uid,
          batchId: selectedBatch.id,
          courseId: selectedBatch.courseId,
          date: attendanceDate,
          status,
          createdAt: new Date().toISOString()
        }, newId);
        
        const html = getAttendanceEmailTemplate(student.name, attendanceDate, status, selectedBatch.name);
        await sendEmail(student.email, `Attendance Marked: ${status}`, html);
      } else if (existing.status !== status) {
        await updateDocument('attendance', existing.id, { status });
        
        const html = getAttendanceEmailTemplate(student.name, attendanceDate, status, selectedBatch.name);
        await sendEmail(student.email, `Attendance Update: ${status}`, html);
      }
    }
  };

  const handleSaveAttendanceReport = async () => {
    // In a real app, this might trigger a summary or send notifications
    alert('Attendance report for ' + attendanceDate + ' has been saved and students notified.');
  };

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
          <h2 className="text-2xl font-extrabold font-syne text-foreground">Batch Management</h2>
          <p className="text-sm text-muted mt-1">Organize students into scheduled learning groups</p>
        </div>
        {user?.role !== 'teacher' && (
          <button 
            onClick={() => {
              resetFormData();
              setEditingBatch(null);
              setShowModal(true);
            }}
            className="bg-secondary hover:bg-secondary/90 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors w-fit shadow-lg shadow-secondary/20"
          >
            <Plus size={18} /> Create New Batch
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input 
            type="text" 
            placeholder="Search batches by name..." 
            className="w-full bg-card border border-border rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:border-secondary transition-colors text-foreground"
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
            <Card className="p-6 hover:border-secondary/30 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <div className="flex gap-2">
                  {user?.role !== 'teacher' && (
                    <>
                      <button onClick={() => handleEdit(batch)} className="p-1.5 bg-muted/10 text-muted hover:text-secondary rounded-lg transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(batch.id)} className="p-1.5 bg-muted/10 text-muted hover:text-destructive rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                  <Users size={24} />
                </div>
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                  batch.status === 'Active' ? "bg-success/10 text-success" : 
                  batch.status === 'Upcoming' ? "bg-secondary/10 text-secondary" : "bg-destructive/10 text-destructive"
                )}>
                  {batch.status}
                </span>
              </div>

              <h3 className="text-lg font-bold text-foreground mb-1">{batch.name}</h3>
              <div className="flex items-center gap-2 text-[12px] text-muted mb-4">
                <BookOpen size={14} /> {courses.find(c => c.id === batch.courseId)?.title || 'Course'}
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted flex items-center gap-1.5"><UserIcon size={14} /> Instructor</span>
                  <span className="text-foreground font-medium">{teachers.find(t => t.uid === batch.teacherId)?.name || 'Teacher'}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted flex items-center gap-1.5"><Clock size={14} /> Timing</span>
                  <span className="text-foreground font-medium truncate max-w-[140px]">{batch.timeSlot}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted flex items-center gap-1.5"><Users size={14} /> Students</span>
                  <span className="text-foreground font-medium">{batch.studentsCount || 0} / {batch.maxStudents || 30}</span>
                </div>
              </div>

              <div className="mt-6">
                <button 
                  onClick={() => handleOpenDetails(batch)}
                  className="w-full bg-muted/10 hover:bg-muted/20 text-foreground py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
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
              className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[600px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="text-xl font-extrabold font-syne text-foreground">
                  {editingBatch ? 'Edit Batch' : 'Create New Batch'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-destructive/10 text-muted hover:text-destructive rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex border-b border-border">
                <button 
                  onClick={() => setActiveTab('basic')}
                  className={cn(
                    "flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors",
                    activeTab === 'basic' ? "text-secondary border-b-2 border-secondary" : "text-muted hover:text-foreground"
                  )}
                >
                  Basic Info
                </button>
                <button 
                  onClick={() => setActiveTab('schedule')}
                  className={cn(
                    "flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors",
                    activeTab === 'schedule' ? "text-secondary border-b-2 border-secondary" : "text-muted hover:text-foreground"
                  )}
                >
                  Schedule
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {activeTab === 'basic' ? (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Batch Name</label>
                      <input 
                        required
                        type="text" 
                        className="w-full bg-muted/10 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors text-foreground"
                        placeholder="e.g. DM-2026-March"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Course</label>
                        <select 
                          required
                          className="w-full bg-muted/10 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors text-foreground"
                          value={formData.courseId}
                          onChange={(e) => setFormData({...formData, courseId: e.target.value})}
                        >
                          <option value="" className="bg-card">Choose Course</option>
                          {courses.map(c => <option key={c.id} value={c.id} className="bg-card">{c.title}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Status</label>
                        <select 
                          className="w-full bg-muted/10 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors text-foreground"
                          value={formData.status}
                          onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                        >
                          <option value="Upcoming" className="bg-card">Upcoming</option>
                          <option value="Active" className="bg-card">Active</option>
                          <option value="Completed" className="bg-card">Completed</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Main Teacher</label>
                        <select 
                          required
                          className="w-full bg-muted/10 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors text-foreground"
                          value={formData.teacherId}
                          onChange={(e) => setFormData({...formData, teacherId: e.target.value})}
                        >
                          <option value="" className="bg-card">Assign Teacher</option>
                          {teachers.map(t => <option key={t.uid} value={t.uid} className="bg-card">{t.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Assistant Teacher</label>
                        <select 
                          className="w-full bg-muted/10 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors text-foreground"
                          value={formData.assistantTeacherId}
                          onChange={(e) => setFormData({...formData, assistantTeacherId: e.target.value})}
                        >
                          <option value="" className="bg-card">None</option>
                          {teachers.map(t => <option key={t.uid} value={t.uid} className="bg-card">{t.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Max Students</label>
                      <input 
                        type="number" 
                        className="w-full bg-muted/10 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors text-foreground"
                        value={formData.maxStudents}
                        onChange={(e) => setFormData({...formData, maxStudents: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Start Date</label>
                        <input 
                          required
                          type="date" 
                          className="w-full bg-muted/10 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors text-foreground"
                          value={formData.startDate}
                          onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted uppercase tracking-wider">End Date</label>
                        <input 
                          required
                          type="date" 
                          className="w-full bg-muted/10 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors text-foreground"
                          value={formData.endDate}
                          onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Time Slot</label>
                      <input 
                        required
                        type="text" 
                        className="w-full bg-muted/10 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors text-foreground"
                        placeholder="e.g. 10:00 AM - 12:00 PM"
                        value={formData.timeSlot}
                        onChange={(e) => setFormData({...formData, timeSlot: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Class Days</label>
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
                              formData.classDays === type ? "bg-secondary text-white" : "bg-muted/10 text-muted border border-border"
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
                                ? 'bg-secondary text-white shadow-lg shadow-secondary/20' 
                                : 'bg-muted/10 text-muted border border-border'
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
                    className="flex-1 bg-secondary hover:bg-secondary/90 text-white py-3 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-secondary/20"
                  >
                    {editingBatch ? 'Update Batch' : 'Create Batch'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-8 bg-muted/10 border border-border text-foreground rounded-xl font-bold text-sm hover:bg-muted/20 transition-colors"
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
              className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[900px] bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-border bg-muted/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-extrabold font-syne text-foreground">{selectedBatch.name}</h3>
                  <p className="text-xs text-muted mt-1">
                    {courses.find(c => c.id === selectedBatch.courseId)?.title} • {selectedBatch.status}
                  </p>
                </div>
                <button onClick={() => setShowManageModal(false)} className="p-2 hover:bg-destructive/10 text-muted hover:text-destructive rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border bg-background">
                {['Students', 'Schedule', 'Attendance', 'Announcements', 'Analytics'].map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setManageTab(tab as any)}
                    className={cn(
                      "flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all relative",
                      manageTab === tab ? "text-secondary" : "text-muted hover:text-foreground"
                    )}
                  >
                    {tab}
                    {manageTab === tab && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary" />
                    )}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {manageTab === 'Students' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Enrolled Students</h4>
                      <div className="flex gap-2">
                        <select 
                          className="bg-muted/10 border border-border rounded-lg px-3 py-1.5 text-xs outline-none text-foreground"
                          onChange={(e) => {
                            if (e.target.value) handleAssignStudent(selectedBatch.id, e.target.value);
                          }}
                          value=""
                        >
                          <option value="" className="bg-card">Add Student...</option>
                          {students.filter(s => !selectedBatch.studentIds?.includes(s.uid)).map(s => (
                            <option key={s.uid} value={s.uid} className="bg-card">{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {students.filter(s => selectedBatch.studentIds?.includes(s.uid)).map(student => (
                        <div key={student.uid} className="bg-muted/10 border border-border rounded-xl p-4 flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center text-secondary font-bold">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">{student.name}</p>
                              <p className="text-[10px] text-muted">{student.email}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveStudent(selectedBatch.id, student.uid)}
                            className="p-2 opacity-0 group-hover:opacity-100 text-muted hover:text-destructive transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      {(!selectedBatch.studentIds || selectedBatch.studentIds.length === 0) && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-2xl">
                          <Users className="mx-auto text-muted/20 mb-3" size={40} />
                          <p className="text-muted text-sm">No students assigned yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {manageTab === 'Schedule' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Upcoming Classes</h4>
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
                        className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                      >
                        <Plus size={14} /> Schedule Class
                      </button>
                    </div>

                    <div className="space-y-4">
                      {scheduledClasses.filter(c => c.batchId === selectedBatch.id).map(cls => (
                        <div key={cls.id} className="bg-muted/50 border border-border rounded-xl p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-muted flex flex-col items-center justify-center text-primary">
                              <span className="text-[10px] font-bold uppercase">{new Date(cls.date).toLocaleString('default', { month: 'short' })}</span>
                              <span className="text-lg font-black leading-none">{new Date(cls.date).getDate()}</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">{cls.topic}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
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
                              className="flex items-center gap-2 bg-muted border border-border text-accent px-4 py-2 rounded-lg text-xs font-bold hover:bg-muted/80 transition-colors"
                            >
                              <Video size={14} /> Join Class
                            </a>
                            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {scheduledClasses.filter(c => c.batchId === selectedBatch.id).length === 0 && (
                        <div className="py-12 text-center border-2 border-dashed border-border rounded-2xl">
                          <Calendar className="mx-auto text-border mb-3" size={40} />
                          <p className="text-muted-foreground text-sm">No classes scheduled yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {manageTab === 'Attendance' && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Attendance Tracking</h4>
                        <p className="text-[10px] text-muted-foreground mt-1">Mark attendance for {attendanceDate}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <input 
                          type="date" 
                          className="bg-muted border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary" 
                          value={attendanceDate}
                          onChange={(e) => setAttendanceDate(e.target.value)}
                        />
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleMarkAll('Present')}
                            className="bg-success/10 hover:bg-success/20 text-success px-3 py-1.5 rounded-lg text-[10px] font-bold border border-success/20 transition-all"
                          >
                            Mark All Present
                          </button>
                          <button 
                            onClick={() => handleMarkAll('Absent')}
                            className="bg-destructive/10 hover:bg-destructive/20 text-destructive px-3 py-1.5 rounded-lg text-[10px] font-bold border border-destructive/20 transition-all"
                          >
                            Mark All Absent
                          </button>
                        </div>
                        <button 
                          onClick={handleSaveAttendanceReport}
                          className="bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors"
                        >
                          Save Report
                        </button>
                      </div>
                    </div>

                    {/* Attendance Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-muted/50 border border-border rounded-xl p-4">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total</p>
                        <p className="text-xl font-black text-foreground">{students.filter(s => selectedBatch.studentIds?.includes(s.uid)).length}</p>
                      </div>
                      <div className="bg-muted/50 border border-border rounded-xl p-4">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Present</p>
                        <p className="text-xl font-black text-success">
                          {students.filter(s => selectedBatch.studentIds?.includes(s.uid)).filter(s => attendanceMap[s.uid] === 'Present').length}
                        </p>
                      </div>
                      <div className="bg-muted/50 border border-border rounded-xl p-4">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Absent</p>
                        <p className="text-xl font-black text-destructive">
                          {students.filter(s => selectedBatch.studentIds?.includes(s.uid)).filter(s => attendanceMap[s.uid] === 'Absent').length}
                        </p>
                      </div>
                      <div className="bg-muted/50 border border-border rounded-xl p-4">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Pending</p>
                        <p className="text-xl font-black text-accent">
                          {students.filter(s => selectedBatch.studentIds?.includes(s.uid)).filter(s => !attendanceMap[s.uid]).length}
                        </p>
                      </div>
                    </div>

                    <div className="bg-muted/30 border border-border rounded-2xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-background border-b border-border">
                            <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Student</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mark Status</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Overall Attendance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {students.filter(s => selectedBatch.studentIds?.includes(s.uid)).map(student => {
                            const studentAttendance = attendance.filter(a => a.studentId === student.uid && a.batchId === selectedBatch.id);
                            const presentCount = studentAttendance.filter(a => a.status === 'Present').length;
                            const totalCount = studentAttendance.length;
                            const avgAttendance = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
                            const currentStatus = attendanceMap[student.uid];

                            return (
                              <tr key={student.uid} className="hover:bg-muted/20 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] text-primary font-bold overflow-hidden">
                                      {student.av ? <img src={student.av} alt={student.name} className="w-full h-full object-cover" /> : student.name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-foreground">{student.name}</p>
                                      <p className="text-[10px] text-muted-foreground">{student.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleMarkAttendance(student.uid, 'Present')}
                                      className={cn(
                                        "px-3 py-1 rounded-md text-[10px] font-bold border transition-all",
                                        currentStatus === 'Present' 
                                          ? "bg-success text-white border-success shadow-lg shadow-success/20" 
                                          : "bg-success/10 text-success border-success/20 hover:bg-success/20"
                                      )}
                                    >
                                      Present
                                    </button>
                                    <button 
                                      onClick={() => handleMarkAttendance(student.uid, 'Absent')}
                                      className={cn(
                                        "px-3 py-1 rounded-md text-[10px] font-bold border transition-all",
                                        currentStatus === 'Absent' 
                                          ? "bg-destructive text-white border-destructive shadow-lg shadow-destructive/20" 
                                          : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                                      )}
                                    >
                                      Absent
                                    </button>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className={cn(
                                          "h-full transition-all duration-500",
                                          avgAttendance > 80 ? "bg-success" : avgAttendance > 60 ? "bg-warning" : "bg-destructive"
                                        )} 
                                        style={{ width: `${avgAttendance}%` }} 
                                      />
                                    </div>
                                    <span className="text-[10px] font-bold text-foreground">{avgAttendance}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {manageTab === 'Announcements' && (
                  <div className="space-y-6">
                    <div className="bg-muted/50 border border-border rounded-2xl p-6">
                      <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Post New Announcement</h4>
                      <textarea 
                        className="w-full bg-background border border-border rounded-xl p-4 text-sm text-foreground outline-none focus:border-primary transition-colors resize-none h-32"
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
                          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors"
                        >
                          <Send size={16} /> Post Announcement
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {announcements.filter(a => a.batchId === selectedBatch.id).map(ann => (
                        <div key={ann.id} className="bg-muted/50 border border-border rounded-2xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Bell size={14} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-foreground">Batch Announcement</p>
                                <p className="text-[10px] text-muted-foreground">{new Date(ann.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-foreground/90 leading-relaxed">{ann.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {manageTab === 'Analytics' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-3 gap-6">
                      <div className="bg-muted/50 border border-border rounded-2xl p-6">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Avg. Attendance</p>
                        <h5 className="text-2xl font-black text-foreground">
                          {(() => {
                            const batchAttendance = attendance.filter(a => a.batchId === selectedBatch.id);
                            if (batchAttendance.length === 0) return '0%';
                            const present = batchAttendance.filter(a => a.status === 'Present').length;
                            return Math.round((present / batchAttendance.length) * 100) + '%';
                          })()}
                        </h5>
                        <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-success" 
                            style={{ 
                              width: (() => {
                                const batchAttendance = attendance.filter(a => a.batchId === selectedBatch.id);
                                if (batchAttendance.length === 0) return '0%';
                                const present = batchAttendance.filter(a => a.status === 'Present').length;
                                return (present / batchAttendance.length) * 100 + '%';
                              })()
                            }} 
                          />
                        </div>
                      </div>
                      <div className="bg-muted/50 border border-border rounded-2xl p-6">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Course Progress</p>
                        <h5 className="text-2xl font-black text-foreground">
                          {(() => {
                            const courseLessons = lessons.filter(l => l.courseId === selectedBatch.courseId);
                            if (courseLessons.length === 0) return '0%';
                            // Mock progress based on completed classes
                            const completedClasses = scheduledClasses.filter(c => c.batchId === selectedBatch.id && c.status === 'Completed').length;
                            const progress = Math.min(100, Math.round((completedClasses / courseLessons.length) * 100));
                            return progress + '%';
                          })()}
                        </h5>
                        <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-accent" 
                            style={{ 
                              width: (() => {
                                const courseLessons = lessons.filter(l => l.courseId === selectedBatch.courseId);
                                if (courseLessons.length === 0) return '0%';
                                const completedClasses = scheduledClasses.filter(c => c.batchId === selectedBatch.id && c.status === 'Completed').length;
                                return Math.min(100, (completedClasses / courseLessons.length) * 100) + '%';
                              })()
                            }} 
                          />
                        </div>
                      </div>
                      <div className="bg-muted/50 border border-border rounded-2xl p-6">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Avg. Quiz Score</p>
                        <h5 className="text-2xl font-black text-foreground">
                          {(() => {
                            const batchResults = results.filter(r => selectedBatch.studentIds?.includes(r.studentId));
                            if (batchResults.length === 0) return '0/100';
                            const avg = Math.round(batchResults.reduce((acc, r) => acc + r.percentage, 0) / batchResults.length);
                            return avg + '/100';
                          })()}
                        </h5>
                        <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-warning" 
                            style={{ 
                              width: (() => {
                                const batchResults = results.filter(r => selectedBatch.studentIds?.includes(r.studentId));
                                if (batchResults.length === 0) return '0%';
                                return Math.round(batchResults.reduce((acc, r) => acc + r.percentage, 0) / batchResults.length) + '%';
                              })()
                            }} 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/50 border border-border rounded-2xl p-8">
                      <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-6">Student Performance Matrix</h4>
                      <div className="space-y-6">
                        {students.filter(s => selectedBatch.studentIds?.includes(s.uid)).map(student => {
                          const studentResults = results.filter(r => r.studentId === student.uid);
                          const overallScore = studentResults.length > 0 
                            ? Math.round(studentResults.reduce((acc, r) => acc + r.percentage, 0) / studentResults.length)
                            : 0;
                          
                          return (
                            <div key={student.uid} className="space-y-2">
                              <div className="flex justify-between items-end">
                                <span className="text-xs font-bold text-foreground">{student.name}</span>
                                <span className="text-[10px] text-muted-foreground">Overall Score: {overallScore}%</span>
                              </div>
                              <div className="flex gap-1">
                                {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => {
                                  // Mocking a performance trend
                                  const isActive = i <= (overallScore / 8);
                                  return (
                                    <div 
                                      key={i} 
                                      className={cn(
                                        "flex-1 h-3 rounded-sm transition-all duration-500",
                                        isActive ? "bg-accent" : "bg-muted"
                                      )}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        {selectedBatch.studentIds?.length === 0 && (
                          <p className="text-center text-muted-foreground text-sm py-4">No students to analyze</p>
                        )}
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
