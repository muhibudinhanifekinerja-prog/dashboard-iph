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
  if (!val || val <= 0) return '-';
  return 'Rp ' + Number(val).toLocaleString('id-ID');
}

function formatIph(val) {
  return val !== null && val !== undefined ? Number(val).toFixed(2) : '-';
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
  const select = document.getElementById('filterTahun');

  select.innerHTML = '<option value="">Pilih Tahun</option>';

  data.forEach(d => {
    select.insertAdjacentHTML(
      'beforeend',
      `<option value="${d.tahun}">${d.tahun}</option>`
    );
  });

  // AUTO pilih tahun terbaru
  if (data.length > 0) {
    select.value = data[0].tahun;
  }
}
async function loadFilterKomoditas() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/komoditas?select=id_komoditas,nama_komoditas&order=nama_komoditas.asc`, { headers });
  const data = await res.json();

  const select = document.getElementById('filterKomoditas');
  select.innerHTML = `<option value="">Semua Komoditas</option>`;

  data.forEach(d => {
    select.insertAdjacentHTML('beforeend',
      `<option value="${d.id_komoditas}">${d.nama_komoditas}</option>`);
  });
}

async function loadFilterPasar() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/pasar?select=id_pasar,nama_pasar,kecamatan&order=nama_pasar.asc`, { headers });
  const data = await res.json();

  const select = document.getElementById('filterPasar');
  select.innerHTML = `<option value="">Semua Pasar</option>`;

  data.forEach(d => {
    select.insertAdjacentHTML('beforeend',
      `<option value="${d.id_pasar}">${d.nama_pasar} (${d.kecamatan})</option>`);
  });
}

/*************************************************
 * HARGA HARIAN
 *************************************************/
async function loadHargaHarian() {
  const komoditas = filterKomoditas.value;
  const pasar = filterPasar.value;
  const bulan = filterBulan.value;
  const tahun = filterTahun.value;

  const start = `${tahun}-${bulan.padStart(2,'0')}-01`;
  const end = new Date(tahun, bulan, 0).toISOString().slice(0,10);

  let url = `${SUPABASE_URL}/rest/v1/v_harga_harian_lengkap`
    + `?tanggal=gte.${start}&tanggal=lte.${end}`
    + `&order=nama_komoditas.asc&order=nama_pasar.asc&order=tanggal.asc`;

  if (komoditas) url += `&id_komoditas=eq.${komoditas}`;
  if (pasar) url += `&id_pasar=eq.${pasar}`;

  const res = await fetch(url, { headers });
  const data = await res.json();

  renderHargaHarian(data);
}
function formatTanggal(tgl) {
  const d = new Date(tgl);
  return d.toLocaleDateString('id-ID', { day:'2-digit', month:'short' });
}
function renderHargaHarian(data) {
  const container = document.getElementById('hargaHarian');
  container.innerHTML = '';

  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML = '<em>Tidak ada data</em>';
    return;
  }

  const tanggalList = [...new Set(data.map(d => d.tanggal))]
    .sort((a, b) => new Date(a) - new Date(b));

  const map = {};
  data.forEach(d => {
    const key = `${d.nama_komoditas}__${d.nama_pasar}`;
    if (!map[key]) {
      map[key] = {
        komoditas: d.nama_komoditas,
        pasar: d.nama_pasar,
        harga: {}
      };
    }
    map[key].harga[d.tanggal] = d.harga;
  });

  let html = `
  <div class="table-scroll-both">
  <table class="table table-bordered table-sm table-harga-harian">
    <thead>
      <tr>
        <th>No</th>
        <th>Komoditas</th>
        <th>Pasar</th>`;

  tanggalList.forEach(tgl => {
    html += `<th>${tgl.slice(5)}</th>`;
  });

  html += `</tr></thead><tbody>`;

  let no = 1;
  Object.values(map).forEach(row => {
    html += `
      <tr>
        <td>${no++}</td>
        <td>${row.komoditas}</td>
        <td>${row.pasar}</td>`;

    tanggalList.forEach(tgl => {
      const val = row.harga[tgl];
      html += `<td class="text-end">${val ? 'Rp ' + val.toLocaleString('id-ID') : '-'}</td>`;
    });

    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}


/*************************************************
 * IPH & PERUBAHAN
 *************************************************/
async function loadIphMingguan() {
  const bulan = filterBulan.value;
  const tahun = filterTahun.value;
  const komoditas = filterKomoditas.value;

  let url = `${SUPABASE_URL}/rest/v1/v_iph_kumulatif?tahun=eq.${tahun}&bulan=eq.${bulan}`;
  if (komoditas) url += `&id_komoditas=eq.${komoditas}`;

  const res = await fetch(url, { headers });
  const data = await res.json();

  renderIph(data);
}

function renderIph(data) {
  const el = document.getElementById('iphMingguan');
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

  let html = `<div class="table-scroll-both"><table class="table table-sm table-bordered"><thead><tr>
    <th>No</th><th>Komoditas</th>`;
  for (let i=1;i<=maxM;i++) html += `<th>M${i}</th>`;
  html += '</tr></thead><tbody>';

  let no=1;
  Object.keys(grp).forEach(k => {
    html += `<tr><td>${no++}</td><td>${k}</td>`;
    for (let i=1;i<=maxM;i++) html += `<td>${formatIph(grp[k][i])}</td>`;
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  el.innerHTML = html;
}

async function loadPerubahanMingguan() {
  const bulan = filterBulan.value;
  const tahun = filterTahun.value;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/v_iph_perubahan_mingguan?tahun=eq.${tahun}&bulan=eq.${bulan}`,
    { headers }
  );

  const data = await res.json();
  const el = document.getElementById('perubahanPersen');

  if (!data.length) {
    el.innerHTML = '<em>Tidak ada data</em>';
    return;
  }

  let html = `<table class="table table-sm table-bordered"><thead>
    <tr><th>Komoditas</th><th>Minggu</th><th>%</th></tr>
    </thead><tbody>`;

  data.forEach(d => {
    const cls = d.persen_perubahan > 0 ? 'text-danger' :
                d.persen_perubahan < 0 ? 'text-success' : '';
    html += `<tr>
      <td>${d.nama_komoditas}</td>
      <td>M${d.minggu_ke}</td>
      <td class="${cls}">${d.persen_perubahan ?? '-'}%</td>
    </tr>`;
  });

  html += '</tbody></table>';
  el.innerHTML = html;
}
function getSelectedTahun() {
  let tahun = document.getElementById('filterTahun').value;

  if (!tahun) {
    const opt = document.getElementById('filterTahun').options;
    if (opt.length > 1) {
      tahun = opt[1].value; // tahun pertama setelah "Pilih Tahun"
      document.getElementById('filterTahun').value = tahun;
    }
  }

  return tahun;
}
function renderPerubahanMingguan(data) {
  const container = document.getElementById('perubahanPersen');

  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML = '<em>Tidak ada data</em>';
    return;
  }

  // ambil minggu unik
  const mingguList = [...new Set(data.map(d => d.minggu_ke))]
    .sort((a, b) => a - b);

  // pivot per komoditas
  const map = {};
  data.forEach(d => {
    if (!map[d.nama_komoditas]) {
      map[d.nama_komoditas] = {};
    }
    map[d.nama_komoditas][d.minggu_ke] = d.persen_perubahan;
  });

  let html = `
    <div class="table-scroll-both">
    <table class="table table-bordered table-sm align-middle">
      <thead>
        <tr>
          <th class="sticky-col">Komoditas</th>`;

  mingguList.forEach(m => {
    html += `<th class="text-center">M${m}</th>`;
  });

  html += `</tr></thead><tbody>`;

  Object.keys(map).forEach(komoditas => {
    html += `<tr>
      <td class="sticky-col">${komoditas}</td>`;

    mingguList.forEach(m => {
      const val = map[komoditas][m];
      let cls = '';

      if (val > 0) cls = 'text-danger';
      if (val < 0) cls = 'text-success';

      html += `
        <td class="text-end ${cls}">
          ${val !== undefined ? val.toFixed(2) + '%' : '-'}
        </td>`;
    });

    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}
async function loadPerubahanMingguan() {
  const bulan = filterBulan.value;
  const tahun = getSelectedTahun();

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/v_iph_perubahan_mingguan?tahun=eq.${tahun}&bulan=eq.${bulan}`,
    { headers }
  );

  const data = await res.json();

  // 🔥 INI PENTING
  renderPerubahanMingguan(data);
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









