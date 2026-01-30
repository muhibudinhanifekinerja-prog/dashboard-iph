/*************************************************
 * KONFIGURASI SUPABASE
 *************************************************/
const SUPABASE_URL = "https://hkllhgmfbnepgtfnrxuj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbGxoZ21mYm5lcGd0Zm5yeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTA1NzQsImV4cCI6MjA4Mjc2NjU3NH0.Ft8giYKJIPPiGstRJXJNb_uuKQUuNlaAM8p2dE2UKs0";
const DEBUG_SUPABASE = true;
const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`
};

/* ===============================
   HELPER
================================ */
async function fetchJSON(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error('Gagal fetch Supabase');
  return res.json();
}

function qs(id) {
  return document.getElementById(id);
}

function rupiah(v) {
  if (v === null || v === undefined) return '-';
  return 'Rp ' + Number(v).toLocaleString('id-ID');
}

/* ===============================
   FILTER
================================ */
function getFilter() {
  return {
    komoditas: qs('filterKomoditas').value,
    pasar: qs('filterPasar').value,
    tahun: qs('filterTahun').value,
  };
}

function buildFilterQuery(filter) {
  let q = `tahun=eq.${filter.tahun}`;
  if (filter.komoditas && filter.komoditas !== 'Semua Komoditas') {
    q += `&nama_komoditas=eq.${encodeURIComponent(filter.komoditas)}`;
  }
  if (filter.pasar && filter.pasar !== 'Semua Pasar') {
    q += `&nama_pasar=eq.${encodeURIComponent(filter.pasar)}`;
  }
  return q;
}

/* ===============================
   A. INFLASI
================================ */
async function renderInflasi(tahun) {
  const url =
    `${SUPABASE_URL}/rest/v1/v_inflasi_tahunan?` +
    `tahun=eq.${tahun}&level_wilayah=eq.nasional`;

  const data = await fetchJSON(url);
  if (!data.length) return;

  qs('labelTahunInflasi').innerText = tahun;
  qs('inflasiYoY').innerText = data[0].inflasi_yoy?.toFixed(2) + '%';
  qs('inflasiMtM').innerText = data[0].inflasi_mtm?.toFixed(2) + '%';
  qs('inflasiYtD').innerText = data[0].inflasi_ytd?.toFixed(2) + '%';
}

/* ===============================
   B. PERKEMBANGAN HARGA (LEVEL)
================================ */
async function renderHargaLevel(filter) {
  const q = buildFilterQuery(filter);
  const url = `${SUPABASE_URL}/rest/v1/v_harga_level_tahunan?${q}`;
  const data = await fetchJSON(url);

  const tbody = qs('tblPerkembanganHarga');
  tbody.innerHTML = '';

  data.forEach((r, i) => {
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${i + 1}</td>
        <td>${r.nama_komoditas}</td>
        <td>${rupiah(r.harga_awal_tahun)}</td>
        <td>${rupiah(r.harga_akhir_tahun)}</td>
        <td>${rupiah(r.rata_tahun)}</td>
      </tr>
    `);
  });
}

/* ===============================
   C. RATA-RATA MINGGUAN (DINAMIS)
================================ */
async function renderRataMingguan(filter) {
  const q = buildFilterQuery(filter);
  const url = `${SUPABASE_URL}/rest/v1/v_rata_mingguan_tahunan?${q}`;
  const data = await fetchJSON(url);

  if (!data.length) return;

  // susun struktur: bulan -> minggu
  const weeks = [...new Set(data.map(d => `${d.bulan}-${d.minggu_ke}`))]
    .sort((a, b) => {
      const [ba, wa] = a.split('-').map(Number);
      const [bb, wb] = b.split('-').map(Number);
      return ba !== bb ? ba - bb : wa - wb;
    });

  // HEADER
  qs('theadMingguan').innerHTML = `
    <tr>
      <th>No</th>
      <th>Komoditas</th>
      ${weeks.map(w => `<th>${w}</th>`).join('')}
    </tr>
  `;

  // MAP DATA
  const map = {};
  data.forEach(d => {
    map[d.nama_komoditas] ??= {};
    map[d.nama_komoditas][`${d.bulan}-${d.minggu_ke}`] = d.rata_mingguan;
  });

  // BODY
  const tbody = qs('tblRataMingguan');
  tbody.innerHTML = '';

  Object.entries(map).forEach(([komoditas, vals], i) => {
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${i + 1}</td>
        <td>${komoditas}</td>
        ${weeks.map(w => `<td>${rupiah(vals[w])}</td>`).join('')}
      </tr>
    `);
  });
}

/* ===============================
   D. % PERUBAHAN MINGGUAN
================================ */
async function renderPerubahan(filter) {
  const q = buildFilterQuery(filter);
  const url = `${SUPABASE_URL}/rest/v1/v_perubahan_mingguan_tahunan?${q}`;
  const data = await fetchJSON(url);

  if (!data.length) return;

  const weeks = [...new Set(data.map(d => `${d.bulan}-${d.minggu_ke}`))]
    .sort((a, b) => {
      const [ba, wa] = a.split('-').map(Number);
      const [bb, wb] = b.split('-').map(Number);
      return ba !== bb ? ba - bb : wa - wb;
    });

  qs('theadPerubahan').innerHTML = `
    <tr>
      <th>Komoditas</th>
      ${weeks.map(w => `<th>${w}</th>`).join('')}
    </tr>
  `;

  const map = {};
  data.forEach(d => {
    map[d.nama_komoditas] ??= {};
    map[d.nama_komoditas][`${d.bulan}-${d.minggu_ke}`] = d.persen_perubahan;
  });

  const tbody = qs('tblPerubahanHarga');
  tbody.innerHTML = '';

  Object.entries(map).forEach(([komoditas, vals]) => {
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${komoditas}</td>
        ${weeks.map(w => {
          const v = vals[w];
          return `<td>${v === null || v === undefined ? '-' : v + '%'}</td>`;
        }).join('')}
      </tr>
    `);
  });
}

/* ===============================
   TRIGGER UTAMA
================================ */
qs('btnTampilkan').addEventListener('click', async () => {
  const filter = getFilter();

  await renderInflasi(filter.tahun);
  await renderHargaLevel(filter);
  await renderRataMingguan(filter);
  await renderPerubahan(filter);
});
