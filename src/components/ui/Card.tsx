import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  headerAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className, title, headerAction }) => {
  return (
    <div className={cn("bg-card border border-border rounded-2xl overflow-hidden shadow-sm", className)}>
      {title && (
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/50">
          <h3 className="font-syne font-bold text-[15px] text-white">{title}</h3>
          {headerAction}
        </div>
      )}
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  change?: string;
  trend?: 'up' | 'down';
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'red';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, value, label, change, trend, color = 'blue', onClick }) => {
  const colorMap = {
    blue: 'border-secondary/20 hover:border-secondary/50 after:bg-secondary',
    purple: 'border-accent/20 hover:border-accent/50 after:bg-accent',
    green: 'border-success/20 hover:border-success/50 after:bg-success',
    orange: 'border-warning/20 hover:border-warning/50 after:bg-warning',
    red: 'border-primary/20 hover:border-primary/50 after:bg-primary',
  };

  const iconColorMap = {
    blue: 'text-secondary',
    purple: 'text-accent',
    green: 'text-success',
    orange: 'text-warning',
    red: 'text-primary',
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-card border border-border rounded-2xl p-4 md:p-6 relative overflow-hidden transition-all duration-300 group cursor-pointer hover:-translate-y-1.5 shadow-lg shadow-black/10",
        colorMap[color],
        "after:content-[''] after:absolute after:-top-8 after:-right-8 after:w-24 after:h-24 after:rounded-full after:opacity-[0.08] after:blur-xl"
      )}
    >
      <div className={cn("text-xl md:text-2xl mb-3 md:mb-4 p-2 md:p-3 rounded-xl bg-white/5 w-fit transition-transform group-hover:scale-110 duration-300", iconColorMap[color])}>
        {icon}
      </div>
      <div className="font-syne font-extrabold text-2xl md:text-3xl mb-1 text-white tracking-tight">{value}</div>
      <div className="text-[11px] text-muted font-bold uppercase tracking-wider">{label}</div>
      {change && (
        <div className={cn(
          "mt-3 text-[11px] font-bold flex items-center gap-1.5 px-2 py-0.5 rounded-full w-fit",
          trend === 'up' ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
        )}>
          {trend === 'up' ? '▲' : '▼'} {change}
        </div>
      )}
    </div>
  );
};
