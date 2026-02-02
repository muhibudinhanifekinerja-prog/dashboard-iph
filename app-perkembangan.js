/*****************************************************************
 * KONFIGURASI SUPABASE (DARI FILE ASLI KAMU)
 *****************************************************************/
const SUPABASE_URL = "https://hkllhgmfbnepgtfnrxuj.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbGxoZ21mYm5lcGd0Zm5yeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTA1NzQsImV4cCI6MjA4Mjc2NjU3NH0.Ft8giYKJIPPiGstRJXJNb_uuKQUuNlaAM8p2dE2UKs0";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`
};

/*****************************************************************
 * STATE GLOBAL
 *****************************************************************/
let DATA_HARIAN = [];
let DATA_KUMULATIF = null;

/*****************************************************************
 * HELPER
 *****************************************************************/
function formatRupiah(v) {
  if (v === null || v === undefined || isNaN(v)) return "-";
  return "Rp " + Math.round(v).toLocaleString("id-ID");
}

/*****************************************************************
 * LOGIKA MINGGU (ATURAN LEMBAGA)
 *****************************************************************/
function mingguKeLaporan(tanggalStr) {
  const d = new Date(tanggalStr);
  const y = d.getFullYear();
  const m = d.getMonth();

  const tgl1 = new Date(y, m, 1);
  const dow1 = tgl1.getDay(); // 0=Min

  let akhirM1;
  if (dow1 >= 1 && dow1 <= 4) {
    akhirM1 = new Date(y, m, 1 + (5 - dow1));
  } else {
    const seninNext = new Date(y, m, 1 + ((8 - dow1) % 7));
    akhirM1 = new Date(seninNext);
    akhirM1.setDate(akhirM1.getDate() + 4);
  }

  if (d <= akhirM1) return 1;

  const diff = Math.floor((d - akhirM1) / 86400000);
  return Math.min(1 + Math.ceil(diff / 7), 5);
}

/*****************************************************************
 * HITUNG MINGGUAN KUMULATIF
 *****************************************************************/
function hitungMingguanKumulatif(data) {
  const mingguMap = {};
  const komoditasSet = new Set();

  data.forEach(d => {
    if (!d.harga || d.harga <= 0) return;
    const m = mingguKeLaporan(d.tanggal);

    mingguMap[m] ??= {};
    mingguMap[m][d.nama_komoditas] ??= [];
    mingguMap[m][d.nama_komoditas].push(d.harga);
    komoditasSet.add(d.nama_komoditas);
  });

  const mingguList = Object.keys(mingguMap).map(Number).sort((a,b)=>a-b);
  const komoditasList = [...komoditasSet];

  const buffer = {};
  komoditasList.forEach(k => buffer[k] = []);

  const hasil = {};
  mingguList.forEach(m => {
    hasil[m] = {};
    komoditasList.forEach(k => {
      if (mingguMap[m][k]) buffer[k].push(...mingguMap[m][k]);
      hasil[m][k] = buffer[k].length
        ? buffer[k].reduce((a,b)=>a+b,0) / buffer[k].length
        : null;
    });
  });

  return { mingguList, komoditasList, hasil };
}

/*****************************************************************
 * LOAD DATA
 *****************************************************************/
async function loadData() {
  const bulan = filterBulan.value;
  const tahun = filterTahun.value;

  const start = `${tahun}-${String(bulan).padStart(2,"0")}-01`;
  const end = new Date(tahun, bulan, 0).toISOString().slice(0,10);

  const url =
    `${SUPABASE_URL}/rest/v1/v_harga_harian_lengkap`
    + `?tanggal=gte.${start}&tanggal=lte.${end}`
    + `&order=tanggal.asc`;

  const res = await fetch(url, { headers });
  DATA_HARIAN = await res.json();

  renderHarian();
  DATA_KUMULATIF = hitungMingguanKumulatif(DATA_HARIAN);
  renderMingguan();
  renderPerubahan();
  renderDebug();
}

/*****************************************************************
 * RENDER HARIAN
 *****************************************************************/
function renderHarian() {
  if (!DATA_HARIAN.length) {
    hargaHarian.innerHTML = "<em>Tidak ada data</em>";
    return;
  }

  let html = `<table class="table table-bordered table-sm">
    <thead><tr><th>Tanggal</th><th>Komoditas</th><th>Harga</th></tr></thead><tbody>`;

  DATA_HARIAN.forEach(d => {
    html += `<tr>
      <td>${d.tanggal}</td>
      <td>${d.nama_komoditas}</td>
      <td class="text-end">${formatRupiah(d.harga)}</td>
    </tr>`;
  });

  hargaHarian.innerHTML = html + "</tbody></table>";
}

/*****************************************************************
 * RENDER MINGGUAN
 *****************************************************************/
function renderMingguan() {
  const { mingguList, komoditasList, hasil } = DATA_KUMULATIF;

  let html = `<table class="table table-bordered table-sm">
    <thead><tr><th>Komoditas</th>`;

  mingguList.forEach(m => html += `<th>M${m}</th>`);
  html += `</tr></thead><tbody>`;

  komoditasList.forEach(k => {
    html += `<tr><td>${k}</td>`;
    mingguList.forEach(m => {
      html += `<td class="text-end">${formatRupiah(hasil[m][k])}</td>`;
    });
    html += `</tr>`;
  });

  iphMingguan.innerHTML = html + "</tbody></table>";
}

/*****************************************************************
 * RENDER % PERUBAHAN (VS BULAN LALU)
 *****************************************************************/
function renderPerubahan() {
  const { mingguList, komoditasList, hasil } = DATA_KUMULATIF;
  const baseWeek = mingguList[mingguList.length - 1];

  let html = `<table class="table table-bordered table-sm">
    <thead><tr><th>Komoditas</th>`;

  mingguList.forEach(m => html += `<th>M${m}</th>`);
  html += `</tr></thead><tbody>`;

  komoditasList.forEach(k => {
    html += `<tr><td>${k}</td>`;
    mingguList.forEach(m => {
      const base = hasil[baseWeek][k];
      const curr = hasil[m][k];
      if (!base || !curr) {
        html += "<td>-</td>";
      } else {
        const p = ((curr - base) / base * 100).toFixed(2);
        const cls = p > 0 ? "naik" : p < 0 ? "turun" : "stabil";
        html += `<td class="${cls}">${p}%</td>`;
      }
    });
    html += `</tr>`;
  });

  perubahanPersen.innerHTML = html + "</tbody></table>";
}

/*****************************************************************
 * DEBUG
 *****************************************************************/
function renderDebug() {
  debugKumulatif.textContent =
    JSON.stringify(DATA_KUMULATIF, null, 2);
}

/*****************************************************************
 * INIT
 *****************************************************************/
function initTahun() {
  const now = new Date().getFullYear();
  for (let y = now; y >= now - 5; y--) {
    filterTahun.innerHTML += `<option value="${y}">${y}</option>`;
  }
}

btnTampil.onclick = loadData;
initTahun();
