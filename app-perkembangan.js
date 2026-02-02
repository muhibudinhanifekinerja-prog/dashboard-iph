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
function namaHari(dateStr) {
  const d = new Date(dateStr);
  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return hari[d.getDay()];
}
function renderBarisRataMingguan(buffer, komoditasList, mingguKe) {
  let row = `<tr style="background:#f8f9fa;font-weight:bold">
    <td>Rata-rata M${mingguKe}</td>`;

  komoditasList.forEach(k => {
    const arr = buffer[k] || [];
    const avg = arr.length
      ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
      : null;

    row += `<td class="text-end">${avg ? formatRupiah(avg) : '-'}</td>`;
  });

  row += '</tr>';
  return row;
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

  let minggu;
  if (d <= friday) {
    minggu = 1;
  } else {
    const nextMonday = new Date(friday);
    nextMonday.setDate(friday.getDate() + 3);

    const diffDays = Math.floor((d - nextMonday) / 86400000);
    minggu = Math.min(2 + Math.floor(diffDays / 7), 5);
  }

  console.log(
    '[DEBUG MINGGU]',
    tanggalStr,
    'firstWorkday=', first.toISOString().slice(0,10),
    'fridayM1=', friday.toISOString().slice(0,10),
    '=> M', minggu
  );

  return minggu;
}

/*************************************************
 * IPH MINGGUAN (SQL + JS)
 *************************************************/
async function loadIphMingguan() {
  const bulan = document.getElementById('filterBulan').value;
  const tahun = document.getElementById('filterTahun').value;

  const komoditas = getCheckedValues('filterKomoditasList');
  const pasar = getCheckedValues('filterPasarList');

  console.log('FILTER DIPILIH:', {
    tahun,
    bulan,
    komoditas,
    pasar
  });

  let url =
    `${SUPABASE_URL}/rest/v1/v_iph_harian_bersih`
    + `?tahun=eq.${tahun}`
    + `&bulan=eq.${bulan}`;

  if (komoditas.length > 0) {
    url += `&id_komoditas=in.(${komoditas.join(',')})`;
  }

  if (pasar.length > 0) {
    url += `&id_pasar=in.(${pasar.join(',')})`;
  }

  url += `&order=nama_komoditas.asc&order=tanggal.asc`;

  console.log('URL REQUEST:', url);

  const res = await fetch(url, { headers });
  const data = await res.json();

  console.log('JUMLAH DATA HARIAN MASUK:', data.length);
  console.log('SAMPEL 10 BARIS DATA:', data.slice(0, 10));

  renderIphMingguan(data);
  renderLogMingguan(data);
  renderLogTableMingguan(data);
  renderLogTableMingguanKumulatif(data);
}


function renderIphMingguan(data) {
  console.log('--- RENDER IPH MINGGUAN ---');
  console.log('TOTAL BARIS DATA:', data.length);
  const el = document.getElementById('iphMingguan');
  if (!data.length) {
    el.innerHTML = '<em>Tidak ada data</em>';
    return;
  }

  const bucket = {}; // { komoditas: { minggu: [harga] } }
  let maxM = 0;

  data.forEach(r => {
    const m = mingguKeLaporan(r.tanggal);
    maxM = Math.max(maxM, m);

    if (!bucket[r.nama_komoditas]) bucket[r.nama_komoditas] = {};
    if (!bucket[r.nama_komoditas][m]) bucket[r.nama_komoditas][m] = [];

    bucket[r.nama_komoditas][m].push(r.harga);
  });

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
function renderLogMingguan(data) {
  const el = document.getElementById('logMingguan');
  if (!el) return;

  if (!data.length) {
    el.textContent = 'Tidak ada data';
    return;
  }

  // 1️⃣ Ambil tanggal UNIK saja
  const tanggalUnik = [
    ...new Set(data.map(d => d.tanggal))
  ].sort(); // urut ASC

  let log = '';
  let lastMinggu = null;

  tanggalUnik.forEach((tgl, idx) => {
    const minggu = mingguKeLaporan(tgl);
    const d = new Date(tgl);

    // header bulan (sekali)
    if (idx === 0) {
      const bulanNama = d.toLocaleString('id-ID', { month: 'long' });
      log += `${bulanNama} ${d.getFullYear()}\n`;
      log += '----------------------------------------\n\n';
    }

    // garis pemisah antar minggu
    if (lastMinggu !== null && minggu !== lastMinggu) {
      log += '----------------------------------------\n\n';
    }

    const hari = namaHari(tgl);
    const tanggal = d.getDate();

    log += `${hari.padEnd(7)} ${tanggal.toString().padEnd(2)} | M${minggu}\n`;

    lastMinggu = minggu;
  });

  el.textContent = log;
}
function renderLogTableMingguan(data) {
  const el = document.getElementById('logTableMingguan');
  if (!el) return;

  if (!data.length) {
    el.innerHTML = '<em>Tidak ada data</em>';
    return;
  }
 function renderLogTableMingguanKumulatif(data) {
  const el = document.getElementById('logTableMingguanKumulatif');
  if (!el) return;

  if (!data.length) {
    el.innerHTML = '<em>Tidak ada data</em>';
    return;
  }

  /* =========================================
   * 1. Struktur dasar
   * ========================================= */
  const komoditasList = [...new Set(data.map(d => d.nama_komoditas))].sort();
  const tanggalList = [...new Set(data.map(d => d.tanggal))].sort();

  // hargaPerTanggal[tanggal][komoditas] = [harga...]
  const hargaPerTanggal = {};
  tanggalList.forEach(t => hargaPerTanggal[t] = {});

  data.forEach(d => {
    if (!hargaPerTanggal[d.tanggal][d.nama_komoditas]) {
      hargaPerTanggal[d.tanggal][d.nama_komoditas] = [];
    }
    hargaPerTanggal[d.tanggal][d.nama_komoditas].push(d.harga);
  });

  /* =========================================
   * 2. Kelompokkan tanggal per minggu
   * ========================================= */
  const tanggalPerMinggu = {};
  tanggalList.forEach(tgl => {
    const m = mingguKeLaporan(tgl);
    if (!tanggalPerMinggu[m]) tanggalPerMinggu[m] = [];
    tanggalPerMinggu[m].push(tgl);
  });

  const mingguList = Object.keys(tanggalPerMinggu)
    .map(Number)
    .sort((a, b) => a - b);

  /* =========================================
   * 3. Hitung kumulatif
   * ========================================= */
  // kumulatif[M][komoditas] = [harga harian]
  const kumulatif = {};

  mingguList.forEach(m => {
    kumulatif[m] = {};
    komoditasList.forEach(k => kumulatif[m][k] = []);

    // ambil semua tanggal dari M1 sampai Mm
    mingguList
      .filter(x => x <= m)
      .forEach(x => {
        tanggalPerMinggu[x].forEach(tgl => {
          komoditasList.forEach(k => {
            const arr = hargaPerTanggal[tgl][k] || [];
            arr.forEach(h => kumulatif[m][k].push(h));
          });
        });
      });
  });

  /* =========================================
   * 4. Render tabel
   * ========================================= */
  let html = '<thead><tr><th>Minggu</th>';
  komoditasList.forEach(k => html += `<th>${k}</th>`);
  html += '</tr></thead><tbody>';

  mingguList.forEach(m => {
    html += `<tr><td>M${m}</td>`;
    komoditasList.forEach(k => {
      const arr = kumulatif[m][k];
      const avg = arr.length
        ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
        : null;

      html += `<td class="text-end">${avg ? formatRupiah(avg) : '-'}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody>';
  el.innerHTML = html;
}

  /* =========================================
   * 1. Siapkan struktur dasar
   * ========================================= */
  const komoditasList = [...new Set(data.map(d => d.nama_komoditas))].sort();
  const tanggalList = [...new Set(data.map(d => d.tanggal))].sort();

  // hargaPerTanggal[tanggal][komoditas] = [harga, harga, ...] (lintas pasar)
  const hargaPerTanggal = {};

  data.forEach(d => {
    if (!hargaPerTanggal[d.tanggal]) hargaPerTanggal[d.tanggal] = {};
    if (!hargaPerTanggal[d.tanggal][d.nama_komoditas]) {
      hargaPerTanggal[d.tanggal][d.nama_komoditas] = [];
    }
    hargaPerTanggal[d.tanggal][d.nama_komoditas].push(d.harga);
  });

  /* =========================================
   * 2. Bangun header tabel
   * ========================================= */
  let html = '<thead><tr><th>Tanggal</th>';
  komoditasList.forEach(k => {
    html += `<th>${k}</th>`;
  });
  html += '</tr></thead><tbody>';

  /* =========================================
   * 3. Render baris tanggal + harga
   *    & hitung buffer mingguan
   * ========================================= */
  let bufferMingguan = {}; // bufferMingguan[M][komoditas] = [harga]
  let mingguAktif = null;

  tanggalList.forEach(tgl => {
    const minggu = mingguKeLaporan(tgl);

    // reset buffer jika masuk minggu baru
    if (mingguAktif !== null && minggu !== mingguAktif) {
      // render baris rata-rata minggu sebelumnya
      html += renderBarisRataMingguan(bufferMingguan[mingguAktif], komoditasList, mingguAktif);
    }

    mingguAktif = minggu;
    if (!bufferMingguan[minggu]) bufferMingguan[minggu] = {};

    html += `<tr><td>${tgl}</td>`;

    komoditasList.forEach(k => {
      const arr = hargaPerTanggal[tgl][k] || [];
      const avgHarian = arr.length
        ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
        : null;

      if (avgHarian !== null) {
        if (!bufferMingguan[minggu][k]) bufferMingguan[minggu][k] = [];
        bufferMingguan[minggu][k].push(avgHarian);
      }

      html += `<td class="text-end">${avgHarian ? formatRupiah(avgHarian) : '-'}</td>`;
    });

    html += '</tr>';
  });

  // render rata-rata minggu terakhir
  if (mingguAktif && bufferMingguan[mingguAktif]) {
    html += renderBarisRataMingguan(
      bufferMingguan[mingguAktif],
      komoditasList,
      mingguAktif
    );
  }

  html += '</tbody>';
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









