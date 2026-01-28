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
  return 'Rp\u00A0' + Math.round(val).toLocaleString('id-ID');
}

function getSelectedTahun() {
  const el = document.getElementById('filterTahun');
  return el.value;
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
  const komoditas = filterKomoditas.value;
  const pasar = filterPasar.value;

  const start = `${tahun}-${bulan.padStart(2, '0')}-01`;
  const end = new Date(tahun, bulan, 0).toISOString().slice(0, 10);

  let url =
    `${SUPABASE_URL}/rest/v1/v_harga_harian_lengkap`
    + `?tanggal=gte.${start}&tanggal=lte.${end}`
    + `&order=nama_komoditas.asc&order=nama_pasar.asc&order=tanggal.asc`;

  if (komoditas) url += `&id_komoditas=eq.${komoditas}`;
  if (pasar) url += `&id_pasar=eq.${pasar}`;

  const res = await fetch(url, { headers });
  const data = await res.json();

  renderHargaHarian(data);
}
function renderHargaHarian(data) {
  const el = document.getElementById('hargaHarian');
  el.innerHTML = '';

  if (!data.length) {
    el.innerHTML = '<em>Tidak ada data</em>';
    return;
  }

  const tanggalList = [...new Set(data.map(d => d.tanggal))]
    .sort((a, b) => new Date(a) - new Date(b));

  const map = {};
  data.forEach(d => {
    const key = `${d.nama_komoditas}_${d.nama_pasar}`;
    if (!map[key]) {
      map[key] = { komoditas: d.nama_komoditas, pasar: d.nama_pasar, harga: {} };
    }
    map[key].harga[d.tanggal] = d.harga;
  });

  let html = `
  <div class="table-scroll">
  <table class="table table-bordered table-sm table-dashboard">
    <thead>
      <tr>
        <th>No</th>
        <th>Komoditas</th>
        <th>Pasar</th>`;

  tanggalList.forEach(t => html += `<th>${t.slice(5)}</th>`);
  html += `</tr></thead><tbody>`;

  let no = 1;
  Object.values(map).forEach(r => {
    html += `
      <tr>
        <td class="text-center">${no++}</td>
        <td>${r.komoditas}</td>
        <td>${r.pasar}</td>`;

    tanggalList.forEach(t => {
      html += `<td class="text-end">${formatRupiah(r.harga[t])}</td>`;
    });

    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  el.innerHTML = html;
}


/*************************************************
 * IPH MINGGUAN (KUMULATIF)
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
  el.innerHTML = '';

  if (!data.length) {
    el.innerHTML = '<em>Tidak ada data</em>';
    return;
  }

  const maxM = Math.max(...data.map(d => d.minggu_ke));
  const grp = {};

  data.forEach(d => {
    if (!grp[d.nama_komoditas]) grp[d.nama_komoditas] = {};
    grp[d.nama_komoditas][d.minggu_ke] = d.iph_mingguan;
  });

  let html = `
            <div class="table-scroll">
            <table class="table table-bordered table-sm table-dashboard">
            <thead><tr>
              <th>No</th>
              <th>Komoditas</th>`;
  for (let i = 1; i <= maxM; i++) html += `<th>M${i}</th>`;
  html += `</tr></thead><tbody>`;

  let no = 1;
  Object.keys(grp).forEach(k => {
    html += `<tr><td>${no++}</td><td>${k}</td>`;
    for (let i = 1; i <= maxM; i++) {
      html += `<td class="text-end">${formatRupiah(grp[k][i])}</td>`;
    }
    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  el.innerHTML = html;
}

/*************************************************
 * % PERUBAHAN MINGGUAN
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
  el.innerHTML = '';

  if (!data.length) {
    el.innerHTML = '<em>Tidak ada data</em>';
    return;
  }

  const mingguList = [...new Set(data.map(d => d.minggu_ke))].sort((a,b)=>a-b);
  const grp = {};

  data.forEach(d => {
    if (!grp[d.nama_komoditas]) grp[d.nama_komoditas] = {};
    grp[d.nama_komoditas][d.minggu_ke] = d.persen_perubahan;
  });

  let html = `
  <div class="table-scroll">
  <table class="table table-bordered table-sm table-dashboard">
    <thead>
      <tr>
        <th>Komoditas</th>`;

  mingguList.forEach(m => html += `<th>M${m}</th>`);
  html += `</tr></thead><tbody>`;

  Object.keys(grp).forEach(k => {
    html += `<tr><td>${k}</td>`;

    mingguList.forEach(m => {
      const v = grp[k][m];
      let cls = '';
      if (v > 0) cls = 'text-naik';
      else if (v < 0) cls = 'text-turun';

      html += `
        <td class="text-end ${cls}">
          ${v !== undefined ? Math.round(v) + '%' : '-'}
        </td>`;
    });

    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  el.innerHTML = html;
}

/*************************************************
 * INIT
 *************************************************/
document.getElementById('btnTampil').onclick = () => {
  loadHargaHarian();
  loadIphMingguan();
  loadPerubahanMingguan();
  console.log('loadPerubahanMingguan EXIST:', typeof loadPerubahanMingguan);
};

document.addEventListener('DOMContentLoaded', async () => {
  await loadFilterTahun();
  await loadFilterKomoditas();
  await loadFilterPasar();
});


