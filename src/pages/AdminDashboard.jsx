import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Tooltip, GeoJSON, LayersControl, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Select from 'react-select'; 
import L from 'leaflet';
import plosoGeojson from '../3501040002_Ploso.json';
import { kbliOptions } from '../dataKbliKategori'; // Pastikan file ini ada

// --- KONFIGURASI ICON TITIK UMKM ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const markerHtml = `
  <div style="background-color: #007D60; width: 20px; height: 20px; display: block; left: -10px; top: -10px; position: relative; border-radius: 50%; border: 2px solid #ffe16f; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
    <div style="background: #fff; width: 4px; height: 4px; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div>
  </div>
`;
const umkmIcon = L.divIcon({ className: "custom-pin", html: markerHtml, iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -10] });

// --- ALGORITMA VALIDASI POINT-IN-POLYGON ---
const isPointInMultiPolygon = (point, geometry) => {
  const [lng, lat] = point;
  const polys = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
  let inside = false;
  for (let i = 0; i < polys.length; i++) {
    const rings = polys[i];
    const outerRing = rings[0];
    let inOuter = false;
    for (let j = 0, k = outerRing.length - 1; j < outerRing.length; k = j++) {
      const xi = outerRing[j][0], yi = outerRing[j][1], xj = outerRing[k][0], yj = outerRing[k][1];
      const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inOuter = !inOuter;
    }
    if (inOuter) {
      let inHole = false;
      for (let h = 1; h < rings.length; h++) {
        const hole = rings[h];
        let inThisHole = false;
        for (let j = 0, k = hole.length - 1; j < hole.length; k = j++) {
          const xi = hole[j][0], yi = hole[j][1], xj = hole[k][0], yj = hole[k][1];
          const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
          if (intersect) inThisHole = !inThisHole;
        }
        if (inThisHole) { inHole = true; break; }
      }
      if (!inHole) inside = true;
    }
  }
  return inside;
};

// --- FUNGSI MUNCULKAN FOTO DRIVE ---
const getDriveImageUrl = (url) => {
  if (!url || url === '-') return null;
  const match = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/d\/([a-zA-Z0-9_-]+)/);
  return match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400` : url;
};

// --- KOMPONEN PETA UNTUK MODAL EDIT ---
function EditLocationMarker({ position, setPosition, editFeature, openAlert, rtrwData }) {
  const markerRef = useRef(null);
  const map = useMapEvents({
    click(e) {
      if (editFeature) {
        const isInside = isPointInMultiPolygon([e.latlng.lng, e.latlng.lat], editFeature.geometry);
        if (!isInside) {
          openAlert("Peringatan Wilayah", `Lokasi UMKM tidak berada di area RT ${rtrwData['RT']} RW ${rtrwData['RW']}.`, "danger");
          return;
        }
      }
      setPosition(`${e.latlng.lat}, ${e.latlng.lng}`);
      map.flyTo(e.latlng, map.getZoom());
    }
  });

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const newPos = marker.getLatLng();
        if (editFeature) {
          const isInside = isPointInMultiPolygon([newPos.lng, newPos.lat], editFeature.geometry);
          if (!isInside) {
            openAlert("Peringatan Wilayah", `Lokasi UMKM tidak berada di area RT ${rtrwData['RT']} RW ${rtrwData['RW']}.`, "danger");
            return;
          }
        }
        setPosition(`${newPos.lat}, ${newPos.lng}`);
      }
    },
  };

  const posObj = typeof position === 'string' && position.includes(',') 
    ? { lat: parseFloat(position.split(',')[0]), lng: parseFloat(position.split(',')[1]) } 
    : null;
    
  return posObj ? <Marker draggable={true} eventHandlers={eventHandlers} position={posObj} ref={markerRef} icon={umkmIcon} /> : null;
}

// --- KOMPONEN CUSTOM MODAL POP-UP ---
const CustomModal = ({ isOpen, title, message, type = 'info', onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,26,27,0.4)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', width: '90%', maxWidth: '420px', borderRadius: '6px', padding: '32px', boxShadow: '0 24px 48px rgba(0,0,0,0.15)', animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '22px', color: '#1a1a1b', fontWeight: 800, letterSpacing: '-0.5px' }}>{title}</h3>
        <p style={{ color: '#4E4E4E', fontSize: '15px', lineHeight: 1.6, marginBottom: '32px' }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          {onCancel && <button onClick={onCancel} className="btn-cancel">Batal</button>}
          <button onClick={onConfirm} className={`btn-confirm ${type}`}>Mengerti</button>
        </div>
      </div>
    </div>
  );
};

// --- SVG ICONS ---
const Icons = {
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Refresh: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 0 20.49 15"/></svg>,
  Edit: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Setting: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.8 1 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Map: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
  Database: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19C3 20.6569 7.02944 22 12 22C16.9706 22 21 20.6569 21 19V5"/><path d="M3 12C3 13.6569 7.02944 15 12 15C16.9706 15 21 13.6569 21 12"/></svg>,
  Dashboard: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>,
  ExternalLink: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  ChevronLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  Menu: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Close: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Minus: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
};

// --- KOMPONEN ANIMASI ANGKA DARI 0 ---
const AnimatedNumber = ({ value }) => {
  const [displayValue, setDisplayValue] = React.useState(0);
  React.useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10) || 0;
    if (end === 0) { setDisplayValue(0); return; }
    const totalDuration = 1200; // durasi animasi 1.2 detik
    const incrementTime = 30;
    const step = Math.max(end / (totalDuration / incrementTime), 1);
    
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, incrementTime);
    return () => clearInterval(timer);
  }, [value]);
  return <>{displayValue}</>;
};

const AdminDashboard = () => {
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx0TqenZVn-sDlSklA8eesYb08aE2uE7q9Wnvt5OCw-Y20ABr84PNmuEe4T6Nz-vlNf/exec';
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pinInput, setPinInput] = useState('');
  
  const [activeTab, setActiveTab] = useState('beranda');
  const [dataUmkm, setDataUmkm] = useState([]);
  const [listPetugas, setListPetugas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null, onCancel: null });
  const [editUmkmModal, setEditUmkmModal] = useState({ isOpen: false, data: null });
  const [editMapRef, setEditMapRef] = useState(null);
  const [petugasModal, setPetugasModal] = useState({ isOpen: false, type: '', nama: '' });

  const [filterRT, setFilterRT] = useState('');
  const [filterRW, setFilterRW] = useState('');
  const [filterNIB, setFilterNIB] = useState('');
  const [filterQRIS, setFilterQRIS] = useState('');
  const [filterKBLI, setFilterKBLI] = useState('');
  const [searchTableQuery, setSearchTableQuery] = useState('');

  const [rwList, setRwList] = useState([]);
  const [rwToRtMap, setRwToRtMap] = useState({});
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [targetUmkm, setTargetUmkm] = useState(500);
  const centerPloso = [-8.2050, 111.1050];
  const [barChartMetric, setBarChartMetric] = useState('jumlah');

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
      fetchPetugas();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (plosoGeojson && plosoGeojson.features) {
      const mapData = {};
      plosoGeojson.features.forEach(f => {
        const name = f.properties.nmsls || '';
        const rtMatch = name.match(/RT\s+0*(\d+)/i);
        const rwMatch = name.match(/RW\s+0*(\d+)/i);
        if (rtMatch && rwMatch) {
          const rt = String(parseInt(rtMatch[1])).padStart(2, '0');
          const rw = String(parseInt(rwMatch[1])).padStart(2, '0');
          if (!mapData[rw]) mapData[rw] = new Set();
          mapData[rw].add(rt);
        }
      });
      const finalMap = {};
      Object.keys(mapData).forEach(rw => { finalMap[rw] = Array.from(mapData[rw]).sort(); });
      setRwToRtMap(finalMap);
      setRwList(Object.keys(finalMap).sort());
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1); 
  }, [filterRT, filterRW, searchTableQuery, filterNIB, filterQRIS, filterKBLI]);

  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  const openAlert = (title, message, type = 'info', onConfirm = null, onCancel = null) => {
    setModal({
      isOpen: true, title, message, type,
      onConfirm: () => { if (onConfirm) onConfirm(); closeModal(); },
      onCancel: onCancel ? () => { onCancel(); closeModal(); } : null
    });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (pinInput === 'PLOSO2026') setIsLoggedIn(true);
    else openAlert("Akses Ditolak", "PIN salah.", "danger");
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(SCRIPT_URL);
      if (Array.isArray(res.data)) setDataUmkm(res.data);
    } catch (e) { openAlert("Error", "Gagal mengambil data UMKM.", "danger"); } 
    finally { setIsLoading(false); }
  };

  const fetchPetugas = async () => {
    try {
      const res = await axios.get(`${SCRIPT_URL}?action=getPetugas`);
      if (Array.isArray(res.data)) setListPetugas(res.data);
    } catch (e) { console.error(e); }
  };

  const submitDeleteData = async (nama) => {
    setIsLoading(true);
    try {
      await axios.post(SCRIPT_URL, JSON.stringify({ action: 'deleteData', namaUsaha: nama }), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      setDataUmkm(prev => prev.filter(d => d['Nama Usaha'] !== nama));
      openAlert("Berhasil", "Data berhasil dihapus dari server.", "success");
    } catch(e) { openAlert("Error", "Gagal menghapus data di server.", "danger"); }
    finally { setIsLoading(false); }
  };

  const handleFocusWilayah = () => {
  // Pastikan editMapRef sudah terhubung ke MapContainer
  if (!editMapRef || !editUmkmModal.data.RT || !editUmkmModal.data.RW) return;

  // Mencari feature RT/RW yang dipilih
  const feature = plosoGeojson.features.find(f => {
    const nmsls = f.properties.nmsls || '';
    return nmsls.includes(`RT ${String(editUmkmModal.data.RT).padStart(2, '0')}`) && 
           nmsls.includes(`RW ${String(editUmkmModal.data.RW).padStart(2, '0')}`);
  });

  if (feature) {
    const layer = L.geoJSON(feature);
    editMapRef.flyToBounds(layer.getBounds(), { padding: [50, 50], duration: 1.2 });
  } else {
    alert("Wilayah RT/RW tidak ditemukan di peta.");
  }
};

  const handleEditFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file); 
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditUmkmModal(prev => ({
          ...prev,
          [type === 'usaha' ? 'previewUsaha' : 'previewQris']: objectUrl, 
          data: {
            ...prev.data,
            [type === 'usaha' ? 'fotoUsahaBase64' : 'fotoQrisBase64']: reader.result.split(',')[1],
            [type === 'usaha' ? 'fotoUsahaMimeType' : 'fotoQrisMimeType']: file.type
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const submitEditData = async (e) => {
    e.preventDefault();
    
    // Validasi NIB
    if (editUmkmModal.data['Punya NIB'] === 'Ya') {
      const nibValue = editUmkmModal.data['Nomor NIB'] || '';
      if (nibValue.length !== 13 || !/^\d+$/.test(nibValue)) {
        openAlert("Validasi Gagal", "Nomor NIB harus diisi tepat 13 digit angka tanpa spasi atau huruf.", "danger");
        return;
      }
    }

    // TAMBAHKAN INI: Fungsi untuk otomatis mengarahkan peta ke RT/RW yang dipilih
    const flyToEditRegion = (feature) => {
      if (editMapRef && feature) {
        const layer = L.geoJSON(feature);
        editMapRef.flyToBounds(layer.getBounds(), { padding: [40, 40], duration: 1.2 });
      }
    };

    setIsLoading(true);
    const updatedData = { ...editUmkmModal.data };
    const oldNama = updatedData.oldNamaUsaha;
    delete updatedData.oldNamaUsaha; 

    // Optimistic Update
    setDataUmkm(prev => prev.map(item => item['Nama Usaha'] === oldNama ? updatedData : item));

    try {
      await axios.post(SCRIPT_URL, JSON.stringify({ action: 'editData', ...editUmkmModal.data }), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      setEditUmkmModal({ isOpen: false, data: null });
      openAlert("Berhasil", "Data UMKM berhasil diperbarui.", "success");
    } catch(e) { 
      openAlert("Error", "Gagal menyimpan perubahan ke server.", "danger"); 
      fetchData(); 
    } finally { setIsLoading(false); }
  };

  const submitAddPetugas = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.post(SCRIPT_URL, JSON.stringify({ action: 'addPetugas', namaPetugas: petugasModal.nama }), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      fetchPetugas();
      setPetugasModal({ isOpen: false });
      openAlert("Berhasil", "Petugas baru berhasil ditambahkan.", "success");
    } catch(e) { openAlert("Error", "Gagal menambah petugas.", "danger"); }
    finally { setIsLoading(false); }
  };

  const submitDeletePetugas = async (nama) => {
    setIsLoading(true);
    try {
      await axios.post(SCRIPT_URL, JSON.stringify({ action: 'deletePetugas', namaPetugas: nama }), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      fetchPetugas();
      openAlert("Berhasil", "Petugas berhasil dihapus.", "success");
    } catch(e) { openAlert("Error", "Gagal menghapus petugas.", "danger"); }
    finally { setIsLoading(false); }
  };

  const filteredData = dataUmkm.filter(item => {
    const dRt = String(item['RT']).padStart(2, '0');
    const dRw = String(item['RW']).padStart(2, '0');
    const matchRT = filterRT === '' || dRt === filterRT;
    const matchRW = filterRW === '' || dRw === filterRW;
    const matchNIB = filterNIB === '' || item['Punya NIB'] === filterNIB;
    const matchQRIS = filterQRIS === '' || item['Punya QRIS'] === filterQRIS;
    const matchKBLI = filterKBLI === '' || item['KBLI'] === filterKBLI;
    const searchLow = searchTableQuery.toLowerCase();
    const matchSearch = item['Nama Usaha']?.toLowerCase().includes(searchLow) || 
                        item['KBLI']?.toLowerCase().includes(searchLow) ||
                        item['Nama Petugas']?.toLowerCase().includes(searchLow);
    return matchRT && matchRW && matchNIB && matchQRIS && matchKBLI && matchSearch;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentTableData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getGeoJsonStyle = (feature) => {
    const name = feature.properties.nmsls || '';
    const rtMatch = name.match(/RT\s+0*(\d+)/i);
    const rwMatch = name.match(/RW\s+0*(\d+)/i);
    const rt = rtMatch ? String(parseInt(rtMatch[1])).padStart(2, '0') : '';
    const rw = rwMatch ? String(parseInt(rwMatch[1])).padStart(2, '0') : '';

    const count = filteredData.filter(d => {
      const dRt = String(d['RT']).padStart(2, '0');
      const dRw = String(d['RW']).padStart(2, '0');
      return dRt === rt && dRw === rw;
    }).length;
    
    const isFiltered = (filterRT === '' || filterRT === rt) && (filterRW === '' || filterRW === rw);

    let fillColor = '#f3f4f6'; 
    if (count > 0) fillColor = '#a7f3d0';  
    if (count > 5) fillColor = '#34d399';  
    if (count > 15) fillColor = '#10b981'; 
    if (count > 30) fillColor = '#007D60'; 

    return {
      fillColor: fillColor, weight: isFiltered ? 2 : 1, opacity: 1,
      color: isFiltered ? '#1a1a1b' : '#ffffff', fillOpacity: isFiltered ? 0.85 : 0.6
    };
  };

  const onEachGeoJsonFeature = (feature, layer) => {
    const name = feature.properties.nmsls || '';
    const rtMatch = name.match(/RT\s+0*(\d+)/i);
    const rwMatch = name.match(/RW\s+0*(\d+)/i);
    const rt = rtMatch ? String(parseInt(rtMatch[1])).padStart(2, '0') : '';
    const rw = rwMatch ? String(parseInt(rwMatch[1])).padStart(2, '0') : '';
    
    const count = filteredData.filter(d => {
      const dRt = String(d['RT']).padStart(2, '0');
      const dRw = String(d['RW']).padStart(2, '0');
      return dRt === rt && dRw === rw;
    }).length;

    layer.bindTooltip(`
      <div style="font-family: 'Inter', sans-serif; color: #1a1a1b;">
        <div style="font-weight: 800; font-size: 15px; margin-bottom: 4px;">${name}</div>
        <div style="font-size: 14px; color: #4E4E4E;">Total Pendataan: <strong>${count} UMKM</strong></div>
      </div>
    `, { sticky: true, direction: "top", offset: [0, -10] });

    layer.on({ click: () => { if(rw) { setFilterRW(rw); if(rt) setFilterRT(rt); } } });
  };

  const getRwChartData = () => {
    const stats = {};
    dataUmkm.forEach(d => {
      const rw = d['RW'] ? String(d['RW']).padStart(2, '0') : 'Lainnya';
      if(!stats[rw]) stats[rw] = { total: 0, nib: 0, qris: 0 };
      stats[rw].total += 1;
      if(d['Punya NIB'] === 'Ya') stats[rw].nib += 1;
      if(d['Punya QRIS'] === 'Ya') stats[rw].qris += 1;
    });

    const sortedRw = Object.keys(stats).sort();
    let result = [];
    let maxVal = 1;

    sortedRw.forEach(rw => {
      let val = 0;
      if(barChartMetric === 'jumlah') val = stats[rw].total;
      else if(barChartMetric === 'nib') val = stats[rw].total > 0 ? (stats[rw].nib / stats[rw].total) * 100 : 0;
      else if(barChartMetric === 'qris') val = stats[rw].total > 0 ? (stats[rw].qris / stats[rw].total) * 100 : 0;
      result.push({ label: rw, value: val });
    });

    maxVal = barChartMetric === 'jumlah' ? Math.max(...result.map(d => d.value), 1) : 100;
    return { result, maxVal };
  };
  const { result: chartData, maxVal: chartMax } = getRwChartData();

  const getAlasanNibData = () => {
    const counts = {};
    dataUmkm.filter(d => d['Punya NIB'] === 'Tidak').forEach(d => {
      const alasan = d['Alasan Tidak NIB'] && d['Alasan Tidak NIB'] !== '-' ? d['Alasan Tidak NIB'] : 'Tidak Diketahui';
      counts[alasan] = (counts[alasan] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const maxVal = Math.max(...Object.values(counts), 1);
    return { sorted, maxVal };
  };
  const { sorted: alasanNibData, maxVal: alasanNibMax } = getAlasanNibData();

  const totalBelumNib = dataUmkm.filter(d => d['Punya NIB'] === 'Tidak').length;
  const mauNib = dataUmkm.filter(d => d['Punya NIB'] === 'Tidak' && d['Urus NIB'] === 'Ya').length;
  const pctMauNib = totalBelumNib > 0 ? ((mauNib / totalBelumNib) * 100).toFixed(1) : 0;

  const totalBelumQris = dataUmkm.filter(d => d['Punya QRIS'] === 'Tidak').length;
  const mauQris = dataUmkm.filter(d => d['Punya QRIS'] === 'Tidak' && d['Urus QRIS'] === 'Ya').length;
  const pctMauQris = totalBelumQris > 0 ? ((mauQris / totalBelumQris) * 100).toFixed(1) : 0;

  const FilterControls = () => (
    <div className="filter-bar">
      <div className="search-wrapper">
        <Icons.Search />
        <input type="text" className="clean-input" placeholder="Cari UMKM atau Petugas..." value={searchTableQuery} onChange={(e) => setSearchTableQuery(e.target.value)} />
      </div>
      <select className="clean-input" value={filterRW} onChange={e => { setFilterRW(e.target.value); setFilterRT(''); }}>
        <option value="">Semua RW</option>
        {rwList.map((rwStr, i) => <option key={i} value={rwStr}>RW {rwStr}</option>)}
      </select>
      <select className="clean-input" value={filterRT} onChange={e => setFilterRT(e.target.value)} disabled={!filterRW}>
        <option value="">{!filterRW ? 'Pilih RW dulu' : 'Semua RT'}</option>
        {filterRW && rwToRtMap[filterRW] ? rwToRtMap[filterRW].map((rtStr, i) => <option key={i} value={rtStr}>RT {rtStr}</option>) : null}
      </select>
      <select className="clean-input" value={filterNIB} onChange={e => setFilterNIB(e.target.value)}>
        <option value="">Status NIB (Semua)</option>
        <option value="Ya">Punya NIB</option>
        <option value="Tidak">Belum Punya</option>
      </select>
      <select className="clean-input" value={filterQRIS} onChange={e => setFilterQRIS(e.target.value)}>
        <option value="">Status QRIS (Semua)</option>
        <option value="Ya">Punya QRIS</option>
        <option value="Tidak">Belum Punya</option>
      </select>
      <select className="clean-input" value={filterKBLI} onChange={e => setFilterKBLI(e.target.value)} style={{ maxWidth: '200px' }}>
        <option value="">Semua KBLI</option>
        {kbliOptions.map((kbli, i) => {
          const textLabel = typeof kbli === 'object' ? kbli.label : String(kbli);
          return (
            <option key={i} value={textLabel}>
              {textLabel.length > 30 ? textLabel.substring(0, 30) + '...' : textLabel}
            </option>
          );
        })}
      </select>
      {(filterRT || filterRW || searchTableQuery || filterNIB || filterQRIS || filterKBLI) && (
        <button className="btn-action" style={{ background: '#fff', border: '1px solid #d1d5db', color: '#1a1a1b' }} onClick={() => { 
          setFilterRT(''); setFilterRW(''); setSearchTableQuery(''); setFilterNIB(''); setFilterQRIS(''); setFilterKBLI(''); 
        }}>Reset</button>
      )}
    </div>
  );

  const KPICards = ({ dataTarget }) => {
    // State untuk memicu animasi progress bar saat komponen dimuat
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setTimeout(() => setIsMounted(true), 100); }, []);

    const total = dataTarget.length;
    const safeTarget = Number(targetUmkm) > 0 ? Number(targetUmkm) : 1;
    const pctTotal = Math.min((total / safeTarget) * 100, 100).toFixed(1);
    
    const countNib = dataTarget.filter(d => d['Punya NIB'] === 'Ya').length;
    const countQris = dataTarget.filter(d => d['Punya QRIS'] === 'Ya').length;
    const pctNib = total > 0 ? ((countNib / total) * 100).toFixed(1) : 0;
    const pctQris = total > 0 ? ((countQris / total) * 100).toFixed(1) : 0;

    return (
      <section className="kpi-grid" style={{ marginBottom: '32px' }}>
        <div className="content-card">
          <div className="kpi-title">TOTAL UMKM DIDATA</div>
          <div className="kpi-value" style={{ color: '#007D60' }}><AnimatedNumber value={total} /></div>
          <div className="kpi-label">Dari target estimasi {targetUmkm} usaha.</div>
          <div className="progress-wrapper">
            <div className="progress-track"><div className="progress-fill" style={{ width: isMounted ? `${pctTotal}%` : '0%', transition: 'width 1.5s cubic-bezier(0.22, 1, 0.36, 1)' }}></div></div>
            <div className="progress-text">{pctTotal}%</div>
          </div>
        </div>
        <div className="content-card">
          <div className="kpi-title">MEMILIKI LEGALITAS NIB</div>
          <div className="kpi-value"><AnimatedNumber value={countNib} /></div>
          <div className="kpi-label">Usaha terdaftar secara resmi.</div>
          <div className="progress-wrapper">
            <div className="progress-track"><div className="progress-fill" style={{ width: isMounted ? `${pctNib}%` : '0%', transition: 'width 1.5s cubic-bezier(0.22, 1, 0.36, 1)' }}></div></div>
            <div className="progress-text">{pctNib}%</div>
          </div>
        </div>
        <div className="content-card">
          <div className="kpi-title">MEMILIKI KANAL QRIS</div>
          <div className="kpi-value"><AnimatedNumber value={countQris} /></div>
          <div className="kpi-label">Usaha mengadopsi pembayaran digital.</div>
          <div className="progress-wrapper">
            <div className="progress-track"><div className="progress-fill" style={{ width: isMounted ? `${pctQris}%` : '0%', transition: 'width 1.5s cubic-bezier(0.22, 1, 0.36, 1)' }}></div></div>
            <div className="progress-text">{pctQris}%</div>
          </div>
        </div>
      </section>
    );
  };

  const MapSection = ({ height }) => (
    <div className="map-container-inner" style={{ height: height }}>
      <MapContainer center={centerPloso} zoom={15} scrollWheelZoom={true} style={{ height: '100%', width: '100%', background: '#1a1a1b' }}>
        <LayersControl position="topright">
          {/* DEFAULT SATELIT SEKARANG DI ATAS DENGAN TAG 'checked' */}
          <LayersControl.BaseLayer checked name="Satelit Google">
            <TileLayer url="http://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Peta Polos (Tanpa Label)">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Peta Standar (OSM)">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Peta Gelap (Dark Mode)">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          </LayersControl.BaseLayer>
        </LayersControl>

        {plosoGeojson && (
          <GeoJSON 
            key={`geojson-${filterRT}-${filterRW}-${filterNIB}-${filterQRIS}-${filterKBLI}-${searchTableQuery}-${dataUmkm.length}`}
            data={plosoGeojson} 
            style={getGeoJsonStyle}
            onEachFeature={onEachGeoJsonFeature}
          />
        )}

        {!isLoading && filteredData.map((item, index) => {
          const loc = item['Lokasi (Lat, Lng)'];
          if (loc && loc !== '-' && loc.includes(',')) {
            const [lat, lng] = loc.split(',');
            return (
              <Marker key={index} position={[parseFloat(lat), parseFloat(lng)]} icon={umkmIcon}>
                <Tooltip direction="top" offset={[0, -20]} opacity={1} className="clean-tooltip" interactive={true}>
                  <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '8px' }}>{item['Nama Usaha']}</div>
                  <div style={{ fontSize: '13px', color: '#4E4E4E', marginBottom: '4px' }}><strong>KBLI:</strong> {item['KBLI']}</div>
                  <div style={{ fontSize: '13px', color: '#4E4E4E', marginBottom: '12px' }}><strong>Alamat:</strong> RT {item['RT']}/RW {item['RW']}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span className={`badge ${item['Punya NIB'] === 'Ya' ? 'bg-green' : 'badge-gray'}`}>NIB</span>
                    <span className={`badge ${item['Punya QRIS'] === 'Ya' ? 'bg-green' : 'badge-gray'}`}>QRIS</span>
                  </div>
                </Tooltip>
              </Marker>
            );
          }
          return null;
        })}
      </MapContainer>
      
      <div className={`map-legend ${isLegendOpen ? '' : 'collapsed'}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isLegendOpen ? '12px' : '0' }}>
          <div className="legend-title" style={{ margin: 0 }}>Kepadatan Area</div>
          <button className="btn-action" style={{ padding: '4px', border: 'none', background: 'transparent' }} onClick={() => setIsLegendOpen(!isLegendOpen)}>
            {isLegendOpen ? <Icons.Minus /> : <Icons.Plus />}
          </button>
        </div>
        {isLegendOpen && (
          <>
            <div className="legend-item"><div className="legend-color" style={{background: '#f3f4f6'}}></div> 0 Data</div>
            <div className="legend-item"><div className="legend-color" style={{background: '#a7f3d0'}}></div> 1 - 5 UMKM</div>
            <div className="legend-item"><div className="legend-color" style={{background: '#34d399'}}></div> 6 - 15 UMKM</div>
            <div className="legend-item"><div className="legend-color" style={{background: '#10b981'}}></div> 16 - 30 UMKM</div>
            <div className="legend-item"><div className="legend-color" style={{background: '#007D60'}}></div> &gt; 30 UMKM</div>
          </>
        )}
      </div>
    </div>
  );

  // --- RENDER UMUM ---
  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', fontFamily: 'Inter, sans-serif' }}>
        <CustomModal {...modal} onConfirm={modal.onConfirm || closeModal} />
        <div style={{ background: '#fff', padding: '48px', borderRadius: '6px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'center', width: '100%', maxWidth: '380px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '28px', margin: '0 0 8px 0', color: '#1a1a1b', fontWeight: 800, letterSpacing: '-0.5px' }}>DASHBOARD UMKM</h2>
          <p style={{ color: '#6b7280', fontSize: '15px', margin: '0 0 32px 0' }}>Kelurahan Ploso 2026</p>
          <form onSubmit={handleLogin}>
            <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="PIN Akses" style={{ width: '100%', padding: '16px', borderRadius: '6px', border: '1px solid #d1d5db', marginBottom: '24px', fontSize: '16px', textAlign: 'center', letterSpacing: '4px', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter', background: '#f9fafb' }} />
            <button type="submit" style={{ width: '100%', padding: '16px', background: '#007D60', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '15px', color: '#fff', cursor: 'pointer', transition: '0.2s' }}>MASUK</button>
          </form>
        </div>
      </div>
    );
  }

  // Menyiapkan Variabel untuk Modal Edit agar rapi
  let editActiveFeature = null;
  let editMapCenter = centerPloso;
  if (editUmkmModal.data) {
    editActiveFeature = plosoGeojson.features.find(f => {
      const rtMatch = (f.properties.nmsls || '').match(/RT\s+0*(\d+)/i);
      const rwMatch = (f.properties.nmsls || '').match(/RW\s+0*(\d+)/i);
      const rt = rtMatch ? String(parseInt(rtMatch[1])).padStart(2, '0') : '';
      const rw = rwMatch ? String(parseInt(rwMatch[1])).padStart(2, '0') : '';
      return rt === String(editUmkmModal.data['RT']).padStart(2, '0') && 
             rw === String(editUmkmModal.data['RW']).padStart(2, '0');
    });

    const currentLoc = editUmkmModal.data['Lokasi (Lat, Lng)'];
    if (currentLoc && currentLoc.includes(',')) {
      editMapCenter = { lat: parseFloat(currentLoc.split(',')[0]), lng: parseFloat(currentLoc.split(',')[1]) };
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body, html { margin: 0; padding: 0; background-color: #f9fafb; font-family: 'Inter', -apple-system, sans-serif; color: #1a1a1b; }
        @keyframes popIn { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        
        .clean-header { background: #ffffff; border-top: 8px solid #007D60; border-bottom: 1px solid #e5e7eb; padding: 0 40px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 1000; height: 72px; }
        .brand-logo { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #1a1a1b; }
        .nav-menu { display: flex; gap: 8px; height: 100%; }
        .nav-tab { background: transparent; border: none; color: #6b7280; font-family: 'Inter'; font-weight: 500; font-size: 15px; padding: 0 20px; cursor: pointer; display: flex; align-items: center; gap: 8px; position: relative; transition: 0.2s; }
        .nav-tab:hover { color: #1a1a1b; }
        .nav-tab.active { color: #1a1a1b; font-weight: 700; }
        .nav-tab.active::after { content: ''; position: absolute; bottom: -1px; left: 0; width: 100%; height: 3px; background: #007D60; }

        .main-container { max-width: 1440px; margin: 0 auto; padding: 40px; display: flex; flex-direction: column; gap: 40px; animation: fadeIn 0.4s ease; }
        .highlight-yellow { background-color: #ffe16f; padding: 0 4px; color: #1a1a1b; }
        
        .hero-section { max-width: 900px; margin-bottom: 12px; }
        .hero-title { font-size: 48px; font-weight: 800; line-height: 1.1; margin: 0 0 20px 0; letter-spacing: -1.5px; color: #1a1a1b; }
        .hero-desc { font-size: 20px; line-height: 1.6; color: #4E4E4E; margin: 0; }
        
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
        .content-card { background: #ffffff; border-radius: 6px; border: 1px solid #e5e7eb; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); position: relative; }
        .kpi-title { font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;}
        .kpi-value { font-size: 48px; font-weight: 800; letter-spacing: -1px; color: #1a1a1b; line-height: 1; margin-bottom: 8px; }
        .kpi-label { font-size: 14px; font-weight: 500; color: #4E4E4E; line-height: 1.4; }
        
        .progress-wrapper { margin-top: 16px; display: flex; align-items: center; gap: 12px; }
        .progress-track { flex: 1; height: 6px; background-color: #f3f4f6; border-radius: 6px; overflow: hidden; }
        .progress-fill { height: 100%; transition: width 0.5s ease; }
        .progress-text { font-size: 13px; font-weight: 700; color: #1a1a1b; width: 40px; text-align: right; }

        .section-title { font-size: 22px; font-weight: 800; margin: 0 0 8px 0; color: #1a1a1b; letter-spacing: -0.5px; }

        .map-container-inner { width: 100%; border-radius: 6px; overflow: hidden; z-index: 1; border: 1px solid #e5e7eb; background: #e5e7eb; position: relative; }
        .map-legend { position: absolute; bottom: 24px; right: 24px; background: rgba(255,255,255,0.95); padding: 16px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); z-index: 1000; border: 1px solid #e5e7eb; transition: 0.3s ease; }
        .map-legend.collapsed { padding: 12px 16px; }
        .legend-title { font-size: 13px; font-weight: 700; color: #1a1a1b; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #4E4E4E; margin-bottom: 6px; font-weight: 500; }
        .legend-color { width: 14px; height: 14px; border-radius: 2px; border: 1px solid #d1d5db; }
        .clean-tooltip { background: #ffffff; color: #1a1a1b; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; font-family: 'Inter', sans-serif; box-shadow: 0 8px 24px rgba(0,0,0,0.12); min-width: 250px; white-space: normal; }
        .clean-tooltip .leaflet-tooltip-top:before { border-top-color: #ffffff; }

        .barchart-wrapper { display: flex; flex-direction: column; width: 100%; margin-top: 16px; }
        .barchart-row { display: flex; align-items: center; margin-bottom: 12px; gap: 16px; }
        .barchart-label { width: 120px; font-size: 13px; font-weight: 600; color: #4E4E4E; text-align: right; line-height: 1.3; }
        .barchart-area { flex: 1; height: 24px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
        .barchart-fill { height: 100%; border-radius: 4px; transition: width 1s cubic-bezier(0.16, 1, 0.3, 1); }
        .barchart-value { width: 40px; font-size: 14px; font-weight: 700; color: #1a1a1b; }

        .btn-metric { padding: 6px 14px; border-radius: 99px; border: 1px solid #d1d5db; background: #fff; font-size: 13px; font-weight: 600; color: #4b5563; cursor: pointer; transition: 0.2s; font-family: 'Inter'; }
        .btn-metric:hover { background: #f3f4f6; }
        .btn-metric.active { background: #1a1a1b; color: #fff; border-color: #1a1a1b; }

        .filter-bar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .search-wrapper { position: relative; flex: 1; min-width: 200px; }
        .search-wrapper svg { position: absolute; left: 16px; top: 10px; color: #9ca3af; width: 18px; height: 18px; }
        .clean-input { padding: 10px 16px; border-radius: 6px; border: 1px solid #d1d5db; outline: none; font-family: 'Inter'; font-size: 14px; background: #fff; min-width: 140px; transition: 0.2s; font-weight: 500; }
        .search-wrapper .clean-input { width: 100%; padding-left: 44px; box-sizing: border-box; }
        .clean-input:focus { border-color: #007D60; box-shadow: 0 0 0 3px rgba(0, 125, 96, 0.1); }
        .clean-input:disabled { background: #f3f4f6; cursor: not-allowed; color: #9ca3af; }
        
        .table-wrapper { overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 6px; }
        table { width: 100%; border-collapse: collapse; text-align: left; background: #fff; min-width: 800px; }
        thead { background: #f9fafb; border-bottom: 2px solid #e5e7eb; }
        th { padding: 16px; font-size: 13px; font-weight: 700; color: #4b5563; white-space: nowrap; }
        td { padding: 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #1a1a1b; vertical-align: top; }
        tr:hover td { background-color: #f9fafb; }
        
        .pagination-container { display: flex; justify-content: space-between; align-items: center; padding-top: 20px; font-size: 14px; color: #6b7280; }
        .pagination-controls { display: flex; gap: 8px; align-items: center; }
        .btn-page { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; color: #1a1a1b; transition: 0.2s; }
        .btn-page:hover:not(:disabled) { background: #f3f4f6; }
        .btn-page:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .badge { display: inline-flex; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; border: 1px solid transparent; }
        .badge-gray { background: #f3f4f6; color: #4b5563; border-color: #e5e7eb; }
        .badge-green { background: #ecfdf5; color: #007D60; border-color: #a7f3d0; }
        .badge-yellow { background: #fffbeb; color: #d97706; border-color: #fde68a; }
        
        .btn-action { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 16px; border-radius: 6px; border: none; font-family: 'Inter'; font-weight: 600; font-size: 13px; cursor: pointer; transition: 0.2s; }
        .btn-primary { background: #1a1a1b; color: #ffffff; }
        .btn-primary:hover { background: #007D60; }
        .btn-link { color: #007D60; font-size: 13px; font-weight: 600; text-decoration: underline; background: none; border: none; cursor: pointer; padding: 0; display: inline-flex; align-items: center; gap: 4px; }
        .btn-link:hover { color: #1a1a1b; }
        
        .btn-cancel { padding: 10px 16px; border-radius: 6px; background: #f3f4f6; border: 1px solid #d1d5db; font-weight: 600; cursor: pointer; color: #1a1a1b; font-family: 'Inter'; }
        .btn-confirm { padding: 10px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; color: #fff; border: none; font-family: 'Inter'; }
        .btn-confirm.info { background: #007D60; }
        .btn-confirm.danger { background: #ef4444; }

        .mobile-menu-btn { display: none; background: none; border: none; cursor: pointer; color: #1a1a1b; padding: 8px; }

        @media (max-width: 1024px) {
          .clean-header { padding: 16px 20px; }
          .mobile-menu-btn { display: block; }
          .nav-menu { display: none; flex-direction: column; position: absolute; top: 72px; left: 0; right: 0; background: #fff; box-shadow: 0 10px 15px rgba(0,0,0,0.1); padding: 16px; height: auto; }
          .nav-menu.open { display: flex; }
          .nav-tab { width: 100%; justify-content: flex-start; padding: 14px 16px; border-radius: 6px; }
          .nav-tab.active::after { display: none; }
          .nav-tab.active { background: #f3f4f6; }
          .main-container { padding: 24px 16px; }
          .hero-title { font-size: 36px; }
        }
      `}</style>

      <CustomModal {...modal} onConfirm={modal.onConfirm || closeModal} />

      {/* MODAL EDIT UMKM KHUSUS */}
      {editUmkmModal.isOpen && editUmkmModal.data && (() => {
        // Mendapatkan batas polygon wilayah RT/RW data terpilih
        const editFeature = plosoGeojson.features.find(f => {
          const rtMatch = (f.properties.nmsls || '').match(/RT\s+0*(\d+)/i);
          const rwMatch = (f.properties.nmsls || '').match(/RW\s+0*(\d+)/i);
          const rt = rtMatch ? String(parseInt(rtMatch[1])).padStart(2, '0') : '';
          const rw = rwMatch ? String(parseInt(rwMatch[1])).padStart(2, '0') : '';
          return rt === String(editUmkmModal.data['RT']).padStart(2, '0') && 
                 rw === String(editUmkmModal.data['RW']).padStart(2, '0');
        });

        const currentLoc = editUmkmModal.data['Lokasi (Lat, Lng)'];
        const mapCenter = currentLoc && currentLoc.includes(',') 
          ? { lat: parseFloat(currentLoc.split(',')[0]), lng: parseFloat(currentLoc.split(',')[1]) }
          : centerPloso;

        return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,26,27,0.4)', backdropFilter: 'blur(4px)', padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '640px', maxHeight: '95vh', display: 'flex', flexDirection: 'column', borderRadius: '8px', boxShadow: '0 24px 48px rgba(0,0,0,0.15)', overflowX: 'hidden', boxSizing: 'border-box' }}>
            
            <div style={{ padding: '20px 24px 14px 24px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#1a1a1b', fontWeight: 800 }}>Edit Data UMKM</h3>
              <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>Perbarui berkas administratif usaha lapangan.</p>
            </div>
            
            <form onSubmit={submitEditData} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', boxSizing: 'border-box' }}>
              <div style={{ padding: '20px 24px', overflowY: 'auto', overflowX: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}>
                
                {/* BARIS 1: NAMA USAHA & ALAMAT USAHA */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block' }}>Nama Usaha</label>
                    <input required type="text" className="clean-input" style={{ width: '100%', boxSizing: 'border-box' }} value={editUmkmModal.data['Nama Usaha'] || ''} onChange={e => setEditUmkmModal({ ...editUmkmModal, data: { ...editUmkmModal.data, 'Nama Usaha': e.target.value } })} />
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block' }}>Alamat Usaha</label>
                    <input required type="text" className="clean-input" style={{ width: '100%', boxSizing: 'border-box' }} value={editUmkmModal.data['Alamat'] || ''} onChange={e => setEditUmkmModal({ ...editUmkmModal, data: { ...editUmkmModal.data, 'Alamat': e.target.value } })} />
                  </div>
                </div>

                {/* BARIS 2: RT, RW, NO HP */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ flex: '1 1 100px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block' }}>RW</label>
                    <select required className="clean-input" style={{ width: '100%', boxSizing: 'border-box' }} value={String(editUmkmModal.data['RW'] || '').padStart(2, '0')} onChange={e => setEditUmkmModal({ ...editUmkmModal, data: { ...editUmkmModal.data, 'RW': e.target.value, 'RT': '' } })}>
                      <option value="" disabled hidden>Pilih RW</option>
                      {rwList.map((rwStr, i) => <option key={i} value={rwStr}>{rwStr}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: '1 1 100px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block' }}>RT</label>
                    <select required className="clean-input" style={{ width: '100%', boxSizing: 'border-box' }} value={String(editUmkmModal.data['RT'] || '').padStart(2, '0')} onChange={e => setEditUmkmModal({ ...editUmkmModal, data: { ...editUmkmModal.data, 'RT': e.target.value } })} disabled={!editUmkmModal.data['RW']}>
                      <option value="" disabled hidden>Pilih RT</option>
                      {editUmkmModal.data['RW'] && rwToRtMap[String(editUmkmModal.data['RW']).padStart(2, '0')] ? rwToRtMap[String(editUmkmModal.data['RW']).padStart(2, '0')].map((rtStr, i) => <option key={i} value={rtStr}>{rtStr}</option>) : null}
                    </select>
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block' }}>Nomor HP</label>
                    <input type="text" className="clean-input" style={{ width: '100%', boxSizing: 'border-box' }} value={editUmkmModal.data['No HP'] || ''} 
                      onChange={e => {
                        let val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length > 0 && val[0] !== '0') val = '0' + val;
                        setEditUmkmModal({ ...editUmkmModal, data: { ...editUmkmModal.data, 'No HP': val } })
                      }} 
                    />
                  </div>
                </div>

                {/* BARIS 3: KBLI DROPDOWN LIST FIX & DESKRIPSI USAHA */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block' }}>KBLI 2025</label>
                    <input required list="datalistKbliEdit" className="clean-input" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Pilih KBLI..." value={editUmkmModal.data['KBLI'] || ''} onChange={e => setEditUmkmModal({ ...editUmkmModal, data: { ...editUmkmModal.data, 'KBLI': e.target.value } })} />
                    <datalist id="datalistKbliEdit">
                      {kbliOptions.map((opt, i) => (
                        <option key={i} value={opt.label || opt.value || opt} />
                      ))}
                    </datalist>
                  </div>
                  <div style={{ flex: '1 1 250px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block' }}>Deskripsi Usaha</label>
                    <textarea required className="clean-input" style={{ width: '100%', minHeight: '40px', resize: 'vertical', boxSizing: 'border-box' }} value={editUmkmModal.data['Deskripsi Usaha'] || ''} onChange={e => setEditUmkmModal({ ...editUmkmModal, data: { ...editUmkmModal.data, 'Deskripsi Usaha': e.target.value } })} />
                  </div>
                </div>

                {/* BARIS 4 & 5: STATUS NIB & STATUS QRIS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f9fafb', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700 }}>Status NIB</label>
                    <select className="clean-input" style={{ width: '100%' }} value={editUmkmModal.data['Punya NIB'] || ''} onChange={e => setEditUmkmModal({ ...editUmkmModal, data: { ...editUmkmModal.data, 'Punya NIB': e.target.value } })}>
                      <option value="Ya">Punya NIB</option><option value="Tidak">Belum Punya</option>
                    </select>
                    {editUmkmModal.data['Punya NIB'] === 'Ya' && (
                      <input type="text" className="clean-input" style={{ width: '100%', boxSizing: 'border-box' }} maxLength="13" value={editUmkmModal.data['Nomor NIB'] || ''} onChange={e => setEditUmkmModal({ ...editUmkmModal, data: { ...editUmkmModal.data, 'Nomor NIB': e.target.value.replace(/[^0-9]/g, '') } })} placeholder="13 Digit NIB" />
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700 }}>Status QRIS</label>
                    <select className="clean-input" style={{ width: '100%' }} value={editUmkmModal.data['Punya QRIS'] || ''} onChange={e => setEditUmkmModal({ ...editUmkmModal, data: { ...editUmkmModal.data, 'Punya QRIS': e.target.value } })}>
                      <option value="Ya">Punya QRIS</option><option value="Tidak">Belum Punya</option>
                    </select>
                  </div>
                </div>

                {/* BARIS 6: FOTO VISUAL (DENGAN REAKSI INSTAN) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      Foto Tempat Usaha
                      {editUmkmModal.data['URL Foto Usaha'] && editUmkmModal.data['URL Foto Usaha'] !== '-' && !editUmkmModal.previewUsaha && (
                        <a href={editUmkmModal.data['URL Foto Usaha']} target="_blank" rel="noreferrer" style={{color: '#007D60', textDecoration: 'none'}}>Asli &nearr;</a>
                      )}
                    </label>
                    {editUmkmModal.previewUsaha ? (
                      <img src={editUmkmModal.previewUsaha} alt="Preview" style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '4px', marginBottom: '6px' }} />
                    ) : editUmkmModal.data['URL Foto Usaha'] && editUmkmModal.data['URL Foto Usaha'] !== '-' ? (
                      <img src={getDriveImageUrl(editUmkmModal.data['URL Foto Usaha'])} onError={(e)=>{e.target.style.display='none'}} alt="Usaha" style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '4px', marginBottom: '6px' }} />
                    ) : <div style={{ height: '90px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', marginBottom: '6px', color: '#9ca3af', fontSize: '11px' }}>Tidak ada foto</div>}
                    <input type="file" accept="image/*" style={{ width: '100%', fontSize: '11px' }} onChange={(e) => handleEditFileUpload(e, 'usaha')} />
                  </div>

                  {/* INSTANT APPEAR: Langsung muncul jika value 'Ya' di-klik tanpa nunggu refresh */}
                  {editUmkmModal.data['Punya QRIS'] === 'Ya' ? (
                    <div style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '10px', animation: 'fadeIn 0.2s ease' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                        Foto Bukti QRIS
                        {editUmkmModal.data['URL Foto QRIS'] && editUmkmModal.data['URL Foto QRIS'] !== '-' && !editUmkmModal.previewQris && (
                          <a href={editUmkmModal.data['URL Foto QRIS']} target="_blank" rel="noreferrer" style={{color: '#007D60', textDecoration: 'none'}}>Asli &nearr;</a>
                        )}
                      </label>
                      {editUmkmModal.previewQris ? (
                        <img src={editUmkmModal.previewQris} alt="Preview" style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '4px', marginBottom: '6px' }} />
                      ) : editUmkmModal.data['URL Foto QRIS'] && editUmkmModal.data['URL Foto QRIS'] !== '-' ? (
                        <img src={getDriveImageUrl(editUmkmModal.data['URL Foto QRIS'])} onError={(e)=>{e.target.style.display='none'}} alt="QRIS" style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '4px', marginBottom: '6px' }} />
                      ) : <div style={{ height: '90px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', marginBottom: '6px', color: '#9ca3af', fontSize: '11px' }}>Tidak ada foto</div>}
                      <input type="file" accept="image/*" style={{ width: '100%', fontSize: '11px' }} onChange={(e) => handleEditFileUpload(e, 'qris')} />
                    </div>
                  ) : <div />}
                </div>

                {/* BARIS 7: PETA EDIT LOKASI (DEFAULT SATELIT & FLY TO TARGET AREA) */}
                <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, margin: 0 }}>Titik Koordinat (Klik peta untuk ubah)</label>
                    {editFeature && (
                      <button type="button" onClick={() => flyToEditRegion(editFeature)} style={{ background: '#007D60', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }}>
                        🎯 Fokus Wilayah RT {editUmkmModal.data['RT']}
                      </button>
                    )}
                  </div>
                  
                  <div style={{ height: '180px', width: '100%', borderRadius: '6px', overflow: 'hidden', border: '1px solid #d1d5db', marginBottom: '8px', zIndex: 1 }}>
                    <MapContainer center={mapCenter} zoom={16} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }} ref={setEditMapRef}>
                      <LayersControl position="topright">
                        {/* Default Satelit diletakkan paling atas dengan tag 'checked' */}
                        <LayersControl.BaseLayer checked name="Satelit">
                          <TileLayer url="http://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}" />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Garis Jalan">
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        </LayersControl.BaseLayer>
                      </LayersControl>
                      
                      {editFeature && <GeoJSON key={`edit-geojson-${editUmkmModal.data['RT']}-${editUmkmModal.data['RW']}`} data={editFeature} style={{ color: '#ef4444', weight: 3, fillColor: '#ef4444', fillOpacity: 0.15 }} />}
                      
                      <EditLocationMarker position={editUmkmModal.data['Lokasi (Lat, Lng)']} editFeature={editFeature} openAlert={openAlert} rtrwData={editUmkmModal.data} setPosition={(pos) => setEditUmkmModal({ ...editUmkmModal, data: { ...editUmkmModal.data, 'Lokasi (Lat, Lng)': pos } })} />
                    </MapContainer>
                  </div>
                  <input type="text" className="clean-input" style={{ width: '100%', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }} readOnly value={editUmkmModal.data['Lokasi (Lat, Lng)'] || ''} />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Catatan</label>
                  <textarea className="clean-input" style={{ width: '100%', minHeight: '40px', resize: 'vertical', boxSizing: 'border-box' }} value={editUmkmModal.data['Catatan'] || ''} onChange={e => setEditUmkmModal({ ...editUmkmModal, data: { ...editUmkmModal.data, 'Catatan': e.target.value } })} />
                </div>

              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '12px 24px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
                <button type="button" onClick={() => setEditUmkmModal({ isOpen: false, data: null })} className="btn-cancel" disabled={isLoading}>Batal</button>
                <button type="submit" className="btn-confirm info" disabled={isLoading}>{isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
              </div>

            </form>
          </div>
        </div>
        );
      })()}

      {/* MODAL TAMBAH PETUGAS */}
      {petugasModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,26,27,0.4)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', width: '90%', maxWidth: '380px', borderRadius: '6px', padding: '32px', boxShadow: '0 24px 48px rgba(0,0,0,0.15)', animation: 'popIn 0.3s ease' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#1a1a1b', fontWeight: 800 }}>Tambah Petugas Baru</h3>
            <form onSubmit={submitAddPetugas} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
              <input required type="text" className="clean-input" placeholder="Nama Lengkap Enumerator..." value={petugasModal.nama} onChange={e => setPetugasModal({ ...petugasModal, nama: e.target.value })} />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setPetugasModal({ isOpen: false })} className="btn-cancel" disabled={isLoading}>Batal</button>
                <button type="submit" className="btn-confirm info" disabled={isLoading}>{isLoading ? 'Menyimpan...' : 'Tambahkan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="clean-header">
        <div className="brand-logo">Dashboard UMKM Kelurahan Ploso</div>
        
        {/* Tombol Hamburger Khusus Mobile */}
        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <Icons.Close /> : <Icons.Menu />}
        </button>

        <div className={`nav-menu ${isMobileMenuOpen ? 'open' : ''}`}>
          <button className={`nav-tab ${activeTab === 'beranda' ? 'active' : ''}`} onClick={() => { setActiveTab('beranda'); setIsMobileMenuOpen(false); }}>
            Beranda
          </button>
          <button className={`nav-tab ${activeTab === 'map' ? 'active' : ''}`} onClick={() => { setActiveTab('map'); setIsMobileMenuOpen(false); }}>
            Peta UMKM
          </button>
          <button className={`nav-tab ${activeTab === 'data' ? 'active' : ''}`} onClick={() => { setActiveTab('data'); setIsMobileMenuOpen(false); }}>
            Data
          </button>
          <button className={`nav-tab ${activeTab === 'setting' ? 'active' : ''}`} onClick={() => { setActiveTab('setting'); setIsMobileMenuOpen(false); }}>
            Pengaturan
          </button>
        </div>
      </header>

      <div className="main-container">

        {/* --- BERANDA --- */}
        {activeTab === 'beranda' && (
          <div style={{ animation: 'popIn 0.4s ease', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            <section className="hero-section">
              <h1 className="hero-title">
                Melacak Data UMKM,<br/>
                <span className="highlight-yellow">Satu Usaha Sekaligus.</span>
              </h1>
              <p className="hero-desc">
                Sistem Informasi Pendataan UMKM memberikan pandangan komprehensif terkait sebaran, legalitas, dan adopsi digitalisasi usaha di tingkat akar rumput Kelurahan Ploso.
              </p>
            </section>

            <KPICards dataTarget={dataUmkm} />

            {/* ROW 2: Peta & Bar Chart RW */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
              <div className="content-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <h2 className="section-title" style={{ fontSize: '18px', marginBottom: '16px' }}>Persebaran Geografis</h2>
                <div style={{ position: 'relative', flex: 1 }}>
                  <MapSection height="400px" />
                </div>
              </div>

              <div className="content-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h2 className="section-title" style={{ margin: 0, fontSize: '18px' }}>Perbandingan RW</h2>
                  <button onClick={fetchData} className="btn-action" style={{ background: '#fff', border: '1px solid #d1d5db', color: '#1a1a1b', padding: '6px 12px' }}>
                    <Icons.Refresh />
                  </button>
                </div>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>Pilih metrik untuk membandingkan performa antar RW.</p>
                
                {/* Switcher Metrik Bar Chart */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                  <button className={`btn-metric ${barChartMetric === 'jumlah' ? 'active' : ''}`} onClick={() => setBarChartMetric('jumlah')}>Jumlah UMKM</button>
                  <button className={`btn-metric ${barChartMetric === 'nib' ? 'active' : ''}`} onClick={() => setBarChartMetric('nib')}>% Ber-NIB</button>
                  <button className={`btn-metric ${barChartMetric === 'qris' ? 'active' : ''}`} onClick={() => setBarChartMetric('qris')}>% Punya QRIS</button>
                </div>
                
                <div className="barchart-wrapper">
                  {chartData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Belum ada data.</div>
                  ) : (
                    chartData.map((d, i) => {
                      let fillColor = '#007D60'; 
                      if(barChartMetric === 'nib') fillColor = '#2563eb'; 
                      if(barChartMetric === 'qris') fillColor = '#7c3aed'; 

                      return (
                        <div key={i} className="barchart-row">
                          <div className="barchart-label">RW {d.label}</div>
                          <div className="barchart-area">
                            <div className="barchart-fill" style={{ width: `${(d.value / chartMax) * 100}%`, background: fillColor }}></div>
                          </div>
                          <div className="barchart-value" style={{ width: barChartMetric === 'jumlah' ? '40px' : '50px' }}>
                            {barChartMetric === 'jumlah' ? d.value : `${d.value.toFixed(1)}%`}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* ROW 3: Alasan NIB & Antusiasme */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
              
              {/* Bar Chart Alasan Belum NIB */}
              <div className="content-card" style={{ padding: '24px' }}>
                <h2 className="section-title" style={{ fontSize: '18px', marginBottom: '8px' }}>Kendala NIB</h2>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>Alasan utama UMKM belum memiliki Nomor Induk Berusaha.</p>
                
                <div className="barchart-wrapper">
                  {alasanNibData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Semua UMKM sudah ber-NIB.</div>
                  ) : (
                    alasanNibData.map((d, i) => (
                      <div key={i} className="barchart-row">
                        <div className="barchart-label" style={{ width: '130px', textAlign: 'left' }}>{d[0]}</div>
                        <div className="barchart-area">
                          <div className="barchart-fill" style={{ width: `${(d[1] / alasanNibMax) * 100}%`, background: '#f59e0b' }}></div>
                        </div>
                        <div className="barchart-value" style={{ width: '30px' }}>{d[1]}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Progress Bar Antusiasme Fasilitasi */}
              <div className="content-card" style={{ padding: '24px' }}>
                <h2 className="section-title" style={{ fontSize: '18px', marginBottom: '8px' }}>Potensi Fasilitasi Desa</h2>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '32px' }}>Tingkat antusiasme UMKM yang belum memiliki NIB/QRIS namun bersedia difasilitasi pembuatannya.</p>

                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a1b' }}>Antusiasme Urus NIB</span>
                    <span style={{ fontWeight: 800, fontSize: '16px', color: '#2563eb' }}>{pctMauNib}%</span>
                  </div>
                  <div className="progress-track" style={{ height: '12px' }}>
                    <div className="progress-fill" style={{ width: `${pctMauNib}%`, background: '#2563eb' }}></div>
                  </div>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>{mauNib} dari {totalBelumNib} UMKM non-NIB bersedia diuruskan.</p>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a1b' }}>Antusiasme Urus QRIS</span>
                    <span style={{ fontWeight: 800, fontSize: '16px', color: '#7c3aed' }}>{pctMauQris}%</span>
                  </div>
                  <div className="progress-track" style={{ height: '12px' }}>
                    <div className="progress-fill" style={{ width: `${pctMauQris}%`, background: '#7c3aed' }}></div>
                  </div>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>{mauQris} dari {totalBelumQris} UMKM non-QRIS bersedia dibuatkan.</p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* --- MAP --- */}
        {activeTab === 'map' && (
          <div style={{ animation: 'popIn 0.4s ease' }}>
            <div className="content-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '32px 32px 16px 32px' }}>
                <h2 className="section-title">Eksplorasi Peta Kepadatan UMKM</h2>
                <p style={{ color: '#4E4E4E', fontSize: '15px', margin: '0 0 24px 0' }}>Filter data berdasarkan wilayah untuk melihat persebaran secara spesifik.</p>
                <FilterControls />
              </div>
              <div style={{ position: 'relative', flex: 1, padding: '0 32px 32px 32px' }}>
                <KPICards dataTarget={filteredData} />
                <MapSection height="600px" />
              </div>
            </div>
          </div>
        )}

        {/* --- DATA --- */}
        {activeTab === 'data' && (
          <div style={{ animation: 'popIn 0.4s ease' }}>
            <div style={{ marginBottom: '32px' }}>
              <h1 className="hero-title" style={{ fontSize: '36px', marginBottom: '8px' }}>Database Terpadu</h1>
              <p className="hero-desc">Manajemen seluruh data administratif dan media visual hasil pendataan lapangan.</p>
            </div>
            
            <KPICards dataTarget={filteredData} />

            <div className="content-card">
              <FilterControls />

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Info Dasar Usaha</th>
                      <th>Kategori & Deskripsi</th>
                      <th>Status Standarisasi</th>
                      <th>Media Visual</th>
                      <th style={{ textAlign: 'right' }}>Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTableData.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '60px', color: '#6b7280', fontSize: '15px' }}>Tidak ada data yang sesuai pencarian.</td></tr>
                    ) : (
                      currentTableData.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ minWidth: '200px' }}>
                            <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a1b', marginBottom: '6px' }}>{item['Nama Usaha']}</div>
                            <div style={{ color: '#4E4E4E', fontSize: '13px', marginBottom: '4px' }}>{item['Alamat']}, RT {item['RT']}/RW {item['RW']}</div>
                            <div style={{ color: '#6b7280', fontSize: '12px' }}>Hp: {item['No HP'] || '-'}</div>
                            <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>Agen: {item['Nama Petugas']}</div>
                          </td>
                          <td style={{ minWidth: '260px', whiteSpace: 'normal', lineHeight: 1.5 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#007D60', marginBottom: '4px' }}>{item['KBLI']}</div>
                            <div style={{ fontSize: '13px', color: '#4E4E4E' }}>{item['Deskripsi Usaha']}</div>
                            {item['Catatan'] && item['Catatan'] !== '-' && (
                              <div style={{ fontSize: '12px', color: '#d97706', marginTop: '8px', background: '#fffbeb', padding: '6px 8px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                                <strong>Catatan:</strong> {item['Catatan']}
                              </div>
                            )}
                          </td>
                          <td style={{ minWidth: '160px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                              <span className={`badge ${item['Punya NIB'] === 'Ya' ? 'bg-green' : item['Urus NIB'] === 'Ya' ? 'bg-yellow' : 'badge-gray'}`}>
                                {item['Punya NIB'] === 'Ya' ? `NIB ✓ (${item['Nomor NIB']})` : item['Urus NIB'] === 'Ya' ? 'Target Urus NIB' : 'NIB ✕'}
                              </span>
                              <span className={`badge ${item['Punya QRIS'] === 'Ya' ? 'bg-green' : item['Urus QRIS'] === 'Ya' ? 'bg-yellow' : 'badge-gray'}`}>
                                {item['Punya QRIS'] === 'Ya' ? 'QRIS Aktif ✓' : item['Urus QRIS'] === 'Ya' ? 'Target Urus QRIS' : 'QRIS ✕'}
                              </span>
                            </div>
                          </td>
                          <td style={{ minWidth: '140px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {item['URL Foto Usaha'] !== '-' ? (
                                <a href={item['URL Foto Usaha']} target="_blank" rel="noreferrer" className="btn-link"><Icons.ExternalLink /> Foto Tempat</a>
                              ) : <span style={{ fontSize: '12px', color: '#9ca3af' }}>Foto Tempat (-)</span>}
                              
                              {item['URL Foto QRIS'] !== '-' ? (
                                <a href={item['URL Foto QRIS']} target="_blank" rel="noreferrer" className="btn-link"><Icons.ExternalLink /> Foto QRIS</a>
                              ) : <span style={{ fontSize: '12px', color: '#9ca3af' }}>Foto QRIS (-)</span>}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', minWidth: '100px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                              <button className="btn-action" style={{ background: '#f3f4f6', color: '#1a1a1b', border: '1px solid #d1d5db' }} onClick={() => {
                                setEditUmkmModal({ isOpen: true, data: { ...item, oldNamaUsaha: item['Nama Usaha'] }});
                              }}>
                                Edit
                              </button>
                              <button className="btn-action" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5' }} onClick={() => openAlert(
                                "Hapus Data?", `Yakin ingin menghapus secara permanen data "${item['Nama Usaha']}"?`, "danger", () => submitDeleteData(item['Nama Usaha']), () => {}
                              )}>
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="pagination-container">
                  <span>Menampilkan {currentTableData.length} baris di halaman {currentPage} dari {totalPages}</span>
                  <div className="pagination-controls">
                    <button className="btn-page" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                      <Icons.ChevronLeft />
                    </button>
                    <button className="btn-page" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                      <Icons.ChevronRight />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- PENGATURAN --- */}
        {activeTab === 'setting' && (
          <div style={{ animation: 'popIn 0.4s ease' }}>
            <h1 className="hero-title" style={{ fontSize: '36px', marginBottom: '32px' }}>Pengaturan Sistem</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
              <div className="content-card">
                <h2 className="section-title" style={{ fontSize: '20px' }}>Konfigurasi Target Kelurahan</h2>
                <p style={{ color: '#4E4E4E', fontSize: '14px', marginBottom: '24px' }}>Ubah estimasi total populasi UMKM untuk menyesuaikan kalkulasi persentase pencapaian (Progress Bar).</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontWeight: 600, fontSize: '14px', color: '#4b5563' }}>Estimasi Target (Unit)</label>
                  <input 
                    type="number" 
                    className="clean-input" 
                    value={targetUmkm} 
                    onChange={(e) => setTargetUmkm(e.target.value)} 
                    style={{ maxWidth: '200px' }}
                  />
                  <button className="btn-action btn-primary" style={{ marginTop: '12px', width: 'fit-content' }} onClick={() => openAlert("Tersimpan", "Target UMKM berhasil diperbarui.", "success")}>
                    Simpan Perubahan
                  </button>
                </div>
              </div>

              <div className="content-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <h2 className="section-title" style={{ margin: 0, fontSize: '20px' }}>Daftar Petugas (Enumerator)</h2>
                    <p style={{ color: '#4E4E4E', fontSize: '14px', margin: '4px 0 0 0' }}>Kelola daftar nama agen pendata di lapangan.</p>
                  </div>
                  <button className="btn-action" style={{ background: '#f3f4f6', border: '1px solid #d1d5db', color: '#1a1a1b', padding: '6px 12px', fontSize: '13px' }} onClick={() => setPetugasModal({isOpen: true, nama: ''})}>
                    + Tambah
                  </button>
                </div>
                
                <div className="table-wrapper" style={{ maxHeight: '250px' }}>
                  <table>
                    <thead><tr><th>Nama Petugas</th><th style={{textAlign: 'right'}}>Aksi</th></tr></thead>
                    <tbody>
                      {listPetugas.length === 0 ? (<tr><td colSpan="2" style={{textAlign:'center'}}>Belum ada petugas terdaftar.</td></tr>) : 
                        listPetugas.map((nama, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{nama}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="btn-link" style={{color: '#ef4444'}} onClick={() => openAlert("Hapus Petugas?", `Yakin ingin menghapus ${nama} dari daftar petugas?`, "danger", () => submitDeletePetugas(nama), () => {})}>Hapus</button>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default AdminDashboard;