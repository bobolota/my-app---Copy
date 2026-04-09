import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient'; 

export default function Sidebar({ isSidebarCollapsed, setIsSidebarCollapsed, isSidebarOpen, setIsSidebarOpen }) {
  const { view, setView, activeMenu, setActiveMenu, tournaments, userSubscription } = useAppContext();
  const { session } = useAuth();
  
  const [myName, setMyName] = useState(null);

  useEffect(() => {
    const fetchMyName = async () => {
      if (session?.user?.id) {
        const { data } = await supabase
          .from('profiles') 
          .select('full_name')
          .eq('id', session.user.id)
          .single();
        
        if (data) setMyName(data.full_name);
      }
    };
    fetchMyName();
  }, [session]);

  const isOtm = useMemo(() => {
    if (!myName || !tournaments) return false;
    const cleanMyName = myName.trim();
    if (!cleanMyName) return false;

    return tournaments.some(t => {
      const allMatches = [...(t.schedule || []), ...(t.playoffs?.matches || [])];
      return allMatches.some(m => {
        if (!m.otm) return false;
        if (Array.isArray(m.otm)) {
          return m.otm.some(name => typeof name === 'string' && name.trim() === cleanMyName);
        } else if (typeof m.otm === 'string') {
          const otmList = m.otm.split(',').map(name => name.trim());
          return otmList.includes(cleanMyName);
        }
        return false;
      });
    });
  }, [tournaments, myName]);

  const handleMenuClick = (menuName) => {
    setActiveMenu(menuName);
    setView('dashboard');
    setIsSidebarOpen(false); 
  };

  // --- SOUS-COMPOSANTS VISUELS COMPACTS ---
  const MenuCategory = ({ title }) => (
    <div className={`menu-category text-[10px] font-bold uppercase tracking-[0.1em] text-muted-dark mt-8 mb-3 flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-5'}`}>
      {isSidebarCollapsed ? (
        <span className="w-6 h-px bg-muted-line rounded-full"></span>
      ) : (
        <>
          <span className="w-3 h-px bg-muted-line rounded-full"></span> 
          {title}
        </>
      )}
    </div>
  );

  const MenuItem = ({ id, icon, label, isActive, theme }) => {
    // Dictionnaire statique pour les classes de survol
    const themeClasses = {
      primary: {
        gradient: 'from-primary to-primary-dark',
        hoverIcon: 'group-hover:text-primary group-hover:bg-primary/10',
        hoverText: 'group-hover:text-primary'
      },
      action: {
        gradient: 'from-action to-action-dark',
        hoverIcon: 'group-hover:text-action group-hover:bg-action/10',
        hoverText: 'group-hover:text-action'
      },
      secondary: {
        gradient: 'from-secondary to-secondary-dark',
        hoverIcon: 'group-hover:text-secondary group-hover:bg-secondary/10',
        hoverText: 'group-hover:text-secondary'
      },
      danger: {
        gradient: 'from-danger to-danger-dark',
        hoverIcon: 'group-hover:text-danger group-hover:bg-danger/10',
        hoverText: 'group-hover:text-danger'
      },
      muted: {
        gradient: 'from-muted-dark to-muted',
        hoverIcon: 'group-hover:text-white group-hover:bg-white/5',
        hoverText: 'group-hover:text-white'
      }
    };

    const currentTheme = themeClasses[theme] || themeClasses.primary;

    return (
      <button 
        className={`menu-item w-full flex items-center transition-all duration-200 group cursor-pointer border-none relative overflow-hidden mb-1
          ${isSidebarCollapsed 
            ? 'justify-center h-12' 
            : 'gap-3 p-2.5 px-5 rounded-xl'} 
          ${isActive && !isSidebarCollapsed ? 'text-white' : 'text-muted bg-transparent'}`} 
        onClick={() => handleMenuClick(id)}
      >
        {isActive && !isSidebarCollapsed && (
          <div className={`absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full bg-gradient-to-b ${currentTheme.gradient}`}></div>
        )}
        
        <div className={`menu-icon flex items-center justify-center transition-all duration-200 shrink-0
          ${isSidebarCollapsed ? 'w-10 h-10 text-xl' : 'w-9 h-9 text-lg'} 
          ${isActive 
            ? `bg-gradient-to-br ${currentTheme.gradient} text-white rounded-lg shadow-md` 
            : `bg-transparent text-muted-dark rounded-lg ${currentTheme.hoverIcon}`}`}>
          {icon}
        </div>
        
        {!isSidebarCollapsed && (
          <span className={`sidebar-text font-semibold text-[15px] whitespace-nowrap animate-fadeIn transition-colors ${isActive ? 'text-white' : currentTheme.hoverText}`}>
            {label}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside 
      /* 👇 C'est ici que j'ai retiré le 'group' qui posait problème 👇 */
      className={`app-sidebar bg-app-panel border-r border-muted-line transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'w-[80px] collapsed' : 'w-[280px]'} 
        ${isSidebarOpen ? 'mobile-open' : ''}`}
    >
      
      {/* HEADER COMPACT */}
      <div className={`sidebar-header flex items-center h-16 border-b border-muted-line mb-4 relative z-10 ${isSidebarCollapsed ? 'justify-center px-0' : 'px-6'}`}>
        <div 
          className={`flex items-center cursor-pointer transition-all duration-300 hover:opacity-80 active:scale-95 ${isSidebarCollapsed ? 'justify-center w-full' : 'gap-3'}`}
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        >
          <div className="text-2xl shrink-0">🏀</div>
          {!isSidebarCollapsed && (
            <span className="text-secondary font-black tracking-widest text-2xl drop-shadow-sm">
              SWISH
            </span>
          )}
        </div>
      </div>
      
      {/* MENUS SERRÉS POUR UNE LECTURE IMMÉDIATE */}
      <div className={`sidebar-menu pb-10 overflow-y-auto custom-scrollbar ${isSidebarCollapsed ? 'px-0 flex flex-col items-center' : 'px-2'}`}>
        
        <MenuCategory title="JOUEUR" />
        <MenuItem id="vestiaire" icon="👟" label="Mon Vestiaire" isActive={activeMenu === 'vestiaire' && view === 'dashboard'} theme="primary" />
        <MenuItem id="mercato" icon="🤝" label="Le Mercato" isActive={activeMenu === 'mercato' && view === 'dashboard'} theme="action" />
        <MenuItem id="carriere" icon="📊" label="Ma Carrière" isActive={activeMenu === 'carriere' && view === 'dashboard'} theme="secondary" />

        <MenuCategory title="TOURNOIS" />
        <MenuItem id="explorer" icon="🌍" label="Explorer les tournois" isActive={activeMenu === 'explorer' && view === 'dashboard'} theme="primary" />

        {isOtm && (
          <>
            <MenuCategory title="TABLE" />
            <MenuItem id="arbitrage" icon="🖥️" label="Mes Arbitrages" isActive={activeMenu === 'arbitrage' && view === 'dashboard'} theme="danger" />
          </>
        )}
        
        {userSubscription === 'PRO' && (
          <>
            <MenuCategory title="ADMIN" />
            <MenuItem id="dashboard_orga" icon="🛰️" label="Centre de Contrôle" isActive={activeMenu === 'dashboard_orga' && view === 'dashboard'} theme="muted" />
          </>
        )}
      </div>
    </aside>
  );
}