import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MessageSquare,
  Award,
  BookOpen,
  Calendar
} from 'lucide-react';
import { subscribeToCollection } from '../services/firestore';
import { User, Teacher } from '../types';
import { motion } from 'framer-motion';

interface MyTeachersProps {
  user: User;
}

const MyTeachers: React.FC<MyTeachersProps> = ({ user }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToCollection('users', (data) => {
      // Find the current student's data in the collection to get the most up-to-date teacher assignments
      const currentStudent = data.find(u => u.uid === user.uid);
      if (!currentStudent) {
        setLoading(false);
        return;
      }

      const teacherId = currentStudent.teacherId;
      const teacherIds = currentStudent.teacherIds || [];
      
      const assignedTeachers = data.filter(u => 
        u.role === 'teacher' && 
        (u.uid === teacherId || teacherIds.includes(u.uid))
      ) as Teacher[];
      
      setTeachers(assignedTeachers);
      setLoading(false);
    });

    return () => unsub();
  }, [user.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold font-syne text-foreground">My Teachers</h2>
        <p className="text-sm text-muted mt-1">Contact and view details of your assigned instructors</p>
      </div>

      {teachers.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4 text-muted">
            <UserIcon size={32} />
          </div>
          <h3 className="text-lg font-bold text-foreground">No Teachers Assigned</h3>
          <p className="text-sm text-muted mt-2 max-w-xs mx-auto">
            You haven't been assigned any teachers yet. Please contact the administrator.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((teacher, index) => (
            <motion.div
              key={teacher.uid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden group">
                <div className="h-24 bg-gradient-to-r from-secondary/20 to-accent/20" />
                <div className="px-6 pb-6 -mt-12">
                  <div className="relative inline-block">
                    <div className="w-20 h-20 rounded-2xl bg-card border-4 border-background flex items-center justify-center text-secondary font-bold text-2xl overflow-hidden shadow-xl">
                      {teacher.profilePhoto ? (
                        <img src={teacher.profilePhoto} alt={teacher.name} className="w-full h-full object-cover" />
                      ) : (
                        teacher.name[0]
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success border-4 border-background rounded-full" />
                  </div>

                  <div className="mt-4">
                    <h3 className="text-lg font-bold text-foreground group-hover:text-secondary transition-colors">{teacher.name}</h3>
                    <p className="text-xs text-muted font-medium uppercase tracking-wider mt-0.5">{teacher.qualification || 'Instructor'}</p>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-3 text-sm text-muted">
                      <div className="w-8 h-8 rounded-lg bg-muted/20 flex items-center justify-center text-muted">
                        <Mail size={14} />
                      </div>
                      <span className="truncate">{teacher.email}</span>
                    </div>
                    {teacher.phone && (
                      <div className="flex items-center gap-3 text-sm text-muted">
                        <div className="w-8 h-8 rounded-lg bg-muted/20 flex items-center justify-center text-muted">
                          <Phone size={14} />
                        </div>
                        <span>{teacher.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-6 border-t border-border grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">{teacher.experience || '3+'}</div>
                      <div className="text-[10px] text-muted uppercase font-bold tracking-widest">Exp. Years</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">{teacher.rating || '4.9'}</div>
                      <div className="text-[10px] text-muted uppercase font-bold tracking-widest">Rating</div>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <button className="flex-1 bg-secondary hover:bg-secondary/90 text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                      <MessageSquare size={14} /> Message
                    </button>
                    <button className="w-10 h-10 bg-card border border-border rounded-xl flex items-center justify-center text-muted hover:text-foreground transition-all">
                      <Calendar size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTeachers;
