/************************************************************
 * KONFIGURASI SUPABASE
 ************************************************************/
const SUPABASE_URL = "https://hkllhgmfbnepgtfnrxuj.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbGxoZ21mYm5lcGd0Zm5yeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTA1NzQsImV4cCI6MjA4Mjc2NjU3NH0.Ft8giYKJIPPiGstRJXJNb_uuKQUuNlaAM8p2dE2UKs0";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`
};

/************************************************************
 * HELPER
 ************************************************************/
function formatRupiah(val) {
  if (val === null || val === undefined || isNaN(val)) return "-";
  return "Rp " + Math.round(val).toLocaleString("id-ID");
}

function formatPersen(val) {
  if (val === null || isNaN(val)) return "-";
  return val.toFixed(2) + "%";
}

function getCheckedValues(containerId) {
  return Array.from(
    document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`)
  ).map(el => el.value);
}

/************************************************************
 * LOGIKA MINGGU (ATURAN IPH)
 ************************************************************/
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
  if (d <= friday) return 1;

  const nextMonday = new Date(friday);
  nextMonday.setDate(friday.getDate() + 3);

  const diffDays = Math.floor((d - nextMonday) / 86400000);
  return Math.min(2 + Math.floor(diffDays / 7), 5);
}
function exportTableToExcel(tableId, filename) {
  const table = document.querySelector(`#${tableId} table`);
  if (!table) {
    alert("Data belum tersedia");
    return;
  }

  const wb = XLSX.utils.table_to_book(table, { sheet: "Data" });
  XLSX.writeFile(wb, filename);
}
function exportTableToPDF(tableId, title, filename) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  doc.setFontSize(12);
  doc.text(title, 14, 12);

  const table = document.querySelector(`#${tableId} table`);
  if (!table) {
    alert("Data belum tersedia");
    return;
  }

  doc.autoTable({
    html: table,

    startY: 18,

    // 👉 BIAR TABEL PECAH HALAMAN
    pageBreak: "auto",

    // 👉 JANGAN PAKSA LEBAR
    tableWidth: "auto",

    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: "linebreak",
      halign: "right",
      valign: "middle"
    },

    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontSize: 7,
      halign: "center"
    },

    bodyStyles: {
      fontSize: 7
    },

    columnStyles: {
      0: { halign: "center", cellWidth: 10 },   // No
      1: { halign: "left", cellWidth: 35 },     // Komoditas
      2: { halign: "left", cellWidth: 30 }      // Pasar
      // kolom tanggal BIAR OTOMATIS
    },

    didDrawPage: function () {
      doc.setFontSize(9);
      doc.text(
        `Dicetak: ${new Date().toLocaleDateString("id-ID")}`,
        doc.internal.pageSize.getWidth() - 50,
        12
      );
    }
  });

  doc.save(filename);
}

function exportHargaHarianExcel() {
  exportTableToExcel(
    "hargaHarian",
    `harga_harian_${filterTahun.value}_${filterBulan.value}.xlsx`
  );
}

function exportHargaHarianPDF() {
  exportTableToPDF(
    "hargaHarian",
    "Harga Harian",
    `harga_harian_${filterTahun.value}_${filterBulan.value}.pdf`
  );
}
function exportMingguanExcel() {
  exportTableToExcel(
    "iphMingguan",
    `rata_rata_mingguan_${filterTahun.value}_${filterBulan.value}.xlsx`
  );
}

function exportMingguanPDF() {
  exportTableToPDF(
    "iphMingguan",
    "Rata-rata Harga Mingguan (Kumulatif)",
    `rata_rata_mingguan_${filterTahun.value}_${filterBulan.value}.pdf`
  );
}
function exportPerubahanExcel() {
  exportTableToExcel(
    "perubahanPersen",
    `perubahan_mingguan_${filterTahun.value}_${filterBulan.value}.xlsx`
  );
}

function exportPerubahanPDF() {
  exportTableToPDF(
    "perubahanPersen",
    "% Perubahan Harga Mingguan",
    `perubahan_mingguan_${filterTahun.value}_${filterBulan.value}.pdf`
  );
}

/************************************************************
 * LOAD FILTER MASTER
 ************************************************************/
async function loadFilterTahun() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/v_tahun_data?select=tahun&order=tahun.desc`,
    { headers }
  );
  const data = await res.json();
  const el = document.getElementById("filterTahun");
  el.innerHTML = "";
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
  const el = document.getElementById("filterKomoditasList");
  el.innerHTML = "";
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
  const el = document.getElementById("filterPasarList");
  el.innerHTML = "";
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

/************************************************************
 * LOAD HARGA HARIAN
 ************************************************************/
async function loadHargaHarian() {
  const tahun = filterTahun.value;
  const bulan = filterBulan.value;
  const komoditas = getCheckedValues("filterKomoditasList");
  const pasar = getCheckedValues("filterPasarList");

  const start = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
  const end = new Date(tahun, bulan, 0).toISOString().slice(0, 10);

  let url =
    `${SUPABASE_URL}/rest/v1/v_harga_harian_lengkap` +
    `?tanggal=gte.${start}&tanggal=lte.${end}` +
    `&order=nama_komoditas.asc&order=nama_pasar.asc&order=tanggal.asc`;

  if (komoditas.length)
    url += `&id_komoditas=in.(${komoditas.join(",")})`;
  if (pasar.length)
    url += `&id_pasar=in.(${pasar.join(",")})`;

  const res = await fetch(url, { headers });
  const data = await res.json();
  renderHargaHarian(data);
}

/************************************************************
 * RENDER HARGA HARIAN
 ************************************************************/
function renderHargaHarian(data) {
  const el = document.getElementById("hargaHarian");
  if (!data.length) {
    el.innerHTML = "<em>Tidak ada data</em>";
    return;
  }

  const tanggalList = [...new Set(data.map(d => d.tanggal))].sort();
  const grup = {};

  data.forEach(d => {
    const key = `${d.id_komoditas}-${d.id_pasar}`;
    grup[key] ??= {
      komoditas: d.nama_komoditas,
      pasar: d.nama_pasar,
      harga: {}
    };
    grup[key].harga[d.tanggal] = d.harga;
  });

  let html = `<table class="table table-bordered table-sm table-dashboard">
    <thead><tr><th>No</th><th>Komoditas</th><th>Pasar</th>`;
  tanggalList.forEach(t => (html += `<th>${t}</th>`));
  html += `</tr></thead><tbody>`;

  let no = 1;
  Object.values(grup).forEach(r => {
    html += `<tr><td>${no++}</td><td>${r.komoditas}</td><td>${r.pasar}</td>`;
    tanggalList.forEach(t => {
      html += `<td class="text-end">${r.harga[t] ? formatRupiah(r.harga[t]) : "-"}</td>`;
    });
    html += `</tr>`;
  });

  el.innerHTML = html + "</tbody></table>";
}

/************************************************************
 * HITUNG MINGGUAN KUMULATIF
 ************************************************************/
function hitungMingguanKumulatif(data) {
  const mingguMap = {};
  const komoditasSet = new Set();

  data.forEach(d => {
    const m = mingguKeLaporan(d.tanggal);
    mingguMap[m] ??= {};
    mingguMap[m][d.nama_komoditas] ??= [];
    mingguMap[m][d.nama_komoditas].push(d.harga);
    komoditasSet.add(d.nama_komoditas);
  });

  const mingguList = Object.keys(mingguMap).map(Number).sort((a, b) => a - b);
  const komoditasList = [...komoditasSet].sort();

  const kumulatif = {};
  komoditasList.forEach(k => (kumulatif[k] = []));

  const hasil = {};
  mingguList.forEach(m => {
    hasil[m] = {};
    komoditasList.forEach(k => {
      if (mingguMap[m][k]) kumulatif[k].push(...mingguMap[m][k]);
      const arr = kumulatif[k];
      hasil[m][k] = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    });
  });

  return { mingguList, komoditasList, hasil };
}

/************************************************************
 * IPH & PERUBAHAN
 ************************************************************/
function hitungPerubahanMingguanVsBulanLalu(bulanIni, bulanLalu) {
  const mingguAkhir = Math.max(...bulanLalu.mingguList);
  const baseline = {};

  bulanIni.komoditasList.forEach(k => {
    baseline[k] = bulanLalu.hasil[mingguAkhir]?.[k] ?? null;
  });

  const perubahan = {};
  bulanIni.mingguList.forEach(m => {
    perubahan[m] = {};
    bulanIni.komoditasList.forEach(k => {
      const base = baseline[k];
      const curr = bulanIni.hasil[m][k];
      perubahan[m][k] = base && curr ? ((curr - base) / base) * 100 : null;
    });
  });

  return { mingguList: bulanIni.mingguList, komoditasList: bulanIni.komoditasList, perubahan };
}

function renderIphMingguan(data) {
  const el = document.getElementById("iphMingguan");
  const { mingguList, komoditasList, hasil } = hitungMingguanKumulatif(data);

  let html = `<table class="table table-bordered table-sm"><thead><tr><th>Komoditas</th>`;
  mingguList.forEach(m => (html += `<th>M${m}</th>`));
  html += `</tr></thead><tbody>`;

  komoditasList.forEach(k => {
    html += `<tr><td>${k}</td>`;
    mingguList.forEach(m => {
      const v = hasil[m][k];
      html += `<td class="text-end">${v ? formatRupiah(v) : "-"}</td>`;
    });
    html += `</tr>`;
  });

  el.innerHTML = html + "</tbody></table>";
}

function renderPerubahanMingguan(data) {
  const el = document.getElementById("perubahanPersen");

  let html = `<table class="table table-bordered table-sm"><thead><tr><th>Komoditas</th>`;
  data.mingguList.forEach(m => (html += `<th>M${m}</th>`));
  html += `</tr></thead><tbody>`;

  data.komoditasList.forEach(k => {
    html += `<tr><td>${k}</td>`;
    data.mingguList.forEach(m => {
      const v = data.perubahan[m][k];
      let cls = "iph-stabil";
      if (v > 0) cls = "iph-naik";
      if (v < 0) cls = "iph-turun";
      html += `<td class="text-end ${cls}">${formatPersen(v)}</td>`;
    });
    html += `</tr>`;
  });

  el.innerHTML = html + "</tbody></table>";
}
/************************************************************
 * FETCH HARGA HARIAN (UNTUK IPH & PERUBAHAN)
 ************************************************************/
async function fetchHargaHarian(tahun, bulan, komoditas, pasar) {
  const start = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
  const end = new Date(tahun, bulan, 0).toISOString().slice(0, 10);

  let url =
    `${SUPABASE_URL}/rest/v1/v_harga_harian_lengkap` +
    `?tanggal=gte.${start}&tanggal=lte.${end}`;

  if (komoditas.length)
    url += `&id_komoditas=in.(${komoditas.join(",")})`;

  if (pasar.length)
    url += `&id_pasar=in.(${pasar.join(",")})`;

  url += `&order=nama_komoditas.asc&order=nama_pasar.asc&order=tanggal.asc`;

  const res = await fetch(url, { headers });

  if (!res.ok) {
    console.error("Gagal fetchHargaHarian:", await res.text());
    return [];
  }

  return await res.json();
}
/************************************************************
 * DEBUG: LOG PEMBAGIAN MINGGU
 ************************************************************/
function renderLogMingguan(data) {
  const el = document.getElementById("logMingguan");
  if (!el || !data.length) {
    el.textContent = "Tidak ada data debug";
    return;
  }

  const tanggalList = [...new Set(data.map(d => d.tanggal))].sort();
  let log = "";
  let lastMinggu = null;

  tanggalList.forEach((tgl, i) => {
    const m = mingguKeLaporan(tgl);
    const d = new Date(tgl);

    if (i === 0) {
      log += `${d.toLocaleString("id-ID", { month: "long" })} ${d.getFullYear()}\n`;
      log += "-----------------------------------\n\n";
    }

    if (lastMinggu !== null && lastMinggu !== m) {
      log += "-----------------------------------\n\n";
    }

    log += `${d.toLocaleDateString("id-ID")} → M${m}\n`;
    lastMinggu = m;
  });

  el.textContent = log;
}

/************************************************************
 * DEBUG: TABEL HARIAN → MINGGU
 ************************************************************/
function renderLogTableMingguan(data) {
  const el = document.getElementById("logTableMingguan");
  if (!el || !data.length) {
    el.innerHTML = "<em>Tidak ada data debug</em>";
    return;
  }

  const komoditasList = [...new Set(data.map(d => d.nama_komoditas))].sort();
  const tanggalList = [...new Set(data.map(d => d.tanggal))].sort();

  const map = {};
  data.forEach(d => {
    map[d.tanggal] ??= {};
    map[d.tanggal][d.nama_komoditas] = d.harga;
  });

  let html = `<table class="table table-bordered table-sm">
    <thead><tr><th>Tanggal</th>`;
  komoditasList.forEach(k => (html += `<th>${k}</th>`));
  html += `</tr></thead><tbody>`;

  tanggalList.forEach(t => {
    html += `<tr><td>${t}</td>`;
    komoditasList.forEach(k => {
      html += `<td class="text-end">${map[t]?.[k] ? formatRupiah(map[t][k]) : "-"}</td>`;
    });
    html += `</tr>`;
  });

  el.innerHTML = html + "</tbody></table>";
}

/************************************************************
 * DEBUG: TABEL MINGGUAN KUMULATIF
 ************************************************************/
function renderLogTableMingguanKumulatif(data) {
  const el = document.getElementById("logTableMingguanKumulatif");
  if (!el || !data.length) {
    el.innerHTML = "<em>Tidak ada data debug</em>";
    return;
  }

  const { mingguList, komoditasList, hasil } =
    hitungMingguanKumulatif(data);

  let html = `<table class="table table-bordered table-sm">
    <thead><tr><th>Minggu</th>`;
  komoditasList.forEach(k => (html += `<th>${k}</th>`));
  html += `</tr></thead><tbody>`;

  mingguList.forEach(m => {
    html += `<tr><td>M${m}</td>`;
    komoditasList.forEach(k => {
      const v = hasil[m][k];
      html += `<td class="text-end">${v ? formatRupiah(v) : "-"}</td>`;
    });
    html += `</tr>`;
  });

  el.innerHTML = html + "</tbody></table>";
}

/************************************************************
 * MAIN
 ************************************************************/
async function loadIphMingguan() {
  const tahun = Number(filterTahun.value);
  const bulan = Number(filterBulan.value);
  const komoditas = getCheckedValues("filterKomoditasList");
  const pasar = getCheckedValues("filterPasarList");

  const dataBulanIni = await fetchHargaHarian(tahun, bulan, komoditas, pasar);
  const kumulatifIni = hitungMingguanKumulatif(dataBulanIni);

  const bulanLalu = bulan === 1 ? 12 : bulan - 1;
  const tahunLalu = bulan === 1 ? tahun - 1 : tahun;

  const dataBulanLalu = await fetchHargaHarian(tahunLalu, bulanLalu, komoditas, pasar);
  const kumulatifLalu = hitungMingguanKumulatif(dataBulanLalu);

  const perubahan = hitungPerubahanMingguanVsBulanLalu(kumulatifIni, kumulatifLalu);

  renderIphMingguan(dataBulanIni);
  renderPerubahanMingguan(perubahan);
}

/************************************************************
 * EVENT
 ************************************************************/
document.getElementById("btnTampil").onclick = () => {
  loadHargaHarian();
  loadIphMingguan();
};

document.addEventListener("DOMContentLoaded", () => {
  loadFilterTahun();
  loadFilterKomoditas();
  loadFilterPasar();
});




