/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { HeritageSite } from '../types';
import { X, Check, Globe, HelpCircle, Compass } from 'lucide-react';

interface CmsPanelProps {
  siteToEdit: HeritageSite | null; // Null means we are ADDING a new site
  onSave: (site: HeritageSite) => void;
  onCancel: () => void;
  userCoords: { latitude: number; longitude: number } | null;
}

// Prepopulated beautiful background image presets
const MEDIA_PRESETS = [
  { name: 'Ancient Ruins', url: 'https://images.unsplash.com/photo-1548138014-ab9c1ee39919?w=800&auto=format&fit=crop&q=60' },
  { name: 'Grand Palace', url: 'https://images.unsplash.com/photo-1599875953199-19815529a721?w=800&auto=format&fit=crop&q=60' },
  { name: 'Historic Sanctuary', url: 'https://images.unsplash.com/photo-1508849789987-4e5333c12b78?w=800&auto=format&fit=crop&q=60' },
  { name: 'Natural Reserve', url: 'https://images.unsplash.com/photo-1472214222541-d510753a4907?w=800&auto=format&fit=crop&q=60' }
];

export default function CmsPanel({
  siteToEdit,
  onSave,
  onCancel,
  userCoords
}: CmsPanelProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Historic');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationName, setLocationName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Load editing state
  useEffect(() => {
    if (siteToEdit) {
      setName(siteToEdit.name);
      setDescription(siteToEdit.description);
      setCategory(siteToEdit.category);
      setLatitude(String(siteToEdit.latitude));
      setLongitude(String(siteToEdit.longitude));
      setLocationName(siteToEdit.locationName);
      setImageUrl(siteToEdit.imageUrl);
    } else {
      // Clear for new
      setName('');
      setDescription('');
      setCategory('Historic');
      setLatitude('');
      setLongitude('');
      setLocationName('');
      setImageUrl(MEDIA_PRESETS[0].url);
    }
    setErrorMsg('');
  }, [siteToEdit]);

  // Handle autofill using user GPS coordinates
  const handleAutofillGps = () => {
    if (userCoords) {
      setLatitude(userCoords.latitude.toFixed(6));
      setLongitude(userCoords.longitude.toFixed(6));
    } else {
      setErrorMsg("GPS location not active yet. Click 'Find My Location' on the home map first.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Field Validations
    if (!name.trim()) return setErrorMsg('Name is required.');
    if (!description.trim()) return setErrorMsg('Description is required.');
    if (!locationName.trim()) return setErrorMsg('Geographical region is required.');
    
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      return setErrorMsg('Latitude must be a valid number between -90 and 90.');
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      return setErrorMsg('Longitude must be a valid number between -180 and 180.');
    }

    if (!imageUrl.trim()) {
      return setErrorMsg('An image link represents the landmark visually. Select a preset or input a valid URL.');
    }

    // Synthesize Machine ID
    const entityId = siteToEdit 
      ? siteToEdit.id 
      : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    if (!entityId) {
      return setErrorMsg('Could not synthesize identifier from names. Please use alphanumeric characters.');
    }

    const savedSite: HeritageSite = {
      id: entityId,
      name: name.trim(),
      description: description.trim(),
      category,
      latitude: latNum,
      longitude: lngNum,
      imageUrl: imageUrl.trim(),
      locationName: locationName.trim(),
      createdAt: siteToEdit ? siteToEdit.createdAt : new Date().toISOString()
    };

    onSave(savedSite);
  };

  return (
    <div id="cms-overlay-container" className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
        
        {/* Header bar */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex flex-col">
            <h2 className="font-semibold text-slate-800 text-base">
              {siteToEdit ? 'Edit Heritage Landmark' : 'Register Landmark CMS'}
            </h2>
            <span className="text-xs text-gray-400">Content Management Panel</span>
          </div>
          <button
            id="cms-close-btn"
            onClick={onCancel}
            className="p-1.5 hover:bg-slate-200/50 rounded-lg text-gray-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CMS Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Site Name and Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cms-name" className="text-xs font-medium text-slate-700">Landmark Name</label>
              <input
                id="cms-name"
                type="text"
                required
                placeholder="e.g. Machu Picchu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!!siteToEdit}
                className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition disabled:bg-slate-100 disabled:text-gray-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cms-category" className="text-xs font-medium text-slate-700">Category Tag</label>
              <select
                id="cms-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition cursor-pointer"
              >
                <option value="Historic">🏛️ Historic</option>
                <option value="Cultural">🎨 Cultural</option>
                <option value="Natural">🌲 Natural</option>
                <option value="Archeological">🏺 Archeological</option>
              </select>
            </div>
          </div>

          {/* Location Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cms-location" className="text-xs font-medium text-slate-700">Region & Country</label>
            <input
              id="cms-location"
              type="text"
              required
              placeholder="e.g. Andes Mountain range, Peru"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
            />
          </div>

          {/* Coordinates Grid */}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-amber-500" />
                <span>Navigational Coordinates</span>
              </span>
              <button
                type="button"
                onClick={handleAutofillGps}
                className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline font-medium flex items-center gap-1 cursor-pointer"
              >
                <Compass className="w-3 h-3 animate-pulse" />
                <span>Autofill GPS Position</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="cms-lat" className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Latitude</label>
                <input
                  id="cms-lat"
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. -13.1631"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="cms-lng" className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Longitude</label>
                <input
                  id="cms-lng"
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. -72.545"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Define coordinates in WGS84 decimal format. Use positive for North/East and negative for South/West.
            </p>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cms-description" className="text-xs font-medium text-slate-700">Detailed History & Curation Description</label>
            <textarea
              id="cms-description"
              required
              rows={3}
              placeholder="Provide a profound overview of the historical, archeological, or biological significance of this site..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition resize-none leading-relaxed"
            />
          </div>

          {/* Cover Media Image selection */}
          <div className="flex flex-col gap-2">
            <label htmlFor="cms-image" className="text-xs font-medium text-slate-700">Site Cover Media Link</label>
            <input
              id="cms-image"
              type="text"
              required
              placeholder="e.g. https://images.unsplash.com/photo-..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
            />

            {/* Quick Presets Selectors */}
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Media Presets Support</span>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {MEDIA_PRESETS.map((preset) => {
                  const isActive = imageUrl === preset.url;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      className={`px-3 py-1.5 border rounded-lg text-[10px] font-medium whitespace-nowrap transition cursor-pointer select-none shrink-0 ${
                        isActive
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'bg-white hover:bg-slate-50 border-gray-200 text-gray-600'
                      }`}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Preset Preview if present */}
          {imageUrl && (
            <div className="h-24 w-full rounded-xl overflow-hidden shadow-inner border border-gray-100">
              <img
                src={imageUrl}
                alt="Selected Landmark Thumbnail"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad';
                }}
              />
            </div>
          )}

          {/* Submit Action Buttons */}
          <div className="flex items-center gap-3 border-t border-gray-100 pt-5 mt-2">
            <button
              id="cms-cancel-action-btn"
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl border border-gray-200/65 transition active:scale-95 cursor-pointer leading-tight"
            >
              Cancel
            </button>
            <button
              id="cms-save-action-btn"
              type="submit"
              className="flex-1 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-md transition active:scale-95 cursor-pointer leading-tight"
            >
              Save Landmark
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
