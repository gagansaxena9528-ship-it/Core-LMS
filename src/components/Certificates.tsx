import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, 
  Plus, 
  Search, 
  Download, 
  Share2, 
  Eye, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  XCircle, 
  Settings, 
  Layout as LayoutIcon,
  FileText,
  User,
  BookOpen,
  Calendar,
  ShieldCheck,
  QrCode,
  Mail,
  MessageSquare,
  ChevronRight,
  MoreVertical,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { subscribeToCollection, addDoc, updateDoc, deleteDoc } from '../services/firestore';
import { Certificate, CertificateTemplate, Student, Course, Result, User as UserType } from '../types';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';

interface CertificatesProps {
  user: UserType;
}

const Certificates: React.FC<CertificatesProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'certificates' | 'templates' | 'verification'>('certificates');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);
  
  const [formData, setFormData] = useState({
    studentId: '',
    courseId: '',
    templateId: '',
    issueDate: format(new Date(), 'yyyy-MM-dd'),
    grade: '',
    score: 0,
    totalMarks: 0
  });

  const [templateData, setTemplateData] = useState<Partial<CertificateTemplate>>({
    name: '',
    instituteName: 'CoreLMS Institute',
    title: 'Certificate of Completion',
    signatureName: 'Director',
    isDefault: false
  });

  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubCerts = subscribeToCollection('certificates', setCertificates);
    const unsubTemplates = subscribeToCollection('certificateTemplates', setTemplates);
    const unsubStudents = subscribeToCollection('students', setStudents);
    const unsubCourses = subscribeToCollection('courses', setCourses);
    const unsubResults = subscribeToCollection('results', setResults);

    return () => {
      unsubCerts();
      unsubTemplates();
      unsubStudents();
      unsubCourses();
      unsubResults();
    };
  }, []);

  const handleGenerateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const student = students.find(s => s.uid === formData.studentId);
      const course = courses.find(c => c.id === formData.courseId);
      
      if (!student || !course) return;

      const certId = `CERT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const newCert: Omit<Certificate, 'id'> = {
        studentId: student.uid,
        studentName: student.name,
        courseId: course.id,
        courseName: course.title,
        issueDate: formData.issueDate,
        certificateId: certId,
        grade: formData.grade,
        score: formData.score,
        totalMarks: formData.totalMarks,
        templateId: formData.templateId || templates.find(t => t.isDefault)?.id
      };

      await addDoc('certificates', newCert);
      setShowGenerateModal(false);
      setFormData({
        studentId: '',
        courseId: '',
        templateId: '',
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        grade: '',
        score: 0,
        totalMarks: 0
      });
    } catch (error) {
      console.error('Error generating certificate:', error);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (templateData.id) {
        await updateDoc('certificateTemplates', templateData.id, templateData);
      } else {
        await addDoc('certificateTemplates', {
          ...templateData,
          createdAt: new Date().toISOString()
        });
      }
      setShowTemplateModal(false);
      setTemplateData({
        name: '',
        instituteName: 'CoreLMS Institute',
        title: 'Certificate of Completion',
        signatureName: 'Director',
        isDefault: false
      });
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleDeleteCertificate = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this certificate?')) {
      await deleteDoc('certificates', id);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      await deleteDoc('certificateTemplates', id);
    }
  };

  const downloadPDF = async (cert: Certificate) => {
    const template = templates.find(t => t.id === cert.templateId) || templates.find(t => t.isDefault);
    if (!template) return;

    // Create a temporary element for PDF generation
    const element = document.createElement('div');
    element.style.width = '800px';
    element.style.padding = '40px';
    element.style.background = 'white';
    element.style.border = '20px solid #f3f4f6';
    element.style.textAlign = 'center';
    element.style.fontFamily = 'serif';

    element.innerHTML = `
      <div style="border: 2px solid #e5e7eb; padding: 40px;">
        <h1 style="font-size: 48px; color: #1f2937; margin-bottom: 8px;">${template.instituteName}</h1>
        <div style="width: 100px; height: 2px; background: #3b82f6; margin: 20px auto;"></div>
        <h2 style="font-size: 24px; color: #4b5563; text-transform: uppercase; letter-spacing: 2px;">${template.title}</h2>
        <p style="font-size: 18px; color: #6b7280; margin-top: 40px;">This is to certify that</p>
        <h3 style="font-size: 36px; color: #111827; margin: 20px 0;">${cert.studentName}</h3>
        <p style="font-size: 18px; color: #6b7280;">has successfully completed the course</p>
        <h4 style="font-size: 28px; color: #1f2937; margin: 20px 0;">${cert.courseName}</h4>
        <p style="font-size: 16px; color: #6b7280; margin-top: 40px;">Issued on: ${format(new Date(cert.issueDate), 'MMMM dd, yyyy')}</p>
        <p style="font-size: 14px; color: #9ca3af;">Certificate ID: ${cert.certificateId}</p>
        
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 60px;">
          <div style="text-align: center;">
            <div style="width: 150px; border-bottom: 1px solid #d1d5db; margin-bottom: 8px;"></div>
            <p style="font-size: 14px; color: #4b5563;">${template.signatureName}</p>
          </div>
          <div id="qr-code-container"></div>
        </div>
      </div>
    `;

    document.body.appendChild(element);
    
    try {
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${cert.studentName}-${cert.courseName}-Certificate.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      document.body.removeChild(element);
    }
  };

  const filteredCertificates = certificates.filter(c => 
    c.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.certificateId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [verificationId, setVerificationId] = useState('');
  const [verificationResult, setVerificationResult] = useState<Certificate | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = () => {
    if (!verificationId.trim()) return;
    setIsVerifying(true);
    const cert = certificates.find(c => c.certificateId === verificationId.trim());
    setVerificationResult(cert || null);
    setIsVerifying(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Award className="w-8 h-8 text-secondary" />
            Certificates Management
          </h1>
          <p className="text-muted">Design, generate, and manage student certificates</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="px-4 py-2 bg-muted/10 text-foreground rounded-lg hover:bg-muted/20 transition-colors flex items-center gap-2"
          >
            <LayoutIcon className="w-4 h-4" />
            Templates
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors flex items-center gap-2 shadow-lg shadow-secondary/20"
          >
            <Plus className="w-4 h-4" />
            Generate Certificate
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-card/50 rounded-xl w-fit border border-border">
        <button
          onClick={() => setActiveTab('certificates')}
          className={clsx(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
            activeTab === 'certificates' ? "bg-secondary text-white shadow-lg" : "text-muted hover:text-foreground hover:bg-muted/10"
          )}
        >
          <FileText className="w-4 h-4" />
          All Certificates
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={clsx(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
            activeTab === 'templates' ? "bg-secondary text-white shadow-lg" : "text-muted hover:text-foreground hover:bg-muted/10"
          )}
        >
          <LayoutIcon className="w-4 h-4" />
          Templates
        </button>
        <button
          onClick={() => setActiveTab('verification')}
          className={clsx(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
            activeTab === 'verification' ? "bg-secondary text-white shadow-lg" : "text-muted hover:text-foreground hover:bg-muted/10"
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          Verification
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={clsx(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
            activeTab === 'settings' ? "bg-secondary text-white shadow-lg" : "text-muted hover:text-foreground hover:bg-muted/10"
          )}
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {activeTab === 'certificates' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                placeholder="Search by student, course or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-secondary transition-colors"
              />
            </div>
            <button className="px-4 py-2 bg-card border border-border text-muted rounded-lg hover:text-foreground hover:border-muted transition-all flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>

          <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/5 text-muted text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Student</th>
                  <th className="px-6 py-4 font-semibold">Course</th>
                  <th className="px-6 py-4 font-semibold">Certificate ID</th>
                  <th className="px-6 py-4 font-semibold">Issue Date</th>
                  <th className="px-6 py-4 font-semibold">Grade</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCertificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-muted/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-secondary" />
                        </div>
                        <span className="text-foreground font-medium">{cert.studentName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-foreground/80">{cert.courseName}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-muted/10 text-secondary rounded text-xs font-mono">
                        {cert.certificateId}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted text-sm">
                      {format(new Date(cert.issueDate), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-success/10 text-success rounded text-xs font-bold">
                        {cert.grade || 'A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => downloadPDF(cert)}
                          className="p-2 text-muted hover:text-secondary hover:bg-secondary/10 rounded-lg transition-all"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-2 text-muted hover:text-success hover:bg-success/10 rounded-lg transition-all"
                          title="Share"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCertificate(cert.id)}
                          className="p-2 text-muted hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCertificates.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted">
                      No certificates found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-card/50 border border-border rounded-xl p-6 space-y-4 group hover:border-secondary/50 transition-all">
              <div className="aspect-video bg-muted/10 rounded-lg border border-border flex items-center justify-center relative overflow-hidden">
                {template.backgroundUrl ? (
                  <img src={template.backgroundUrl} alt="Background" className="w-full h-full object-cover" />
                ) : (
                  <LayoutIcon className="w-12 h-12 text-muted" />
                )}
                {template.isDefault && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-secondary text-white text-[10px] font-bold rounded uppercase tracking-wider">
                    Default
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-foreground font-semibold">{template.name}</h3>
                <p className="text-sm text-muted">{template.instituteName}</p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setTemplateData(template);
                      setShowTemplateModal(true);
                    }}
                    className="p-2 text-muted hover:text-foreground hover:bg-muted/10 rounded-lg transition-all"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 text-muted hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {!template.isDefault && (
                  <button 
                    onClick={() => updateDoc('certificateTemplates', template.id, { isDefault: true })}
                    className="text-xs text-secondary hover:underline font-medium"
                  >
                    Set as Default
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              setTemplateData({
                name: '',
                instituteName: 'CoreLMS Institute',
                title: 'Certificate of Completion',
                signatureName: 'Director',
                isDefault: false
              });
              setShowTemplateModal(true);
            }}
            className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-muted hover:border-secondary/50 hover:text-secondary transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center group-hover:bg-secondary/10 transition-all">
              <Plus className="w-6 h-6" />
            </div>
            <span className="font-medium">Create New Template</span>
          </button>
        </div>
      )}

      {activeTab === 'verification' && (
        <div className="max-w-2xl mx-auto space-y-8 py-12">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-10 h-10 text-secondary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">Certificate Verification</h2>
            <p className="text-muted">Enter a certificate ID to verify its authenticity and view student details.</p>
          </div>

          <div className="bg-card/50 border border-border rounded-2xl p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted uppercase tracking-wider">Certificate ID</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="e.g. CERT-ABC123XYZ"
                  value={verificationId}
                  onChange={(e) => setVerificationId(e.target.value)}
                  className="flex-1 px-4 py-3 bg-card border border-border rounded-xl text-foreground text-lg font-mono focus:outline-none focus:border-secondary transition-all"
                />
                <button 
                  onClick={handleVerify}
                  className="px-8 py-3 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 transition-all shadow-lg shadow-secondary/20"
                >
                  Verify
                </button>
              </div>
            </div>

            {verificationResult ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-success/5 border border-success/20 rounded-xl space-y-4"
              >
                <div className="flex items-center gap-3 text-success">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="font-bold text-lg">Valid Certificate Found</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted uppercase text-[10px] font-bold">Student</p>
                    <p className="text-foreground font-medium">{verificationResult.studentName}</p>
                  </div>
                  <div>
                    <p className="text-muted uppercase text-[10px] font-bold">Course</p>
                    <p className="text-foreground font-medium">{verificationResult.courseName}</p>
                  </div>
                  <div>
                    <p className="text-muted uppercase text-[10px] font-bold">Issue Date</p>
                    <p className="text-foreground font-medium">{format(new Date(verificationResult.issueDate), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-muted uppercase text-[10px] font-bold">Grade</p>
                    <p className="text-foreground font-medium">{verificationResult.grade || 'A'}</p>
                  </div>
                </div>
              </motion.div>
            ) : verificationId && !isVerifying && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-destructive/5 border border-destructive/20 rounded-xl flex items-center gap-3 text-destructive"
              >
                <XCircle className="w-6 h-6" />
                <span className="font-bold">No certificate found with this ID</span>
              </motion.div>
            )}

            <div className="pt-6 border-t border-border">
              <h4 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">Verification Features</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: QrCode, title: 'QR Code Support', desc: 'Scan to verify instantly' },
                  { icon: ShieldCheck, title: 'Tamper Proof', desc: 'Secure digital signatures' },
                  { icon: BookOpen, title: 'Course Details', desc: 'View full curriculum info' },
                  { icon: Calendar, title: 'Issue History', desc: 'Track issuance timeline' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-muted/5 rounded-lg border border-border">
                    <item.icon className="w-5 h-5 text-secondary shrink-0" />
                    <div>
                      <p className="text-foreground text-sm font-medium">{item.title}</p>
                      <p className="text-muted text-xs">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Certificate Modal */}
      <AnimatePresence>
        {showGenerateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Award className="w-6 h-6 text-secondary" />
                  Generate New Certificate
                </h2>
                <button 
                  onClick={() => setShowGenerateModal(false)}
                  className="p-2 text-muted hover:text-foreground hover:bg-muted/10 rounded-lg transition-all"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleGenerateCertificate} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted uppercase tracking-wider">Select Student</label>
                    <select
                      required
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      className="w-full px-4 py-2 bg-muted/5 border border-border rounded-lg text-foreground focus:outline-none focus:border-secondary"
                    >
                      <option value="">Select Student</option>
                      {students.map(s => (
                        <option key={s.uid} value={s.uid}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted uppercase tracking-wider">Select Course</label>
                    <select
                      required
                      value={formData.courseId}
                      onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                      className="w-full px-4 py-2 bg-muted/5 border border-border rounded-lg text-foreground focus:outline-none focus:border-secondary"
                    >
                      <option value="">Select Course</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted uppercase tracking-wider">Issue Date</label>
                    <input
                      type="date"
                      required
                      value={formData.issueDate}
                      onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                      className="w-full px-4 py-2 bg-muted/5 border border-border rounded-lg text-foreground focus:outline-none focus:border-secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted uppercase tracking-wider">Template</label>
                    <select
                      value={formData.templateId}
                      onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                      className="w-full px-4 py-2 bg-muted/5 border border-border rounded-lg text-foreground focus:outline-none focus:border-secondary"
                    >
                      <option value="">Default Template</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted uppercase tracking-wider">Grade (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. A+, Distinction"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full px-4 py-2 bg-muted/5 border border-border rounded-lg text-foreground focus:outline-none focus:border-secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted uppercase tracking-wider">Score (Optional)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Score"
                        value={formData.score}
                        onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-muted/5 border border-border rounded-lg text-foreground focus:outline-none focus:border-secondary"
                      />
                      <span className="text-muted">/</span>
                      <input
                        type="number"
                        placeholder="Total"
                        value={formData.totalMarks}
                        onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-muted/5 border border-border rounded-lg text-foreground focus:outline-none focus:border-secondary"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="px-6 py-2 bg-muted/10 text-foreground rounded-lg hover:bg-muted/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-secondary text-white font-bold rounded-lg hover:bg-secondary/90 transition-all shadow-lg shadow-secondary/20"
                  >
                    Generate & Issue
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Template Modal */}
      <AnimatePresence>
        {showTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <LayoutIcon className="w-6 h-6 text-secondary" />
                  {templateData.id ? 'Edit Template' : 'Create New Template'}
                </h2>
                <button 
                  onClick={() => setShowTemplateModal(false)}
                  className="p-2 text-muted hover:text-foreground hover:bg-muted/10 rounded-lg transition-all"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSaveTemplate} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted uppercase tracking-wider">Template Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Standard Completion"
                      value={templateData.name}
                      onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })}
                      className="w-full px-4 py-2 bg-muted/5 border border-border rounded-lg text-foreground focus:outline-none focus:border-secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted uppercase tracking-wider">Institute Name</label>
                    <input
                      type="text"
                      required
                      value={templateData.instituteName}
                      onChange={(e) => setTemplateData({ ...templateData, instituteName: e.target.value })}
                      className="w-full px-4 py-2 bg-muted/5 border border-border rounded-lg text-foreground focus:outline-none focus:border-secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted uppercase tracking-wider">Certificate Title</label>
                    <input
                      type="text"
                      required
                      value={templateData.title}
                      onChange={(e) => setTemplateData({ ...templateData, title: e.target.value })}
                      className="w-full px-4 py-2 bg-muted/5 border border-border rounded-lg text-foreground focus:outline-none focus:border-secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted uppercase tracking-wider">Signature Name/Role</label>
                    <input
                      type="text"
                      required
                      value={templateData.signatureName}
                      onChange={(e) => setTemplateData({ ...templateData, signatureName: e.target.value })}
                      className="w-full px-4 py-2 bg-muted/5 border border-border rounded-lg text-foreground focus:outline-none focus:border-secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted uppercase tracking-wider">Logo URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={templateData.logoUrl}
                      onChange={(e) => setTemplateData({ ...templateData, logoUrl: e.target.value })}
                      className="w-full px-4 py-2 bg-muted/5 border border-border rounded-lg text-foreground focus:outline-none focus:border-secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted uppercase tracking-wider">Background URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={templateData.backgroundUrl}
                      onChange={(e) => setTemplateData({ ...templateData, backgroundUrl: e.target.value })}
                      className="w-full px-4 py-2 bg-muted/5 border border-border rounded-lg text-foreground focus:outline-none focus:border-secondary"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={templateData.isDefault}
                    onChange={(e) => setTemplateData({ ...templateData, isDefault: e.target.checked })}
                    className="w-4 h-4 bg-muted/5 border-border rounded text-secondary focus:ring-secondary"
                  />
                  <label htmlFor="isDefault" className="text-sm text-muted">Set as default template for all courses</label>
                </div>

                <div className="pt-6 border-t border-border flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(false)}
                    className="px-6 py-2 bg-muted/10 text-foreground rounded-lg hover:bg-muted/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-secondary text-white font-bold rounded-lg hover:bg-secondary/90 transition-all shadow-lg shadow-secondary/20"
                  >
                    {templateData.id ? 'Update Template' : 'Create Template'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {activeTab === 'settings' && (
        <div className="max-w-4xl mx-auto space-y-8 py-12">
          <div className="bg-card/50 border border-border rounded-2xl p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-foreground">Auto Certificate Issuance</h3>
                <p className="text-muted">Automatically issue certificates when students complete a course and pass the final exam.</p>
              </div>
              <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-muted/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-secondary/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
              </div>
            </div>

            <div className="space-y-4 pt-8 border-t border-border">
              <h4 className="text-sm font-medium text-muted uppercase tracking-wider">Issuance Conditions</h4>
              <div className="space-y-3">
                {[
                  { label: 'Course Progress = 100%', enabled: true },
                  { label: 'Final Exam Passed', enabled: true },
                  { label: 'All Assignments Submitted', enabled: false },
                  { label: 'Minimum Attendance (80%)', enabled: false }
                ].map((condition, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-muted/5 rounded-xl border border-border">
                    <span className="text-foreground font-medium">{condition.label}</span>
                    <input 
                      type="checkbox" 
                      defaultChecked={condition.enabled}
                      className="w-4 h-4 bg-muted/5 border-border rounded text-secondary focus:ring-secondary"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8 border-t border-border flex justify-end">
              <button className="px-8 py-3 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 transition-all shadow-lg shadow-secondary/20">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Certificates;
