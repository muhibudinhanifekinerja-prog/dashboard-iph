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
function getCheckedValues(containerId) {
  return Array.from(
    document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`)
  ).map(cb => cb.value);
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
  const el = document.getElementById('filterKomoditasList');

  el.innerHTML = '';
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
  const el = document.getElementById('filterPasarList');

  el.innerHTML = '';
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
/*************************************************
 * HARGA HARIAN
 *************************************************/
async function loadHargaHarian() {
  const bulan = document.getElementById('filterBulan').value;
  const tahun = getSelectedTahun();

  const komoditasArr = getCheckedValues('filterKomoditasList');
  const pasarArr = getCheckedValues('filterPasarList');

  const start = `${tahun}-${bulan.padStart(2, '0')}-01`;
  const end = new Date(tahun, bulan, 0).toISOString().slice(0, 10);

  // ⚠️ HARUS let
  let url =
    `${SUPABASE_URL}/rest/v1/v_harga_harian_lengkap`
    + `?tanggal=gte.${start}`
    + `&tanggal=lte.${end}`
    + `&order=nama_komoditas.asc`
    + `&order=nama_pasar.asc`
    + `&order=tanggal.asc`;

  // filter komoditas multiple
  if (komoditasArr.length > 0) {
    url += `&id_komoditas=in.(${komoditasArr.join(',')})`;
  }

  // filter pasar multiple
  if (pasarArr.length > 0) {
    url += `&id_pasar=in.(${pasarArr.join(',')})`;
  }

  console.log('QUERY SUPABASE:', url);

  const res = await fetch(url, { headers });
  const data = await res.json();

  renderHargaHarian(data);
}
function renderHargaHarian(data) {
  const el = document.getElementById('hargaHarian');

  if (!data || !data.length) {
    el.innerHTML = '<em>Tidak ada data</em>';
    return;
  }

  // ===============================
  // Ambil daftar tanggal unik
  // ===============================
  const tanggalList = [...new Set(data.map(d => d.tanggal))]
    .sort((a, b) => a.localeCompare(b));

  // ===============================
  // Group: Komoditas + Pasar
  // ===============================
  const grup = {};

  data.forEach(d => {
    const key = `${d.nama_komoditas}||${d.nama_pasar}`;
    if (!grup[key]) {
      grup[key] = {
        komoditas: d.nama_komoditas,
        pasar: d.nama_pasar,
        harga: {}
      };
    }
    grup[key].harga[d.tanggal] = d.harga;
  });

  // ===============================
  // Build tabel
  // ===============================
  let html = `
    <table class="table table-bordered table-sm table-dashboard">
      <thead>
        <tr>
          <th>No</th>
          <th>Komoditas</th>
          <th>Pasar</th>`;

  tanggalList.forEach(tgl => {
    html += `<th>${tgl}</th>`;
  });

  html += `</tr></thead><tbody>`;

  let no = 1;
  Object.values(grup).forEach(row => {
    html += `
      <tr>
        <td>${no++}</td>
        <td>${row.komoditas}</td>
        <td>${row.pasar}</td>`;

    tanggalList.forEach(tgl => {
      const harga = row.harga[tgl];
      html += `
        <td class="text-end">
          ${harga !== undefined ? formatRupiah(harga) : '-'}
        </td>`;
    });

    html += `</tr>`;
  });

  html += `</tbody></table>`;
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
      let cls = v > 0 ? 'perubahan-naik' : v < 0 ? 'perubahan-turun' : '';
      html += `<td class="text-end ${cls}">${v !== undefined ? Math.round(v) + '%' : '-'}</td>`;
    });
    html += `</tr>`;
  });

  html += '</tbody></table>';
  el.innerHTML = html;
}
/*************************************************
 * IPH MINGGUAN (KUMULATIF)
 *************************************************/
async function loadIphMingguan() {
  const bulan = document.getElementById('filterBulan').value;
  const tahun = getSelectedTahun();

  let url =
    `${SUPABASE_URL}/rest/v1/v_iph_kumulatif`
    + `?tahun=eq.${tahun}`
    + `&bulan=eq.${bulan}`
    + `&order=nama_komoditas.asc`
    + `&order=minggu_ke.asc`;

  console.log('QUERY IPH:', url);

  const res = await fetch(url, { headers });
  const data = await res.json();

  renderIphMingguan(data);
}
function renderIphMingguan(data) {
  const el = document.getElementById('iphMingguan');

  if (!data || data.length === 0) {
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

  for (let i = 1; i <= maxM; i++) {
    html += `<th>M${i}</th>`;
  }

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
 * INIT
 *************************************************/
document.getElementById('btnTampil').onclick = () => {
  loadHargaHarian();

  if (typeof loadIphMingguan === 'function') {
    loadIphMingguan();
  }

  if (typeof loadPerubahanMingguan === 'function') {
    loadPerubahanMingguan();
  }
};
document.addEventListener('DOMContentLoaded', async () => {
  await loadFilterTahun();
  await loadFilterKomoditas();
  await loadFilterPasar();
});




