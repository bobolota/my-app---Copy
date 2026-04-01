import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function Sidebar({ 
  isSidebarCollapsed, 
  setIsSidebarCollapsed, 
  isSidebarOpen, 
  setIsSidebarOpen 
}) {
  const { activeMenu, setActiveMenu, view, setView, userSubscription } = useAppContext();

  const handleMenuClick = (menuName) => {
    setActiveMenu(menuName);
    setView('dashboard');
    setIsSidebarOpen(false); 
  };

  return (
    <aside className={`app-sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isSidebarOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        
        {/* 👇 ICI : Fini les style={{...}}, bonjour Tailwind (flex, items-center, gap-4) 👇 */}
        <div className="flex items-center gap-4">
          <span className="min-w-[25px] text-center text-2xl">🏀</span>
          
          {!isSidebarCollapsed && (
            // text-[var(--accent-orange)] permet d'utiliser tes couleurs CSS existantes !
            // font-black = fontWeight: 900 | tracking-widest = letter-spacing | text-3xl = fontSize
            <span className="text-[var(--accent-orange)] font-black tracking-widest text-3xl">
              SWISH
            </span>
          )}
        </div>
        
        <button 
          className="sidebar-toggle-btn desktop-only" 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          title={isSidebarCollapsed ? "Déplier le menu" : "Rétracter le menu"}
        >
          {isSidebarCollapsed ? '❯' : '❮'}
        </button>

        <button 
          className="sidebar-toggle-btn mobile-only" 
          onClick={() => setIsSidebarOpen(false)}
        >
          ✕
        </button>
      </div>
      
      <div className="sidebar-menu">
        <div className="menu-category">ESPACE JOUEUR</div>
        
        <button className={`menu-item ${(activeMenu === 'vestiaire' && view === 'dashboard') ? 'active' : ''}`} onClick={() => handleMenuClick('vestiaire')}>
          <span className="menu-icon">👟</span> <span className="sidebar-text">Mon Vestiaire</span>
        </button>
        <button className={`menu-item ${(activeMenu === 'mercato' && view === 'dashboard') ? 'active' : ''}`} onClick={() => handleMenuClick('mercato')}>
          <span className="menu-icon">🤝</span> <span className="sidebar-text">Le Mercato</span>
        </button>
        <button className={`menu-item ${(activeMenu === 'carriere' && view === 'dashboard') ? 'active' : ''}`} onClick={() => handleMenuClick('carriere')}>
          <span className="menu-icon">📊</span> <span className="sidebar-text">Ma Carrière</span>
        </button>

        <div className="menu-category">ÉVÉNEMENTS</div>
        <button className={`menu-item ${(activeMenu === 'explorer' && view === 'dashboard') ? 'active' : ''}`} onClick={() => handleMenuClick('explorer')}>
          <span className="menu-icon">🌍</span> <span className="sidebar-text">Explorer les tournois</span>
        </button>

        {userSubscription === 'PRO' && (
          <>
            <div className="menu-category">ADMINISTRATION</div>
            <button className={`menu-item ${(activeMenu === 'dashboard_orga' && view === 'dashboard') ? 'active' : ''}`} onClick={() => handleMenuClick('dashboard_orga')}>
              <span className="menu-icon">🛰️</span> <span className="sidebar-text">Centre de Contrôle</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}