// ================== SUPABASE ==================
const { createClient } = supabase;
const db = createClient(
  "https://hkllhgmfbnepgtfnrxuj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbGxoZ21mYm5lcGd0Zm5yeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTA1NzQsImV4cCI6MjA4Mjc2NjU3NH0.Ft8giYKJIPPiGstRJXJNb_uuKQUuNlaAM8p2dE2UKs0"
);

// ================== HELPER ==================
function handleError(error, ctx=""){
  console.error("Supabase error:", ctx, error);
  alert("Terjadi kesalahan saat memuat data. Cek console.");
}
function rupiah(v){
  return "Rp " + Number(v).toLocaleString("id-ID");
}

// ================== DOM ==================
const tabelHarian   = document.getElementById("tabelHarian");
const tabelMingguan = document.getElementById("tabelMingguan");
const tabelPersen   = document.getElementById("tabelPersen");
const heatmap       = document.getElementById("heatmap");

const komoditas = document.getElementById("komoditas");
const pasar     = document.getElementById("pasar");
const bulan     = document.getElementById("bulan");
const tahun     = document.getElementById("tahun");

const chartBulananEl = document.getElementById("chartBulanan");

// ================== NAVIGASI ==================
function showPage(page){
  document.getElementById("page-beranda").classList.add("d-none");
  document.getElementById("page-perkembangan").classList.add("d-none");
  document.getElementById("page-"+page).classList.remove("d-none");

  document.querySelectorAll(".nav-link")
    .forEach(a=>a.classList.remove("active"));

  document
    .querySelector(`a[onclick="showPage('${page}')"]`)
    .classList.add("active");

  if(page==="beranda"){
  loadChartBulanan();
  loadBeranda();
  }
}

// ================== MASTER DATA ==================
async function loadMaster(){
  const { data: kom, error: e1 } =
    await db.from("komoditas").select("*").order("nama_komoditas");
  if(e1) return handleError(e1,"komoditas");

  const { data: pas, error: e2 } =
    await db.from("pasar").select("*").order("nama_pasar");
  if(e2) return handleError(e2,"pasar");

  komoditas.innerHTML = `<option value="">Semua Komoditas</option>`;
  kom.forEach(k=>{
    komoditas.innerHTML +=
      `<option value="${k.id_komoditas}">${k.nama_komoditas}</option>`;
  });

  pasar.innerHTML = `<option value="">Semua Pasar</option>`;
  pas.forEach(p=>{
    pasar.innerHTML +=
      `<option value="${p.id_pasar}">${p.nama_pasar}</option>`;
  });
}

// ================== GRAFIK BULANAN ==================
let chartBulanan=null;

async function loadChartBulanan(){
  const tahunVal = tahun?.value || new Date().getFullYear();

  const { data, error } = await db
    .from("mv_grafik_bulanan_avg")
    .select("bulan,bulan_angka,nama_komoditas,avg_harga")
    .eq("tahun", tahunVal)
    .order("bulan_angka");

  if(error) return handleError(error,"grafik bulanan");
  if(!data || !data.length) return;

  const labels = [...new Set(data.map(r=>r.bulan))];
  const koms   = [...new Set(data.map(r=>r.nama_komoditas))];

  const map = {};
  data.forEach(r=>{
    map[`${r.nama_komoditas}-${r.bulan}`] = r.avg_harga;
  });

  const datasets = koms.map(k=>({
    label:k,
    data: labels.map(b=>map[`${k}-${b}`] ?? null),
    tension:0.3
  }));

  if(chartBulanan) chartBulanan.destroy();

  chartBulanan = new Chart(chartBulananEl,{
    type:"line",
    data:{labels,datasets},
    options:{
      responsive:true,
      plugins:{legend:{display:false}},
      scales:{y:{ticks:{callback:rupiah}}}
    }
  });

  renderLegendIcon(koms);
}

// ================== IPH WEEK ENGINE ==================
function buildIPHWeeks(rows){
  const workdays = rows
    .map(r=>({tanggal:r.tanggal,harga:r.harga,dow:new Date(r.tanggal).getDay()}))
    .filter(r=>r.dow>=1 && r.dow<=5)
    .sort((a,b)=>new Date(a.tanggal)-new Date(b.tanggal));

  const first = workdays.find(r=>r.harga>0);
  if(!first) return {};

  let start = new Date(first.tanggal);
  if(start.getDay()===5) start.setDate(start.getDate()+3);

  const map={}, cur=new Date(start);
  let week=1,count=0;

  workdays.forEach(r=>{
    const d=new Date(r.tanggal);
    if(d < start){ map[r.tanggal]=1; return; }

    while(cur<=d){
      count++;
      if(count>5){ week++; count=1; }
      cur.setDate(cur.getDate()+1);
      while(cur.getDay()==0||cur.getDay()==6)
        cur.setDate(cur.getDate()+1);
    }
    map[r.tanggal]=week;
  });
  return map;
}

// ================== BULAN LALU ==================
async function getPrevMonthAvgFiltered(){
  let y=parseInt(tahun.value),
      m=parseInt(bulan.value)-1;
  if(m==0){m=12;y--;}

  const start=`${y}-${String(m).padStart(2,"0")}-01`;
  const end=new Date(y,m,0).toISOString().slice(0,10);

  let q=db.from("v_harga_harian")
          .select("nama_komoditas,harga,id_komoditas,id_pasar")
          .gte("tanggal",start).lte("tanggal",end);

  if(komoditas.value) q=q.eq("id_komoditas",komoditas.value);
  if(pasar.value)     q=q.eq("id_pasar",pasar.value);

  const {data,error}=await q;
  if(error) return {};

  const map={};
  data.forEach(r=>{
    if(r.harga>0){
      if(!map[r.nama_komoditas]) map[r.nama_komoditas]={t:0,c:0};
      map[r.nama_komoditas].t+=r.harga;
      map[r.nama_komoditas].c++;
    }
  });

  const avg={};
  for(const k in map)
    avg[k]=Math.round(map[k].t/map[k].c);

  return avg;
}

// ================== LOAD DATA ==================
async function loadData(){
  const start=`${tahun.value}-${bulan.value}-01`;
  const end=new Date(tahun.value,parseInt(bulan.value),0)
              .toISOString().slice(0,10);

  let q=db.from("v_harga_harian")
          .select("*")
          .gte("tanggal",start)
          .lte("tanggal",end)
          .order("tanggal");

  if(komoditas.value) q=q.eq("id_komoditas",komoditas.value);
  if(pasar.value)     q=q.eq("id_pasar",pasar.value);

  const {data,error}=await q;
  if(error) return handleError(error,"load data");

  if(!data.length){
    tabelHarian.innerHTML="<tr><td>Data kosong</td></tr>";
    return;
  }

  renderHarian(data);
  renderMingguan(data);
  const prev=await getPrevMonthAvgFiltered();
  renderPersen(data,prev);
}

// ================== HARIAN ==================
function renderHarian(rows){
  const dates=[...new Set(rows.map(r=>r.tanggal))].sort();
  const map={};

  rows.forEach(r=>{
    const k=r.id_komoditas+"-"+r.id_pasar;
    if(!map[k]) map[k]={kom:r.nama_komoditas,pas:r.nama_pasar,data:{}};
    map[k].data[r.tanggal]=r.harga;
  });

  let html="<tr><th class='freeze-komoditas'>Komoditas</th><th class='freeze-pasar'>Pasar</th>";
  dates.forEach(d=>html+=`<th>${d}</th>`); html+="</tr>";

  for(const k in map){
    html+=`<tr><td class='freeze-komoditas'>${map[k].kom}</td>
           <td class='freeze-pasar'>${map[k].pas}</td>`;
    let prev=null;
    dates.forEach(d=>{
      const v=map[k].data[d];
      if(!v){ html+="<td>-</td>"; return; }
      let cls="";
      if(prev){ if(v>prev)cls="naik"; if(v<prev)cls="turun"; }
      prev=v;
      html+=`<td class="${cls}">${rupiah(v)}</td>`;
    });
    html+="</tr>";
  }
  tabelHarian.innerHTML=html;
  renderHeatmap(rows);
}

// ================== MINGGUAN ==================
let iphChart=null;

function renderMingguan(rows){
  const weekMap=buildIPHWeeks(rows);
  const map={}, iphMap={};

  rows.forEach(r=>{
    const w=weekMap[r.tanggal];
    if(!w||r.harga<=0) return;
    if(!map[r.nama_komoditas]) map[r.nama_komoditas]={};
    if(!map[r.nama_komoditas][w]) map[r.nama_komoditas][w]={t:0,c:0};
    map[r.nama_komoditas][w].t+=r.harga;
    map[r.nama_komoditas][w].c++;
  });

  let html="<tr><th>Komoditas</th><th>M1</th><th>M2</th><th>M3</th><th>M4</th><th>M5</th></tr>";

  for(const k in map){
    html+=`<tr><td>${k}</td>`;
    iphMap[k]={};
    let t=0,c=0;
    for(let i=1;i<=5;i++){
      if(map[k][i]){
        t+=map[k][i].t; c+=map[k][i].c;
        const v=Math.round(t/c);
        iphMap[k][i]=v;
        html+=`<td>${rupiah(v)}</td>`;
      } else html+="<td>-</td>";
    }
    html+="</tr>";
  }
  tabelMingguan.innerHTML=html;
  renderChart(iphMap);
}

// ================== PERSENTASE ==================
function renderPersen(rows,prevAvg){
  const weekMap=buildIPHWeeks(rows);
  const map={};

  rows.forEach(r=>{
    const w=weekMap[r.tanggal];
    if(!w||r.harga<=0) return;
    if(!map[r.nama_komoditas]) map[r.nama_komoditas]={};
    if(!map[r.nama_komoditas][w]) map[r.nama_komoditas][w]={t:0,c:0};
    map[r.nama_komoditas][w].t+=r.harga;
    map[r.nama_komoditas][w].c++;
  });

  let html="<tr><th>Komoditas</th><th>M1</th><th>M2</th><th>M3</th><th>M4</th><th>M5</th></tr>";

  for(const k in map){
    html+=`<tr><td>${k}</td>`;
    let t=0,c=0;
    for(let i=1;i<=5;i++){
      if(map[k][i]){
        t+=map[k][i].t; c+=map[k][i].c;
        if(!prevAvg[k]) html+="<td>-</td>";
        else{
          const avg=Math.round(t/c);
          const pct=((avg-prevAvg[k])/prevAvg[k]*100).toFixed(2);
          html+=`<td>${pct}%</td>`;
        }
      } else html+="<td>-</td>";
    }
    html+="</tr>";
  }
  tabelPersen.innerHTML=html;
}

// ================== CHART IPH ==================
function renderChart(iphMap){
  const labels=["M1","M2","M3","M4","M5"];
  const datasets=Object.keys(iphMap).map(k=>({
    label:k,
    data:[1,2,3,4,5].map(i=>iphMap[k][i]||null),
    tension:0.2
  }));

  if(iphChart) iphChart.destroy();
  iphChart=new Chart(document.getElementById("chartIPH"),{
    type:"line",
    data:{labels,datasets}
  });
}

// ================== HEATMAP ==================
function renderHeatmap(rows){
  const dates=[...new Set(rows.map(r=>r.tanggal))].sort();
  const map={};

  rows.forEach(r=>{
    const k=r.id_komoditas+"-"+r.id_pasar;
    if(!map[k]) map[k]={kom:r.nama_komoditas,pas:r.nama_pasar,data:{}};
    map[k].data[r.tanggal]=r.harga;
  });

  let html="<table class='table table-bordered table-sm'><tr><th>Komoditas</th><th>Pasar</th>";
  dates.forEach(d=>html+=`<th>${d}</th>`); html+="</tr>";

  for(const k in map){
    html+=`<tr><td>${map[k].kom}</td><td>${map[k].pas}</td>`;
    let prev=null;
    dates.forEach(d=>{
      const v=map[k].data[d]||0;
      let cls="heat-zero";
      if(v>0&&prev){
        if(v>prev)cls="heat-up";
        else if(v<prev)cls="heat-down";
        else cls="heat-same";
      }
      if(v>0) prev=v;
      html+=`<td class="${cls}">${v>0?v:"-"}</td>`;
    });
    html+="</tr>";
  }
  heatmap.innerHTML=html;
}

// ================== ICON LEGEND ==================
const komoditasIcon={
  "Beras Medium":"bi-bag",
  "Beras Premium":"bi-bag-fill",
  "Cabai Merah Keriting":"bi-fire",
  "Cabai Merah Besar":"bi-fire",
  "Cabai Rawit Merah":"bi-lightning",
  "Cabai Rawit Hijau":"bi-lightning",
  "Bawang Merah":"bi-droplet",
  "Bawang Putih Honan":"bi-droplet-half",
  "Gula Pasir Curah":"bi-cup-straw",
  "Minyak Goreng Sawit Curah":"bi-droplet-fill",
  "Telur Ayam Ras":"bi-egg",
  "Daging Ayam Ras":"bi-egg-fried",
  "Daging Sapi Paha Belakang":"bi-currency-exchange"
};
function renderLegendIcon(list){
  const wrap=document.getElementById("legendKomoditas");
  if(!wrap) return;
  wrap.innerHTML="";
  list.forEach(n=>{
    const i=komoditasIcon[n]||"bi-box";
    wrap.innerHTML+=`
      <div class="d-flex align-items-center gap-2 small">
        <i class="bi ${i} fs-5"></i><span>${n}</span>
      </div>`;
  });
}

// ================== INIT ==================
(function init(){
  const now=new Date();
  bulan.value=String(now.getMonth()+1).padStart(2,"0");

  const y=now.getFullYear();
  tahun.innerHTML="";
  for(let i=y-2;i<=y+1;i++)
    tahun.innerHTML+=`<option>${i}</option>`;

  loadMaster();
  showPage("beranda");
})();
// ================== BERANDA ==================
async function loadBeranda(){
  const y=new Date().getFullYear();
  const m=String(new Date().getMonth()+1).padStart(2,"0");

  const start=`${y}-${m}-01`;
  const end=new Date(y,parseInt(m),0).toISOString().slice(0,10);

  const {data,error}=await db
    .from("v_harga_harian")
    .select("tanggal,nama_komoditas,harga")
    .gte("tanggal",start)
    .lte("tanggal",end)
    .gt("harga",0);

  if(error||!data.length) return;

  buildSummary(data);
  buildTopList(data);
  buildWarning(data);
  buildNarasi(data);
}

function buildSummary(rows){
  const avg=rows.reduce((a,b)=>a+b.harga,0)/rows.length;
  document.getElementById("summaryCards").innerHTML=`
    <div class="col-md-3"><div class="card text-center shadow-sm">
      <div class="card-body"><div class="fs-4 fw-bold">${new Set(rows.map(r=>r.nama_komoditas)).size}</div>
      <div class="text-muted">Komoditas</div></div></div></div>
    <div class="col-md-3"><div class="card text-center shadow-sm">
      <div class="card-body"><div class="fs-4 fw-bold">${rupiah(Math.round(avg))}</div>
      <div class="text-muted">Rata-rata Harga</div></div></div></div>
    <div class="col-md-3"><div class="card text-center shadow-sm">
      <div class="card-body"><div class="fs-4 fw-bold">${rows.length}</div>
      <div class="text-muted">Data Tercatat</div></div></div></div>
    <div class="col-md-3"><div class="card text-center shadow-sm">
      <div class="card-body"><div class="fs-4 fw-bold">${rows.at(-1).tanggal}</div>
      <div class="text-muted">Update Terakhir</div></div></div></div>`;
}

function buildTopList(rows){
  const map={};
  rows.forEach(r=>{
    if(!map[r.nama_komoditas]) map[r.nama_komoditas]=[];
    map[r.nama_komoditas].push(r.harga);
  });

  const list=Object.entries(map).map(([k,v])=>({
    nama:k,
    avg:Math.round(v.reduce((a,b)=>a+b,0)/v.length),
    pct:((v.at(-1)-v[0])/v[0]*100)
  }));

  document.getElementById("topMahal").innerHTML=
    list.sort((a,b)=>b.avg-a.avg).slice(0,5)
      .map(r=>`<li class="list-group-item d-flex justify-content-between">
        <span>${r.nama}</span><strong>${rupiah(r.avg)}</strong></li>`).join("");

  document.getElementById("topNaik").innerHTML=
    list.sort((a,b)=>b.pct-a.pct).slice(0,5)
      .map(r=>`<li class="list-group-item d-flex justify-content-between">
        <span>${r.nama}</span><span class="text-danger">${r.pct.toFixed(1)}%</span></li>`).join("");
}

function buildWarning(rows){
  const map={};
  rows.forEach(r=>{
    if(!map[r.nama_komoditas]) map[r.nama_komoditas]=[];
    map[r.nama_komoditas].push(r.harga);
  });

  const warn=Object.entries(map)
    .map(([k,v])=>({nama:k,pct:((v.at(-1)-v[0])/v[0]*100)}))
    .filter(r=>r.pct>=10);

  document.getElementById("peringatanList").innerHTML=
    warn.length
    ? warn.map(r=>`<li class="list-group-item text-danger">
        ⚠️ ${r.nama} naik ${r.pct.toFixed(1)}%</li>`).join("")
    : `<li class="list-group-item text-success">Tidak ada peringatan</li>`;
}

function buildNarasi(rows){
  const map={};
  rows.forEach(r=>{
    if(!map[r.nama_komoditas]) map[r.nama_komoditas]=[];
    map[r.nama_komoditas].push(r.harga);
  });

  let naik=0,turun=0;
  Object.values(map).forEach(v=>{
    if(v.at(-1)>v[0]) naik++;
    if(v.at(-1)<v[0]) turun++;
  });

  document.getElementById("narasiBulanan").innerText=
    `Pada bulan ini, harga pangan menunjukkan ${
      naik>turun?"kecenderungan meningkat":"relatif stabil"
    }. ${naik} komoditas mengalami kenaikan dan ${turun} komoditas mengalami penurunan.`;
}
