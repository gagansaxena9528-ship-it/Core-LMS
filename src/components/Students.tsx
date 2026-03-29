import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Key, 
  Eye,
  X
} from 'lucide-react';
import { subscribeToCollection, createDoc, updateDocument, deleteDocument } from '../services/firestore';
import { adminCreateUser } from '../services/auth';
import { User, Course, Batch } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

const Students: React.FC = () => {
  const [students, setStudents] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    fatherName: '',
    motherName: '',
    dob: '',
    address: '',
    course: '',
    batch: '',
    fee: '',
    password: ''
  });

  useEffect(() => {
    const unsubUsers = subscribeToCollection('users', (data) => {
      setStudents(data.filter(u => u.role === 'student'));
    });
    const unsubCourses = subscribeToCollection('courses', setCourses);
    const unsubBatches = subscribeToCollection('batches', setBatches);

    return () => {
      unsubUsers();
      unsubCourses();
      unsubBatches();
    };
  }, []);

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.email.toLowerCase().includes(search.toLowerCase());
    const matchesCourse = filterCourse === 'All' || s.course === filterCourse;
    return matchesSearch && matchesCourse;
  });

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(students);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Students_List.xlsx");
  };

  const sendWelcomeEmail = async (studentData: any, password: string) => {
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: studentData.email,
          subject: 'Welcome to Core LMS - Your Account Details',
          html: `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #4f8ef7;">Welcome to Core LMS!</h2>
              <p>Hello <strong>${studentData.name}</strong>,</p>
              <p>Your student account has been successfully created. You can now log in to access your courses and learning materials.</p>
              
              <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; font-size: 16px;">Your Login Credentials:</h3>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${studentData.email}</p>
                <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
              </div>

              <p><strong>Additional Details:</strong></p>
              <ul>
                <li><strong>Course:</strong> ${studentData.course || 'N/A'}</li>
                <li><strong>Batch:</strong> ${studentData.batch || 'N/A'}</li>
                <li><strong>Phone:</strong> ${studentData.phone || 'N/A'}</li>
              </ul>

              <p>Please keep your password secure. We recommend changing it after your first login.</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
                <p>Sent from Core LMS Admin Panel</p>
              </div>
            </div>
          `
        })
      });
      const result = await response.json();
      if (result.success) {
        console.log('Welcome email sent successfully');
      } else {
        console.warn('Email skipped or failed:', result.message);
      }
    } catch (err) {
      console.error('Failed to send welcome email:', err);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let successCount = 0;
        let failCount = 0;

        for (const row of data) {
          try {
            const password = row.password || Math.random().toString(36).substring(7).toUpperCase();
            const userCredential = await adminCreateUser(row.email, password, row.name);
            
            if (userCredential?.uid) {
              await updateDocument('users', userCredential.uid, {
                name: row.name,
                email: row.email,
                phone: row.phone || '',
                fatherName: row.fatherName || '',
                motherName: row.motherName || '',
                dob: row.dob || '',
                address: row.address || '',
                course: row.course || '',
                batch: row.batch || '',
                role: 'student',
                status: 'Active',
                joined: new Date().toISOString(),
                progress: 0,
                fee: parseFloat(row.fee) || 0,
                paid: 0
              });
              
              // Send welcome email
              await sendWelcomeEmail(row, password);
              successCount++;
            }
          } catch (err) {
            console.error(`Failed to import student ${row.email}:`, err);
            failCount++;
          }
        }
        alert(`Import completed! ${successCount} students added, ${failCount} failed.`);
        setLoading(false);
      };
      reader.readAsBinaryString(file);
    } catch (err: any) {
      setError('Import failed: ' + err.message);
      setLoading(false);
    }
  };

  const handleEdit = (student: any) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      email: student.email,
      phone: student.phone || '',
      fatherName: student.fatherName || '',
      motherName: student.motherName || '',
      dob: student.dob || '',
      address: student.address || '',
      course: student.course || '',
      batch: student.batch || '',
      fee: student.fee?.toString() || '',
      password: '' // Don't show password for security
    });
    setShowModal(true);
  };

  const handleDelete = async (uid: string) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await deleteDocument('users', uid);
      } catch (err: any) {
        console.error(err);
        alert('Failed to delete student: ' + err.message);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (editingStudent) {
        const { password, ...updateData } = formData;
        await updateDocument('users', editingStudent.uid, {
          ...updateData,
          fee: parseFloat(formData.fee) || 0
        });
      } else {
        // Create Account via custom backend
        const userCredential = await adminCreateUser(formData.email, formData.password, formData.name);
        
        // Update the newly created user with additional details
        if (userCredential?.uid) {
          const { password, ...additionalData } = formData;
          await updateDocument('users', userCredential.uid, {
            ...additionalData,
            role: 'student',
            status: 'Active',
            joined: new Date().toISOString(),
            progress: 0,
            fee: parseFloat(formData.fee) || 0,
            paid: 0
          });

          // Send welcome email
          await sendWelcomeEmail(formData, formData.password);
        }
      }
      setShowModal(false);
      setEditingStudent(null);
      setFormData({ 
        name: '', email: '', phone: '', fatherName: '', motherName: '', 
        dob: '', address: '', course: '', batch: '', fee: '', password: '' 
      });
    } catch (err: any) {
      console.error(err);
      let message = err.message || 'Failed to save student';
      
      if (message.includes('auth/operation-not-allowed')) {
        message = 'Student creation failed: Email/Password provider is disabled in Firebase Console. Please enable it.';
      } else if (message.includes('auth/email-already-in-use')) {
        message = 'This email is already registered with another student.';
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-white">Student Management</h2>
          <p className="text-sm text-[#6b7599] mt-1">{students.length} total students enrolled</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors w-fit"
        >
          <Plus size={18} /> Add Student
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-[#131726] border border-[#242b40] rounded-xl px-4 py-2 flex-1 min-w-[240px]">
          <Search size={16} className="text-[#6b7599]" />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full placeholder-[#6b7599]"
          />
        </div>

        <div className="flex items-center gap-2 bg-[#131726] border border-[#242b40] rounded-xl px-4 py-2">
          <Filter size={16} className="text-[#6b7599]" />
          <select 
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-[#e8ecf5] cursor-pointer"
          >
            <option value="All">All Courses</option>
            {courses.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
          </select>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="p-2.5 bg-[#131726] border border-[#242b40] rounded-xl text-[#6b7599] hover:text-[#e8ecf5] hover:bg-[#242b40] transition-all"
            title="Export to Excel"
          >
            <Download size={18} />
          </button>
          <button 
            onClick={() => document.getElementById('csv-import')?.click()}
            className="p-2.5 bg-[#131726] border border-[#242b40] rounded-xl text-[#6b7599] hover:text-[#e8ecf5] hover:bg-[#242b40] transition-all"
            title="Import from CSV"
          >
            <Upload size={18} />
          </button>
          <input 
            id="csv-import"
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a2035]">
                <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">#</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Course & Batch</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Progress</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242b40]">
              {filteredStudents.map((s, i) => (
                <tr key={s.uid} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-6 py-4 text-sm text-[#6b7599]">{i + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-500/10 text-[#4f8ef7] flex items-center justify-center font-bold text-sm">
                        {s.av}
                      </div>
                      <div>
                        <div className="text-[13.5px] font-semibold">{s.name}</div>
                        <div className="text-[11px] text-[#6b7599]">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-[#6b7599]">{s.phone || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="text-[13px] font-medium text-white">{s.course || 'No Course'}</div>
                    <div className="text-[11px] text-muted">{s.batch || 'No Batch'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-secondary to-accent" style={{ width: `${(s as any).progress || 0}%` }} />
                      </div>
                      <span className="text-[11px] text-muted">{(s as any).progress || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full bg-green-500/10 text-[#2ecc8a] text-[10px] font-bold uppercase">
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 transition-opacity">
                      <button 
                        onClick={() => handleEdit(s)}
                        className="p-2 hover:bg-blue-500/10 text-[#4f8ef7] rounded-lg transition-colors" 
                        title="View Profile"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => handleEdit(s)}
                        className="p-2 hover:bg-purple-500/10 text-[#7c5fe6] rounded-lg transition-colors" 
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(s.uid)}
                        className="p-2 hover:bg-red-500/10 text-[#f75f6a] rounded-lg transition-colors" 
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

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
                  {editingStudent ? 'Edit Student' : 'Add New Student'}
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
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      placeholder="e.g. Rahul Kumar"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Email Address</label>
                    <input 
                      required
                      type="email" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      placeholder="student@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Mobile Number</label>
                    <input 
                      type="tel" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      placeholder="10-digit mobile"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Password</label>
                    <div className="flex gap-2">
                      <input 
                        required={!editingStudent}
                        type="text" 
                        className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                        placeholder={editingStudent ? "Leave blank to keep current" : "Auto-gen or manual"}
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                      />
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, password: Math.random().toString(36).substring(7).toUpperCase()})}
                        className="px-3 bg-[#1a2035] border border-[#242b40] rounded-xl text-[10px] font-bold text-[#4f8ef7] hover:bg-[#242b40]"
                      >
                        AUTO
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Father's Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      placeholder="Father's Name"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({...formData, fatherName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Mother's Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      placeholder="Mother's Name"
                      value={formData.motherName}
                      onChange={(e) => setFormData({...formData, motherName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Date of Birth</label>
                    <input 
                      type="date" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      value={formData.dob}
                      onChange={(e) => setFormData({...formData, dob: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Total Fee (₹)</label>
                    <input 
                      type="number" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      placeholder="Total Course Fee"
                      value={formData.fee}
                      onChange={(e) => setFormData({...formData, fee: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Address</label>
                  <textarea 
                    rows={2}
                    className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors resize-none"
                    placeholder="Full Address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Select Course</label>
                    <select 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      value={formData.course}
                      onChange={(e) => setFormData({...formData, course: e.target.value})}
                    >
                      <option value="">Choose Course</option>
                      {courses.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Select Batch</label>
                    <select 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      value={formData.batch}
                      onChange={(e) => setFormData({...formData, batch: e.target.value})}
                    >
                      <option value="">Choose Batch</option>
                      {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      editingStudent ? 'Update Student' : 'Create Student Account'
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

export default Students;
