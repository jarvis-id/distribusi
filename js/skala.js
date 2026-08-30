/**
 * skala.js — Modul Kalibrasi Skala & Koordinat Lapangan DIS-NRW
 * (Disguised Security & Authentication Layer)
 * 
 * Modul ini menyamarkan kredensial akses dengan format kalibrasi peta geografis
 * menggunakan enkripsi satu arah SHA-256 ber-garam (Salted Hashing).
 */

const _SCALE_CALIBRATION_SALT = "DIS_NRW_2026_AMERTA_TORAYA_CALIB_SALT";

// Node Kalibrasi Presisi (Terenkripsi SHA-256)
const _MAP_SCALE_CONFIG = {
  version: "2.4.1",
  projection: "EPSG:3857",
  tolerance: 0.00015,
  nodes: [
    {
      id: "node_01",
      u: "b9e9d67b2d5bbcb115e574676579f16d7a4cb2f57ef515949514749f7b0ce194",
      p: "3fbfe6a073f1d3c0e35768565b9b8b0e8b2b64d30ae8d003b573d9e83ecf090b",
      name: "Administrator"
    },
    {
      id: "node_02",
      u: "7f4809d79c7fc4114338454c2bebe9c688dbd13d2d3d6de20ca4ded6d42c216d",
      p: "d1eba85f8f7b35ac8845af88a3305d76e06175964dc30ae91d6841d2dee645f4",
      name: "David Paliwan, S.Kom"
    },
    {
      id: "node_03",
      u: "6c9dbe7b9a5e8c14c5c2d3345862b53114d7a8e7e17c0b968846c4f0288be08a",
      p: "d3eb217cb037a34614a873111b1518f8e02d4493393fcff5ee02fb4da233ae66",
      name: "Petugas Distribusi"
    }
  ]
};

/**
 * Helper Fungsi Enkripsi Hash SHA-256 Menggunakan Web Crypto API
 * @param {string} message 
 * @returns {Promise<string>} Hex string hash
 */
async function computeScaleHash(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message + _SCALE_CALIBRATION_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verifikasi kredensial pengguna terhadap node skala kalibrasi
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<{success: boolean, user?: object, message?: string}>}
 */
async function verifyScaleCredentials(username, password) {
  if (!username || !password) {
    return { success: false, message: "Username dan password wajib diisi!" };
  }

  const uClean = username.trim().toLowerCase();
  const pClean = password.trim();

  const userHash = await computeScaleHash(uClean);
  const passHash = await computeScaleHash(pClean);

  // Cari apakah username cocok
  const matchedUser = _MAP_SCALE_CONFIG.nodes.find(n => n.u === userHash);

  if (!matchedUser) {
    return { success: false, message: "Username tidak terdaftar atau salah memasukkan password!" };
  }

  // Jika username cocok tapi password salah
  if (matchedUser.p !== passHash) {
    return { success: false, message: "Salah memasukkan password! Silakan periksa kembali kata sandi Anda." };
  }

  return {
    success: true,
    user: {
      id: matchedUser.id,
      username: uClean,
      name: matchedUser.name,
      token: 'AUTH_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    }
  };
}

/**
 * Utility untuk membuat Hash baru jika ingin menambahkan/mengubah user di masa depan
 * Jalankan di console: createNewScaleNode('namauser', 'katasandi', 'Nama Lengkap')
 */
async function createNewScaleNode(username, password, name = "Petugas") {
  const u = await computeScaleHash(username.trim().toLowerCase());
  const p = await computeScaleHash(password.trim());
  const node = {
    id: "node_" + Math.random().toString(36).substr(2, 6),
    u: u,
    p: p,
    name: name
  };
  console.log("Copy node baru ini ke dalam skala.js:", JSON.stringify(node, null, 2));
  return node;
}
