import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Camera, 
  Edit2, 
  Save, 
  X,
  BookOpen,
  Award,
  Clock,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { updateDoc, subscribeToCollection } from '../services/firestore';
import { User as UserType, Attendance, Certificate, Course } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { Lock } from 'lucide-react';

interface ProfileProps {
  user: UserType;
}

const Profile: React.FC<ProfileProps> = ({ user }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    bio: (user as any).bio || '',
    av: user.av
  });

  useEffect(() => {
    const unsubAttendance = subscribeToCollection('attendance', (data) => {
      setAttendance(data.filter(a => a.studentId === user.uid));
    });
    const unsubCertificates = subscribeToCollection('certificates', (data) => {
      setCertificates(data.filter(c => c.studentId === user.uid));
    });
    const unsubCourses = subscribeToCollection('courses', (data) => {
      if (user.course) {
        setCourses(data.filter(c => c.title === user.course));
      }
    });

    return () => {
      unsubAttendance();
      unsubCertificates();
      unsubCourses();
    };
  }, [user]);

  const attendanceRate = attendance.length > 0 
    ? Math.round((attendance.filter(a => a.status === 'Present').length / attendance.length) * 100)
    : 100;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc('users', user.uid, formData);
      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      alert("Passwords don't match!");
      return;
    }
    setLoading(true);
    try {
      // In a real app, you'd use Firebase Auth to change password
      // For now, we'll just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
      setShowPasswordModal(false);
      setPasswords({ current: '', new: '', confirm: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
          const base64 = readerEvent.target?.result as string;
          setFormData({ ...formData, av: base64 });
          // Auto-save the new avatar
          updateDoc('users', user.uid, { av: base64 });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-white">My Profile</h2>
          <p className="text-sm text-[#6b7599] mt-1">Manage your personal information and account settings</p>
        </div>
        {success && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 bg-[#2ecc8a]/10 text-[#2ecc8a] px-4 py-2 rounded-xl text-sm font-bold border border-[#2ecc8a]/20"
          >
            <CheckCircle2 size={16} /> Profile updated successfully
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Sidebar */}
        <div className="space-y-6">
          <Card className="p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-[#4f8ef7] to-[#3a7ae8] opacity-10" />
            <div className="relative z-10">
              <div className="relative inline-block group">
                <div className="w-32 h-32 rounded-full border-4 border-[#131726] bg-[#1a2035] overflow-hidden mx-auto shadow-2xl transition-transform group-hover:scale-105">
                  <img src={formData.av} alt={formData.name} className="w-full h-full object-cover" />
                </div>
                <button 
                  onClick={handleImageUpload}
                  className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-[#4f8ef7] text-white flex items-center justify-center border-4 border-[#131726] hover:scale-110 transition-transform shadow-lg"
                >
                  <Camera size={18} />
                </button>
              </div>
              <h3 className="text-xl font-extrabold font-syne text-white mt-4">{user.name}</h3>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className={cn(
                  "px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  user.role === 'admin' ? "bg-red-500/10 text-red-500" : 
                  user.role === 'teacher' ? "bg-blue-500/10 text-[#4f8ef7]" : 
                  "bg-green-500/10 text-[#2ecc8a]"
                )}>
                  {user.role}
                </span>
                <span className="text-[10px] font-bold text-[#6b7599] uppercase tracking-wider bg-[#1a2035] px-3 py-0.5 rounded-full">
                  Joined {user.joined}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-6">
            <h4 className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider border-b border-[#242b40] pb-3">Account Stats</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#1a2035] rounded-2xl text-center">
                <div className="text-xl font-extrabold text-white">{courses.length}</div>
                <div className="text-[10px] font-bold text-[#6b7599] uppercase mt-1">Courses</div>
              </div>
              <div className="p-4 bg-[#1a2035] rounded-2xl text-center">
                <div className="text-xl font-extrabold text-white">{(user as any).progress || 0}%</div>
                <div className="text-[10px] font-bold text-[#6b7599] uppercase mt-1">Progress</div>
              </div>
              <div className="p-4 bg-[#1a2035] rounded-2xl text-center">
                <div className="text-xl font-extrabold text-white">{certificates.length}</div>
                <div className="text-[10px] font-bold text-[#6b7599] uppercase mt-1">Certificates</div>
              </div>
              <div className="p-4 bg-[#1a2035] rounded-2xl text-center">
                <div className="text-xl font-extrabold text-white">{attendanceRate}%</div>
                <div className="text-[10px] font-bold text-[#6b7599] uppercase mt-1">Attendance</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2">
          <Card className="p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-white">Personal Information</h3>
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 text-[#4f8ef7] hover:text-[#3a7ae8] text-sm font-bold transition-colors"
                >
                  <Edit2 size={16} /> Edit Profile
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="text-[#6b7599] hover:text-[#e8ecf5] text-sm font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                  >
                    <Save size={16} /> {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7599]" />
                    <input 
                      disabled={!isEditing}
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-all disabled:opacity-50"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7599]" />
                    <input 
                      disabled={true} // Email usually not editable directly
                      type="email" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-all opacity-50"
                      value={formData.email}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Phone Number</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7599]" />
                    <input 
                      disabled={!isEditing}
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-all disabled:opacity-50"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Role</label>
                  <div className="relative">
                    <Shield size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7599]" />
                    <input 
                      disabled={true}
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-all opacity-50"
                      value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Bio / About Me</label>
                <textarea 
                  disabled={!isEditing}
                  rows={4}
                  className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-all disabled:opacity-50 resize-none"
                  placeholder="Tell us a bit about yourself..."
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                />
              </div>

              <div className="pt-8 border-t border-[#242b40]">
                <h4 className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mb-6">Security Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    type="button" 
                    onClick={() => setShowPasswordModal(true)}
                    className="flex items-center justify-between p-4 bg-[#1a2035] border border-[#242b40] rounded-xl group hover:border-[#4f8ef7]/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-[#4f8ef7] flex items-center justify-center">
                        <Shield size={16} />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-white">Change Password</div>
                        <div className="text-[10px] text-[#6b7599]">Update your login credentials</div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[#6b7599] group-hover:text-[#4f8ef7] transition-colors" />
                  </button>
                  <button type="button" className="flex items-center justify-between p-4 bg-[#1a2035] border border-[#242b40] rounded-xl group hover:border-[#4f8ef7]/50 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-[#4f8ef7] flex items-center justify-center">
                        <Mail size={16} />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-white">Email Notifications</div>
                        <div className="text-[10px] text-[#6b7599]">Enabled for all updates</div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[#6b7599] group-hover:text-[#4f8ef7] transition-colors" />
                  </button>
                </div>
              </div>
            </form>
          </Card>
        </div>
      </div>
      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasswordModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#131726] border border-[#242b40] rounded-2xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold font-syne">Change Password</h3>
                <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-red-500/10 text-[#6b7599] hover:text-red-500 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Current Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7599]" />
                    <input 
                      type="password" 
                      required
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-all"
                      value={passwords.current}
                      onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7599]" />
                    <input 
                      type="password" 
                      required
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-all"
                      value={passwords.new}
                      onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Confirm New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7599]" />
                    <input 
                      type="password" 
                      required
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-all"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 mt-4"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
