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
import { Module, Course } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

const Content: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    courseId: '',
    description: '',
    thumbnail: '',
    videoUrl: '',
    videoType: 'youtube' as const,
    keyPoints: [] as string[]
  });

  useEffect(() => {
    const unsubModules = subscribeToCollection('modules', setModules);
    const unsubCourses = subscribeToCollection('courses', setCourses);

    return () => {
      unsubModules();
      unsubCourses();
    };
  }, []);

  useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses]);

  const filteredModules = modules.filter(m => 
    m.courseId === selectedCourseId && 
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (module: Module) => {
    setEditingModule(module);
    setFormData({
      title: module.title,
      courseId: module.courseId,
      description: module.description,
      thumbnail: module.thumbnail,
      videoUrl: module.videoUrl,
      videoType: module.videoType,
      keyPoints: module.keyPoints || []
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this module?')) {
      try {
        await deleteDoc('modules', id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingModule) {
        await updateDoc('modules', editingModule.id, formData);
      } else {
        await addDoc('modules', { ...formData, courseId: selectedCourseId });
      }
      setShowModal(false);
      setEditingModule(null);
      setFormData({
        title: '',
        courseId: '',
        description: '',
        thumbnail: '',
        videoUrl: '',
        videoType: 'youtube',
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
          <h2 className="text-2xl font-extrabold font-syne text-white">Course Content</h2>
          <p className="text-sm text-[#6b7599] mt-1">Manage video lessons and study materials</p>
        </div>
        <button 
          onClick={() => {
            setEditingModule(null);
            setFormData({
              title: '',
              courseId: selectedCourseId,
              description: '',
              thumbnail: '',
              videoUrl: '',
              videoType: 'youtube',
              keyPoints: []
            });
            setShowModal(true);
          }}
          className="bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors w-fit"
        >
          <Plus size={18} /> Add Module
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Course Sidebar */}
        <div className="w-full lg:w-[280px] space-y-2">
          <h3 className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider px-2 mb-3">Select Course</h3>
          {courses.map(course => (
            <button
              key={course.id}
              onClick={() => setSelectedCourseId(course.id)}
              className={cn(
                "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group",
                selectedCourseId === course.id ? "bg-[#4f8ef7] text-white shadow-lg shadow-blue-500/20" : "hover:bg-[#131726] text-[#6b7599] hover:text-[#e8ecf5]"
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

        {/* Modules List */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3 bg-[#131726] border border-[#242b40] rounded-xl px-4 py-2 mb-6">
            <Search size={18} className="text-[#6b7599]" />
            <input 
              type="text" 
              placeholder="Search modules in this course..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full placeholder-[#6b7599]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredModules.map((module, index) => (
              <Card key={module.id} className="p-0 overflow-hidden group">
                <div className="aspect-video bg-[#1a2035] relative">
                  {module.thumbnail ? (
                    <img src={module.thumbnail} alt={module.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#242b40]">
                      <Video size={48} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button 
                      onClick={() => handleEdit(module)}
                      className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(module.id)}
                      className="w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-500 flex items-center justify-center backdrop-blur-sm transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white uppercase">
                    Lesson {index + 1}
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-[#e8ecf5] truncate">{module.title}</h4>
                  <p className="text-[12px] text-[#6b7599] mt-1 line-clamp-2 h-8">
                    {module.description}
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#242b40]">
                    <div className="flex items-center gap-3 text-[11px] text-[#6b7599]">
                      <span className="flex items-center gap-1"><Video size={12} /> Video</span>
                      <span className="flex items-center gap-1"><FileText size={12} /> {module.keyPoints?.length || 0} Points</span>
                    </div>
                    <button className="text-[#4f8ef7] hover:text-[#3a7ae8] text-[11px] font-bold flex items-center gap-1">
                      <Eye size={12} /> Preview
                    </button>
                  </div>
                </div>
              </Card>
            ))}

            {filteredModules.length === 0 && (
              <div className="col-span-full text-center py-20 bg-[#131726] border border-[#242b40] border-dashed rounded-2xl">
                <Layers size={48} className="mx-auto text-[#242b40] mb-4" />
                <p className="text-[#6b7599]">No modules found for this course</p>
                <button 
                  onClick={() => setShowModal(true)}
                  className="mt-4 text-[#4f8ef7] font-bold text-sm hover:underline"
                >
                  Add your first module
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
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#131726] border border-[#242b40] rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold font-syne">
                  {editingModule ? 'Edit Module' : 'Add New Module'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-red-500/10 text-[#6b7599] hover:text-red-500 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Module Title</label>
                      <input 
                        required
                        type="text" 
                        className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                        placeholder="e.g. Introduction to React"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Description</label>
                      <textarea 
                        required
                        rows={3}
                        className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors resize-none"
                        placeholder="Brief overview of the lesson..."
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Thumbnail URL</label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <ImageIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7599]" />
                          <input 
                            type="text" 
                            className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
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
                      <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Video Source</label>
                      <div className="flex gap-2">
                        <select 
                          className="bg-[#1a2035] border border-[#242b40] rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#4f8ef7]"
                          value={formData.videoType}
                          onChange={(e) => setFormData({...formData, videoType: e.target.value as any})}
                        >
                          <option value="youtube">YouTube</option>
                          <option value="vimeo">Vimeo</option>
                          <option value="upload">Upload</option>
                        </select>
                        <div className="flex-1 relative">
                          <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7599]" />
                          <input 
                            required
                            type="text" 
                            className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                            placeholder="Video URL or ID"
                            value={formData.videoUrl}
                            onChange={(e) => setFormData({...formData, videoUrl: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Key Learning Points</label>
                        <button 
                          type="button"
                          onClick={addKeyPoint}
                          className="text-[#4f8ef7] hover:text-[#3a7ae8] text-[10px] font-bold flex items-center gap-1"
                        >
                          <PlusCircle size={14} /> Add Point
                        </button>
                      </div>
                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                        {formData.keyPoints.map((point, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input 
                              type="text" 
                              className="flex-1 bg-[#1a2035] border border-[#242b40] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#4f8ef7]"
                              placeholder={`Point ${idx + 1}`}
                              value={point}
                              onChange={(e) => updateKeyPoint(idx, e.target.value)}
                            />
                            <button 
                              type="button"
                              onClick={() => removeKeyPoint(idx)}
                              className="p-2 text-[#6b7599] hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        {formData.keyPoints.length === 0 && (
                          <p className="text-[11px] text-[#6b7599] text-center py-4 border border-dashed border-[#242b40] rounded-lg">No points added</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex gap-3 border-t border-[#242b40]">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingModule ? 'Update Module' : 'Add Module'}
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

export default Content;
