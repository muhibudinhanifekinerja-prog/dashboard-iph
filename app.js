const { createClient } = supabase;
const db = createClient(
 "https://hkllhgmfbnepgtfnrxuj.supabase.co",
 "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbGxoZ21mYm5lcGd0Zm5yeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTA1NzQsImV4cCI6MjA4Mjc2NjU3NH0.Ft8giYKJIPPiGstRJXJNb_uuKQUuNlaAM8p2dE2UKs0"
);

// ================== MASTER ==================
async function loadMaster(){
 let {data:kom}=await db.from("komoditas").select("*").order("nama_komoditas");
 let {data:pas}=await db.from("pasar").select("*").order("nama_pasar");
 komoditas.innerHTML=`<option value="">Semua Komoditas</option>`;
 kom.forEach(k=>komoditas.innerHTML+=`<option value="${k.id_komoditas}">${k.nama_komoditas}</option>`);
 pasar.innerHTML=`<option value="">Semua Pasar</option>`;
 pas.forEach(p=>pasar.innerHTML+=`<option value="${p.id_pasar}">${p.nama_pasar}</option>`);
}

// ================== MESIN MINGGU IPH ==================
function buildIPHWeeks(rows){
  const workdays = rows
    .map(r=>({tanggal:r.tanggal,harga:r.harga,dow:new Date(r.tanggal).getDay()}))
    .filter(r=>r.dow>=1 && r.dow<=5)
    .sort((a,b)=>new Date(a.tanggal)-new Date(b.tanggal));

  const firstActive = workdays.find(r=>r.harga>0);
  if(!firstActive) return {};

  let week1Start = new Date(firstActive.tanggal);
  if(week1Start.getDay()===5) week1Start.setDate(week1Start.getDate()+3);

  const map={}, cur=new Date(week1Start);
  let week=1,count=0;

  workdays.forEach(r=>{
    const d=new Date(r.tanggal);
    if(d < week1Start){ map[r.tanggal]=1; return; }

    while(cur<=d){
      count++;
      if(count>5){ week++; count=1; }
      cur.setDate(cur.getDate()+1);
      while(cur.getDay()==0||cur.getDay()==6) cur.setDate(cur.getDate()+1);
    }
    map[r.tanggal]=week;
  });
  return map;
}

// ================== BULAN LALU (FILTERED) ==================
async function getPrevMonthAvgFiltered(){
 let y=parseInt(tahun.value), m=parseInt(bulan.value)-1;
 if(m==0){m=12;y--;}
 const start=`${y}-${String(m).padStart(2,"0")}-01`;
 const end=new Date(y,m,0).toISOString().slice(0,10);

 let q = db.from("v_harga_harian")
   .select("nama_komoditas,harga,id_komoditas,id_pasar")
   .gte("tanggal",start).lte("tanggal",end);

 if(komoditas.value) q = q.eq("id_komoditas", komoditas.value);
 if(pasar.value)     q = q.eq("id_pasar", pasar.value);

 let {data}=await q;

 const map={};
 data.forEach(r=>{
   if(r.harga>0){
     if(!map[r.nama_komoditas]) map[r.nama_komoditas]={t:0,c:0};
     map[r.nama_komoditas].t+=r.harga;
     map[r.nama_komoditas].c++;
   }
 });

 const avg={};
 for(const k in map) avg[k]=Math.round(map[k].t/map[k].c);
 return avg;
}

// ================== LOAD DATA ==================
async function loadData(){
 const start=`${tahun.value}-${bulan.value}-01`;
 const end=new Date(tahun.value,parseInt(bulan.value),0).toISOString().slice(0,10);

 let q=db.from("v_harga_harian")
   .select("*").gte("tanggal",start).lte("tanggal",end).order("tanggal");

 if(komoditas.value) q = q.eq("id_komoditas", komoditas.value);
 if(pasar.value)     q = q.eq("id_pasar", pasar.value);

 let {data}=await q;

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
  const key=r.id_komoditas+"-"+r.id_pasar;
  if(!map[key]) map[key]={kom:r.nama_komoditas,pas:r.nama_pasar,data:{}};
  map[key].data[r.tanggal]=r.harga;
 });

 let html="<tr><th class='freeze-komoditas'>Komoditas</th><th class='freeze-pasar'>Pasar</th>";
 dates.forEach(d=>html+=`<th>${d}</th>`); html+="</tr>";

 for(const k in map){
  html+=`<tr><td class='freeze-komoditas'>${map[k].kom}</td><td class='freeze-pasar'>${map[k].pas}</td>`;
  let prev=null;
  dates.forEach(d=>{
    let v=map[k].data[d];
    if(!v||v==0){html+="<td>-</td>";return;}
    let cls=""; if(prev){ if(v>prev)cls="naik"; if(v<prev)cls="turun"; }
    prev=v;
    html+=`<td class='${cls}'>Rp ${Number(v).toLocaleString()}</td>`;
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
  if(!w) return;
  if(!map[r.nama_komoditas]) map[r.nama_komoditas]={};
  if(!map[r.nama_komoditas][w]) map[r.nama_komoditas][w]={t:0,c:0};
  if(r.harga>0){
    map[r.nama_komoditas][w].t+=r.harga;
    map[r.nama_komoditas][w].c++;
  }
 });

 let html="<tr><th>Komoditas</th><th>M1</th><th>M2</th><th>M3</th><th>M4</th><th>M5</th></tr>";

 for(const k in map){
  html+=`<tr><td>${k}</td>`;
  iphMap[k]={};
  let cumT=0,cumC=0;
  for(let i=1;i<=5;i++){
    if(map[k][i]&&map[k][i].c){
      cumT+=map[k][i].t;
      cumC+=map[k][i].c;
      const val=Math.round(cumT/cumC);
      iphMap[k][i]=val;
      html+=`<td>Rp ${val.toLocaleString()}</td>`;
    }else html+="<td>-</td>";
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
  if(!w) return;
  if(!map[r.nama_komoditas]) map[r.nama_komoditas]={};
  if(!map[r.nama_komoditas][w]) map[r.nama_komoditas][w]={t:0,c:0};
  if(r.harga>0){
    map[r.nama_komoditas][w].t+=r.harga;
    map[r.nama_komoditas][w].c++;
  }
 });

 let html="<tr><th>Komoditas</th><th>M1</th><th>M2</th><th>M3</th><th>M4</th><th>M5</th></tr>";

 for(const k in map){
  html+=`<tr><td>${k}</td>`;
  let cumT=0,cumC=0;
  for(let i=1;i<=5;i++){
    if(map[k][i]&&map[k][i].c){
      cumT+=map[k][i].t;
      cumC+=map[k][i].c;
      if(!prevAvg[k]) html+="<td>Data belum tersedia</td>";
      else{
        const avg=Math.round(cumT/cumC);
        const pct=((avg-prevAvg[k])/prevAvg[k]*100).toFixed(2);
        html+=`<td>${pct}%</td>`;
      }
    }else html+="<td>-</td>";
  }
  html+="</tr>";
 }
 tabelPersen.innerHTML=html;
}

// ================== GRAFIK ==================
function renderChart(iphMap){
 const labels=["M1","M2","M3","M4","M5"];
 const datasets=[];
 for(const k in iphMap){
  datasets.push({label:k,data:[1,2,3,4,5].map(i=>iphMap[k][i]||null),tension:0.2});
 }
 if(iphChart) iphChart.destroy();
 iphChart=new Chart(document.getElementById("chartIPH"),{type:"line",data:{labels,datasets}});
}

// ================== HEATMAP ==================
function renderHeatmap(rows){
 const dates=[...new Set(rows.map(r=>r.tanggal))].sort();
 const map={};
 rows.forEach(r=>{
  const key=r.id_komoditas+"-"+r.id_pasar;
  if(!map[key]) map[key]={kom:r.nama_komoditas,pas:r.nama_pasar,data:{}};
  map[key].data[r.tanggal]=r.harga;
 });

 let html="<table class='table table-bordered table-sm'><tr><th>Komoditas</th><th>Pasar</th>";
 dates.forEach(d=>html+=`<th>${d}</th>`); html+="</tr>";

 for(const k in map){
  html+=`<tr><td>${map[k].kom}</td><td>${map[k].pas}</td>`;
  let prev=null;
  dates.forEach(d=>{
    let v=map[k].data[d]||0;
    let cls="heat-zero";
    if(v>0 && prev){
      if(v>prev) cls="heat-up";
      else if(v<prev) cls="heat-down";
      else cls="heat-same";
    }
    if(v>0) prev=v;
    html+=`<td class='${cls}'>${v>0?v:"-"}</td>`;
  });
  html+="</tr>";
 }
 heatmap.innerHTML=html;
}

const now=new Date();
bulan.value=String(now.getMonth()+1).padStart(2,"0");
tahun.value=now.getFullYear();
loadMaster();
