/************************************************************
 * KONFIGURASI SUPABASE
 ************************************************************/
const SUPABASE_URL = "https://hkllhgmfbnepgtfnrxuj.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbGxoZ21mYm5lcGd0Zm5yeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTA1NzQsImV4cCI6MjA4Mjc2NjU3NH0.Ft8giYKJIPPiGstRJXJNb_uuKQUuNlaAM8p2dE2UKs0";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`
};

/************************************************************
 * HELPER UMUM
 ************************************************************/
function formatRupiah(val) {
  if (val === null || val === undefined || isNaN(val)) return "-";
  return "Rp " + Math.round(val).toLocaleString("id-ID");
}

function namaHari(dateStr) {
  const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  return hari[new Date(dateStr).getDay()];
}

function getCheckedValues(containerId) {
  return Array.from(
    document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`)
  ).map(el => el.value);
}

/************************************************************
 * LOGIKA MINGGU (ATURAN LEMBAGA)
 ************************************************************/
function mingguKeLaporan(tanggalStr) {
  const d = new Date(tanggalStr);
  const y = d.getFullYear();
  const m = d.getMonth();

  const first = new Date(y, m, 1);
  while (first.getDay() === 0 || first.getDay() === 6) {
    first.setDate(first.getDate() + 1);
  }

  const friday = new Date(first);
  friday.setDate(first.getDate() + (5 - friday.getDay()));

  if (d <= friday) return 1;

  const nextMonday = new Date(friday);
  nextMonday.setDate(friday.getDate() + 3);

  const diffDays = Math.floor((d - nextMonday) / 86400000);
  return Math.min(2 + Math.floor(diffDays / 7), 5);
}

/************************************************************
 * LOAD FILTER MASTER
 ************************************************************/
async function loadFilterKomoditas() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/komoditas?select=id_komoditas,nama_komoditas&order=nama_komoditas.asc`,
    { headers }
  );
  const data = await res.json();
  const el = document.getElementById("filterKomoditasList");
  el.innerHTML = "";
  data.forEach(d => {
    el.innerHTML += `
      <li>
        <label>
          <input type="checkbox" value="${d.id_komoditas}">
          ${d.nama_komoditas}
        </label>
      </li>`;
  });
}

async function loadFilterPasar() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/pasar?select=id_pasar,nama_pasar&order=nama_pasar.asc`,
    { headers }
  );
  const data = await res.json();
  const el = document.getElementById("filterPasarList");
  el.innerHTML = "";
  data.forEach(d => {
    el.innerHTML += `
      <li>
        <label>
          <input type="checkbox" value="${d.id_pasar}">
          ${d.nama_pasar}
        </label>
      </li>`;
  });
}

/************************************************************
 * HARGA HARIAN (TABEL ATAS)
 ************************************************************/
async function loadHargaHarian() {
  const bulan = document.getElementById("filterBulan").value;
  const tahun = document.getElementById("filterTahun").value;
  const komoditas = getCheckedValues("filterKomoditasList");
  const pasar = getCheckedValues("filterPasarList");

  let url =
    `${SUPABASE_URL}/rest/v1/v_harga_harian_lengkap`
    + `?tahun=eq.${tahun}&bulan=eq.${bulan}`
    + `&order=nama_komoditas.asc&order=nama_pasar.asc&order=tanggal.asc`;

  if (komoditas.length) url += `&id_komoditas=in.(${komoditas.join(",")})`;
  if (pasar.length) url += `&id_pasar=in.(${pasar.join(",")})`;

  const res = await fetch(url, { headers });
  renderHargaHarian(await res.json());
}

function renderHargaHarian(data) {
  const el = document.getElementById("hargaHarian");
  if (!data.length) {
    el.innerHTML = "<em>Tidak ada data</em>";
    return;
  }

  const tanggalList = [...new Set(data.map(d => d.tanggal))].sort();
  const grup = {};

  data.forEach(d => {
    const key = `${d.nama_komoditas}||${d.nama_pasar}`;
    grup[key] ??= { komoditas: d.nama_komoditas, pasar: d.nama_pasar, harga: {} };
    grup[key].harga[d.tanggal] = d.harga;
  });

  let html = `<table class="table table-bordered table-sm table-dashboard">
    <thead><tr><th>No</th><th>Komoditas</th><th>Pasar</th>`;

  tanggalList.forEach(t => html += `<th>${t}</th>`);
  html += `</tr></thead><tbody>`;

  let no = 1;
  Object.values(grup).forEach(r => {
    html += `<tr>
      <td>${no++}</td>
      <td>${r.komoditas}</td>
      <td>${r.pasar}</td>`;
    tanggalList.forEach(t =>
      html += `<td class="text-end">${r.harga[t] ? formatRupiah(r.harga[t]) : "-"}</td>`
    );
    html += `</tr>`;
  });

  el.innerHTML = html + "</tbody></table>";
}

/************************************************************
 * IPH MINGGUAN (PRODUKSI + DEBUG)
 ************************************************************/
async function loadIphMingguan() {
  const bulan = document.getElementById("filterBulan").value;
  const tahun = document.getElementById("filterTahun").value;
  const komoditas = getCheckedValues("filterKomoditasList");
  const pasar = getCheckedValues("filterPasarList");

  let url =
    `${SUPABASE_URL}/rest/v1/v_iph_harian_bersih`
    + `?tahun=eq.${tahun}&bulan=eq.${bulan}`
    + `&order=tanggal.asc`;

  if (komoditas.length) url += `&id_komoditas=in.(${komoditas.join(",")})`;
  if (pasar.length) url += `&id_pasar=in.(${pasar.join(",")})`;

  const res = await fetch(url, { headers });
  const data = await res.json();

  renderIphMingguan(data);
  renderLogMingguan(data);
  renderLogTableMingguan(data);
  renderLogTableMingguanKumulatif(data);
}

/************************************************************
 * RENDER IPH MINGGUAN (PRODUKSI)
 ************************************************************/
function renderIphMingguan(data) {
  const el = document.getElementById("iphMingguan");
  if (!data.length) {
    el.innerHTML = "<em>Tidak ada data</em>";
    return;
  }

  const bucket = {};
  let maxM = 0;

  data.forEach(d => {
    const m = mingguKeLaporan(d.tanggal);
    maxM = Math.max(maxM, m);

    bucket[d.nama_komoditas] ??= {};
    bucket[d.nama_komoditas][m] ??= [];
    bucket[d.nama_komoditas][m].push(d.harga);
  });

  let html = `<table class="table table-bordered table-sm">
    <thead><tr><th>Komoditas</th>`;

  for (let i = 1; i <= maxM; i++) html += `<th>M${i}</th>`;
  html += `</tr></thead><tbody>`;

  Object.keys(bucket).forEach(k => {
    html += `<tr><td>${k}</td>`;
    for (let i = 1; i <= maxM; i++) {
      const arr = bucket[k][i] || [];
      const avg = arr.length
        ? arr.reduce((a,b)=>a+b,0) / arr.length
        : null;
      html += `<td class="text-end">${avg ? formatRupiah(avg) : "-"}</td>`;
    }
    html += `</tr>`;
  });

  el.innerHTML = html + "</tbody></table>";
}

/************************************************************
 * DEBUG LOG & TABEL
 ************************************************************/
function renderLogMingguan(data) { /* sama seperti sebelumnya */ }
function renderLogTableMingguan(data) { /* sama seperti sebelumnya */ }
function renderLogTableMingguanKumulatif(data) { /* sama seperti sebelumnya */ }

/************************************************************
 * EVENT
 ************************************************************/
document.getElementById("btnTampil").onclick = () => {
  loadHargaHarian();
  loadIphMingguan();
};

document.addEventListener("DOMContentLoaded", () => {
  loadFilterKomoditas();
  loadFilterPasar();
});
