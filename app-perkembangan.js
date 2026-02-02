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
 * HELPER
 ************************************************************/
function formatRupiah(val) {
  if (val === null || val === undefined || isNaN(val)) return "-";
  return "Rp " + Math.round(val).toLocaleString("id-ID");
}

function formatPersen(val) {
  if (val === null || isNaN(val)) return "-";
  return val.toFixed(2) + "%";
}

function getCheckedValues(containerId) {
  return Array.from(
    document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`)
  ).map(el => el.value);
}

/************************************************************
 * LOGIKA MINGGU (ATURAN IPH)
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
 * HITUNG RATA-RATA MINGGUAN KUMULATIF
 ************************************************************/
function hitungMingguanKumulatif(data) {
  const mingguMap = {};
  const komoditasSet = new Set();

  data.forEach(d => {
    const m = mingguKeLaporan(d.tanggal);
    mingguMap[m] ??= {};
    mingguMap[m][d.nama_komoditas] ??= [];
    mingguMap[m][d.nama_komoditas].push(d.harga);
    komoditasSet.add(d.nama_komoditas);
  });

  const mingguList = Object.keys(mingguMap).map(Number).sort((a, b) => a - b);
  const komoditasList = [...komoditasSet].sort();

  const kumulatif = {};
  komoditasList.forEach(k => (kumulatif[k] = []));

  const hasil = {};
  mingguList.forEach(m => {
    hasil[m] = {};
    komoditasList.forEach(k => {
      if (mingguMap[m][k]) kumulatif[k].push(...mingguMap[m][k]);
      const arr = kumulatif[k];
      hasil[m][k] = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    });
  });

  return { mingguList, komoditasList, hasil };
}

/************************************************************
 * PERUBAHAN VS BULAN LALU
 ************************************************************/
function hitungPerubahanMingguanVsBulanLalu(bulanIni, bulanLalu) {
  const mingguAkhir = Math.max(...bulanLalu.mingguList);
  const baseline = {};

  bulanIni.komoditasList.forEach(k => {
    baseline[k] = bulanLalu.hasil[mingguAkhir]?.[k] ?? null;
  });

  const perubahan = {};
  bulanIni.mingguList.forEach(m => {
    perubahan[m] = {};
    bulanIni.komoditasList.forEach(k => {
      const base = baseline[k];
      const curr = bulanIni.hasil[m][k];
      perubahan[m][k] =
        base && curr ? ((curr - base) / base) * 100 : null;
    });
  });

  return {
    mingguList: bulanIni.mingguList,
    komoditasList: bulanIni.komoditasList,
    perubahan
  };
}

/************************************************************
 * FETCH DATA HARGA HARIAN
 ************************************************************/
async function fetchHargaHarian(tahun, bulan, komoditas, pasar) {
  const start = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
  const end = new Date(tahun, bulan, 0).toISOString().slice(0, 10);

  let url =
    `${SUPABASE_URL}/rest/v1/v_harga_harian_lengkap` +
    `?tanggal=gte.${start}&tanggal=lte.${end}`;

  if (komoditas.length) url += `&id_komoditas=in.(${komoditas.join(",")})`;
  if (pasar.length) url += `&id_pasar=in.(${pasar.join(",")})`;

  const res = await fetch(url, { headers });
  return await res.json();
}

/************************************************************
 * RENDER IPH MINGGUAN
 ************************************************************/
function renderIphMingguan(data) {
  const el = document.getElementById("iphMingguan");
  const { mingguList, komoditasList, hasil } =
    hitungMingguanKumulatif(data);

  let html =
    `<table class="table table-bordered table-sm">
      <thead>
        <tr>
          <th>Komoditas</th>`;

  mingguList.forEach(m => (html += `<th>M${m}</th>`));
  html += `</tr></thead><tbody>`;

  komoditasList.forEach(k => {
    html += `<tr><td>${k}</td>`;
    mingguList.forEach(m => {
      const v = hasil[m][k];
      html += `<td class="text-end">${v ? formatRupiah(v) : "-"}</td>`;
    });
    html += `</tr>`;
  });

  el.innerHTML = html + "</tbody></table>";
}

/************************************************************
 * RENDER % PERUBAHAN MINGGUAN
 ************************************************************/
function renderPerubahanMingguan(data) {
  const el = document.getElementById("perubahanPersen");

  let html =
    `<table class="table table-bordered table-sm">
      <thead>
        <tr>
          <th>Komoditas</th>`;

  data.mingguList.forEach(m => (html += `<th>M${m}</th>`));
  html += `</tr></thead><tbody>`;

  data.komoditasList.forEach(k => {
    html += `<tr><td>${k}</td>`;
    data.mingguList.forEach(m => {
      const v = data.perubahan[m][k];
      let cls = "iph-stabil";
      if (v > 0) cls = "iph-naik";
      if (v < 0) cls = "iph-turun";
      html += `<td class="text-end ${cls}">${formatPersen(v)}</td>`;
    });
    html += `</tr>`;
  });

  el.innerHTML = html + "</tbody></table>";
}

/************************************************************
 * MAIN LOAD
 ************************************************************/
async function loadIphMingguan() {
  const tahun = Number(filterTahun.value);
  const bulan = Number(filterBulan.value);
  const komoditas = getCheckedValues("filterKomoditasList");
  const pasar = getCheckedValues("filterPasarList");

  const dataBulanIni = await fetchHargaHarian(
    tahun,
    bulan,
    komoditas,
    pasar
  );
  const kumulatifIni = hitungMingguanKumulatif(dataBulanIni);

  const bulanLalu = bulan === 1 ? 12 : bulan - 1;
  const tahunLalu = bulan === 1 ? tahun - 1 : tahun;

  const dataBulanLalu = await fetchHargaHarian(
    tahunLalu,
    bulanLalu,
    komoditas,
    pasar
  );
  const kumulatifLalu = hitungMingguanKumulatif(dataBulanLalu);

  const perubahan =
    hitungPerubahanMingguanVsBulanLalu(kumulatifIni, kumulatifLalu);

  renderIphMingguan(dataBulanIni);
  renderPerubahanMingguan(perubahan);
}

/************************************************************
 * EVENT
 ************************************************************/
document.getElementById("btnTampil").onclick = loadIphMingguan;
