import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Video, 
  FileText, 
  Layers, 
  ChevronRight,
  X,
  PlusCircle,
  Image as ImageIcon,
  Link as LinkIcon,
  Eye,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Download,
  Lock,
  Unlock,
  Users,
  Play,
  FileUp,
  HelpCircle,
  MoreVertical
} from 'lucide-react';
import { subscribeToCollection, addDoc, updateDoc, deleteDoc } from '../services/firestore';
import { Lesson, Course, Module, Exam, Assignment, Batch, User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

const ContentManagement: React.FC<{ user: User }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'pdfs' | 'quizzes' | 'assignments' | 'analytics'>('overview');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [search, setSearch] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'video' | 'pdf' | 'quiz' | 'assignment'>('video');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    courseId: '',
    moduleId: '',
    description: '',
    videoType: 'youtube',
    videoUrl: '',
    duration: '',
    dripDays: 0,
    thumbnail: '',
    fileUrl: '',
    allowDownload: true,
    quizDuration: 30,
    passingMarks: 40,
    autoResult: true,
    dueDate: '',
    totalMarks: 100,
    isPaidOnly: false,
    status: 'Draft' as 'Draft' | 'Published' | 'Scheduled'
  });

  useEffect(() => {
    const unsubLessons = subscribeToCollection('lessons', setLessons);
    const unsubCourses = subscribeToCollection('courses', setCourses);
    const unsubModules = subscribeToCollection('modules', setModules);
    const unsubExams = subscribeToCollection('exams', setExams);
    const unsubAssignments = subscribeToCollection('assignments', setAssignments);
    const unsubBatches = subscribeToCollection('batches', setBatches);

    return () => {
      unsubLessons();
      unsubCourses();
      unsubModules();
      unsubExams();
      unsubAssignments();
      unsubBatches();
    };
  }, []);

  const allContent = [
    ...lessons.map(l => ({ ...l, contentType: l.type === 'video' ? 'Video' : 'PDF' })),
    ...exams.map(e => ({ ...e, contentType: 'Quiz', type: 'quiz' })),
    ...assignments.map(a => ({ ...a, contentType: 'Assignment', type: 'assignment' }))
  ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const filteredContent = allContent.filter(item => {
    const matchesCourse = selectedCourseId === 'all' || item.courseId === selectedCourseId;
    const matchesModule = selectedModuleId === 'all' || (item as any).moduleId === selectedModuleId;
    const matchesType = selectedType === 'all' || item.contentType.toLowerCase() === selectedType.toLowerCase();
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
    
    if (user.role === 'teacher') {
      const teacherCourseIds = courses.filter(c => c.teacherId === user.uid).map(c => c.id);
      return matchesCourse && matchesModule && matchesType && matchesSearch && teacherCourseIds.includes(item.courseId);
    }
    
    return matchesCourse && matchesModule && matchesType && matchesSearch;
  });

  const stats = {
    totalVideos: lessons.filter(l => l.type === 'video').length,
    totalPDFs: lessons.filter(l => l.type === 'pdf').length,
    totalQuizzes: exams.length,
    totalAssignments: assignments.length,
    publishedCount: allContent.filter(item => (item as any).status === 'Published' || (item as any).status === 'Active').length,
    draftCount: allContent.filter(item => (item as any).status === 'Draft').length
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    if (item.contentType === 'Video') setModalType('video');
    else if (item.contentType === 'PDF') setModalType('pdf');
    else if (item.contentType === 'Quiz') setModalType('quiz');
    else if (item.contentType === 'Assignment') setModalType('assignment');

    setFormData({
      title: item.title || '',
      courseId: item.courseId || '',
      moduleId: item.moduleId || '',
      description: item.description || '',
      videoType: item.videoType || 'youtube',
      videoUrl: item.videoUrl || '',
      duration: item.duration || (item.contentType === 'Quiz' ? item.duration : ''),
      dripDays: item.dripDays || 0,
      thumbnail: item.thumbnail || '',
      fileUrl: item.fileUrl || '',
      allowDownload: item.allowDownload !== undefined ? item.allowDownload : true,
      quizDuration: item.contentType === 'Quiz' ? item.duration : 30,
      passingMarks: item.passingMarks || 40,
      autoResult: item.autoResult !== undefined ? item.autoResult : true,
      dueDate: item.dueDate || '',
      totalMarks: item.totalMarks || 100,
      isPaidOnly: item.accessControl?.isPaidOnly || false,
      status: item.status || 'Draft'
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const commonData = {
        title: formData.title,
        courseId: formData.courseId,
        moduleId: formData.moduleId,
        description: formData.description,
        status: formData.status,
        accessControl: {
          isPaidOnly: formData.isPaidOnly,
          batchIds: [] // Can be extended to select specific batches
        },
        updatedAt: new Date().toISOString()
      };

      if (modalType === 'video' || modalType === 'pdf') {
        const lessonData = {
          ...commonData,
          type: modalType,
          videoType: modalType === 'video' ? formData.videoType : undefined,
          videoUrl: modalType === 'video' ? formData.videoUrl : undefined,
          duration: modalType === 'video' ? formData.duration : undefined,
          dripDays: modalType === 'video' ? formData.dripDays : undefined,
          thumbnail: modalType === 'video' ? formData.thumbnail : undefined,
          fileUrl: modalType === 'pdf' ? formData.fileUrl : undefined,
          allowDownload: modalType === 'pdf' ? formData.allowDownload : undefined,
          createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
          teacherId: user.uid // Added teacherId
        };

        if (editingItem) {
          await updateDoc('lessons', editingItem.id, lessonData);
        } else {
          await addDoc('lessons', lessonData);
        }
      } else if (modalType === 'quiz') {
        const quizData = {
          ...commonData,
          duration: formData.quizDuration,
          passingMarks: formData.passingMarks,
          autoResult: formData.autoResult,
          type: 'mcq', // Default
          questions: editingItem?.questions || [],
          createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
          teacherId: user.uid // Added teacherId
        };

        if (editingItem) {
          await updateDoc('exams', editingItem.id, quizData);
        } else {
          await addDoc('exams', quizData);
        }
      } else if (modalType === 'assignment') {
        const assignmentData = {
          ...commonData,
          dueDate: formData.dueDate,
          totalMarks: formData.totalMarks,
          fileUrl: formData.fileUrl,
          createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
          teacherId: user.uid // Added teacherId
        };

        if (editingItem) {
          await updateDoc('assignments', editingItem.id, assignmentData);
        } else {
          await addDoc('assignments', assignmentData);
        }
      }

      setShowModal(false);
      setEditingItem(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: any) => {
    if (window.confirm(`Are you sure you want to delete this ${item.contentType}?`)) {
      try {
        const collection = item.contentType === 'Video' || item.contentType === 'PDF' ? 'lessons' : 
                          item.contentType === 'Quiz' ? 'exams' : 'assignments';
        await deleteDoc(collection, item.id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-white">Content Management</h2>
          <p className="text-sm text-[#6b7599] mt-1">Organize and publish your course materials</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setEditingItem(null);
              setModalType('video');
              setShowModal(true);
            }}
            className="bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors"
          >
            <Plus size={16} /> Add Content
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Videos', value: stats.totalVideos, icon: Video, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'PDFs', value: stats.totalPDFs, icon: FileText, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Quizzes', value: stats.totalQuizzes, icon: HelpCircle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Assignments', value: stats.totalAssignments, icon: FileUp, color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'Published', value: stats.publishedCount, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Drafts', value: stats.draftCount, icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
        ].map((stat, i) => (
          <Card key={i} className="p-3 flex flex-col items-center justify-center text-center border-[#242b40]">
            <div className={cn("p-2 rounded-lg mb-2", stat.bg, stat.color)}>
              <stat.icon size={18} />
            </div>
            <div className="text-lg font-bold font-syne text-white">{stat.value}</div>
            <div className="text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#131726] p-1 rounded-xl border border-[#242b40] w-fit">
        {[
          { id: 'overview', label: 'Overview', icon: Layers },
          { id: 'videos', label: 'Videos', icon: Video },
          { id: 'pdfs', label: 'PDFs & Notes', icon: FileText },
          { id: 'quizzes', label: 'Quizzes', icon: HelpCircle },
          { id: 'assignments', label: 'Assignments', icon: FileUp },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === tab.id ? "bg-[#4f8ef7] text-white shadow-lg shadow-blue-500/20" : "text-[#6b7599] hover:text-[#e8ecf5] hover:bg-[#1a2035]"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-[#131726] p-4 rounded-2xl border border-[#242b40]">
              <div className="flex-1 min-w-[200px] relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7599]" />
                <input 
                  type="text" 
                  placeholder="Search content title..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl pl-11 pr-4 py-2 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                />
              </div>
              <select 
                className="bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-[#4f8ef7]"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                <option value="all">All Courses</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <select 
                className="bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-[#4f8ef7]"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="video">Video</option>
                <option value="pdf">PDF</option>
                <option value="quiz">Quiz</option>
                <option value="assignment">Assignment</option>
              </select>
              <button className="p-2 bg-[#1a2035] border border-[#242b40] rounded-xl text-[#6b7599] hover:text-white">
                <Filter size={18} />
              </button>
            </div>

            {/* Content Table */}
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1a2035]">
                      <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Content Title</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Course / Module</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#242b40]">
                    {filteredContent.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.01] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              item.contentType === 'Video' ? "bg-blue-500/10 text-blue-500" :
                              item.contentType === 'PDF' ? "bg-purple-500/10 text-purple-500" :
                              item.contentType === 'Quiz' ? "bg-orange-500/10 text-orange-500" : "bg-green-500/10 text-green-500"
                            )}>
                              {item.contentType === 'Video' ? <Video size={14} /> :
                               item.contentType === 'PDF' ? <FileText size={14} /> :
                               item.contentType === 'Quiz' ? <HelpCircle size={14} /> : <FileUp size={14} />}
                            </div>
                            <div>
                              <div className="text-[13px] font-bold text-[#e8ecf5]">{item.title}</div>
                              <div className="text-[10px] text-[#6b7599] font-medium">ID: {item.id.slice(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[12px] font-bold text-[#6b7599]">
                            {courses.find(c => c.id === item.courseId)?.title || 'Unknown Course'}
                          </div>
                          <div className="text-[10px] text-[#4f8ef7] font-bold uppercase tracking-wider mt-0.5">
                            {modules.find(m => m.id === (item as any).moduleId)?.title || 'General Module'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-bold text-[#e8ecf5] bg-[#1a2035] px-2 py-1 rounded-md border border-[#242b40]">
                            {item.contentType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-[11px] text-[#6b7599]">
                            <Calendar size={12} /> {new Date(item.createdAt || Date.now()).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                            ((item as any).status === 'Published' || (item as any).status === 'Active') ? "bg-emerald-500/10 text-emerald-500" :
                            (item as any).status === 'Draft' ? "bg-yellow-500/10 text-yellow-500" : "bg-blue-500/10 text-blue-500"
                          )}>
                            {(item as any).status || 'Draft'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEdit(item)}
                              className="p-2 hover:bg-blue-500/10 text-[#4f8ef7] rounded-lg transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(item)}
                              className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.filter(l => l.type === 'video').map(video => (
              <Card key={video.id} className="p-0 overflow-hidden group">
                <div className="aspect-video bg-[#1a2035] relative">
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#242b40]">
                      <Video size={48} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm">
                      <Play size={18} fill="currentColor" />
                    </button>
                    <button onClick={() => handleEdit({...video, contentType: 'Video'})} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm">
                      <Edit2 size={18} />
                    </button>
                  </div>
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white flex items-center gap-1">
                    <Clock size={10} /> {video.duration || '00:00'}
                  </div>
                  {video.dripDays ? (
                    <div className="absolute top-3 left-3 bg-orange-500/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white flex items-center gap-1">
                      <Lock size={10} /> Drip: {video.dripDays} Days
                    </div>
                  ) : null}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-[#e8ecf5] truncate flex-1">{video.title}</h4>
                    <span className="text-[9px] font-bold text-[#4f8ef7] bg-blue-500/10 px-1.5 py-0.5 rounded uppercase">
                      {video.videoType}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6b7599] mt-1 line-clamp-2 h-8">{video.description}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#242b40]">
                    <div className="flex items-center gap-3 text-[10px] text-[#6b7599] font-bold uppercase">
                      <span className="flex items-center gap-1"><Eye size={12} /> {video.analytics?.views || 0}</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {video.accessControl?.batchIds?.length || 'All'}</span>
                    </div>
                    <div className={cn(
                      "text-[10px] font-bold uppercase",
                      video.status === 'Published' ? "text-emerald-500" : "text-yellow-500"
                    )}>
                      {video.status}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            <button 
              onClick={() => {
                setEditingItem(null);
                setModalType('video');
                setShowModal(true);
              }}
              className="aspect-video rounded-2xl border-2 border-dashed border-[#242b40] flex flex-col items-center justify-center gap-3 text-[#6b7599] hover:text-[#4f8ef7] hover:border-[#4f8ef7] transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-[#131726] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus size={24} />
              </div>
              <span className="text-sm font-bold">Upload New Video</span>
            </button>
          </div>
        )}

        {activeTab === 'pdfs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {lessons.filter(l => l.type === 'pdf').map(pdf => (
              <Card key={pdf.id} className="p-4 group hover:border-[#4f8ef7] transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit({...pdf, contentType: 'PDF'})} className="p-1.5 text-[#6b7599] hover:text-white"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete({...pdf, contentType: 'PDF'})} className="p-1.5 text-[#6b7599] hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
                <h4 className="font-bold text-[#e8ecf5] text-sm truncate mb-1">{pdf.title}</h4>
                <p className="text-[11px] text-[#6b7599] line-clamp-2 mb-4 h-8">{pdf.description}</p>
                <div className="flex items-center justify-between pt-4 border-t border-[#242b40]">
                  <div className="text-[10px] font-bold text-[#6b7599] uppercase">
                    {courses.find(c => c.id === pdf.courseId)?.title.slice(0, 15)}...
                  </div>
                  <a 
                    href={pdf.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 bg-[#1a2035] text-[#4f8ef7] rounded-lg hover:bg-[#4f8ef7] hover:text-white transition-all"
                  >
                    <Download size={14} />
                  </a>
                </div>
              </Card>
            ))}
            <button 
              onClick={() => {
                setEditingItem(null);
                setModalType('pdf');
                setShowModal(true);
              }}
              className="p-6 rounded-2xl border-2 border-dashed border-[#242b40] flex flex-col items-center justify-center gap-3 text-[#6b7599] hover:text-[#4f8ef7] hover:border-[#4f8ef7] transition-all group min-h-[160px]"
            >
              <Plus size={24} />
              <span className="text-sm font-bold">Upload PDF</span>
            </button>
          </div>
        )}

        {activeTab === 'quizzes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map(quiz => (
              <Card key={quiz.id} className="p-6 hover:border-[#f7924f] transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -mr-12 -mt-12" />
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#f7924f] flex items-center justify-center">
                    <HelpCircle size={24} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit({...quiz, contentType: 'Quiz'})} className="p-2 bg-[#1a2035] text-[#6b7599] hover:text-white rounded-xl transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete({...quiz, contentType: 'Quiz'})} className="p-2 bg-[#1a2035] text-[#6b7599] hover:text-red-500 rounded-xl transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
                <h4 className="text-lg font-bold text-[#e8ecf5] mb-2">{quiz.title}</h4>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Duration</div>
                    <div className="text-xs font-bold text-[#e8ecf5] flex items-center gap-1.5"><Clock size={12} /> {quiz.duration} Min</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Passing</div>
                    <div className="text-xs font-bold text-[#e8ecf5] flex items-center gap-1.5"><CheckCircle2 size={12} /> {quiz.passingMarks}%</div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-[#242b40]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#6b7599] uppercase">{quiz.type}</span>
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      quiz.status === 'Active' ? "bg-emerald-500" : "bg-yellow-500"
                    )} />
                  </div>
                  <button className="text-[11px] font-bold text-[#4f8ef7] hover:underline">View Questions</button>
                </div>
              </Card>
            ))}
            <button 
              onClick={() => {
                setEditingItem(null);
                setModalType('quiz');
                setShowModal(true);
              }}
              className="rounded-2xl border-2 border-dashed border-[#242b40] flex flex-col items-center justify-center gap-3 text-[#6b7599] hover:text-[#f7924f] hover:border-[#f7924f] transition-all group min-h-[220px]"
            >
              <Plus size={24} />
              <span className="text-sm font-bold">Create New Quiz</span>
            </button>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assignments.map(assignment => (
              <Card key={assignment.id} className="p-6 hover:border-green-500 transition-all">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center">
                      <FileUp size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-[#e8ecf5]">{assignment.title}</h4>
                      <div className="text-[11px] text-[#6b7599] font-bold uppercase tracking-wider">Due: {new Date(assignment.dueDate).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit({...assignment, contentType: 'Assignment'})} className="p-2 bg-[#1a2035] text-[#6b7599] hover:text-white rounded-xl transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete({...assignment, contentType: 'Assignment'})} className="p-2 bg-[#1a2035] text-[#6b7599] hover:text-red-500 rounded-xl transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
                <p className="text-sm text-[#6b7599] line-clamp-2 mb-6">{assignment.description}</p>
                <div className="flex items-center justify-between pt-4 border-t border-[#242b40]">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-sm font-bold text-[#e8ecf5]">{assignment.totalMarks}</div>
                      <div className="text-[9px] font-bold text-[#6b7599] uppercase">Marks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-[#4f8ef7]">24/30</div>
                      <div className="text-[9px] font-bold text-[#6b7599] uppercase">Submissions</div>
                    </div>
                  </div>
                  <button className="bg-[#1a2035] text-[#e8ecf5] px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#242b40] transition-colors">
                    View Submissions
                  </button>
                </div>
              </Card>
            ))}
            <button 
              onClick={() => {
                setEditingItem(null);
                setModalType('assignment');
                setShowModal(true);
              }}
              className="rounded-2xl border-2 border-dashed border-[#242b40] flex flex-col items-center justify-center gap-3 text-[#6b7599] hover:text-green-500 hover:border-green-500 transition-all group min-h-[200px]"
            >
              <Plus size={24} />
              <span className="text-sm font-bold">Create Assignment</span>
            </button>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-[#e8ecf5] flex items-center gap-2">
                  <Video size={18} className="text-blue-500" /> Video Performance
                </h4>
                <select className="bg-[#1a2035] border border-[#242b40] rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none">
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                </select>
              </div>
              <div className="space-y-4">
                {lessons.filter(l => l.type === 'video').slice(0, 5).map((v, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#1a2035] rounded-xl border border-[#242b40]">
                    <div className="flex items-center gap-3 truncate">
                      <div className="text-xs font-bold text-[#6b7599]">0{i+1}</div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-[#e8ecf5] truncate">{v.title}</div>
                        <div className="text-[10px] text-[#6b7599]">Avg. Watch: 12:45m</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-blue-500">{v.analytics?.views || Math.floor(Math.random() * 500)}</div>
                      <div className="text-[9px] text-[#6b7599] uppercase font-bold">Views</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-[#e8ecf5] flex items-center gap-2">
                  <HelpCircle size={18} className="text-orange-500" /> Quiz & Assignment Stats
                </h4>
                <button className="text-[10px] font-bold text-[#4f8ef7] hover:underline">Full Report</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#1a2035] rounded-2xl border border-[#242b40] flex flex-col items-center justify-center text-center">
                  <div className="text-2xl font-bold font-syne text-orange-500">84%</div>
                  <div className="text-[10px] font-bold text-[#6b7599] uppercase tracking-wider mt-1">Avg Quiz Score</div>
                </div>
                <div className="p-4 bg-[#1a2035] rounded-2xl border border-[#242b40] flex flex-col items-center justify-center text-center">
                  <div className="text-2xl font-bold font-syne text-green-500">92%</div>
                  <div className="text-[10px] font-bold text-[#6b7599] uppercase tracking-wider mt-1">Submission Rate</div>
                </div>
                <div className="p-4 bg-[#1a2035] rounded-2xl border border-[#242b40] flex flex-col items-center justify-center text-center">
                  <div className="text-2xl font-bold font-syne text-purple-500">1.2k</div>
                  <div className="text-[10px] font-bold text-[#6b7599] uppercase tracking-wider mt-1">PDF Downloads</div>
                </div>
                <div className="p-4 bg-[#1a2035] rounded-2xl border border-[#242b40] flex flex-col items-center justify-center text-center">
                  <div className="text-2xl font-bold font-syne text-blue-500">450h</div>
                  <div className="text-[10px] font-bold text-[#6b7599] uppercase tracking-wider mt-1">Total Watch Time</div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Unified Content Modal */}
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
              className="relative w-full max-w-3xl bg-[#131726] border border-[#242b40] rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    modalType === 'video' ? "bg-blue-500/10 text-blue-500" :
                    modalType === 'pdf' ? "bg-purple-500/10 text-purple-500" :
                    modalType === 'quiz' ? "bg-orange-500/10 text-orange-500" : "bg-green-500/10 text-green-500"
                  )}>
                    {modalType === 'video' ? <Video size={20} /> :
                     modalType === 'pdf' ? <FileText size={20} /> :
                     modalType === 'quiz' ? <HelpCircle size={20} /> : <FileUp size={20} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold font-syne">
                      {editingItem ? `Edit ${modalType.toUpperCase()}` : `Add New ${modalType.toUpperCase()}`}
                    </h3>
                    <p className="text-xs text-[#6b7599]">Fill in the details below to publish content</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-red-500/10 text-[#6b7599] hover:text-red-500 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Modal Type Selector (only for new items) */}
              {!editingItem && (
                <div className="flex gap-2 mb-8 p-1 bg-[#1a2035] rounded-xl border border-[#242b40]">
                  {(['video', 'pdf', 'quiz', 'assignment'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setModalType(type)}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                        modalType === type ? "bg-[#4f8ef7] text-white" : "text-[#6b7599] hover:text-[#e8ecf5]"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Common Fields */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Title</label>
                      <input 
                        required
                        type="text" 
                        className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                        placeholder="Enter title..."
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Course</label>
                      <select 
                        required
                        value={formData.courseId}
                        onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                        className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      >
                        <option value="">Select Course</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Module</label>
                      <select 
                        required
                        value={formData.moduleId}
                        onChange={(e) => setFormData({ ...formData, moduleId: e.target.value })}
                        className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      >
                        <option value="">Select Module</option>
                        {modules.filter(m => m.courseId === formData.courseId).map(m => (
                          <option key={m.id} value={m.id}>{m.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Description</label>
                      <textarea 
                        rows={3}
                        className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors resize-none"
                        placeholder="Describe the content..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Type Specific Fields */}
                  <div className="space-y-4">
                    {modalType === 'video' && (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Video Source</label>
                          <div className="flex gap-2">
                            <select 
                              value={formData.videoType}
                              onChange={(e) => setFormData({ ...formData, videoType: e.target.value })}
                              className="flex-1 bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7]"
                            >
                              <option value="youtube">YouTube Link</option>
                              <option value="direct">Direct Upload</option>
                            </select>
                            <input 
                              type="text" 
                              required
                              className="flex-[2] bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7]"
                              placeholder="URL or File ID"
                              value={formData.videoUrl}
                              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Duration</label>
                            <input 
                              type="text" 
                              className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7]" 
                              placeholder="e.g. 12:45" 
                              value={formData.duration}
                              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Drip (Days)</label>
                            <input 
                              type="number" 
                              className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7]" 
                              placeholder="0" 
                              value={formData.dripDays}
                              onChange={(e) => setFormData({ ...formData, dripDays: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Thumbnail URL</label>
                          <input 
                            type="text" 
                            className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7]" 
                            placeholder="https://..." 
                            value={formData.thumbnail}
                            onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                          />
                        </div>
                      </>
                    )}

                    {modalType === 'pdf' && (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">PDF File URL</label>
                          <input 
                            type="text" 
                            required
                            className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7]" 
                            placeholder="https://..." 
                            value={formData.fileUrl}
                            onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                          <Download size={16} className="text-blue-500" />
                          <span className="text-[11px] text-[#e8ecf5] font-bold">Allow students to download this file</span>
                          <input 
                            type="checkbox" 
                            className="ml-auto accent-blue-500" 
                            checked={formData.allowDownload}
                            onChange={(e) => setFormData({ ...formData, allowDownload: e.target.checked })}
                          />
                        </div>
                      </>
                    )}

                    {modalType === 'quiz' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Time Limit (Min)</label>
                            <input 
                              type="number" 
                              className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7]" 
                              placeholder="30" 
                              value={formData.quizDuration}
                              onChange={(e) => setFormData({ ...formData, quizDuration: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Passing %</label>
                            <input 
                              type="number" 
                              className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7]" 
                              placeholder="40" 
                              value={formData.passingMarks}
                              onChange={(e) => setFormData({ ...formData, passingMarks: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl">
                          <CheckCircle2 size={16} className="text-orange-500" />
                          <span className="text-[11px] text-[#e8ecf5] font-bold">Auto-generate result after submission</span>
                          <input 
                            type="checkbox" 
                            className="ml-auto accent-orange-500" 
                            checked={formData.autoResult}
                            onChange={(e) => setFormData({ ...formData, autoResult: e.target.checked })}
                          />
                        </div>
                      </>
                    )}

                    {modalType === 'assignment' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Due Date</label>
                            <input 
                              type="date" 
                              required
                              className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7]" 
                              value={formData.dueDate}
                              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Total Marks</label>
                            <input 
                              type="number" 
                              className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7]" 
                              placeholder="100" 
                              value={formData.totalMarks}
                              onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Reference File URL</label>
                          <input 
                            type="text" 
                            className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7]" 
                            placeholder="https://..." 
                            value={formData.fileUrl}
                            onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                          />
                        </div>
                      </>
                    )}

                    {/* Access Control & Status */}
                    <div className="pt-4 space-y-4 border-t border-[#242b40]">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Access Control</label>
                        <div className="flex flex-wrap gap-2">
                          <button 
                            type="button" 
                            onClick={() => setFormData({ ...formData, isPaidOnly: false })}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all",
                              !formData.isPaidOnly ? "bg-[#4f8ef7] text-white" : "bg-[#1a2035] text-[#6b7599] border border-[#242b40]"
                            )}
                          >
                            <Unlock size={12} /> Free Content
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setFormData({ ...formData, isPaidOnly: true })}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all",
                              formData.isPaidOnly ? "bg-[#4f8ef7] text-white" : "bg-[#1a2035] text-[#6b7599] border border-[#242b40]"
                            )}
                          >
                            <Lock size={12} /> Paid Only
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Publishing Status</label>
                        <div className="flex gap-2">
                          {(['Draft', 'Published', 'Scheduled'] as const).map(status => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setFormData({ ...formData, status })}
                              className={cn(
                                "flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all",
                                formData.status === status ? "bg-[#1a2035] border-[#4f8ef7] text-[#4f8ef7]" : "bg-[#1a2035] border-[#242b40] text-[#6b7599]"
                              )}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex gap-3 border-t border-[#242b40]">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <PlusCircle size={16} />
                    )}
                    {editingItem ? 'Update Content' : 'Publish Content'}
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
    </div>
  );
};

export default ContentManagement;
