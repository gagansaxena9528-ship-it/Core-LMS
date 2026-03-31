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
  X,
  BookOpen,
  Layout,
  Settings,
  FileText,
  PlayCircle,
  ChevronRight,
  ChevronDown,
  DollarSign,
  Tag,
  Globe,
  Award,
  Star,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Zap,
  Languages,
  Layers,
  HelpCircle,
  Download,
  Eye
} from 'lucide-react';
import { subscribeToCollection, createDoc, updateDocument, deleteDocument, getDocs } from '../services/firestore';
import { sendEmail, getNewRecordTemplate, getUpdateNotificationTemplate } from '../services/emailService';
import { cn } from '../lib/utils';
import { Course, User, Module, Lesson, Student } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface CoursesProps {
  user?: User;
}

const Courses: React.FC<CoursesProps> = ({ user }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'details' | 'structure' | 'settings' | 'students'>('basic');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Technology',
    teacherId: '',
    price: 0,
    discountPrice: 0,
    isFree: false,
    duration: '',
    level: 'Beginner' as const,
    status: 'Draft' as const,
    emoji: '💻',
    thumbnail: '',
    description: '',
    language: 'English',
    tags: '',
    offerBanner: '',
    dripContent: false,
    certificateEnabled: true
  });

  // Structure State
  const [courseModules, setCourseModules] = useState<Module[]>([]);
  const [moduleLessons, setModuleLessons] = useState<Lesson[]>([]);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);

  const [lessonFormData, setLessonFormData] = useState<Partial<Lesson>>({
    title: '',
    type: 'video',
    content: '',
    videoUrl: '',
    videoType: 'youtube',
    fileUrl: '',
    duration: '',
    isFree: false,
    dripDays: 0
  });

  useEffect(() => {
    const unsubCourses = subscribeToCollection('courses', (data) => {
      if (user?.role === 'teacher') {
        setCourses(data.filter(c => c.teacherId === user.uid));
      } else {
        setCourses(data);
      }
    });
    const unsubTeachers = subscribeToCollection('users', (data) => {
      setTeachers(data.filter(u => u.role === 'teacher'));
      setStudents(data.filter(u => u.role === 'student') as Student[]);
    });
    const unsubModules = subscribeToCollection('modules', setModules);
    const unsubLessons = subscribeToCollection('lessons', setLessons);

    return () => {
      unsubCourses();
      unsubTeachers();
      unsubModules();
      unsubLessons();
    };
  }, [user?.uid, user?.role]);

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
      discountPrice: course.discountPrice || 0,
      isFree: course.isFree || false,
      duration: course.duration,
      level: course.level,
      status: course.status,
      emoji: course.emoji || '💻',
      thumbnail: course.thumbnail || '',
      description: course.description || '',
      language: course.language || 'English',
      tags: Array.isArray(course.tags) ? course.tags.join(', ') : '',
      offerBanner: course.offerBanner || '',
      dripContent: course.dripContent || false,
      certificateEnabled: course.certificateEnabled !== undefined ? course.certificateEnabled : true
    });
    setCourseModules(modules.filter(m => m.courseId === course.id).sort((a, b) => a.order - b.order));
    setModuleLessons(lessons.filter(l => l.courseId === course.id).sort((a, b) => a.order - b.order));
    setActiveTab('basic');
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this course? All associated modules and lessons will also be deleted.')) {
      try {
        await deleteDocument('courses', id);
        // Delete associated modules and lessons
        const courseModules = modules.filter(m => m.courseId === id);
        for (const m of courseModules) {
          await deleteDocument('modules', m.id);
        }
        const courseLessons = lessons.filter(l => l.courseId === id);
        for (const l of courseLessons) {
          await deleteDocument('lessons', l.id);
        }
      } catch (err: any) {
        console.error(err);
        alert('Failed to delete course: ' + err.message);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(t => t !== '');
      const courseData = {
        ...formData,
        tags: tagsArray,
        studentsCount: editingCourse ? editingCourse.studentsCount : 0,
        rating: editingCourse ? editingCourse.rating : 4.8,
        reviewsCount: editingCourse ? editingCourse.reviewsCount : 0,
        createdAt: editingCourse ? editingCourse.createdAt : new Date().toISOString()
      };

      if (editingCourse) {
        await updateDocument('courses', editingCourse.id, courseData);
        
        const teacher = teachers.find(t => t.uid === formData.teacherId);
        if (teacher) {
          const details = `The course "${formData.title}" assigned to you has been updated. Status: ${formData.status}, Price: ₹${formData.price}.`;
          const html = getUpdateNotificationTemplate(teacher.name, 'Course', 'updated', details);
          await sendEmail(teacher.email, `Course Update: ${formData.title}`, html);
        }
      } else {
        const newCourseId = Math.random().toString(36).substring(2, 15);
        await createDoc('courses', {
          ...courseData,
          id: newCourseId
        }, newCourseId);

        const teacher = teachers.find(t => t.uid === formData.teacherId);
        if (teacher) {
          const details = `You have been assigned as the instructor for the new course: "${formData.title}". Category: ${formData.category}, Duration: ${formData.duration}.`;
          const html = getNewRecordTemplate('Course Assignment', teacher.name, details);
          await sendEmail(teacher.email, `New Course Assigned: ${formData.title}`, html);
        }
      }
      setShowModal(false);
      setEditingCourse(null);
      resetFormData();
    } catch (err) {
      console.error(err);
      alert('Failed to save course');
    } finally {
      setLoading(false);
    }
  };

  const resetFormData = () => {
    setFormData({
      title: '',
      category: 'Technology',
      teacherId: '',
      price: 0,
      discountPrice: 0,
      isFree: false,
      duration: '',
      level: 'Beginner',
      status: 'Draft',
      emoji: '💻',
      thumbnail: '',
      description: '',
      language: 'English',
      tags: '',
      offerBanner: '',
      dripContent: false,
      certificateEnabled: true
    });
  };

  // Module/Lesson Handlers
  const handleAddModule = async (title: string) => {
    if (!editingCourse) return;
    const newModule: Module = {
      id: Math.random().toString(36).substring(2, 15),
      courseId: editingCourse.id,
      title,
      order: courseModules.length + 1
    };
    await createDoc('modules', newModule, newModule.id);
    setCourseModules([...courseModules, newModule]);
  };

  const handleAddLesson = async (lessonData: Partial<Lesson>) => {
    if (!editingCourse || !editingModule) return;
    const newLesson: Lesson = {
      id: Math.random().toString(36).substring(2, 15),
      moduleId: editingModule.id,
      courseId: editingCourse.id,
      title: lessonData.title || 'Untitled Lesson',
      type: lessonData.type || 'video',
      content: lessonData.content,
      videoUrl: lessonData.videoUrl,
      videoType: lessonData.videoType,
      fileUrl: lessonData.fileUrl,
      duration: lessonData.duration,
      order: moduleLessons.filter(l => l.moduleId === editingModule.id).length + 1,
      isFree: lessonData.isFree || false,
      dripDays: lessonData.dripDays || 0,
      status: 'Published'
    };
    await createDoc('lessons', newLesson, newLesson.id);
    setModuleLessons([...moduleLessons, newLesson]);
    setShowLessonModal(false);
  };

  const handleUpdateLesson = async (lessonData: Partial<Lesson>) => {
    if (!editingLesson) return;
    await updateDocument('lessons', editingLesson.id, lessonData);
    setModuleLessons(moduleLessons.map(l => l.id === editingLesson.id ? { ...l, ...lessonData } : l));
    setShowLessonModal(false);
    setEditingLesson(null);
  };

  const enrolledStudents = editingCourse 
    ? students.filter(s => s.courseId === editingCourse.id || s.course === editingCourse.title)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-foreground">Course Management</h2>
          <p className="text-sm text-muted-foreground mt-1">{courses.length} courses available in catalog</p>
        </div>
        {user?.role !== 'student' && (
          <button 
            onClick={() => {
              resetFormData();
              setEditingCourse(null);
              setCourseModules([]);
              setModuleLessons([]);
              setShowModal(true);
            }}
            className="bg-success hover:bg-success/90 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors w-fit"
          >
            <Plus size={18} /> Create Course
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-4 py-2 w-full max-w-md">
        <Search size={16} className="text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Search courses..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm w-full placeholder-muted-foreground"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCourses.map((c) => (
          <Card key={c.id} className="p-0 group overflow-hidden border-border bg-card">
            <div className="h-40 bg-muted relative overflow-hidden">
              {c.thumbnail ? (
                <img 
                  src={c.thumbnail} 
                  alt={c.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-muted to-background">
                  {c.emoji}
                </div>
              )}
              <div className="absolute top-3 left-3 flex gap-2">
                <span className="px-2 py-1 rounded-lg bg-black/50 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                  {c.category}
                </span>
              </div>
              <div className="absolute top-3 right-3">
                <span className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md",
                  c.status === 'Active' ? "bg-success/20 text-success" : 
                  c.status === 'Draft' ? "bg-warning/20 text-warning" : "bg-destructive/20 text-destructive"
                )}>
                  {c.status}
                </span>
              </div>
            </div>
            
            <div className="p-6">
              <h3 className="text-base font-bold text-foreground font-syne mb-1 line-clamp-1 group-hover:text-success transition-colors">{c.title}</h3>
              <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                <Users size={12} className="text-success" />
                {teachers.find(t => t.uid === c.teacherId)?.name || 'Unknown Instructor'}
              </p>
              
              <div className="grid grid-cols-2 gap-y-3 mb-6">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Clock size={14} className="text-success" /> {c.duration}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <BarChart3 size={14} className="text-success" /> {c.level}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Users size={14} className="text-success" /> {c.studentsCount} Students
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Star size={14} className="text-warning" fill="currentColor" /> {c.rating || '4.8'}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex flex-col">
                  {c.isFree ? (
                    <span className="text-lg font-extrabold text-success font-syne uppercase">Free</span>
                  ) : (
                    <>
                      <div className="text-lg font-extrabold text-foreground font-syne">₹{c.price.toLocaleString()}</div>
                      {c.discountPrice > 0 && (
                        <div className="text-[10px] text-muted-foreground line-through">₹{c.discountPrice.toLocaleString()}</div>
                      )}
                    </>
                  )}
                </div>
                {user?.role !== 'student' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(c)}
                      className="p-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-xl transition-colors"
                      title="Edit Course"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(c.id)}
                      className="p-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl transition-colors"
                      title="Delete Course"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[900px] bg-background border border-border rounded-2xl shadow-2xl overflow-hidden my-8"
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold font-syne text-foreground">
                      {editingCourse ? 'Edit Course' : 'Create New Course'}
                    </h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Course Management System</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 p-2 bg-muted/50 border-b border-border overflow-x-auto no-scrollbar">
                {[
                  { id: 'basic', label: 'Basic Info', icon: Layout },
                  { id: 'details', label: 'Details', icon: FileText },
                  { id: 'structure', label: 'Structure', icon: Layers },
                  { id: 'settings', label: 'Settings', icon: Settings },
                  { id: 'students', label: 'Students', icon: Users }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                      activeTab === tab.id 
                        ? "bg-success text-white shadow-lg shadow-success/20" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <form id="courseForm" onSubmit={handleSave} className="space-y-6">
                  {activeTab === 'basic' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Course Title</label>
                        <input 
                          required
                          type="text" 
                          className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-success transition-colors"
                          placeholder="e.g. Advanced Web Development"
                          value={formData.title}
                          onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
                        <textarea 
                          required
                          className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-success transition-colors min-h-[120px]"
                          placeholder="Detailed course overview..."
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Category</label>
                          <select 
                            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-success transition-colors"
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                          >
                            <option>Technology</option>
                            <option>Marketing</option>
                            <option>Design</option>
                            <option>Business</option>
                            <option>Health</option>
                            <option>Other</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Instructor</label>
                          <select 
                            required
                            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-success transition-colors"
                            value={formData.teacherId}
                            onChange={(e) => setFormData({...formData, teacherId: e.target.value})}
                          >
                            <option value="">Select Instructor</option>
                            {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Thumbnail Image URL</label>
                        <input 
                          type="url" 
                          className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-success transition-colors"
                          placeholder="https://images.unsplash.com/..."
                          value={formData.thumbnail}
                          onChange={(e) => setFormData({...formData, thumbnail: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'details' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Duration</label>
                          <input 
                            type="text" 
                            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-success transition-colors"
                            placeholder="e.g. 12 Weeks"
                            value={formData.duration}
                            onChange={(e) => setFormData({...formData, duration: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Level</label>
                          <select 
                            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-success transition-colors"
                            value={formData.level}
                            onChange={(e) => setFormData({...formData, level: e.target.value as any})}
                          >
                            <option>Beginner</option>
                            <option>Intermediate</option>
                            <option>Advanced</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Language</label>
                          <input 
                            type="text" 
                            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-success transition-colors"
                            placeholder="e.g. English, Hindi"
                            value={formData.language}
                            onChange={(e) => setFormData({...formData, language: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Emoji Icon</label>
                          <input 
                            type="text" 
                            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-success transition-colors"
                            placeholder="e.g. 💻"
                            value={formData.emoji}
                            onChange={(e) => setFormData({...formData, emoji: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Tags (Comma separated)</label>
                        <input 
                          type="text" 
                          className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-success transition-colors"
                          placeholder="e.g. Web, React, JavaScript"
                          value={formData.tags}
                          onChange={(e) => setFormData({...formData, tags: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'structure' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {!editingCourse ? (
                        <div className="p-12 text-center bg-muted/50 rounded-2xl border border-dashed border-border">
                          <Zap size={40} className="mx-auto text-success mb-4 opacity-20" />
                          <p className="text-muted-foreground text-sm">Please save the course first to manage its structure.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-foreground">Course Modules</h4>
                            <button 
                              type="button"
                              onClick={() => {
                                const title = window.prompt('Enter Module Title:');
                                if (title) handleAddModule(title);
                              }}
                              className="text-[11px] font-bold text-success hover:underline flex items-center gap-1"
                            >
                              <Plus size={14} /> Add Module
                            </button>
                          </div>

                          <div className="space-y-3">
                            {courseModules.map((module, mIdx) => (
                              <div key={module.id} className="bg-muted/50 border border-border rounded-xl overflow-hidden">
                                <div className="p-4 flex items-center justify-between bg-muted">
                                  <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-success/10 text-success flex items-center justify-center text-[10px] font-bold">
                                      {mIdx + 1}
                                    </span>
                                    <h5 className="text-sm font-bold text-foreground">{module.title}</h5>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        setEditingModule(module);
                                        setEditingLesson(null);
                                        setLessonFormData({
                                          title: '',
                                          type: 'video',
                                          content: '',
                                          videoUrl: '',
                                          videoType: 'youtube',
                                          fileUrl: '',
                                          duration: '',
                                          isFree: false,
                                          dripDays: 0
                                        });
                                        setShowLessonModal(true);
                                      }}
                                      className="p-1.5 hover:bg-success/10 text-success rounded-lg transition-colors"
                                      title="Add Lesson"
                                    >
                                      <Plus size={14} />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={async () => {
                                        if (window.confirm('Delete module?')) {
                                          await deleteDocument('modules', module.id);
                                          setCourseModules(courseModules.filter(m => m.id !== module.id));
                                        }
                                      }}
                                      className="p-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                                <div className="p-2 space-y-1">
                                  {moduleLessons.filter(l => l.moduleId === module.id).map((lesson, lIdx) => (
                                    <div key={lesson.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors group">
                                      <div className="flex items-center gap-3">
                                        {lesson.type === 'video' ? <PlayCircle size={14} className="text-accent" /> : <FileText size={14} className="text-success" />}
                                        <span className="text-xs text-foreground/90">{lesson.title}</span>
                                      </div>
                                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          type="button" 
                                          onClick={() => {
                                            setEditingLesson(lesson);
                                            setLessonFormData({
                                              title: lesson.title,
                                              type: lesson.type,
                                              content: lesson.content,
                                              videoUrl: lesson.videoUrl,
                                              videoType: lesson.videoType,
                                              fileUrl: lesson.fileUrl,
                                              duration: lesson.duration,
                                              isFree: lesson.isFree,
                                              dripDays: lesson.dripDays
                                            });
                                            setShowLessonModal(true);
                                          }}
                                          className="p-1 hover:text-foreground"
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                        <button 
                                          type="button" 
                                          onClick={async () => {
                                            await deleteDocument('lessons', lesson.id);
                                            setModuleLessons(moduleLessons.filter(l => l.id !== lesson.id));
                                          }}
                                          className="p-1 hover:text-destructive"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  {moduleLessons.filter(l => l.moduleId === module.id).length === 0 && (
                                    <div className="p-4 text-center text-[10px] text-muted-foreground italic">No lessons added yet.</div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {courseModules.length === 0 && (
                              <div className="p-8 text-center bg-muted/30 rounded-xl border border-dashed border-border">
                                <Layers size={24} className="mx-auto text-muted-foreground mb-2 opacity-20" />
                                <p className="text-[11px] text-muted-foreground">No modules created for this course.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'settings' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Pricing Settings</label>
                          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl border border-border">
                            <input 
                              type="checkbox" 
                              id="isFree"
                              className="w-4 h-4 rounded border-border text-success focus:ring-success bg-transparent"
                              checked={formData.isFree}
                              onChange={(e) => setFormData({...formData, isFree: e.target.checked})}
                            />
                            <label htmlFor="isFree" className="text-sm font-bold text-foreground cursor-pointer">This is a Free Course</label>
                          </div>
                          
                          {!formData.isFree && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Price (₹)</label>
                                <input 
                                  type="number" 
                                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-success"
                                  value={formData.price}
                                  onChange={(e) => setFormData({...formData, price: parseInt(e.target.value)})}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Discount Price (₹)</label>
                                <input 
                                  type="number" 
                                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-success"
                                  value={formData.discountPrice}
                                  onChange={(e) => setFormData({...formData, discountPrice: parseInt(e.target.value)})}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Course Status</label>
                          <div className="grid grid-cols-1 gap-2">
                            {['Draft', 'Active', 'Archived'].map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => setFormData({...formData, status: status as any})}
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all",
                                  formData.status === status 
                                    ? "bg-success/10 border-success text-success" 
                                    : "bg-muted/50 border-border text-muted-foreground hover:border-muted-foreground"
                                )}
                              >
                                {status}
                                {formData.status === status && <CheckCircle2 size={14} />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Pro Features</label>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                              <div className="flex items-center gap-3">
                                <Clock size={18} className="text-success" />
                                <div>
                                  <div className="text-xs font-bold text-foreground">Drip Content</div>
                                  <div className="text-[10px] text-muted-foreground">Unlock lessons daily</div>
                                </div>
                              </div>
                              <input 
                                type="checkbox" 
                                checked={formData.dripContent}
                                onChange={(e) => setFormData({...formData, dripContent: e.target.checked})}
                                className="w-4 h-4 rounded border-border text-success focus:ring-success bg-transparent"
                              />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                              <div className="flex items-center gap-3">
                                <Award size={18} className="text-success" />
                                <div>
                                  <div className="text-xs font-bold text-foreground">Certificates</div>
                                  <div className="text-[10px] text-muted-foreground">Enable completion certificate</div>
                                </div>
                              </div>
                              <input 
                                type="checkbox" 
                                checked={formData.certificateEnabled}
                                onChange={(e) => setFormData({...formData, certificateEnabled: e.target.checked})}
                                className="w-4 h-4 rounded border-border text-success focus:ring-success bg-transparent"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Offer Banner Text</label>
                          <input 
                            type="text" 
                            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-success transition-colors text-foreground"
                            placeholder="e.g. Special 50% Off for New Students!"
                            value={formData.offerBanner}
                            onChange={(e) => setFormData({...formData, offerBanner: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'students' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="bg-card rounded-2xl border border-border overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-muted/30">
                              <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Student</th>
                              <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Progress</th>
                              <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                              <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Joined</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {enrolledStudents.map((student) => (
                              <tr key={student.uid} className="hover:bg-muted/20 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center text-xs font-bold">
                                      {student.av}
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold text-foreground">{student.name}</div>
                                      <div className="text-[10px] text-muted-foreground">{student.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-success rounded-full transition-all duration-500"
                                        style={{ width: `${student.progress || 0}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-bold text-foreground">{student.progress || 0}%</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                                    student.status === 'Active' ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                                  )}>
                                    {student.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-[10px] text-muted-foreground">{student.joined}</td>
                              </tr>
                            ))}
                            {enrolledStudents.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm italic">
                                  No students enrolled in this course yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              <div className="p-6 border-t border-border bg-card/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                  {loading ? 'Processing...' : 'Ready to save'}
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2.5 bg-card border border-border text-foreground rounded-xl font-bold text-xs hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    form="courseForm"
                    type="submit"
                    disabled={loading}
                    className="px-8 py-2.5 bg-success hover:bg-success/90 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-success/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    {editingCourse ? 'Update Course' : 'Create Course'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lesson Modal */}
      <AnimatePresence>
        {showLessonModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLessonModal(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-[500px] bg-card border border-border rounded-2xl shadow-2xl p-6"
            >
              <h3 className="text-lg font-bold text-foreground mb-6">
                {editingLesson ? 'Edit Lesson' : 'Add New Lesson'}
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Lesson Title</label>
                  <input 
                    type="text" 
                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-success text-foreground"
                    value={lessonFormData.title}
                    onChange={(e) => setLessonFormData({...lessonFormData, title: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Type</label>
                    <select 
                      className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-success text-foreground"
                      value={lessonFormData.type}
                      onChange={(e) => setLessonFormData({...lessonFormData, type: e.target.value as any})}
                    >
                      <option value="video">Video</option>
                      <option value="pdf">PDF Document</option>
                      <option value="text">Text Content</option>
                      <option value="file">Downloadable File</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Duration</label>
                    <input 
                      type="text" 
                      className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-success text-foreground"
                      placeholder="e.g. 15:00"
                      value={lessonFormData.duration}
                      onChange={(e) => setLessonFormData({...lessonFormData, duration: e.target.value})}
                    />
                  </div>
                </div>

                {lessonFormData.type === 'video' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Video Type</label>
                      <select 
                        className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-success text-foreground"
                        value={lessonFormData.videoType}
                        onChange={(e) => setLessonFormData({...lessonFormData, videoType: e.target.value as any})}
                      >
                        <option value="youtube">YouTube</option>
                        <option value="direct">Direct Link</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Video URL</label>
                      <input 
                        type="text" 
                        className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-success text-foreground"
                        placeholder="https://..."
                        value={lessonFormData.videoUrl}
                        onChange={(e) => setLessonFormData({...lessonFormData, videoUrl: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                {(lessonFormData.type === 'pdf' || lessonFormData.type === 'file') && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">File URL</label>
                    <input 
                      type="text" 
                      className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-success text-foreground"
                      placeholder="https://..."
                      value={lessonFormData.fileUrl}
                      onChange={(e) => setLessonFormData({...lessonFormData, fileUrl: e.target.value})}
                    />
                  </div>
                )}

                {lessonFormData.type === 'text' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Content</label>
                    <textarea 
                      className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-success text-foreground min-h-[100px]"
                      value={lessonFormData.content}
                      onChange={(e) => setLessonFormData({...lessonFormData, content: e.target.value})}
                    />
                  </div>
                )}

                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="lessonFree"
                      checked={lessonFormData.isFree}
                      onChange={(e) => setLessonFormData({...lessonFormData, isFree: e.target.checked})}
                      className="w-4 h-4 rounded border-border text-success focus:ring-success bg-transparent"
                    />
                    <label htmlFor="lessonFree" className="text-xs text-foreground">Free Preview</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Drip Days:</label>
                    <input 
                      type="number" 
                      className="w-16 bg-muted/50 border border-border rounded-lg px-2 py-1 text-xs outline-none text-foreground"
                      value={lessonFormData.dripDays}
                      onChange={(e) => setLessonFormData({...lessonFormData, dripDays: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => editingLesson ? handleUpdateLesson(lessonFormData) : handleAddLesson(lessonFormData)}
                  className="flex-1 bg-success hover:bg-success/90 text-white py-2.5 rounded-xl font-bold text-sm transition-colors"
                >
                  {editingLesson ? 'Update Lesson' : 'Add Lesson'}
                </button>
                <button 
                  onClick={() => setShowLessonModal(false)}
                  className="px-6 bg-muted/50 border border-border text-foreground rounded-xl font-bold text-sm hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Courses;
