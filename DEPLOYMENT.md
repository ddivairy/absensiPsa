# Deploy ke Vercel

## Konfigurasi project

Hubungkan repository ke Vercel dan gunakan perintah build `npm run build` dengan output directory `dist`. File `api/[...path].ts` meneruskan semua request `/api/*` ke Express. Function ditempatkan di region Singapore (`sin1`) agar dekat dengan cluster TiDB Asia Tenggara.

## Environment variables

Tambahkan variabel berikut pada Vercel Project Settings → Environment Variables. Isi nilainya di dashboard Vercel; jangan commit file `.env`.

- `TIDB_HOST`, `TIDB_PORT`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_DATABASE` (atau gunakan `DATABASE_URL` bila memilih konfigurasi URL)
- `JWT_SECRET` (gunakan secret acak panjang)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `CLIENT_ORIGIN` hanya bila frontend/API diakses dari origin berbeda; untuk beberapa origin, pisahkan dengan koma
- `VITE_API_URL` biarkan kosong bila frontend dan API berada di project/domain Vercel yang sama

Atur variabel untuk environment Preview dan Production yang dipakai, lalu buat deployment baru setelah mengubahnya.

## Pemeriksaan setelah deploy

1. Buka `/api/health` dan pastikan status API berhasil serta TiDB tersambung.
2. Uji login, pemuatan data, check-in/check-out, unggah laporan, dan foto profil pada deployment Preview sebelum mengarahkan domain produksi.
3. Pastikan firewall/network policy TiDB mengizinkan koneksi dari Vercel. Alamat egress Vercel dapat berbeda; gunakan solusi egress yang sesuai dengan kebijakan cluster.

Deployment dan koneksi TiDB live perlu diverifikasi dari project Vercel karena tidak dapat dipastikan hanya dari build lokal.
