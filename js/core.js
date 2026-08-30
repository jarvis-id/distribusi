/**
 * DIS-NRW - Distribusi Air & Pengendalian NRW
 * core.js — Modul inti bersama: Watermark Otomatis, Kamera Live GPS Realtime, Geocoding, Storage
 */

// ============================================================
// TOAST NOTIFICATION
// ============================================================
function showToast(msg, duration = 2500) {
    let t = document.getElementById('sapdi-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'sapdi-toast';
        t.className = 'toast';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), duration);
}

// ============================================================
// LIVE GEOLOCATION TRACKER (FRESH REALTIME GPS)
// ============================================================
let _liveGeo = {
    lat: null,
    lng: null,
    accuracy: null,
    elevation: null,
    addr: "Mencari lokasi GPS...",
    watchId: null,
    lastFetchedLat: null,
    lastFetchedLng: null
};

let _activeCustomMeta = null;
let _calculatedMetricText = null;

async function fetchElevation(lat, lng) {
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
        const data = await res.json();
        if (data && Array.isArray(data.elevation) && data.elevation.length > 0) {
            _liveGeo.elevation = data.elevation[0];
            updateUjiTekananMetricsHUD();
            return data.elevation[0];
        }
    } catch (e) {
        console.warn('Gagal fetch elevasi:', e);
    }
    return null;
}

function updateAccuracyUI(acc) {
    const valEl = document.getElementById('cam-accuracy-val');
    const statusEl = document.getElementById('cam-accuracy-status');
    const dot = document.getElementById('cam-accuracy-dot');
    if (!valEl) return;

    if (acc !== null && !isNaN(acc)) {
        const accMeters = acc.toFixed(1);
        valEl.textContent = `Akurasi: ±${accMeters} m`;
        if (acc <= 5) {
            // 1. Akurasi GPS Baik (<= 5 meter)
            if (statusEl) {
                statusEl.textContent = 'Akurasi GPS Baik';
                statusEl.style.color = '#22C55E';
            }
            if (dot) {
                dot.style.background = '#22C55E';
                dot.style.boxShadow = '0 0 10px #22C55E';
            }
        } else if (acc <= 10) {
            // 2. Akurasi GPS Lumayan Baik (5 - 10 meter)
            if (statusEl) {
                statusEl.textContent = 'Akurasi GPS Lumayan Baik';
                statusEl.style.color = '#F59E0B';
            }
            if (dot) {
                dot.style.background = '#F59E0B';
                dot.style.boxShadow = '0 0 10px #F59E0B';
            }
        } else {
            // 3. Akurasi GPS Kurang Baik (> 10 meter)
            if (statusEl) {
                statusEl.textContent = 'Akurasi GPS Kurang Baik';
                statusEl.style.color = '#EF4444';
            }
            if (dot) {
                dot.style.background = '#EF4444';
                dot.style.boxShadow = '0 0 10px #EF4444';
            }
        }
    } else {
        valEl.textContent = 'Mencari Satelit...';
        if (statusEl) {
            statusEl.textContent = 'Menghubungkan GPS...';
            statusEl.style.color = '#F59E0B';
        }
        if (dot) {
            dot.style.background = '#F59E0B';
            dot.style.boxShadow = '0 0 10px #F59E0B';
        }
    }
}

function formatDynamicDistance(distMeters) {
    if (distMeters === null || isNaN(distMeters) || distMeters < 0) return '0 cm';
    if (distMeters < 1) {
        const cm = Math.round(distMeters * 100);
        return `${cm} cm`;
    } else if (distMeters < 1000) {
        return `${distMeters.toFixed(1)} m`;
    } else {
        const km = (distMeters / 1000).toFixed(2);
        return `${km} km`;
    }
}

function formatDynamicElevation(diffMeters) {
    if (diffMeters === null || isNaN(diffMeters)) return '0 cm';
    const sign = diffMeters >= 0 ? '+' : '-';
    const absDiff = Math.abs(diffMeters);
    if (absDiff < 1) {
        const cm = Math.round(absDiff * 100);
        return `${sign}${cm} cm`;
    } else if (absDiff < 1000) {
        return `${sign}${absDiff.toFixed(1)} m`;
    } else {
        const km = (absDiff / 1000).toFixed(2);
        return `${sign}${km} km`;
    }
}

function updateUjiTekananMetricsHUD() {
    const banner = document.getElementById('cam-custom-metric-banner');
    if (!_activeCustomMeta || _activeCustomMeta.mode !== 'uji_tekanan') {
        if (banner) banner.style.display = 'none';
        _calculatedMetricText = null;
        return;
    }

    if (!banner) return;
    const slot = _activeCustomMeta.slot;
    const refId = _activeCustomMeta.refPreviewId;

    if (slot === 'p2' || slot === 'p3') {
        // 2. Titik Menengah & 3. Titik Terjauh: Jarak dari Titik Terdekat (p1)
        banner.style.display = 'flex';
        banner.className = 'cam-custom-metric-banner';
        const refEl = document.getElementById(refId);
        const refLat = refEl ? parseFloat(refEl.dataset.lat) : null;
        const refLng = refEl ? parseFloat(refEl.dataset.lng) : null;

        if (refLat && refLng && _liveGeo.lat && _liveGeo.lng) {
            const dist = getDistanceMeters(refLat, refLng, _liveGeo.lat, _liveGeo.lng);
            const distStr = formatDynamicDistance(dist);
            banner.innerHTML = `<span>📏 Jarak dari Titik Terdekat:</span> <span style="color:#00E5FF; font-size:13px; font-weight:900;">${distStr}</span>`;
            _calculatedMetricText = `Jarak dari Titik Terdekat: ${distStr}`;
        } else {
            banner.innerHTML = `<span>📏 Jarak dari Titik Terdekat:</span> <span style="color:#F59E0B; font-size:10px;">(Ambil Foto Titik Terdekat dahulu)</span>`;
            _calculatedMetricText = null;
        }
    } else if (slot === 'p5') {
        // 5. Titik Tertinggi: Beda Ketinggian dari Titik Terendah (p4)
        banner.style.display = 'flex';
        banner.className = 'cam-custom-metric-banner highlight-elevation';
        const refEl = document.getElementById(refId);
        const refElev = refEl && refEl.dataset.elevation ? parseFloat(refEl.dataset.elevation) : null;

        if (refElev !== null && !isNaN(refElev) && _liveGeo.elevation !== null) {
            const diff = _liveGeo.elevation - refElev;
            const diffStr = formatDynamicElevation(diff);
            banner.innerHTML = `<span>⛰️ Beda Ketinggian dari Titik Terendah:</span> <span style="color:#F5A623; font-size:13px; font-weight:900;">${diffStr}</span>`;
            _calculatedMetricText = `Beda Ketinggian dari Titik Terendah: ${diffStr}`;
        } else if (refEl && refEl.dataset.lat) {
            banner.innerHTML = `<span>⛰️ Menghitung Elevasi Satelit...</span>`;
            _calculatedMetricText = null;
            if (!refEl.dataset.elevation) {
                fetchElevation(parseFloat(refEl.dataset.lat), parseFloat(refEl.dataset.lng)).then(elev => {
                    if (elev) refEl.dataset.elevation = elev;
                });
            }
        } else {
            banner.innerHTML = `<span>⛰️ Beda Ketinggian:</span> <span style="color:#F59E0B; font-size:10px;">(Ambil Foto Titik Terendah dahulu)</span>`;
            _calculatedMetricText = null;
        }
    } else {
        // Titik Terdekat (p1) & Titik Terendah (p4) tidak menampilkan banner komparasi
        banner.style.display = 'none';
        _calculatedMetricText = null;
    }
}

function refreshLivePosition(onSuccess) {
    if (!navigator.geolocation) return;
    
    // Paksa ambil posisi GPS baru tanpa cache (maximumAge: 0)
    navigator.geolocation.getCurrentPosition(
        pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const acc = pos.coords.accuracy;
            _liveGeo.lat = lat;
            _liveGeo.lng = lng;
            _liveGeo.accuracy = acc;
            
            updateAccuracyUI(acc);
            fetchElevation(lat, lng);
            updateUjiTekananMetricsHUD();
            fetchAddressForCoords(lat, lng, onSuccess);
        },
        err => {
            console.warn('Gagal refresh GPS:', err);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
}

function fetchAddressForCoords(lat, lng, cb) {
    // Jika koordinat sama dengan yang terakhir di-fetch dan sudah ada alamat, gunakan yang ada
    if (_liveGeo.lastFetchedLat === lat && _liveGeo.lastFetchedLng === lng && _liveGeo.addr && !_liveGeo.addr.includes('Mencari')) {
        if (cb) cb(_liveGeo);
        return;
    }

    _liveGeo.lastFetchedLat = lat;
    _liveGeo.lastFetchedLng = lng;
    
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.display_name) {
                _liveGeo.addr = data.display_name;
            } else {
                _liveGeo.addr = `Koordinat: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }
            if (cb) cb(_liveGeo);
        })
        .catch(() => {
            _liveGeo.addr = `Koordinat: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            if (cb) cb(_liveGeo);
        });
}

function startLiveGeoTracking() {
    if (!navigator.geolocation) return;
    
    // Refresh posisi saat ini secara instan
    refreshLivePosition();

    if (_liveGeo.watchId) return;

    _liveGeo.watchId = navigator.geolocation.watchPosition(
        pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const acc = pos.coords.accuracy;
            _liveGeo.lat = lat;
            _liveGeo.lng = lng;
            _liveGeo.accuracy = acc;

            updateAccuracyUI(acc);
            updateUjiTekananMetricsHUD();

            // Update live tampilan GPS di layar kamera seketika koordinat bergeser tanpa jeda waktu
            const el_gps = document.getElementById('wm-gps');
            if (el_gps) {
                el_gps.textContent = `GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }

            // Langsung perbarui alamat saat koordinat berpindah
            fetchAddressForCoords(lat, lng);
        },
        err => console.warn('Geo watch error:', err),
        { enableHighAccuracy: true, maximumAge: 0 }
    );
}

function stopLiveGeoTracking() {
    if (_liveGeo.watchId) {
        navigator.geolocation.clearWatch(_liveGeo.watchId);
        _liveGeo.watchId = null;
    }
}

// Start tracking immediately when loaded
if (typeof navigator !== 'undefined' && navigator.geolocation) {
    startLiveGeoTracking();
}

// ============================================================
// WATERMARK ENGINE
// ============================================================
function getWatermarkData(gpsInputId, addrOutputId) {
    let gpsLat = "0.000000", gpsLng = "0.000000", addrText = "Mencari lokasi GPS...";

    // 1. UTAMAKAN SELALU LIVE GPS TERBARU DARI PERANGKAT
    if (_liveGeo.lat !== null && _liveGeo.lng !== null) {
        gpsLat = parseFloat(_liveGeo.lat).toFixed(6);
        gpsLng = parseFloat(_liveGeo.lng).toFixed(6);
        if (_liveGeo.addr && !_liveGeo.addr.includes('Mencari')) {
            addrText = _liveGeo.addr;
        } else {
            addrText = `Koordinat: ${gpsLat}, ${gpsLng}`;
        }
        return { gpsLat, gpsLng, addrText };
    }

    // 2. Fallback HANYA jika sinyal GPS perangkat belum didapat sama sekali
    if (gpsInputId) {
        const gpsVal = document.getElementById(gpsInputId)?.value || '';
        if (gpsVal.includes('query=')) {
            const coords = gpsVal.split('query=')[1].split(',');
            gpsLat = parseFloat(coords[0]).toFixed(6);
            gpsLng = parseFloat(coords[1]).toFixed(6);
        } else if (gpsVal.includes(',')) {
            const coords = gpsVal.split(',');
            gpsLat = parseFloat(coords[0]).toFixed(6);
            gpsLng = parseFloat(coords[1]).toFixed(6);
        }
    }
    if (addrOutputId) {
        const addrEl = document.getElementById(addrOutputId);
        if (addrEl && addrEl.innerText && !addrEl.innerText.includes('otomatis') && !addrEl.innerText.includes('Menerjemahkan') && !addrEl.innerText.includes('Mencari')) {
            addrText = addrEl.innerText.trim();
        }
    }
    return { gpsLat, gpsLng, addrText };
}

function applyWatermark(canvas, gpsInputId, addrOutputId) {
    const ctx = canvas.getContext('2d');
    const wm = getWatermarkData(gpsInputId, addrOutputId);
    const now = new Date();
    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const hhmm = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    const ddMMyyyy = now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
    const dddd = days[now.getDay()];

    // Scale faktor berdasarkan resolusi canvas
    const scale = Math.max(canvas.width, canvas.height) / 1000;
    const pad = Math.round(20 * scale);

    // ── Helper: gambar pill transparan di belakang teks ──────────────────────
    function drawTextBg(text, x, y, fontSize, pillAlpha, paddingX, paddingY) {
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        const measured = ctx.measureText(text).width;
        const rX = x - paddingX;
        const rY = y - fontSize - paddingY;
        const rW = measured + paddingX * 2;
        const rH = fontSize + paddingY * 2 + Math.round(4 * scale);
        const r = Math.round(6 * scale);
        ctx.fillStyle = `rgba(0,0,0,${pillAlpha})`;
        ctx.beginPath();
        ctx.moveTo(rX + r, rY);
        ctx.arcTo(rX + rW, rY, rX + rW, rY + rH, r);
        ctx.arcTo(rX + rW, rY + rH, rX, rY + rH, r);
        ctx.arcTo(rX, rY + rH, rX, rY, r);
        ctx.arcTo(rX, rY, rX + rW, rY, r);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Background gradient gelap di bagian bawah (baseline readability)
    const gradH = Math.round(180 * scale);
    const grad = ctx.createLinearGradient(0, canvas.height - gradH, 0, canvas.height);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.25, 'rgba(0,0,0,0.45)');
    grad.addColorStop(1, 'rgba(0,0,0,0.80)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, canvas.height - gradH, canvas.width, gradH);

    // Shadow teks
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur = 8 * scale;
    ctx.shadowOffsetX = 2 * scale;
    ctx.shadowOffsetY = 2 * scale;

    // ── 1. Jam Besar (kiri bawah) ─────────────────────────────────────────
    const timeFontSize = Math.round(62 * scale);   // +10 dari sebelumnya (52→62)
    ctx.font = `bold ${timeFontSize}px 'Arial Narrow', Arial, sans-serif`;
    const timeY = canvas.height - Math.round(68 * scale);

    // Pill latar jam
    drawTextBg(hhmm, pad, timeY, timeFontSize, 0.55, Math.round(10 * scale), Math.round(6 * scale));

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(hhmm, pad, timeY);
    const timeW = ctx.measureText(hhmm).width;

    // ── 2. Garis vertikal emas ────────────────────────────────────────────
    const lineX = pad + timeW + Math.round(16 * scale);
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(lineX, timeY - Math.round(52 * scale));
    ctx.lineTo(lineX, timeY + Math.round(6 * scale));
    ctx.strokeStyle = '#F5A623';
    ctx.lineWidth = Math.max(3, Math.round(4 * scale));
    ctx.stroke();
    ctx.restore();

    // ── 3. Tanggal & Hari ─────────────────────────────────────────────────
    const dateX = lineX + Math.round(16 * scale);
    const dateFontSize = Math.round(20 * scale);   // +4 dari sebelumnya (16→20)
    ctx.font = `bold ${dateFontSize}px Arial, sans-serif`;

    const dateYPos = timeY - Math.round(22 * scale);
    const dayYPos  = timeY + Math.round(6 * scale);

    drawTextBg(ddMMyyyy, dateX, dateYPos, dateFontSize, 0.50, Math.round(8 * scale), Math.round(4 * scale));
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(ddMMyyyy, dateX, dateYPos);

    drawTextBg(dddd, dateX, dayYPos, dateFontSize, 0.50, Math.round(8 * scale), Math.round(4 * scale));
    ctx.fillStyle = '#FFD580';
    ctx.fillText(dddd, dateX, dayYPos);

    // ── 4. GPS & Alamat ───────────────────────────────────────────────────
    const infoFontSize = Math.round(16 * scale);   // +3 dari sebelumnya (13→16)
    ctx.font = `${infoFontSize}px Arial, sans-serif`;

    const gpsLine  = `GPS: ${wm.gpsLat}, ${wm.gpsLng}`;
    const gpsY     = timeY + Math.round(28 * scale);
    drawTextBg(gpsLine, pad, gpsY, infoFontSize, 0.55, Math.round(8 * scale), Math.round(5 * scale));
    ctx.fillStyle = 'rgba(255,255,255,0.97)';
    ctx.fillText(gpsLine, pad, gpsY);

    let displayAddr = wm.addrText;
    if (displayAddr.length > 60) displayAddr = displayAddr.substring(0, 60) + '...';
    const addrLine = `Lokasi: ${displayAddr}`;
    const addrY    = timeY + Math.round(50 * scale);
    drawTextBg(addrLine, pad, addrY, infoFontSize, 0.55, Math.round(8 * scale), Math.round(5 * scale));
    ctx.fillStyle = 'rgba(255,255,255,0.97)';
    ctx.fillText(addrLine, pad, addrY);

    // ── 5. Metrik Khusus Realtime (Uji Tekanan)
    // Metrik TIDAK distempel di foto untuk Uji Tekanan — tampil di Data Lokasi PDF saja.
    // Untuk mode lain, stempel tetap diizinkan.
    const _isUjiTekananMode = _activeCustomMeta && _activeCustomMeta.mode === 'uji_tekanan';
    if (_calculatedMetricText && !_isUjiTekananMode) {
        const mFontSize = Math.round(15 * scale);
        ctx.font = `bold ${mFontSize}px Arial, sans-serif`;
        const metricLine = `⚡ ${_calculatedMetricText}`;
        const metricY    = timeY + Math.round(72 * scale);
        drawTextBg(metricLine, pad, metricY, mFontSize, 0.60, Math.round(8 * scale), Math.round(5 * scale));
        ctx.fillStyle = '#00E5FF';
        ctx.fillText(metricLine, pad, metricY);
    }

    // ── 6. Watermark DIS-NRW (Kanan Bawah) ────────────────────────────────
    const brandFontSize = Math.round(14 * scale);
    ctx.font = `bold ${brandFontSize}px Arial, sans-serif`;
    const brandText = 'DIS-NRW Amerta Toraya';
    const brandY    = canvas.height - Math.round(18 * scale);
    const brandX    = canvas.width - pad;
    ctx.save();
    ctx.shadowBlur = 0;
    const bW = ctx.measureText(brandText).width;
    ctx.fillStyle = 'rgba(0,0,0,0.50)';
    const bPX = Math.round(8 * scale);
    const bPY = Math.round(4 * scale);
    ctx.fillRect(brandX - bW - bPX, brandY - brandFontSize - bPY, bW + bPX * 2, brandFontSize + bPY * 2 + Math.round(4 * scale));
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.80)';
    ctx.textAlign = 'right';
    ctx.fillText(brandText, brandX, brandY);
    ctx.textAlign = 'left';
    ctx.shadowBlur = 0;
}

// ============================================================
// IMAGE COMPRESSOR + PROCESS
// ============================================================
function compressAndWatermark(canvas, gpsInputId, addrOutputId) {
    applyWatermark(canvas, gpsInputId, addrOutputId);
    if (typeof SmartCompressor !== 'undefined') {
        return SmartCompressor.compressCanvas(canvas, 1200, 0.82);
    }
    return canvas.toDataURL('image/jpeg', 0.85);
}

function processGalleryFile(file, previewId, gpsInputId, addrOutputId, onDone) {
    if (!file) return;

    // Pastikan koordinat GPS terbaru diambil saat memilih foto galeri
    refreshLivePosition(() => {
        _processGalleryFileInternal(file, previewId, gpsInputId, addrOutputId, onDone);
    });
}

function _processGalleryFileInternal(file, previewId, gpsInputId, addrOutputId, onDone) {
    const handleResult = (dataUrl) => {
        const wm = getWatermarkData(gpsInputId, addrOutputId);
        const meta = {
            img: dataUrl,
            gps: (wm.gpsLat !== "0.000000") ? `${wm.gpsLat},${wm.gpsLng}` : '',
            addr: wm.addrText,
            lat: (wm.gpsLat !== "0.000000") ? parseFloat(wm.gpsLat) : null,
            lng: (wm.gpsLng !== "0.000000") ? parseFloat(wm.gpsLng) : null,
            elevation: _liveGeo.elevation,
            metric: _calculatedMetricText,
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            mapsUrl: (wm.gpsLat !== "0.000000") ? `https://www.google.com/maps/search/?api=1&query=${wm.gpsLat},${wm.gpsLng}` : ''
        };

        setPreviewImage(previewId, dataUrl, meta);
        updateLocationUI(gpsInputId, addrOutputId, meta);
        if (onDone) onDone(meta, previewId);
        if (typeof saveDraft === 'function') saveDraft();
    };

    if (typeof SmartCompressor !== 'undefined') {
        SmartCompressor.compressImageFile(file, 1200, 0.82).then(res => {
            const dataUrl = compressAndWatermark(res.canvas, gpsInputId, addrOutputId);
            handleResult(dataUrl);
        }).catch(err => console.error('Kompresi galeri gagal:', err));
    } else {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const c = document.createElement('canvas');
                const maxDim = 1200;
                let w = img.width, h = img.height;
                if (w > h && w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
                else if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; }
                c.width = w; c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                const dataUrl = compressAndWatermark(c, gpsInputId, addrOutputId);
                handleResult(dataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function setPreviewImage(previewId, dataUrl, meta) {
    const el = document.getElementById(previewId);
    if (el) {
        el.innerHTML = `<img src="${dataUrl}">`;
        el.classList.add('has-photo');
        if (meta) {
            if (meta.gps) el.dataset.gps = meta.gps;
            if (meta.addr) el.dataset.addr = meta.addr;
            if (meta.lat) el.dataset.lat = meta.lat;
            if (meta.lng) el.dataset.lng = meta.lng;
            if (meta.elevation !== undefined) el.dataset.elevation = meta.elevation;
            if (meta.metric) el.dataset.metric = meta.metric;
            if (meta.mapsUrl) el.dataset.mapsUrl = meta.mapsUrl;
        }
    }
}

function updateLocationUI(gpsInputId, addrOutputId, meta) {
    if (gpsInputId && meta.gps) {
        const gpsEl = document.getElementById(gpsInputId);
        if (gpsEl) gpsEl.value = `https://www.google.com/maps/search/?api=1&query=${meta.gps}`;
    }
    if (addrOutputId && meta.addr && !meta.addr.includes('belum') && !meta.addr.includes('Mencari')) {
        const addrEl = document.getElementById(addrOutputId);
        if (addrEl) addrEl.innerText = meta.addr;
    }
}

// ============================================================
// KAMERA
// ============================================================
let _cameraStream = null;
let _wmInterval = null;
let _activePreviewId = null;
let _activeGpsId = null;
let _activeAddrId = null;
let _facingMode = 'environment';
let _onPhotoCaptured = null;

async function openCamera(previewId, gpsInputId, addrOutputId, onCaptured, customMeta) {
    _activePreviewId = previewId;
    _activeGpsId = gpsInputId;
    _activeAddrId = addrOutputId;
    _onPhotoCaptured = onCaptured || null;
    _activeCustomMeta = customMeta || null;

    // AMBIL POSISI GPS TERBARU SAAT KAMERA DIBUKA (Tanpa Cache)
    refreshLivePosition();

    const modal = document.getElementById('cam-modal');
    modal.classList.add('active');
    document.getElementById('cam-overlay').style.display = 'block';

    // Injeksi Badge Akurasi Satelit di Sudut Kanan Atas Layar Kamera
    let accBadge = document.getElementById('cam-accuracy-badge');
    if (!accBadge && modal) {
        accBadge = document.createElement('div');
        accBadge.id = 'cam-accuracy-badge';
        accBadge.className = 'cam-accuracy-badge';
        accBadge.innerHTML = `
            <div class="cam-accuracy-top">
                <span class="accuracy-dot" id="cam-accuracy-dot"></span>
                <span class="cam-accuracy-val" id="cam-accuracy-val">Mencari Satelit...</span>
            </div>
            <div class="cam-accuracy-status" id="cam-accuracy-status" style="color:#F59E0B;">Menghubungkan GPS...</div>
        `;
        modal.appendChild(accBadge);
    }
    updateAccuracyUI(_liveGeo.accuracy);

    // Injeksi Floating Banner Khusus Metrik Realtime (Uji Tekanan)
    let metricBanner = document.getElementById('cam-custom-metric-banner');
    if (!metricBanner && modal) {
        metricBanner = document.createElement('div');
        metricBanner.id = 'cam-custom-metric-banner';
        metricBanner.className = 'cam-custom-metric-banner';
        metricBanner.style.display = 'none';
        modal.appendChild(metricBanner);
    }
    updateUjiTekananMetricsHUD();

    _wmInterval = setInterval(() => {
        const now = new Date();
        const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
        const hhmm = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
        const wm = getWatermarkData(gpsInputId, addrOutputId);
        const el_t = document.getElementById('wm-time');
        const el_d = document.getElementById('wm-date');
        const el_day = document.getElementById('wm-day');
        const el_gps = document.getElementById('wm-gps');
        const el_addr = document.getElementById('wm-addr');
        if (el_t) el_t.textContent = hhmm;
        if (el_d) el_d.textContent = now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
        if (el_day) el_day.textContent = days[now.getDay()];
        if (el_gps) el_gps.textContent = `GPS: ${wm.gpsLat}, ${wm.gpsLng}`;
        if (el_addr) el_addr.textContent = wm.addrText.substring(0, 60);
    }, 300);

    await _startStream();
}

async function _startStream() {
    if (_cameraStream) { _cameraStream.getTracks().forEach(t => t.stop()); _cameraStream = null; }
    try {
        _cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: _facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        document.getElementById('cam-video').srcObject = _cameraStream;
    } catch {
        try { _cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); document.getElementById('cam-video').srcObject = _cameraStream; }
        catch { showToast('❌ Kamera tidak bisa diakses. Pastikan izin kamera diberikan.', 3000); closeCamera(); }
    }
}

function flipCamera() { _facingMode = _facingMode === 'environment' ? 'user' : 'environment'; _startStream(); }

function capturePhoto() {
    const video = document.getElementById('cam-video');
    const c = document.createElement('canvas');
    const MAX = 1200;
    let w = video.videoWidth, h = video.videoHeight;
    if (w > h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
    else if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, w, h);

    // Pastikan HUD metrik diperbarui sesaat sebelum ambil foto
    // agar _calculatedMetricText memiliki nilai terkini
    updateUjiTekananMetricsHUD();

    const dataUrl = compressAndWatermark(c, _activeGpsId, _activeAddrId);

    // Ambil metadata foto spesifik titik saat pengambilan foto ini
    const wm = getWatermarkData(_activeGpsId, _activeAddrId);
    const photoMeta = {
        img: dataUrl,
        gps: (wm.gpsLat !== "0.000000") ? `${wm.gpsLat},${wm.gpsLng}` : '',
        addr: wm.addrText,
        lat: (wm.gpsLat !== "0.000000") ? parseFloat(wm.gpsLat) : null,
        lng: (wm.gpsLng !== "0.000000") ? parseFloat(wm.gpsLng) : null,
        elevation: _liveGeo.elevation,
        // Simpan metrik ke metadata foto (untuk ditampilkan di Data Lokasi PDF, bukan di foto)
        metric: _calculatedMetricText || null,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        mapsUrl: (wm.gpsLat !== "0.000000") ? `https://www.google.com/maps/search/?api=1&query=${wm.gpsLat},${wm.gpsLng}` : ''
    };

    setPreviewImage(_activePreviewId, dataUrl, photoMeta);
    updateLocationUI(_activeGpsId, _activeAddrId, photoMeta);
    closeCamera();

    if (_onPhotoCaptured) _onPhotoCaptured(photoMeta, _activePreviewId);
    if (typeof onAfterCapture === 'function') onAfterCapture(_activePreviewId, photoMeta);
    if (typeof saveDraft === 'function') saveDraft();
}

function closeCamera() {
    if (_cameraStream) { _cameraStream.getTracks().forEach(t => t.stop()); _cameraStream = null; }
    if (_wmInterval) { clearInterval(_wmInterval); _wmInterval = null; }
    const modal = document.getElementById('cam-modal');
    if (modal) modal.classList.remove('active');
    _facingMode = 'environment';
}

// ============================================================
// GPS & PETA LEAFLET (Manual Picker Fallback)
// ============================================================
let _map = null, _marker = null, _tempCoords = null;
let _activeGpsTarget = null, _activeAddrTarget = null;

function openMap(gpsId, addrId) {
    _activeGpsTarget = gpsId;
    _activeAddrTarget = addrId;
    document.getElementById('map-modal').style.display = 'block';
    if (!_map) {
        _map = L.map('map-container').setView([-2.9691, 119.8972], 12);
        L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { maxZoom: 20 }).addTo(_map);
        _marker = L.marker([-2.9691, 119.8972], { draggable: true }).addTo(_map);
        _marker.on('dragend', e => { const ll = e.target.getLatLng(); _setMapMarker(ll.lat, ll.lng); });
        _map.on('click', e => _setMapMarker(e.latlng.lat, e.latlng.lng));
    }
    setTimeout(() => _map.invalidateSize(), 300);
}

function _setMapMarker(lat, lng) {
    _tempCoords = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    _marker.setLatLng([lat, lng]);
    const statusEl = document.getElementById('map-status');
    if (statusEl) statusEl.textContent = `📍 ${_tempCoords}`;
}

function mapLocateMe() {
    if (_map) {
        _map.locate({ setView: true, maxZoom: 18, enableHighAccuracy: true });
        _map.on('locationfound', e => {
            _setMapMarker(e.latlng.lat, e.latlng.lng);
            _liveGeo.lat = e.latlng.lat;
            _liveGeo.lng = e.latlng.lng;
        });
    }
}

async function confirmMapLocation() {
    if (!_tempCoords) { showToast('Pilih titik pada peta terlebih dahulu'); return; }
    const gpsEl = document.getElementById(_activeGpsTarget);
    const addrEl = document.getElementById(_activeAddrTarget);
    if (gpsEl) gpsEl.value = `https://www.google.com/maps/search/?api=1&query=${_tempCoords}`;
    if (addrEl) addrEl.innerText = 'Menerjemahkan koordinat...';
    closeMap();
    const [lat, lng] = _tempCoords.split(',');
    _liveGeo.lat = parseFloat(lat);
    _liveGeo.lng = parseFloat(lng);
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        if (addrEl) addrEl.innerText = data.display_name || 'Lokasi tersimpan.';
        _liveGeo.addr = data.display_name || 'Lokasi tersimpan.';
    } catch { if (addrEl) addrEl.innerText = 'Lokasi tersimpan.'; }
    if (typeof onLocationConfirmed === 'function') onLocationConfirmed();
    if (typeof saveDraft === 'function') saveDraft();
}

function closeMap() { document.getElementById('map-modal').style.display = 'none'; }

// ============================================================
// HAVERSINE DISTANCE CALCULATOR (Meters)
// ============================================================
function getDistanceMeters(lat1, lon1, lat2, lon2) {
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return 0;
    const R = 6371000; // meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// ============================================================
// DATE HELPER
// ============================================================
function getTodayISODate() {
    return new Date().toISOString().split('T')[0];
}

function formatIndoDate(dateStr) {
    if (!dateStr) return 'Pilih tanggal...';
    const d = new Date(dateStr + 'T00:00:00');
    return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

// ============================================================
// STORAGE KEY CONSTANTS
// ============================================================
const SAPDI_KEYS = {
    DRAFT: 'sapdi_draft',
    HISTORY: 'sapdi_history',
    EDIT_ID: 'sapdi_edit_id',
    JARVIS_MUTED: 'jarvis_muted',
    JARVIS_ACTIVE: 'jarvis_active'
};
