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


/*************************
  HELPER
*************************/
const $ = id => document.getElementById(id);

async function fetchJSON(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error("Fetch error");
  return res.json();
}

const rupiah = v =>
  v == null ? "-" : "Rp " + Number(v).toLocaleString("id-ID");

/*************************
  LOAD FILTER DINAMIS
*************************/
async function loadFilter() {

  // Tahun dari harga_harian
  const tahunData = await fetchJSON(
    `${SUPABASE_URL}/rest/v1/harga_harian?select=tanggal`
  );

  const tahunSet = new Set(
    tahunData.map(d => new Date(d.tanggal).getFullYear())
  );

  [...tahunSet].sort().forEach(t => {
    $("filterTahun").innerHTML += `<option value="${t}">${t}</option>`;
  });

  // Komoditas
  const komoditas = await fetchJSON(
    `${SUPABASE_URL}/rest/v1/komoditas?select=nama_komoditas&order=nama_komoditas`
  );

  komoditas.forEach(k => {
    $("filterKomoditas").innerHTML +=
      `<option value="${k.nama_komoditas}">${k.nama_komoditas}</option>`;
  });

  // Pasar
  const pasar = await fetchJSON(
    `${SUPABASE_URL}/rest/v1/pasar?select=nama_pasar&order=nama_pasar`
  );

  pasar.forEach(p => {
    $("filterPasar").innerHTML +=
      `<option value="${p.nama_pasar}">${p.nama_pasar}</option>`;
  });
}

/*************************
  FILTER QUERY
*************************/
function buildFilter() {
  let q = `tahun=eq.${$("filterTahun").value}`;

  if ($("filterKomoditas").value)
    q += `&nama_komoditas=eq.${encodeURIComponent($("filterKomoditas").value)}`;

  if ($("filterPasar").value)
    q += `&nama_pasar=eq.${encodeURIComponent($("filterPasar").value)}`;

  return q;
}

/*************************
  RENDER SEMUA REKAP
*************************/
async function loadRekap() {
  const tahun = $("filterTahun").value;
  $("labelTahunInflasi").innerText = tahun;

  // Inflasi
  const inflasi = await fetchJSON(
    `${SUPABASE_URL}/rest/v1/v_inflasi_tahunan?tahun=eq.${tahun}&level_wilayah=eq.nasional`
  );

  if (inflasi[0]) {
    $("inflasiYoY").innerText = inflasi[0].inflasi_yoy?.toFixed(2) + "%";
    $("inflasiMtM").innerText = inflasi[0].inflasi_mtm?.toFixed(2) + "%";
    $("inflasiYtD").innerText = inflasi[0].inflasi_ytd?.toFixed(2) + "%";
  }

  // Perkembangan harga
  const level = await fetchJSON(
    `${SUPABASE_URL}/rest/v1/v_harga_level_tahunan?${buildFilter()}`
  );

  $("tblPerkembanganHarga").innerHTML = "";
  level.forEach((r, i) => {
    $("tblPerkembanganHarga").innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${r.nama_komoditas}</td>
        <td>${rupiah(r.harga_awal_tahun)}</td>
        <td>${rupiah(r.harga_akhir_tahun)}</td>
        <td>${rupiah(r.rata_tahun)}</td>
      </tr>`;
  });
}

/*************************
  INIT
*************************/
document.addEventListener("DOMContentLoaded", async () => {
  await loadFilter();
  $("btnTampilkan").addEventListener("click", loadRekap);
});
