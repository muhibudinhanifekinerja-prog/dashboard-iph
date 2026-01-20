/*************************************************
 * KONFIGURASI SUPABASE
 *************************************************/
const SUPABASE_URL = "https://hkllhgmfbnepgtfnrxuj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbGxoZ21mYm5lcGd0Zm5yeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTA1NzQsImV4cCI6MjA4Mjc2NjU3NH0.Ft8giYKJIPPiGstRJXJNb_uuKQUuNlaAM8p2dE2UKs0";
/*************************************************
 * HELPER
 *************************************************/
function getJumlahHari(bulan, tahun) {
  return new Date(tahun, bulan, 0).getDate();
}
function formatRupiah(angka) {
  return 'Rp ' + Number(angka).toLocaleString('id-ID');
}

async function loadHargaHarian() {
  const komoditas = document.getElementById('filterKomoditas').value;
  const pasar = document.getElementById('filterPasar').value;
  const bulan = document.getElementById('filterBulan').value; // 1-12
  const tahun = document.getElementById('filterTahun').value;

  let url =
    `${SUPABASE_URL}/rest/v1/v_harga_harian_lengkap`
    + `?select=id_komoditas,nama_komoditas,id_pasar,nama_pasar,tanggal,harga`
    + `&tanggal=gte.${tahun}-${bulan.padStart(2,'0')}-01`
    + `&tanggal=lte.${tahun}-${bulan.padStart(2,'0')}-31`;

  if (komoditas) url += `&id_komoditas=eq.${komoditas}`;
  if (pasar) url += `&id_pasar=eq.${pasar}`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });

  const data = await res.json();
  renderTabelHargaHarian(data, bulan, tahun);
}
function renderTabelHargaHarian(data) {
  const container = document.getElementById('hargaHarian');
  container.innerHTML = '';

  if (!data || data.length === 0) {
    container.innerHTML = '<div class="text-muted">Tidak ada data</div>';
    return;
  }

  // =========================
  // 1. Ambil tanggal unik (yyyy-mm-dd) dari DB
  // =========================
  const tanggalList = [
    ...new Set(data.map(d => d.tanggal))
  ].sort(); // ISO date aman di-sort string

  // =========================
  // 2. Group data per Komoditas + Pasar
  // =========================
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

    // simpan harga berdasarkan tanggal ISO
    map[key].harga[d.tanggal] = d.harga;
  });

  // =========================
  // 3. Render HEADER
  // =========================
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

  // =========================
  // 4. Render BODY
  // =========================
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
          ${val ? formatRupiah(val) : '-'}
        </td>`;
    });

    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
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
async function loadIphMingguan() {
  const komoditas = document.getElementById('filterKomoditas').value;
  const pasar = document.getElementById('filterPasar').value;

  let url =
    `${SUPABASE_URL}/rest/v1/v_iph_mingguan_kumulatif`
    + `?select=id_komoditas,nama_komoditas,id_pasar,minggu_ke,iph_kumulatif`
    + `&order=nama_komoditas.asc,minggu_ke.asc`;

  if (komoditas) url += `&id_komoditas=eq.${komoditas}`;
  if (pasar) url += `&id_pasar=eq.${pasar}`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });

  const data = await res.json();
  renderIphMingguanPerKomoditas(data);
}
function renderIphMingguanPerKomoditas(data) {
  const container = document.getElementById('iphMingguan');
  container.innerHTML = '';

  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML = '<div class="text-muted">Tidak ada data</div>';
    return;
  }

  const totalMinggu = 5;

  // =========================
  // GROUP BY KOMODITAS
  // =========================
  const map = {};
  data.forEach(d => {
    if (!map[d.id_komoditas]) {
      map[d.id_komoditas] = {
        nama: d.nama_komoditas,
        minggu: {}
      };
    }
    map[d.id_komoditas].minggu[d.minggu_ke] = d.iph_kumulatif;
  });

  // =========================
  // HEADER
  // =========================
  let html = `
  <div class="table-responsive">
  <table class="table table-bordered table-sm align-middle">
    <thead class="table-light">
      <tr>
        <th>Komoditas</th>`;

  for (let i = 1; i <= totalMinggu; i++) {
    html += `<th class="text-end">Ke-${i}</th>`;
  }

  html += `</tr></thead><tbody>`;

  // =========================
  // BODY
  // =========================
  Object.values(map).forEach(row => {
    html += `<tr><td>${row.nama}</td>`;

    for (let i = 1; i <= totalMinggu; i++) {
      const val = row.minggu[i];
      html += `
        <td class="text-end">
          ${val ? formatRupiah(val) : '0'}
        </td>`;
    }

    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

document.getElementById('btnTampil')
  .addEventListener('click', () => {
    loadHargaHarian();
    //loadIphMingguan();
    //loadPerubahanMingguan();
  });

document.addEventListener('DOMContentLoaded', () => {
  loadFilterTahun();
  loadFilterKomoditas();
  loadFilterPasar();
});









