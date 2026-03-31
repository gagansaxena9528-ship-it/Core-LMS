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
  BookOpen,
  Mail,
  Phone,
  Calendar,
  Award,
  Briefcase,
  GraduationCap,
  Key,
  CheckCircle,
  Clock,
  BarChart3,
  DollarSign,
  FileText,
  Bell
} from 'lucide-react';
import { subscribeToCollection, createDoc, updateDocument, deleteDocument } from '../services/firestore';
import { sendEmail, getTeacherWelcomeEmailTemplate, getUpdateNotificationTemplate } from '../services/emailService';
import { adminCreateUser } from '../services/auth';
import { User, Teacher } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const Teachers: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    qualification: '',
    experience: '',
    skills: '',
    profilePhoto: '',
    salary: '',
    bio: ''
  });

  useEffect(() => {
    const unsub = subscribeToCollection('users', (data) => {
      setTeachers(data.filter(u => u.role === 'teacher') as Teacher[]);
    });

    return () => unsub();
  }, []);

  const filteredTeachers = teachers.filter(t => 
    (t.firstName?.toLowerCase() || '').includes(search.toLowerCase()) || 
    (t.lastName?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (t.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      firstName: teacher.firstName || teacher.name.split(' ')[0] || '',
      lastName: teacher.lastName || teacher.name.split(' ').slice(1).join(' ') || '',
      email: teacher.email,
      phone: teacher.phone || '',
      password: '',
      qualification: teacher.qualification || '',
      experience: teacher.experience || '',
      skills: Array.isArray(teacher.skills) ? teacher.skills.join(', ') : (teacher.skills || ''),
      profilePhoto: teacher.profilePhoto || '',
      salary: teacher.salary?.toString() || '',
      bio: teacher.bio || ''
    });
    setShowModal(true);
  };

  const handleViewProfile = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowProfileModal(true);
  };

  const handleResetPassword = async (teacher: Teacher) => {
    const newPassword = Math.random().toString(36).slice(-8);
    if (window.confirm(`Reset password for ${teacher.name}? A new password will be generated and emailed to them.`)) {
      try {
        await updateDocument('users', teacher.uid, { password: newPassword });
        const html = getUpdateNotificationTemplate(teacher.name, 'Account Security', 'updated', `Your password has been reset by the administrator. Your new temporary password is: <strong>${newPassword}</strong>. Please change it after logging in.`);
        await sendEmail(teacher.email, 'Password Reset Notification - Core LMS', html);
        alert('Password reset successfully and email sent.');
      } catch (err: any) {
        alert('Failed to reset password: ' + err.message);
      }
    }
  };

  const handleDelete = async (uid: string) => {
    if (window.confirm('Are you sure you want to delete this teacher? All associated data will be removed.')) {
      try {
        await deleteDocument('users', uid);
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
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(s => s !== '');
      
      const teacherData = {
        name: fullName,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        qualification: formData.qualification,
        experience: formData.experience,
        skills: skillsArray,
        profilePhoto: formData.profilePhoto,
        salary: parseFloat(formData.salary) || 0,
        bio: formData.bio,
        role: 'teacher',
        status: 'Active',
        joined: new Date().toISOString().split('T')[0],
        av: formData.firstName.charAt(0) + formData.lastName.charAt(0),
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
      };

      if (editingTeacher) {
        const { password, ...updateData } = formData;
        await updateDocument('users', editingTeacher.uid, {
          ...teacherData,
          ...(password ? { password } : {})
        });

        const details = `Your teacher profile has been updated by the administrator.`;
        const html = getUpdateNotificationTemplate(fullName, 'Teacher Profile', 'updated', details);
        await sendEmail(formData.email, 'Account Update Notification - Core LMS', html);
      } else {
        const password = formData.password || Math.random().toString(36).slice(-8);
        const userCredential = await adminCreateUser(formData.email, password, fullName);
        
        if (userCredential?.uid) {
          await updateDocument('users', userCredential.uid, {
            ...teacherData,
            rating: 4.5,
            coursesCount: 0,
            batchesCount: 0,
            studentsCount: 0,
            classesTaken: 0,
            attendanceRate: 100
          });

          const html = getTeacherWelcomeEmailTemplate(fullName, formData.email, password, formData.qualification, formData.phone);
          await sendEmail(formData.email, 'Welcome to Core LMS - Teacher Portal', html);
        }
      }
      setShowModal(false);
      setEditingTeacher(null);
      setFormData({ 
        firstName: '', 
        lastName: '', 
        email: '', 
        phone: '', 
        password: '', 
        qualification: '', 
        experience: '', 
        skills: '', 
        profilePhoto: '', 
        salary: '', 
        bio: '' 
      });
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
          <h2 className="text-2xl font-extrabold font-syne text-foreground">Teacher Management</h2>
          <p className="text-sm text-muted mt-1">{teachers.length} active faculty members</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-secondary hover:bg-secondary/90 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors w-fit"
        >
          <Plus size={18} /> Add Teacher
        </button>
      </div>

      <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2 w-full max-w-md">
        <Search size={16} className="text-muted" />
        <input 
          type="text" 
          placeholder="Search teachers..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm w-full placeholder-muted text-foreground"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeachers.map((t) => {
          return (
            <Card key={t.uid} className="p-0 group overflow-hidden border-border bg-card">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {t.profilePhoto ? (
                      <img 
                        src={t.profilePhoto} 
                        alt={t.name} 
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-secondary/20"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center font-bold text-xl border-2 border-secondary/20">
                        {t.av}
                      </div>
                    )}
                    <div>
                      <h3 className="text-base font-bold text-foreground font-syne group-hover:text-secondary transition-colors">{t.name}</h3>
                      <p className="text-xs text-muted flex items-center gap-1">
                        <Mail size={10} /> {t.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-warning/10 text-warning px-2 py-1 rounded-lg text-[11px] font-bold">
                    <Star size={12} fill="currentColor" /> {t.rating || '4.5'}
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-[12px] text-muted">
                    <GraduationCap size={14} className="text-secondary" />
                    <span className="truncate">{t.qualification || 'Qualification not set'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-muted">
                    <Briefcase size={14} className="text-secondary" />
                    <span>{t.experience || 'Experience not set'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 py-4 border-y border-border">
                  <div className="text-center">
                    <div className="text-[14px] font-bold text-foreground">{t.coursesCount || 0}</div>
                    <div className="text-[10px] text-muted uppercase font-bold tracking-wider">Courses</div>
                  </div>
                  <div className="text-center border-x border-border">
                    <div className="text-[14px] font-bold text-foreground">{t.batchesCount || 0}</div>
                    <div className="text-[10px] text-muted uppercase font-bold tracking-wider">Batches</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[14px] font-bold text-foreground">{t.studentsCount || 0}</div>
                    <div className="text-[10px] text-muted uppercase font-bold tracking-wider">Students</div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <button 
                    onClick={() => handleViewProfile(t)}
                    className="flex-1 min-w-[80px] py-2 bg-muted/5 border border-border rounded-xl text-[12px] font-bold text-foreground hover:bg-muted/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye size={14} /> View
                  </button>
                  <button 
                    onClick={() => handleEdit(t)}
                    className="flex-1 min-w-[80px] py-2 bg-accent/10 border border-accent/20 rounded-xl text-[12px] font-bold text-accent hover:bg-accent/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button 
                    onClick={() => handleResetPassword(t)}
                    className="p-2 bg-warning/10 border border-warning/20 rounded-xl text-warning hover:bg-warning/20 transition-colors"
                    title="Reset Password"
                  >
                    <Key size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(t.uid)}
                    className="p-2 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive hover:bg-destructive/20 transition-colors"
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-background/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[700px] bg-card border border-border rounded-2xl shadow-2xl p-8 my-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold font-syne text-foreground">
                  {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-destructive/10 text-muted hover:text-destructive rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl">
                  {error}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">First Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-muted/5 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors text-foreground"
                      placeholder="e.g. Kavita"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Last Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-muted/5 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors text-foreground"
                      placeholder="e.g. Joshi"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Email Address</label>
                    <input 
                      required
                      type="email" 
                      className="w-full bg-muted/5 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors text-foreground"
                      placeholder="teacher@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Mobile Number</label>
                    <input 
                      type="tel" 
                      className="w-full bg-muted/5 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors text-foreground"
                      placeholder="10-digit mobile"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Qualification</label>
                    <input 
                      type="text" 
                      className="w-full bg-muted/5 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors text-foreground"
                      placeholder="e.g. M.Tech, PhD"
                      value={formData.qualification}
                      onChange={(e) => setFormData({...formData, qualification: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Experience</label>
                    <input 
                      type="text" 
                      className="w-full bg-muted/5 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors text-foreground"
                      placeholder="e.g. 5+ Years"
                      value={formData.experience}
                      onChange={(e) => setFormData({...formData, experience: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Skills (Comma separated)</label>
                  <input 
                    type="text" 
                    className="w-full bg-muted/5 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors text-foreground"
                    placeholder="e.g. React, Node.js, Python"
                    value={formData.skills}
                    onChange={(e) => setFormData({...formData, skills: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Profile Photo URL</label>
                    <input 
                      type="url" 
                      className="w-full bg-muted/5 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors text-foreground"
                      placeholder="https://picsum.photos/200"
                      value={formData.profilePhoto}
                      onChange={(e) => setFormData({...formData, profilePhoto: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Monthly Salary (₹)</label>
                    <input 
                      type="number" 
                      className="w-full bg-muted/5 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors text-foreground"
                      placeholder="e.g. 45000"
                      value={formData.salary}
                      onChange={(e) => setFormData({...formData, salary: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Password</label>
                  <div className="flex gap-2">
                    <input 
                      required={!editingTeacher}
                      type="text" 
                      className="flex-1 bg-muted/5 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors text-foreground"
                      placeholder={editingTeacher ? "Leave blank to keep current" : "Account password"}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                    {!editingTeacher && (
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, password: Math.random().toString(36).slice(-8)})}
                        className="px-4 bg-secondary/10 text-secondary border border-secondary/20 rounded-xl text-xs font-bold hover:bg-secondary/20 transition-colors"
                      >
                        Auto
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Short Bio</label>
                  <textarea 
                    className="w-full bg-muted/5 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors min-h-[100px] text-foreground"
                    placeholder="Professional background and expertise..."
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-secondary hover:bg-secondary/90 text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      editingTeacher ? 'Update Teacher' : 'Create Teacher Account'
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 bg-muted/5 border border-border text-foreground rounded-xl font-bold text-sm hover:bg-muted/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile View Modal */}
      <AnimatePresence>
        {showProfileModal && selectedTeacher && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="fixed inset-0 bg-background/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[800px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden my-8"
            >
              {/* Header/Banner */}
              <div className="h-32 bg-gradient-to-r from-secondary to-accent relative">
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="absolute top-4 right-4 p-2 bg-background/20 hover:bg-background/40 text-foreground rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-8 pb-8">
                <div className="relative -mt-16 mb-6 flex flex-col md:flex-row md:items-end gap-6">
                  {selectedTeacher.profilePhoto ? (
                    <img 
                      src={selectedTeacher.profilePhoto} 
                      alt={selectedTeacher.name} 
                      className="w-32 h-32 rounded-3xl object-cover border-4 border-card shadow-xl"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-3xl bg-secondary text-white flex items-center justify-center font-bold text-4xl border-4 border-card shadow-xl">
                      {selectedTeacher.av}
                    </div>
                  )}
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-2xl font-extrabold font-syne text-foreground">{selectedTeacher.name}</h3>
                      <span className="px-2 py-0.5 bg-success/10 text-success text-[10px] font-bold rounded-full uppercase tracking-wider">
                        {selectedTeacher.status || 'Active'}
                      </span>
                    </div>
                    <p className="text-muted flex items-center gap-2 text-sm">
                      <Mail size={14} /> {selectedTeacher.email}
                    </p>
                  </div>
                  <div className="flex gap-2 pb-2">
                    <button 
                      onClick={() => {
                        setShowProfileModal(false);
                        handleEdit(selectedTeacher);
                      }}
                      className="px-4 py-2 bg-secondary text-white rounded-xl text-sm font-bold hover:bg-secondary/90 transition-colors"
                    >
                      Edit Profile
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column - Stats & Info */}
                  <div className="md:col-span-1 space-y-6">
                    <div className="bg-muted/5 rounded-2xl p-5 border border-border">
                      <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-4">Quick Stats</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-foreground text-sm">
                            <Star size={14} className="text-warning" /> Rating
                          </div>
                          <span className="font-bold text-foreground">{selectedTeacher.rating || '4.5'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-foreground text-sm">
                            <CheckCircle size={14} className="text-success" /> Attendance
                          </div>
                          <span className="font-bold text-foreground">{selectedTeacher.attendanceRate || '100'}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-foreground text-sm">
                            <Clock size={14} className="text-accent" /> Classes
                          </div>
                          <span className="font-bold text-foreground">{selectedTeacher.classesTaken || '0'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/5 rounded-2xl p-5 border border-border">
                      <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-4">Contact Info</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm text-muted">
                          <Phone size={14} className="text-secondary" />
                          <span>{selectedTeacher.phone || 'Not provided'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted">
                          <Calendar size={14} className="text-secondary" />
                          <span>Joined {selectedTeacher.joined || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted">
                          <DollarSign size={14} className="text-secondary" />
                          <span>₹{selectedTeacher.salary?.toLocaleString() || '0'} / month</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Details */}
                  <div className="md:col-span-2 space-y-6">
                    <div className="bg-muted/5 rounded-2xl p-6 border border-border">
                      <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-4">Professional Profile</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold text-muted uppercase">Qualification</label>
                          <p className="text-foreground text-sm font-medium">{selectedTeacher.qualification || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted uppercase">Experience</label>
                          <p className="text-foreground text-sm font-medium">{selectedTeacher.experience || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted uppercase">Skills</label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {Array.isArray(selectedTeacher.skills) && selectedTeacher.skills.length > 0 ? (
                              selectedTeacher.skills.map((skill, i) => (
                                <span key={i} className="px-3 py-1 bg-secondary/10 text-secondary text-[11px] font-bold rounded-lg border border-secondary/20">
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted text-xs italic">No skills listed</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted uppercase">Bio</label>
                          <p className="text-muted text-sm leading-relaxed mt-1">
                            {selectedTeacher.bio || 'No bio provided.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/5 rounded-2xl p-5 border border-border flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                          <BookOpen size={20} />
                        </div>
                        <div>
                          <div className="text-xl font-bold text-foreground">{selectedTeacher.coursesCount || 0}</div>
                          <div className="text-[10px] text-muted uppercase font-bold">Courses</div>
                        </div>
                      </div>
                      <div className="bg-muted/5 rounded-2xl p-5 border border-border flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                          <Layers size={20} />
                        </div>
                        <div>
                          <div className="text-xl font-bold text-foreground">{selectedTeacher.batchesCount || 0}</div>
                          <div className="text-[10px] text-muted uppercase font-bold">Batches</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/5 rounded-2xl p-6 border border-border">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider">Documents</h4>
                        <button className="text-[10px] font-bold text-secondary hover:underline">Manage Docs</button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-card rounded-xl border border-border flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-muted" />
                            <span className="text-xs text-foreground">Resume.pdf</span>
                          </div>
                          <Eye size={14} className="text-muted cursor-pointer hover:text-foreground" />
                        </div>
                        <div className="p-3 bg-card rounded-xl border border-border flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Award size={16} className="text-muted" />
                            <span className="text-xs text-foreground">Certificates.zip</span>
                          </div>
                          <Eye size={14} className="text-muted cursor-pointer hover:text-foreground" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Teachers;
