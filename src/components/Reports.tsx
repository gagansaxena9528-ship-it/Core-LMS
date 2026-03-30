import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  FileText, 
  Filter, 
  Calendar,
  Search,
  ChevronRight,
  Users,
  BookOpen,
  CreditCard,
  CheckCircle2,
  Trophy,
  UserSquare2,
  Activity,
  Settings2,
  ArrowUpDown,
  DownloadCloud,
  Check,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  PieChart,
  LayoutGrid,
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDocs } from '../services/firestore';
import { User as UserType, Course, Batch, Payment, Attendance, Exam, Teacher, Result } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ReportsProps {
  user: UserType;
}

type ReportType = 
  | 'student' 
  | 'course' 
  | 'revenue' 
  | 'attendance' 
  | 'exam' 
  | 'teacher' 
  | 'activity' 
  | 'custom';

const Reports: React.FC<ReportsProps> = ({ user }) => {
  const [activeReport, setActiveReport] = useState<ReportType>('student');
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Custom Report State
  const [customEntity, setCustomEntity] = useState<'students' | 'courses' | 'payments' | 'exams'>('students');
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const reportCards = [
    { id: 'student', title: 'Student Report', icon: <Users size={20} />, desc: 'Total, Active, New Registrations' },
    { id: 'course', title: 'Course Report', icon: <BookOpen size={20} />, desc: 'Enrollment, Completion, Popularity' },
    { id: 'revenue', title: 'Revenue Report', icon: <CreditCard size={20} />, desc: 'Total, Monthly, GST, Invoices' },
    { id: 'attendance', title: 'Attendance Report', icon: <CheckCircle2 size={20} />, desc: 'Present/Absent, Percentage' },
    { id: 'exam', title: 'Exam Report', icon: <Trophy size={20} />, desc: 'Scores, Pass/Fail, Toppers' },
    { id: 'teacher', title: 'Teacher Report', icon: <UserSquare2 size={20} />, desc: 'Classes, Feedback, Rating' },
    { id: 'activity', title: 'Activity Report', icon: <Activity size={20} />, desc: 'Login Data, Time Spent' },
    { id: 'custom', title: 'Custom Report', icon: <Settings2 size={20} />, desc: 'Select Fields, Generate' },
  ];

  // Fetch and format data based on active report
  useEffect(() => {
    fetchAndFormatData();
  }, [activeReport, customEntity, selectedFields]);

  const fetchAndFormatData = async () => {
    setLoading(true);
    try {
      let result: any[] = [];
      
      switch (activeReport) {
        case 'student': {
          const students = await getDocs('users');
          result = students.filter(u => u.role === 'student').map(s => ({
            'Student Name': s.name,
            'Email': s.email,
            'Phone': s.phone || 'N/A',
            'Course': s.course || 'N/A',
            'Batch': s.batch || 'N/A',
            'Status': s.status,
            'Joined Date': s.joined,
            'Progress': `${s.progress || 0}%`,
            'Total Fee': s.fee || 0,
            'Paid': s.paid || 0,
            'Pending': (s.fee || 0) - (s.paid || 0)
          }));
          break;
        }
        case 'course': {
          const courses = await getDocs('courses');
          result = courses.map(c => ({
            'Course Title': c.title,
            'Category': c.category,
            'Level': c.level,
            'Price': c.price,
            'Students Enrolled': c.studentsCount || 0,
            'Rating': c.rating || 0,
            'Status': c.status,
            'Created At': c.createdAt || 'N/A'
          }));
          break;
        }
        case 'revenue': {
          const payments = await getDocs('payments');
          result = payments.map(p => ({
            'Transaction ID': p.transactionId || p.id,
            'Student Name': p.studentName || 'N/A',
            'Course': p.courseName || 'N/A',
            'Amount': p.amount,
            'Mode': p.mode,
            'Date': p.date,
            'Status': p.status,
            'Ref': p.paymentApiRef || 'Manual'
          }));
          break;
        }
        case 'attendance': {
          const attendance = await getDocs('attendance');
          const users = await getDocs('users');
          result = attendance.map(a => {
            const student = users.find(u => u.uid === a.studentId);
            return {
              'Student Name': student?.name || 'Unknown',
              'Date': a.date,
              'Status': a.status,
              'Batch': student?.batch || 'N/A',
              'Course': student?.course || 'N/A'
            };
          });
          break;
        }
        case 'exam': {
          const results = await getDocs('results');
          const exams = await getDocs('exams');
          result = results.map(r => {
            const exam = exams.find(e => e.id === r.examId);
            return {
              'Student Name': r.studentName,
              'Exam Title': exam?.title || 'Unknown',
              'Score': r.score,
              'Total Marks': r.totalMarks,
              'Percentage': `${r.percentage}%`,
              'Result': r.status,
              'Date': r.date
            };
          });
          break;
        }
        case 'teacher': {
          const teachers = await getDocs('users');
          result = teachers.filter(u => u.role === 'teacher').map(t => ({
            'Teacher Name': t.name,
            'Email': t.email,
            'Rating': t.rating || 0,
            'Courses': t.coursesCount || 0,
            'Batches': t.batchesCount || 0,
            'Students': t.studentsCount || 0,
            'Status': t.status,
            'Joined': t.joined
          }));
          break;
        }
        case 'activity': {
          // Simulated activity data
          result = [
            { 'User': 'Rahul Kumar', 'Action': 'Login', 'Module': 'Dashboard', 'Time': '2024-03-20 10:00 AM', 'Duration': '45m' },
            { 'User': 'Priya Sharma', 'Action': 'Viewed Lesson', 'Module': 'Digital Marketing', 'Time': '2024-03-20 11:15 AM', 'Duration': '1h 20m' },
            { 'User': 'Arjun Patel', 'Action': 'Submitted Exam', 'Module': 'Python Basics', 'Time': '2024-03-20 02:30 PM', 'Duration': '30m' },
            { 'User': 'Sonia Singh', 'Action': 'Joined Live Class', 'Module': 'Web Dev', 'Time': '2024-03-20 04:00 PM', 'Duration': '1h 00m' },
          ];
          break;
        }
        case 'custom': {
          const entityData = await getDocs(customEntity === 'students' ? 'users' : customEntity);
          let baseData = customEntity === 'students' ? entityData.filter(u => u.role === 'student') : entityData;
          
          if (selectedFields.length > 0) {
            result = baseData.map(item => {
              const filtered: any = {};
              selectedFields.forEach(field => {
                filtered[field] = item[field];
              });
              return filtered;
            });
          } else {
            result = baseData;
          }
          
          // Update available fields for custom report
          if (baseData.length > 0) {
            setAvailableFields(Object.keys(baseData[0]).filter(k => k !== 'password' && k !== 'id'));
          }
          break;
        }
      }
      setRawData(result);
      setReportData(result);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on search and date range
  const filteredData = useMemo(() => {
    let filtered = reportData;
    
    if (searchQuery) {
      filtered = filtered.filter(item => 
        Object.values(item).some(val => 
          String(val).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(item => {
        const itemDate = item['Date'] || item['Joined Date'] || item['Created At'] || item['Joined'];
        if (!itemDate) return true;
        const d = new Date(itemDate);
        return d >= new Date(dateRange.start) && d <= new Date(dateRange.end);
      });
    }

    return filtered;
  }, [reportData, searchQuery, dateRange]);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${activeReport}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const title = `${activeReport.toUpperCase()} REPORT`;
    doc.setFontSize(18);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
    
    const headers = Object.keys(filteredData[0] || {});
    const rows = filteredData.map(item => headers.map(h => item[h]));

    (doc as any).autoTable({
      head: [headers],
      body: rows,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 142, 247], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    doc.save(`${activeReport}_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const toggleField = (field: string) => {
    setSelectedFields(prev => 
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  // Quick Stats Calculation
  const stats = useMemo(() => {
    if (activeReport === 'revenue') {
      const total = filteredData.reduce((acc, curr) => acc + (curr['Amount'] || 0), 0);
      const count = filteredData.length;
      const avg = count > 0 ? total / count : 0;
      return [
        { label: 'Total Revenue', value: `₹${total.toLocaleString()}`, icon: <TrendingUp size={16} />, color: 'text-green-500' },
        { label: 'Transactions', value: count, icon: <CreditCard size={16} />, color: 'text-blue-500' },
        { label: 'Avg. Transaction', value: `₹${Math.round(avg).toLocaleString()}`, icon: <PieChart size={16} />, color: 'text-purple-500' },
      ];
    }
    if (activeReport === 'student') {
      const total = filteredData.length;
      const active = filteredData.filter(s => s['Status'] === 'Active').length;
      const pending = filteredData.reduce((acc, curr) => acc + (curr['Pending'] || 0), 0);
      return [
        { label: 'Total Students', value: total, icon: <Users size={16} />, color: 'text-blue-500' },
        { label: 'Active Students', value: active, icon: <CheckCircle2 size={16} />, color: 'text-green-500' },
        { label: 'Total Outstanding', value: `₹${pending.toLocaleString()}`, icon: <TrendingDown size={16} />, color: 'text-red-500' },
      ];
    }
    return [
      { label: 'Total Records', value: filteredData.length, icon: <List size={16} />, color: 'text-blue-500' },
      { label: 'Last Updated', value: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), icon: <Calendar size={16} />, color: 'text-purple-500' },
      { label: 'Filter Status', value: searchQuery ? 'Filtered' : 'All Data', icon: <Filter size={16} />, color: 'text-orange-500' },
    ];
  }, [activeReport, filteredData, searchQuery]);

  return (
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <BarChart3 size={24} />
            </div>
            <h1 className="text-2xl font-syne font-bold text-white">Reports & Analytics</h1>
          </div>
          <p className="text-[#6b7599] text-sm">Comprehensive data insights and export tools for administrators</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-[#131726] border border-[#242b40] rounded-lg p-1">
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 hover:bg-[#1a2035] rounded-md text-sm font-medium transition-colors group"
            >
              <FileSpreadsheet size={16} className="text-green-500 group-hover:scale-110 transition-transform" />
              <span>Excel</span>
            </button>
            <div className="w-px h-4 bg-[#242b40] mx-1"></div>
            <button 
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 hover:bg-[#1a2035] rounded-md text-sm font-medium transition-colors group"
            >
              <FileText size={16} className="text-red-500 group-hover:scale-110 transition-transform" />
              <span>PDF</span>
            </button>
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Printer size={18} />
            Print Report
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#131726] border border-[#242b40] p-5 rounded-2xl flex items-center gap-4"
          >
            <div className={cn("w-12 h-12 rounded-xl bg-[#1a2035] flex items-center justify-center", stat.color)}>
              {stat.icon}
            </div>
            <div>
              <div className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">{stat.label}</div>
              <div className="text-2xl font-syne font-bold text-white">{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Report Selection Tabs */}
      <div className="bg-[#131726] border border-[#242b40] rounded-2xl p-2 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 min-w-max">
          {reportCards.map((card) => (
            <button
              key={card.id}
              onClick={() => setActiveReport(card.id as ReportType)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                activeReport === card.id 
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
                  : "text-[#6b7599] hover:text-[#e8ecf5] hover:bg-[#1a2035]"
              )}
            >
              {card.icon}
              <span>{card.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Sidebar / Customization */}
        <div className="xl:col-span-1 space-y-6">
          {/* Search & Date Filter */}
          <div className="bg-[#131726] border border-[#242b40] rounded-2xl p-6 space-y-4">
            <h3 className="font-syne font-bold text-white flex items-center gap-2">
              <Filter size={18} className="text-blue-500" />
              Filters
            </h3>
            
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Search Records</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7599]" size={16} />
                <input
                  type="text"
                  placeholder="Type to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Date Range</label>
              <div className="grid grid-cols-1 gap-2">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7599]" size={14} />
                  <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7599]" size={14} />
                  <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                setSearchQuery('');
                setDateRange({ start: '', end: '' });
              }}
              className="w-full py-2 text-[12px] font-bold text-[#6b7599] hover:text-white transition-colors"
            >
              Reset All Filters
            </button>
          </div>

          {/* Custom Report Builder */}
          {activeReport === 'custom' && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#131726] border border-[#242b40] rounded-2xl p-6 space-y-4"
            >
              <h3 className="font-syne font-bold text-white flex items-center gap-2">
                <Settings2 size={18} className="text-purple-500" />
                Custom Builder
              </h3>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Select Entity</label>
                <select 
                  value={customEntity}
                  onChange={(e) => setCustomEntity(e.target.value as any)}
                  className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="students">Students</option>
                  <option value="courses">Courses</option>
                  <option value="payments">Payments</option>
                  <option value="exams">Exams</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Select Fields</label>
                <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                  {availableFields.map(field => (
                    <button
                      key={field}
                      onClick={() => toggleField(field)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1.5",
                        selectedFields.includes(field)
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "bg-[#1a2035] border-[#242b40] text-[#6b7599] hover:border-[#4f8ef7]/50"
                      )}
                    >
                      {selectedFields.includes(field) ? <Check size={12} /> : <Plus size={12} />}
                      {field.replace(/([A-Z])/g, ' $1').trim()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <div className="text-[10px] text-[#6b7599] italic">
                  * Select at least one field to generate the report data.
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Report Display Table */}
        <div className="xl:col-span-3">
          <div className="bg-[#131726] border border-[#242b40] rounded-2xl overflow-hidden min-h-[600px] flex flex-col shadow-xl">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-center">
                  <p className="text-white font-bold">Processing Data</p>
                  <p className="text-[#6b7599] text-sm">Generating your {activeReport} report...</p>
                </div>
              </div>
            ) : filteredData.length > 0 ? (
              <div className="flex-1 overflow-auto scrollbar-hide">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#1a2035] border-b border-[#242b40]">
                      {Object.keys(filteredData[0]).map((header) => (
                        <th key={header} className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider whitespace-nowrap">
                          <div className="flex items-center gap-2 cursor-pointer hover:text-[#e8ecf5] transition-colors">
                            {header}
                            <ArrowUpDown size={12} />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#242b40]">
                    {filteredData.map((row, i) => (
                      <tr key={i} className="hover:bg-[#1a2035]/30 transition-colors group">
                        {Object.entries(row).map(([key, value], j) => (
                          <td key={j} className="px-6 py-4 text-[13px] text-[#e8ecf5] whitespace-nowrap">
                            {typeof value === 'boolean' ? (
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                value ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                              )}>
                                {value ? 'Yes' : 'No'}
                              </span>
                            ) : key.toLowerCase().includes('status') ? (
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                value === 'Active' || value === 'Paid' || value === 'Present' || value === 'Pass' || value === 'Published' || value === 'Live'
                                  ? "bg-green-500/10 text-green-500" 
                                  : value === 'Inactive' || value === 'Absent' || value === 'Fail' || value === 'Draft' || value === 'Archived'
                                  ? "bg-red-500/10 text-red-500"
                                  : "bg-yellow-500/10 text-yellow-500"
                              )}>
                                {String(value)}
                              </span>
                            ) : key.toLowerCase().includes('amount') || key.toLowerCase().includes('price') || key.toLowerCase().includes('fee') || key.toLowerCase().includes('paid') || key.toLowerCase().includes('pending') ? (
                              <span className="font-mono text-blue-400">₹{Number(value).toLocaleString()}</span>
                            ) : (
                              String(value)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <div className="w-20 h-20 rounded-full bg-[#1a2035] flex items-center justify-center mb-6">
                  <Search size={32} className="text-[#6b7599]" />
                </div>
                <h3 className="text-xl font-syne font-bold text-white mb-2">No records found</h3>
                <p className="text-[#6b7599] max-w-sm">
                  We couldn't find any data for the selected report and filters. Try adjusting your search or date range.
                </p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setDateRange({ start: '', end: '' });
                  }}
                  className="mt-6 px-6 py-2 bg-[#1a2035] border border-[#242b40] rounded-xl text-sm font-bold text-white hover:bg-[#242b40] transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
            
            {/* Table Footer / Pagination Info */}
            {!loading && filteredData.length > 0 && (
              <div className="p-4 border-t border-[#242b40] bg-[#1a2035]/30 flex items-center justify-between text-[12px] text-[#6b7599]">
                <div>Showing <b>{filteredData.length}</b> records</div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <DownloadCloud size={14} />
                    Ready to export
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
