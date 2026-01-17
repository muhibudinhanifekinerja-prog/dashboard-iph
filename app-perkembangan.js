/*************************************************
 * KONFIGURASI SUPABASE
 *************************************************/
const SUPABASE_URL = "https://hkllhgmfbnepgtfnrxuj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbGxoZ21mYm5lcGd0Zm5yeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTA1NzQsImV4cCI6MjA4Mjc2NjU3NH0.Ft8giYKJIPPiGstRJXJNb_uuKQUuNlaAM8p2dE2UKs0";
/*************************************************
 * HELPER
 *************************************************/
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json"
};

function qs(id) {
  return document.getElementById(id);
}
function pad2(n) {
  return String(n).padStart(2, "0");
}

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}
/*************************************************
 * LOAD MASTER DATA (KOMODITAS & PASAR)
 *************************************************/
async function loadMaster() {
  // Komoditas
  const komoditas = await fetch(
    `${SUPABASE_URL}/rest/v1/komoditas?select=id_komoditas,nama_komoditas&order=nama_komoditas`,
    { headers }
  ).then(r => r.json());

  komoditas.forEach(k => {
    qs("filterKomoditas").innerHTML +=
      `<option value="${k.id_komoditas}">${k.nama_komoditas}</option>`;
  });

  // Pasar
  const pasar = await fetch(
    `${SUPABASE_URL}/rest/v1/pasar?select=id_pasar,nama_pasar&order=nama_pasar`,
    { headers }
  ).then(r => r.json());

  pasar.forEach(p => {
    qs("filterPasar").innerHTML +=
      `<option value="${p.id_pasar}">${p.nama_pasar}</option>`;
  });
}

/*************************************************
 * LOAD HARGA HARIAN
 *************************************************/
function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

async function loadHargaHarian(thn, bln) {
  const box = document.getElementById("hargaHarian");
  if (!box) return [];

  const mm = String(bln).padStart(2, "0");
  const lastDay = lastDayOfMonth(thn, bln);

  const url =
    `${SUPABASE_URL}/rest/v1/v_harga_harian_rata` +
    `?select=tanggal,nama_komoditas,harga_rata` +
    `&tanggal=gte.${thn}-${mm}-01` +
    `&tanggal=lte.${thn}-${mm}-${lastDay}` +
    `&order=tanggal`;

  const res = await fetch(url, { headers });
  const data = await res.json();

  if (!data.length) {
    box.innerHTML = "<em>Tidak ada data</em>";
    return [];
  }

  renderHargaHarian(data);
  return data;
}



function setDefaultTahun() {
  const tahunSekarang = new Date().getFullYear();
  const selectTahun = document.getElementById("filterTahun");

  // jika option tahun belum ada, tambahkan
  let ada = false;
  for (let opt of selectTahun.options) {
    if (opt.value == tahunSekarang) {
      opt.selected = true;
      ada = true;
    }
  }

  if (!ada) {
    const opt = document.createElement("option");
    opt.value = tahunSekarang;
    opt.textContent = tahunSekarang;
    opt.selected = true;
    selectTahun.appendChild(opt);
  }
}

/*************************************************
 * LOAD IPH MINGGUAN
 *************************************************/
async function loadIphMingguan(thn, bln) {
  const box = qs("iphMingguan");
  box.innerHTML = "Memuat rata-rata mingguan…";

  if (!thn || !bln) {
    box.innerHTML = "<em>Tahun / bulan tidak valid</em>";
    return;
  }

  const bulan = `${thn}-${pad2(bln)}-01`;

  const url =
    `${SUPABASE_URL}/rest/v1/v_rata_mingguan_fix` +
    `?select=minggu_ke,nama_komoditas,harga_rata` +
    `&bulan=eq.${bulan}` +
    `&order=minggu_ke`;

  const data = await fetch(url, { headers }).then(r => r.json());

  if (!data.length) {
    box.innerHTML = "<em>Tidak ada data</em>";
    return;
  }

  // minggu sebagai kolom
  const mingguList = [...new Set(data.map(d => d.minggu_ke))].sort((a,b)=>a-b);

  // pivot: map[komoditas][minggu] = harga_rata
  const map = {};
  data.forEach(d => {
    map[d.nama_komoditas] ??= {};
    map[d.nama_komoditas][d.minggu_ke] = d.harga_rata;
  });

  let html = `
    <div class="table-scroll-both">
      <table class="table table-sm table-bordered align-middle">
        <thead>
          <tr>
            <th class="sticky-col">Komoditas</th>`;

  mingguList.forEach(m =>
    html += `<th class="text-center">Minggu ${m}</th>`
  );

  html += `</tr></thead><tbody>`;

  Object.keys(map).forEach(komoditas => {
    html += `<tr>
      <td class="sticky-col">${komoditas}</td>`;

    mingguList.forEach(m => {
      const v = map[komoditas][m];
      html += `
        <td class="text-end">
          ${v ? "Rp " + Math.round(Number(v)).toLocaleString("id-ID") : "-"}
        </td>`;
    });

    html += `</tr>`;
  });

  html += `</tbody></table></div>`;

  box.innerHTML = html;
}
/*************************************************
 * LOAD RATA-RATA MINGGUAN KUMULATIF (VIEW)
 *************************************************/
async function loadRataMingguanKumulatif(thn, bln) {
  const box = qs("iphMingguan");
  box.innerHTML = "Memuat rata-rata harga kumulatif…";

  if (!thn || !bln) {
    box.innerHTML = "<em>Tahun / bulan tidak valid</em>";
    return;
  }

  const url =
    `${SUPABASE_URL}/rest/v1/v_iph_mingguan_kumulatif` +
    `?select=nama_komoditas,minggu_ke,rata_rata_mingguan` +
    `&tahun=eq.${thn}` +
    `&bulan=eq.${bln}` +
    `&order=nama_komoditas,minggu_ke`;

  const data = await fetch(url, { headers }).then(r => r.json());

  if (!data.length) {
    box.innerHTML = "<em>Tidak ada data rata-rata mingguan</em>";
    return;
  }

  // daftar minggu (kolom)
  const mingguList = [...new Set(data.map(d => d.minggu_ke))].sort((a,b)=>a-b);

  // pivot: map[komoditas][minggu] = nilai
  const map = {};
  data.forEach(d => {
    if (!map[d.nama_komoditas]) map[d.nama_komoditas] = {};
    map[d.nama_komoditas][d.minggu_ke] = d.rata_rata_mingguan;
  });

  let html = `
    <div class="table-scroll-both">
      <table class="table table-sm table-bordered align-middle">
        <thead class="table-light">
          <tr>
            <th class="sticky-col">Komoditas</th>`;

  mingguList.forEach(m =>
    html += `<th class="text-center">Minggu ${m}</th>`
  );

  html += `</tr></thead><tbody>`;

  Object.keys(map).forEach(kom => {
    html += `
      <tr>
        <td class="sticky-col fw-semibold">${kom}</td>`;

    mingguList.forEach(m => {
      const v = map[kom][m];
      html += `
        <td class="text-end">
          ${v ? "Rp " + Math.round(Number(v)).toLocaleString("id-ID") : "-"}
        </td>`;
    });

    html += `</tr>`;
  });

  html += `</tbody></table></div>`;

  box.innerHTML = html;
}

async function loadPersenMingguan(thn, bln) {
  const box = qs("perubahanPersen");
  if (!box) return;

  box.innerHTML = "Memuat % perubahan…";

  const url =
    `${SUPABASE_URL}/rest/v1/v_perubahan_persen_mingguan` +
    `?select=nama_komoditas,minggu_ke,persen_vs_bulan_lalu` +
    `&tahun=eq.${thn}&bulan=eq.${bln}` +
    `&order=nama_komoditas,minggu_ke`;

  const rows = await fetch(url, { headers }).then(r => r.json());

  if (!rows.length) {
    box.innerHTML = "<em>Tidak ada data</em>";
    return;
  }

  // daftar minggu (1–5)
  const mingguList = [...new Set(rows.map(r => r.minggu_ke))].sort((a,b)=>a-b);

  // pivot data → map[komoditas][minggu]
  const map = {};
  rows.forEach(r => {
    if (!map[r.nama_komoditas]) map[r.nama_komoditas] = {};
    map[r.nama_komoditas][r.minggu_ke] = r.persen_vs_bulan_lalu;
  });

  let html = `
    <div class="table-responsive">
    <table class="table table-sm table-bordered align-middle">
      <thead class="table-light">
        <tr>
          <th>Komoditas</th>`;

  mingguList.forEach(m =>
    html += `<th class="text-center">M${m}</th>`
  );

  html += `</tr></thead><tbody>`;

  Object.keys(map).forEach(k => {
    html += `<tr><td class="fw-semibold">${k}</td>`;

    mingguList.forEach(m => {
      const v = map[k][m];
      if (v === null || v === undefined) {
        html += `<td class="text-center">-</td>`;
      } else {
        const sign = v > 0 ? "+" : "";
        const cls = v > 0 ? "text-danger" : "text-success";
        html += `
          <td class="text-end ${cls}">
            ${sign}${v.toFixed(1)}%
          </td>`;
      }
    });

    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  box.innerHTML = html;
}




/*************************************************
 * GRAFIK IPH (Chart.js lazy)
 *************************************************/
let chart;
async function renderChart(data) {

  if (!window.Chart) {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/chart.js";
    document.body.appendChild(s);
    await new Promise(r => s.onload = r);
  }

  const labels = [...new Set(data.map(d => `Minggu ${d.minggu_ke}`))];
  const values = data.map(d => d.iph_persen);

  if (chart) chart.destroy();

  chart = new Chart(qs("chartIph"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "IPH (%)",
        data: values,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      }
    }
  });
}


async function loadRataMingguan(thn, bln) {
  const bulan = `${thn}-${String(bln).padStart(2, "0")}-01`;

  const url =
    `${SUPABASE_URL}/rest/v1/v_rata_mingguan_kumulatif_fix` +
    `?select=minggu_ke,nama_komoditas,harga_rata` +
    `&bulan=eq.${bulan}` +
    `&order=minggu_ke`;

  const res = await fetch(url, { headers });
  const rows = await res.json();

  console.log("DATA MINGGUAN:", rows); // 🔍 PENTING untuk cek
  //renderMingguan(rows);
}


/*************************************************
 * PERUBAHAN (%) BULAN LALU
 *************************************************
async function loadPerubahan(param) {
  qs("perubahanPersen").innerHTML = "Memuat perubahan…";

  const url =
    `${SUPABASE_URL}/rest/v1/v_analisis_3bulan?select=nama_komoditas,persen_perubahan_3bulan` +
    param;

  const data = await fetch(url, { headers }).then(r => r.json());

  let html = "<ul class='mb-0'>";
  data.slice(0,5).forEach(d => {
    html += `<li>${d.nama_komoditas}: ${d.persen_perubahan_3bulan}%</li>`;
  });
  html += "</ul>";

  qs("perubahanPersen").innerHTML = html;
}*/

/*************************************************
 * EVENT FILTER
 *************************************************/
qs("btnTampil").addEventListener("click", () => {
  const thn = parseInt(qs("filterTahun").value);
  const bln = parseInt(qs("filterBulan").value);
  const kom = qs("filterKomoditas").value;
  const pas = qs("filterPasar").value;

  loadRataMingguanKumulatif(thn, bln);
  loadPersenMingguan(thn, bln);
  loadRataMingguan(thn, bln);
  loadHargaHarian(thn, bln, kom, pas);
  //loadIphMingguan(thn, bln);
  //loadPerubahan("");
});

function renderHargaHarian(rows) {
  const box = document.getElementById("hargaHarian");

  if (!rows || !rows.length) {
    box.innerHTML = "<em>Tidak ada data harga harian</em>";
    return;
  }

  const tanggalList = [...new Set(rows.map(r => r.tanggal))].sort();

  // pivot: map[komoditas][tanggal] = harga_rata
  const map = {};
  rows.forEach(r => {
    map[r.nama_komoditas] ??= {};
    map[r.nama_komoditas][r.tanggal] = r.harga_rata;
  });

  let html = `
    <div class="table-scroll-both">
      <table class="table table-sm table-bordered align-middle">
        <thead>
          <tr>
            <th class="sticky-col">Komoditas</th>`;

  tanggalList.forEach(t =>
    html += `<th class="text-center">${t}</th>`
  );

  html += `</tr></thead><tbody>`;

  Object.keys(map).forEach(k => {
    html += `<tr>
      <td class="sticky-col fw-semibold">${k}</td>`;

    tanggalList.forEach(t => {
      const v = map[k][t];
      html += `<td class="text-end">
        ${v ? "Rp " + Number(v).toLocaleString("id-ID") : "-"}
      </td>`;
    });

    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  box.innerHTML = html;
}



/*************************************************
 * INIT
 *************************************************/
setDefaultTahun();
loadMaster();
