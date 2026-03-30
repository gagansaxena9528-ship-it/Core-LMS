import React, { useState } from 'react';
import { Card } from './ui/Card';
import { 
  Globe, 
  Layout, 
  Shield, 
  Bell, 
  Database, 
  Mail,
  CreditCard,
  Smartphone,
  Share2,
  Code,
  CheckCircle2,
  Image as ImageIcon,
  Palette,
  Lock,
  RefreshCw,
  Save,
  Loader2
} from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { GlobalSettings } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

const Settings: React.FC = () => {
  const { settings, updateSettings, loading: settingsLoading } = useSettings();
  const [activeTab, setActiveTab] = useState<keyof GlobalSettings>('general');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (settingsLoading || !settings) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#4f8ef7] animate-spin" />
      </div>
    );
  }

  const handleSave = async (category: keyof GlobalSettings, data: any) => {
    setSaving(true);
    try {
      await updateSettings(category, data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: keyof GlobalSettings; label: string; icon: any }[] = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'branding', label: 'Logo & Branding', icon: ImageIcon },
    { id: 'appearance', label: 'Theme & UI', icon: Palette },
    { id: 'smtp', label: 'Email (SMTP)', icon: Mail },
    { id: 'payment', label: 'Payment Gateway', icon: CreditCard },
    { id: 'otp', label: 'OTP Settings', icon: Smartphone },
    { id: 'social', label: 'Social Media', icon: Share2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'backup', label: 'Backup & Restore', icon: RefreshCw },
    { id: 'customCode', label: 'Custom Code', icon: Code },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-syne text-white">Global Settings</h2>
          <p className="text-sm text-[#6b7599] mt-1">Configure your LMS platform preferences globally</p>
        </div>
        <AnimatePresence>
          {success && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2 bg-[#2ecc8a]/10 text-[#2ecc8a] px-4 py-2 rounded-xl text-sm font-bold border border-[#2ecc8a]/20"
            >
              <CheckCircle2 size={16} /> Settings saved successfully
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Tabs Sidebar */}
        <div className="w-full lg:w-[260px] space-y-1">
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
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Website Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      defaultValue={settings.general.siteName}
                      onBlur={(e) => handleSave('general', { siteName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Website Title</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      defaultValue={settings.general.siteTitle}
                      onBlur={(e) => handleSave('general', { siteTitle: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Website URL</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      defaultValue={settings.general.siteUrl}
                      onBlur={(e) => handleSave('general', { siteUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Favicon URL</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      defaultValue={settings.general.faviconUrl}
                      onBlur={(e) => handleSave('general', { faviconUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Timezone</label>
                    <select 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      defaultValue={settings.general.timezone}
                      onChange={(e) => handleSave('general', { timezone: e.target.value })}
                    >
                      <option value="UTC">UTC</option>
                      <option value="IST">IST (India Standard Time)</option>
                      <option value="EST">EST</option>
                      <option value="PST">PST</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Language</label>
                    <select 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] transition-colors"
                      defaultValue={settings.general.language}
                      onChange={(e) => handleSave('general', { language: e.target.value })}
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Spanish">Spanish</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'branding' && (
              <div className="space-y-8">
                <div className="border-b border-[#242b40] pb-6">
                  <h3 className="text-lg font-bold text-white mb-1">Logo & Branding</h3>
                  <p className="text-sm text-[#6b7599]">Manage logos for different parts of the application</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Header Logo URL</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.branding.headerLogo}
                      onBlur={(e) => handleSave('branding', { headerLogo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Footer Logo URL</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.branding.footerLogo}
                      onBlur={(e) => handleSave('branding', { footerLogo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Login Page Logo URL</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.branding.loginLogo}
                      onBlur={(e) => handleSave('branding', { loginLogo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Admin Panel Logo URL</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.branding.adminLogo}
                      onBlur={(e) => handleSave('branding', { adminLogo: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-8">
                <div className="border-b border-[#242b40] pb-6">
                  <h3 className="text-lg font-bold text-white mb-1">Theme & UI</h3>
                  <p className="text-sm text-[#6b7599]">Customize the visual style of your platform</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Primary Color</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        className="w-10 h-10 rounded-lg bg-[#1a2035] border border-[#242b40] p-1 cursor-pointer"
                        defaultValue={settings.appearance.primaryColor}
                        onChange={(e) => handleSave('appearance', { primaryColor: e.target.value })}
                      />
                      <input 
                        type="text" 
                        className="flex-1 bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2 text-sm outline-none focus:border-[#4f8ef7]"
                        defaultValue={settings.appearance.primaryColor}
                        onBlur={(e) => handleSave('appearance', { primaryColor: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Secondary Color</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        className="w-10 h-10 rounded-lg bg-[#1a2035] border border-[#242b40] p-1 cursor-pointer"
                        defaultValue={settings.appearance.secondaryColor}
                        onChange={(e) => handleSave('appearance', { secondaryColor: e.target.value })}
                      />
                      <input 
                        type="text" 
                        className="flex-1 bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2 text-sm outline-none focus:border-[#4f8ef7]"
                        defaultValue={settings.appearance.secondaryColor}
                        onBlur={(e) => handleSave('appearance', { secondaryColor: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Button Color</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        className="w-10 h-10 rounded-lg bg-[#1a2035] border border-[#242b40] p-1 cursor-pointer"
                        defaultValue={settings.appearance.buttonColor}
                        onChange={(e) => handleSave('appearance', { buttonColor: e.target.value })}
                      />
                      <input 
                        type="text" 
                        className="flex-1 bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-2 text-sm outline-none focus:border-[#4f8ef7]"
                        defaultValue={settings.appearance.buttonColor}
                        onBlur={(e) => handleSave('appearance', { buttonColor: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Font Family</label>
                    <select 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.appearance.fontFamily}
                      onChange={(e) => handleSave('appearance', { fontFamily: e.target.value })}
                    >
                      <option value="Poppins">Poppins</option>
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Syne">Syne</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Dark/Light Mode</label>
                    <div className="flex items-center gap-4 p-3 bg-[#1a2035] border border-[#242b40] rounded-xl">
                      <span className="text-sm text-white font-bold">Enable Dark Mode</span>
                      <button 
                        onClick={() => handleSave('appearance', { darkMode: !settings.appearance.darkMode })}
                        className={cn(
                          "ml-auto w-12 h-6 rounded-full transition-all relative",
                          settings.appearance.darkMode ? "bg-[#4f8ef7]" : "bg-[#242b40]"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                          settings.appearance.darkMode ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'smtp' && (
              <div className="space-y-8">
                <div className="border-b border-[#242b40] pb-6">
                  <h3 className="text-lg font-bold text-white mb-1">Email (SMTP) Settings</h3>
                  <p className="text-sm text-[#6b7599]">Configure SMTP for OTPs and system notifications</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">SMTP Host</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.smtp.host}
                      onBlur={(e) => handleSave('smtp', { host: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">SMTP Port</label>
                    <input 
                      type="number" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.smtp.port}
                      onBlur={(e) => handleSave('smtp', { port: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Email ID</label>
                    <input 
                      type="email" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.smtp.email}
                      onBlur={(e) => handleSave('smtp', { email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Password</label>
                    <input 
                      type="password" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.smtp.password}
                      onBlur={(e) => handleSave('smtp', { password: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="space-y-8">
                <div className="border-b border-[#242b40] pb-6">
                  <h3 className="text-lg font-bold text-white mb-1">Payment Gateway</h3>
                  <p className="text-sm text-[#6b7599]">Configure your payment processing details</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Razorpay API Key</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.payment.razorpayKey}
                      onBlur={(e) => handleSave('payment', { razorpayKey: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Paytm API Key</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.payment.paytmApi}
                      onBlur={(e) => handleSave('payment', { paytmApi: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">UPI ID</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.payment.upiId}
                      onBlur={(e) => handleSave('payment', { upiId: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Currency</label>
                    <select 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.payment.currency}
                      onChange={(e) => handleSave('payment', { currency: e.target.value })}
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'otp' && (
              <div className="space-y-8">
                <div className="border-b border-[#242b40] pb-6">
                  <h3 className="text-lg font-bold text-white mb-1">OTP Settings</h3>
                  <p className="text-sm text-[#6b7599]">Configure OTP login and SMS integration</p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-[#1a2035] border border-[#242b40] rounded-xl">
                    <div>
                      <h4 className="text-sm font-bold text-white">Enable OTP Login</h4>
                      <p className="text-xs text-[#6b7599]">Allow users to login via mobile OTP</p>
                    </div>
                    <button 
                      onClick={() => handleSave('otp', { enableOtp: !settings.otp.enableOtp })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        settings.otp.enableOtp ? "bg-[#4f8ef7]" : "bg-[#242b40]"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                        settings.otp.enableOtp ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">SMS API Key (Twilio/Fast2SMS)</label>
                      <input 
                        type="text" 
                        className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                        defaultValue={settings.otp.smsApi}
                        onBlur={(e) => handleSave('otp', { smsApi: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">OTP Expiry (Minutes)</label>
                      <input 
                        type="number" 
                        className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                        defaultValue={settings.otp.expiryTime}
                        onBlur={(e) => handleSave('otp', { expiryTime: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'social' && (
              <div className="space-y-8">
                <div className="border-b border-[#242b40] pb-6">
                  <h3 className="text-lg font-bold text-white mb-1">Social Media Links</h3>
                  <p className="text-sm text-[#6b7599]">Connect your platform with social networks</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Facebook URL</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.social.facebook}
                      onBlur={(e) => handleSave('social', { facebook: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Instagram URL</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.social.instagram}
                      onBlur={(e) => handleSave('social', { instagram: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">LinkedIn URL</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.social.linkedin}
                      onBlur={(e) => handleSave('social', { linkedin: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">YouTube URL</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.social.youtube}
                      onBlur={(e) => handleSave('social', { youtube: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-8">
                <div className="border-b border-[#242b40] pb-6">
                  <h3 className="text-lg font-bold text-white mb-1">Notifications</h3>
                  <p className="text-sm text-[#6b7599]">Manage communication channels</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#1a2035] border border-[#242b40] rounded-xl">
                    <div className="flex items-center gap-3">
                      <Mail className="text-[#4f8ef7]" size={20} />
                      <div>
                        <h4 className="text-sm font-bold text-white">Email Notifications</h4>
                        <p className="text-xs text-[#6b7599]">Send system alerts via email</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleSave('notifications', { emailEnabled: !settings.notifications.emailEnabled })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        settings.notifications.emailEnabled ? "bg-[#4f8ef7]" : "bg-[#242b40]"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                        settings.notifications.emailEnabled ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#1a2035] border border-[#242b40] rounded-xl">
                    <div className="flex items-center gap-3">
                      <Smartphone className="text-[#2ecc8a]" size={20} />
                      <div>
                        <h4 className="text-sm font-bold text-white">SMS Notifications</h4>
                        <p className="text-xs text-[#6b7599]">Send system alerts via SMS</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleSave('notifications', { smsEnabled: !settings.notifications.smsEnabled })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        settings.notifications.smsEnabled ? "bg-[#4f8ef7]" : "bg-[#242b40]"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                        settings.notifications.smsEnabled ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#1a2035] border border-[#242b40] rounded-xl">
                    <div className="flex items-center gap-3">
                      <Share2 className="text-[#25d366]" size={20} />
                      <div>
                        <h4 className="text-sm font-bold text-white">WhatsApp Notifications</h4>
                        <p className="text-xs text-[#6b7599]">Send system alerts via WhatsApp</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleSave('notifications', { whatsappEnabled: !settings.notifications.whatsappEnabled })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        settings.notifications.whatsappEnabled ? "bg-[#4f8ef7]" : "bg-[#242b40]"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                        settings.notifications.whatsappEnabled ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8">
                <div className="border-b border-[#242b40] pb-6">
                  <h3 className="text-lg font-bold text-white mb-1">Security Settings</h3>
                  <p className="text-sm text-[#6b7599]">Manage platform security and access rules</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Password Rules</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.security.passwordRules}
                      onBlur={(e) => handleSave('security', { passwordRules: e.target.value })}
                      placeholder="e.g. min 8 chars, 1 uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Login Attempt Limit</label>
                    <input 
                      type="number" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.security.loginLimit}
                      onBlur={(e) => handleSave('security', { loginLimit: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">reCAPTCHA Site Key</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.security.recaptchaKey}
                      onBlur={(e) => handleSave('security', { recaptchaKey: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Two-Factor Authentication (2FA)</label>
                    <div className="flex items-center gap-4 p-3 bg-[#1a2035] border border-[#242b40] rounded-xl">
                      <span className="text-sm text-white font-bold">Enable 2FA</span>
                      <button 
                        onClick={() => handleSave('security', { enable2fa: !settings.security.enable2fa })}
                        className={cn(
                          "ml-auto w-12 h-6 rounded-full transition-all relative",
                          settings.security.enable2fa ? "bg-[#4f8ef7]" : "bg-[#242b40]"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                          settings.security.enable2fa ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'backup' && (
              <div className="space-y-8">
                <div className="border-b border-[#242b40] pb-6">
                  <h3 className="text-lg font-bold text-white mb-1">Backup & Restore</h3>
                  <p className="text-sm text-[#6b7599]">Manage your data backups and restoration</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Auto Backup Interval</label>
                    <select 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7]"
                      defaultValue={settings.backup.autoBackupInterval}
                      onChange={(e) => handleSave('backup', { autoBackupInterval: e.target.value })}
                    >
                      <option value="None">None</option>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button className="flex-1 flex items-center justify-center gap-2 bg-[#4f8ef7] hover:bg-[#3a7ae8] text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20">
                      <Database size={18} /> Manual Backup Now
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 bg-[#1a2035] border border-[#242b40] hover:bg-[#242b40] text-white py-3 rounded-xl font-bold text-sm transition-all">
                      <RefreshCw size={18} /> Restore from File
                    </button>
                  </div>

                  {settings.backup.lastBackup && (
                    <p className="text-xs text-[#6b7599] text-center">
                      Last successful backup: {new Date(settings.backup.lastBackup).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'customCode' && (
              <div className="space-y-8">
                <div className="border-b border-[#242b40] pb-6">
                  <h3 className="text-lg font-bold text-white mb-1">Custom Code</h3>
                  <p className="text-sm text-[#6b7599]">Inject custom scripts and CSS into your platform</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Header Code (Google Analytics, etc.)</label>
                    <textarea 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] font-mono h-32"
                      defaultValue={settings.customCode.headerCode}
                      onBlur={(e) => handleSave('customCode', { headerCode: e.target.value })}
                      placeholder="<script>...</script>"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Footer Code</label>
                    <textarea 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] font-mono h-32"
                      defaultValue={settings.customCode.footerCode}
                      onBlur={(e) => handleSave('customCode', { footerCode: e.target.value })}
                      placeholder="<script>...</script>"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6b7599] uppercase tracking-wider">Custom CSS</label>
                    <textarea 
                      className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4f8ef7] font-mono h-32"
                      defaultValue={settings.customCode.customCss}
                      onBlur={(e) => handleSave('customCode', { customCss: e.target.value })}
                      placeholder=".my-class { color: red; }"
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
