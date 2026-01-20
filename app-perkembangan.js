/*************************************************
 * KONFIGURASI SUPABASE
 *************************************************/
const SUPABASE_URL = "https://hkllhgmfbnepgtfnrxuj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbGxoZ21mYm5lcGd0Zm5yeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTA1NzQsImV4cCI6MjA4Mjc2NjU3NH0.Ft8giYKJIPPiGstRJXJNb_uuKQUuNlaAM8p2dE2UKs0";
/*************************************************
 * HELPER
 *************************************************/
async function loadFilterTahun() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/v_tahun_data?select=tahun`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await res.json();
    const select = document.getElementById('filterTahun');
    select.innerHTML = '';

    const tahunSekarang = new Date().getFullYear();

    data.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.tahun;
      opt.textContent = d.tahun;

      // otomatis pilih tahun berjalan jika ada
      if (d.tahun === tahunSekarang) {
        opt.selected = true;
      }

      select.appendChild(opt);
    });

  } catch (err) {
    console.error('Gagal load tahun:', err);
  }
}
async function loadFilterKomoditas() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/komoditas?select=id_komoditas,nama_komoditas&order=nama_komoditas.asc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await res.json();
    const select = document.getElementById('filterKomoditas');

    // reset
    select.innerHTML = `<option value="">Semua Komoditas</option>`;

    data.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id_komoditas;
      opt.textContent = d.nama_komoditas;
      select.appendChild(opt);
    });

  } catch (err) {
    console.error('Gagal load komoditas:', err);
  }
}
async function loadFilterPasar() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/pasar?select=id_pasar,nama_pasar,kecamatan&order=nama_pasar.asc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await res.json();
    const select = document.getElementById('filterPasar');

    // reset
    select.innerHTML = `<option value="">Semua Pasar</option>`;

    data.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id_pasar;
      opt.textContent = `${d.nama_pasar} (${d.kecamatan})`;
      select.appendChild(opt);
    });

  } catch (err) {
    console.error('Gagal load pasar:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadFilterTahun();
  loadFilterKomoditas();
  loadFilterPasar();
});


