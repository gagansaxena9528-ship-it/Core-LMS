import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  CreditCard, 
  DollarSign, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreVertical,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  User,
  BookOpen,
  Plus,
  FileText,
  Printer,
  Send,
  MessageSquare,
  Smartphone,
  QrCode,
  ExternalLink
} from 'lucide-react';
import { subscribeToCollection, updateDoc, addDoc, deleteDoc } from '../services/firestore';
import { sendEmail, getPaymentEmailTemplate } from '../services/emailService';
import { Payment, Course, User as UserType, Student, FeeStructure, Invoice } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface PaymentsProps {
  user?: UserType;
}

const Payments: React.FC<PaymentsProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'fee-structures' | 'pending'>('transactions');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Paid' | 'Partial' | 'Pending'>('All');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState({ upiId: 'gagansaxena7212@naviaxis', amount: 0, name: 'CoreLMS' });
  const [loading, setLoading] = useState(false);
  
  const [paymentFormData, setPaymentFormData] = useState({
    studentId: '',
    courseId: '',
    amount: 0,
    mode: 'UPI' as const,
    transactionId: '',
    notes: '',
    status: 'Paid' as const,
    paymentApiRef: ''
  });

  const [feeFormData, setFeeFormData] = useState({
    courseId: '',
    totalFee: 0,
    installmentOption: false,
    numberOfInstallments: 1,
    discount: 0,
    discountType: 'percentage' as const,
    upiId: 'gagansaxena7212@naviaxis'
  });

  useEffect(() => {
    const unsubPayments = subscribeToCollection('payments', setPayments);
    const unsubCourses = subscribeToCollection('courses', setCourses);
    const unsubFeeStructures = subscribeToCollection('feeStructures', setFeeStructures);
    const unsubStudents = subscribeToCollection('users', (data) => {
      setStudents(data.filter(u => u.role === 'student') as Student[]);
    });

    return () => {
      unsubPayments();
      unsubCourses();
      unsubFeeStructures();
      unsubStudents();
    };
  }, []);

  const filteredPayments = payments.filter(p => {
    if (user?.role === 'student' && p.studentId !== user.uid) return false;
    const student = students.find(s => s.uid === p.studentId);
    const matchesSearch = student?.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.id.toLowerCase().includes(search.toLowerCase()) ||
                          p.transactionId?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All' || p.status === filter;
    return matchesSearch && matchesFilter;
  });

  const pendingPayments = students.filter(s => {
    const totalFee = s.fee || 0;
    const paidAmount = s.paid || 0;
    return totalFee > paidAmount;
  }).map(s => ({
    studentId: s.uid,
    studentName: s.name,
    course: s.course || 'N/A',
    totalFee: s.fee || 0,
    paidAmount: s.paid || 0,
    pendingAmount: (s.fee || 0) - (s.paid || 0),
    phone: s.phone || ''
  }));

  const stats = {
    totalRevenue: payments.reduce((acc, p) => acc + p.amount, 0),
    pendingRevenue: pendingPayments.reduce((acc, p) => acc + p.pendingAmount, 0),
    totalTransactions: payments.length,
    successRate: Math.round((payments.filter(p => p.status === 'Paid').length / (payments.length || 1)) * 100)
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const student = students.find(s => s.uid === paymentFormData.studentId);
      const course = courses.find(c => c.id === paymentFormData.courseId);
      
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      
      const newPayment: Payment = {
        id: Math.random().toString(36).substring(2, 15),
        ...paymentFormData,
        studentName: student?.name,
        courseName: course?.title,
        date: new Date().toISOString(),
        invoiceNumber,
        totalFee: student?.fee,
        paidAmount: (student?.paid || 0) + paymentFormData.amount,
        pendingAmount: (student?.fee || 0) - ((student?.paid || 0) + paymentFormData.amount),
      };

      await addDoc('payments', newPayment, newPayment.id);
      
      // Update student record
      if (student) {
        await updateDoc('users', student.uid, {
          paid: (student.paid || 0) + paymentFormData.amount,
          pendingAmount: (student.fee || 0) - ((student.paid || 0) + paymentFormData.amount)
        });

        // Send Email
        const html = getPaymentEmailTemplate(
          student.name,
          paymentFormData.amount.toString(),
          new Date().toLocaleDateString(),
          paymentFormData.mode,
          paymentFormData.status
        );
        await sendEmail(student.email, 'Payment Receipt - Core LMS', html);
      }

      setShowPaymentModal(false);
      setPaymentFormData({ studentId: '', courseId: '', amount: 0, mode: 'UPI', transactionId: '', notes: '', status: 'Paid', paymentApiRef: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFeeStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const course = courses.find(c => c.id === feeFormData.courseId);
      const discountAmount = feeFormData.discountType === 'percentage' 
        ? (feeFormData.totalFee * feeFormData.discount) / 100 
        : feeFormData.discount;
      
      const newFee: FeeStructure = {
        id: Math.random().toString(36).substring(2, 15),
        ...feeFormData,
        courseName: course?.title || 'Unknown',
        finalFee: feeFormData.totalFee - discountAmount
      };

      await addDoc('feeStructures', newFee, newFee.id);
      setShowFeeModal(false);
      setFeeFormData({ courseId: '', totalFee: 0, installmentOption: false, numberOfInstallments: 1, discount: 0, discountType: 'percentage', upiId: 'gagansaxena7212@naviaxis' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = (payment: Payment) => {
    const doc = new jsPDF() as any;
    const student = students.find(s => s.uid === payment.studentId);
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(79, 142, 247);
    doc.text('CoreLMS', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Professional Learning Management System', 105, 26, { align: 'center' });
    
    doc.setDrawColor(200);
    doc.line(20, 35, 190, 35);
    
    // Invoice Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`INVOICE: ${payment.invoiceNumber || 'N/A'}`, 20, 45);
    doc.text(`Date: ${new Date(payment.date).toLocaleDateString()}`, 140, 45);
    
    // Student Info
    doc.setFontSize(10);
    doc.text('Bill To:', 20, 60);
    doc.setFontSize(11);
    doc.text(payment.studentName || 'N/A', 20, 66);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(student?.email || '', 20, 72);
    doc.text(student?.phone || '', 20, 78);
    
    // Table
    doc.autoTable({
      startY: 90,
      head: [['Description', 'Amount']],
      body: [
        [`Course Fee: ${payment.courseName}`, `INR ${payment.amount.toLocaleString()}`],
        ['GST (18%)', `INR ${(payment.amount * 0.18).toLocaleString()}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 142, 247] }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY;
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Paid: INR ${(payment.amount * 1.18).toLocaleString()}`, 140, finalY + 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Thank you for your payment!', 105, finalY + 40, { align: 'center' });
    
    doc.save(`Invoice_${payment.invoiceNumber}.pdf`);
  };

  const sendReminder = (student: any, type: 'SMS' | 'WhatsApp') => {
    const message = `Hi ${student.studentName}, this is a reminder for your pending fee of INR ${student.pendingAmount} for the course ${student.course}. Please pay at your earliest convenience. UPI ID: gagansaxena7212@naviaxis`;
    
    if (type === 'WhatsApp') {
      window.open(`https://wa.me/${student.phone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      alert(`SMS Reminder sent to ${student.phone}: ${message}`);
    }
  };

  const generateUPIUrl = (upiId: string, amount: number, name: string) => {
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=CourseFee`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-white">Fees & Payments</h2>
          <p className="text-sm text-[#6b7599] mt-1">Manage course fees, track transactions, and handle dues</p>
        </div>
        <div className="flex items-center gap-3">
          {user?.role !== 'student' && (
            <>
              <button 
                onClick={() => setShowFeeModal(true)}
                className="bg-[#131726] border border-[#242b40] text-[#e8ecf5] px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#1a2035] transition-all"
              >
                <Plus size={18} /> Fee Structure
              </button>
              <button 
                onClick={() => setShowPaymentModal(true)}
                className="bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
              >
                <DollarSign size={18} /> Collect Payment
              </button>
            </>
          )}
          {user?.role === 'student' && (
            <button 
              onClick={() => {
                const student = students.find(s => s.uid === user.uid);
                const pending = (student?.fee || 0) - (student?.paid || 0);
                setQrData({ upiId: 'gagansaxena7212@naviaxis', amount: pending, name: 'CoreLMS' });
                setShowQRModal(true);
              }}
              className="bg-[#2ecc8a] hover:bg-[#27af76] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-green-500/20"
            >
              <CreditCard size={18} /> Pay Now
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-[#4f8ef7]/10 to-transparent border-[#4f8ef7]/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#4f8ef7] flex items-center justify-center">
              <DollarSign size={20} />
            </div>
            <span className="text-[10px] font-bold text-[#2ecc8a] bg-[#2ecc8a]/10 px-2 py-0.5 rounded-full">+12%</span>
          </div>
          <div className="text-2xl font-extrabold text-white">₹{stats.totalRevenue.toLocaleString()}</div>
          <div className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mt-1">Total Collected</div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">Dues</span>
          </div>
          <div className="text-2xl font-extrabold text-white">₹{stats.pendingRevenue.toLocaleString()}</div>
          <div className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mt-1">Pending Dues</div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-[#2ecc8a]/10 to-transparent border-[#2ecc8a]/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#2ecc8a]/10 text-[#2ecc8a] flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <span className="text-[10px] font-bold text-[#2ecc8a] bg-[#2ecc8a]/10 px-2 py-0.5 rounded-full">Count</span>
          </div>
          <div className="text-2xl font-extrabold text-white">{stats.totalTransactions}</div>
          <div className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mt-1">Transactions</div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-[10px] font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full">Rate</span>
          </div>
          <div className="text-2xl font-extrabold text-white">{stats.successRate}%</div>
          <div className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mt-1">Collection Rate</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#131726] border border-[#242b40] rounded-xl w-fit">
        {[
          { id: 'transactions', label: 'Transactions', icon: CreditCard },
          { id: 'fee-structures', label: 'Fee Structures', icon: FileText },
          { id: 'pending', label: 'Pending Dues', icon: AlertCircle }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === tab.id ? "bg-[#4f8ef7] text-white shadow-lg shadow-blue-500/20" : "text-[#6b7599] hover:text-[#e8ecf5]"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Filter */}
      {activeTab === 'transactions' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 bg-[#131726] border border-[#242b40] rounded-xl px-4 py-2 w-full max-w-md">
            <Search size={18} className="text-[#6b7599]" />
            <input 
              type="text" 
              placeholder="Search by student, ID or transaction..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full placeholder-[#6b7599]"
            />
          </div>
          <div className="flex items-center gap-2">
            {['All', 'Paid', 'Partial', 'Pending'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  filter === f ? "bg-[#4f8ef7] text-white" : "bg-[#131726] text-[#6b7599] border border-[#242b40]"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-[#131726] border border-[#242b40] rounded-2xl overflow-hidden">
        {activeTab === 'transactions' && (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#242b40] bg-[#1a2035]/50">
                <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Transaction</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Student & Course</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Mode</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Payment API</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242b40]">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1a2035] flex items-center justify-center text-[#6b7599]">
                        <CreditCard size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#e8ecf5]">{p.invoiceNumber || `#${p.id.slice(-6).toUpperCase()}`}</div>
                        <div className="text-[10px] text-[#6b7599] font-bold uppercase tracking-wider">{new Date(p.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-bold text-[#e8ecf5]">{p.studentName}</div>
                      <div className="text-[11px] text-[#6b7599]">{p.courseName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-bold text-[#2ecc8a]">₹{p.amount.toLocaleString()}</div>
                      <div className="text-[10px] text-[#6b7599]">{p.status}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-lg bg-[#1a2035] text-[#4f8ef7] text-[10px] font-bold uppercase tracking-wider border border-[#4f8ef7]/20">
                      {p.mode}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[10px] text-[#6b7599] font-mono">
                      {p.paymentApiRef || 'Manual'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => generateInvoice(p)}
                      className="p-2 hover:bg-[#4f8ef7]/10 text-[#4f8ef7] rounded-lg transition-colors"
                      title="Download Invoice"
                    >
                      <Download size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <p className="text-[#6b7599]">No transactions found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'fee-structures' && (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#242b40] bg-[#1a2035]/50">
                <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Course</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Total Fee</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Installments</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Discount</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider text-right">Final Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242b40]">
              {feeStructures.map((fs) => (
                <tr key={fs.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-[#e8ecf5]">{fs.courseName}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#e8ecf5]">₹{fs.totalFee.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-[#e8ecf5]">
                    {fs.installmentOption ? `${fs.numberOfInstallments} Installments` : 'Single Payment'}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#e8ecf5]">
                    {fs.discount} {fs.discountType === 'percentage' ? '%' : 'INR'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-sm font-bold text-[#2ecc8a]">₹{fs.finalFee.toLocaleString()}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'pending' && (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#242b40] bg-[#1a2035]/50">
                <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Course</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Pending Amount</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider text-right">Reminders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242b40]">
              {pendingPayments.map((p) => (
                <tr key={p.studentId} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-[#e8ecf5]">{p.studentName}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#e8ecf5]">{p.course}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-red-500">₹{p.pendingAmount.toLocaleString()}</div>
                    <div className="text-[10px] text-[#6b7599]">Paid: ₹{p.paidAmount.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => sendReminder(p, 'SMS')}
                        className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-[#4f8ef7] rounded-lg transition-colors"
                        title="Send SMS"
                      >
                        <Smartphone size={16} />
                      </button>
                      <button 
                        onClick={() => sendReminder(p, 'WhatsApp')}
                        className="p-2 bg-[#2ecc8a]/10 hover:bg-[#2ecc8a]/20 text-[#2ecc8a] rounded-lg transition-colors"
                        title="Send WhatsApp"
                      >
                        <MessageSquare size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Collect Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPaymentModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-[#131726] border border-[#242b40] rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold font-syne">Collect Payment</h3>
                <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-red-500/10 text-[#6b7599] hover:text-red-500 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="mb-6 p-4 bg-[#4f8ef7]/10 border border-[#4f8ef7]/20 rounded-xl">
                <p className="text-xs text-[#4f8ef7] font-bold uppercase tracking-wider mb-2">UPI Payment Details</p>
                <p className="text-sm text-white font-medium">UPI ID: <span className="text-[#4f8ef7]">gagansaxena7212@naviaxis</span></p>
                <p className="text-[11px] text-[#6b7599] mt-1">Please pay the amount and enter details below.</p>
              </div>

              <form onSubmit={handleSavePayment} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mb-1.5 ml-1">Student</label>
                    <select required value={paymentFormData.studentId} onChange={(e) => setPaymentFormData({...paymentFormData, studentId: e.target.value})} className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] text-white">
                      <option value="">Select Student</option>
                      {students.map(s => <option key={s.uid} value={s.uid}>{s.name} ({s.email})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mb-1.5 ml-1">Course</label>
                    <select required value={paymentFormData.courseId} onChange={(e) => setPaymentFormData({...paymentFormData, courseId: e.target.value})} className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] text-white">
                      <option value="">Select Course</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mb-1.5 ml-1">Amount (INR)</label>
                      <input type="number" required value={paymentFormData.amount} onChange={(e) => setPaymentFormData({...paymentFormData, amount: parseFloat(e.target.value)})} className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] text-white" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mb-1.5 ml-1">Payment Mode</label>
                      <select value={paymentFormData.mode} onChange={(e) => setPaymentFormData({...paymentFormData, mode: e.target.value as any})} className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] text-white">
                        <option value="UPI">UPI</option>
                        <option value="Cash">Cash</option>
                        <option value="Online">Online</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mb-1.5 ml-1">Transaction ID / Reference</label>
                    <div className="flex gap-2">
                      <input type="text" value={paymentFormData.transactionId} onChange={(e) => setPaymentFormData({...paymentFormData, transactionId: e.target.value})} className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] text-white" placeholder="Enter UPI Ref or Cash Receipt No." />
                      {paymentFormData.mode === 'UPI' && (
                        <button 
                          type="button"
                          onClick={() => {
                            setQrData({ upiId: 'gagansaxena7212@naviaxis', amount: paymentFormData.amount, name: 'CoreLMS' });
                            setShowQRModal(true);
                          }}
                          className="px-4 bg-[#1a2035] border border-[#242b40] rounded-xl text-[#4f8ef7] hover:bg-[#4f8ef7]/10 transition-colors"
                          title="Show QR Code"
                        >
                          <QrCode size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mb-1.5 ml-1">Payment API Reference (Optional)</label>
                    <input type="text" value={paymentFormData.paymentApiRef} onChange={(e) => setPaymentFormData({...paymentFormData, paymentApiRef: e.target.value})} className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] text-white" placeholder="External API Reference ID" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50">
                  {loading ? 'Recording...' : 'Record Payment'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fee Structure Modal */}
      <AnimatePresence>
        {showFeeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFeeModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-[#131726] border border-[#242b40] rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold font-syne">Course Fee Structure</h3>
                <button onClick={() => setShowFeeModal(false)} className="p-2 hover:bg-red-500/10 text-[#6b7599] hover:text-red-500 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <form onSubmit={handleSaveFeeStructure} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mb-1.5 ml-1">Course</label>
                  <select required value={feeFormData.courseId} onChange={(e) => setFeeFormData({...feeFormData, courseId: e.target.value})} className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] text-white">
                    <option value="">Select Course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mb-1.5 ml-1">Total Fee (INR)</label>
                    <input type="number" required value={feeFormData.totalFee} onChange={(e) => setFeeFormData({...feeFormData, totalFee: parseFloat(e.target.value)})} className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] text-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mb-1.5 ml-1">Installments</label>
                    <input type="number" value={feeFormData.numberOfInstallments} onChange={(e) => setFeeFormData({...feeFormData, numberOfInstallments: parseInt(e.target.value), installmentOption: parseInt(e.target.value) > 1})} className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mb-1.5 ml-1">Discount</label>
                    <input type="number" value={feeFormData.discount} onChange={(e) => setFeeFormData({...feeFormData, discount: parseFloat(e.target.value)})} className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] text-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mb-1.5 ml-1">Discount Type</label>
                    <select value={feeFormData.discountType} onChange={(e) => setFeeFormData({...feeFormData, discountType: e.target.value as any})} className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] text-white">
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (INR)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mb-1.5 ml-1">UPI ID for Payments</label>
                  <input type="text" value={feeFormData.upiId} onChange={(e) => setFeeFormData({...feeFormData, upiId: e.target.value})} className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] text-white" placeholder="e.g. name@upi" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-[#2ecc8a] hover:bg-[#27af76] text-white py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50">
                  {loading ? 'Saving...' : 'Save Fee Structure'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQRModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-[#131726] border border-[#242b40] rounded-3xl p-8 text-center">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-extrabold font-syne">Scan to Pay</h3>
                <button onClick={() => setShowQRModal(false)} className="p-2 hover:bg-red-500/10 text-[#6b7599] hover:text-red-500 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="bg-white p-6 rounded-2xl inline-block mb-6 shadow-2xl shadow-blue-500/20">
                <QRCodeCanvas 
                  value={generateUPIUrl(qrData.upiId, qrData.amount, qrData.name)}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-[#6b7599] uppercase tracking-widest mb-1">Payable Amount</p>
                  <p className="text-3xl font-extrabold text-white">₹{qrData.amount.toLocaleString()}</p>
                </div>
                
                <div className="p-4 bg-[#1a2035] rounded-xl border border-[#242b40]">
                  <p className="text-[10px] font-bold text-[#6b7599] uppercase tracking-widest mb-1">UPI ID</p>
                  <p className="text-sm text-[#4f8ef7] font-mono break-all">{qrData.upiId}</p>
                </div>

                <p className="text-xs text-[#6b7599] leading-relaxed">
                  Scan this QR code using any UPI app (PhonePe, Google Pay, Paytm) to complete your payment.
                </p>

                <div className="pt-4">
                  <a 
                    href={generateUPIUrl(qrData.upiId, qrData.amount, qrData.name)}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-[#4f8ef7] text-white rounded-xl font-bold text-sm hover:bg-[#3a7ae8] transition-all"
                  >
                    <ExternalLink size={16} /> Open in App
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Payments;
