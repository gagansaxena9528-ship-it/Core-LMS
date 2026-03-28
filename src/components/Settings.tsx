import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { 
  Settings as SettingsIcon, 
  Globe, 
  Mail, 
  Shield, 
  Bell, 
  Database, 
  Save,
  Smartphone,
  CreditCard,
  Layout,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { subscribeToCollection, updateDoc } from '../services/firestore';
import { Setting } from '../types';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const unsub = subscribeToCollection('settings', setSettings);
    return () => unsub();
  }, []);

  const getSetting = (key: string) => settings.find(s => s.key === key)?.value || '';

  const handleUpdateSetting = async (key: string, value: any) => {
    setLoading(true);
    try {
      await updateDoc('settings', key, { value });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'appearance', label: 'Appearance', icon: Layout },
    { id: 'auth', label: 'Authentication', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'system', label: 'System', icon: Database },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-white">System Settings</h2>
          <p className="text-sm text-[#6b7599] mt-1">Configure your LMS platform preferences</p>
        </div>
        {success && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 bg-[#2ecc8a]/10 text-[#2ecc8a] px-4 py-2 rounded-xl text-sm font-bold border border-[#2ecc8a]/20"
          >
            <CheckCircle2 size={16} /> Settings saved successfully
          </motion.div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Tabs Sidebar */}
        <div className="w-full lg:w-[240px] space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === tab.id 
                  ? "bg-[#4f8ef7] text-white shadow-lg shadow-blue-500/20" 
                  : "text-[#6b7599] hover:text-[#e8ecf5] hover:bg-[#131726]"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          <Card className="p-8">
            {activeTab === 'general' && (
              <div className="space-y-8">
                <div className="border-b border-[#242b40] pb-6">
                  <h3 className="text-lg font-bold text-white mb-1">General Configuration</h3>
                  <p className="text-sm text-[#6b7599]">Basic information about your LMS platform</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Site Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      defaultValue={getSetting('site_name')}
                      onBlur={(e) => handleUpdateSetting('site_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Support Email</label>
                    <input 
                      type="email" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      defaultValue={getSetting('support_email')}
                      onBlur={(e) => handleUpdateSetting('support_email', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Contact Phone</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      defaultValue={getSetting('contact_phone')}
                      onBlur={(e) => handleUpdateSetting('contact_phone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Timezone</label>
                    <select 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      defaultValue={getSetting('timezone')}
                      onChange={(e) => handleUpdateSetting('timezone', e.target.value)}
                    >
                      <option value="UTC">UTC (Universal Coordinated Time)</option>
                      <option value="EST">EST (Eastern Standard Time)</option>
                      <option value="PST">PST (Pacific Standard Time)</option>
                      <option value="IST">IST (India Standard Time)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Footer Copyright Text</label>
                  <input 
                    type="text" 
                    className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                    defaultValue={getSetting('footer_text')}
                    onBlur={(e) => handleUpdateSetting('footer_text', e.target.value)}
                  />
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-8">
                <div className="border-b border-[#242b40] pb-6">
                  <h3 className="text-lg font-bold text-white mb-1">Visual Branding</h3>
                  <p className="text-sm text-[#6b7599]">Customize the look and feel of your platform</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Primary Brand Color</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="color" 
                        className="w-12 h-12 rounded-lg bg-[#1a2035] border border-[#242b40] p-1 cursor-pointer"
                        defaultValue={getSetting('primary_color')}
                        onChange={(e) => handleUpdateSetting('primary_color', e.target.value)}
                      />
                      <input 
                        type="text" 
                        className="flex-1 bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                        defaultValue={getSetting('primary_color')}
                        onBlur={(e) => handleUpdateSetting('primary_color', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Logo URL (Light Mode)</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      placeholder="https://..."
                      defaultValue={getSetting('logo_url')}
                      onBlur={(e) => handleUpdateSetting('logo_url', e.target.value)}
                    />
                  </div>
                </div>

                <div className="p-6 bg-[#1a2035] border border-[#242b40] rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 text-[#4f8ef7] flex items-center justify-center">
                    <Layout size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Dark Mode by Default</h4>
                    <p className="text-xs text-[#6b7599] mt-0.5">Force dark mode for all users on the platform</p>
                  </div>
                  <button 
                    onClick={() => handleUpdateSetting('force_dark_mode', !getSetting('force_dark_mode'))}
                    className={cn(
                      "ml-auto w-12 h-6 rounded-full transition-all relative",
                      getSetting('force_dark_mode') ? "bg-[#4f8ef7]" : "bg-[#242b40]"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                      getSetting('force_dark_mode') ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'auth' && (
              <div className="space-y-8">
                <div className="border-b border-[#242b40] pb-6">
                  <h3 className="text-lg font-bold text-white mb-1">Security & Auth</h3>
                  <p className="text-sm text-[#6b7599]">Manage user registration and login security</p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-[#1a2035] border border-[#242b40] rounded-xl">
                    <div>
                      <h4 className="text-sm font-bold text-white">Allow Public Registration</h4>
                      <p className="text-xs text-[#6b7599]">Let anyone sign up for an account</p>
                    </div>
                    <button 
                      onClick={() => handleUpdateSetting('allow_registration', !getSetting('allow_registration'))}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        getSetting('allow_registration') ? "bg-[#4f8ef7]" : "bg-[#242b40]"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                        getSetting('allow_registration') ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#1a2035] border border-[#242b40] rounded-xl">
                    <div>
                      <h4 className="text-sm font-bold text-white">Email Verification</h4>
                      <p className="text-xs text-[#6b7599]">Require users to verify their email address</p>
                    </div>
                    <button 
                      onClick={() => handleUpdateSetting('require_email_verification', !getSetting('require_email_verification'))}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        getSetting('require_email_verification') ? "bg-[#4f8ef7]" : "bg-[#242b40]"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                        getSetting('require_email_verification') ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Placeholder for other tabs */}
            {['notifications', 'payments', 'system'].includes(activeTab) && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-[#1a2035] text-[#6b7599] flex items-center justify-center mb-4">
                  <SettingsIcon size={32} />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-widest font-syne">Coming Soon</h3>
                <p className="text-sm text-[#6b7599] mt-2 max-w-xs">
                  We're working on bringing advanced {activeTab} settings to your dashboard.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
