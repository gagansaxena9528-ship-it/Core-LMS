import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Eye,
  X,
  Star,
  Users,
  Layers,
  BookOpen
} from 'lucide-react';
import { subscribeToCollection, createDoc, updateDocument, deleteDocument } from '../services/firestore';
import { adminCreateUser } from '../services/auth';
import { User, Teacher } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const Teachers: React.FC = () => {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [teacherDetails, setTeacherDetails] = useState<Record<string, Teacher>>({});
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    password: '',
    courses: ''
  });

  useEffect(() => {
    const unsubUsers = subscribeToCollection('users', (data) => {
      setTeachers(data.filter(u => u.role === 'teacher'));
    });
    const unsubDetails = subscribeToCollection('teachers', (data) => {
      const details: Record<string, Teacher> = {};
      data.forEach(t => details[t.uid] = t);
      setTeacherDetails(details);
    });

    return () => {
      unsubUsers();
      unsubDetails();
    };
  }, []);

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (teacher: User) => {
    setEditingTeacher(teacher);
    const details = teacherDetails[teacher.uid] || {};
    setFormData({
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone || '',
      bio: details.bio || '',
      password: '', // Don't show password for security
      courses: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (uid: string) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        await deleteDocument('users', uid);
        await deleteDocument('teachers', uid);
      } catch (err: any) {
        console.error(err);
        alert('Failed to delete teacher: ' + err.message);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (editingTeacher) {
        const { password, ...updateData } = formData;
        const { bio, ...userUpdateData } = updateData;
        
        await updateDocument('users', editingTeacher.uid, userUpdateData);
        await updateDocument('teachers', editingTeacher.uid, { bio });
      } else {
        // Create Account via custom backend
        await adminCreateUser(formData.email, formData.password, formData.name);
        
        // Update additional fields
        const users = await new Promise<User[]>((resolve) => {
          const unsub = subscribeToCollection('users', (data) => {
            unsub();
            resolve(data);
          });
        });
        
        const newUser = users.find(u => u.email === formData.email);
        if (newUser) {
          await updateDocument('users', newUser.uid, {
            phone: formData.phone,
            role: 'teacher'
          });
          await createDoc('teachers', {
            uid: newUser.uid,
            bio: formData.bio,
            rating: 4.5,
            coursesCount: 0,
            batchesCount: 0,
            studentsCount: 0
          }, newUser.uid);
        }
      }
      setShowModal(false);
      setEditingTeacher(null);
      setFormData({ name: '', email: '', phone: '', bio: '', password: '', courses: '' });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save teacher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-white">Teacher Management</h2>
          <p className="text-sm text-[#6b7599] mt-1">{teachers.length} active faculty members</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#7c5fe6] hover:bg-[#6a4ed1] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors w-fit"
        >
          <Plus size={18} /> Add Teacher
        </button>
      </div>

      <div className="flex items-center gap-2 bg-[#131726] border border-[#242b40] rounded-xl px-4 py-2 w-full max-w-md">
        <Search size={16} className="text-[#6b7599]" />
        <input 
          type="text" 
          placeholder="Search teachers..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm w-full placeholder-[#6b7599]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeachers.map((t) => {
          const details = teacherDetails[t.uid];
          return (
            <Card key={t.uid} className="p-0 group">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-[#7c5fe6] flex items-center justify-center font-bold text-xl">
                      {t.av}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-syne">{t.name}</h3>
                      <p className="text-xs text-[#6b7599]">{t.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-500/10 text-[#f7d04f] px-2 py-1 rounded-lg text-[11px] font-bold">
                    <Star size={12} fill="currentColor" /> {details?.rating || '4.5'}
                  </div>
                </div>

                <p className="text-[13px] text-[#6b7599] line-clamp-2 mb-6">
                  {details?.bio || 'Professional educator with expertise in modern teaching methodologies and subject matter mastery.'}
                </p>

                <div className="grid grid-cols-3 gap-2 py-4 border-t border-[#242b40]">
                  <div className="text-center">
                    <div className="text-[14px] font-bold text-white">{details?.coursesCount || 0}</div>
                    <div className="text-[10px] text-[#6b7599] uppercase font-bold tracking-wider">Courses</div>
                  </div>
                  <div className="text-center border-x border-[#242b40]">
                    <div className="text-[14px] font-bold text-white">{details?.batchesCount || 0}</div>
                    <div className="text-[10px] text-[#6b7599] uppercase font-bold tracking-wider">Batches</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[14px] font-bold text-white">{details?.studentsCount || 0}</div>
                    <div className="text-[10px] text-[#6b7599] uppercase font-bold tracking-wider">Students</div>
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  <button 
                    onClick={() => handleEdit(t)}
                    className="flex-1 py-2 bg-[#1a2035] border border-[#242b40] rounded-xl text-[12px] font-bold text-[#e8ecf5] hover:bg-[#242b40] transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye size={14} /> Profile
                  </button>
                  <button 
                    onClick={() => handleEdit(t)}
                    className="flex-1 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[12px] font-bold text-[#4f8ef7] hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(t.uid)}
                    className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500/20 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
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
                  {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-red-500/10 text-[#6b7599] hover:text-red-500 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl">
                  {error}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Full Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#7c5fe6] transition-colors"
                      placeholder="e.g. Dr. Kavita Joshi"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Email Address</label>
                    <input 
                      required
                      type="email" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#7c5fe6] transition-colors"
                      placeholder="teacher@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Short Bio</label>
                  <textarea 
                    className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#7c5fe6] transition-colors min-h-[100px]"
                    placeholder="Professional background and expertise..."
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Mobile Number</label>
                    <input 
                      type="tel" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#7c5fe6] transition-colors"
                      placeholder="10-digit mobile"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Password</label>
                    <input 
                      required={!editingTeacher}
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#7c5fe6] transition-colors"
                      placeholder={editingTeacher ? "Leave blank to keep current" : "Account password"}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-[#7c5fe6] hover:bg-[#6a4ed1] text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      editingTeacher ? 'Update Teacher' : 'Create Teacher Account'
                    )}
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

export default Teachers;
