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
import { Exam, Course, Question, User, Result, Batch } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface ExamsProps {
  user: User;
}

const Exams: React.FC<ExamsProps> = ({ user }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedExamForResults, setSelectedExamForResults] = useState<Exam | null>(null);
  const [evaluatingResult, setEvaluatingResult] = useState<Result | null>(null);
  
  // Exam Taking State
  const [takingExam, setTakingExam] = useState<Exam | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);

  // Mock questions for the demo
  const mockQuestions: Question[] = [
    { id: 'q1', examId: 'e1', question: 'What does SEO stand for?', options: ['Search Engine Optimization', 'Social Engine Operation', 'System Entry Order', 'Search Entry Option'], answerIndex: 0, type: 'MCQ', marks: 1 },
    { id: 'q2', examId: 'e1', question: 'Which platform is best for B2B marketing?', options: ['Instagram', 'TikTok', 'LinkedIn', 'Snapchat'], answerIndex: 2, type: 'MCQ', marks: 1 },
    { id: 'q3', examId: 'e1', question: 'What is the main goal of Content Marketing?', options: ['Selling products directly', 'Building trust and authority', 'Increasing server speed', 'Reducing employee turnover'], answerIndex: 1, type: 'MCQ', marks: 1 },
  ];

  const [formData, setFormData] = useState({
    title: '',
    courseId: '',
    batchId: '',
    description: '',
    instructions: '',
    duration: 60,
    totalMarks: 100,
    passingMarks: 40,
    status: 'Active',
    type: 'Practice',
    startDate: '',
    endDate: '',
    negativeMarking: 0,
    questions: [] as Question[]
  });

  useEffect(() => {
    const unsubExams = subscribeToCollection('exams', setExams);
    const unsubCourses = subscribeToCollection('courses', setCourses);
    const unsubBatches = subscribeToCollection('batches', setBatches);
    const unsubResults = subscribeToCollection('results', setResults);

    return () => {
      unsubExams();
      unsubCourses();
      unsubBatches();
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
      const userAnswer = answers[q.id];
      let isCorrect = false;
      let isPartiallyCorrect = false; // For future use if needed

      if (q.type === 'MCQ' || q.type === 'TrueFalse') {
        if (userAnswer === q.answerIndex) {
          isCorrect = true;
        }
      } else if (q.type === 'Multiple') {
        const correctOpts = q.correctOptions || [];
        const userOpts = userAnswer || [];
        if (correctOpts.length === userOpts.length && correctOpts.every((v: number) => userOpts.includes(v))) {
          isCorrect = true;
        }
      } else if (q.type === 'Descriptive') {
        // Descriptive questions need manual evaluation. 
        // For now, we'll mark them as "Pending" or 0 until a teacher reviews.
        isCorrect = false; 
      }

      if (isCorrect) {
        score += q.marks || (takingExam.totalMarks / questionsToUse.length);
      } else if (userAnswer !== undefined && takingExam.negativeMarking && q.type !== 'Descriptive') {
        score -= takingExam.negativeMarking;
      }
    });

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

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
      answers: answers // Store answers for review
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

  const filteredExams = exams.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase());
    if (user.role === 'student') {
      const studentCourseId = (user as any).courseId;
      const matchesCourse = !e.courseId || e.courseId === studentCourseId || e.courseId === user.course;
      return matchesSearch && e.status === 'Active' && matchesCourse;
    }
    if (user.role === 'teacher') {
      return matchesSearch && e.teacherId === user.uid;
    }
    return matchesSearch;
  });

  const myResults = results.filter(r => r.studentId === user.uid);
  const passedExams = myResults.filter(r => r.status === 'Pass').length;
  const avgScore = myResults.length > 0 
    ? Math.round(myResults.reduce((acc, curr) => acc + curr.percentage, 0) / myResults.length) 
    : 0;

  const handleEdit = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({
      title: exam.title,
      courseId: exam.courseId,
      batchId: exam.batchId || '',
      description: exam.description || '',
      instructions: exam.instructions || '',
      duration: exam.duration,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      status: exam.status as any,
      type: exam.type as any,
      startDate: exam.startDate || '',
      endDate: exam.endDate || '',
      negativeMarking: exam.negativeMarking || 0,
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
      const dataToSave = {
        ...formData,
        teacherId: editingExam ? editingExam.teacherId : user.uid
      };
      
      if (editingExam) {
        await updateDocument('exams', editingExam.id, dataToSave);
        
        // Notify students about exam update
        const course = courses.find(c => c.id === formData.courseId);
        const details = `The exam "${formData.title}" for course "${course?.title || 'General'}" has been updated. Duration: ${formData.duration} min, Total Marks: ${formData.totalMarks}.`;
        const html = getUpdateNotificationTemplate('Student', 'Exam Update', 'updated', details);
        // In a real app, we'd notify enrolled students. For now, notifying admin.
        await sendEmail('gagansaxena9528@gmail.com', `Exam Updated: ${formData.title}`, html);
      } else {
        await createDoc('exams', dataToSave);
        
        // Notify students about new exam
        const course = courses.find(c => c.id === formData.courseId);
        const details = `A new exam "${formData.title}" has been scheduled for course "${course?.title || 'General'}". Duration: ${formData.duration} min, Total Marks: ${formData.totalMarks}.`;
        const html = getNewRecordTemplate('Exam', 'Student', details);
        // In a real app, we'd notify enrolled students. For now, notifying admin.
        await sendEmail('gagansaxena9528@gmail.com', `New Exam Scheduled: ${formData.title}`, html);
      }
      setShowModal(false);
      setEditingExam(null);
      setFormData({
        title: '',
        courseId: '',
        batchId: '',
        description: '',
        instructions: '',
        duration: 60,
        totalMarks: 100,
        passingMarks: 40,
        status: 'Active',
        type: 'Practice',
        startDate: '',
        endDate: '',
        negativeMarking: 0,
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
      answerIndex: 0,
      type: 'MCQ',
      marks: 1,
      difficulty: 'Medium',
      subject: ''
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
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-[#4f8ef7]/10 text-[#4f8ef7] rounded-lg text-[10px] font-bold uppercase tracking-wider">{q.type}</span>
                <span className="text-[11px] font-bold text-[#6b7599]">{q.marks} Marks</span>
              </div>
              <h3 className="text-xl font-medium text-[#e8ecf5] leading-relaxed">
                {q.question}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {q.type === 'Descriptive' ? (
                <textarea 
                  className="w-full bg-[#131726] border-2 border-[#242b40] rounded-2xl p-6 text-[#e8ecf5] outline-none focus:border-[#4f8ef7] transition-all min-h-[200px]"
                  placeholder="Type your answer here..."
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                />
              ) : (
                q.options.map((opt: string, idx: number) => {
                  const isSelected = q.type === 'Multiple' 
                    ? (answers[q.id] || []).includes(idx)
                    : answers[q.id] === idx;

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (q.type === 'Multiple') {
                          const current = answers[q.id] || [];
                          const updated = current.includes(idx)
                            ? current.filter((i: number) => i !== idx)
                            : [...current, idx];
                          setAnswers({ ...answers, [q.id]: updated });
                        } else {
                          setAnswers({ ...answers, [q.id]: idx });
                        }
                      }}
                      className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
                        isSelected 
                          ? "border-[#4f8ef7] bg-[#4f8ef7]/5 text-[#4f8ef7]" 
                          : "border-[#242b40] bg-[#131726] text-[#6b7599] hover:border-[#242b40] hover:bg-[#1a2035]"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                        isSelected ? "border-[#4f8ef7] bg-[#4f8ef7] text-white" : "border-[#242b40]"
                      }`}>
                        {q.type === 'Multiple' ? (
                          isSelected ? <CheckCircle2 size={14} /> : null
                        ) : (
                          String.fromCharCode(65 + idx)
                        )}
                      </div>
                      <span className="text-[15px] font-medium">{opt}</span>
                    </button>
                  );
                })
              )}
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
                batchId: '',
                description: '',
                instructions: '',
                duration: 60,
                totalMarks: 100,
                passingMarks: 40,
                status: 'Active',
                type: 'Practice',
                startDate: '',
                endDate: '',
                negativeMarking: 0,
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
              <div className="text-lg font-bold font-syne">{user.role === 'student' ? filteredExams.length : exams.length}</div>
              <div className="text-[10px] text-[#6b7599] uppercase font-bold tracking-wider">{user.role === 'student' ? 'My Exams' : 'Total Exams'}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-green-500/5 border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 text-[#2ecc8a] rounded-lg"><CheckCircle2 size={20} /></div>
            <div>
              <div className="text-lg font-bold font-syne">{user.role === 'student' ? passedExams : exams.filter(e => e.status === 'Active').length}</div>
              <div className="text-[10px] text-[#6b7599] uppercase font-bold tracking-wider">{user.role === 'student' ? 'Passed' : 'Active'}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-orange-500/5 border-orange-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 text-[#f7924f] rounded-lg"><BarChart3 size={20} /></div>
            <div>
              <div className="text-lg font-bold font-syne">{user.role === 'student' ? `${avgScore}%` : '78%'}</div>
              <div className="text-[10px] text-[#6b7599] uppercase font-bold tracking-wider">{user.role === 'student' ? 'Avg Score' : 'Avg Pass Rate'}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-purple-500/5 border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 text-[#7c5fe6] rounded-lg"><Trophy size={20} /></div>
            <div>
              <div className="text-lg font-bold font-syne">{user.role === 'student' ? myResults.length : '342'}</div>
              <div className="text-[10px] text-[#6b7599] uppercase font-bold tracking-wider">{user.role === 'student' ? 'Attempts' : 'Total Attempts'}</div>
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
                          <button 
                            onClick={() => {
                              setSelectedExamForResults(e);
                              setShowResultsModal(true);
                            }}
                            className="p-2 hover:bg-blue-500/10 text-[#4f8ef7] rounded-lg transition-colors" title="Results"
                          >
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
                        <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Batch (Optional)</label>
                        <select 
                          className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                          value={formData.batchId}
                          onChange={(e) => setFormData({...formData, batchId: e.target.value})}
                        >
                          <option value="">All Batches</option>
                          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Description</label>
                      <textarea 
                        className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors min-h-[80px]"
                        placeholder="Brief description of the exam"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Instructions</label>
                      <textarea 
                        className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors min-h-[80px]"
                        placeholder="Rules, time limit info, negative marking info..."
                        value={formData.instructions}
                        onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Start Date & Time</label>
                        <input 
                          type="datetime-local" 
                          className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                          value={formData.startDate}
                          onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">End Date & Time</label>
                        <input 
                          type="datetime-local" 
                          className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                          value={formData.endDate}
                          onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                        />
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
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Negative Marking</label>
                        <input 
                          type="number" 
                          step="0.25"
                          className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                          placeholder="Marks per wrong answer"
                          value={formData.negativeMarking}
                          onChange={(e) => setFormData({...formData, negativeMarking: parseFloat(e.target.value)})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                      <h4 className="text-sm font-bold text-[#e8ecf5]">Exam Questions</h4>
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
                        <div key={q.id} className="p-5 bg-[#1a2035] border border-[#242b40] rounded-xl space-y-5 relative group/q">
                          <button 
                            type="button"
                            onClick={() => removeQuestion(qIndex)}
                            className="absolute top-3 right-3 p-1.5 text-[#6b7599] hover:text-red-500 opacity-0 group-hover/q:opacity-100 transition-opacity"
                          >
                            <Trash size={14} />
                          </button>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Question Type</label>
                              <select 
                                className="w-full bg-[#131726] border border-[#242b40] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#4f8ef7] transition-colors"
                                value={q.type}
                                onChange={(e) => {
                                  const type = e.target.value as any;
                                  const updated: Partial<Question> = { type };
                                  if (type === 'TrueFalse') updated.options = ['True', 'False'];
                                  if (type === 'Descriptive') updated.options = [];
                                  if (type === 'MCQ' || type === 'Multiple') updated.options = ['', '', '', ''];
                                  updateQuestion(qIndex, 'type', type);
                                  if (updated.options) updateQuestion(qIndex, 'options', updated.options);
                                }}
                              >
                                <option value="MCQ">Single Choice (MCQ)</option>
                                <option value="Multiple">Multiple Choice</option>
                                <option value="TrueFalse">True / False</option>
                                <option value="Descriptive">Descriptive (Long Answer)</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Marks</label>
                                <input 
                                  type="number" 
                                  className="w-full bg-[#131726] border border-[#242b40] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#4f8ef7] transition-colors"
                                  value={q.marks}
                                  onChange={(e) => updateQuestion(qIndex, 'marks', parseInt(e.target.value))}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Difficulty</label>
                                <select 
                                  className="w-full bg-[#131726] border border-[#242b40] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#4f8ef7] transition-colors"
                                  value={q.difficulty}
                                  onChange={(e) => updateQuestion(qIndex, 'difficulty', e.target.value)}
                                >
                                  <option>Easy</option>
                                  <option>Medium</option>
                                  <option>Hard</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Subject / Topic</label>
                            <input 
                              type="text" 
                              className="w-full bg-[#131726] border border-[#242b40] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#4f8ef7] transition-colors"
                              placeholder="e.g. Digital Marketing, SEO"
                              value={q.subject}
                              onChange={(e) => updateQuestion(qIndex, 'subject', e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Question Text</label>
                            <textarea 
                              required
                              className="w-full bg-[#131726] border border-[#242b40] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4f8ef7] transition-colors min-h-[60px]"
                              placeholder="Enter question text"
                              value={q.question}
                              onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                            />
                          </div>

                          {q.type !== 'Descriptive' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {q.options?.map((opt, oIndex) => (
                                <div key={oIndex} className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-bold text-[#6b7599] uppercase tracking-wider">Option {oIndex + 1}</label>
                                    {q.type === 'Multiple' ? (
                                      <input 
                                        type="checkbox" 
                                        checked={q.correctOptions?.includes(oIndex)}
                                        onChange={(e) => {
                                          const current = q.correctOptions || [];
                                          const updated = e.target.checked 
                                            ? [...current, oIndex]
                                            : current.filter(i => i !== oIndex);
                                          updateQuestion(qIndex, 'correctOptions', updated);
                                        }}
                                        className="accent-[#2ecc8a]"
                                      />
                                    ) : (
                                      <input 
                                        type="radio" 
                                        name={`correct-${q.id}`}
                                        checked={q.answerIndex === oIndex}
                                        onChange={() => updateQuestion(qIndex, 'answerIndex', oIndex)}
                                        className="accent-[#2ecc8a]"
                                      />
                                    )}
                                  </div>
                                  <input 
                                    required
                                    type="text" 
                                    className={cn(
                                      "w-full bg-[#131726] border rounded-lg px-3 py-2 text-xs outline-none transition-colors",
                                      (q.answerIndex === oIndex || q.correctOptions?.includes(oIndex)) ? "border-[#2ecc8a]/50 focus:border-[#2ecc8a]" : "border-[#242b40] focus:border-[#4f8ef7]"
                                    )}
                                    placeholder={`Option ${oIndex + 1}`}
                                    value={opt}
                                    onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                    disabled={q.type === 'TrueFalse'}
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {q.type === 'Descriptive' && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Correct Answer / Key Points (for reference)</label>
                              <textarea 
                                className="w-full bg-[#131726] border border-[#242b40] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#4f8ef7] transition-colors min-h-[80px]"
                                placeholder="Enter the ideal answer or key points for evaluation"
                                value={q.correctAnswer}
                                onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                      {formData.questions.length === 0 && (
                        <div className="text-center py-10 border-2 border-dashed border-[#242b40] rounded-xl">
                          <HelpCircle size={32} className="mx-auto text-[#242b40] mb-3" />
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
      {/* Results Modal */}
      <AnimatePresence>
        {showResultsModal && selectedExamForResults && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResultsModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[800px] bg-[#131726] border border-[#242b40] rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-extrabold font-syne">Exam Results</h3>
                  <p className="text-sm text-[#6b7599]">{selectedExamForResults.title}</p>
                </div>
                <button onClick={() => setShowResultsModal(false)} className="p-2 hover:bg-red-500/10 text-[#6b7599] hover:text-red-500 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {results.filter(r => r.examId === selectedExamForResults.id).length === 0 ? (
                  <div className="text-center py-12 bg-[#1a2035] rounded-xl border border-[#242b40]">
                    <p className="text-[#6b7599]">No results found for this exam yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#1a2035]">
                          <th className="px-4 py-3 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Student</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Score</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Percentage</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-[#6b7599] uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#242b40]">
                        {results.filter(r => r.examId === selectedExamForResults.id).map((r) => (
                          <tr key={r.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-4 py-4">
                              <div className="text-sm font-bold text-[#e8ecf5]">{r.studentName}</div>
                              <div className="text-[10px] text-[#6b7599]">{new Date(r.date).toLocaleDateString()}</div>
                            </td>
                            <td className="px-4 py-4 text-sm text-[#e8ecf5]">
                              {r.score} / {r.totalMarks}
                            </td>
                            <td className="px-4 py-4 text-sm font-mono text-[#4f8ef7]">
                              {r.percentage}%
                            </td>
                            <td className="px-4 py-4">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                r.status === 'Pass' ? "bg-green-500/10 text-[#2ecc8a]" : "bg-red-500/10 text-[#f75f6a]"
                              )}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button 
                                onClick={() => setEvaluatingResult(r)}
                                className="text-[#4f8ef7] hover:text-[#3a7ae8] text-xs font-bold"
                              >
                                Evaluate
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Evaluation Modal */}
      <AnimatePresence>
        {evaluatingResult && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEvaluatingResult(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[900px] bg-[#131726] border border-[#242b40] rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-extrabold font-syne text-white">Manual Evaluation</h3>
                  <p className="text-sm text-[#6b7599]">{evaluatingResult.studentName} - {selectedExamForResults?.title}</p>
                </div>
                <button onClick={() => setEvaluatingResult(null)} className="p-2 hover:bg-red-500/10 text-[#6b7599] hover:text-red-500 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                {((selectedExamForResults as any).questions || []).map((q: Question, idx: number) => {
                  const userAnswer = (evaluatingResult as any).answers?.[q.id];
                  return (
                    <div key={q.id} className="p-6 bg-[#1a2035] border border-[#242b40] rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#6b7599] uppercase tracking-widest">Question {idx + 1} ({q.type})</span>
                        <span className="text-xs font-bold text-[#4f8ef7]">{q.marks} Marks</span>
                      </div>
                      <p className="text-[#e8ecf5] font-medium leading-relaxed">{q.question}</p>
                      
                      <div className="pt-4 border-t border-[#242b40]">
                        <label className="text-[10px] font-bold text-[#6b7599] uppercase tracking-wider mb-2 block">Student's Answer</label>
                        <div className="p-4 bg-[#131726] rounded-xl text-sm text-[#e8ecf5] whitespace-pre-wrap border border-[#242b40]">
                          {q.type === 'Descriptive' ? (userAnswer || 'No answer provided') : (
                            Array.isArray(userAnswer) 
                              ? userAnswer.map(i => q.options?.[i]).join(', ')
                              : q.options?.[userAnswer] || 'No answer selected'
                          )}
                        </div>
                      </div>

                      {q.type === 'Descriptive' && (
                        <div className="pt-4 space-y-4">
                          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                            <label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2 block">Ideal Answer / Key Points</label>
                            <p className="text-xs text-[#6b7599] italic">{q.correctAnswer || 'No reference answer provided'}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex-1 space-y-2">
                              <label className="text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Award Marks</label>
                              <input 
                                type="number" 
                                max={q.marks}
                                min={0}
                                className="w-full bg-[#131726] border border-[#242b40] rounded-xl px-4 py-2 text-sm outline-none focus:border-[#4f8ef7]"
                                placeholder={`Max ${q.marks} marks`}
                                // In a real app, we'd update the result state here
                              />
                            </div>
                            <div className="flex-[2] space-y-2">
                              <label className="text-[10px] font-bold text-[#6b7599] uppercase tracking-wider">Feedback</label>
                              <input 
                                type="text" 
                                className="w-full bg-[#131726] border border-[#242b40] rounded-xl px-4 py-2 text-sm outline-none focus:border-[#4f8ef7]"
                                placeholder="Add feedback for this answer..."
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-10 pt-6 border-t border-[#242b40] flex justify-end gap-4">
                <button 
                  onClick={() => setEvaluatingResult(null)}
                  className="px-8 py-3 bg-[#1a2035] border border-[#242b40] text-white rounded-xl font-bold text-sm hover:bg-[#242b40] transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={async () => {
                    // Logic to save manual marks and update total score
                    // For now, just closing
                    setEvaluatingResult(null);
                  }}
                  className="px-8 py-3 bg-[#2ecc8a] hover:bg-[#27ae60] text-white rounded-xl font-bold text-sm transition-colors"
                >
                  Save Evaluation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Exams;
