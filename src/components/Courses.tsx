import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Video, 
  Users, 
  Clock, 
  BarChart3,
  X
} from 'lucide-react';
import { subscribeToCollection, createDoc, updateDocument, deleteDocument } from '../services/firestore';
import { sendEmail, getNewRecordTemplate, getUpdateNotificationTemplate } from '../services/emailService';
import { cn } from '../lib/utils';
import { Course, User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Technology',
    teacherId: '',
    price: 0,
    duration: '',
    level: 'Beginner',
    status: 'Active',
    emoji: '💻',
    description: ''
  });

  useEffect(() => {
    const unsubCourses = subscribeToCollection('courses', setCourses);
    const unsubTeachers = subscribeToCollection('users', (data) => {
      setTeachers(data.filter(u => u.role === 'teacher'));
    });

    return () => {
      unsubCourses();
      unsubTeachers();
    };
  }, []);

  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      category: course.category,
      teacherId: course.teacherId,
      price: course.price,
      duration: course.duration,
      level: course.level,
      status: course.status,
      emoji: course.emoji || '💻',
      description: course.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await deleteDocument('courses', id);
      } catch (err: any) {
        console.error(err);
        alert('Failed to delete course: ' + err.message);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await updateDocument('courses', editingCourse.id, formData);
        
        // Notify teacher about course update
        const teacher = teachers.find(t => t.uid === formData.teacherId);
        if (teacher) {
          const details = `The course "${formData.title}" assigned to you has been updated. Status: ${formData.status}, Price: ₹${formData.price}.`;
          const html = getUpdateNotificationTemplate(teacher.name, 'Course', 'updated', details);
          await sendEmail(teacher.email, `Course Update: ${formData.title}`, html);
        }
      } else {
        await createDoc('courses', {
          ...formData,
          studentsCount: 0,
          keyPoints: []
        });

        // Notify teacher about new course assignment
        const teacher = teachers.find(t => t.uid === formData.teacherId);
        if (teacher) {
          const details = `You have been assigned as the instructor for the new course: "${formData.title}". Category: ${formData.category}, Duration: ${formData.duration}.`;
          const html = getNewRecordTemplate('Course Assignment', teacher.name, details);
          await sendEmail(teacher.email, `New Course Assigned: ${formData.title}`, html);
        }
      }
      setShowModal(false);
      setEditingCourse(null);
      setFormData({
        title: '',
        category: 'Technology',
        teacherId: '',
        price: 0,
        duration: '',
        level: 'Beginner',
        status: 'Active',
        emoji: '💻',
        description: ''
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-white">Course Management</h2>
          <p className="text-sm text-[#6b7599] mt-1">{courses.length} courses available in catalog</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#2ecc8a] hover:bg-[#27af76] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors w-fit"
        >
          <Plus size={18} /> Create Course
        </button>
      </div>

      <div className="flex items-center gap-2 bg-[#131726] border border-[#242b40] rounded-xl px-4 py-2 w-full max-w-md">
        <Search size={16} className="text-[#6b7599]" />
        <input 
          type="text" 
          placeholder="Search courses..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm w-full placeholder-[#6b7599]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCourses.map((c) => (
          <Card key={c.id} className="p-0 group">
            <div className="h-32 bg-gradient-to-br from-[#1a2035] to-[#131726] flex items-center justify-center text-5xl">
              {c.emoji}
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-[#4f8ef7] text-[10px] font-bold uppercase tracking-wider">
                  {c.category}
                </span>
                <span className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                  c.status === 'Active' ? "bg-green-500/10 text-[#2ecc8a]" : "bg-yellow-500/10 text-[#f7d04f]"
                )}>
                  {c.status}
                </span>
              </div>
              <h3 className="text-base font-bold text-white font-syne mb-1">{c.title}</h3>
              <p className="text-xs text-[#6b7599] mb-4">👨‍🏫 {teachers.find(t => t.uid === c.teacherId)?.name || 'Unknown Teacher'}</p>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1 text-[11px] text-[#6b7599]">
                  <Clock size={12} /> {c.duration}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[#6b7599]">
                  <BarChart3 size={12} /> {c.level}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[#6b7599]">
                  <Users size={12} /> {c.studentsCount} Students
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#242b40]">
                <div className="text-lg font-extrabold text-[#4f8ef7] font-syne">₹{c.price.toLocaleString()}</div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(c)}
                    className="p-2 hover:bg-blue-500/10 text-[#4f8ef7] rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(c.id)}
                    className="p-2 hover:bg-red-500/10 text-[#f75f6a] rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Modal */}
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
                <h3 className="text-xl font-extrabold font-syne">
                  {editingCourse ? 'Edit Course' : 'Create New Course'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-red-500/10 text-[#6b7599] hover:text-red-500 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Course Title</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2ecc8a] transition-colors"
                    placeholder="e.g. Advanced Web Development"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Category</label>
                    <select 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2ecc8a] transition-colors"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      <option>Technology</option>
                      <option>Marketing</option>
                      <option>Design</option>
                      <option>Business</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Level</label>
                    <select 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2ecc8a] transition-colors"
                      value={formData.level}
                      onChange={(e) => setFormData({...formData, level: e.target.value as any})}
                    >
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Instructor</label>
                    <select 
                      required
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2ecc8a] transition-colors"
                      value={formData.teacherId}
                      onChange={(e) => setFormData({...formData, teacherId: e.target.value})}
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Price (₹)</label>
                    <input 
                      required
                      type="number" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2ecc8a] transition-colors"
                      placeholder="e.g. 4999"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Duration</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2ecc8a] transition-colors"
                      placeholder="e.g. 3 months"
                      value={formData.duration}
                      onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Emoji Icon</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2ecc8a] transition-colors"
                      placeholder="e.g. 💻"
                      value={formData.emoji}
                      onChange={(e) => setFormData({...formData, emoji: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Description</label>
                  <textarea 
                    className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2ecc8a] transition-colors min-h-[80px]"
                    placeholder="Course overview and objectives..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="submit"
                    className="flex-1 bg-[#2ecc8a] hover:bg-[#27af76] text-white py-3 rounded-xl font-bold text-sm transition-colors"
                  >
                    {editingCourse ? 'Update Course' : 'Create Course'}
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

export default Courses;
