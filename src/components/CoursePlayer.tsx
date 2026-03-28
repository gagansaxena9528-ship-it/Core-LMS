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
  Menu
} from 'lucide-react';
import { subscribeToCollection, getDocument } from '../services/firestore';
import { Module, Course } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CoursePlayer: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!courseId) return;

    const fetchCourse = async () => {
      const data = await getDocument('courses', courseId);
      if (data) setCourse(data as Course);
    };

    const unsubModules = subscribeToCollection('modules', (data) => {
      const courseModules = data.filter(m => m.courseId === courseId);
      setModules(courseModules);
      if (courseModules.length > 0 && !activeModule) {
        setActiveModule(courseModules[0]);
      }
    });

    fetchCourse();
    return () => unsubModules();
  }, [courseId]);

  if (!course) return null;

  return (
    <div className="flex h-[calc(100vh-120px)] -m-8 overflow-hidden">
      {/* Main Player Area */}
      <div className="flex-1 flex flex-col overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto w-full space-y-6">
          {/* Video Player */}
          <div className="aspect-video bg-black rounded-2xl overflow-hidden relative group border border-[#242b40]">
            {activeModule?.videoUrl ? (
              <iframe 
                src={activeModule.videoUrl} 
                className="w-full h-full border-none"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#6b7599] gap-4">
                <div className="w-16 h-16 rounded-full bg-[#1a2035] flex items-center justify-center">
                  <Play size={32} fill="currentColor" />
                </div>
                <p className="font-medium">Select a lesson to start learning</p>
              </div>
            )}
          </div>

          {/* Lesson Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold font-syne text-white">{activeModule?.title || 'Welcome to the Course'}</h1>
              <p className="text-sm text-[#6b7599] mt-1">
                {course.title} · Lesson {modules.indexOf(activeModule!) + 1} of {modules.length}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2.5 bg-[#131726] border border-[#242b40] rounded-xl text-[#6b7599] hover:text-[#e8ecf5] transition-all">
                <ChevronLeft size={20} />
              </button>
              <button className="bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors">
                Next Lesson <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Tabs/Content */}
          <div className="space-y-6">
            <div className="flex border-b border-[#242b40] gap-8">
              <button className="px-1 py-4 text-sm font-bold text-[#4f8ef7] border-b-2 border-[#4f8ef7]">Notes</button>
              <button className="px-1 py-4 text-sm font-medium text-[#6b7599] hover:text-[#e8ecf5]">Resources</button>
              <button className="px-1 py-4 text-sm font-medium text-[#6b7599] hover:text-[#e8ecf5]">Discussion</button>
            </div>

            <div className="bg-[#131726] border border-[#242b40] rounded-2xl p-8">
              <p className="text-[#e8ecf5] leading-relaxed text-[15px]">
                {activeModule?.description || 'No description available for this lesson.'}
              </p>
              <div className="mt-8 pt-8 border-t border-[#242b40]">
                <h3 className="font-syne font-bold text-white mb-4">Key Points</h3>
                <ul className="space-y-3">
                  {(activeModule?.keyPoints || ['Introduction to the topic', 'Core concepts and definitions', 'Practical implementation guide']).map((point, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] text-[#6b7599]">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#4f8ef7] flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Content List */}
      <div className={cn(
        "w-[320px] bg-[#131726] border-l border-[#242b40] flex flex-col transition-all duration-300",
        !sidebarOpen && "w-0 opacity-0 overflow-hidden"
      )}>
        <div className="p-5 border-b border-[#242b40] flex items-center justify-between">
          <h3 className="font-syne font-bold text-sm uppercase tracking-wider text-[#6b7599]">Course Content</h3>
          <span className="text-[11px] font-bold text-[#4f8ef7] bg-blue-500/10 px-2 py-0.5 rounded-full">
            {Math.round((modules.filter(m => false).length / modules.length) * 100 || 0)}% Done
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {modules.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setActiveModule(m)}
              className={cn(
                "w-full text-left p-4 border-b border-[#242b40] transition-colors flex gap-4 group",
                activeModule?.id === m.id ? "bg-blue-500/5" : "hover:bg-white/[0.02]"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                activeModule?.id === m.id ? "bg-[#4f8ef7] text-white" : "bg-[#1a2035] text-[#6b7599] group-hover:text-[#e8ecf5]"
              )}>
                {activeModule?.id === m.id ? <Play size={14} fill="currentColor" /> : <span className="text-xs font-bold">{i + 1}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "text-[13.5px] font-medium truncate",
                  activeModule?.id === m.id ? "text-[#4f8ef7]" : "text-[#e8ecf5]"
                )}>
                  {m.title}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-[#6b7599]">
                  <Clock size={10} /> 24:35 mins
                </div>
              </div>
              <div className="text-[#2ecc8a]">
                <CheckCircle2 size={16} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar Toggle */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-[#4f8ef7] text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50 lg:hidden"
      >
        <Menu size={20} />
      </button>
    </div>
  );
};

export default CoursePlayer;
