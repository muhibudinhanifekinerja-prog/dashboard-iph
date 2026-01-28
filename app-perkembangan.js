/*************************************************
 * KONFIGURASI SUPABASE
 *************************************************/
const SUPABASE_URL = "https://hkllhgmfbnepgtfnrxuj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbGxoZ21mYm5lcGd0Zm5yeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTA1NzQsImV4cCI6MjA4Mjc2NjU3NH0.Ft8giYKJIPPiGstRJXJNb_uuKQUuNlaAM8p2dE2UKs0";
const DEBUG_SUPABASE = true;
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

/*************************************************
 * LOAD FILTER
 *************************************************/
async function loadFilterTahun() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/v_tahun_data?select=tahun&order=tahun.desc`,
    { headers }
  );
  const data = await res.json();
  const el = document.getElementById('filterTahun');
  el.innerHTML = '';
  data.forEach(d => {
    el.innerHTML += `<option value="${d.tahun}">${d.tahun}</option>`;
  });
}

async function loadFilterKomoditas() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/komoditas?select=id_komoditas,nama_komoditas&order=nama_komoditas.asc`,
    { headers }
  );
  const data = await res.json();
  const el = document.getElementById('filterKomoditas');
  el.innerHTML = `<option value="">Semua Komoditas</option>`;
  data.forEach(d => {
    el.innerHTML += `<option value="${d.id_komoditas}">${d.nama_komoditas}</option>`;
  });
}

async function loadFilterPasar() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/pasar?select=id_pasar,nama_pasar&order=nama_pasar.asc`,
    { headers }
  );
  const data = await res.json();
  const el = document.getElementById('filterPasar');
  el.innerHTML = `<option value="">Semua Pasar</option>`;
  data.forEach(d => {
    el.innerHTML += `<option value="${d.id_pasar}">${d.nama_pasar}</option>`;
  });
}

/*************************************************
 * HARGA HARIAN
 *************************************************/
async function loadHargaHarian() {
  const bulan = filterBulan.value;
  const tahun = getSelectedTahun();

  const start = `${tahun}-${bulan.padStart(2, '0')}-01`;
  const end = new Date(tahun, bulan, 0).toISOString().slice(0, 10);

  const url =
    `${SUPABASE_URL}/rest/v1/v_harga_harian_lengkap`
    + `?tanggal=gte.${start}&tanggal=lte.${end}`
    + `&order=nama_komoditas.asc&order=nama_pasar.asc&order=tanggal.asc`;

  const res = await fetch(url, { headers });
  const data = await res.json();

  renderHargaHarian(data);
}

function renderHargaHarian(data) {
  const el = document.getElementById('hargaHarian');

  if (!data.length) {
    el.innerHTML = '<em>Tidak ada data</em>';
    return;
  }

  let html = `
    <table class="table table-bordered table-sm table-dashboard">
      <thead>
        <tr>
          <th>No</th>
          <th>Komoditas</th>
          <th>Pasar</th>
          <th>Tanggal</th>
          <th>Harga</th>
        </tr>
      </thead>
      <tbody>`;

  data.forEach((d, i) => {
    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${d.nama_komoditas}</td>
        <td>${d.nama_pasar}</td>
        <td>${d.tanggal}</td>
        <td class="text-end">${formatRupiah(d.harga)}</td>
      </tr>`;
  });

  html += '</tbody></table>';
  el.innerHTML = html;
}

/*************************************************
 * IPH MINGGUAN
 *************************************************/
async function loadIphMingguan() {
  const bulan = filterBulan.value;
  const tahun = getSelectedTahun();

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/v_iph_kumulatif?tahun=eq.${tahun}&bulan=eq.${bulan}`,
    { headers }
  );
  const data = await res.json();

  renderIphMingguan(data);
}

function renderIphMingguan(data) {
  const el = document.getElementById('iphMingguan');

  if (!data.length) {
    el.innerHTML = '<em>Tidak ada data</em>';
    return;
  }

  const maxM = Math.max(...data.map(d => d.minggu_ke));
  const grup = {};

  data.forEach(d => {
    if (!grup[d.nama_komoditas]) grup[d.nama_komoditas] = {};
    grup[d.nama_komoditas][d.minggu_ke] = d.iph_mingguan;
  });

  let html = `
    <table class="table table-bordered table-sm table-dashboard">
      <thead>
        <tr>
          <th>No</th>
          <th>Komoditas</th>`;

  for (let i = 1; i <= maxM; i++) html += `<th>M${i}</th>`;
  html += `</tr></thead><tbody>`;

  let no = 1;
  Object.keys(grup).forEach(k => {
    html += `<tr><td>${no++}</td><td>${k}</td>`;
    for (let i = 1; i <= maxM; i++) {
      html += `<td class="text-end">${formatRupiah(grup[k][i])}</td>`;
    }
    html += `</tr>`;
  });

  html += '</tbody></table>';
  el.innerHTML = html;
}

/*************************************************
 * PERUBAHAN MINGGUAN
 *************************************************/
async function loadPerubahanMingguan() {
  const bulan = filterBulan.value;
  const tahun = getSelectedTahun();

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/v_iph_perubahan_mingguan?tahun=eq.${tahun}&bulan=eq.${bulan}`,
    { headers }
  );
  const data = await res.json();

  renderPerubahanMingguan(data);
}

function renderPerubahanMingguan(data) {
  const el = document.getElementById('perubahanPersen');

  if (!data.length) {
    el.innerHTML = '<em>Tidak ada data</em>';
    return;
  }

  const minggu = [...new Set(data.map(d => d.minggu_ke))].sort((a, b) => a - b);
  const grup = {};

  data.forEach(d => {
    if (!grup[d.nama_komoditas]) grup[d.nama_komoditas] = {};
    grup[d.nama_komoditas][d.minggu_ke] = d.persen_perubahan;
  });

  let html = `
    <table class="table table-bordered table-sm table-dashboard">
      <thead>
        <tr>
          <th>Komoditas</th>`;

  minggu.forEach(m => html += `<th>M${m}</th>`);
  html += `</tr></thead><tbody>`;

  Object.keys(grup).forEach(k => {
    html += `<tr><td>${k}</td>`;
    minggu.forEach(m => {
      const v = grup[k][m];
      let cls = 'perubahan-stabil';
      let icon = '–';
      
      if (v > 0) {
        cls = 'perubahan-naik';
        icon = '▲';
      } else if (v < 0) {
        cls = 'perubahan-turun';
        icon = '▼';
      }
      html += `
        <td class="text-end ${cls}">
          <span class="perubahan-icon">${icon}</span>
          ${v !== undefined ? Math.round(v) + '%' : '-'}
        </td>`;
      
          });
          html += `</tr>`;
        });
  html += '</tbody></table>';
  el.innerHTML = html;
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

