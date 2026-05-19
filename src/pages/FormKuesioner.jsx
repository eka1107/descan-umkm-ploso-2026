import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { kbliOptions } from '../dataKbliKategori';

// Import untuk peta (Leaflet) & GeoJSON Desa Ploso
import { MapContainer, TileLayer, Marker, useMapEvents, GeoJSON, LayersControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import plosoGeojson from '../3501040002_Ploso.json';

// --- FIX IKON PIN LEAFLET ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// --- IKON SVG ---
const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
);
const GalleryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
);
const GPSIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
);
const FullscreenIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
);
const ExitFullscreenIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
);
const DesaCantikLogo = () => (
  <svg className="spinner-cantik" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
    <path d="M12 2v3"></path>
    <path d="M10 4.5l2-2.5 2 2.5"></path>
  </svg>
);

// --- KOMPONEN CUSTOM MODAL POP-UP (Elegan & Selaras Tema) ---
const CustomModal = ({ isOpen, title, message, type = 'info', onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,26,27,0.6)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', width: '90%', maxWidth: '380px', borderRadius: '16px', padding: '32px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', animation: 'slideUp 0.3s ease', textAlign: 'center', borderTop: `6px solid ${type === 'error' ? '#ef4444' : '#10b981'}` }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: type === 'error' ? '#fef2f2' : '#ecfdf5', color: type === 'error' ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: '32px' }}>
          {type === 'error' ? '✕' : '✓'}
        </div>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '22px', color: '#1a1a1b', fontWeight: 800 }}>{title}</h3>
        <p style={{ color: '#4E4E4E', fontSize: '15px', lineHeight: 1.5, margin: '0 0 28px 0' }}>{message}</p>
        <button onClick={onConfirm} style={{ width: '100%', padding: '14px', background: type === 'error' ? '#ef4444' : '#1a1a1b', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '15px', transition: '0.2s' }}>
          {type === 'error' ? 'Perbaiki' : 'Selesai'}
        </button>
      </div>
    </div>
  );
};

// --- ALGORITMA RAY-CASTING (Validasi Peta Point-in-Polygon) ---
const isPointInMultiPolygon = (point, geometry) => {
  const [lng, lat] = point;
  const polys = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
  
  let inside = false;
  for (let i = 0; i < polys.length; i++) {
    const rings = polys[i];
    const outerRing = rings[0];
    let inOuter = false;
    for (let j = 0, k = outerRing.length - 1; j < outerRing.length; k = j++) {
      const xi = outerRing[j][0], yi = outerRing[j][1];
      const xj = outerRing[k][0], yj = outerRing[k][1];
      const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inOuter = !inOuter;
    }
    
    if (inOuter) {
      let inHole = false;
      for (let h = 1; h < rings.length; h++) {
        const hole = rings[h];
        let inThisHole = false;
        for (let j = 0, k = hole.length - 1; j < hole.length; k = j++) {
          const xi = hole[j][0], yi = hole[j][1];
          const xj = hole[k][0], yj = hole[k][1];
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

// Kustomisasi Style React Select
const customSelectStyles = {
  control: (provided, state) => ({
    ...provided, padding: '2px', borderRadius: '8px', border: state.isFocused ? '2px solid #ffe16f' : '2px solid #e5e7eb',
    backgroundColor: state.isFocused ? '#ffffff' : '#f9fafb', boxShadow: 'none', cursor: 'pointer', transition: 'all 0.2s ease'
  }),
  placeholder: (provided) => ({ ...provided, color: '#9ca3af', fontSize: '14px' }),
  singleValue: (provided) => ({ ...provided, color: '#1a1a1b', fontWeight: '500', fontSize: '14px' }),
  menuPortal: base => ({ ...base, zIndex: 9999 })
};

// --- KOMPONEN BANTUAN UNTUK PETA (Otomatis atur ukuran saat Fullscreen) ---
function MapResizer({ isFullscreen }) {
  const map = useMap();
  useEffect(() => {
    // Memicu recalculate size saat animasi transisi CSS layar penuh selesai
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [isFullscreen, map]);
  return null;
}

// Komponen interaktif drag marker
function LocationMarker({ position, setPosition, setFormData }) {
  const markerRef = useRef(null);
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      setFormData(prev => ({ ...prev, lokasi: `${e.latlng.lat}, ${e.latlng.lng}` }));
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const newPos = marker.getLatLng();
        setPosition(newPos);
        setFormData(prev => ({ ...prev, lokasi: `${newPos.lat}, ${newPos.lng}` }));
      }
    },
  };

  return position === null ? null : (
    <Marker draggable={true} eventHandlers={eventHandlers} position={position} ref={markerRef} />
  );
}

const FormKuesioner = () => {
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx0TqenZVn-sDlSklA8eesYb08aE2uE7q9Wnvt5OCw-Y20ABr84PNmuEe4T6Nz-vlNf/exec';
  
  const [step, setStep] = useState(1);
  const totalSteps = 7;
  const [waktuMulai, setWaktuMulai] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [listPetugas, setListPetugas] = useState([]);
  
  // State Peta & Opsi RT/RW
  const [mapRef, setMapRef] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rwList, setRwList] = useState([]);
  const [rwToRtMap, setRwToRtMap] = useState({});
  const [selectedFeature, setSelectedFeature] = useState(null); 
  
  const [mapPosition, setMapPosition] = useState({ lat: -8.1990, lng: 111.1070 });
  const [previewUsaha, setPreviewUsaha] = useState(null);
  const [previewQris, setPreviewQris] = useState(null);

  const [modal, setModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  const [formData, setFormData] = useState({
    namaPetugas: '', namaUsaha: '', deskripsiUsaha: '', alamat: '', rt: '', rw: '', noHp: '',
    fotoUsahaBase64: '', fotoUsahaMimeType: '', 
    kbli: '', punyaNib: '', nomorNib: '', alasanTidakNib: '', urusNib: '',
    punyaQris: '', urusQris: '', lokasi: '-8.1990, 111.1070', catatan: '', 
    fotoQrisBase64: '', fotoQrisMimeType: ''
  });

  const nibRefs = useRef([]);

  useEffect(() => {
    setWaktuMulai(new Date().toISOString());
    
    // Tarik list RT/RW secara Hierarkis dari file JSON GeoJSON
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

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentPos = { lat: position.coords.latitude, lng: position.coords.longitude };
          setMapPosition(currentPos);
          setFormData(prev => ({ ...prev, lokasi: `${currentPos.lat}, ${currentPos.lng}` }));
        },
        () => console.warn('Izin lokasi ditolak, menggunakan default.')
      );
    }
    axios.get(`${SCRIPT_URL}?action=getPetugas`)
      .then(res => { if (Array.isArray(res.data)) setListPetugas(res.data); })
      .catch(err => console.error("Gagal ambil data petugas", err));
  }, []);

  // Update polygon area target saat RT/RW berubah
  useEffect(() => {
    if (formData.rt && formData.rw) {
      const feature = plosoGeojson.features.find(f => {
        const name = f.properties.nmsls || '';
        const rtMatch = name.match(/RT\s+0*(\d+)/i);
        const rwMatch = name.match(/RW\s+0*(\d+)/i);
        const rt = rtMatch ? String(parseInt(rtMatch[1])).padStart(2, '0') : '';
        const rw = rwMatch ? String(parseInt(rwMatch[1])).padStart(2, '0') : '';
        return rt === formData.rt && rw === formData.rw;
      });
      setSelectedFeature(feature || null);
    } else {
      setSelectedFeature(null);
    }
  }, [formData.rt, formData.rw]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'rw') {
      setFormData(prev => ({ ...prev, rw: value, rt: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleKbliChange = (selectedOption) => setFormData({ ...formData, kbli: selectedOption ? selectedOption.label : '' });

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      if (type === 'usaha') setPreviewUsaha(objectUrl);
      if (type === 'qris') setPreviewQris(objectUrl);

      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'qris') {
          setFormData(prev => ({ ...prev, fotoQrisBase64: reader.result.split(',')[1], fotoQrisMimeType: file.type }));
        } else if (type === 'usaha') {
          setFormData(prev => ({ ...prev, fotoUsahaBase64: reader.result.split(',')[1], fotoUsahaMimeType: file.type }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNibInput = (index, e) => {
    const value = e.target.value.replace(/[^0-9]/g, ''); 
    if (!value && e.target.value !== '') return; 
    let newNibArray = formData.nomorNib.padEnd(13, ' ').split('');
    newNibArray[index] = value || ' ';
    setFormData({ ...formData, nomorNib: newNibArray.join('').trimEnd() });
    if (value && index < 12) nibRefs.current[index + 1].focus();
  };

  const handleNibKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      let newNibArray = formData.nomorNib.padEnd(13, ' ').split('');
      if (!newNibArray[index] || newNibArray[index] === ' ') {
        if (index > 0) {
          newNibArray[index - 1] = ' ';
          nibRefs.current[index - 1].focus();
        }
      } else {
        newNibArray[index] = ' ';
      }
      setFormData({ ...formData, nomorNib: newNibArray.join('').trimEnd() });
    }
  };

  const handleNibPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 13);
    setFormData({ ...formData, nomorNib: pastedData });
    const focusIndex = pastedData.length === 13 ? 12 : pastedData.length;
    if (nibRefs.current[focusIndex]) nibRefs.current[focusIndex].focus();
  };

  const isNibValid = formData.punyaNib === 'Ya' ? formData.nomorNib.length === 13 : true;

  const nextStep = (e) => { 
    e.preventDefault(); 
    if (step === 5 && formData.punyaNib === 'Ya' && !isNibValid) {
      setModal({ isOpen: true, type: 'error', title: 'Format NIB Salah', message: 'Nomor Induk Berusaha (NIB) wajib diisi tepat 13 digit angka.' });
      return;
    }
    setStep(prev => prev + 1); 
  };
  const prevStep = () => setStep(prev => prev - 1);

  // --- KONTROL PETA (Fokus Wilayah & GPS) ---
  const flyToRegion = () => {
    if (mapRef && selectedFeature) {
      const layer = L.geoJSON(selectedFeature);
      mapRef.flyToBounds(layer.getBounds(), { padding: [30, 30], duration: 1.5 });
    }
  };

  const flyToGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latlng = { lat: position.coords.latitude, lng: position.coords.longitude };
          setMapPosition(latlng);
          setFormData(prev => ({ ...prev, lokasi: `${latlng.lat}, ${latlng.lng}` }));
          if (mapRef) mapRef.flyTo(latlng, 17, { duration: 1.5 });
        },
        () => {
          setModal({ isOpen: true, type: 'error', title: 'GPS Gagal', message: 'Gagal mendeteksi lokasi saat ini. Pastikan GPS aktif dan browser diizinkan mengakses lokasi.' });
        }
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // VALIDASI TITIK MAP GEOGRAFIS TERHADAP WILAYAH RT/RW
    if (selectedFeature) {
      const isInside = isPointInMultiPolygon([mapPosition.lng, mapPosition.lat], selectedFeature.geometry);
      if (!isInside) {
        setModal({
          isOpen: true, type: 'error', title: 'Lokasi Tidak Sesuai Wilayah',
          message: `Titik pin peta saat ini berada di luar batas wilayah RT ${formData.rt} / RW ${formData.rw}. Harap geser pin ke dalam area yang ditandai kuning di peta.`
        });
        return; 
      }
    }

    setIsLoading(true);
    const payload = { ...formData, waktuMulai, waktuSelesai: new Date().toISOString() };
    
    try {
      const response = await axios.post(SCRIPT_URL, JSON.stringify(payload), {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      
      let resData = response.data;
      if (typeof resData === 'string') {
        try { resData = JSON.parse(resData); } catch(e) {}
      }
      
      if (resData && resData.status === 'success') {
        setModal({ 
          isOpen: true, type: 'success', title: 'Berhasil Disimpan', 
          message: 'Data UMKM telah berhasil direkam ke dalam database kelurahan.' 
        });
      } else {
        setModal({ 
          isOpen: true, type: 'error', title: 'Gagal di Server', 
          message: resData.message || 'Terjadi kesalahan saat memproses data di Google Sheet.' 
        });
      }
    } catch (error) {
      setModal({ 
        isOpen: true, type: 'error', title: 'Koneksi Terputus', 
        message: 'Gagal mengirim data. Pastikan koneksi internet stabil dan URL skrip valid.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    if (modal.type === 'success') window.location.reload(); 
    setModal({ ...modal, isOpen: false });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');
        
        body, html { margin: 0; padding: 0; width: 100vw; height: 100dvh; font-family: 'Inter', sans-serif; color: #1a1a1b; -webkit-tap-highlight-color: transparent; overflow: hidden; }
        
        /* BACKGROUND ABU-ABU GRADASI KASAR/GRAIN */
        .app-container { height: 100dvh; width: 100%; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; background: linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 100%); position: relative; }
        .app-container::after { content: ""; position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.15; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"); }
        
        /* KARTU FORM (SUDUT SEMI-SQUARE) */
        .form-card { width: 100%; max-width: 440px; background: #ffffff; border-radius: 12px; padding: 32px 24px; box-shadow: 0 16px 40px rgba(0,0,0,0.08); border: 1px solid #e5e7eb; position: relative; display: flex; flex-direction: column; box-sizing: border-box; animation: slideUp 0.3s ease-out; max-height: calc(100dvh - 32px); z-index: 10; border-top: 6px solid #ffe16f; }
        .form-wrapper { display: flex; flex-direction: column; overflow: hidden; }
        .form-content { overflow-y: auto; padding-right: 4px; scrollbar-width: none; -ms-overflow-style: none; }
        .form-content::-webkit-scrollbar { display: none; }
        
        .progress-container { width: 100%; background-color: #f3f4f6; border-radius: 8px; height: 8px; margin-bottom: 24px; overflow: hidden; flex-shrink: 0; }
        .progress-bar { height: 100%; background-color: #ffe16f; transition: width 0.4s ease; }
        
        h2.step-title { font-size: 24px; font-weight: 800; margin: 0 0 6px 0; color: #1a1a1b; line-height: 1.2; letter-spacing: -0.5px; }
        p.step-desc { font-size: 14px; color: #6b7280; margin: 0 0 20px 0; line-height: 1.5; }
        
        label { display: block; font-size: 13px; font-weight: 700; color: #4b5563; margin-bottom: 6px; }
        .input-group { margin-bottom: 16px; }
        
        /* INPUT & BUTTONS (SEMI-ROUNDED) */
        .pintarly-input { width: 100%; padding: 12px 16px; border-radius: 8px; border: 1px solid #d1d5db; background-color: #f9fafb; font-size: 15px; color: #1a1a1b; font-family: 'Inter', sans-serif; box-sizing: border-box; transition: all 0.2s ease; outline: none; appearance: none; }
        .pintarly-input:disabled { background-color: #f3f4f6; cursor: not-allowed; }
        .pintarly-input:focus:not(:disabled) { border-color: #ffe16f; background-color: #ffffff; box-shadow: 0 0 0 4px rgba(255, 225, 111, 0.2); }
        textarea.pintarly-input { min-height: 80px; resize: vertical; }
        
        .btn-container { display: flex; gap: 12px; padding-top: 16px; flex-shrink: 0; background: #fff; border-top: 1px solid #f3f4f6; margin-top: 8px; }
        .btn-primary { flex: 1; padding: 14px; border-radius: 8px; border: none; background-color: #ffe16f; color: #1a1a1b; font-size: 15px; font-family: 'Inter', sans-serif; font-weight: 800; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; background-color: #e5e7eb; color: #6b7280; }
        .btn-secondary { padding: 14px 20px; border-radius: 8px; border: 1px solid #d1d5db; background-color: #ffffff; color: #4b5563; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        
        .note { font-size: 12px; color: #6b7280; display: block; margin-top: 6px; }
        .step-badge { position: absolute; top: 24px; right: 24px; font-size: 12px; font-weight: 800; color: #6b7280; background: #f3f4f6; padding: 4px 12px; border-radius: 8px; }
        .flex-row { display: flex; gap: 12px; }
        .w-half { flex: 1; }
        
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        
        /* PETA NORMAL & FULLSCREEN */
        .map-wrapper { height: 220px; width: 100%; border-radius: 8px; overflow: hidden; border: 1px solid #d1d5db; margin-bottom: 12px; z-index: 1; display: flex; position: relative; transition: all 0.3s ease; }
        @media(min-height: 700px) { .map-wrapper { height: 260px; } }
        
        .map-wrapper.fullscreen { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100dvh !important; z-index: 99999 !important; border-radius: 0 !important; margin: 0 !important; }
        
        /* Indikator Validasi GeoJSON di Peta & Tombol Bantuan */
        .map-validation-badge { position: absolute; top: 12px; left: 12px; z-index: 1000; background: rgba(255,255,255,0.95); padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; border: 1px solid #d1d5db; color: #1a1a1b; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
        .map-validation-badge.active { border-color: #10b981; color: #059669; }
        .map-validation-badge.active:hover { background: #ecfdf5; border-color: #059669; }
        
        .btn-gps { position: absolute; bottom: 64px; left: 12px; z-index: 1000; background: #fff; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #d1d5db; color: #1a1a1b; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: 0.2s; }
        .btn-gps:hover { border-color: #ffe16f; color: #d97706; }
        .btn-gps:active { transform: scale(0.9); }

        .btn-fullscreen { position: absolute; bottom: 12px; left: 12px; z-index: 1000; background: #fff; width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2px solid #d1d5db; color: #1a1a1b; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: 0.2s; }
        .btn-fullscreen:hover { background: #f9fafb; border-color: #ffe16f; }

        .upload-options { display: flex; gap: 8px; margin-bottom: 12px; }
        .upload-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; background: #f9fafb; border: 1px solid #d1d5db; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 13px; color: #4b5563; transition: all 0.2s; }
        .upload-btn:active { border-color: #ffe16f; background: #fff; color: #1a1a1b; }
        .upload-input { display: none; }
        
        .preview-box { width: 100%; height: 160px; border-radius: 8px; overflow: hidden; border: 2px dashed #d1d5db; display: flex; align-items: center; justify-content: center; background: #f9fafb; }
        .preview-img { width: 100%; height: 100%; object-fit: cover; }
        
        .nib-container { display: flex; align-items: center; width: 100%; margin-bottom: 6px; box-sizing: border-box; }
        .nib-group { display: flex; gap: 4px; flex: 1; }
        .nib-space { width: 8px; flex-shrink: 0; }
        .nib-box { width: 100%; height: 42px; text-align: center; font-size: 18px; font-weight: 800; border: 1px solid #d1d5db; border-radius: 6px; background: #f9fafb; outline: none; padding: 0; color: #1a1a1b; box-sizing: border-box; }
        .nib-box:focus { border-color: #ffe16f; background: #fff; box-shadow: 0 0 0 3px rgba(255, 225, 111, 0.2); }
        .nib-error { border-color: #ef4444 !important; }

        /* LOADER DESA CANTIK */
        .loader-overlay { position: fixed; inset: 0; z-index: 9999999; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(8px); display: flex; flex-direction: column; align-items: center; justify-content: center; animation: fadeIn 0.3s ease; }
        .spinner-cantik { width: 80px; height: 80px; color: #ffe16f; animation: spin 2.5s linear infinite, pulse 1.5s ease-in-out infinite alternate; filter: drop-shadow(0 4px 12px rgba(255, 225, 111, 0.5)); }
        .loader-title { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 800; color: #1a1a1b; margin: 24px 0 8px 0; letter-spacing: -0.5px; }
        .loader-subtitle { color: #6b7280; font-size: 15px; font-weight: 500; margin: 0; animation: pulseText 1.5s infinite; }
        
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0% { transform: scale(0.9); opacity: 0.8; } 100% { transform: scale(1.1); opacity: 1; } }
        @keyframes pulseText { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* FULLSCREEN LOADER DESA CANTIK */}
      {isLoading && (
        <div className="loader-overlay">
          <DesaCantikLogo />
          <div className="loader-title">DESA CANTIK PLOSO</div>
          <div className="loader-subtitle">Mensinkronisasi data ke server...</div>
        </div>
      )}

      <div className="app-container">
        <CustomModal {...modal} onConfirm={closeModal} />

        <div className="form-card" style={{ transform: isFullscreen ? 'none' : '' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <img src="/logo.png" alt="Logo Desa Cantik" style={{ height: '42px', objectFit: 'contain' }} />
          </div>

          <div className="step-badge" style={{ top: '32px' }}>Tahap {step}/{totalSteps}</div>
          
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
          </div>

          <form onSubmit={step === totalSteps ? handleSubmit : nextStep} className="form-wrapper">
            
            <div className="form-content">
              {step === 1 && (
                <div style={{ animation: 'slideUp 0.3s ease' }}>
                  <h2 className="step-title">Mulai Pendataan</h2>
                  <p className="step-desc">
                    Pilih nama Anda sebagai petugas agen statistik
                    <span style={{ backgroundColor: '#ffe16f', color: '#1a1a1b', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                    Kelurahan Ploso
                    </span>
                  </p>
                  <div className="input-group">
                    <label>Nama Petugas</label>
                    <select name="namaPetugas" value={formData.namaPetugas} onChange={handleChange} required className="pintarly-input" style={{ backgroundColor: '#fff' }}>
                      <option value="" disabled hidden>Pilih Nama Anda</option>
                      {listPetugas.length > 0 ? (
                        listPetugas.map((nama, idx) => <option key={idx} value={nama}>{nama}</option>)
                      ) : (<option value="" disabled>Memuat daftar petugas...</option>)}
                    </select>
                    {listPetugas.length === 0 && <span className="note" style={{ color: '#ef4444' }}>*Memuat data dari server...</span>}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div style={{ animation: 'slideUp 0.3s ease' }}>
                  <h2 className="step-title">Identitas Usaha</h2>
                  <p className="step-desc">Detail informasi lokasi dan kontak dasar UMKM.</p>
                  <div className="input-group">
                    <label>Nama Usaha</label>
                    <input type="text" name="namaUsaha" value={formData.namaUsaha} onChange={handleChange} required className="pintarly-input" placeholder="Contoh: Warung Berkah" autoFocus />
                  </div>
                  <div className="input-group">
                    <label>Alamat Usaha</label>
                    <input type="text" name="alamat" value={formData.alamat} onChange={handleChange} required className="pintarly-input" placeholder="Nama Jalan / Gang" />
                  </div>
                  
                  {/* DROPDOWN BERTINGKAT RW -> RT */}
                  <div className="flex-row input-group">
                    <div className="w-half">
                      <label>RW</label>
                      <select name="rw" value={formData.rw} onChange={handleChange} required className="pintarly-input">
                        <option value="" disabled hidden>Pilih RW</option>
                        {rwList.map((rwStr, i) => <option key={i} value={rwStr}>{rwStr}</option>)}
                      </select>
                    </div>
                    <div className="w-half">
                      <label>RT</label>
                      <select name="rt" value={formData.rt} onChange={handleChange} required className="pintarly-input" disabled={!formData.rw}>
                        <option value="" disabled hidden>{!formData.rw ? 'Pilih RW dahulu' : 'Pilih RT'}</option>
                        {formData.rw && rwToRtMap[formData.rw] ? (
                          rwToRtMap[formData.rw].map((rtStr, i) => <option key={i} value={rtStr}>{rtStr}</option>)
                        ) : null}
                      </select>
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Nomor HP (Opsional)</label>
                    <input type="tel" name="noHp" value={formData.noHp} onChange={handleChange} className="pintarly-input" placeholder="08xxxxxxxxxx" />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div style={{ animation: 'slideUp 0.3s ease' }}>
                  <h2 className="step-title">Foto Usaha</h2>
                  <p className="step-desc">Ambil foto produk atau tampak depan bangunan UMKM.</p>
                  <div className="upload-options">
                    <label className="upload-btn">
                      <CameraIcon /> Kamera
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, 'usaha')} className="upload-input" />
                    </label>
                    <label className="upload-btn">
                      <GalleryIcon /> Galeri
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'usaha')} className="upload-input" />
                    </label>
                  </div>
                  <div className="preview-box">
                    {previewUsaha ? <img src={previewUsaha} alt="Preview" className="preview-img" /> : <span style={{ color: '#9ca3af', fontSize: '13px' }}>Belum ada foto</span>}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div style={{ animation: 'slideUp 0.3s ease' }}>
                  <h2 className="step-title">Klasifikasi Usaha</h2>
                  <p className="step-desc">Tentukan deskripsi serta kategori makro KBLI 2025.</p>
                  <div className="input-group">
                    <label>Kegiatan Utama</label>
                    <textarea name="deskripsiUsaha" value={formData.deskripsiUsaha} onChange={handleChange} required className="pintarly-input" placeholder="Misal: Menjual sembako dan makanan ringan..." autoFocus />
                  </div>
                  <div className="input-group">
                    <label>Kategori KBLI 2025</label>
                    <Select options={kbliOptions} onChange={handleKbliChange} styles={customSelectStyles} placeholder="Cari kategori..." isClearable isSearchable required menuPortalTarget={document.body} />
                  </div>
                </div>
              )}

              {step === 5 && (
                <div style={{ animation: 'slideUp 0.3s ease' }}>
                  <h2 className="step-title">Legalitas (NIB)</h2>
                  <p className="step-desc">Pendataan status kepemilikan Nomor Induk Berusaha.</p>
                  <div className="input-group">
                    <label>Apakah memiliki NIB?</label>
                    <select name="punyaNib" value={formData.punyaNib} onChange={handleChange} required className="pintarly-input" style={{ backgroundColor: '#fff' }}>
                      <option value="" disabled hidden>Pilih Jawaban</option>
                      <option value="Ya">Ya, Punya</option>
                      <option value="Tidak">Belum Punya</option>
                    </select>
                  </div>

                  {formData.punyaNib === 'Ya' && (
                    <div className="input-group" style={{ animation: 'slideUp 0.3s ease' }}>
                      <label>13 Digit NIB <span style={{color: '#ef4444'}}>*</span></label>
                      <div className="nib-container" onPaste={handleNibPaste}>
                        <div className="nib-group">
                          {[0, 1, 2].map(i => {
                            const val = formData.nomorNib[i] && formData.nomorNib[i] !== ' ' ? formData.nomorNib[i] : '';
                            return <input key={i} ref={el => nibRefs.current[i] = el} type="text" maxLength="1" value={val} onChange={(e) => handleNibInput(i, e)} onKeyDown={(e) => handleNibKeyDown(i, e)} className={`nib-box ${!isNibValid && formData.nomorNib.trim() !== '' ? 'nib-error' : ''}`} />;
                          })}
                        </div>
                        <div className="nib-space"></div>
                        <div className="nib-group">
                          {[3, 4, 5].map(i => {
                            const val = formData.nomorNib[i] && formData.nomorNib[i] !== ' ' ? formData.nomorNib[i] : '';
                            return <input key={i} ref={el => nibRefs.current[i] = el} type="text" maxLength="1" value={val} onChange={(e) => handleNibInput(i, e)} onKeyDown={(e) => handleNibKeyDown(i, e)} className={`nib-box ${!isNibValid && formData.nomorNib.trim() !== '' ? 'nib-error' : ''}`} />;
                          })}
                        </div>
                        <div className="nib-space"></div>
                        <div className="nib-group">
                          {[6, 7, 8].map(i => {
                            const val = formData.nomorNib[i] && formData.nomorNib[i] !== ' ' ? formData.nomorNib[i] : '';
                            return <input key={i} ref={el => nibRefs.current[i] = el} type="text" maxLength="1" value={val} onChange={(e) => handleNibInput(i, e)} onKeyDown={(e) => handleNibKeyDown(i, e)} className={`nib-box ${!isNibValid && formData.nomorNib.trim() !== '' ? 'nib-error' : ''}`} />;
                          })}
                        </div>
                        <div className="nib-space"></div>
                        <div className="nib-group" style={{ flex: '1.3' }}>
                          {[9, 10, 11, 12].map(i => {
                            const val = formData.nomorNib[i] && formData.nomorNib[i] !== ' ' ? formData.nomorNib[i] : '';
                            return <input key={i} ref={el => nibRefs.current[i] = el} type="text" maxLength="1" value={val} onChange={(e) => handleNibInput(i, e)} onKeyDown={(e) => handleNibKeyDown(i, e)} className={`nib-box ${!isNibValid && formData.nomorNib.trim() !== '' ? 'nib-error' : ''}`} />;
                          })}
                        </div>
                      </div>
                      <span className="note">{formData.nomorNib.replace(/\s/g, '').length} dari 13 digit. {!isNibValid && formData.nomorNib.replace(/\s/g, '').length > 0 && <span style={{color: '#ef4444'}}> (Harus pas 13 digit)</span>}</span>
                    </div>
                  )}

                  {formData.punyaNib === 'Tidak' && (
                    <div style={{ animation: 'slideUp 0.3s ease', background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <div className="input-group">
                        <label>Alasan Belum Punya?</label>
                        <select name="alasanTidakNib" value={formData.alasanTidakNib} onChange={handleChange} required className="pintarly-input" style={{ backgroundColor: '#fff' }}>
                          <option value="" disabled hidden>Pilih Alasan</option>
                          <option value="Proses">Sedang diurus</option>
                          <option value="Rumit">Proses rumit</option>
                          <option value="Tidak perlu">Tidak butuh</option>
                          <option value="Tidak tahu">Tidak tahu</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                      </div>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Bersedia diuruskan Kelurahan?</label>
                        <select name="urusNib" value={formData.urusNib} onChange={handleChange} required className="pintarly-input" style={{ backgroundColor: '#fff' }}>
                          <option value="" disabled hidden>Pilih</option>
                          <option value="Ya">Ya, bersedia</option>
                          <option value="Tidak">Tidak</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 6 && (
                <div style={{ animation: 'slideUp 0.3s ease' }}>
                  <h2 className="step-title">Metode QRIS</h2>
                  <p className="step-desc">Pemanfaatan alat pembayaran digital nontunai.</p>
                  <div className="input-group">
                    <label>Menerima QRIS?</label>
                    <select name="punyaQris" value={formData.punyaQris} onChange={handleChange} required className="pintarly-input" style={{ backgroundColor: '#fff' }}>
                      <option value="" disabled hidden>Pilih Jawaban</option>
                      <option value="Ya">Ya, Menerima</option>
                      <option value="Tidak">Tidak</option>
                    </select>
                  </div>

                  {formData.punyaQris === 'Ya' && (
                    <div className="input-group" style={{ animation: 'slideUp 0.3s ease' }}>
                      <label>Bukti / Foto QRIS</label>
                      <div className="upload-options">
                        <label className="upload-btn">
                          <CameraIcon /> Kamera
                          <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, 'qris')} className="upload-input" />
                        </label>
                        <label className="upload-btn">
                          <GalleryIcon /> Galeri
                          <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'qris')} className="upload-input" />
                        </label>
                      </div>
                      <div className="preview-box" style={{ height: '110px' }}>
                        {previewQris ? <img src={previewQris} alt="QRIS" className="preview-img" /> : <span style={{ color: '#9ca3af', fontSize: '13px' }}>Belum ada foto</span>}
                      </div>
                    </div>
                  )}

                  {formData.punyaQris === 'Tidak' && (
                    <div className="input-group" style={{ animation: 'slideUp 0.3s ease' }}>
                      <label>Bersedia dibuatkan QRIS?</label>
                      <select name="urusQris" value={formData.urusQris} onChange={handleChange} required className="pintarly-input" style={{ backgroundColor: '#fff' }}>
                        <option value="" disabled hidden>Pilih</option>
                        <option value="Ya">Ya, bersedia</option>
                        <option value="Tidak">Tidak</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {step === 7 && (
                <div style={{ animation: 'slideUp 0.3s ease' }}>
                  <h2 className="step-title">Titik Lokasi Geografis</h2>
                  <p className="step-desc">Pastikan titik pin berada di dalam area batas kuning untuk RT {formData.rt} / RW {formData.rw}.</p>
                  
                  <div className={`map-wrapper ${isFullscreen ? 'fullscreen' : ''}`}>
                    
                    {/* Badge Interaktif untuk Terbang ke Area RT */}
                    <button 
                      type="button" 
                      onClick={flyToRegion}
                      title="Klik untuk fokus ke area ini"
                      className={`map-validation-badge ${selectedFeature ? 'active' : ''}`}
                    >
                      {selectedFeature ? `Area RT ${formData.rt}/RW ${formData.rw} (Klik)` : '! Batas area tidak ditemukan'}
                    </button>
                    
                    {/* Tombol Fullscreen */}
                    <button type="button" onClick={() => setIsFullscreen(!isFullscreen)} className="btn-fullscreen" title="Layar Penuh">
                      {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
                    </button>

                    {/* Tombol GPS Current Location */}
                    <button type="button" onClick={flyToGPS} className="btn-gps" title="Gunakan Lokasi GPS Saat Ini">
                      <GPSIcon />
                    </button>

                    <MapContainer 
                      center={mapPosition} 
                      zoom={16} 
                      scrollWheelZoom={true} 
                      style={{ height: '100%', width: '100%', zIndex: 0 }}
                      ref={setMapRef}
                    >
                      <MapResizer isFullscreen={isFullscreen} />
                      
                      {/* Pilihan Basemap */}
                      <LayersControl position="topright">
                        <LayersControl.BaseLayer checked name="Peta Standar">
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Satelit Google">
                          <TileLayer url="http://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}" />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Peta Polos">
                          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png" />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Peta Gelap">
                          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                        </LayersControl.BaseLayer>
                      </LayersControl>
                      
                      {/* Render polygon RT/RW untuk memandu pengguna */}
                      {selectedFeature && (
                        <GeoJSON 
                          key={`target-${formData.rt}-${formData.rw}`} 
                          data={selectedFeature} 
                          style={{ color: '#ffe16f', weight: 4, fillColor: '#ffe16f', fillOpacity: 0.3 }} 
                        />
                      )}
                      
                      <LocationMarker position={mapPosition} setPosition={setMapPosition} setFormData={setFormData} />
                    </MapContainer>
                  </div>
                  
                  <div className="input-group" style={{ marginBottom: '8px' }}>
                    <input type="text" value={formData.lokasi} readOnly className="pintarly-input" style={{ backgroundColor: '#f3f4f6', color: '#6b7280', fontSize: '13px', padding: '10px 14px' }} />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <textarea name="catatan" value={formData.catatan} onChange={handleChange} className="pintarly-input" style={{ minHeight: '50px', padding: '10px 14px' }} placeholder="Catatan khusus lapangan (Opsional)..." />
                  </div>
                </div>
              )}
            </div>

            <div className="btn-container">
              {step > 1 && <button type="button" onClick={prevStep} disabled={isLoading} className="btn-secondary">Kembali</button>}
              
              {step < totalSteps ? (
                <button type="submit" className="btn-primary" 
                  disabled={
                    (step === 1 && !formData.namaPetugas) ||
                    (step === 2 && (!formData.rt || !formData.rw)) ||
                    (step === 3 && !previewUsaha) ||
                    (step === 5 && formData.punyaNib === 'Ya' && !isNibValid) ||
                    (step === 6 && formData.punyaQris === 'Ya' && !previewQris)
                  }>
                  Lanjut
                </button>
              ) : (
                <button type="submit" disabled={isLoading} className="btn-primary" style={{ backgroundColor: isLoading ? '#e5e7eb' : '#ffe16f', color: isLoading ? '#9ca3af' : '#1a1a1b' }}>
                  Kirim Data
                </button>
              )}
            </div>

          </form>
        </div>
      </div>
    </>
  );
};

export default FormKuesioner;