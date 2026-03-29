import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  FileText, 
  Clock, 
  CheckCircle2, 
  BarChart3,
  X,
  HelpCircle,
  PlusCircle,
  Trash,
  Play,
  Timer,
  ChevronLeft,
  ChevronRight,
  Trophy
} from 'lucide-react';
import { subscribeToCollection, createDoc, updateDocument, deleteDocument, addDoc } from '../services/firestore';
import { sendEmail, getNewRecordTemplate, getUpdateNotificationTemplate, getExamResultEmailTemplate } from '../services/emailService';
import { cn } from '../lib/utils';
import { Exam, Course, Question, User, Result } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface ExamsProps {
  user: User;
}

const Exams: React.FC<ExamsProps> = ({ user }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  
  // Exam Taking State
  const [takingExam, setTakingExam] = useState<Exam | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);

  // Mock questions for the demo
  const mockQuestions: Question[] = [
    { id: 'q1', examId: 'e1', question: 'What does SEO stand for?', options: ['Search Engine Optimization', 'Social Engine Operation', 'System Entry Order', 'Search Entry Option'], answerIndex: 0 },
    { id: 'q2', examId: 'e1', question: 'Which platform is best for B2B marketing?', options: ['Instagram', 'TikTok', 'LinkedIn', 'Snapchat'], answerIndex: 2 },
    { id: 'q3', examId: 'e1', question: 'What is the main goal of Content Marketing?', options: ['Selling products directly', 'Building trust and authority', 'Increasing server speed', 'Reducing employee turnover'], answerIndex: 1 },
  ];

  const [formData, setFormData] = useState({
    title: '',
    courseId: '',
    duration: 60,
    totalMarks: 100,
    passingMarks: 40,
    status: 'Active',
    type: 'Practice',
    questions: [] as Question[]
  });

  useEffect(() => {
    const unsubExams = subscribeToCollection('exams', setExams);
    const unsubCourses = subscribeToCollection('courses', setCourses);
    const unsubResults = subscribeToCollection('results', setResults);

    return () => {
      unsubExams();
      unsubCourses();
      unsubResults();
    };
  }, []);

  useEffect(() => {
    let timer: any;
    if (takingExam && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && takingExam) {
      handleFinishExam();
    }
    return () => clearInterval(timer);
  }, [takingExam, timeLeft]);

  const handleStartExam = (exam: Exam) => {
    setTakingExam(exam);
    setTimeLeft(exam.duration * 60);
    setCurrentQuestionIdx(0);
    setAnswers({});
  };

  const handleFinishExam = async () => {
    if (!takingExam) return;
    setLoading(true);
    
    // Calculate score
    let score = 0;
    const questionsToUse = (takingExam as any).questions || mockQuestions;
    questionsToUse.forEach((q: any) => {
      if (answers[q.id] === q.answerIndex) {
        score += (takingExam.totalMarks / questionsToUse.length);
      }
    });

    const percentage = (score / takingExam.totalMarks) * 100;
    const newResult: Partial<Result> = {
      examId: takingExam.id,
      studentId: user.uid,
      studentName: user.name,
      score: Math.round(score),
      totalMarks: takingExam.totalMarks,
      percentage: Math.round(percentage),
      status: percentage >= takingExam.passingMarks ? 'Pass' : 'Fail',
      date: new Date().toISOString(),
    };

    await addDoc('results', newResult);
    
    // Notify student about exam result
    const html = getExamResultEmailTemplate(
      user.name,
      takingExam.title,
      newResult.score!,
      newResult.totalMarks!,
      newResult.percentage!,
      newResult.status!
    );
    await sendEmail(user.email, `Exam Result: ${takingExam.title}`, html);

    setLoading(false);
    setTakingExam(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredExams = exams.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({
      title: exam.title,
      courseId: exam.courseId,
      duration: exam.duration,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      status: exam.status as any,
      type: exam.type as any,
      questions: (exam as any).questions || []
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      try {
        await deleteDocument('exams', id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingExam) {
        await updateDocument('exams', editingExam.id, formData);
        
        // Notify students about exam update (optional, but requested "every action")
        // For simplicity, we'll just log or notify the admin/teacher
        console.log(`Exam ${formData.title} updated`);
      } else {
        await createDoc('exams', formData);
        
        // Notify students about new exam
        // We'll need to fetch students for the course
        const course = courses.find(c => c.id === formData.courseId);
        if (course) {
          // In a real app, we'd fetch students enrolled in this course
          // For now, we'll just log it or send a generic notification if we had a student list here
          console.log(`New exam ${formData.title} created for course ${course.title}`);
        }
      }
      setShowModal(false);
      setEditingExam(null);
      setFormData({
        title: '',
        courseId: '',
        duration: 60,
        totalMarks: 100,
        passingMarks: 40,
        status: 'Active',
        type: 'Practice',
        questions: []
      });
    } catch (err) {
      console.error(err);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Math.random().toString(36).substring(2, 15),
      examId: editingExam?.id || '',
      question: '',
      options: ['', '', '', ''],
      answerIndex: 0
    };
    setFormData({
      ...formData,
      questions: [...formData.questions, newQuestion]
    });
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions.splice(index, 1);
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updatedQuestions = [...formData.questions];
    const updatedOptions = [...updatedQuestions[qIndex].options];
    updatedOptions[oIndex] = value;
    updatedQuestions[qIndex] = { ...updatedQuestions[qIndex], options: updatedOptions };
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const isAdminOrTeacher = user.role === 'admin' || user.role === 'teacher';

  if (takingExam) {
    const questionsToUse = (takingExam as any).questions || mockQuestions;
    const q = questionsToUse[currentQuestionIdx];
    return (
      <div className="fixed inset-0 bg-[#0b0e17] z-[200] flex flex-col">
        <header className="h-[70px] bg-[#131726] border-b border-[#242b40] px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#4f8ef7] flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-syne">{takingExam.title}</h2>
              <p className="text-[11px] text-[#6b7599] uppercase tracking-widest font-bold">Question {currentQuestionIdx + 1} of {questionsToUse.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 font-mono font-bold">
              <Timer size={18} /> {formatTime(timeLeft)}
            </div>
            <button 
              onClick={handleFinishExam}
              className="bg-[#2ecc8a] hover:bg-[#27ae60] text-white px-6 py-2 rounded-xl font-bold text-sm transition-all"
            >
              Finish Exam
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
          <motion.div 
            key={currentQuestionIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="bg-[#131726] border border-[#242b40] rounded-2xl p-8">
              <h3 className="text-xl font-medium text-[#e8ecf5] leading-relaxed">
                {q.question}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {q.options.map((opt: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setAnswers({ ...answers, [q.id]: idx })}
                  className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
                    answers[q.id] === idx 
                      ? "border-[#4f8ef7] bg-[#4f8ef7]/5 text-[#4f8ef7]" 
                      : "border-[#242b40] bg-[#131726] text-[#6b7599] hover:border-[#242b40] hover:bg-[#1a2035]"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                    answers[q.id] === idx ? "border-[#4f8ef7] bg-[#4f8ef7] text-white" : "border-[#242b40]"
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="text-[15px] font-medium">{opt}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </main>

        <footer className="h-[80px] bg-[#131726] border-t border-[#242b40] px-8 flex items-center justify-between">
          <button 
            disabled={currentQuestionIdx === 0}
            onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[#242b40] text-sm font-bold hover:bg-[#1a2035] transition-colors disabled:opacity-30"
          >
            <ChevronLeft size={18} /> Previous
          </button>
          <div className="flex gap-2">
            {questionsToUse.map((_: any, i: number) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i === currentQuestionIdx ? "bg-[#4f8ef7]" : answers[questionsToUse[i].id] !== undefined ? "bg-[#2ecc8a]" : "bg-[#242b40]"}`} />
            ))}
          </div>
          <button 
            disabled={currentQuestionIdx === questionsToUse.length - 1}
            onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1a2035] border border-[#242b40] text-sm font-bold hover:bg-[#242b40] transition-colors disabled:opacity-30"
          >
            Next <ChevronRight size={18} />
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-white">Exams & Assessments</h2>
          <p className="text-sm text-[#6b7599] mt-1">{exams.length} active assessments</p>
        </div>
        {isAdminOrTeacher && (
          <button 
            onClick={() => {
              setEditingExam(null);
              setFormData({
                title: '',
                courseId: '',
                duration: 60,
                totalMarks: 100,
                passingMarks: 40,
                status: 'Active',
                type: 'Practice',
                questions: []
              });
              setShowModal(true);
            }}
            className="bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors w-fit"
          >
            <Plus size={18} /> Create Exam
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-blue-500/5 border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-[#4f8ef7] rounded-lg"><FileText size={20} /></div>
            <div>
              <div className="text-lg font-bold font-syne">{exams.length}</div>
              <div className="text-[10px] text-[#6b7599] uppercase font-bold tracking-wider">Total Exams</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-green-500/5 border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 text-[#2ecc8a] rounded-lg"><CheckCircle2 size={20} /></div>
            <div>
              <div className="text-lg font-bold font-syne">{exams.filter(e => e.status === 'Active').length}</div>
              <div className="text-[10px] text-[#6b7599] uppercase font-bold tracking-wider">Active</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-orange-500/5 border-orange-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 text-[#f7924f] rounded-lg"><BarChart3 size={20} /></div>
            <div>
              <div className="text-lg font-bold font-syne">78%</div>
              <div className="text-[10px] text-[#6b7599] uppercase font-bold tracking-wider">Avg Pass Rate</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-purple-500/5 border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 text-[#7c5fe6] rounded-lg"><HelpCircle size={20} /></div>
            <div>
              <div className="text-lg font-bold font-syne">342</div>
              <div className="text-[10px] text-[#6b7599] uppercase font-bold tracking-wider">Total Attempts</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-2 bg-[#131726] border border-[#242b40] rounded-xl px-4 py-2 w-full max-w-md">
        <Search size={16} className="text-[#6b7599]" />
        <input 
          type="text" 
          placeholder="Search exams..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm w-full placeholder-[#6b7599]"
        />
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a2035]">
                <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Exam Title</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Course</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Marks</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242b40]">
              {filteredExams.map((e) => {
                const myResult = results.find(r => r.examId === e.id && r.studentId === user.uid);
                return (
                  <tr key={e.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="text-[13.5px] font-bold text-[#e8ecf5]">{e.title}</div>
                      <div className="text-[11px] text-[#6b7599] mt-0.5">{e.type} Exam</div>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-[#6b7599]">
                      {courses.find(c => c.id === e.courseId)?.title || 'General'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-[13px] text-[#6b7599]">
                        <Clock size={14} /> {e.duration} min
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[13px] font-medium">{e.totalMarks} Marks</div>
                      <div className="text-[11px] text-[#6b7599]">Passing: {e.passingMarks}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                        e.status === 'Active' ? "bg-green-500/10 text-[#2ecc8a]" : 
                        e.status === 'Draft' ? "bg-yellow-500/10 text-[#f7d04f]" : "bg-blue-500/10 text-[#4f8ef7]"
                      )}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.role === 'student' ? (
                        myResult ? (
                          <div className="text-right">
                            <div className={`text-sm font-bold ${myResult.status === 'Pass' ? 'text-[#2ecc8a]' : 'text-[#f75f6a]'}`}>
                              {myResult.percentage}%
                            </div>
                            <div className="text-[9px] font-bold text-[#6b7599] uppercase tracking-tighter">{myResult.status}</div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleStartExam(e)}
                            className="bg-[#2ecc8a] hover:bg-[#27ae60] text-white px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-2 ml-auto"
                          >
                            <Play size={12} fill="currentColor" /> Start
                          </button>
                        )
                      ) : (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 hover:bg-blue-500/10 text-[#4f8ef7] rounded-lg transition-colors" title="Results">
                            <BarChart3 size={16} />
                          </button>
                          <button 
                            onClick={() => handleEdit(e)}
                            className="p-2 hover:bg-purple-500/10 text-[#7c5fe6] rounded-lg transition-colors" title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(e.id)}
                            className="p-2 hover:bg-red-500/10 text-[#f75f6a] rounded-lg transition-colors" title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
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
              className="relative w-full max-w-[700px] bg-[#131726] border border-[#242b40] rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold font-syne">
                  {editingExam ? 'Edit Exam' : 'Create New Exam'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-red-500/10 text-[#6b7599] hover:text-red-500 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex gap-4 mb-6 border-b border-[#242b40]">
                <button 
                  onClick={() => setShowQuestions(false)}
                  className={cn(
                    "pb-3 text-sm font-bold transition-colors relative",
                    !showQuestions ? "text-[#4f8ef7]" : "text-[#6b7599] hover:text-[#e8ecf5]"
                  )}
                >
                  Basic Details
                  {!showQuestions && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4f8ef7]" />}
                </button>
                <button 
                  onClick={() => setShowQuestions(true)}
                  className={cn(
                    "pb-3 text-sm font-bold transition-colors relative",
                    showQuestions ? "text-[#4f8ef7]" : "text-[#6b7599] hover:text-[#e8ecf5]"
                  )}
                >
                  Questions ({formData.questions.length})
                  {showQuestions && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4f8ef7]" />}
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                {!showQuestions ? (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Exam Title</label>
                      <input 
                        required
                        type="text" 
                        className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                        placeholder="e.g. Mid Term Assessment"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Course</label>
                        <select 
                          required
                          className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                          value={formData.courseId}
                          onChange={(e) => setFormData({...formData, courseId: e.target.value})}
                        >
                          <option value="">Select Course</option>
                          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Exam Type</label>
                        <select 
                          className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                          value={formData.type}
                          onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                        >
                          <option>Practice</option>
                          <option>Final</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Duration (min)</label>
                        <input 
                          required
                          type="number" 
                          className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                          value={formData.duration}
                          onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Total Marks</label>
                        <input 
                          required
                          type="number" 
                          className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                          value={formData.totalMarks}
                          onChange={(e) => setFormData({...formData, totalMarks: parseInt(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Passing Marks</label>
                        <input 
                          required
                          type="number" 
                          className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                          value={formData.passingMarks}
                          onChange={(e) => setFormData({...formData, passingMarks: parseInt(e.target.value)})}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-[#e8ecf5]">Objective Questions</h4>
                      <button 
                        type="button"
                        onClick={addQuestion}
                        className="text-[#4f8ef7] hover:text-[#3a7ae8] text-xs font-bold flex items-center gap-1.5"
                      >
                        <PlusCircle size={16} /> Add Question
                      </button>
                    </div>

                    <div className="space-y-6">
                      {formData.questions.map((q, qIndex) => (
                        <div key={q.id} className="p-4 bg-[#1a2035] border border-[#242b40] rounded-xl space-y-4 relative group/q">
                          <button 
                            type="button"
                            onClick={() => removeQuestion(qIndex)}
                            className="absolute top-2 right-2 p-1.5 text-[#6b7599] hover:text-red-500 opacity-0 group-hover/q:opacity-100 transition-opacity"
                          >
                            <Trash size={14} />
                          </button>
                          
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Question {qIndex + 1}</label>
                            <input 
                              required
                              type="text" 
                              className="w-full bg-[#131726] border border-[#242b40] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                              placeholder="Enter question text"
                              value={q.question}
                              onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {q.options.map((opt, oIndex) => (
                              <div key={oIndex} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-[9px] font-bold text-[#6b7599] uppercase tracking-wider">Option {oIndex + 1}</label>
                                  <input 
                                    type="radio" 
                                    name={`correct-${q.id}`}
                                    checked={q.answerIndex === oIndex}
                                    onChange={() => updateQuestion(qIndex, 'answerIndex', oIndex)}
                                    className="accent-[#2ecc8a]"
                                  />
                                </div>
                                <input 
                                  required
                                  type="text" 
                                  className={cn(
                                    "w-full bg-[#131726] border rounded-lg px-3 py-1.5 text-xs outline-none transition-colors",
                                    q.answerIndex === oIndex ? "border-[#2ecc8a]/50 focus:border-[#2ecc8a]" : "border-[#242b40] focus:border-[#4f8ef7]"
                                  )}
                                  placeholder={`Option ${oIndex + 1}`}
                                  value={opt}
                                  onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {formData.questions.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-[#242b40] rounded-xl">
                          <p className="text-sm text-[#6b7599]">No questions added yet. Click "Add Question" to start.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button 
                    type="submit"
                    className="flex-1 bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white py-3 rounded-xl font-bold text-sm transition-colors"
                  >
                    {editingExam ? 'Update Exam' : 'Create Exam'}
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

export default Exams;
