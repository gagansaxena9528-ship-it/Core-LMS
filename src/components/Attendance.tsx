import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Download, 
  Save,
  ChevronLeft,
  ChevronRight,
  Clock,
  MoreVertical
} from 'lucide-react';
import { subscribeToCollection, addDoc, updateDoc, deleteDoc, subscribeToQuery } from '../services/firestore';
import { sendEmail, getAttendanceEmailTemplate } from '../services/emailService';
import { Attendance, Batch, Course, User as UserType, Student } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface AttendanceProps {
  user: UserType;
}

const AttendanceComponent: React.FC<AttendanceProps> = ({ user }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const unsubBatches = subscribeToCollection('batches', setBatches);
    const unsubCourses = subscribeToCollection('courses', setCourses);
    const unsubStudents = subscribeToCollection('users', (data) => {
      setStudents(data.filter(u => u.role === 'student') as Student[]);
    });
    const unsubAttendance = subscribeToCollection('attendance', setAttendanceRecords);

    return () => {
      unsubBatches();
      unsubCourses();
      unsubStudents();
      unsubAttendance();
    };
  }, []);

  useEffect(() => {
    if (batches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches]);

  const filteredStudents = students.filter(s => 
    s.batchId === selectedBatchId && 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const getAttendanceStatus = (studentId: string) => {
    const record = attendanceRecords.find(r => 
      r.studentId === studentId && 
      r.batchId === selectedBatchId && 
      r.date === selectedDate
    );
    return record?.status || null;
  };

  const handleMarkAttendance = async (studentId: string, status: 'Present' | 'Absent') => {
    const existingRecord = attendanceRecords.find(r => 
      r.studentId === studentId && 
      r.batchId === selectedBatchId && 
      r.date === selectedDate
    );

    try {
      if (existingRecord) {
        if (existingRecord.status === status) {
          await deleteDoc('attendance', existingRecord.id);
        } else {
          await updateDoc('attendance', existingRecord.id, { status });
          
          // Notify student about attendance update
          const student = students.find(s => s.id === studentId);
          const batch = batches.find(b => b.id === selectedBatchId);
          if (student && batch) {
            const html = getAttendanceEmailTemplate(student.name, selectedDate, status, batch.name);
            await sendEmail(student.email, `Attendance Update: ${status}`, html);
          }
        }
      } else {
        const batch = batches.find(b => b.id === selectedBatchId);
        await addDoc('attendance', {
          studentId,
          batchId: selectedBatchId,
          courseId: batch?.courseId || '',
          date: selectedDate,
          status
        });

        // Notify student about attendance marked
        const student = students.find(s => s.id === studentId);
        if (student && batch) {
          const html = getAttendanceEmailTemplate(student.name, selectedDate, status, batch.name);
          await sendEmail(student.email, `Attendance Marked: ${status}`, html);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAll = async (status: 'Present' | 'Absent') => {
    setLoading(true);
    try {
      for (const student of filteredStudents) {
        const existingRecord = attendanceRecords.find(r => 
          r.studentId === student.id && 
          r.batchId === selectedBatchId && 
          r.date === selectedDate
        );

        if (!existingRecord) {
          const batch = batches.find(b => b.id === selectedBatchId);
          await addDoc('attendance', {
            studentId: student.id,
            batchId: selectedBatchId,
            courseId: batch?.courseId || '',
            date: selectedDate,
            status
          });

          // Notify student
          if (batch) {
            const html = getAttendanceEmailTemplate(student.name, selectedDate, status, batch.name);
            await sendEmail(student.email, `Attendance Marked: ${status}`, html);
          }
        } else if (existingRecord.status !== status) {
          await updateDoc('attendance', existingRecord.id, { status });

          // Notify student
          const batch = batches.find(b => b.id === selectedBatchId);
          if (batch) {
            const html = getAttendanceEmailTemplate(student.name, selectedDate, status, batch.name);
            await sendEmail(student.email, `Attendance Update: ${status}`, html);
          }
        }
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: filteredStudents.length,
    present: filteredStudents.filter(s => getAttendanceStatus(s.id) === 'Present').length,
    absent: filteredStudents.filter(s => getAttendanceStatus(s.id) === 'Absent').length,
    pending: filteredStudents.filter(s => getAttendanceStatus(s.id) === null).length
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-white">Attendance Tracking</h2>
          <p className="text-sm text-[#6b7599] mt-1">Mark and manage daily student attendance</p>
        </div>
        <div className="flex items-center gap-3">
          {success && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 bg-[#2ecc8a]/10 text-[#2ecc8a] px-4 py-2 rounded-xl text-sm font-bold border border-[#2ecc8a]/20"
            >
              <CheckCircle2 size={16} /> Attendance saved
            </motion.div>
          )}
          <button className="p-2.5 bg-[#131726] border border-[#242b40] rounded-xl text-[#6b7599] hover:text-[#e8ecf5] transition-all">
            <Download size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Select Batch</label>
                <select 
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Select Date</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7599]" />
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#242b40] space-y-4">
              <h4 className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleMarkAll('Present')}
                  disabled={loading || filteredStudents.length === 0}
                  className="bg-[#2ecc8a]/10 hover:bg-[#2ecc8a]/20 text-[#2ecc8a] py-3 rounded-xl text-xs font-bold transition-all border border-[#2ecc8a]/20 disabled:opacity-50"
                >
                  Mark All Present
                </button>
                <button 
                  onClick={() => handleMarkAll('Absent')}
                  disabled={loading || filteredStudents.length === 0}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3 rounded-xl text-xs font-bold transition-all border border-red-500/20 disabled:opacity-50"
                >
                  Mark All Absent
                </button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h4 className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider mb-4">Summary for Today</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#6b7599]">Total Students</span>
                <span className="text-sm font-bold text-white">{stats.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#6b7599]">Present</span>
                <span className="text-sm font-bold text-[#2ecc8a]">{stats.present}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#6b7599]">Absent</span>
                <span className="text-sm font-bold text-red-500">{stats.absent}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#6b7599]">Pending</span>
                <span className="text-sm font-bold text-[#4f8ef7]">{stats.pending}</span>
              </div>
              <div className="pt-4 mt-4 border-t border-[#242b40]">
                <div className="w-full h-2 bg-[#1a2035] rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-[#2ecc8a] transition-all duration-500" 
                    style={{ width: `${(stats.present / stats.total) * 100 || 0}%` }} 
                  />
                  <div 
                    className="h-full bg-red-500 transition-all duration-500" 
                    style={{ width: `${(stats.absent / stats.total) * 100 || 0}%` }} 
                  />
                </div>
                <p className="text-[10px] text-[#6b7599] mt-2 text-center font-bold uppercase tracking-widest">
                  Attendance Rate: {Math.round((stats.present / (stats.present + stats.absent || 1)) * 100)}%
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Students List */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-3 bg-[#131726] border border-[#242b40] rounded-xl px-4 py-2">
            <Search size={18} className="text-[#6b7599]" />
            <input 
              type="text" 
              placeholder="Search students in this batch..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full placeholder-[#6b7599]"
            />
          </div>

          <div className="bg-[#131726] border border-[#242b40] rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#242b40] bg-[#1a2035]/50">
                  <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#6b7599] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242b40]">
                {filteredStudents.map((student) => {
                  const status = getAttendanceStatus(student.id);
                  return (
                    <tr key={student.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#1a2035] overflow-hidden border border-[#242b40]">
                            <img src={student.av} alt={student.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-[#e8ecf5]">{student.name}</div>
                            <div className="text-[11px] text-[#6b7599]">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {status === 'Present' ? (
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#2ecc8a] bg-[#2ecc8a]/10 px-3 py-1 rounded-full">
                              <CheckCircle2 size={12} /> Present
                            </span>
                          ) : status === 'Absent' ? (
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 bg-red-500/10 px-3 py-1 rounded-full">
                              <XCircle size={12} /> Absent
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#6b7599] bg-[#1a2035] px-3 py-1 rounded-full">
                              <Clock size={12} /> Pending
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleMarkAttendance(student.id, 'Present')}
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                              status === 'Present' ? "bg-[#2ecc8a] text-white shadow-lg shadow-green-500/20" : "bg-[#1a2035] text-[#6b7599] hover:text-[#2ecc8a] hover:bg-[#2ecc8a]/10"
                            )}
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleMarkAttendance(student.id, 'Absent')}
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                              status === 'Absent' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-[#1a2035] text-[#6b7599] hover:text-red-500 hover:bg-red-500/10"
                            )}
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-20 text-center">
                      <Users size={48} className="mx-auto text-[#242b40] mb-4" />
                      <p className="text-[#6b7599]">No students found in this batch</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceComponent;
