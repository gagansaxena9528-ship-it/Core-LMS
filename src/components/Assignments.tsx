import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { 
  FileText, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Upload,
  Download,
  MoreVertical,
  Search,
  Filter
} from 'lucide-react';
import { subscribeToCollection, addDoc, updateDoc } from '../services/firestore';
import { sendEmail, getNewRecordTemplate, getUpdateNotificationTemplate } from '../services/emailService';
import { Assignment, AssignmentSubmission, User, Student } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface AssignmentsProps {
  user: User;
}

const Assignments: React.FC<AssignmentsProps> = ({ user }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    const unsubAssignments = subscribeToCollection('assignments', setAssignments);
    const unsubSubmissions = subscribeToCollection('submissions', setSubmissions);
    const unsubStudents = subscribeToCollection('users', (data) => {
      setStudents(data.filter(u => u.role === 'student') as Student[]);
    });
    const unsubCourses = subscribeToCollection('courses', setCourses);
    const unsubBatches = subscribeToCollection('batches', setBatches);
    
    return () => {
      unsubAssignments();
      unsubSubmissions();
      unsubStudents();
      unsubCourses();
      unsubBatches();
    };
  }, []);

  const handleAddAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const newAssignment: Partial<Assignment> = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      dueDate: formData.get('dueDate') as string,
      totalMarks: parseInt(formData.get('totalMarks') as string),
      status: 'Active',
      courseId: formData.get('courseId') as string,
      batchId: formData.get('batchId') as string,
    };
    const docRef = await addDoc('assignments', newAssignment);
    
    // Notify students about new assignment
    const batchStudents = students.filter(s => 
      (!newAssignment.courseId || s.courseId === newAssignment.courseId) &&
      (!newAssignment.batchId || s.batchId === newAssignment.batchId)
    );
    for (const student of batchStudents) {
      const details = `A new assignment "${newAssignment.title}" has been posted. Due Date: ${new Date(newAssignment.dueDate!).toLocaleDateString()}. Description: ${newAssignment.description}`;
      const html = getNewRecordTemplate('New Assignment', student.name, details);
      await sendEmail(student.email, `New Assignment: ${newAssignment.title}`, html);
    }

    setLoading(false);
    setShowAddModal(false);
  };

  const handleSubmitAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    setLoading(true);
    const newSubmission: Partial<AssignmentSubmission> = {
      assignmentId: selectedAssignment.id,
      studentId: user.uid,
      studentName: user.name,
      submissionDate: new Date().toISOString(),
      fileUrl: 'https://example.com/submission.pdf', // Mock
      status: 'Submitted',
    };
    await addDoc('submissions', newSubmission);

    // Notify teacher/admin about submission
    const details = `Student ${user.name} has submitted the assignment: "${selectedAssignment.title}". Submission Date: ${new Date(newSubmission.submissionDate!).toLocaleString()}`;
    const html = getUpdateNotificationTemplate('Administrator', 'Assignment Submission', 'received', details);
    // In a real app, we'd find the specific teacher's email. For now, notifying the configured admin email.
    await sendEmail('gagansaxena9528@gmail.com', `New Submission: ${selectedAssignment.title}`, html);

    setLoading(false);
    setShowSubmitModal(false);
  };

  const filteredAssignments = assignments.filter(a => {
    if (user.role === 'student') {
      const student = students.find(s => s.uid === user.uid);
      if (!student) return false;
      
      const matchesCourse = !a.courseId || a.courseId === student.courseId;
      const matchesBatch = !a.batchId || a.batchId === student.batchId;
      
      return matchesCourse && matchesBatch;
    }
    return true;
  });

  const mySubmissions = submissions.filter(s => s.studentId === user.uid);
  const completedCount = mySubmissions.length;
  const pendingCount = filteredAssignments.length - completedCount;
  const completionRate = filteredAssignments.length > 0 
    ? Math.round((completedCount / filteredAssignments.length) * 100) 
    : 0;

  const isAdminOrTeacher = user.role === 'admin' || user.role === 'teacher';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-white">Assignments</h2>
          <p className="text-sm text-[#6b7599] mt-1">Manage and track student submissions</p>
        </div>
        {isAdminOrTeacher && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} /> Create Assignment
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3 bg-[#131726] border border-[#242b40] rounded-xl px-4 py-2">
            <Search size={18} className="text-[#6b7599]" />
            <input 
              type="text" 
              placeholder="Search assignments..." 
              className="bg-transparent border-none outline-none text-sm w-full placeholder-[#6b7599]"
            />
            <button className="p-2 hover:bg-[#1a2035] rounded-lg text-[#6b7599]">
              <Filter size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredAssignments.length === 0 ? (
              <div className="text-center py-12 bg-[#131726] border border-[#242b40] border-dashed rounded-2xl">
                <FileText size={48} className="mx-auto text-[#242b40] mb-4" />
                <p className="text-[#6b7599]">No assignments found</p>
              </div>
            ) : (
              filteredAssignments.map((assignment) => {
                const mySubmission = submissions.find(s => s.assignmentId === assignment.id && s.studentId === user.uid);
                return (
                  <div key={assignment.id} className="bg-[#131726] border border-[#242b40] rounded-2xl p-6 hover:border-[#4f8ef7]/50 transition-all group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-[#4f8ef7] flex items-center justify-center">
                          <FileText size={24} />
                        </div>
                        <div>
                          <h3 className="text-[16px] font-bold text-[#e8ecf5] group-hover:text-[#4f8ef7] transition-colors">{assignment.title}</h3>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1.5 text-[11px] text-[#6b7599]">
                              <Calendar size={12} /> Due: {new Date(assignment.dueDate).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-[#6b7599]">
                              <Clock size={12} /> {assignment.totalMarks} Marks
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.role === 'student' ? (
                          mySubmission ? (
                            <span className="px-3 py-1 rounded-full bg-green-500/10 text-[#2ecc8a] text-[10px] font-bold uppercase flex items-center gap-1.5">
                              <CheckCircle2 size={12} /> Submitted
                            </span>
                          ) : (
                            <button 
                              onClick={() => {
                                setSelectedAssignment(assignment);
                                setShowSubmitModal(true);
                              }}
                              className="bg-[#4f8ef7]/10 hover:bg-[#4f8ef7] text-[#4f8ef7] hover:text-white px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                            >
                              Submit Now
                            </button>
                          )
                        ) : (
                          <button className="p-2 hover:bg-[#1a2035] rounded-lg text-[#6b7599]">
                            <MoreVertical size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-4 text-[13px] text-[#6b7599] leading-relaxed">
                      {assignment.description}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card title="Submission Stats">
            <div className="space-y-6 mt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 text-[#2ecc8a] flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-[#e8ecf5]">Completed</div>
                    <div className="text-[11px] text-[#6b7599]">{completedCount} Assignments</div>
                  </div>
                </div>
                <div className="text-lg font-bold text-[#2ecc8a]">{completionRate}%</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-[#f7924f] flex items-center justify-center">
                    <Clock size={20} />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-[#e8ecf5]">Pending</div>
                    <div className="text-[11px] text-[#6b7599]">{pendingCount} Assignments</div>
                  </div>
                </div>
                <div className="text-lg font-bold text-[#f7924f]">{100 - completionRate}%</div>
              </div>
            </div>
          </Card>

          <Card title="Recent Submissions">
            <div className="space-y-4 mt-2">
              {submissions.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-[#1a2035] rounded-xl border border-[#242b40]">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 text-[#4f8ef7] flex items-center justify-center font-bold text-[10px]">
                    {s.studentName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-[#e8ecf5] truncate">{s.studentName}</div>
                    <div className="text-[10px] text-[#6b7599] mt-0.5">Submitted 2h ago</div>
                  </div>
                  <button className="p-1.5 hover:bg-[#242b40] rounded-lg text-[#4f8ef7]">
                    <Download size={14} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Add Assignment Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#131726] border border-[#242b40] rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[#242b40]">
                <h3 className="text-xl font-bold text-white font-syne">Create New Assignment</h3>
              </div>
              <form onSubmit={handleAddAssignment} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Title</label>
                  <input 
                    name="title"
                    required
                    className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                    placeholder="e.g. Social Media Marketing Strategy"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Description</label>
                  <textarea 
                    name="description"
                    required
                    rows={4}
                    className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors resize-none"
                    placeholder="Provide detailed instructions..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Course</label>
                    <select 
                      name="courseId"
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                    >
                      <option value="">All Courses</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Batch</label>
                    <select 
                      name="batchId"
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                    >
                      <option value="">All Batches</option>
                      {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Due Date</label>
                    <input 
                      name="dueDate"
                      type="date"
                      required
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Total Marks</label>
                    <input 
                      name="totalMarks"
                      type="number"
                      required
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      placeholder="100"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[#242b40] text-sm font-bold hover:bg-[#1a2035] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#4f8ef7] text-white text-sm font-bold hover:bg-[#3a7ae8] transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Assignment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submit Assignment Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSubmitModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-[#131726] border border-[#242b40] rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[#242b40]">
                <h3 className="text-xl font-bold text-white font-syne">Submit Assignment</h3>
                <p className="text-xs text-[#6b7599] mt-1">{selectedAssignment?.title}</p>
              </div>
              <form onSubmit={handleSubmitAssignment} className="p-6 space-y-6">
                <div className="border-2 border-dashed border-[#242b40] rounded-2xl p-8 text-center hover:border-[#4f8ef7] transition-colors cursor-pointer group">
                  <Upload size={32} className="mx-auto text-[#242b40] group-hover:text-[#4f8ef7] mb-3" />
                  <p className="text-[13px] font-medium text-[#e8ecf5]">Click to upload or drag & drop</p>
                  <p className="text-[11px] text-[#6b7599] mt-1">PDF, DOCX or ZIP (Max 10MB)</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[#242b40] text-sm font-bold hover:bg-[#1a2035] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#4f8ef7] text-white text-sm font-bold hover:bg-[#3a7ae8] transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Now'}
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

export default Assignments;
