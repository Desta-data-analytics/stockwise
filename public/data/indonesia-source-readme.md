# Retail Indonesia Omnichannel Sales Dataset

Dataset ini merupakan data simulasi penjualan **retail Indonesia** yang mencerminkan
operasional toko fisik dan kanal online (omnichannel) dengan struktur yang realistis
untuk kebutuhan pembelajaran data.

Dataset dibuat dengan pendekatan **business-oriented**, sehingga cocok digunakan
untuk analisis penjualan, biaya, profit, serta pembuatan dashboard BI.

---

## 📌 Konteks Dataset

- Brand retail lokal Indonesia (simulasi)
- Kanal penjualan:
  - Toko fisik
  - Marketplace (Shopee, Tokopedia)
  - Website
- Metode pembayaran lokal (QRIS, Transfer, Debit, Kartu Kredit)
- Event promosi musiman (Normal, Ramadhan, Harbolnas)

Dataset **tidak merepresentasikan data bisnis nyata** dan sepenuhnya bersifat simulasi.

---

## 📂 Struktur Data

Dataset terdiri dari **1 tabel transaksi utama** (flattened table),
di mana setiap baris merepresentasikan **1 transaksi penjualan**.

Nama file:
retail_indonesia_55k.csv


Jumlah data:
- ±55.000 baris transaksi

---

## 🧱 Deskripsi Kolom

| Kolom | Deskripsi |
|------|----------|
| order_id | ID unik transaksi |
| tanggal_transaksi | Tanggal dan waktu transaksi |
| channel_penjualan | Kanal penjualan (Toko, Shopee, Tokopedia, Website) |
| kota_toko | Kota lokasi toko atau tujuan pengiriman |
| provinsi | Provinsi di Indonesia |
| nama_produk | Nama produk retail lokal |
| kategori | Kategori produk |
| qty | Jumlah item terjual |
| harga_list | Harga normal produk |
| harga_jual | Harga jual setelah diskon |
| diskon_persen | Persentase diskon |
| total_penjualan | Total nilai penjualan |
| biaya_produksi | Biaya produksi produk |
| biaya_pengiriman | Biaya pengiriman |
| biaya_platform | Biaya marketplace / platform |
| total_biaya | Total seluruh biaya |
| profit | Keuntungan per transaksi |
| metode_pembayaran | Metode pembayaran |
| event_promo | Event promosi |

---

## 📊 Contoh Use Case

Dataset ini dapat digunakan untuk:

- Analisis penjualan retail Indonesia
- Perhitungan profit & margin
- Perbandingan performa channel (offline vs online)
- Analisis efektivitas promo
- Dashboard BI (Looker Studio, Power BI)
- Latihan SQL (aggregation, filtering, window function)
- Machine Learning dasar (sales prediction, profit analysis)

---

## 🧠 Cocok Untuk

- Pemula data analyst
- Mahasiswa
- Praktik Business Intelligence
- Konten edukasi data
- Demo dashboard Looker Studio / Power BI

---

## ⚠️ Catatan Penting

- Dataset ini bersifat **simulasi**
- Tidak mengandung data sensitif
- Tidak mencerminkan performa bisnis nyata

---

## 📜 Lisensi

Dataset ini dirilis dengan lisensi **CC0: Public Domain**
Bebas digunakan untuk pembelajaran, riset, dan eksperimen.

---

## 👤 Author

Dibuat oleh: **Lycus**
Tujuan: Dataset pembelajaran retail Indonesia yang realistis dan mudah digunakan
