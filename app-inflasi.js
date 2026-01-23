// =====================================================
// KONFIGURASI SUPABASE
// =====================================================
const SUPABASE_URL = "https://hkllhgmfbnepgtfnrxuj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbGxoZ21mYm5lcGd0Zm5yeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTA1NzQsImV4cCI6MjA4Mjc2NjU3NH0.Ft8giYKJIPPiGstRJXJNb_uuKQUuNlaAM8p2dE2UKs0";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

// =====================================================
// GLOBAL
// =====================================================
let chartInflasi = null;

// =====================================================
// UTIL
// =====================================================
function el(id) {
  return document.getElementById(id);
}

function formatAngka(val) {
  if (val === null || val === undefined) return "-";
  return Number(val).toFixed(2);
}

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April",
  "Mei", "Juni", "Juli", "Agustus",
  "September", "Oktober", "November", "Desember"
];

function namaBulan(bulan) {
  return NAMA_BULAN[bulan - 1] || bulan;
}

// =====================================================
// LOAD TAHUN (DEFAULT = SEMUA)
// =====================================================
async function loadTahun() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/inflasi?select=tahun&order=tahun.asc`,
    { headers }
  );

  if (!res.ok) {
    console.error("Gagal ambil tahun:", await res.text());
    return;
  }

  const data = await res.json();
  if (!Array.isArray(data)) return;

  const tahunUnik = [...new Set(data.map(d => d.tahun))];

  const select = el("filterTahun");
  select.innerHTML = `<option value="all">Semua Tahun</option>`;

  tahunUnik.forEach(tahun => {
    const opt = document.createElement("option");
    opt.value = tahun;
    opt.textContent = tahun;
    select.appendChild(opt);
  });

  // default: semua tahun
  loadDataTahun("all");
}

// =====================================================
// LOAD DATA BERDASARKAN TAHUN
// =====================================================
async function loadDataTahun(tahun) {
  let url = `${SUPABASE_URL}/rest/v1/inflasi?select=*&order=tahun.asc,bulan.asc`;

  if (tahun !== "all") {
    url += `&tahun=eq.${tahun}`;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    console.error("Gagal ambil data inflasi:", await res.text());
    return;
  }

  const data = await res.json();
  if (!Array.isArray(data)) return;

  renderRingkasan(data);
  renderTable("nasional", data);
  renderTable("provinsi", data);
  renderTable("kota", data);
  renderChart(data);
}

// =====================================================
// RINGKASAN CARD (AMBIL DATA TERBARU)
// =====================================================
function renderRingkasan(data) {
  const last = (level, kota = null) =>
    data
      .filter(d =>
        d.level_wilayah === level &&
        (!kota || d.nama_wilayah === kota)
      )
      .slice(-1)[0];

  const nasional = last("nasional");
  const provinsi = last("provinsi");
  const kota = last("kota", "Kota Tegal");

  if (nasional) {
    el("nasional-mtm").textContent = formatAngka(nasional.inflasi_mtm);
    el("nasional-ytd").textContent = formatAngka(nasional.inflasi_ytd);
    el("nasional-yoy").textContent = formatAngka(nasional.inflasi_yoy);
  }

  if (provinsi) {
    el("provinsi-mtm").textContent = formatAngka(provinsi.inflasi_mtm);
    el("provinsi-ytd").textContent = formatAngka(provinsi.inflasi_ytd);
    el("provinsi-yoy").textContent = formatAngka(provinsi.inflasi_yoy);
  }

  if (kota) {
    el("kota-mtm").textContent = formatAngka(kota.inflasi_mtm);
    el("kota-ytd").textContent = formatAngka(kota.inflasi_ytd);
    el("kota-yoy").textContent = formatAngka(kota.inflasi_yoy);
  }
}

// =====================================================
// RENDER TABEL HISTORI
// =====================================================
function renderTable(level, data) {
  const tbody =
    level === "nasional" ? el("tbodyNasional") :
    level === "provinsi" ? el("tbodyProvinsi") :
    el("tbodyKota");

  tbody.innerHTML = "";

  const filtered = data.filter(d =>
    d.level_wilayah === level &&
    (level !== "kota" || d.nama_wilayah === "Kota Tegal")
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted">Data tidak tersedia</td>
      </tr>`;
    return;
  }

  filtered.forEach(d => {
    tbody.innerHTML += `
      <tr>
        <td>${namaBulan(d.bulan)} ${d.tahun}</td>
        <td>${formatAngka(d.inflasi_mtm)}</td>
        <td>${formatAngka(d.inflasi_ytd)}</td>
        <td>${formatAngka(d.inflasi_yoy)}</td>
      </tr>
    `;
  });
}

// =====================================================
// GRAFIK INFLASI (NASIONAL, PROVINSI, KOTA)
// =====================================================
function renderChart(data) {
  // label gabungan tahun-bulan
  const labels = [...new Set(
    data.map(d => `${namaBulan(d.bulan)} ${d.tahun}`)
  )];

  function series(level, kota = null) {
    return labels.map(label => {
      const [bulanNama, tahun] = label.split(" ");
      const bulan = NAMA_BULAN.indexOf(bulanNama) + 1;

      const row = data.find(d =>
        d.level_wilayah === level &&
        d.tahun == tahun &&
        d.bulan == bulan &&
        (!kota || d.nama_wilayah === kota)
      );

      return row ? row.inflasi_yoy : null;
    });
  }

  if (chartInflasi) chartInflasi.destroy();

  chartInflasi = new Chart(el("chartInflasi"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Nasional",
          data: series("nasional"),
          borderWidth: 2,
          tension: 0.3
        },
        {
          label: "Provinsi Jawa Tengah",
          data: series("provinsi"),
          borderWidth: 2,
          tension: 0.3
        },
        {
          label: "Kota Tegal",
          data: series("kota", "Kota Tegal"),
          borderWidth: 2,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top" }
      },
      scales: {
        y: {
          ticks: {
            callback: val => val + "%"
          }
        }
      }
    }
  });
}

// =====================================================
// INIT
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
  loadTahun();

  el("filterTahun").addEventListener("change", e => {
    loadDataTahun(e.target.value);
  });
});
