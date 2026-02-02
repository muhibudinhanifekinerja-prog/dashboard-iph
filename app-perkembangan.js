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

function getSelectedTahun() {
  return document.getElementById("filterTahun").value;
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

  // Hari kerja pertama bulan
  const first = new Date(y, m, 1);
  while (first.getDay() === 0 || first.getDay() === 6) {
    first.setDate(first.getDate() + 1);
  }

  // Jumat minggu pertama
  const friday = new Date(first);
  friday.setDate(first.getDate() + (5 - friday.getDay()));

  if (d <= friday) return 1;

  // Senin setelah M1
  const nextMonday = new Date(friday);
  nextMonday.setDate(friday.getDate() + 3);

  const diffDays = Math.floor((d - nextMonday) / 86400000);
  return Math.min(2 + Math.floor(diffDays / 7), 5);
}

/************************************************************
 * LOAD FILTER
 ************************************************************/
async function loadFilterTahun() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/v_tahun_data?select=tahun&order=tahun.desc`,
    { headers }
  );
  const data = await res.json();
  const el = document.getElementById("filterTahun");
  el.innerHTML = "";
  data.forEach(d => el.innerHTML += `<option value="${d.tahun}">${d.tahun}</option>`);
}

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
 * HARGA HARIAN
 ************************************************************/
async function loadHargaHarian() {
  const bulan = document.getElementById("filterBulan").value;
  const tahun = getSelectedTahun();
  const komoditasArr = getCheckedValues("filterKomoditasList");
  const pasarArr = getCheckedValues("filterPasarList");

  const start = `${tahun}-${bulan.padStart(2,"0")}-01`;
  const end = new Date(tahun, bulan, 0).toISOString().slice(0,10);

  let url =
    `${SUPABASE_URL}/rest/v1/v_harga_harian_lengkap`
    + `?tanggal=gte.${start}`
    + `&tanggal=lte.${end}`
    + `&order=nama_komoditas.asc`
    + `&order=nama_pasar.asc`
    + `&order=tanggal.asc`;

  if (komoditasArr.length) url += `&id_komoditas=in.(${komoditasArr.join(",")})`;
  if (pasarArr.length) url += `&id_pasar=in.(${pasarArr.join(",")})`;

  const res = await fetch(url, { headers });
  renderHargaHarian(await res.json());
}

function renderHargaHarian(data) {
  const el = document.getElementById("hargaHarian");
  if (!data.length) return el.innerHTML = "<em>Tidak ada data</em>";

  const tanggalList = [...new Set(data.map(d => d.tanggal))].sort();
  const grup = {};

  data.forEach(d => {
    const key = `${d.nama_komoditas}||${d.nama_pasar}`;
    if (!grup[key]) grup[key] = { k: d.nama_komoditas, p: d.nama_pasar, h: {} };
    grup[key].h[d.tanggal] = d.harga;
  });

  let html = `<table class="table table-bordered table-sm table-dashboard">
    <thead><tr><th>No</th><th>Komoditas</th><th>Pasar</th>`;
  tanggalList.forEach(t => html += `<th>${t}</th>`);
  html += `</tr></thead><tbody>`;

  let no = 1;
  Object.values(grup).forEach(r => {
    html += `<tr><td>${no++}</td><td>${r.k}</td><td>${r.p}</td>`;
    tanggalList.forEach(t =>
      html += `<td class="text-end">${r.h[t] ? formatRupiah(r.h[t]) : "-"}</td>`
    );
    html += `</tr>`;
  });

  el.innerHTML = html + "</tbody></table>";
}

/************************************************************
 * IPH MINGGUAN + DEBUG
 ************************************************************/
async function loadIphMingguan() {
  const bulan = document.getElementById("filterBulan").value;
  const tahun = getSelectedTahun();
  const komoditas = getCheckedValues("filterKomoditasList");
  const pasar = getCheckedValues("filterPasarList");

  let url =
    `${SUPABASE_URL}/rest/v1/v_iph_harian_bersih`
    + `?tahun=eq.${tahun}&bulan=eq.${bulan}`
    + `&order=nama_komoditas.asc&order=tanggal.asc`;

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
 * INIT
 ************************************************************/
document.getElementById("btnTampil").onclick = () => {
  loadHargaHarian();
  loadIphMingguan();
};

document.addEventListener("DOMContentLoaded", async () => {
  await loadFilterTahun();
  await loadFilterKomoditas();
  await loadFilterPasar();
});
