// DEBUT DE LA MODIFICATION - src/components/Sidebar.jsx
import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function Sidebar({ 
  isSidebarCollapsed, 
  setIsSidebarCollapsed, 
  isSidebarOpen, 
  setIsSidebarOpen 
}) {
  const { activeMenu, setActiveMenu, view, setView, userSubscription } = useAppContext();

  // On recrée ta fonction de clic directement ici !
  const handleMenuClick = (menuName) => {
    setActiveMenu(menuName);
    setView('dashboard');
    setIsSidebarOpen(false); // Ferme automatiquement le menu sur mobile après un clic
  };

  return (
    <aside className={`app-sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isSidebarOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ minWidth: '25px', textAlign: 'center', fontSize: '1.4rem' }}>🏀</span>
          
          {!isSidebarCollapsed && (
            <span style={{ color: 'var(--accent-orange)', fontWeight: 900, letterSpacing: '2px', fontSize: '1.9rem' }}>
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
// FIN DE LA MODIFICATION