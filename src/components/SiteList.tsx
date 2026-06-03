/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { HeritageSite, CategoryFilter } from '../types';
import { Search, MapPin, Compass, Trash2, Edit2, Plus, Info } from 'lucide-react';

interface SiteListProps {
  sites: HeritageSite[];
  selectedSite: HeritageSite | null;
  onSiteSelect: (site: HeritageSite) => void;
  userCoords: { latitude: number; longitude: number } | null;
  isAdmin: boolean;
  onEditTrigger?: (site: HeritageSite) => void;
  onDeleteTrigger?: (siteId: string) => void;
  onAddTrigger?: () => void;
}

// Coordinate Distance Calculation Helper (Haversine Formula)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth ratio in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function SiteList({
  sites,
  selectedSite,
  onSiteSelect,
  userCoords,
  isAdmin,
  onEditTrigger,
  onDeleteTrigger,
  onAddTrigger
}: SiteListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');

  // Multi-property search
  const filteredSites = sites.filter((site) => {
    const matchesSearch = 
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || site.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Categories definition
  const categories: CategoryFilter[] = ['All', 'Historic', 'Cultural', 'Natural', 'Archeological'];

    const categoryBadges: Record<string, string> = {
      Historic: 'bg-emerald-50/80 backdrop-blur-md text-emerald-800 border-emerald-200/50',
      Cultural: 'bg-violet-50/80 backdrop-blur-md text-violet-800 border-violet-200/50',
      Natural: 'bg-teal-50/80 backdrop-blur-md text-teal-800 border-teal-200/50',
      Archeological: 'bg-amber-50/80 backdrop-blur-md text-amber-800 border-amber-200/50'
    };
  
    return (
      <div className="flex flex-col gap-4 mt-2">
        {/* Search Header and CMS Quick Launcher */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              id="search-input"
              type="text"
              placeholder="Search Yangon landmarks, areas, categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/60 backdrop-blur-lg border border-white/80 rounded-2xl text-xs placeholder-slate-500 shadow-lg shadow-black/5 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500/60 transition"
            />
          </div>
          {isAdmin && onAddTrigger && (
            <button
              id="cms-quick-add-btn"
              onClick={onAddTrigger}
              className="flex items-center gap-1.5 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200/50 text-xs font-semibold select-none cursor-pointer transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Site</span>
            </button>
          )}
        </div>
  
        {/* Category Horizontal Filter Tags */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-[11px] font-bold border whitespace-nowrap transition-all duration-200 cursor-pointer select-none ${
                  isSelected 
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-900/15' 
                    : 'bg-white/50 backdrop-blur-md hover:bg-white/80 border-white/70 text-slate-600'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
  
        {/* Search Result Count */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-semibold">
          <span>Showing {filteredSites.length} of {sites.length} locations</span>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="text-emerald-600 hover:text-emerald-700 hover:underline font-bold"
            >
              Clear Search
            </button>
          )}
        </div>

      {/* Grid of Heritage Site Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSites.length > 0 ? (
          filteredSites.map((site) => {
            const isSelected = selectedSite?.id === site.id;
            
            // Calculate real-time coordinates distance
            let distanceString = '';
            if (userCoords) {
              const km = calculateDistance(
                userCoords.latitude, 
                userCoords.longitude, 
                site.latitude, 
                site.longitude
              );
              distanceString = km < 1 
                ? `${Math.round(km * 1000)} m away` 
                : `${km.toFixed(1)} km away`;
            }

            return (
              <div
                id={`site-card-${site.id}`}
                key={site.id}
                onClick={() => onSiteSelect(site)}
                className={`flex flex-col bg-white/70 backdrop-blur-xl border rounded-[1.8rem] overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 ${
                  isSelected ? 'ring-2 ring-emerald-500 border-transparent bg-emerald-50/15 shadow-lg shadow-emerald-500/10' : 'border-white/60'
                }`}
              >
                {/* Visual Thumbnail */}
                <div className="relative h-44 w-full bg-slate-100/50 overflow-hidden">
                  <img
                    src={site.imageUrl || 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad'}
                    alt={site.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                  
                  {/* Category overlay badge */}
                  <span className={`absolute top-3 left-3 px-2.5 py-1 text-[9px] font-extrabold tracking-wide border rounded-full uppercase shadow-sm ${
                    categoryBadges[site.category] || 'bg-white/90 backdrop-blur text-slate-800 border-white/50'
                  }`}>
                    {site.category}
                  </span>

                  {/* GPS Distance Badge overlay */}
                  {distanceString && (
                    <span className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 backdrop-blur border border-white/20 text-white rounded-full text-[9px] font-extrabold tracking-wider shadow-md uppercase">
                      <Compass className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} />
                      <span>{distanceString}</span>
                    </span>
                  )}
                </div>

                {/* Primary Site Info */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-800 tracking-tight text-sm hover:text-emerald-600 transition-colors">
                        {site.name}
                      </h3>
                      <div className="flex items-center gap-1 text-slate-500 text-[9px] font-bold uppercase tracking-wider shrink-0 bg-white/60 backdrop-blur border border-white/80 px-2.5 py-0.5 rounded-full">
                        <MapPin className="w-3 h-3 text-emerald-500" />
                        <span>Geo</span>
                      </div>
                    </div>
                    
                    <span className="text-[10px] text-slate-500 uppercase tracking-tight font-semibold">
                      {site.locationName}
                    </span>

                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mt-1">
                      {site.description}
                    </p>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex items-center justify-between border-t border-slate-300/30 pt-3 mt-1">
                    <span className="text-[9px] text-slate-400 font-extrabold tracking-widest font-mono">
                      LAT: {site.latitude.toFixed(4)} • LNG: {site.longitude.toFixed(4)}
                    </span>

                    {/* Admin Curator Controls */}
                    {isAdmin && (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {onEditTrigger && (
                          <button
                            id={`edit-site-${site.id}`}
                            onClick={() => onEditTrigger(site)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-gray-100 transition active:scale-90"
                            title="Edit Heritage Site"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteTrigger && (
                          <button
                            id={`delete-site-${site.id}`}
                            onClick={() => onDeleteTrigger(site.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-100 transition active:scale-90"
                            title="Delete Heritage Site"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center gap-3 bg-white border border-dashed border-gray-200 rounded-2xl">
            <Info className="w-8 h-8 text-slate-300" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-slate-700">No sites found</p>
              <p className="text-xs text-slate-500 max-w-sm px-6">
                Try revising your query or selecting another category to discover preloaded heritage sites.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
