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
import { sendEmail, getWelcomeEmailTemplate, getUpdateNotificationTemplate } from '../services/emailService';
import { adminCreateUser } from '../services/auth';
import { User, Course, Batch } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

interface StudentsProps {
  user?: User;
}

const Students: React.FC<StudentsProps> = ({ user }) => {
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
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    fatherName: '',
    motherName: '',
    dob: '',
    address: '',
    course: '',
    batch: '',
    fee: '',
    password: '',
    profilePhoto: ''
  });

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<User | null>(null);

  const [emailStatus, setEmailStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    const checkEmail = async () => {
      try {
        const res = await fetch('/api/email/health');
        const data = await res.json();
        if (data.status === 'ok') {
          setEmailStatus('ok');
        } else {
          setEmailStatus('error');
          setEmailError(data.error + (data.debug ? ` (User: ${data.debug.user}, PassLen: ${data.debug.passLength})` : ''));
        }
      } catch (err: any) {
        setEmailStatus('error');
        setEmailError(err.message);
      }
    };
    checkEmail();
  }, []);

  useEffect(() => {
    const unsubUsers = subscribeToCollection('users', (data) => {
      const allStudents = data.filter(u => u.role === 'student');
      if (user?.role === 'teacher') {
        setStudents(allStudents.filter(s => s.teacherId === user.uid));
      } else {
        setStudents(allStudents);
      }
    });
    const unsubCourses = subscribeToCollection('courses', setCourses);
    const unsubBatches = subscribeToCollection('batches', setBatches);

    return () => {
      unsubUsers();
      unsubCourses();
      unsubBatches();
    };
  }, [user?.uid, user?.role]);

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
    const html = getWelcomeEmailTemplate(
      studentData.name,
      studentData.email,
      password,
      studentData.course,
      studentData.batch,
      studentData.phone
    );
    await sendEmail(studentData.email, 'Welcome to Core LMS - Your Account Details', html);
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
    const [firstName = '', lastName = ''] = (student.name || '').split(' ');
    setFormData({
      firstName: student.firstName || firstName,
      lastName: student.lastName || lastName,
      email: student.email,
      phone: student.phone || '',
      fatherName: student.fatherName || '',
      motherName: student.motherName || '',
      dob: student.dob || '',
      address: student.address || '',
      course: student.course || '',
      batch: student.batch || '',
      fee: student.fee?.toString() || '',
      password: '', // Don't show password for security
      profilePhoto: student.profilePhoto || ''
    });
    setShowModal(true);
  };

  const handleViewProfile = (student: any) => {
    setViewingStudent(student);
    setShowProfileModal(true);
  };

  const handleResetPassword = async (student: any) => {
    const newPassword = Math.random().toString(36).substring(7).toUpperCase();
    if (window.confirm(`Are you sure you want to reset password for ${student.name}? New password will be: ${newPassword}`)) {
      try {
        await updateDocument('users', student.uid, { password: newPassword });
        const html = getUpdateNotificationTemplate(student.name, 'Account Password', 'reset', `Your new password is: ${newPassword}`);
        await sendEmail(student.email, 'Password Reset Notification - Core LMS', html);
        alert('Password reset successfully and email sent to student.');
      } catch (err: any) {
        alert('Failed to reset password: ' + err.message);
      }
    }
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

  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedStudents.length} selected students?`)) {
      setLoading(true);
      try {
        await Promise.all(selectedStudents.map(uid => deleteDocument('users', uid)));
        setSelectedStudents([]);
        alert('Selected students deleted successfully.');
      } catch (err: any) {
        alert('Failed to delete some students: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBulkAssignCourse = async () => {
    if (selectedStudents.length === 0) return;
    const courseTitle = window.prompt('Enter the Course Title to assign to selected students:');
    if (!courseTitle) return;
    
    const selectedCourse = courses.find(c => c.title === courseTitle);
    if (!selectedCourse) {
      alert('Course not found. Please enter a valid course title.');
      return;
    }

    setLoading(true);
    try {
      await Promise.all(selectedStudents.map(uid => updateDocument('users', uid, {
        course: selectedCourse.title,
        courseId: selectedCourse.id
      })));
      setSelectedStudents([]);
      alert('Course assigned to selected students successfully.');
    } catch (err: any) {
      alert('Failed to assign course: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.uid));
    }
  };

  const toggleSelectStudent = (uid: string) => {
    if (selectedStudents.includes(uid)) {
      setSelectedStudents(selectedStudents.filter(id => id !== uid));
    } else {
      setSelectedStudents([...selectedStudents, uid]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const feeNum = parseFloat(formData.fee) || 0;
      const selectedBatch = batches.find(b => b.name === formData.batch);
      const selectedCourse = courses.find(c => c.title === formData.course);
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      if (editingStudent) {
        const { password, ...updateData } = formData;
        const paid = (editingStudent as any).paid || 0;
        
        await updateDocument('users', editingStudent.uid, {
          ...updateData,
          name: fullName,
          fee: feeNum,
          pendingAmount: feeNum - paid,
          courseId: selectedCourse?.id || '',
          batchId: selectedBatch?.id || '',
          teacherId: selectedBatch?.teacherId || ''
        });
        
        // Send update notification
        const details = `Your profile has been updated by the administrator. Course: ${formData.course}, Batch: ${formData.batch}.`;
        const html = getUpdateNotificationTemplate(fullName, 'Student Profile', 'updated', details);
        await sendEmail(formData.email, 'Account Update Notification - Core LMS', html);
      } else {
        // Create Account via custom backend
        const userCredential = await adminCreateUser(formData.email, formData.password, fullName);
        
        // Update the newly created user with additional details
        if (userCredential?.uid) {
          const { password, ...additionalData } = formData;

          await updateDocument('users', userCredential.uid, {
            ...additionalData,
            name: fullName,
            role: 'student',
            status: 'Active',
            joined: new Date().toISOString(),
            progress: 0,
            fee: feeNum,
            paid: 0,
            pendingAmount: feeNum,
            courseId: selectedCourse?.id || '',
            batchId: selectedBatch?.id || '',
            teacherId: selectedBatch?.teacherId || ''
          });

          // Send welcome email
          await sendWelcomeEmail({ ...formData, name: fullName }, formData.password);
        }
      }
      setShowModal(false);
      setEditingStudent(null);
      setFormData({ 
        firstName: '', lastName: '', email: '', phone: '', fatherName: '', motherName: '', 
        dob: '', address: '', course: '', batch: '', fee: '', password: '', profilePhoto: ''
      });
    } catch (err: any) {
      console.error(err);
      let message = err.message || 'Failed to save student';
      
      if (message.includes('UNIQUE constraint failed: users.email') || message.includes('email address is already registered')) {
        message = 'This email address is already registered. Please use a different email.';
      }
      
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
          <h2 className="text-2xl font-extrabold font-syne text-foreground">Student Management</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted">{students.length} total students enrolled</p>
            <span className="text-muted">•</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                emailStatus === 'ok' ? 'bg-success' : 
                emailStatus === 'error' ? 'bg-primary' : 
                'bg-warning animate-pulse'
              }`} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Email System: {emailStatus === 'ok' ? 'Ready' : emailStatus === 'error' ? 'Error' : 'Checking...'}
              </span>
              {emailStatus === 'error' && (
                <span className="text-[10px] text-primary/80 ml-1">({emailError})</span>
              )}
            </div>
          </div>
        </div>
        {user?.role !== 'teacher' && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-secondary hover:bg-secondary/90 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors w-fit"
          >
            <Plus size={18} /> Add Student
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-4 py-2 flex-1 min-w-[240px]">
          <Search size={16} className="text-muted" />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full placeholder-muted"
          />
        </div>

        <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-4 py-2">
          <Filter size={16} className="text-muted" />
          <select 
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-foreground cursor-pointer"
          >
            <option value="All">All Courses</option>
            {courses.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
          </select>
        </div>

        <div className="flex gap-2">
          {selectedStudents.length > 0 && user?.role !== 'teacher' && (
            <>
              <button 
                onClick={handleBulkAssignCourse}
                className="flex items-center gap-2 px-4 py-2.5 bg-secondary/10 border border-secondary/20 text-secondary rounded-xl hover:bg-secondary/20 transition-all"
              >
                <Plus size={18} />
                <span className="text-sm font-bold">Assign Course</span>
              </button>
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl hover:bg-primary/20 transition-all"
              >
                <Trash2 size={18} />
                <span className="text-sm font-bold">Delete ({selectedStudents.length})</span>
              </button>
            </>
          )}
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-background border border-border rounded-xl text-muted hover:text-foreground hover:bg-border transition-all"
            title="Export to Excel"
          >
            <Download size={18} />
            <span className="text-sm font-bold hidden md:inline">Export</span>
          </button>
          {user?.role !== 'teacher' && (
            <button 
              onClick={() => document.getElementById('csv-import')?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-background border border-border rounded-xl text-muted hover:text-foreground hover:bg-border transition-all"
              title="Import from CSV"
            >
              <Upload size={18} />
              <span className="text-sm font-bold hidden md:inline">Import</span>
            </button>
          )}
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
              <tr className="bg-card">
                <th className="px-6 py-4">
                  <input 
                    type="checkbox" 
                    checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-border bg-background"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-wider">Course & Batch</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-wider">Join Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.map((s, i) => (
                <tr key={s.uid} className="hover:bg-muted/10 transition-colors group">
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      checked={selectedStudents.includes(s.uid)}
                      onChange={() => toggleSelectStudent(s.uid)}
                      className="rounded border-border bg-background"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {s.profilePhoto ? (
                        <img src={s.profilePhoto} alt={s.name} className="w-9 h-9 rounded-full object-cover border border-border" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-bold text-sm">
                          {s.av}
                        </div>
                      )}
                      <div>
                        <div className="text-[13.5px] font-semibold text-foreground">{s.name}</div>
                        <div className="text-[11px] text-muted">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-muted">{s.phone || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="text-[13px] font-medium text-foreground">{s.course || 'No Course'}</div>
                    <div className="text-[11px] text-muted">{s.batch || 'No Batch'}</div>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-muted">
                    {new Date(s.joined).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 transition-opacity">
                      <button 
                        onClick={() => handleViewProfile(s)}
                        className="p-2 hover:bg-secondary/10 text-secondary rounded-lg transition-colors" 
                        title="View Profile"
                      >
                        <Eye size={16} />
                      </button>
                      {user?.role !== 'teacher' && (
                        <>
                          <button 
                            onClick={() => handleEdit(s)}
                            className="p-2 hover:bg-accent/10 text-accent rounded-lg transition-colors" 
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleResetPassword(s)}
                            className="p-2 hover:bg-warning/10 text-warning rounded-lg transition-colors" 
                            title="Reset Password"
                          >
                            <Key size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(s.uid)}
                            className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors" 
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
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
              className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[560px] bg-background border border-border rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold font-syne">
                  {editingStudent ? 'Edit Student' : 'Add New Student'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-primary/10 text-muted hover:text-primary rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-primary/10 border border-primary/20 text-primary text-xs rounded-xl">
                  {error}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">First Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors"
                      placeholder="e.g. Rahul"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Last Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors"
                      placeholder="e.g. Kumar"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Email Address</label>
                    <input 
                      required
                      type="email" 
                      className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors"
                      placeholder="student@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Mobile Number</label>
                    <input 
                      type="tel" 
                      className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors"
                      placeholder="10-digit mobile"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Profile Photo URL</label>
                    <input 
                      type="url" 
                      className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors"
                      placeholder="https://example.com/photo.jpg"
                      value={formData.profilePhoto}
                      onChange={(e) => setFormData({...formData, profilePhoto: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Password</label>
                    <div className="flex gap-2">
                      <input 
                        required={!editingStudent}
                        type="text" 
                        className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors"
                        placeholder={editingStudent ? "Leave blank to keep current" : "Auto-gen or manual"}
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                      />
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, password: Math.random().toString(36).substring(7).toUpperCase()})}
                        className="px-3 bg-card border border-border rounded-xl text-[10px] font-bold text-secondary hover:bg-border"
                      >
                        AUTO
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Father's Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors"
                      placeholder="Father's Name"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({...formData, fatherName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Mother's Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors"
                      placeholder="Mother's Name"
                      value={formData.motherName}
                      onChange={(e) => setFormData({...formData, motherName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Date of Birth</label>
                    <input 
                      type="date" 
                      className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors"
                      value={formData.dob}
                      onChange={(e) => setFormData({...formData, dob: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Total Fee (₹)</label>
                    <input 
                      type="number" 
                      className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors"
                      placeholder="Total Course Fee"
                      value={formData.fee}
                      onChange={(e) => setFormData({...formData, fee: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Address</label>
                  <textarea 
                    rows={2}
                    className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors resize-none"
                    placeholder="Full Address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Select Course</label>
                    <select 
                      className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors"
                      value={formData.course}
                      onChange={(e) => setFormData({...formData, course: e.target.value})}
                    >
                      <option value="">Choose Course</option>
                      {courses.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Select Batch</label>
                    <select 
                      className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary transition-colors"
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
                    className="flex-1 bg-secondary hover:bg-secondary/90 text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      editingStudent ? 'Update Student' : 'Create Student Account'
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 bg-card border border-border text-foreground rounded-xl font-bold text-sm hover:bg-border transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && viewingStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[720px] bg-background border border-border rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  {viewingStudent.profilePhoto ? (
                    <img src={viewingStudent.profilePhoto} alt={viewingStudent.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-border" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center font-bold text-2xl">
                      {viewingStudent.av}
                    </div>
                  )}
                  <div>
                    <h3 className="text-2xl font-extrabold font-syne">{viewingStudent.name}</h3>
                    <p className="text-muted text-sm">{viewingStudent.email}</p>
                  </div>
                </div>
                <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-primary/10 text-muted hover:text-primary rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Personal Information</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Phone:</span>
                        <span className="text-white font-medium">{viewingStudent.phone || '—'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Father's Name:</span>
                        <span className="text-white font-medium">{(viewingStudent as any).fatherName || '—'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Mother's Name:</span>
                        <span className="text-white font-medium">{(viewingStudent as any).motherName || '—'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">DOB:</span>
                        <span className="text-white font-medium">{(viewingStudent as any).dob || '—'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Address:</span>
                        <span className="text-white font-medium text-right max-w-[200px]">{(viewingStudent as any).address || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Course & Batch Info</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Course:</span>
                        <span className="text-secondary font-bold">{viewingStudent.course || '—'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Batch:</span>
                        <span className="text-white font-medium">{viewingStudent.batch || '—'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Join Date:</span>
                        <span className="text-white font-medium">{new Date(viewingStudent.joined).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Status:</span>
                        <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold uppercase">
                          {viewingStudent.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Academic Progress</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted">Course Progress</span>
                          <span className="text-white">{(viewingStudent as any).progress || 0}%</span>
                        </div>
                        <div className="w-full h-2 bg-card rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-secondary to-accent" style={{ width: `${(viewingStudent as any).progress || 0}%` }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-card rounded-xl border border-border">
                          <div className="text-[10px] font-bold text-muted uppercase mb-1">Attendance</div>
                          <div className="text-lg font-bold text-white">{(viewingStudent as any).attendanceRate || 0}%</div>
                        </div>
                        <div className="p-3 bg-card rounded-xl border border-border">
                          <div className="text-[10px] font-bold text-muted uppercase mb-1">Lessons</div>
                          <div className="text-lg font-bold text-white">{(viewingStudent as any).completedLessons || 0}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Fee Summary</h4>
                    <div className="p-4 bg-card rounded-xl border border-border space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Total Fee:</span>
                        <span className="text-white font-bold">₹{(viewingStudent as any).fee || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Paid Amount:</span>
                        <span className="text-success font-bold">₹{(viewingStudent as any).paid || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-border">
                        <span className="text-muted">Pending:</span>
                        <span className="text-primary font-bold">₹{(viewingStudent as any).pendingAmount || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Activity Tracking</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">Last Login:</span>
                        <span className="text-white">{(viewingStudent as any).lastLogin ? new Date((viewingStudent as any).lastLogin).toLocaleString() : 'Never'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">Time Spent:</span>
                        <span className="text-white">{(viewingStudent as any).timeSpent || 0} minutes</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border flex justify-end gap-3">
                <button 
                  onClick={() => { setShowProfileModal(false); handleEdit(viewingStudent); }}
                  className="px-6 py-2.5 bg-secondary hover:bg-secondary/90 text-white rounded-xl font-bold text-sm transition-colors"
                >
                  Edit Profile
                </button>
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="px-6 py-2.5 bg-card border border-border text-foreground rounded-xl font-bold text-sm hover:bg-border transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Students;
