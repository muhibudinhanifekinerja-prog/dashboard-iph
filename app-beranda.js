/*************************************************
 * KONFIGURASI SUPABASE
 *************************************************/
const SUPABASE_URL = "https://hkllhgmfbnepgtfnrxuj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbGxoZ21mYm5lcGd0Zm5yeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTA1NzQsImV4cCI6MjA4Mjc2NjU3NH0.Ft8giYKJIPPiGstRJXJNb_uuKQUuNlaAM8p2dE2UKs0";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json"
};

function el(id) {
  return document.getElementById(id);
}

/*************************************************
 * 1. RINGKASAN HARGA TERTINGGI & TERENDAH BULAN INI
 *************************************************/
async function loadRingkasanBulanIni() {
  const url =
    `${SUPABASE_URL}/rest/v1/v_ringkasan_bulan_ini` +
    `?select=nama_komoditas,harga_rata`;

  const data = await fetch(url, { headers }).then(r => r.json());
  if (!data.length) return;

  data.sort((a, b) => b.harga_rata - a.harga_rata);

  el("hargaTertinggi").innerText =
    "Rp " + data[0].harga_rata.toLocaleString("id-ID");
  el("komoditasTertinggi").innerText = data[0].nama_komoditas;

  el("hargaTerendah").innerText =
    "Rp " + data[data.length - 1].harga_rata.toLocaleString("id-ID");
  el("komoditasTerendah").innerText =
    data[data.length - 1].nama_komoditas;
}

/*************************************************
 * 2. TABEL RATA-RATA 3 BULAN (BULAN = KOLOM)
 *************************************************/
function trendIcon(val) {
  if (val > 1) return ["▲", "up"];
  if (val < -1) return ["▼", "down"];
  return ["■", "flat"];
}

async function loadTabel3Bulan() {
  const url =
    `${SUPABASE_URL}/rest/v1/v_rata_3bulan_bulanan` +
    `?select=nama_komoditas,nama_bulan,harga_rata,persen_perubahan`;

  const data = await fetch(url, { headers }).then(r => r.json());
  if (!data.length) return;

  const bulanList = [...new Set(data.map(d => d.nama_bulan))];
  const map = {};

  data.forEach(d => {
    map[d.nama_komoditas] ??= {};
    map[d.nama_komoditas][d.nama_bulan] = d;
  });

  // HEADER BULAN
  const header = el("headerBulan");
  bulanList.forEach(b => {
    header.innerHTML += `<th>${b}</th>`;
  });

  // BODY
  let no = 1;
  const tbody = el("bodyTable");

  Object.keys(map).forEach(komoditas => {
    let row = `<tr>
      <td>${no++}</td>
      <td>${komoditas}</td>`;

    bulanList.forEach(b => {
      const d = map[komoditas][b];
      if (!d) {
        row += `<td>-</td>`;
      } else {
        const [icon, cls] = trendIcon(d.persen_perubahan);
        row += `
          <td>
            Rp ${d.harga_rata.toLocaleString("id-ID")}
            <span class="${cls}">${icon}</span>
          </td>`;
      }
    });

    row += `</tr>`;
    tbody.innerHTML += row;
  });

  buatNarasi(data);
}

/*************************************************
 * 3. NARASI ANALISIS OTOMATIS
 *************************************************/
function buatNarasi(data) {
  const naik = data.filter(d => d.persen_perubahan > 1);
  const turun = data.filter(d => d.persen_perubahan < -1);

  let narasi = "";

  if (naik.length) {
    const top = [...new Set(naik.map(d => d.nama_komoditas))].slice(0, 3);
    narasi =
      `Dalam tiga bulan terakhir, beberapa komoditas menunjukkan kecenderungan ` +
      `kenaikan harga, terutama ${top.join(", ")}. ` +
      `Kondisi ini perlu menjadi perhatian dalam pengendalian pasokan dan distribusi.`;
  } else if (turun.length) {
    narasi =
      `Secara umum, rata-rata harga komoditas dalam tiga bulan terakhir ` +
      `menunjukkan tren penurunan dan relatif terkendali.`;
  } else {
    narasi =
      `Rata-rata harga komoditas dalam tiga bulan terakhir relatif stabil ` +
      `dan belum menunjukkan tekanan kenaikan yang signifikan.`;
  }

  el("narasi").innerText = narasi;
}

/*************************************************
 * INIT
 *************************************************/
loadRingkasanBulanIni();
loadTabel3Bulan();
