/*************************************************
 * KONFIGURASI SUPABASE
 *************************************************/
const SUPABASE_URL = "https://hkllhgmfbnepgtfnrxuj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbGxoZ21mYm5lcGd0Zm5yeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTA1NzQsImV4cCI6MjA4Mjc2NjU3NH0.Ft8giYKJIPPiGstRJXJNb_uuKQUuNlaAM8p2dE2UKs0";
const DEBUG_SUPABASE = true;
// ================================
// SUPABASE HEADERS (WAJIB GLOBAL)
// ================================
const supabaseHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};
async function initFilterTahun() {
  try {
    const selectTahun = document.getElementById('filterTahun');
    if (!selectTahun) return;

    const url = `${SUPABASE_URL}/rest/v1/v_iph_kumulatif`
      + `?select=tahun&order=tahun.desc`;

    const res = await fetch(url, { headers: supabaseHeaders });
    const data = await res.json();

    const tahunUnik = [...new Set(data.map(d => d.tahun))];

    selectTahun.innerHTML = '<option value="">Pilih Tahun</option>';

    tahunUnik.forEach(tahun => {
      selectTahun.insertAdjacentHTML(
        'beforeend',
        `<option value="${tahun}">${tahun}</option>`
      );
    });

    // 🔑 AUTO PILIH TAHUN TERBARU
    if (tahunUnik.length > 0) {
      selectTahun.value = tahunUnik[0];
    }

  } catch (e) {
    console.error('initFilterTahun error', e);
  }
}

/*************************************************
 * HELPER
 *************************************************/
function getJumlahHari(bulan, tahun) {
  return new Date(tahun, bulan, 0).getDate();
}
function formatRupiah(val) {
  if (val === null || val === undefined) return '-';
  return 'Rp ' + Number(val).toLocaleString('id-ID');
}
function renderTabelHargaHarian(data) {
  const container = document.getElementById('hargaHarian');
  container.innerHTML = '';

  if (!Array.isArray(data)) {
    container.innerHTML =
      '<div class="text-danger">Data harga harian tidak valid</div>';
    return;
  }

  if (data.length === 0) {
    container.innerHTML =
      '<div class="text-muted">Tidak ada data</div>';
    return;
  }

  // Ambil tanggal unik (yyyy-mm-dd)
  const tanggalList = [...new Set(data.map(d => d.tanggal))].sort();

  // Group komoditas + pasar
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
  <table class="table table-bordered table-sm align-middle">
    <thead>
      <tr>
        <th class="sticky-col">No</th>
        <th class="sticky-col">Komoditas</th>
        <th class="sticky-col">Pasar</th>`;

  tanggalList.forEach(tgl => {
    html += `<th class="text-center">${tgl}</th>`;
  });

  html += `</tr></thead><tbody>`;

  let no = 1;
  Object.values(map).forEach(row => {
    html += `
      <tr>
        <td class="sticky-col text-center">${no++}</td>
        <td class="sticky-col">${row.komoditas}</td>
        <td class="sticky-col">${row.pasar}</td>`;

    tanggalList.forEach(tgl => {
      const val = row.harga[tgl];
      html += `
        <td class="text-end">
          ${val && val > 0 ? formatRupiah(val) : '-'}
        </td>`;
    });

    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}
function renderPerubahanIph(data) {
  const container = document.getElementById('tabelPerubahanIph');
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = '<em>Tidak ada data perubahan</em>';
    return;
  }

  let html = `<table class="table table-sm table-bordered">
    <thead>
      <tr>
        <th>Komoditas</th>
        <th>Minggu</th>
        <th>% Perubahan</th>
      </tr>
    </thead><tbody>`;

  data.forEach(row => {
    let warna = '';
    if (row.persen_perubahan > 0) warna = 'text-danger';
    if (row.persen_perubahan < 0) warna = 'text-success';

    html += `
      <tr>
        <td>${row.nama_komoditas}</td>
        <td>M${row.minggu_ke}</td>
        <td class="${warna}">
          ${row.persen_perubahan !== null
            ? row.persen_perubahan + ' %'
            : '-'}
        </td>
      </tr>`;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function loadPerubahanMingguan() {
  const komoditasId = document.getElementById('filterKomoditas').value;
  const bulan = document.getElementById('filterBulan').value;
  const tahun = document.getElementById('filterTahun').value;

  let url = `${SUPABASE_URL}/rest/v1/v_iph_perubahan_mingguan`
          + `?tahun=eq.${tahun}&bulan=eq.${bulan}`;

  // 🔑 FILTER KOMODITAS
  if (komoditasId && komoditasId !== 'all') {
    url += `&id_komoditas=eq.${komoditasId}`;
  }

  fetch(url, {
    headers: supabaseHeaders
  })
  .then(res => res.json())
  .then(data => renderPerubahanIph(data))
  .catch(err => {
    console.error('Gagal load perubahan IPH', err);
  });
}

function setJudulPerubahan() {
  const bulan = document.getElementById('filterBulan').value;
  const tahun = document.getElementById('filterTahun').value;

  const namaBulan = [
    'Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'
  ];

  let teks = '% Perubahan Mingguan';

  if (bulan && tahun) {
    teks = `% Perubahan Mingguan Bulan ${namaBulan[bulan - 1]} ${tahun}
            (dibandingkan rata-rata bulan sebelumnya)`;
  }

  document.getElementById('judulPerubahan').innerText = teks;
}

async function loadIphMingguan() {
  try {
    const bulan = document.getElementById('filterBulan').value;
    let tahun = document.getElementById('filterTahun').value;
    const komoditas = document.getElementById('filterKomoditas').value;

    // 🔑 JIKA TAHUN MASIH KOSONG, AMBIL YANG TERPILIH OTOMATIS
    if (!tahun) {
      const opt = document.getElementById('filterTahun').options;
      if (opt.length > 1) {
        tahun = opt[1].value; // tahun pertama setelah "Pilih Tahun"
        document.getElementById('filterTahun').value = tahun;
      }
    }

    if (!bulan || !tahun) {
      console.warn('Bulan atau Tahun belum siap');
      return;
    }

    let url = `${SUPABASE_URL}/rest/v1/v_iph_kumulatif`
      + `?tahun=eq.${tahun}&bulan=eq.${bulan}`;

    if (komoditas) {
      url += `&id_komoditas=eq.${komoditas}`;
    }

    const res = await fetch(url, { headers: supabaseHeaders });
    const data = await res.json();

    console.log('IPH kumulatif rows:', data.length);
    renderIphKumulatif(data);

  } catch (e) {
    console.error('loadIphMingguan error', e);
  }
}
async function loadFilterTahun() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/v_tahun_data?select=tahun`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await res.json();
    const select = document.getElementById('filterTahun');
    select.innerHTML = '';

    const tahunSekarang = new Date().getFullYear();

    data.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.tahun;
      opt.textContent = d.tahun;

      // otomatis pilih tahun berjalan jika ada
      if (d.tahun === tahunSekarang) {
        opt.selected = true;
      }

      select.appendChild(opt);
    });

  } catch (err) {
    console.error('Gagal load tahun:', err);
  }
}
async function loadFilterKomoditas() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/komoditas?select=id_komoditas,nama_komoditas&order=nama_komoditas.asc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await res.json();
    const select = document.getElementById('filterKomoditas');

    // reset
    select.innerHTML = `<option value="">Semua Komoditas</option>`;

    data.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id_komoditas;
      opt.textContent = d.nama_komoditas;
      select.appendChild(opt);
    });

  } catch (err) {
    console.error('Gagal load komoditas:', err);
  }
}
async function loadFilterPasar() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/pasar?select=id_pasar,nama_pasar,kecamatan&order=nama_pasar.asc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await res.json();
    const select = document.getElementById('filterPasar');

    // reset
    select.innerHTML = `<option value="">Semua Pasar</option>`;

    data.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id_pasar;
      opt.textContent = `${d.nama_pasar} (${d.kecamatan})`;
      select.appendChild(opt);
    });

  } catch (err) {
    console.error('Gagal load pasar:', err);
  }
}
async function loadHargaHarian() {
  const komoditas = document.getElementById('filterKomoditas').value;
  const pasar = document.getElementById('filterPasar').value;
  const bulan = document.getElementById('filterBulan').value;
  const tahun = document.getElementById('filterTahun').value;

  const bulanPad = bulan.toString().padStart(2, '0');
  const startDate = `${tahun}-${bulanPad}-01`;
  const endDate = new Date(tahun, bulan, 0).toISOString().slice(0, 10);

  let url =
    `${SUPABASE_URL}/rest/v1/v_harga_harian_lengkap`
    + `?select=id_komoditas,nama_komoditas,id_pasar,nama_pasar,tanggal,harga`
    + `&tanggal=gte.${startDate}`
    + `&tanggal=lte.${endDate}`
    + `&order=nama_komoditas.asc`
    + `&order=nama_pasar.asc`
    + `&order=tanggal.asc`;

  if (komoditas) url += `&id_komoditas=eq.${komoditas}`;
  if (pasar) url += `&id_pasar=eq.${pasar}`;

  const data = await fetchSupabase(url, 'Harga Harian');

  if (!Array.isArray(data)) {
    document.getElementById('hargaHarian').innerHTML =
      '<div class="text-danger">Gagal memuat data harga harian</div>';
    return;
  }

  renderTabelHargaHarian(data);
}

async function fetchSupabase(url, label = '') {
  if (DEBUG_SUPABASE) {
    console.group(`🔎 Supabase Request ${label}`);
    console.log('URL:', url);
  }

  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    if (DEBUG_SUPABASE) {
      console.log('HTTP Status:', res.status);
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('❌ Supabase Error:', errText);
      console.groupEnd();
      return null;
    }

    const data = await res.json();
    if (DEBUG_SUPABASE) {
      console.log('Rows:', Array.isArray(data) ? data.length : 'NOT ARRAY');
      console.groupEnd();
    }

    return data;

  } catch (err) {
    console.error('🔥 Fetch Exception:', err);
    console.groupEnd();
    return null;
  }
}
function renderIphKumulatif(data) {
  const container = document.getElementById('iphMingguan');
  if (!container) return;

  container.innerHTML = '';

  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML = '<div class="text-muted">Tidak ada data</div>';
    return;
  }

  const maxMinggu = Math.max(...data.map(d => d.minggu_ke));

  const grouped = {};
  data.forEach(d => {
    if (!grouped[d.nama_komoditas]) grouped[d.nama_komoditas] = {};
    grouped[d.nama_komoditas][d.minggu_ke] = d.iph_mingguan;
  });

  let html = `
    <div class="table-scroll-both">
      <table class="table table-bordered table-sm table-hover">
        <thead>
          <tr>
            <th class="sticky-col">No</th>
            <th class="sticky-col-2">Komoditas</th>
  `;

  for (let m = 1; m <= maxMinggu; m++) {
    html += `<th>M${m}</th>`;
  }

  html += `</tr></thead><tbody>`;

  let no = 1;
  Object.keys(grouped).forEach(nama => {
    html += `
      <tr>
        <td class="sticky-col">${no++}</td>
        <td class="sticky-col-2">${nama}</td>
    `;

    for (let m = 1; m <= maxMinggu; m++) {
      html += `<td class="harga-cell">${formatRupiah(grouped[nama][m])}</td>`;
    }

    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}


function loadPerubahanMingguan() {
  const bulan = document.getElementById('filterBulan').value;
  const tahun = document.getElementById('filterTahun').value;
  const komoditas = document.getElementById('filterKomoditas').value;

  let url = `${SUPABASE_URL}/rest/v1/v_iph_perubahan_mingguan`
          + `?tahun=eq.${tahun}&bulan=eq.${bulan}`;

  if (komoditas && komoditas !== 'all') {
    url += `&id_komoditas=eq.${komoditas}`;
  }

  fetch(url, { headers: supabaseHeaders })
    .then(res => res.json())
    .then(data => renderPerubahanIph(data))
    .catch(err => console.error('Gagal load perubahan IPH', err));
}

document.getElementById('btnTampil')
  .addEventListener('click', () => {
    loadHargaHarian();
    loadIphMingguan();
    loadPerubahanMingguan();
    loadPerubahanIPH();
    //setJudulPerubahan();
  });
document.addEventListener('DOMContentLoaded', () => {
  loadFilterTahun();
  loadFilterKomoditas();
  loadFilterPasar();
  initFilterTahun();
});




















































