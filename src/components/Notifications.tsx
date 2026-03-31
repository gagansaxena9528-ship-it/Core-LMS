import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { 
  Bell, 
  Search, 
  Filter, 
  Send, 
  Trash2, 
  CheckCircle2, 
  Clock,
  User,
  Users,
  BookOpen,
  Mail,
  MessageSquare,
  Smartphone,
  Layers,
  X
} from 'lucide-react';
import { subscribeToCollection, addDoc, deleteDoc, subscribeToQuery } from '../services/firestore';
import { User as UserType, Course, Batch } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'All' | 'Course' | 'Batch' | 'Individual';
  targetId?: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  channels: ('Email' | 'SMS' | 'WhatsApp')[];
}

interface NotificationsProps {
  user: UserType;
}

const Notifications: React.FC<NotificationsProps> = ({ user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<UserType[]>([]);
  
  const [search, setSearch] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'All' as Notification['type'],
    targetId: '',
    channels: ['Email'] as Notification['channels']
  });

  useEffect(() => {
    const unsubNotifications = subscribeToCollection('notifications', (data) => {
      // Filter notifications relevant to the teacher (sent by them or global)
      if (user.role === 'teacher') {
        setNotifications(data.filter(n => n.senderId === user.uid || n.type === 'All'));
      } else {
        setNotifications(data);
      }
    });

    const unsubCourses = subscribeToCollection('courses', (data) => {
      if (user.role === 'teacher') {
        setCourses(data.filter(c => c.teacherId === user.uid));
      } else {
        setCourses(data);
      }
    });

    const unsubBatches = subscribeToCollection('batches', (data) => {
      if (user.role === 'teacher') {
        setBatches(data.filter(b => b.teacherId === user.uid || b.assistantTeacherId === user.uid));
      } else {
        setBatches(data);
      }
    });

    const unsubStudents = subscribeToCollection('users', (data) => {
      setStudents(data.filter(u => u.role === 'student'));
    });

    return () => {
      unsubNotifications();
      unsubCourses();
      unsubBatches();
      unsubStudents();
    };
  }, [user.uid, user.role]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc('notifications', {
        ...formData,
        senderId: user.uid,
        senderName: user.name,
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIsComposeOpen(false);
        setFormData({
          title: '',
          message: '',
          type: 'All',
          targetId: '',
          channels: ['Email']
        });
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this notification?')) {
      try {
        await deleteDoc('notifications', id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredNotifications = notifications.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.message.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-foreground">Notifications</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage and send announcements to your students</p>
        </div>
        <button 
          onClick={() => setIsComposeOpen(true)}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20"
        >
          <Send size={18} /> Send New Notification
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters & Stats */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4">Search</h4>
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search notifications..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-primary transition-colors text-foreground"
              />
            </div>
          </Card>

          <Card className="p-6">
            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4">Quick Stats</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sent Today</span>
                <span className="text-sm font-bold text-foreground">
                  {notifications.filter(n => n.createdAt.split('T')[0] === new Date().toISOString().split('T')[0]).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Sent</span>
                <span className="text-sm font-bold text-foreground">{notifications.length}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Notifications List */}
        <div className="lg:col-span-3 space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredNotifications.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <Card className="p-5 border-border group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "p-3 rounded-2xl",
                        n.type === 'All' ? "bg-primary/10 text-primary" :
                        n.type === 'Course' ? "bg-accent/10 text-accent" :
                        n.type === 'Batch' ? "bg-success/10 text-success" :
                        "bg-warning/10 text-warning"
                      )}>
                        {n.type === 'All' ? <Users size={20} /> :
                         n.type === 'Course' ? <BookOpen size={20} /> :
                         n.type === 'Batch' ? <Layers size={20} /> :
                         <User size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-bold text-foreground">{n.title}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground uppercase tracking-wider">
                            {n.type}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{n.message}</p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            <Clock size={12} /> {new Date(n.createdAt).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2">
                            {n.channels.map(c => (
                              <div key={c} className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                                {c === 'Email' ? <Mail size={10} /> :
                                 c === 'SMS' ? <Smartphone size={10} /> :
                                 <MessageSquare size={10} />}
                                {c}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(n.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredNotifications.length === 0 && (
            <div className="text-center py-20 bg-card border border-border rounded-3xl">
              <Bell size={48} className="mx-auto text-muted mb-4" />
              <p className="text-muted-foreground font-medium">No notifications found</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {isComposeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsComposeOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="text-xl font-bold font-syne text-foreground">Send Notification</h3>
                <button onClick={() => setIsComposeOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSend} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Target Audience</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['All', 'Course', 'Batch', 'Individual'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type as Notification['type'], targetId: '' })}
                        className={cn(
                          "py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                          formData.type === type 
                            ? "bg-primary border-primary text-primary-foreground" 
                            : "bg-secondary border-border text-muted-foreground hover:border-primary"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.type !== 'All' && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Select {formData.type}
                    </label>
                    <select
                      required
                      value={formData.targetId}
                      onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors text-foreground"
                    >
                      <option value="">Choose {formData.type}...</option>
                      {formData.type === 'Course' && courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                      {formData.type === 'Batch' && batches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                      {formData.type === 'Individual' && students.map(s => (
                        <option key={s.uid} value={s.uid}>{s.name} ({s.email})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Title</label>
                  <input 
                    required
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter notification title..."
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Message</label>
                  <textarea 
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Type your message here..."
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors resize-none text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Delivery Channels</label>
                  <div className="flex flex-wrap gap-3">
                    {['Email', 'SMS', 'WhatsApp'].map(channel => (
                      <label key={channel} className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="checkbox"
                          checked={formData.channels.includes(channel as any)}
                          onChange={(e) => {
                            const newChannels = e.target.checked 
                              ? [...formData.channels, channel as any]
                              : formData.channels.filter(c => c !== channel);
                            setFormData({ ...formData, channels: newChannels });
                          }}
                          className="hidden"
                        />
                        <div className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                          formData.channels.includes(channel as any)
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-secondary border-border text-muted-foreground group-hover:border-primary"
                        )}>
                          {formData.channels.includes(channel as any) && <CheckCircle2 size={12} />}
                        </div>
                        <span className="text-xs font-bold text-foreground">{channel}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : success ? (
                      <>
                        <CheckCircle2 size={18} /> Sent Successfully
                      </>
                    ) : (
                      <>
                        <Send size={18} /> Send Now
                      </>
                    )}
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

export default Notifications;
