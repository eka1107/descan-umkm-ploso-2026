import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Tooltip, GeoJSON, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import plosoGeojson from '../3501040002_Ploso.json';

// --- KONFIGURASI ICON TITIK PETA ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const markerHtml = `<div style="background-color: #007D60; width: 16px; height: 16px; display: block; left: -8px; top: -8px; position: relative; border-radius: 50%; border: 2px solid #ffe16f; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>`;
const PublicPin = L.divIcon({ className: "custom-pin", html: markerHtml, iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8] });

// --- SVG ICONS ---
const Icons = {
  Home: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Map: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  Stats: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Store: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z"/><rect x="8" y="14" width="8" height="8"/><path d="M4 10v12m16-12v12"/></svg>,
  File: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  WhatsApp: () => <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.405-.883-.733-1.48-1.64-1.653-1.937-.173-.298-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  Search: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  CheckCircle: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  ChevronLeft: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevronRight: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  Download: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
};

const AnimatedNumber = ({ value }) => {
  const [displayValue, setDisplayValue] = React.useState(0);
  React.useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10) || 0;
    if (end === 0) { setDisplayValue(0); return; }
    const totalDuration = 1500;
    const incrementTime = 30;
    const step = Math.max(end / (totalDuration / incrementTime), 1);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplayValue(end); clearInterval(timer); } 
      else { setDisplayValue(Math.floor(start)); }
    }, incrementTime);
    return () => clearInterval(timer);
  }, [value]);
  return <>{displayValue}</>;
};

const getDriveImageUrl = (url) => {
  if (!url || url === '-') return 'https://via.placeholder.com/400x300?text=Foto+Usaha+Belum+Tersedia'; 
  const match = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/d\/([a-zA-Z0-9_-]+)/);
  return match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400` : url;
};

// --- FUNGSI FORMAT WHATSAPP (FIXED) ---
const formatWaNumber = (phone) => {
  if (!phone || String(phone).trim() === '' || String(phone) === '-') return null;
  let clean = String(phone).replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) { clean = '62' + clean.substring(1); }
  if (clean.length < 10 || clean.length > 15) return null;
  return clean;
};

const PublicDashboard = () => {
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx0TqenZVn-sDlSklA8eesYb08aE2uE7q9Wnvt5OCw-Y20ABr84PNmuEe4T6Nz-vlNf/exec';
  
  const [activeTab, setActiveTab] = useState('beranda');
  const [dataUsaha, setDataUsaha] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State Filter Direktori
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterRW, setFilterRW] = useState('');
  const [filterQris, setFilterQris] = useState('');
  
  // State Filter Peta
  const [mapFilterKategori, setMapFilterKategori] = useState('');
  const [mapFilterRW, setMapFilterRW] = useState('');

  // Pagination Direktori
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const centerPloso = [-8.2050, 111.1050];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(SCRIPT_URL);
      if (Array.isArray(res.data)) {
        setDataUsaha(res.data);
      }
    } catch (e) {
      console.error("Gagal memuat data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToData = () => {
    const section = document.getElementById('data-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // --- FILTER DIREKTORI USAHA ---
  const dataDirektori = dataUsaha.filter(item => {
    const matchSearch = (item['Nama Usaha']?.toLowerCase().includes(searchQuery.toLowerCase()) || item['Nama Pemilik']?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchKategori = filterKategori === '' || item['KBLI']?.includes(filterKategori);
    const dRw = String(item['RW']).padStart(2, '0');
    const matchRw = filterRW === '' || dRw === filterRW;
    const matchQris = filterQris === '' || item['Punya QRIS'] === filterQris;
    return matchSearch && matchKategori && matchRw && matchQris;
  });

  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterKategori, filterRW, filterQris]);

  const totalPages = Math.ceil(dataDirektori.length / itemsPerPage);
  const currentDirData = dataDirektori.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- FILTER PETA ---
  const dataPeta = dataUsaha.filter(item => {
    const dRw = String(item['RW']).padStart(2, '0');
    const matchRw = mapFilterRW === '' || dRw === mapFilterRW;
    const matchKategori = mapFilterKategori === '' || item['KBLI']?.includes(mapFilterKategori);
    return matchRw && matchKategori;
  });

  const getGeoJsonStyle = (feature) => {
    const name = feature.properties.nmsls || '';
    const rwMatch = name.match(/RW\s+0*(\d+)/i);
    const rw = rwMatch ? String(parseInt(rwMatch[1])).padStart(2, '0') : '';
    const isHighlighted = mapFilterRW === '' || mapFilterRW === rw;
    return { 
      fillColor: isHighlighted ? '#007D60' : '#cbd5e1', 
      weight: 2, opacity: 1, color: '#ffffff', 
      fillOpacity: isHighlighted ? 0.3 : 0.1 
    };
  };

  const unikKategori = [...new Set(dataUsaha.map(item => item['KBLI']).filter(Boolean))].sort();
  const unikRW = [...new Set(dataUsaha.map(item => String(item['RW']).padStart(2, '0')).filter(r => r !== '00'))].sort();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        body, html { margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', sans-serif; color: #1e293b; scroll-behavior: smooth; }
        
        .public-navbar { background: #ffffff; padding: 0 5%; height: 72px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border-bottom: 2px solid #007D60; }
        .nav-logo { display: flex; align-items: center; gap: 12px; }
        .nav-logo h1 { margin: 0; font-family: 'Outfit'; font-weight: 800; font-size: 24px; color: #007D60; letter-spacing: -0.5px; }
        
        .nav-menu { display: flex; height: 100%; gap: 4px; }
        .nav-btn { background: none; border: none; padding: 0 16px; font-family: 'Inter'; font-weight: 600; font-size: 14px; color: #64748b; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; position: relative; }
        .nav-btn:hover { color: #007D60; background: #f0fdf4; }
        .nav-btn.active { color: #007D60; }
        .nav-btn.active::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: #007D60; border-radius: 4px 4px 0 0; }

        .container { max-width: 1280px; margin: 0 auto; padding: 0 20px 60px 20px; animation: fadeIn 0.5s ease; min-height: 85vh;}
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* HERO SPLIT (LANDING PAGE) */
        .hero-split { display: flex; align-items: center; justify-content: space-between; gap: 40px; min-height: 80vh; padding: 40px 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 60px;}
        .hero-text { flex: 1; max-width: 600px; }
        .hero-badge { display: inline-block; background: #f0fdf4; color: #007D60; padding: 6px 16px; border-radius: 99px; font-size: 13px; font-weight: 700; margin-bottom: 24px; border: 1px solid #bbf7d0; letter-spacing: 0.5px;}
        .hero-title-main { font-family: 'Outfit'; font-size: 56px; font-weight: 800; color: #0f172a; line-height: 1.1; margin: 0 0 24px 0; letter-spacing: -1.5px;}
        .hero-subtitle { font-size: 18px; color: #475569; line-height: 1.6; margin: 0 0 32px 0;}
        
        .hero-buttons { display: flex; gap: 16px; flex-wrap: wrap; }
        .btn-hero-primary { background: #007D60; color: #fff; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 16px; border: none; cursor: pointer; transition: 0.2s; box-shadow: 0 8px 16px rgba(0,125,96,0.2); display: flex; align-items: center; gap: 8px; font-family: 'Inter';}
        .btn-hero-primary:hover { background: #045c48; transform: translateY(-2px); }
        .btn-hero-secondary { background: #fff; color: #0f172a; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 16px; border: 1px solid #cbd5e1; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 8px; font-family: 'Inter'; box-shadow: 0 4px 6px rgba(0,0,0,0.02);}
        .btn-hero-secondary:hover { background: #f8fafc; border-color: #94a3b8; transform: translateY(-2px); }

        .hero-visual { flex: 1; display: flex; justify-content: center; align-items: center; position: relative; }
        .hero-visual svg { width: 100%; max-width: 500px; height: auto; filter: drop-shadow(0 20px 30px rgba(0,0,0,0.08)); }

        .section-header { text-align: center; margin-bottom: 48px; }
        .section-header h2 { font-family: 'Outfit'; font-size: 36px; color: #0f172a; margin: 0 0 12px 0; letter-spacing: -1px;}
        .section-header p { color: #64748b; font-size: 16px; max-width: 600px; margin: 0 auto; line-height: 1.6; }

        /* KPI GRID */
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 48px; }
        .kpi-card { background: #fff; padding: 32px 24px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.02); display: flex; flex-direction: column; align-items: center; text-align: center; transition: 0.3s;}
        .kpi-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.06); border-color: #cbd5e1;}
        .kpi-title { font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
        .kpi-value { font-size: 56px; font-weight: 800; color: #0f172a; line-height: 1; font-family: 'Outfit'; margin-bottom: 12px;}
        .kpi-desc { font-size: 14px; color: #94a3b8; font-weight: 500; line-height: 1.5;}
        
        /* CARD USAHA (DIREKTORI) */
        .dir-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
        .dir-card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; transition: 0.2s; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .dir-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.08); border-color: #cbd5e1; }
        .dir-img { width: 100%; height: 200px; object-fit: cover; background: #f1f5f9; border-bottom: 1px solid #e2e8f0;}
        .dir-content { padding: 20px; flex: 1; display: flex; flex-direction: column; }
        .dir-badge-container { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;}
        .dir-badge { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; }
        .dir-badge.qris { background: #f0fdf4; color: #007D60; border-color: #bbf7d0; display: flex; align-items: center; gap: 4px;}
        .dir-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; font-family: 'Outfit'; line-height: 1.3;}
        .dir-owner { font-size: 13px; color: #64748b; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
        .dir-desc { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .dir-footer { padding-top: 16px; border-top: 1px dashed #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .dir-loc { font-size: 12px; font-weight: 700; color: #64748b; background: #f8fafc; padding: 6px 10px; border-radius: 6px; border: 1px solid #e2e8f0;}
        
        /* WA BUTTON */
        .btn-wa { display: flex; align-items: center; gap: 6px; background: #25D366; color: #fff; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px; transition: 0.2s; box-shadow: 0 4px 10px rgba(37, 211, 102, 0.2);}
        .btn-wa:hover { background: #20bd5a; transform: translateY(-2px); box-shadow: 0 6px 14px rgba(37, 211, 102, 0.3);}
        .btn-wa.disabled { background: #e2e8f0; color: #94a3b8; box-shadow: none; pointer-events: none; cursor: not-allowed; }

        /* FILTER BAR */
        .search-bar { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; background: #fff; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.02);}
        .search-input { flex: 1; min-width: 250px; padding: 12px 16px 12px 40px; border-radius: 8px; border: 1px solid #cbd5e1; font-family: 'Inter'; outline: none; background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="gray" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke="gray" stroke-width="2" fill="none"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="gray" stroke-width="2"/></svg>') no-repeat 12px center; background-size: 18px; font-size: 14px; transition: 0.2s;}
        .search-input:focus { border-color: #007D60; box-shadow: 0 0 0 3px rgba(0,125,96,0.1); }
        .search-select { padding: 12px 16px; border-radius: 8px; border: 1px solid #cbd5e1; font-family: 'Inter'; font-size: 14px; outline: none; background: #fff; min-width: 180px; cursor: pointer; transition: 0.2s;}
        .search-select:focus { border-color: #007D60; }
        
        /* BARCHART (Statistik) */
        .stat-card { background: #fff; padding: 28px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.02);}
        .barchart-row { display: flex; align-items: center; margin-bottom: 14px; gap: 16px; }
        .barchart-label { width: 140px; font-size: 13px; font-weight: 600; color: #475569; line-height: 1.3;}
        .barchart-area { flex: 1; height: 12px; background: #f1f5f9; border-radius: 6px; overflow: hidden; }
        .barchart-fill { height: 100%; border-radius: 6px; background: #007D60; transition: width 1s ease-out;}
        .barchart-val { font-size: 14px; font-weight: 700; color: #0f172a; width: 40px; text-align: right; }

        /* PAGINATION */
        .pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 40px; }
        .btn-page { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; color: #0f172a; transition: 0.2s; }
        .btn-page:hover:not(:disabled) { background: #f1f5f9; border-color: #94a3b8;}
        .btn-page:disabled { opacity: 0.5; cursor: not-allowed; }
        .page-info { font-size: 14px; font-weight: 600; color: #64748b; }

        /* PUBLIKASI */
        .pub-card { display: flex; align-items: flex-start; gap: 20px; padding: 24px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; transition: 0.2s; }
        .pub-card:hover { border-color: #007D60; box-shadow: 0 8px 24px rgba(0,125,96,0.05); }
        .pub-icon { width: 56px; height: 56px; background: #f0fdf4; color: #007D60; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;}
        .pub-info h3 { margin: 0 0 8px 0; font-family: 'Outfit'; font-size: 18px; color: #0f172a; }
        .pub-info p { margin: 0 0 16px 0; font-size: 14px; color: #64748b; line-height: 1.5; }
        .btn-download { display: inline-flex; align-items: center; gap: 8px; background: #1e293b; color: #fff; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; text-decoration: none; transition: 0.2s;}
        .btn-download:hover { background: #007D60; }

        @media (max-width: 900px) {
          .hero-split { flex-direction: column; text-align: center; margin-top: 20px; padding: 20px 0 40px 0;}
          .hero-subtitle { margin: 0 auto 32px auto; }
          .hero-buttons { justify-content: center; }
          .hero-visual svg { max-width: 350px; }
        }

        @media (max-width: 768px) {
          .nav-menu { position: fixed; bottom: 0; left: 0; right: 0; height: 60px; background: #fff; border-top: 1px solid #e2e8f0; box-shadow: 0 -4px 12px rgba(0,0,0,0.05); justify-content: space-around; z-index: 1000; }
          .nav-btn { flex-direction: column; font-size: 10px; gap: 4px; padding: 8px 0; justify-content: center; }
          .nav-btn.active::after { top: 0; bottom: auto; border-radius: 0 0 4px 4px; }
          .hero-title-main { font-size: 40px; }
          .container { padding: 0 20px 80px 20px; }
          .barchart-row { flex-direction: column; align-items: flex-start; gap: 4px;}
          .barchart-label { width: 100%;}
          .barchart-area { width: 100%;}
          .barchart-val { text-align: left;}
          .pub-card { flex-direction: column; align-items: center; text-align: center;}
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="public-navbar">
        <div className="nav-logo">
          <img src="/logo_ploso.png" alt="Logo" style={{ height: '36px' }} onError={(e) => e.target.style.display = 'none'} />
          <h1>PUSAKA</h1>
        </div>
        <div className="nav-menu">
          <button className={`nav-btn ${activeTab === 'beranda' ? 'active' : ''}`} onClick={() => setActiveTab('beranda')}><Icons.Home /> <span className="hide-mobile">Beranda</span></button>
          <button className={`nav-btn ${activeTab === 'peta' ? 'active' : ''}`} onClick={() => setActiveTab('peta')}><Icons.Map /> <span className="hide-mobile">Peta Tematik</span></button>
          <button className={`nav-btn ${activeTab === 'statistik' ? 'active' : ''}`} onClick={() => setActiveTab('statistik')}><Icons.Stats /> <span className="hide-mobile">Statistik</span></button>
          <button className={`nav-btn ${activeTab === 'usaha' ? 'active' : ''}`} onClick={() => setActiveTab('usaha')}><Icons.Store /> <span className="hide-mobile">Direktori Usaha</span></button>
          <button className={`nav-btn ${activeTab === 'publikasi' ? 'active' : ''}`} onClick={() => setActiveTab('publikasi')}><Icons.File /> <span className="hide-mobile">Publikasi</span></button>
        </div>
      </nav>

      {/* KONTEN UTAMA */}
      <div className="container">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '100px 0', color: '#64748b' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #f1f5f9', borderTopColor: '#007D60', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
            Menarik data terbaru...
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* ================= BERANDA (LANDING PAGE STYLE) ================= */}
            {activeTab === 'beranda' && (
              <div style={{ animation: 'fadeIn 0.4s ease' }}>
                
                {/* HERO SPLIT */}
                <div className="hero-split">
                  <div className="hero-text">
                    <div className="hero-badge">Program Desa Cantik 2026</div>
                    <h1 className="hero-title-main">Selamat Datang di <span style={{ color: '#007D60' }}>Portal Usaha</span> Kelurahan Ploso</h1>
                    <p className="hero-subtitle">Mendukung pertumbuhan ekonomi lokal melalui keterbukaan informasi publik. Temukan berbagai profil UMKM, produk unggulan desa, dan analisis potensi ekonomi wilayah kami secara interaktif dan real-time.</p>
                    <div className="hero-buttons">
                      <button className="btn-hero-primary" onClick={() => setActiveTab('usaha')}><Icons.Store /> Jelajahi Usaha Desa</button>
                      <button className="btn-hero-secondary" onClick={scrollToData}><Icons.Stats /> Lihat Statistik Data</button>
                    </div>
                  </div>

                  {/* ILUSTRASI SVG MODERN */}
                  <div className="hero-visual">
                    <svg viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="250" cy="200" r="180" fill="#f0fdf4"/>
                      <rect x="130" y="100" width="240" height="260" rx="16" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2"/>
                      <rect x="130" y="100" width="240" height="90" rx="16" fill="#007D60"/>
                      <path d="M130 170H370V344C370 352.837 362.837 360 354 360H146C137.163 360 130 352.837 130 344V170Z" fill="#ffffff"/>
                      <circle cx="250" cy="140" r="24" fill="#ffe16f"/>
                      <rect x="170" y="210" width="160" height="16" rx="4" fill="#f1f5f9"/>
                      <rect x="170" y="240" width="100" height="16" rx="4" fill="#f1f5f9"/>
                      <rect x="170" y="280" width="40" height="40" rx="8" fill="#fcd34d"/>
                      <rect x="220" y="280" width="40" height="40" rx="8" fill="#a7f3d0"/>
                      <rect x="270" y="280" width="40" height="40" rx="8" fill="#bae6fd"/>
                      <circle cx="400" cy="280" r="40" fill="#e2e8f0"/>
                      <circle cx="400" cy="280" r="20" fill="#cbd5e1"/>
                      <path d="M50 200 L90 160 L90 240 Z" fill="#e2e8f0"/>
                    </svg>
                  </div>
                </div>
                
                {/* DATA SECTION (Tujuan Scroll) */}
                <div id="data-section" style={{ paddingTop: '20px' }}>
                  <div className="section-header">
                    <h2>Transparansi Data & Statistik</h2>
                    <p>Rangkuman eksekutif hasil pendataan usaha Kelurahan Ploso 2026</p>
                  </div>

                  <div className="kpi-grid">
                    <div className="kpi-card">
                      <span className="kpi-title">Total Usaha Terdata</span>
                      <span className="kpi-value"><AnimatedNumber value={dataUsaha.length} /></span>
                      <span className="kpi-desc">Unit usaha mikro, kecil, dan menengah.</span>
                    </div>
                    <div className="kpi-card">
                      <span className="kpi-title">Usaha Ber-Legalitas (NIB)</span>
                      <span className="kpi-value" style={{color: '#007D60'}}><AnimatedNumber value={dataUsaha.filter(d => d['Punya NIB'] === 'Ya').length} /></span>
                      <span className="kpi-desc">Telah terdaftar resmi di sistem OSS.</span>
                    </div>
                    <div className="kpi-card">
                      <span className="kpi-title">Adopsi Digital (QRIS)</span>
                      <span className="kpi-value" style={{color: '#d97706'}}><AnimatedNumber value={dataUsaha.filter(d => d['Punya QRIS'] === 'Ya').length} /></span>
                      <span className="kpi-desc">Mendukung ekosistem transaksi non-tunai.</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ================= PETA TEMATIK ================= */}
            {activeTab === 'peta' && (
              <div style={{ animation: 'fadeIn 0.4s ease' }}>
                <div style={{ marginBottom: '24px', paddingTop: '24px' }}>
                  <h2 style={{ fontFamily: 'Outfit', fontSize: '32px', margin: '0 0 8px 0', color: '#0f172a' }}>Peta Tematik Usaha</h2>
                  <p style={{ color: '#64748b', margin: '0 0 24px 0', fontSize: '16px' }}>Visualisasi geografis distribusi dan konsentrasi UMKM di seluruh area Kelurahan Ploso.</p>
                </div>
                
                {/* Filter Peta */}
                <div className="search-bar">
                  <select className="search-select" style={{ flex: 1 }} value={mapFilterRW} onChange={(e) => setMapFilterRW(e.target.value)}>
                    <option value="">Semua Wilayah (RW)</option>
                    {unikRW.map((rw, i) => <option key={i} value={rw}>Fokus ke RW {rw}</option>)}
                  </select>
                  <select className="search-select" style={{ flex: 2 }} value={mapFilterKategori} onChange={(e) => setMapFilterKategori(e.target.value)}>
                    <option value="">Semua Kategori (KBLI)</option>
                    {unikKategori.map((k, i) => <option key={i} value={k}>{k.length > 50 ? k.substring(0,50)+'...' : k}</option>)}
                  </select>
                </div>

                <div style={{ height: '600px', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}>
                  <MapContainer center={centerPloso} zoom={15} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                    <LayersControl position="topright">
                      <LayersControl.BaseLayer checked name="Peta Standar">
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      </LayersControl.BaseLayer>
                      <LayersControl.BaseLayer name="Peta Satelit">
                        <TileLayer url="http://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}" />
                      </LayersControl.BaseLayer>
                    </LayersControl>
                    
                    {plosoGeojson && <GeoJSON data={plosoGeojson} style={getGeoJsonStyle} />}

                    {dataPeta.map((item, index) => {
                      const loc = item['Lokasi (Lat, Lng)'];
                      if (loc && loc !== '-' && loc.includes(',')) {
                        const [lat, lng] = loc.split(',');
                        return (
                          <Marker key={index} position={[parseFloat(lat), parseFloat(lng)]} icon={PublicPin}>
                            <Tooltip direction="top" offset={[0, -10]} className="custom-tooltip" style={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                              <strong style={{ fontSize: '15px', fontFamily: 'Outfit' }}>{item['Nama Usaha']}</strong><br/>
                              <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '4px' }}>{item['KBLI']}</span>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#007D60', display: 'block', marginTop: '8px' }}>RT {item['RT']} / RW {item['RW']}</span>
                            </Tooltip>
                          </Marker>
                        );
                      }
                      return null;
                    })}
                  </MapContainer>
                </div>
              </div>
            )}

            {/* ================= STATISTIK ================= */}
            {activeTab === 'statistik' && (() => {
              const rwStats = {};
              const kbliStats = {};
              let punyaNib = 0; let punyaQris = 0;
              
              dataUsaha.forEach(d => {
                const rw = d['RW'] ? `RW ${String(d['RW']).padStart(2, '0')}` : 'Lainnya';
                rwStats[rw] = (rwStats[rw] || 0) + 1;
                
                const kbli = d['KBLI'] || 'Tidak Diketahui';
                const shortKbli = kbli.length > 30 ? kbli.substring(0, 30) + '...' : kbli;
                kbliStats[shortKbli] = (kbliStats[shortKbli] || 0) + 1;

                if(d['Punya NIB'] === 'Ya') punyaNib++;
                if(d['Punya QRIS'] === 'Ya') punyaQris++;
              });

              const sortedRw = Object.entries(rwStats).sort((a, b) => a[0].localeCompare(b[0]));
              const maxRw = Math.max(...Object.values(rwStats), 1);
              const sortedKbli = Object.entries(kbliStats).sort((a, b) => b[1] - a[1]).slice(0, 10);
              const maxKbli = Math.max(...Object.values(kbliStats), 1);

              return (
              <div style={{ animation: 'fadeIn 0.4s ease', paddingTop: '24px' }}>
                <h2 style={{ fontFamily: 'Outfit', fontSize: '32px', margin: '0 0 8px 0', color: '#0f172a' }}>Statistik Usaha</h2>
                <p style={{ color: '#64748b', margin: '0 0 32px 0', fontSize: '16px' }}>Analisis data agregat hasil Pendataan Usaha Kelurahan Ploso 2026.</p>
                
                {/* Visualisasi Rasio */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                  <div className="stat-card">
                    <h3 style={{ fontFamily: 'Outfit', margin: '0 0 16px 0', fontSize: '18px' }}>Rasio Kepemilikan NIB</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: `conic-gradient(#007D60 ${(punyaNib/dataUsaha.length)*100}%, #f1f5f9 0)` }}></div>
                      <div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{((punyaNib/dataUsaha.length)*100).toFixed(1)}%</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>Dari total {dataUsaha.length} usaha.</div>
                      </div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <h3 style={{ fontFamily: 'Outfit', margin: '0 0 16px 0', fontSize: '18px' }}>Rasio Adopsi QRIS</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: `conic-gradient(#d97706 ${(punyaQris/dataUsaha.length)*100}%, #f1f5f9 0)` }}></div>
                      <div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{((punyaQris/dataUsaha.length)*100).toFixed(1)}%</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>Dari total {dataUsaha.length} usaha.</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                  <div className="stat-card">
                    <h3 style={{ fontFamily: 'Outfit', margin: '0 0 24px 0', fontSize: '18px' }}>Distribusi Jumlah Usaha per RW</h3>
                    {sortedRw.map(([rw, val], i) => (
                      <div key={i} className="barchart-row">
                        <div className="barchart-label">{rw}</div>
                        <div className="barchart-area"><div className="barchart-fill" style={{ width: `${(val/maxRw)*100}%` }}></div></div>
                        <div className="barchart-val">{val}</div>
                      </div>
                    ))}
                  </div>

                  <div className="stat-card">
                    <h3 style={{ fontFamily: 'Outfit', margin: '0 0 24px 0', fontSize: '18px' }}>Top 10 Kategori Usaha Terbanyak</h3>
                    {sortedKbli.map(([kbli, val], i) => (
                      <div key={i} className="barchart-row">
                        <div className="barchart-label" style={{ width: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={kbli}>{kbli}</div>
                        <div className="barchart-area"><div className="barchart-fill" style={{ width: `${(val/maxKbli)*100}%`, background: '#f59e0b' }}></div></div>
                        <div className="barchart-val">{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )})()}

            {/* ================= USAHA DESA (DIREKTORI) ================= */}
            {activeTab === 'usaha' && (
              <div style={{ animation: 'fadeIn 0.4s ease', paddingTop: '24px' }}>
                <h2 style={{ fontFamily: 'Outfit', fontSize: '32px', margin: '0 0 8px 0', color: '#0f172a' }}>Direktori Usaha & Produk</h2>
                <p style={{ color: '#64748b', margin: '0 0 24px 0', fontSize: '16px' }}>Temukan produk, jasa, dan layanan warga. Dukung ekonomi desa dengan bertransaksi langsung!</p>
                
                {/* Advanced Filter Bar */}
                <div className="search-bar">
                  <input type="text" className="search-input" placeholder="Cari nama toko, produk, atau pemilik..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  <select className="search-select" value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)}>
                    <option value="">Semua Kategori Usaha</option>
                    {unikKategori.map((k, i) => <option key={i} value={k}>{k.length > 30 ? k.substring(0,30)+'...' : k}</option>)}
                  </select>
                  <select className="search-select" style={{ minWidth: '120px' }} value={filterRW} onChange={(e) => setFilterRW(e.target.value)}>
                    <option value="">Semua RW</option>
                    {unikRW.map((rw, i) => <option key={i} value={rw}>RW {rw}</option>)}
                  </select>
                  <select className="search-select" style={{ minWidth: '150px' }} value={filterQris} onChange={(e) => setFilterQris(e.target.value)}>
                    <option value="">Pembayaran (Semua)</option>
                    <option value="Ya">Terima QRIS</option>
                  </select>
                </div>

                <div className="dir-grid">
                  {currentDirData.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 20px', color: '#94a3b8', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <Icons.Search />
                      <p style={{ marginTop: '12px', fontSize: '16px' }}>Maaf, tidak ada usaha yang sesuai dengan kriteria pencarian Anda.</p>
                    </div>
                  ) : (
                    currentDirData.map((item, idx) => {
                      const waNumber = formatWaNumber(item['No HP']);
                      return (
                        <div key={idx} className="dir-card">
                          <img src={getDriveImageUrl(item['URL Foto Usaha'])} alt={item['Nama Usaha']} className="dir-img" />
                          <div className="dir-content">
                            <div className="dir-badge-container">
                              <span className="dir-badge">{item['KBLI']?.split(' ')[0] || 'UMKM'}</span>
                              {item['Punya QRIS'] === 'Ya' && <span className="dir-badge qris"><Icons.CheckCircle /> QRIS</span>}
                            </div>
                            
                            <h3 className="dir-title">{item['Nama Usaha']}</h3>
                            <div className="dir-owner">👤 {item['Nama Pemilik'] || 'Pemilik tidak diketahui'}</div>
                            <p className="dir-desc">{item['Deskripsi Usaha'] !== '-' ? item['Deskripsi Usaha'] : 'Penyedia layanan / produk lokal di Kelurahan Ploso.'}</p>
                            
                            <div className="dir-footer">
                              <span className="dir-loc">RT {item['RT']} / RW {item['RW']}</span>
                              {waNumber ? (
                                <a href={`https://wa.me/${waNumber}?text=Halo%20Bapak/Ibu%20${item['Nama Pemilik']},%20saya%20melihat%20usaha%20${item['Nama Usaha']}%20di%20Web%20Desa%20Ploso...`} target="_blank" rel="noreferrer" className="btn-wa">
                                  <Icons.WhatsApp /> Hubungi
                                </a>
                              ) : (
                                <span className="btn-wa disabled" title="Nomor WhatsApp tidak tersedia">
                                  <Icons.WhatsApp /> Tidak Ada WA
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <button className="btn-page" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><Icons.ChevronLeft /></button>
                    <span className="page-info">Halaman {currentPage} dari {totalPages}</span>
                    <button className="btn-page" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><Icons.ChevronRight /></button>
                  </div>
                )}
              </div>
            )}

            {/* ================= PUBLIKASI ================= */}
            {activeTab === 'publikasi' && (
              <div style={{ animation: 'fadeIn 0.4s ease', paddingTop: '24px' }}>
                <h2 style={{ fontFamily: 'Outfit', fontSize: '32px', margin: '0 0 8px 0', color: '#0f172a' }}>Pojok Publikasi</h2>
                <p style={{ color: '#64748b', margin: '0 0 32px 0', fontSize: '16px' }}>Dokumen resmi, ringkasan eksekutif, dan infografis hasil pelaksanaan program Desa Cantik.</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
                  
                  {/* Mockup Publikasi 1 */}
                  <div className="pub-card">
                    <div className="pub-icon"><Icons.File /></div>
                    <div className="pub-info">
                      <h3>Ringkasan Eksekutif Pendataan Usaha Kelurahan Ploso 2026</h3>
                      <p>Dokumen komprehensif berisi metodologi, hasil agregat, dan rekomendasi kebijakan berdasarkan data direktori usaha Kelurahan Ploso.</p>
                      <button className="btn-download" onClick={() => alert("Dokumen sedang dalam tahap penyusunan oleh Tim Desa Cantik BPS Pacitan.")}><Icons.Download /> Unduh PDF</button>
                    </div>
                  </div>

                  {/* Mockup Publikasi 2 */}
                  <div className="pub-card">
                    <div className="pub-icon" style={{ background: '#fffbeb', color: '#d97706' }}><Icons.Map /></div>
                    <div className="pub-info">
                      <h3>Peta Tematik Resolusi Tinggi (A3)</h3>
                      <p>Peta visualisasi kepadatan UMKM per Rukun Warga siap cetak, berguna untuk analisis tata ruang dan investasi desa.</p>
                      <button className="btn-download" onClick={() => alert("File peta belum tersedia.")}><Icons.Download /> Unduh JPG</button>
                    </div>
                  </div>

                  {/* Mockup Publikasi 3 */}
                  <div className="pub-card">
                    <div className="pub-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Icons.Stats /></div>
                    <div className="pub-info">
                      <h3>Infografis: Potensi Digitalisasi UMKM</h3>
                      <p>Lembar visual satu halaman (One-pager) yang menyoroti data kepemilikan NIB dan tingkat adopsi sistem pembayaran QRIS di masyarakat.</p>
                      <button className="btn-download" onClick={() => alert("Infografis sedang didesain.")}><Icons.Download /> Lihat Infografis</button>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </>
        )}
      </div>

      <footer style={{ background: '#0f172a', padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', borderTop: '4px solid #007D60' }}>
        <p style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#f1f5f9' }}>Desa Cinta Statistik (Desa Cantik) 2026</p>
        <p style={{ margin: '0 0 8px 0' }}>Bekerjasama dengan Badan Pusat Statistik (BPS) Kabupaten Pacitan</p>
        <p style={{ margin: 0, opacity: 0.7 }}>Pemerintah Kelurahan Ploso, Kecamatan Pacitan, Jawa Timur</p>
      </footer>
    </>
  );
};

export default PublicDashboard;