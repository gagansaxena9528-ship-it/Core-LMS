import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from './ui/Card';
import { 
  Play, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Download, 
  MessageSquare,
  Clock,
  Menu,
  Star,
  Send
} from 'lucide-react';
import { subscribeToCollection, getDocument, createDoc, updateDocument } from '../services/firestore';
import { Module, Course, Lesson, Review, User } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CoursePlayerProps {
  user?: User;
}

const CoursePlayer: React.FC<CoursePlayerProps> = ({ user }) => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'notes' | 'resources' | 'discussion' | 'reviews'>('notes');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (!courseId) return;

    const fetchCourse = async () => {
      const data = await getDocument('courses', courseId);
      if (data) setCourse(data as Course);
    };

    const unsubModules = subscribeToCollection('modules', (data) => {
      const courseModules = data.filter(m => m.courseId === courseId).sort((a, b) => a.order - b.order);
      setModules(courseModules);
    });

    const unsubLessons = subscribeToCollection('lessons', (data) => {
      const courseLessons = data.filter(l => l.courseId === courseId).sort((a, b) => a.order - b.order);
      setLessons(courseLessons);
      if (courseLessons.length > 0 && !activeLesson) {
        setActiveLesson(courseLessons[0]);
      }
    });

    const unsubReviews = subscribeToCollection('reviews', (data) => {
      setReviews(data.filter(r => r.courseId === courseId));
    });

    fetchCourse();
    return () => {
      unsubModules();
      unsubLessons();
      unsubReviews();
    };
  }, [courseId]);

  const handleLeaveReview = async () => {
    if (!user || !courseId || !course) return;
    if (!newReview.comment.trim()) return;

    setIsSubmittingReview(true);
    try {
      const reviewData: Omit<Review, 'id'> = {
        courseId,
        studentId: user.uid,
        studentName: user.name || 'Student',
        rating: newReview.rating,
        comment: newReview.comment,
        date: new Date().toISOString()
      };

      await createDoc('reviews', reviewData);

      // Update course rating
      const updatedReviews = [...reviews, { ...reviewData, id: 'temp' }];
      const totalRating = updatedReviews.reduce((acc, r) => acc + r.rating, 0);
      const avgRating = totalRating / updatedReviews.length;

      await updateDocument('courses', courseId, {
        rating: avgRating,
        reviewsCount: (course.reviewsCount || 0) + 1
      });

      setNewReview({ rating: 5, comment: '' });
      setActiveTab('reviews');
    } catch (error) {
      console.error('Error leaving review:', error);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (!course) return null;

  return (
    <div className="flex h-[calc(100vh-120px)] -m-8 overflow-hidden">
      {/* Main Player Area */}
      <div className="flex-1 flex flex-col overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto w-full space-y-6">
          {/* Video Player */}
          <div className="aspect-video bg-black rounded-2xl overflow-hidden relative group border border-border">
            {activeLesson?.videoUrl ? (
              <iframe 
                src={activeLesson.videoUrl} 
                className="w-full h-full border-none"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
                  <Play size={32} fill="currentColor" />
                </div>
                <p className="font-medium">Select a lesson to start learning</p>
              </div>
            )}
          </div>

          {/* Lesson Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold font-syne text-foreground">{activeLesson?.title || 'Welcome to the Course'}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {course.title} · Lesson {lessons.indexOf(activeLesson!) + 1} of {lessons.length}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  const currentIndex = lessons.indexOf(activeLesson!);
                  if (currentIndex > 0) setActiveLesson(lessons[currentIndex - 1]);
                }}
                className="p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-foreground transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => {
                  const currentIndex = lessons.indexOf(activeLesson!);
                  if (currentIndex < lessons.length - 1) setActiveLesson(lessons[currentIndex + 1]);
                }}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
              >
                Next Lesson <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Tabs/Content */}
          <div className="space-y-6">
            <div className="flex border-b border-border gap-8 overflow-x-auto no-scrollbar">
              <button 
                onClick={() => setActiveTab('notes')}
                className={cn(
                  "px-1 py-4 text-sm font-bold transition-all whitespace-nowrap",
                  activeTab === 'notes' ? "text-secondary border-b-2 border-secondary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Notes
              </button>
              <button 
                onClick={() => setActiveTab('resources')}
                className={cn(
                  "px-1 py-4 text-sm font-bold transition-all whitespace-nowrap",
                  activeTab === 'resources' ? "text-secondary border-b-2 border-secondary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Resources
              </button>
              <button 
                onClick={() => setActiveTab('discussion')}
                className={cn(
                  "px-1 py-4 text-sm font-bold transition-all whitespace-nowrap",
                  activeTab === 'discussion' ? "text-secondary border-b-2 border-secondary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Discussion
              </button>
              <button 
                onClick={() => setActiveTab('reviews')}
                className={cn(
                  "px-1 py-4 text-sm font-bold transition-all whitespace-nowrap",
                  activeTab === 'reviews' ? "text-secondary border-b-2 border-secondary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Reviews ({reviews.length})
              </button>
            </div>

            {activeTab === 'notes' && (
              <div className="bg-card border border-border rounded-2xl p-8">
                <p className="text-foreground leading-relaxed text-[15px]">
                  {activeLesson?.description || 'No description available for this lesson.'}
                </p>
                <div className="mt-8 pt-8 border-t border-border">
                  <h3 className="font-syne font-bold text-foreground mb-4">Key Points</h3>
                  <ul className="space-y-3">
                    {((activeLesson as any)?.keyPoints || ['Introduction to the topic', 'Core concepts and definitions', 'Practical implementation guide']).map((point: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-[14px] text-muted-foreground">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-secondary flex-shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {/* Review Form */}
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="font-syne font-bold text-foreground mb-4">Leave a Review</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                          className={cn(
                            "p-1 transition-all",
                            star <= newReview.rating ? "text-warning" : "text-border"
                          )}
                        >
                          <Star size={24} fill={star <= newReview.rating ? "currentColor" : "none"} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={newReview.comment}
                      onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                      placeholder="Share your thoughts about this course..."
                      className="w-full bg-background border border-border rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary min-h-[100px]"
                    />
                    <button
                      onClick={handleLeaveReview}
                      disabled={isSubmittingReview || !newReview.comment.trim()}
                      className="bg-secondary hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed text-secondary-foreground px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ml-auto"
                    >
                      {isSubmittingReview ? 'Posting...' : 'Post Review'}
                      <Send size={16} />
                    </button>
                  </div>
                </div>

                {/* Reviews List */}
                <div className="space-y-4">
                  {reviews.length > 0 ? reviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((review) => (
                    <div key={review.id} className="bg-card border border-border rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center text-sm font-bold text-secondary-foreground">
                            {review.studentName[0]}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-foreground">{review.studentName}</div>
                            <div className="text-[10px] text-muted-foreground">{new Date(review.date).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 text-warning">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                    </div>
                  )) : (
                    <div className="text-center py-12 bg-card border border-border rounded-2xl">
                      <Star size={48} className="mx-auto text-border mb-4" />
                      <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Content List */}
      <div className={cn(
        "w-[320px] bg-card border-l border-border flex flex-col transition-all duration-300",
        !sidebarOpen && "w-0 opacity-0 overflow-hidden"
      )}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="font-syne font-bold text-sm uppercase tracking-wider text-muted-foreground">Course Content</h3>
          <span className="text-[11px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
            {Math.round((modules.filter(m => false).length / modules.length) * 100 || 0)}% Done
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {modules.map((m, i) => (
            <div key={m.id} className="border-b border-border">
              <div className="p-4 bg-muted/5 flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{m.title}</h4>
              </div>
              <div className="divide-y divide-border/50">
                {lessons.filter(l => l.moduleId === m.id).map((l, j) => (
                  <button
                    key={l.id}
                    onClick={() => setActiveLesson(l)}
                    className={cn(
                      "w-full text-left p-4 transition-colors flex gap-4 group",
                      activeLesson?.id === l.id ? "bg-secondary/5" : "hover:bg-foreground/5"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                      activeLesson?.id === l.id ? "bg-secondary text-secondary-foreground" : "bg-card text-muted-foreground group-hover:text-foreground"
                    )}>
                      {activeLesson?.id === l.id ? <Play size={14} fill="currentColor" /> : <span className="text-xs font-bold">{j + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "text-[13.5px] font-medium truncate",
                        activeLesson?.id === l.id ? "text-secondary" : "text-foreground"
                      )}>
                        {l.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <Clock size={10} /> {l.duration || '10:00'} mins
                      </div>
                    </div>
                    <div className="text-success">
                      <CheckCircle2 size={16} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar Toggle */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-secondary text-secondary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50 lg:hidden"
      >
        <Menu size={20} />
      </button>
    </div>
  );
};

export default CoursePlayer;
