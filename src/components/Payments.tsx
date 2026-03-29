import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
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
  BookOpen
} from 'lucide-react';
import { subscribeToCollection, updateDoc, addDoc } from '../services/firestore';
import { sendEmail, getPaymentEmailTemplate } from '../services/emailService';
import { Payment, Course, User as UserType, Student } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { X } from 'lucide-react';

interface PaymentsProps {
  user?: UserType;
}

const Payments: React.FC<PaymentsProps> = ({ user }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Paid' | 'Partial' | 'Pending'>('All');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    courseId: '',
    total: 0,
    paid: 0,
    method: 'Cash',
    status: 'Pending' as const
  });

  useEffect(() => {
    const unsubPayments = subscribeToCollection('payments', setPayments);
    const unsubCourses = subscribeToCollection('courses', setCourses);
    const unsubStudents = subscribeToCollection('users', (data) => {
      setStudents(data.filter(u => u.role === 'student') as Student[]);
    });

    return () => {
      unsubPayments();
      unsubCourses();
      unsubStudents();
    };
  }, []);

  const filteredPayments = payments.filter(p => {
    // If student, only show their own payments
    if (user?.role === 'student' && p.studentId !== user.uid) return false;

    const student = students.find(s => s.id === p.studentId);
    const matchesSearch = student?.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.id.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All' || p.status === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalRevenue: payments.reduce((acc, p) => acc + p.paid, 0),
    pendingRevenue: payments.reduce((acc, p) => acc + p.pending, 0),
    totalTransactions: payments.length,
    successRate: Math.round((payments.filter(p => p.status === 'Paid').length / (payments.length || 1)) * 100)
  };

  const userRole = (window as any).userRole || 'admin'; // Fallback if not passed, but we should use props

  const handleUpdateStatus = async (id: string, status: 'Paid' | 'Partial' | 'Pending') => {
    try {
      await updateDoc('payments', id, { status });
      
      // Notify student about payment status update
      const payment = payments.find(p => p.id === id);
      if (payment) {
        const student = students.find(s => s.id === payment.studentId);
        if (student) {
          const html = getPaymentEmailTemplate(
            student.name,
            payment.paid.toString(),
            payment.date,
            payment.method,
            status
          );
          await sendEmail(student.email, `Payment Status Updated: ${status}`, html);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newPayment = {
        ...formData,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        pending: formData.total - formData.paid
      };
      const docRef = await addDoc('payments', newPayment);
      
      // Notify student about new payment record
      const student = students.find(s => s.id === formData.studentId);
      if (student) {
        const html = getPaymentEmailTemplate(
          student.name,
          formData.paid.toString(),
          newPayment.date,
          formData.method,
          formData.status
        );
        await sendEmail(student.email, 'Payment Receipt - Core LMS', html);
      }

      setShowModal(false);
      setFormData({ studentId: '', courseId: '', total: 0, paid: 0, method: 'Cash', status: 'Pending' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-white">Financial Management</h2>
          <p className="text-sm text-[#6b7599] mt-1">Track course sales, student payments, and revenue</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-[#131726] border border-[#242b40] text-[#e8ecf5] px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#1a2035] transition-all">
            <Download size={18} /> Export Report
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
          >
            <DollarSign size={18} /> Add Payment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-[#4f8ef7]/10 to-transparent border-[#4f8ef7]/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#4f8ef7] flex items-center justify-center">
              <DollarSign size={20} />
            </div>
            <span className="text-[10px] font-bold text-[#2ecc8a] bg-[#2ecc8a]/10 px-2 py-0.5 rounded-full">+12%</span>
          </div>
          <div className="text-2xl font-extrabold text-white">₹{stats.totalRevenue.toLocaleString()}</div>
          <div className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mt-1">Total Revenue</div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">-5%</span>
          </div>
          <div className="text-2xl font-extrabold text-white">₹{stats.pendingRevenue.toLocaleString()}</div>
          <div className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mt-1">Pending Dues</div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-[#2ecc8a]/10 to-transparent border-[#2ecc8a]/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#2ecc8a]/10 text-[#2ecc8a] flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <span className="text-[10px] font-bold text-[#2ecc8a] bg-[#2ecc8a]/10 px-2 py-0.5 rounded-full">+8%</span>
          </div>
          <div className="text-2xl font-extrabold text-white">{stats.totalTransactions}</div>
          <div className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mt-1">Transactions</div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-[10px] font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full">Stable</span>
          </div>
          <div className="text-2xl font-extrabold text-white">{stats.successRate}%</div>
          <div className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mt-1">Success Rate</div>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 bg-[#131726] border border-[#242b40] rounded-xl px-4 py-2 w-full max-w-md">
          <Search size={18} className="text-[#6b7599]" />
          <input 
            type="text" 
            placeholder="Search by student name or ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full placeholder-[#6b7599]"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          {['All', 'Paid', 'Partial', 'Pending'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                filter === f ? "bg-[#4f8ef7] text-white" : "bg-[#131726] text-[#6b7599] hover:text-[#e8ecf5] border border-[#242b40]"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#131726] border border-[#242b40] rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#242b40] bg-[#1a2035]/50">
              <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Transaction</th>
              <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Student & Course</th>
              <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#242b40]">
            {filteredPayments.map((p) => {
              const student = students.find(s => s.id === p.studentId);
              const course = courses.find(c => c.id === p.courseId);
              return (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1a2035] flex items-center justify-center text-[#6b7599]">
                        <CreditCard size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#e8ecf5]">#{p.id.slice(-6).toUpperCase()}</div>
                        <div className="text-[10px] text-[#6b7599] font-bold uppercase tracking-wider">{p.date}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 text-[#4f8ef7] flex items-center justify-center">
                        <User size={14} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#e8ecf5]">{student?.name || 'Unknown Student'}</div>
                        <div className="text-[11px] text-[#6b7599]">{course?.title || 'Unknown Course'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-bold text-[#2ecc8a]">₹{p.paid}</div>
                      <div className="text-[10px] text-[#6b7599]">of ₹{p.total}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {['Paid', 'Partial', 'Pending'].map((s) => (
                        <button
                          key={s}
                          onClick={() => handleUpdateStatus(p.id, s as any)}
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all",
                            p.status === s ? (
                              s === 'Paid' ? "bg-[#2ecc8a] text-white" : 
                              s === 'Partial' ? "bg-orange-500 text-white" : 
                              "bg-red-500 text-white"
                            ) : "bg-[#1a2035] text-[#6b7599] hover:text-white"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-[#1a2035] rounded-lg text-[#6b7599] transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredPayments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center">
                  <DollarSign size={48} className="mx-auto text-[#242b40] mb-4" />
                  <p className="text-[#6b7599]">No payment records found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Payment Modal */}
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
              className="relative w-full max-w-lg bg-[#131726] border border-[#242b40] rounded-2xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold font-syne">Add New Payment</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-red-500/10 text-[#6b7599] hover:text-red-500 rounded-full transition-colors">
                  <X size={20} />
                </button>
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
                    <select 
                      required
                      value={formData.studentId}
                      onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-colors text-white"
                    >
                      <option value="">Select Student</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mb-1.5 ml-1">Course</label>
                    <select 
                      required
                      value={formData.courseId}
                      onChange={(e) => setFormData({...formData, courseId: e.target.value})}
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-colors text-white"
                    >
                      <option value="">Select Course</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mb-1.5 ml-1">Total Fee</label>
                      <input 
                        type="number" 
                        required
                        value={formData.total}
                        onChange={(e) => setFormData({...formData, total: parseFloat(e.target.value)})}
                        className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-colors text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mb-1.5 ml-1">Paid Amount</label>
                      <input 
                        type="number" 
                        required
                        value={formData.paid}
                        onChange={(e) => setFormData({...formData, paid: parseFloat(e.target.value)})}
                        className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-colors text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mb-1.5 ml-1">Method</label>
                      <select 
                        value={formData.method}
                        onChange={(e) => setFormData({...formData, method: e.target.value})}
                        className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-colors text-white"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Online">Online</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="UPI">UPI</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mb-1.5 ml-1">Status</label>
                      <select 
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                        className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-colors text-white"
                      >
                        <option value="Paid">Paid</option>
                        <option value="Partial">Partial</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Record Payment'}
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

export default Payments;
