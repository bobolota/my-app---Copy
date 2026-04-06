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
    <div className={`menu-category text-[10px] font-bold uppercase tracking-[0.1em] text-[#444] mt-8 mb-3 flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-5'}`}>
      {isSidebarCollapsed ? (
        <span className="w-6 h-px bg-white/5 rounded-full"></span>
      ) : (
        <>
          <span className="w-3 h-px bg-white/10 rounded-full"></span> 
          {title}
        </>
      )}
    </div>
  );

  const MenuItem = ({ id, icon, label, isActive, colorClass }) => {
    const hoverColorClass = colorClass.split(' ')[0].replace('from-', 'text-');
    const hoverBgClass = colorClass.split(' ')[0].replace('from-', 'bg-').replace('-600', '-500/10').replace('-500', '-400/10');

    return (
      <button 
        className={`menu-item w-full flex items-center transition-all duration-200 group cursor-pointer border-none relative overflow-hidden mb-1
          ${isSidebarCollapsed 
            ? 'justify-center h-12' 
            : 'gap-3 p-2.5 px-5 rounded-xl'} 
          ${isActive && !isSidebarCollapsed ? 'text-white' : 'text-[#666] bg-transparent'}`} 
        onClick={() => handleMenuClick(id)}
      >
        {isActive && !isSidebarCollapsed && (
          <div className={`absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full bg-gradient-to-b ${colorClass}`}></div>
        )}
        
        <div className={`menu-icon flex items-center justify-center transition-all duration-200 shrink-0
          ${isSidebarCollapsed ? 'w-10 h-10 text-xl' : 'w-9 h-9 text-lg'} 
          ${isActive 
            ? `bg-gradient-to-br ${colorClass} text-white rounded-lg shadow-md` 
            : `bg-transparent text-[#555] rounded-lg group-hover:${hoverColorClass} group-hover:${hoverBgClass}`}`}>
          {icon}
        </div>
        
        {!isSidebarCollapsed && (
          <span className={`sidebar-text font-semibold text-[15px] whitespace-nowrap animate-fadeIn transition-colors ${isActive ? 'text-white' : `group-hover:${hoverColorClass}`}`}>
            {label}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside 
      className={`app-sidebar bg-[#08080a] border-r border-white/5 group transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'w-[80px] collapsed' : 'w-[280px]'} 
        ${isSidebarOpen ? 'mobile-open' : ''}`}
    >
      
      {/* HEADER COMPACT */}
      <div className={`sidebar-header flex items-center py-8 border-b border-white/5 mb-4 relative z-10 ${isSidebarCollapsed ? 'justify-center px-0' : 'px-6'}`}>
        <div 
          className={`flex items-center cursor-pointer transition-all duration-300 hover:opacity-80 active:scale-95 ${isSidebarCollapsed ? 'justify-center w-full' : 'gap-3'}`}
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        >
          <div className="text-2xl shrink-0">🏀</div>
          {!isSidebarCollapsed && (
            <span className="text-[var(--accent-orange)] font-black tracking-widest text-2xl drop-shadow-sm">
              SWISH
            </span>
          )}
        </div>
      </div>
      
      {/* MENUS SERRÉS POUR UNE LECTURE IMMÉDIATE */}
      <div className={`sidebar-menu pb-10 overflow-y-auto custom-scrollbar ${isSidebarCollapsed ? 'px-0 flex flex-col items-center' : 'px-2'}`}>
        
        <MenuCategory title="JOUEUR" />
        <MenuItem id="vestiaire" icon="👟" label="Mon Vestiaire" isActive={activeMenu === 'vestiaire' && view === 'dashboard'} colorClass="from-emerald-600 to-teal-500" />
        <MenuItem id="mercato" icon="🤝" label="Le Mercato" isActive={activeMenu === 'mercato' && view === 'dashboard'} colorClass="from-blue-600 to-indigo-500" />
        <MenuItem id="carriere" icon="📊" label="Ma Carrière" isActive={activeMenu === 'carriere' && view === 'dashboard'} colorClass="from-orange-500 to-rose-500" />

        <MenuCategory title="TOURNOIS" />
        <MenuItem id="explorer" icon="🌍" label="Explorer les tournois" isActive={activeMenu === 'explorer' && view === 'dashboard'} colorClass="from-purple-600 to-pink-500" />

        {isOtm && (
          <>
            <MenuCategory title="TABLE" />
            <MenuItem id="arbitrage" icon="哨" label="Mes Arbitrages" isActive={activeMenu === 'arbitrage' && view === 'dashboard'} colorClass="from-red-600 to-orange-600" />
          </>
        )}
        
        {userSubscription === 'PRO' && (
          <>
            <MenuCategory title="ADMIN" />
            <MenuItem id="dashboard_orga" icon="🛰️" label="Centre de Contrôle" isActive={activeMenu === 'dashboard_orga' && view === 'dashboard'} colorClass="from-zinc-700 to-zinc-500" />
          </>
        )}
      </div>
    </aside>
  );
}