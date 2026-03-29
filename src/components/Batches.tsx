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
  Trash2
} from 'lucide-react';
import { subscribeToCollection, createDoc, updateDocument, deleteDocument } from '../services/firestore';
import { sendEmail, getNewRecordTemplate, getUpdateNotificationTemplate } from '../services/emailService';
import { Batch, Course, Teacher } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const Batches: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    courseId: '',
    teacherId: '',
    startTime: '10:00 AM',
    endTime: '12:00 PM',
    days: [] as string[],
    capacity: 30,
    status: 'Active' as const
  });

  useEffect(() => {
    const unsubBatches = subscribeToCollection('batches', setBatches);
    const unsubCourses = subscribeToCollection('courses', setCourses);
    const unsubTeachers = subscribeToCollection('teachers', setTeachers);

    return () => {
      unsubBatches();
      unsubCourses();
      unsubTeachers();
    };
  }, []);

  const handleEdit = (batch: Batch) => {
    setEditingBatch(batch);
    setFormData({
      name: batch.name,
      courseId: batch.courseId,
      teacherId: batch.teacherId,
      startTime: batch.startTime,
      endTime: batch.endTime,
      days: batch.days,
      capacity: batch.capacity || 30,
      status: batch.status
    });
    setShowModal(true);
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
      if (editingBatch) {
        await updateDocument('batches', editingBatch.id, formData);
        
        // Notify teacher about batch update
        const teacher = teachers.find(t => t.id === formData.teacherId);
        if (teacher) {
          const course = courses.find(c => c.id === formData.courseId);
          const details = `The batch "${formData.name}" for course "${course?.title || 'Unknown'}" has been updated. Schedule: ${formData.startTime} - ${formData.endTime}.`;
          const html = getUpdateNotificationTemplate(teacher.name, 'Batch', 'updated', details);
          await sendEmail(teacher.email, `Batch Update: ${formData.name}`, html);
        }
      } else {
        await createDoc('batches', formData);

        // Notify teacher about new batch assignment
        const teacher = teachers.find(t => t.id === formData.teacherId);
        if (teacher) {
          const course = courses.find(c => c.id === formData.courseId);
          const details = `You have been assigned to a new batch: "${formData.name}" for course "${course?.title || 'Unknown'}". Schedule: ${formData.startTime} - ${formData.endTime}.`;
          const html = getNewRecordTemplate('Batch Assignment', teacher.name, details);
          await sendEmail(teacher.email, `New Batch Assigned: ${formData.name}`, html);
        }
      }
      setShowModal(false);
      setEditingBatch(null);
      setFormData({
        name: '',
        courseId: '',
        teacherId: '',
        startTime: '10:00 AM',
        endTime: '12:00 PM',
        days: [],
        capacity: 30,
        status: 'Active'
      });
    } catch (err) {
      console.error(err);
    }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-white">Batch Management</h2>
          <p className="text-sm text-[#6b7599] mt-1">Organize students into scheduled learning groups</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
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
            <Card className="p-6 hover:border-[#f75f6a]/30 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-[#4f8ef7] flex items-center justify-center">
                  <Users size={24} />
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                  batch.status === 'Active' ? 'bg-green-500/10 text-[#2ecc8a]' : 'bg-red-500/10 text-[#f75f6a]'
                }`}>
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
                  <span className="text-[#e8ecf5] font-medium">{teachers.find(t => t.id === batch.teacherId)?.name || 'Teacher'}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#6b7599] flex items-center gap-1.5"><Clock size={14} /> Timing</span>
                  <span className="text-[#e8ecf5] font-medium">{batch.startTime} - {batch.endTime}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#6b7599] flex items-center gap-1.5"><Calendar size={14} /> Days</span>
                  <div className="flex gap-1">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => {
                      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                      const isActive = batch.days.includes(dayNames[i]);
                      return (
                        <span key={i} className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${
                          isActive ? 'bg-[#4f8ef7] text-white' : 'bg-[#1a2035] text-[#6b7599]'
                        }`}>
                          {d}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button className="flex-1 bg-[#1a2035] hover:bg-[#242b40] text-white py-2 rounded-lg text-[12px] font-bold transition-colors">
                  View Students
                </button>
                <button 
                  onClick={() => handleEdit(batch)}
                  className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-[#4f8ef7] rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(batch.id)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-[#f75f6a] rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Create Modal */}
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
              className="relative w-full max-w-[560px] bg-[#131726] border border-[#242b40] rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold font-syne text-white">
                  {editingBatch ? 'Edit Batch' : 'Create New Batch'}
                </h3>
                <button 
                  onClick={() => {
                    setShowModal(false);
                    setEditingBatch(null);
                    setFormData({
                      name: '',
                      courseId: '',
                      teacherId: '',
                      startTime: '10:00 AM',
                      endTime: '12:00 PM',
                      days: [],
                      capacity: 30,
                      status: 'Active'
                    });
                  }} 
                  className="p-2 hover:bg-red-500/10 text-[#6b7599] hover:text-red-500 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Batch Name</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#f75f6a] transition-colors text-white"
                    placeholder="e.g. Morning SEO Batch — 2026"
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
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Teacher</label>
                    <select 
                      required
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#f75f6a] transition-colors text-white"
                      value={formData.teacherId}
                      onChange={(e) => setFormData({...formData, teacherId: e.target.value})}
                    >
                      <option value="">Assign Teacher</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Start Time</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#f75f6a] transition-colors text-white"
                      placeholder="10:00 AM"
                      value={formData.startTime}
                      onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">End Time</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#f75f6a] transition-colors text-white"
                      placeholder="12:00 PM"
                      value={formData.endTime}
                      onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Schedule Days</label>
                  <div className="flex flex-wrap gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          formData.days.includes(day) 
                            ? 'bg-[#4f8ef7] text-white shadow-lg shadow-blue-500/20' 
                            : 'bg-[#1a2035] text-[#6b7599] border border-[#242b40]'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="submit"
                    className="flex-1 bg-[#f75f6a] hover:bg-[#e04e59] text-white py-3 rounded-xl font-bold text-sm transition-colors"
                  >
                    {editingBatch ? 'Update Batch' : 'Create Batch'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingBatch(null);
                      setFormData({
                        name: '',
                        courseId: '',
                        teacherId: '',
                        startTime: '10:00 AM',
                        endTime: '12:00 PM',
                        days: [],
                        capacity: 30,
                        status: 'Active'
                      });
                    }}
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

export default Batches;
