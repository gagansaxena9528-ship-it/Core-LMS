export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  fatherName?: string;
  motherName?: string;
  dob?: string;
  address?: string;
  course?: string;
  batch?: string;
  status: 'Active' | 'Inactive';
  joined: string;
  av: string;
  color: string;
}

export interface Student extends User {
  firstName?: string;
  lastName?: string;
  profilePhoto?: string;
  courseId?: string;
  batchId?: string;
  teacherId?: string; // Primary teacher
  teacherIds?: string[]; // Multiple teachers
  progress: number;
  fee: number;
  paid: number;
  pendingAmount?: number;
  attendanceRate?: number;
  lastLogin?: string;
  timeSpent?: number; // in minutes
  completedLessons?: number;
}

export interface Teacher extends User {
  firstName?: string;
  lastName?: string;
  profilePhoto?: string;
  qualification?: string;
  experience?: string;
  skills?: string[];
  bio?: string;
  rating: number;
  coursesCount: number;
  batchesCount: number;
  studentsCount: number;
  classesTaken?: number;
  attendanceRate?: number;
  salary?: number;
  documents?: {
    resume?: string;
    certificates?: string[];
    idProof?: string;
  };
}

export interface Course {
  id: string;
  title: string;
  category: string;
  teacherId: string;
  price: number;
  discountPrice?: number;
  isFree: boolean;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  status: 'Active' | 'Draft' | 'Archived';
  emoji: string;
  thumbnail?: string;
  description: string;
  language?: string;
  tags?: string[];
  offerBanner?: string;
  studentsCount: number;
  rating?: number;
  reviewsCount?: number;
  dripContent?: boolean;
  certificateEnabled?: boolean;
  createdAt?: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  order: number;
}

export interface Lesson {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  type: 'video' | 'pdf' | 'text' | 'file';
  content?: string;
  videoUrl?: string;
  videoType?: 'youtube' | 'direct';
  fileUrl?: string;
  duration?: string;
  order: number;
  isFree: boolean;
  dripDays?: number;
  description?: string;
  thumbnail?: string;
  status: 'Published' | 'Draft' | 'Scheduled';
  scheduledDate?: string;
  accessControl?: {
    batchIds?: string[];
    isPaidOnly: boolean;
  };
  analytics?: {
    views: number;
    avgWatchTime?: number;
    downloads?: number;
  };
  teacherId?: string;
}

export interface Exam {
  id: string;
  courseId: string;
  batchId?: string;
  moduleId?: string;
  title: string;
  description?: string;
  instructions?: string;
  duration: number; // in minutes
  totalMarks: number;
  passingMarks: number;
  status: 'Active' | 'Draft' | 'Completed';
  type: 'Practice' | 'Final';
  autoResult: boolean;
  attemptsAllowed?: number; // 0 for unlimited
  startDate?: string;
  endDate?: string;
  negativeMarking?: number;
  teacherId?: string;
  createdAt?: string;
}

export interface Question {
  id: string;
  examId: string;
  question: string;
  type: 'MCQ' | 'Multiple' | 'TrueFalse' | 'Descriptive';
  options?: string[]; // Not needed for Descriptive
  answerIndex?: number; // for MCQ/TrueFalse
  correctOptions?: number[]; // for Multiple
  correctAnswer?: string; // for Descriptive or short answer
  marks: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  subject?: string;
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
  studentName?: string;
  courseId: string;
  courseName?: string;
  amount: number;
  totalFee?: number;
  paidAmount?: number;
  pendingAmount?: number;
  mode: 'Cash' | 'UPI' | 'Online';
  transactionId?: string;
  date: string;
  notes?: string;
  invoiceNumber?: string;
  status: 'Paid' | 'Partial' | 'Pending';
  paymentApiRef?: string; // Reference for future API integration
}

export interface FeeStructure {
  id: string;
  courseId: string;
  courseName: string;
  totalFee: number;
  installmentOption: boolean;
  numberOfInstallments: number;
  discount: number; // percentage or fixed
  discountType: 'percentage' | 'fixed';
  finalFee: number;
  upiId?: string; // UPI ID for this course/fee
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  amount: number;
  gst: number;
  total: number;
  date: string;
  paymentId: string;
}

export interface LiveClass {
  id: string;
  courseId: string;
  batchId: string;
  teacherId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  meetingLink: string;
  meetingType: 'Zoom' | 'Meet' | 'Custom';
  status: 'Upcoming' | 'Live' | 'Completed';
  reminderSent?: boolean;
  createdAt?: string;
}

export interface Batch {
  id: string;
  name: string;
  courseId: string;
  teacherId: string; // Keep for backward compatibility or primary teacher
  teacherIds?: string[]; // Support for multiple teachers
  assistantTeacherId?: string;
  studentsCount: number;
  studentIds?: string[];
  maxStudents: number;
  startDate: string;
  endDate: string;
  classDays: 'Mon-Fri' | 'Weekend' | 'Custom';
  days: string[];
  timeSlot: string;
  status: 'Active' | 'Upcoming' | 'Completed';
  createdAt?: string;
}

export interface BatchAnnouncement {
  id: string;
  batchId: string;
  title: string;
  message: string;
  type: 'Notice' | 'Update' | 'Alert';
  date: string;
  authorId: string;
}

export interface ScheduledClass {
  id: string;
  batchId: string;
  teacherId: string;
  topic: string;
  date: string;
  time: string;
  duration: string;
  link?: string;
  linkType?: 'Zoom' | 'Meet' | 'Other';
  status: 'Upcoming' | 'Live' | 'Completed';
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
  teacherId?: string;
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
  isVisibleToBatch?: boolean; // Visibility control
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
  answers?: Record<string, any>;
  feedback?: Record<string, string>;
  manualMarks?: Record<string, number>;
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
  score?: number;
  totalMarks?: number;
  url?: string;
  templateId?: string;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  instituteName: string;
  logoUrl?: string;
  backgroundUrl?: string;
  signatureUrl?: string;
  signatureName?: string;
  title: string;
  isDefault: boolean;
  createdAt: string;
  canvasData?: string; // JSON string of Konva stage for drag-and-drop editor
}

export interface Review {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  rating: number;
  comment: string;
  date: string;
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

export interface GlobalSettings {
  general: {
    siteName: string;
    siteTitle: string;
    siteUrl: string;
    faviconUrl: string;
    timezone: string;
    language: string;
  };
  branding: {
    headerLogo: string;
    footerLogo: string;
    loginLogo: string;
    adminLogo: string;
  };
  appearance: {
    primaryColor: string;
    secondaryColor: string;
    buttonColor: string;
    fontFamily: string;
    darkMode: boolean;
  };
  smtp: {
    host: string;
    email: string;
    password?: string;
    port: number;
  };
  payment: {
    razorpayKey: string;
    paytmApi: string;
    upiId: string;
    currency: string;
  };
  otp: {
    enableOtp: boolean;
    smsApi: string;
    expiryTime: number;
  };
  social: {
    facebook: string;
    instagram: string;
    linkedin: string;
    youtube: string;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    whatsappEnabled: boolean;
  };
  security: {
    passwordRules: string;
    loginLimit: number;
    recaptchaKey: string;
    enable2fa: boolean;
  };
  backup: {
    autoBackupInterval: 'Daily' | 'Weekly' | 'Monthly' | 'None';
    lastBackup?: string;
  };
  customCode: {
    headerCode: string;
    footerCode: string;
    customCss: string;
  };
}
