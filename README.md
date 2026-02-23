# Random User Analytics

Aplikasi full-stack untuk mengonsumsi Random User API, menyimpan data ke database, dan menampilkan dashboard analitik.

## Fitur

- **Sinkronisasi Data** - Mengambil data dari Random User API dan menyimpan ke database SQLite
- **CRUD Operations** - Create, Read, Update, Delete data pengguna
- **Filter & Search** - Filter berdasarkan gender, negara, dan pencarian nama
- **Dashboard Analitik** - Visualisasi data dengan Chart.js:
  - Distribusi Gender (Pie Chart)
  - Distribusi Usia (Bar Chart)
  - Distribusi Negara (Bar Chart)
  - Timeline Sinkronisasi (Line Chart)
  - Distribusi Nationality (Doughnut Chart)
- **UI Modern** - Tema futuristik dengan animasi modern

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Frontend**: HTML5, CSS3, JavaScript
- **Charts**: Chart.js
- **Icons**: Heroicons
- **Font**: Google Fonts (Inter)

## Instalasi

1. Clone repository
```bash
git clone https://github.com/DzakiES/TelkomSigma.git
cd TelkomSigma
```

2. Install dependencies
```bash
npm install
```

3. Jalankan aplikasi
```bash
npm start
```

4. Buka browser dan akses `http://localhost:3000`

## Struktur Folder

```
├── data/               # Database SQLite
├── public/             # Frontend files
│   ├── css/           # Stylesheet
│   ├── js/            # JavaScript files
│   ├── index.html     # Halaman beranda
│   ├── dashboard.html # Halaman dashboard
│   └── management.html # Halaman manajemen data
├── routes/            # API routes
├── database.js        # Database configuration
├── server.js          # Express server
└── package.json
```

## API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/users` | Mendapatkan semua users dengan filter & pagination |
| GET | `/api/users/:id` | Mendapatkan user berdasarkan ID |
| POST | `/api/users` | Menambah user baru |
| PUT | `/api/users/:id` | Mengupdate user |
| DELETE | `/api/users/:id` | Menghapus user |
| POST | `/api/sync` | Sinkronisasi data dari Random User API |
| GET | `/api/dashboard/stats` | Statistik untuk dashboard |

## Screenshot

### Beranda
Halaman utama dengan navigasi ke fitur-fitur aplikasi.

### Dashboard
Visualisasi data dengan berbagai chart analitik.

### Manajemen Data
Tabel data dengan fitur CRUD, filter, dan pagination.

## Author

**Dzaki ES**

---
*Dibuat untuk Test Telkom Sigma*
