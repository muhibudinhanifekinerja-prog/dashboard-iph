/*************************************************
 * KONFIGURASI SUPABASE
 *************************************************/
const SUPABASE_URL = "https://hkllhgmfbnepgtfnrxuj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbGxoZ21mYm5lcGd0Zm5yeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTA1NzQsImV4cCI6MjA4Mjc2NjU3NH0.Ft8giYKJIPPiGstRJXJNb_uuKQUuNlaAM8p2dE2UKs0";
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`
};

/*************************************************
 * HELPER
 *************************************************/
function formatRupiah(val) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return 'Rp ' + Math.round(val).toLocaleString('id-ID');
}
function getSelectedTahun() {
  return document.getElementById('filterTahun').value;
}
function getCheckedValues(containerId) {
  return Array.from(
    document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`)
  ).map(cb => cb.value);
}

/*************************************************
 * FILTER
 *************************************************/
async function loadFilterTahun() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/v_tahun_data?select=tahun&order=tahun.desc`,
    { headers }
  );
  const data = await res.json();
  const el = document.getElementById('filterTahun');
  el.innerHTML = '';
  data.forEach(d => el.innerHTML += `<option value="${d.tahun}">${d.tahun}</option>`);
}

async function loadFilterKomoditas() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/komoditas?select=id_komoditas,nama_komoditas&order=nama_komoditas.asc`,
    { headers }
  );
  const data = await res.json();
  const el = document.getElementById('filterKomoditasList');
  el.innerHTML = '';
  data.forEach(d => {
    el.innerHTML += `
      <li><label>
        <input type="checkbox" value="${d.id_komoditas}"> ${d.nama_komoditas}
      </label></li>`;
  });
}

async function loadFilterPasar() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/pasar?select=id_pasar,nama_pasar&order=nama_pasar.asc`,
    { headers }
  );
  const data = await res.json();
  const el = document.getElementById('filterPasarList');
  el.innerHTML = '';
  data.forEach(d => {
    el.innerHTML += `
      <li><label>
        <input type="checkbox" value="${d.id_pasar}"> ${d.nama_pasar}
      </label></li>`;
  });
}

/*************************************************
 * HARGA HARIAN
 *************************************************/
async function loadHargaHarian() {
  const bulan = document.getElementById('filterBulan').value;
  const tahun = getSelectedTahun();

  const start = `${tahun}-${bulan.padStart(2, '0')}-01`;
  const end = new Date(tahun, bulan, 0).toISOString().slice(0, 10);

  const url =
    `${SUPABASE_URL}/rest/v1/v_harga_harian_lengkap`
    + `?tanggal=gte.${start}`
    + `&tanggal=lte.${end}`
    + `&order=nama_komoditas.asc`
    + `&order=nama_pasar.asc`
    + `&order=tanggal.asc`;

  const res = await fetch(url, { headers });
  renderHargaHarian(await res.json());
}

function renderHargaHarian(data) {
  const el = document.getElementById('hargaHarian');
  if (!data.length) return el.innerHTML = '<em>Tidak ada data</em>';

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
      html += `<td class="text-end">${r.h[t] ? formatRupiah(r.h[t]) : '-'}</td>`
    );
    html += `</tr>`;
  });

  el.innerHTML = html + `</tbody></table>`;
}

/*************************************************
 * LOGIKA MINGGU (JS – FINAL)
 *************************************************/
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

  const diffDays = Math.floor((d - nextMonday) / (1000 * 60 * 60 * 24));
  return Math.min(2 + Math.floor(diffDays / 7), 5);
}
/*************************************************
 * IPH MINGGUAN (SQL + JS)
 *************************************************/
async function loadIphMingguan() {
  const bulan = document.getElementById('filterBulan').value;
  const tahun = document.getElementById('filterTahun').value;

  const url =
    `${SUPABASE_URL}/rest/v1/v_iph_harian_bersih`
    + `?tahun=eq.${tahun}`
    + `&bulan=eq.${bulan}`
    + `&order=nama_komoditas.asc`
    + `&order=tanggal.asc`;

  const res = await fetch(url, { headers });
  renderIphMingguan(await res.json());
}
function renderIphMingguan(data) {
  const el = document.getElementById('iphMingguan');
  if (!data.length) {
    el.innerHTML = '<em>Tidak ada data</em>';
    return;
  }

  const cutoff = {}; // tanggal terakhir per minggu
  const bucket = {}; // { komoditas: { minggu: [harga] } }
  let maxM = 0;

  // tentukan cutoff tanggal tiap minggu
  data.forEach(r => {
    const m = mingguKeLaporan(r.tanggal);
    maxM = Math.max(maxM, m);
    if (!cutoff[m] || new Date(r.tanggal) > new Date(cutoff[m])) {
      cutoff[m] = r.tanggal;
    }
  });

  // kumpulkan harga sampai cutoff minggu
  data.forEach(r => {
    const m = mingguKeLaporan(r.tanggal);
    if (new Date(r.tanggal) <= new Date(cutoff[m])) {
      if (!bucket[r.nama_komoditas]) bucket[r.nama_komoditas] = {};
      if (!bucket[r.nama_komoditas][m]) bucket[r.nama_komoditas][m] = [];
      bucket[r.nama_komoditas][m].push(r.harga);
    }
  });

  // render tabel
  let html = `<table class="table table-bordered table-sm table-dashboard">
    <thead><tr><th>Komoditas</th>`;
  for (let i = 1; i <= maxM; i++) html += `<th>M${i}</th>`;
  html += `</tr></thead><tbody>`;

  Object.keys(bucket).forEach(k => {
    html += `<tr><td>${k}</td>`;
    for (let i = 1; i <= maxM; i++) {
      const arr = bucket[k][i] || [];
      const avg = arr.length
        ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
        : null;
      html += `<td class="text-end">${avg ? formatRupiah(avg) : '-'}</td>`;
    }
    html += `</tr>`;
  });

  el.innerHTML = html + `</tbody></table>`;
}
/*************************************************
 * PERUBAHAN MINGGUAN (%)
 * (tetap, tidak diubah)
 *************************************************/
async function loadPerubahanMingguan() {
  const bulan = document.getElementById('filterBulan').value;
  const tahun = getSelectedTahun();

  const url =
    `${SUPABASE_URL}/rest/v1/v_iph_perubahan_mingguan`
    + `?tahun=eq.${tahun}&bulan=eq.${bulan}`
    + `&order=nama_komoditas.asc&order=minggu_ke.asc`;

  renderPerubahanMingguan(await (await fetch(url, { headers })).json());
}

function renderPerubahanMingguan(data) {
  const el = document.getElementById('perubahanPersen');
  if (!data.length) return el.innerHTML = '<em>Tidak ada data</em>';

  const minggu = [...new Set(data.map(d => d.minggu_ke))];
  const grup = {};
  data.forEach(d => {
    if (!grup[d.nama_komoditas]) grup[d.nama_komoditas] = {};
    grup[d.nama_komoditas][d.minggu_ke] = d.persen_perubahan;
  });

  let html = `<table class="table table-bordered table-sm table-dashboard">
  <thead><tr><th>Komoditas</th>`;
  minggu.forEach(m => html += `<th>M${m}</th>`);
  html += `</tr></thead><tbody>`;

  Object.keys(grup).forEach(k => {
    html += `<tr><td>${k}</td>`;
    minggu.forEach(m => {
      const v = grup[k][m];
      const cls = v > 0 ? 'perubahan-naik' : v < 0 ? 'perubahan-turun' : '';
      html += `<td class="text-end ${cls}">${v != null ? v.toFixed(2)+' %' : '-'}</td>`;
    });
    html += `</tr>`;
  });

  el.innerHTML = html + `</tbody></table>`;
}

/*************************************************
 * INIT
 *************************************************/
document.getElementById('btnTampil').onclick = () => {
  loadHargaHarian();
  loadIphMingguan();
  loadPerubahanMingguan();
};

document.addEventListener('DOMContentLoaded', async () => {
  await loadFilterTahun();
  await loadFilterKomoditas();
  await loadFilterPasar();
});


