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
  const bulan = document.getElementById('filterBulan').value;
  const tahun = document.getElementById('filterTahun').value;

  const bulanPad = bulan.toString().padStart(2, '0');
  const startDate = `${tahun}-${bulanPad}-01`;
  const endDate = new Date(tahun, bulan, 0).toISOString().slice(0, 10);

  let url =
    `${SUPABASE_URL}/rest/v1/v_harga_harian_lengkap`
    + `?select=nama_komoditas,nama_pasar,tanggal,harga`
    + `&tanggal=gte.${startDate}`
    + `&tanggal=lte.${endDate}`
    + `&order=nama_komoditas.asc`
    + `&order=nama_pasar.asc`
    + `&order=tanggal.asc`;

  if (komoditas) url += `&id_komoditas=eq.${komoditas}`;
  if (pasar) url += `&id_pasar=eq.${pasar}`;

  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!res.ok) {
      console.error(await res.text());
      return;
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error('Data bukan array:', data);
      return;
    }

    renderTabelHargaHarian(data);

  } catch (err) {
    console.error('Error loadHargaHarian:', err);
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
    loadIphMingguan();
    loadPerubahanMingguan();
  });

document.addEventListener('DOMContentLoaded', () => {
  loadFilterTahun();
  loadFilterKomoditas();
  loadFilterPasar();
});











