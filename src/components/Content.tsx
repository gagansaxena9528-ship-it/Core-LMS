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
  Eye
} from 'lucide-react';
import { subscribeToCollection, addDoc, updateDoc, deleteDoc } from '../services/firestore';
import { sendEmail, getNewRecordTemplate } from '../services/emailService';
import { Lesson, Course, Student } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

const Content: React.FC = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    courseId: '',
    moduleId: 'default', // Fallback for now
    type: 'video' as const,
    description: '',
    thumbnail: '',
    videoUrl: '',
    videoType: 'youtube' as const,
    content: '',
    duration: '',
    isFree: false,
    dripDays: 0,
    keyPoints: [] as string[]
  });

  useEffect(() => {
    const unsubLessons = subscribeToCollection('lessons', setLessons);
    const unsubCourses = subscribeToCollection('courses', setCourses);
    const unsubStudents = subscribeToCollection('users', (data) => {
      setStudents(data.filter(u => u.role === 'student') as Student[]);
    });

    return () => {
      unsubLessons();
      unsubCourses();
      unsubStudents();
    };
  }, []);

  useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses]);

  const filteredLessons = lessons.filter(l => 
    l.courseId === selectedCourseId && 
    l.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      courseId: lesson.courseId,
      moduleId: lesson.moduleId || 'default',
      type: lesson.type,
      description: lesson.description || '',
      thumbnail: lesson.thumbnail || '',
      videoUrl: lesson.videoUrl || '',
      videoType: lesson.videoType || 'youtube',
      content: lesson.content || '',
      duration: lesson.duration || '',
      isFree: lesson.isFree || false,
      dripDays: lesson.dripDays || 0,
      keyPoints: (lesson as any).keyPoints || []
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this lesson?')) {
      try {
        await deleteDoc('lessons', id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingLesson) {
        await updateDoc('lessons', editingLesson.id, formData);
      } else {
        const docRef = await addDoc('lessons', { ...formData, courseId: selectedCourseId });
        
        // Notify students about new lesson
        const course = courses.find(c => c.id === selectedCourseId);
        if (course) {
          for (const student of students) {
            const details = `A new lesson "${formData.title}" has been added to your course "${course.title}". You can now access the new content in your dashboard.`;
            const html = getNewRecordTemplate('Course Content', student.name, details);
            await sendEmail(student.email, `New Content Added: ${course.title}`, html);
          }
        }
      }
      setShowModal(false);
      setEditingLesson(null);
      setFormData({
        title: '',
        courseId: '',
        moduleId: 'default',
        type: 'video',
        description: '',
        thumbnail: '',
        videoUrl: '',
        videoType: 'youtube',
        content: '',
        duration: '',
        isFree: false,
        dripDays: 0,
        keyPoints: []
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addKeyPoint = () => {
    setFormData({ ...formData, keyPoints: [...formData.keyPoints, ''] });
  };

  const updateKeyPoint = (index: number, value: string) => {
    const updated = [...formData.keyPoints];
    updated[index] = value;
    setFormData({ ...formData, keyPoints: updated });
  };

  const removeKeyPoint = (index: number) => {
    const updated = [...formData.keyPoints];
    updated.splice(index, 1);
    setFormData({ ...formData, keyPoints: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-foreground">Course Content</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage video lessons and study materials</p>
        </div>
        <button 
          onClick={() => {
            setEditingLesson(null);
            setFormData({
              title: '',
              courseId: selectedCourseId,
              moduleId: 'default',
              type: 'video',
              description: '',
              thumbnail: '',
              videoUrl: '',
              videoType: 'youtube',
              content: '',
              duration: '',
              isFree: false,
              dripDays: 0,
              keyPoints: []
            });
            setShowModal(true);
          }}
          className="bg-secondary hover:bg-secondary/90 text-foreground px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors w-fit"
        >
          <Plus size={18} /> Add Lesson
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Course Sidebar */}
        <div className="w-full lg:w-[280px] space-y-2">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-3">Select Course</h3>
          {courses.map(course => (
            <button
              key={course.id}
              onClick={() => setSelectedCourseId(course.id)}
              className={cn(
                "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group",
                selectedCourseId === course.id ? "bg-secondary text-foreground shadow-lg shadow-secondary/20" : "hover:bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{course.emoji}</span>
                <span className="text-sm font-bold truncate max-w-[160px]">{course.title}</span>
              </div>
              <ChevronRight size={16} className={cn("transition-transform", selectedCourseId === course.id ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0")} />
            </button>
          ))}
        </div>

        {/* Lessons List */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2 mb-6">
            <Search size={18} className="text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search lessons in this course..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full placeholder-muted-foreground"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLessons.map((lesson, index) => (
              <Card key={lesson.id} className="p-0 overflow-hidden group">
                <div className="aspect-video bg-muted/10 relative">
                  {lesson.thumbnail ? (
                    <img src={lesson.thumbnail} alt={lesson.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-border">
                      <Video size={48} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button 
                      onClick={() => handleEdit(lesson)}
                      className="w-10 h-10 rounded-full bg-foreground/10 hover:bg-foreground/20 text-foreground flex items-center justify-center backdrop-blur-sm transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(lesson.id)}
                      className="w-10 h-10 rounded-full bg-destructive/20 hover:bg-destructive/40 text-destructive flex items-center justify-center backdrop-blur-sm transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-background/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-foreground uppercase">
                    Lesson {index + 1}
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-foreground truncate">{lesson.title}</h4>
                  <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2 h-8">
                    {lesson.description}
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Video size={12} /> {lesson.type}</span>
                      <span className="flex items-center gap-1"><FileText size={12} /> {(lesson as any).keyPoints?.length || 0} Points</span>
                    </div>
                    <button className="text-secondary hover:text-secondary/90 text-[11px] font-bold flex items-center gap-1">
                      <Eye size={12} /> Preview
                    </button>
                  </div>
                </div>
              </Card>
            ))}

            {filteredLessons.length === 0 && (
              <div className="col-span-full text-center py-20 bg-card border border-border border-dashed rounded-2xl">
                <Layers size={48} className="mx-auto text-border mb-4" />
                <p className="text-muted-foreground">No lessons found for this course</p>
                <button 
                  onClick={() => setShowModal(true)}
                  className="mt-4 text-secondary font-bold text-sm hover:underline"
                >
                  Add your first lesson
                </button>
              </div>
            )}
          </div>
        </div>
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
              className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold font-syne text-foreground">
                  {editingLesson ? 'Edit Lesson' : 'Add New Lesson'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Lesson Title</label>
                      <input 
                        required
                        type="text" 
                        className="w-full bg-muted/10 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors"
                        placeholder="e.g. Introduction to React"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
                      <textarea 
                        required
                        rows={3}
                        className="w-full bg-muted/10 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors resize-none"
                        placeholder="Brief overview of the lesson..."
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Thumbnail URL</label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <ImageIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input 
                            type="text" 
                            className="w-full bg-muted/10 border border-border rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors"
                            placeholder="https://..."
                            value={formData.thumbnail}
                            onChange={(e) => setFormData({...formData, thumbnail: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Content Type</label>
                      <div className="flex gap-2">
                        <select 
                          className="bg-muted/10 border border-border rounded-xl px-3 py-2.5 text-xs outline-none focus:border-secondary"
                          value={formData.type}
                          onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                        >
                          <option value="video">Video</option>
                          <option value="pdf">PDF</option>
                          <option value="text">Text</option>
                          <option value="file">File</option>
                        </select>
                        {formData.type === 'video' && (
                          <select 
                            className="bg-muted/10 border border-border rounded-xl px-3 py-2.5 text-xs outline-none focus:border-secondary"
                            value={formData.videoType}
                            onChange={(e) => setFormData({...formData, videoType: e.target.value as any})}
                          >
                            <option value="youtube">YouTube</option>
                            <option value="direct">Direct</option>
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        {formData.type === 'video' ? 'Video URL' : formData.type === 'pdf' ? 'PDF URL' : formData.type === 'file' ? 'File URL' : 'Content'}
                      </label>
                      <div className="relative">
                        {formData.type === 'text' ? (
                          <textarea 
                            rows={4}
                            className="w-full bg-muted/10 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors resize-none"
                            placeholder="Enter lesson content..."
                            value={formData.content}
                            onChange={(e) => setFormData({...formData, content: e.target.value})}
                          />
                        ) : (
                          <>
                            <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input 
                              required
                              type="text" 
                              className="w-full bg-muted/10 border border-border rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors"
                              placeholder="URL"
                              value={formData.type === 'video' ? formData.videoUrl : formData.content}
                              onChange={(e) => {
                                if (formData.type === 'video') {
                                  setFormData({...formData, videoUrl: e.target.value});
                                } else {
                                  setFormData({...formData, content: e.target.value});
                                }
                              }}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Key Learning Points</label>
                        <button 
                          type="button"
                          onClick={addKeyPoint}
                          className="text-secondary hover:text-secondary/90 text-[10px] font-bold flex items-center gap-1"
                        >
                          <PlusCircle size={14} /> Add Point
                        </button>
                      </div>
                      <div className="space-y-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                        {formData.keyPoints.map((point, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input 
                              type="text" 
                              className="flex-1 bg-muted/10 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-secondary"
                              placeholder={`Point ${idx + 1}`}
                              value={point}
                              onChange={(e) => updateKeyPoint(idx, e.target.value)}
                            />
                            <button 
                              type="button"
                              onClick={() => removeKeyPoint(idx)}
                              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        {formData.keyPoints.length === 0 && (
                          <p className="text-[11px] text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">No points added</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex gap-3 border-t border-border">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-secondary hover:bg-secondary/90 text-foreground py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingLesson ? 'Update Lesson' : 'Add Lesson'}
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
    </div>
  );
};

export default Content;
