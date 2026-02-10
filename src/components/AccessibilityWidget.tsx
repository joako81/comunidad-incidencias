import React, { useState, useEffect } from 'react';
import { Accessibility, Eye, Moon, Sun, Type, MoveVertical, Brain } from 'lucide-react';

const AccessibilityWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState({
    darkMode: false,
    largeText: false,
    dyslexia: false,
    adhd: false,
    highContrast: false,
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cvc38_a11y');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  // Handle Mouse Movement for ADHD Spotlight
  useEffect(() => {
    if (settings.adhd) {
        const handleMouseMove = (e: MouseEvent) => {
            document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
            document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [settings.adhd]);

  // Apply classes to HTML tag (documentElement) for better root scaling
  useEffect(() => {
    const root = document.documentElement;
    
    // Theme
    if (settings.darkMode) root.classList.add('dark-mode');
    else root.classList.remove('dark-mode');

    // High Contrast (Low Vision)
    if (settings.highContrast) root.classList.add('high-contrast');
    else root.classList.remove('high-contrast');

    // Text Size
    if (settings.largeText) root.classList.add('large-text');
    else root.classList.remove('large-text');

    // Dyslexia
    if (settings.dyslexia) root.classList.add('dyslexic-font');
    else root.classList.remove('dyslexic-font');

    // ADHD
    if (settings.adhd) root.classList.add('adhd-focus');
    else root.classList.remove('adhd-focus');

    // Save
    localStorage.setItem('cvc38_a11y', JSON.stringify(settings));

  }, [settings]);

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => {
        // Exclusive logic: High Contrast forces Dark Mode off visually in CSS, but let's manage state cleanly
        const newState = { ...prev, [key]: !prev[key] };
        
        // If High Contrast is turned on, ensure Dark Mode doesn't conflict logic (though CSS handles it)
        if (key === 'highContrast' && newState.highContrast) {
            newState.darkMode = false;
        }
        return newState;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 bg-white dark:bg-neutral-800 border border-wood/30 rounded-lg shadow-2xl p-4 w-64 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="flex justify-between items-center mb-4 border-b border-neutral-200 dark:border-neutral-700 pb-2">
            <h3 className="font-bold text-wood">Accesibilidad</h3>
            <button onClick={() => setSettings({
                darkMode: false, largeText: false, dyslexia: false, adhd: false, highContrast: false
            })} className="text-xs text-neutral-500 hover:text-wood underline">
                Restablecer
            </button>
          </div>
          
          <div className="space-y-3">
             <button 
                onClick={() => toggleSetting('darkMode')}
                className={`w-full flex items-center justify-between p-2 rounded border border-transparent ${settings.darkMode ? 'bg-wood text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-wood/30'}`}
             >
                <div className="flex items-center gap-2">
                    {settings.darkMode ? <Moon size={18}/> : <Sun size={18}/>}
                    <span className="text-sm font-medium">Modo Oscuro</span>
                </div>
                <div className={`w-3 h-3 rounded-full ${settings.darkMode ? 'bg-white' : 'border border-neutral-400'}`}></div>
             </button>

             <button 
                onClick={() => toggleSetting('largeText')}
                className={`w-full flex items-center justify-between p-2 rounded border border-transparent ${settings.largeText ? 'bg-wood text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-wood/30'}`}
             >
                <div className="flex items-center gap-2">
                    <Type size={18}/>
                    <span className="text-sm font-medium">Letra Grande</span>
                </div>
                <div className={`w-3 h-3 rounded-full ${settings.largeText ? 'bg-white' : 'border border-neutral-400'}`}></div>
             </button>

             <button 
                onClick={() => toggleSetting('dyslexia')}
                className={`w-full flex items-center justify-between p-2 rounded border border-transparent ${settings.dyslexia ? 'bg-wood text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-wood/30'}`}
             >
                <div className="flex items-center gap-2">
                    <span className="font-bold text-sm italic">Dys</span>
                    <span className="text-sm font-medium">Fuente Dislexia</span>
                </div>
                <div className={`w-3 h-3 rounded-full ${settings.dyslexia ? 'bg-white' : 'border border-neutral-400'}`}></div>
             </button>

             <button 
                onClick={() => toggleSetting('adhd')}
                className={`w-full flex items-center justify-between p-2 rounded border border-transparent ${settings.adhd ? 'bg-wood text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-wood/30'}`}
             >
                <div className="flex items-center gap-2">
                    <Brain size={18}/>
                    <span className="text-sm font-medium">Modo TDAH</span>
                </div>
                <div className={`w-3 h-3 rounded-full ${settings.adhd ? 'bg-white' : 'border border-neutral-400'}`}></div>
             </button>

             <button 
                onClick={() => toggleSetting('highContrast')}
                className={`w-full flex items-center justify-between p-2 rounded ${settings.highContrast ? 'bg-white text-black border-2 border-black font-bold' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-transparent hover:border-wood/30'}`}
             >
                <div className="flex items-center gap-2">
                    <Eye size={18}/>
                    <span className="text-sm font-medium">Baja Visión (B/N)</span>
                </div>
                <div className={`w-3 h-3 rounded-full ${settings.highContrast ? 'bg-black' : 'border border-neutral-400'}`}></div>
             </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-wood hover:bg-wood-light text-white shadow-lg flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-wood/50"
        aria-label="Opciones de Accesibilidad"
        title="Opciones de Accesibilidad"
      >
        <Accessibility size={28} />
      </button>
    </div>
  );
};

export default AccessibilityWidget;