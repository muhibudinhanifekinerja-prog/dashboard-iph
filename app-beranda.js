/*************************************************
 * KONFIGURASI SUPABASE
 *************************************************/
const SUPABASE_URL = "https://hkllhgmfbnepgtfnrxuj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbGxoZ21mYm5lcGd0Zm5yeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTA1NzQsImV4cCI6MjA4Mjc2NjU3NH0.Ft8giYKJIPPiGstRJXJNb_uuKQUuNlaAM8p2dE2UKs0";

async function loadNaik3BulanCard() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/v_naik_3_bulan_aktif?select=nama_komoditas,harga_m2,harga_m1,harga_m0,persen_m2_ke_m1,persen_m1_ke_m0&order=persen_m1_ke_m0.desc&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await res.json();

    if (!data || data.length === 0) {
      document.getElementById('komoditasNaik3').textContent =
        'Tidak ada tren naik';
      document.getElementById('detailNaik3').textContent =
        'Tidak ditemukan kenaikan 3 bulan berturut-turut';
      return;
    }

    const d = data[0];

    document.getElementById('komoditasNaik3').textContent =
      d.nama_komoditas;

    document.getElementById('detailNaik3').textContent =
      `Naik ${d.persen_m2_ke_m1}% → ${d.persen_m1_ke_m0}% `
      + `(Rp ${formatRupiah(d.harga_m2)} → `
      + `Rp ${formatRupiah(d.harga_m1)} → `
      + `Rp ${formatRupiah(d.harga_m0)})`;

  } catch (err) {
    console.error('Error loadNaik3BulanCard:', err);
  }
}
async function loadTurun3BulanCard() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/v_turun_3_bulan_aktif?select=*`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!res.ok) {
      console.error('HTTP Error', res.status);
      return;
    }

    const data = await res.json();

    if (!data || data.length === 0) {
      document.getElementById('komoditasTurun3').textContent =
        'Tidak ada tren turun';
      document.getElementById('detailTurun3').textContent =
        'Data tersedia, namun tidak lolos filter';
      return;
    }

    // sorting manual (AMAN)
    data.sort((a, b) => a.persen_m1_ke_m0 - b.persen_m1_ke_m0);

    const d = data[0];

    document.getElementById('komoditasTurun3').textContent =
      d.nama_komoditas;

    document.getElementById('detailTurun3').textContent =
      `Turun ${Math.abs(d.persen_m2_ke_m1)}% → ${Math.abs(d.persen_m1_ke_m0)}% `
      + `(Rp ${formatRupiah(d.harga_m2)} → `
      + `Rp ${formatRupiah(d.harga_m1)} → `
      + `Rp ${formatRupiah(d.harga_m0)})`;

  } catch (err) {
    console.error('Error loadTurun3BulanCard:', err);
  }
}


// util rupiah
function formatRupiah(value) {
  return Number(value).toLocaleString('id-ID');
}
async function loadVolatilitas30HariCard() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/v_top_volatilitas_30_hari?select=nama_komoditas,indeks_volatilitas,harga_rata`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await res.json();

    if (!data || data.length === 0) {
      document.getElementById('komoditasVolatil').textContent =
        'Data belum tersedia';
      document.getElementById('detailVolatil').textContent =
        'Tidak ada perhitungan volatilitas';
      return;
    }

    const d = data[0];

    document.getElementById('komoditasVolatil').textContent =
      d.nama_komoditas;

    document.getElementById('detailVolatil').textContent =
      `Volatilitas ${d.indeks_volatilitas}% (rata-rata Rp ${formatRupiah(d.harga_rata)})`;

  } catch (err) {
    console.error('Error loadVolatilitas30HariCard:', err);
  }
}
async function loadTabelRataBulanan() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/v_rata_bulanan_3_bulan?select=id_komoditas,nama_komoditas,bulan,harga_rata&order=bulan.asc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
          // =========================
    // 1. Ambil bulan unik dari data
    // =========================
    const bulanView = [...new Set(data.map(d => d.bulan))]
      .sort((a, b) => new Date(a) - new Date(b));
    
    // =========================
    // 2. Tentukan BULAN TERAKHIR (data-driven)
    // =========================
    const bulanTerakhir = new Date(bulanView[bulanView.length - 1]);
    
    // =========================
    // 3. Bangun 4 bulan: 3 bulan sebelum + bulan terakhir
    // =========================
    const bulanList = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(bulanTerakhir.getFullYear(), bulanTerakhir.getMonth() - i, 1);
      bulanList.push(d.toISOString().slice(0, 10));
    }

    const data = await res.json();
    if (!data || data.length === 0) return;
    // =========================
    // 2. Tambahkan BULAN BERJALAN
    // =========================
    
    const bulanBerjalan = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().slice(0, 10);

    const bulanList = bulanView.includes(bulanBerjalan)
      ? bulanView
      : [...bulanView, bulanBerjalan];

    // =========================
    // 3. Render HEADER
    // =========================
    const header = document.getElementById('headerBulan');
    header.innerHTML = `
      <th width="50">No</th>
      <th>Komoditas</th>
    `;

    bulanList.forEach((b, idx) => {
      const tgl = new Date(b);
      const nama = tgl.toLocaleString('id-ID', { month: 'short' });
      const tahun = tgl.getFullYear();
      const isBerjalan = idx === bulanList.length - 1;
    
      header.innerHTML += `
        <th class="text-end">
          ${nama} ${tahun}
          ${isBerjalan ? '<br><span class="text-muted small">(berjalan)</span>' : ''}
        </th>
      `;
    });

    // =========================
    // 4. Kelompokkan data
    // =========================
    const map = {};
    data.forEach(d => {
      if (!map[d.id_komoditas]) {
        map[d.id_komoditas] = {
          nama: d.nama_komoditas,
          harga: {}
        };
      }
      map[d.id_komoditas].harga[d.bulan] = Math.round(d.harga_rata);
    });

    // =========================
    // 5. Render BODY
    // =========================
    const body = document.getElementById('bodyTable');
    body.innerHTML = '';
    let no = 1;

    Object.values(map).forEach(k => {
      let row = `
        <tr>
          <td class="text-center">${no++}</td>
          <td>${k.nama}</td>
      `;

      bulanList.forEach((b, idx) => {
        const curr = k.harga[b] ?? null;
        const prev = idx > 0 ? k.harga[bulanList[idx - 1]] ?? null : null;

        let indikator = '';
        if (curr !== null && prev !== null) {
          if (curr > prev) indikator = '<span class="text-danger">▲</span>';
          else if (curr < prev) indikator = '<span class="text-success">▼</span>';
          else indikator = '<span class="text-muted">–</span>';
        }

        row += `
          <td class="text-end">
            ${curr !== null
              ? `Rp ${formatRupiah(curr)} ${indikator}`
              : '<span class="text-muted">–</span>'}
          </td>
        `;
      });

      row += '</tr>';
      body.innerHTML += row;
    });

  } catch (err) {
    console.error('Error loadTabelRataBulanan:', err);
  }
}
async function loadNarasiOtomatis() {
  try {
    // =========================
    // 1. Ambil komoditas naik 6 bulan
    // =========================
    const resTren = await fetch(
      `${SUPABASE_URL}/rest/v1/v_naik_6_bulan_aktif?select=nama_komoditas&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const trenData = await resTren.json();

    // =========================
    // 2. Ambil komoditas volatil
    // =========================
    const resVolatil = await fetch(
      `${SUPABASE_URL}/rest/v1/v_top_volatilitas_30_hari?select=nama_komoditas,indeks_volatilitas&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const volatilData = await resVolatil.json();

    // =========================
    // 3. Susun Narasi
    // =========================
    let narasi = '';

    if (trenData.length > 0) {
      narasi += `Komoditas <strong>${trenData[0].nama_komoditas}</strong> `
        + `tercatat mengalami kenaikan harga rata-rata `
        + `secara berturut-turut selama <strong>enam bulan terakhir</strong>, `
        + `yang mengindikasikan adanya tekanan harga yang bersifat struktural. `;
    } else {
      narasi += `Tidak terdapat komoditas yang mengalami kenaikan harga `
        + `secara berturut-turut selama enam bulan terakhir. `;
    }

    if (volatilData.length > 0) {
      narasi += `Sementara itu, komoditas `
        + `<strong>${volatilData[0].nama_komoditas}</strong> `
        + `menunjukkan tingkat volatilitas harga yang relatif tinggi `
        + `dalam 30 hari terakhir `
        + `(indeks volatilitas ${volatilData[0].indeks_volatilitas}%), `
        + `mengindikasikan potensi gejolak harga jangka pendek.`;
    } else {
      narasi += `Dalam 30 hari terakhir, tidak teridentifikasi `
        + `komoditas dengan volatilitas harga yang menonjol.`;
    }

    // =========================
    // 4. Render ke HTML
    // =========================
    document.getElementById('narasi').innerHTML = narasi;

  } catch (err) {
    console.error('Error loadNarasiOtomatis:', err);
    document.getElementById('narasi').textContent =
      'Analisis belum dapat ditampilkan.';
  }
}
// warna khusus inflasi YoY (target 2,5 ± 1)
function clsYoY(value) {
  if (value === null) return 'flat';
  if (value < 1.5 || value > 3.5) return 'up';   // MERAH
  return 'down';                                 // HIJAU (dalam target)
}

/*************************************************
 * CARD INFLASI (NASIONAL, PROVINSI, KOTA)
 *************************************************/
/*************************************************
 * CARD INFLASI (MTM + YTD + YOY)
 *************************************************/
async function loadCardInflasi() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/v_inflasi_terakhir?select=level_wilayah,nama_wilayah,inflasi_mtm,inflasi_ytd,inflasi_yoy,bulan,tahun`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!res.ok) return;

    const data = await res.json();
    if (!data || data.length === 0) return;

    const fmt = v => v !== null ? `${v.toFixed(2)}%` : '–';
    const cls = v => v > 0 ? 'up' : v < 0 ? 'down' : 'flat';

    const render = (d) => `
    <div class="inflasi-box">
      <div class="inflasi-item">
        <span class="inflasi-label">Bulan ke Bulan (mtm)</span>
        <span class="inflasi-value ${cls(d.inflasi_mtm)}">
          ${fmt(d.inflasi_mtm)}
        </span>
      </div>
      <div class="inflasi-item">
        <span class="inflasi-label">Tahun Kalender (ytd)</span>
        <span class="inflasi-value ${cls(d.inflasi_ytd)}">
          ${fmt(d.inflasi_ytd)}
        </span>
      </div>
      <div class="inflasi-item">
        <span class="inflasi-label">Tahun ke Tahun (YoY)</span>
        <span class="inflasi-value ${clsYoY(d.inflasi_yoy)}">
          ${fmt(d.inflasi_yoy)}
        </span>
      </div>
    </div>
  `;


    data.forEach(d => {
      const bulanNama = new Date(d.tahun, d.bulan - 1)
        .toLocaleString('id-ID', { month: 'long', year: 'numeric' });

      if (d.level_wilayah === 'nasional') {
        document.getElementById('inflasi-nasional').innerHTML = render(d);
        document.getElementById('inflasi-nasional-ket').textContent =
          `Indonesia • ${bulanNama}`;
      }

      if (d.level_wilayah === 'provinsi' && d.nama_wilayah === 'Jawa Tengah') {
        document.getElementById('inflasi-provinsi').innerHTML = render(d);
        document.getElementById('inflasi-provinsi-ket').textContent =
          `Jawa Tengah • ${bulanNama}`;
      }

      if (d.level_wilayah === 'kota' && d.nama_wilayah === 'Kota Tegal') {
        document.getElementById('inflasi-kota').innerHTML = render(d);
        document.getElementById('inflasi-kota-ket').textContent =
          `Kota Tegal • ${bulanNama}`;
      }
    });

  } catch (err) {
    console.error('Error loadCardInflasi:', err);
  }
}


// panggil saat halaman siap
document.addEventListener('DOMContentLoaded', () => {
  loadCardInflasi(); 
  loadNaik3BulanCard();
  loadTurun3BulanCard(); 
  loadVolatilitas30HariCard();
  loadTabelRataBulanan();
  loadNarasiOtomatis();
});






