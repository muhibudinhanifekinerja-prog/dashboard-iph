// =====================================================
// KONFIGURASI SUPABASE
// =====================================================
const SUPABASE_URL = "https://hkllhgmfbnepgtfnrxuj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbGxoZ21mYm5lcGd0Zm5yeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTA1NzQsImV4cCI6MjA4Mjc2NjU3NH0.Ft8giYKJIPPiGstRJXJNb_uuKQUuNlaAM8p2dE2UKs0";
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`
};

let chartInflasi = null;
let currentJenis = "yoy";
let cachedData = [];

const BULAN = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember"
];

const el = id => document.getElementById(id);
const num = v => v == null ? "-" : Number(v).toFixed(2);

// ================= LOAD TAHUN =================
async function loadTahun(){
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/inflasi?select=tahun&order=tahun.asc`,
    { headers }
  );
  const data = await res.json();
  const tahun = [...new Set(data.map(d => d.tahun))];

  el("filterTahun").innerHTML =
    `<option value="all">Semua Tahun</option>` +
    tahun.map(t => `<option value="${t}">${t}</option>`).join("");

  loadData("all");
}

// ================= LOAD DATA =================
async function loadData(tahun){
  let url = `${SUPABASE_URL}/rest/v1/inflasi?select=*&order=tahun.asc,bulan.asc`;
  if(tahun !== "all") url += `&tahun=eq.${tahun}`;

  const res = await fetch(url, { headers });
  cachedData = await res.json();
  renderRingkasan();
  renderTable("nasional");
  renderTable("provinsi");
  renderTable("kota");
  renderChart();
}

// ================= RINGKASAN =================
function last(level, kota = null) {
  const filtered = cachedData.filter(d => {
    const lvl = d.level_wilayah?.toLowerCase();
    const wilayah = d.nama_wilayah?.toLowerCase() || "";

    if (kota) {
      return lvl === level && wilayah.includes("tegal");
    }
    return lvl === level;
  });

  return filtered.length ? filtered[filtered.length - 1] : null;
}


function renderRingkasan(){
  const n = last("nasional");
  const p = last("provinsi");
  const k = last("kota","Kota Tegal");

  if(n){
    el("nasional-mtm").textContent=num(n.inflasi_mtm);
    el("nasional-ytd").textContent=num(n.inflasi_ytd);
    el("nasional-yoy").textContent=num(n.inflasi_yoy);
  }
  if(p){
    el("provinsi-mtm").textContent=num(p.inflasi_mtm);
    el("provinsi-ytd").textContent=num(p.inflasi_ytd);
    el("provinsi-yoy").textContent=num(p.inflasi_yoy);
  }
  if(k){
    el("kota-mtm").textContent=num(k.inflasi_mtm);
    el("kota-ytd").textContent=num(k.inflasi_ytd);
    el("kota-yoy").textContent=num(k.inflasi_yoy);
  }
}
function renderTable(level) {
  const tbody =
    level === "nasional" ? el("tbodyNasional") :
    level === "provinsi" ? el("tbodyProvinsi") :
    el("tbodyKota");

  if (!tbody) return;
  tbody.innerHTML = "";

  const rows = cachedData.filter(d => {
    const lvl = d.level_wilayah?.toLowerCase();
    const wilayah = (d.nama_wilayah || "").toLowerCase();

    if (level === "kota") {
      return lvl === "kota" && wilayah.includes("tegal");
    }
    return lvl === level;
  });

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted">
          Tidak ada data
        </td>
      </tr>`;
    return;
  }

  rows.forEach(d => {
    tbody.innerHTML += `
      <tr>
        <td>${BULAN[d.bulan - 1]} ${d.tahun}</td>
        <td>${num(d.inflasi_mtm)}</td>
        <td>${num(d.inflasi_ytd)}</td>
        <td>${num(d.inflasi_yoy)}</td>
      </tr>
    `;
  });
}

// ================= GRAFIK =================
function renderChart(){
  const labels=[...new Set(cachedData.map(d=>`${BULAN[d.bulan-1]} ${d.tahun}`))];

  function series(level,kota=null){
    return labels.map(l=>{
      const [b,t]=l.split(" ");
      const i=cachedData.find(d =>
        d.level_wilayah===level &&
        d.tahun==t &&
        BULAN[d.bulan-1]===b &&
        (!kota||d.nama_wilayah===kota)
      );
      if(!i) return null;
      return currentJenis==="mtm"?i.inflasi_mtm:
             currentJenis==="ytd"?i.inflasi_ytd:
             i.inflasi_yoy;
    });
  }

  if(chartInflasi) chartInflasi.destroy();

  chartInflasi=new Chart(el("chartInflasi"),{
    type:"line",
    data:{
      labels,
      datasets:[
        {label:"Nasional",data:series("nasional"),borderWidth:2,tension:.3},
        {label:"Provinsi Jawa Tengah",data:series("provinsi"),borderWidth:2,tension:.3},
        {label:"Kota Tegal",data:series("kota","Kota Tegal"),borderWidth:2,tension:.3}
      ]
    },
    options:{
      responsive:true,
      interaction:{mode:"index",intersect:false},
      scales:{y:{ticks:{callback:v=>v+"%"}}}
    }
  });
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded",()=>{
  loadTahun();
  el("filterTahun").addEventListener("change",e=>loadData(e.target.value));

  document.getElementById("toggleGrafik")
    .addEventListener("click",e=>{
      const btn=e.target.closest("button[data-jenis]");
      if(!btn) return;
      document.querySelectorAll("#toggleGrafik button")
        .forEach(b=>b.classList.replace("btn-primary","btn-outline-primary"));
      btn.classList.replace("btn-outline-primary","btn-primary");
      currentJenis=btn.dataset.jenis;
      renderChart();
    });
});


