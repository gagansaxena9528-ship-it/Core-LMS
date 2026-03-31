import React, { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToCollection, updateDoc } from './services/firestore';
import { GlobalSettings } from './types';

interface SettingsContextType {
  settings: GlobalSettings | null;
  updateSettings: (category: keyof GlobalSettings, data: any) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const defaultSettings: GlobalSettings = {
  general: {
    siteName: 'CoreLMS',
    siteTitle: 'CoreLMS - Learning Management System',
    siteUrl: window.location.origin,
    faviconUrl: '',
    timezone: 'IST',
    language: 'English'
  },
  branding: {
    headerLogo: '',
    footerLogo: '',
    loginLogo: '',
    adminLogo: ''
  },
  appearance: {
    primaryColor: '#4f8ef7',
    secondaryColor: '#2ecc8a',
    buttonColor: '#4f8ef7',
    fontFamily: 'Poppins',
    darkMode: true
  },
  smtp: {
    host: 'smtp.gmail.com',
    email: '',
    password: '',
    port: 587
  },
  payment: {
    razorpayKey: '',
    paytmApi: '',
    upiId: '',
    currency: 'INR'
  },
  otp: {
    enableOtp: false,
    smsApi: '',
    expiryTime: 5
  },
  social: {
    facebook: '',
    instagram: '',
    linkedin: '',
    youtube: ''
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
    whatsappEnabled: false
  },
  security: {
    passwordRules: 'min 8 chars',
    loginLimit: 5,
    recaptchaKey: '',
    enable2fa: false
  },
  backup: {
    autoBackupInterval: 'Weekly',
  },
  customCode: {
    headerCode: '',
    footerCode: '',
    customCss: ''
  }
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('--- SettingsContext Initializing ---');
    // Initial apply of default settings
    applySettings(defaultSettings);

    // We'll store settings in a single document 'global' in 'settings' collection
    const unsub = subscribeToCollection('settings', (docs: any[]) => {
      console.log('--- Settings Received from Firestore ---', docs.length);
      const globalDoc = docs.find(d => d.id === 'global');
      if (globalDoc) {
        // Merge with defaults to ensure all fields exist
        const merged = { ...defaultSettings };
        Object.keys(globalDoc).forEach(key => {
          if (key !== 'id' && typeof globalDoc[key] === 'object' && globalDoc[key] !== null) {
            merged[key as keyof GlobalSettings] = { 
              ...(merged[key as keyof GlobalSettings] as any), 
              ...globalDoc[key] 
            };
          }
        });
        setSettings(merged);
        applySettings(merged);
      } else {
        console.log('--- No global settings document found, using defaults ---');
        setSettings(defaultSettings);
        applySettings(defaultSettings);
      }
      setLoading(false);
    });

    // Timeout to prevent infinite loading if firestore is slow/broken
    const timeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('--- Settings loading timed out, using defaults ---');
          setSettings(defaultSettings);
          applySettings(defaultSettings);
          return false;
        }
        return prev;
      });
    }, 5000);

    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, []);

  const applySettings = (s: GlobalSettings) => {
    if (!s) return;
    
    // 1. Apply Site Title
    if (s.general.siteTitle) {
      document.title = s.general.siteTitle;
    }

    // 2. Apply Favicon
    if (s.general.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = s.general.faviconUrl;
    }

    // 3. Apply Theme Colors & Fonts
    const root = document.documentElement;
    
    // Primary Color
    if (s.appearance.primaryColor) {
      root.style.setProperty('--color-primary', s.appearance.primaryColor);
    }
    
    // Secondary Color
    if (s.appearance.secondaryColor) {
      root.style.setProperty('--color-secondary', s.appearance.secondaryColor);
    }
    
    // Button Color
    if (s.appearance.buttonColor) {
      root.style.setProperty('--color-button', s.appearance.buttonColor);
    }
    
    // Font Family
    if (s.appearance.fontFamily) {
      root.style.setProperty('--font-sans', `"${s.appearance.fontFamily}", ui-sans-serif, system-ui, sans-serif`);
    }

    // Apply Dark Mode class
    if (s.appearance.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // 4. Apply Custom CSS & Dynamic Font Import
    let styleTag = document.getElementById('custom-settings-css');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'custom-settings-css';
      document.head.appendChild(styleTag);
    }
    
    // Inject global font import if needed (assuming Google Fonts)
    const fontName = s.appearance.fontFamily.replace(/\s+/g, '+');
    const fontImport = `@import url('https://fonts.googleapis.com/css2?family=${fontName}:wght@300;400;500;600;700;800&display=swap');`;
    
    styleTag.innerHTML = `
      ${fontImport}
      :root {
        --color-primary: ${s.appearance.primaryColor} !important;
        --color-secondary: ${s.appearance.secondaryColor} !important;
        --color-button: ${s.appearance.buttonColor} !important;
        --font-sans: "${s.appearance.fontFamily}", ui-sans-serif, system-ui, sans-serif !important;
      }
      body {
        font-family: "${s.appearance.fontFamily}", ui-sans-serif, system-ui, sans-serif !important;
      }
      /* Ensure buttons use the button color if specified */
      button.bg-primary, .btn-primary {
        background-color: ${s.appearance.buttonColor} !important;
      }
      ${s.customCode.customCss}
    `;

    // 5. Apply Custom Header/Footer Code
    const applyScripts = (code: string, id: string, position: 'head' | 'body') => {
      let scriptContainer = document.getElementById(id);
      if (scriptContainer) {
        scriptContainer.remove();
      }
      if (!code) return;

      scriptContainer = document.createElement('div');
      scriptContainer.id = id;
      scriptContainer.style.display = 'none';
      scriptContainer.innerHTML = code;
      
      // Execute scripts manually since innerHTML doesn't execute them
      const scripts = scriptContainer.getElementsByTagName('script');
      for (let i = 0; i < scripts.length; i++) {
        const newScript = document.createElement('script');
        if (scripts[i].src) {
          newScript.src = scripts[i].src;
        } else {
          newScript.textContent = scripts[i].textContent;
        }
        document.head.appendChild(newScript);
      }

      if (position === 'head') {
        document.head.appendChild(scriptContainer);
      } else {
        document.body.appendChild(scriptContainer);
      }
    };

    applyScripts(s.customCode.headerCode, 'custom-header-code', 'head');
    applyScripts(s.customCode.footerCode, 'custom-footer-code', 'body');
  };

  const updateSettings = async (category: keyof GlobalSettings, data: any) => {
    console.log(`--- Updating Settings: ${category} ---`, data);
    try {
      const currentSettings = settings;
      const currentCategoryData = currentSettings[category];
      const updatedCategoryData = { ...currentCategoryData, ...data };
      
      const updatedFullSettings = { ...currentSettings, [category]: updatedCategoryData };
      
      // Update local state immediately for snappy UI
      setSettings(updatedFullSettings);
      applySettings(updatedFullSettings);

      // We update the whole 'global' doc with the new data
      await updateDoc('settings', 'global', updatedFullSettings);
      console.log('--- Settings updated successfully ---');
    } catch (err) {
      console.error('Error updating settings:', err);
      throw err;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
