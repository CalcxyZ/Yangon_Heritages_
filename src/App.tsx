/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, 
  Map as MapIcon, 
  User as UserIcon, 
  Lock, 
  Unlock, 
  LogOut, 
  Globe, 
  Sparkles,
  Info
} from 'lucide-react';
import { HeritageSite, UserState } from './types';
import { backend, isFirebaseConfigured } from './lib/firebase';
import { DEFAULT_HERITAGE_SITES } from './data/defaultSites';
import MapComponent from './components/MapComponent';
import SiteList from './components/SiteList';
import CmsPanel from './components/CmsPanel';
import StoryMapTab from './components/StoryMapTab';
import AuthModal from './components/AuthModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'map'>('home');
  const [sites, setSites] = useState<HeritageSite[]>(DEFAULT_HERITAGE_SITES);
  const [selectedSite, setSelectedSite] = useState<HeritageSite | null>(null);
  const [user, setUser] = useState<UserState | null>(null);
  
  // Modals / Overlays state
  const [isCmsOpen, setIsCmsOpen] = useState(false);
  const [siteToEdit, setSiteToEdit] = useState<HeritageSite | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // GPS tracking
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  // Load local static data & optional cleanups
  useEffect(() => {
    // Keep list set to the default static Yangon sites explicitly
    setSites(DEFAULT_HERITAGE_SITES);
  }, []);

  // Geolocation trigger with graceful sandbox iframe bypass
  const handleGpsTrigger = () => {
    setIsGpsLoading(true);
    if (!navigator.geolocation) {
      // If geolocation API completely absent
      setUserCoords({ latitude: 16.7983, longitude: 96.1497 }); // Centered near Shwedagon Pagoda
      setIsGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setIsGpsLoading(false);
      },
      (error) => {
        console.warn("Native geolocation blocked or timed out inside frame sandbox. Activating near Shwedagon Pagoda for testing.", error);
        // Fallback to high value coordinate set so user distance math is fully functional inside dry frames
        setUserCoords({
          latitude: 16.7983, 
          longitude: 96.1497
        });
        setIsGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // CMS Handlers
  const handleOpenAddSite = () => {
    setSiteToEdit(null);
    setIsCmsOpen(true);
  };

  const handleOpenEditSite = (site: HeritageSite) => {
    setSiteToEdit(site);
    setIsCmsOpen(true);
  };

  const handleSaveSite = async (site: HeritageSite) => {
    try {
      if (siteToEdit) {
        await backend.updateSite(site, user?.uid);
      } else {
        await backend.addSite(site, user?.uid);
      }
      setIsCmsOpen(false);
      setSiteToEdit(null);
    } catch (err) {
      console.error("Failed to save site:", err);
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (confirm("Are you sure you want to remove this curated landmark from the heritage record?")) {
      try {
        await backend.deleteSite(siteId);
        if (selectedSite?.id === siteId) {
          setSelectedSite(null);
        }
      } catch (err) {
        console.error("Deletion failed:", err);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await backend.logout();
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div id="heritage-app-root" className="min-h-screen w-full bg-[#e8ecef] flex flex-col items-center justify-center p-0 sm:p-4 md:p-8 font-sans relative overflow-x-hidden">
      
      {/* Smartphone Outer Container simulation */}
      <div className="w-full max-w-lg bg-white/40 backdrop-blur-2xl min-h-screen sm:min-h-[850px] sm:max-h-[920px] sm:rounded-[3.5rem] sm:shadow-[0_32px_64px_rgba(0,0,0,0.15)] flex flex-col justify-between sm:border-[10px] sm:border-[#1e293b] overflow-hidden relative">
        
        {/* Background gradient layout pattern */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#d4d9cc] via-[#f1f5f9] to-[#c7dceb] -z-10 pointer-events-none"></div>

        {/* APP BRAND BAR & HEADER */}
        <header className="px-5 py-4 bg-white/40 backdrop-blur-xl border-b border-white/60 flex items-center justify-between shadow-sm sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-bold text-slate-800 text-sm tracking-tight leading-none flex items-center gap-1">
                <span>Yangon Heritage</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              </h1>
              <span className="text-[10px] text-slate-500 mt-1 uppercase font-semibold font-mono tracking-wider">WGS-84 Mobile Tracker</span>
            </div>
          </div>

          {/* Static Location Pill */}
          <div className="flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-200/50 px-3 py-1.5 rounded-full text-[10px] font-extrabold text-emerald-800 shadow-sm select-none">
            <span>📍 Yangon, Myanmar</span>
          </div>
        </header>

        {/* PRIMARY VIEW CONTENT - Tab Selection Rendering */}
        <main className="flex-1 overflow-y-auto px-5 py-4 bg-transparent flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {activeTab === 'home' ? (
              <motion.div
                key="home-tab"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-4"
              >
                {/* 1. Map Canvas displaying markings, user position and centering coordinates */}
                <section aria-label="Geographic Explorer Map">
                  <MapComponent
                    sites={sites}
                    selectedSite={selectedSite}
                    onSiteSelect={setSelectedSite}
                    userCoords={userCoords}
                    onGpsTrigger={handleGpsTrigger}
                    isGpsLoading={isGpsLoading}
                  />
                </section>

                {/* Selected Landmark Highlight Quick Peek */}
                {selectedSite && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg border border-emerald-400 flex flex-col gap-2 relative leading-relaxed overflow-hidden"
                  >
                    <div className="absolute right-[-10px] bottom-[-20px] text-[100px] opacity-10 select-none pointer-events-none">🏺</div>
                    <div className="flex items-center justify-between gap-2 border-b border-white/20 pb-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-wider font-mono font-bold opacity-85">Focused Heritage Landmark</span>
                        <h2 className="font-bold text-base leading-tight">{selectedSite.name}</h2>
                      </div>
                      <button
                        onClick={() => setSelectedSite(null)}
                        className="text-white hover:text-emerald-100 bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer"
                      >
                        Deselect
                      </button>
                    </div>
                    <p className="text-xs opacity-95 leading-relaxed font-medium">
                      {selectedSite.description}
                    </p>
                    <span className="text-[10px] font-mono tracking-wide opacity-85">
                      📍 {selectedSite.locationName} (WGS84: {selectedSite.latitude.toFixed(4)}, {selectedSite.longitude.toFixed(4)})
                    </span>
                  </motion.div>
                )}

                {/* 2. Interactive searchable, tag-filtrable cards list below the map */}
                <section aria-label=" Curated Sites list and search">
                  <div className="flex items-center justify-between border-b border-slate-300/40 pb-1.5 mt-2">
                    <span className="font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-1">Nearby Landmarks</span>
                    <span className="text-[10px] text-slate-400 font-mono font-semibold">Yangon Heritage</span>
                  </div>
                  <SiteList
                    sites={sites}
                    selectedSite={selectedSite}
                    onSiteSelect={setSelectedSite}
                    userCoords={userCoords}
                    isAdmin={false}
                  />
                </section>
              </motion.div>
            ) : (
              // Map view tab links directly to the Knightlab interactive mapping service
              <motion.div
                key="storymap-tab"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.25 }}
                className="h-full flex flex-col"
              >
                <section aria-label="Interactive StoryMap Tour">
                  <StoryMapTab />
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* BOTTOM NAVIGATION TAB MENU */}
        <nav className="h-24 bg-white/60 backdrop-blur-3xl border-t border-white/40 flex items-center justify-around px-8 pb-6 shrink-0 z-30 select-none">
          {/* Tab 1: Home (Compass Icon) */}
          <button
            id="nav-tab-home"
            onClick={() => setActiveTab('home')}
            className="flex flex-col items-center gap-1 group cursor-pointer transition"
          >
            <div className={`p-2.5 rounded-2xl transition-all duration-300 ${
              activeTab === 'home'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200/50 scale-105'
                : 'text-slate-500 opacity-50 hover:opacity-80'
            }`}>
              <Compass className="w-5 h-5 stroke-[2.2px]" />
            </div>
            <span className={`text-[10px] font-bold ${
              activeTab === 'home' ? 'text-slate-800' : 'text-slate-500 opacity-75'
            }`}>Home</span>
          </button>

          {/* Tab 2: Map View (Map Icon) */}
          <button
            id="nav-tab-map-view"
            onClick={() => setActiveTab('map')}
            className="flex flex-col items-center gap-1 group cursor-pointer transition"
          >
            <div className={`p-2.5 rounded-2xl transition-all duration-300 ${
              activeTab === 'map'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200/50 scale-105'
                : 'text-slate-500 opacity-50 hover:opacity-80'
            }`}>
              <MapIcon className="w-5 h-5 stroke-[2.2px]" />
            </div>
            <span className={`text-[10px] font-bold ${
              activeTab === 'map' ? 'text-slate-800' : 'text-slate-500 opacity-75'
            }`}>Map View</span>
          </button>
        </nav>

        {/* CMS DRAWER MODAL SHEET */}
        <AnimatePresence>
          {isCmsOpen && (
            <CmsPanel
              siteToEdit={siteToEdit}
              onSave={handleSaveSite}
              onCancel={() => {
                setIsCmsOpen(false);
                setSiteToEdit(null);
              }}
              userCoords={userCoords}
            />
          )}
        </AnimatePresence>

        {/* AUTH DIALOG MODAL */}
        <AnimatePresence>
          {isAuthOpen && (
            <AuthModal
              onSuccess={() => {
                setIsAuthOpen(false);
              }}
              onCancel={() => {
                setIsAuthOpen(false);
              }}
            />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
