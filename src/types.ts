export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  course?: string;
  batch?: string;
  status: 'Active' | 'Inactive';
  joined: string;
  av: string;
  color: string;
}

export interface Student extends User {
  courseId?: string;
  batchId?: string;
  teacherId?: string;
  progress: number;
  fee: number;
  paid: number;
}

export interface Teacher extends User {
  bio?: string;
  rating: number;
  coursesCount: number;
  batchesCount: number;
  studentsCount: number;
}

export interface Course {
  id: string;
  title: string;
  category: string;
  teacherId: string;
  price: number;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  status: 'Active' | 'Draft';
  emoji: string;
  description: string;
  keyPoints: string[];
  studentsCount: number;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  videoType: 'youtube' | 'vimeo' | 'upload';
  keyPoints: string[];
}

export interface Exam {
  id: string;
  courseId: string;
  moduleId?: string;
  title: string;
  duration: number; // in minutes
  totalMarks: number;
  passingMarks: number;
  status: 'Active' | 'Draft' | 'Completed';
  type: 'Practice' | 'Final';
}

export interface Question {
  id: string;
  examId: string;
  question: string;
  options: string[];
  answerIndex: number;
}

export interface Attendance {
  id: string;
  studentId: string;
  courseId: string;
  batchId: string;
  date: string;
  status: 'Present' | 'Absent';
}

export interface Payment {
  id: string;
  studentId: string;
  courseId: string;
  total: number;
  paid: number;
  pending: number;
  mode: string;
  date: string;
  status: 'Paid' | 'Partial' | 'Pending';
}

export interface LiveClass {
  id: string;
  courseId: string;
  batchId: string;
  teacherId: string;
  title: string;
  date: string;
  time: string;
  status: 'Live' | 'Upcoming' | 'Completed';
  zoomLink?: string;
  zoomPassword?: string;
  meetLink?: string;
}

export interface Batch {
  id: string;
  name: string;
  courseId: string;
  teacherId: string;
  studentsCount: number;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  days: string[];
  capacity?: number;
  status: 'Active' | 'Upcoming' | 'Completed';
}

export interface Assignment {
  id: string;
  courseId: string;
  batchId: string;
  moduleId?: string;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
  fileUrl?: string;
  status: 'Active' | 'Draft' | 'Completed';
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  submissionDate: string;
  fileUrl: string;
  marks?: number;
  feedback?: string;
  status: 'Submitted' | 'Checked' | 'Pending';
}

export interface Result {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  status: 'Pass' | 'Fail';
  date: string;
}

export interface Certificate {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  issueDate: string;
  certificateId: string; // Auto-generated
  grade?: string;
}

export interface Notification {
  id: string;
  userId: string; // 'all' for global
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  date: string;
  read: boolean;
}

export interface Setting {
  key: string;
  value: any;
}
