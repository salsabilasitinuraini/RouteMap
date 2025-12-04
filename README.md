# RouteMate 🏃‍♂️🚴‍♀️

## 📱 Nama Produk
**RouteMate** - Platform Berbagi Rute Olahraga Berbasis Komunitas

---

## 📖 Deskripsi Produk

RouteMap adalah platform sosial mobile untuk berbagi, menemukan, dan mengikuti rute olahraga dengan GPS tracking, photo sharing, dan safety rating berbasis komunitas. Aplikasi ini memungkinkan pengguna untuk:

- 🗺️ **Menemukan Rute Baru**: Jelajahi rute olahraga yang dibagikan oleh komunitas lokal
- 📍 **GPS Tracking Real-time**: Rekam rute olahraga dengan GPS tracking yang akurat
- 📸 **Dokumentasi Visual**: Upload foto dan catatan di lokasi menarik sepanjang rute
- ⚠️ **Safety Rating**: Dapatkan informasi keamanan jalur berbasis crowdsourcing
- 👥 **Komunitas Lokal**: Terhubung dengan komunitas olahraga di area sekitar
- 💪 **Statistik Personal**: Pantau progres dan pencapaian olahraga Anda

### Target Pengguna
- Runner yang mencari variasi rute lari
- Cyclist yang ingin menemukan jalur sepeda aman
- Walker yang suka eksplorasi jalur jalan kaki
- Content creator yang mendokumentasikan journey olahraga

### Masalah yang Diselesaikan
- ❌ Keterbatasan informasi rute olahraga yang aman dan menarik
- ❌ Tidak ada platform untuk berbagi pengalaman olahraga lokal
- ❌ Kurangnya informasi real-time tentang keamanan jalur
- ❌ Sulit mendokumentasikan rute dengan foto dan catatan lokasi

---

## 🛠️ Komponen Pembangun Produk

### Frontend (Mobile App)
```
React Native + TypeScript
├── React Native 0.74+          - Framework mobile cross-platform
├── Expo SDK 51+                - Development toolchain & APIs
├── React Navigation v6         - Routing dan navigasi antar screen
├── React Native Maps           - Visualisasi peta dan GPS tracking
├── Expo Location               - GPS tracking & geolocation services
├── Expo Image Picker           - Akses kamera dan galeri foto
├── React Native Gesture Handler - Gesture dan touch interactions
└── React Native Reanimated    - Animasi smooth dan performa tinggi
```

### Backend (Supabase)
```
Supabase (Backend-as-a-Service)
├── PostgreSQL Database         - Database relational untuk data app
│   ├── profiles               - Data pengguna
│   ├── routes                 - Data rute olahraga
│   ├── location_points        - Foto dan catatan lokasi
│   ├── route_likes            - Sistem like
│   └── comments               - Sistem komentar
│
├── Supabase Auth              - Autentikasi pengguna (email/password)
├── Supabase Storage           - Storage untuk foto pengguna
├── Row Level Security (RLS)   - Keamanan data tingkat baris
└── REST API                   - API otomatis dari database
```

### Development Tools
```
├── TypeScript                 - Type-safe JavaScript
├── ESLint                     - Code linting
├── Prettier                   - Code formatting
├── Git                        - Version control
└── VS Code                    - Code editor
```

---

## 📊 Sumber Data

### Database Schema (PostgreSQL via Supabase)

#### 1. **profiles** - Data Pengguna
```sql
- id: UUID (Primary Key)
- username: TEXT (Unique)
- avatar_url: TEXT
- bio: TEXT
- created_at: TIMESTAMP
```

#### 2. **routes** - Data Rute Olahraga
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key → profiles)
- title: TEXT
- description: TEXT
- sport_type: ENUM('running', 'cycling', 'walking')
- distance: NUMERIC (dalam meter)
- duration: TEXT (format: "HH:MM:SS")
- safety_rating: ENUM('safe', 'moderate', 'unsafe')
- polyline: JSONB (array koordinat [{lat, lng}])
- likes_count: INTEGER
- created_at: TIMESTAMP
```

#### 3. **location_points** - Foto & Catatan Lokasi
```sql
- id: UUID (Primary Key)
- route_id: UUID (Foreign Key → routes)
- latitude: NUMERIC
- longitude: NUMERIC
- photo_url: TEXT
- note: TEXT
- is_warning: BOOLEAN (untuk lokasi berbahaya)
- created_at: TIMESTAMP
```

#### 4. **route_likes** - Sistem Like
```sql
- route_id: UUID (Foreign Key → routes)
- user_id: UUID (Foreign Key → profiles)
- created_at: TIMESTAMP
- PRIMARY KEY: (route_id, user_id)
```

#### 5. **comments** - Sistem Komentar
```sql
- id: UUID (Primary Key)
- route_id: UUID (Foreign Key → routes)
- user_id: UUID (Foreign Key → profiles)
- text: TEXT
- created_at: TIMESTAMP
```

### Storage Bucket
```
route-photos/
└── {user_id}/
    └── {route_id}/
        └── {timestamp}.jpg
```

### External Data Sources
- **GPS Data**: Real-time dari device sensor (Expo Location API)
- **Map Data**: OpenStreetMap (via React Native Maps)
- **User Generated Content**: Foto, catatan, dan rating dari pengguna

---

## 📸 Tangkapan Layar Komponen Penting

### 1. Authentication Flow
**Login & Register Screen**
<p align="center">
  <img src="assets/login.jpg" width="200">
  <img src="assets/register.jpg" width="200">
</p>

*Fitur: Email/password authentication, form validation, auto-login*

---

### 2. Feed Screen (Home)
**Discover Routes from Community**
<p align="center">
  <img src="assets/feed.jpg" width="200">
  <img src="assets/feed2.jpg" width="200">
  <img src="assets/detail.jpg" width="200">
  <img src="assets/detail2.jpg" width="200">
</p>

*Fitur: Real-time feed, route cards, like/comment, filter by sport type*

---

### 3. Track Screen
**Record New Route with GPS**
<p align="center">
  <img src="assets/track1.jpg" width="200">
  <img src="assets/track2.jpg" width="200">
    <img src="assets/simpanrute.jpg" width="200">
</p>

*Fitur: GPS tracking, real-time polyline, distance/duration calculation, photo upload*

---

### 4. Explore Screen (Map View)
**Browse All Routes on Map**
<p align="center">
  <img src="assets/explore1.jpg" width="200">
  <img src="assets/explore2.jpg" width="200">
</p>
*Fitur: Interactive map, clustered markers, filter by sport, route preview*

---

### 5. Route Detail Screen
**View Route with Photos & Comments**
<p align="center">
  <img src="assets/detail.jpg" width="200">
  <img src="assets/detail2.jpg" width="200">
</p>
*Fitur: Route visualization, stats, photo gallery, comments, like button*

---

### 6. Profile Screen
**User Profile & Statistics**
<p align="center">
  <img src="assets/halaman profil.jpg" width="200">
  <img src="assets/editprofil.jpg" width="200">
    <img src="assets/logout.jpg" width="200">
</p>
*Fitur: Profile info, statistics, route management, edit profile*

---

### 7. Add Photo Modal
**Upload Photo at Location**
<p align="center">
  <img src="assets/addmodal.jpg" width="200">
</p>
*Fitur: Photo upload, note input, warning flag, auto-location capture*

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────┐
│         MOBILE APP (React Native)           │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │   Feed   │  │  Track   │  │ Explore  │ │
│  └──────────┘  └──────────┘  └──────────┘ │
│  ┌──────────┐  ┌──────────┐               │
│  │  Stats   │  │ Profile  │               │
│  └──────────┘  └──────────┘               │
└──────────────┬──────────────────────────────┘
               │
               │ REST API (HTTPS)
               │
┌──────────────▼──────────────────────────────┐
│         SUPABASE BACKEND                    │
│                                             │
│  ┌────────────────┐  ┌──────────────────┐  │
│  │  PostgreSQL    │  │  Authentication  │  │
│  │   Database     │  │     Service      │  │
│  └────────────────┘  └──────────────────┘  │
│                                             │
│  ┌────────────────┐  ┌──────────────────┐  │
│  │    Storage     │  │   Row Level      │  │
│  │   (Photos)     │  │    Security      │  │
│  └────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## 🚀 Cara Menjalankan Aplikasi

### Prerequisites
- Node.js 18+ dan npm/yarn
- Expo CLI (`npm install -g expo-cli`)
- Akun Supabase (gratis)
- Android Studio / Xcode (untuk emulator)
- Expo Go app (untuk testing di device fisik)

### Installation

1. **Clone repository**
```bash
git clone https://github.com/yourusername/routemate.git
cd routemate
```

2. **Install dependencies**
```bash
npm install
# atau
yarn install
```

3. **Setup Supabase**
- Buat project di [supabase.com](https://supabase.com)
- Copy URL dan anon key dari project settings
- Buat file `src/config/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

4. **Setup Database**
- Jalankan SQL migrations di Supabase SQL Editor
- Setup Row Level Security policies
- Buat storage bucket `route-photos`

5. **Run aplikasi**
```bash
# Development mode
npm start

# iOS
npm run ios

# Android
npm run android
```

---

## 🔐 Security & Privacy

### Row Level Security (RLS) Policies
```sql
-- Profiles: Public read, owner write
✅ Siapapun bisa melihat profil pengguna
✅ Hanya pemilik yang bisa edit profil mereka

-- Routes: Public read, authenticated write
✅ Siapapun bisa melihat rute
✅ Hanya user login yang bisa membuat rute
✅ Hanya pemilik rute yang bisa edit/hapus

-- Location Points: Public read, owner write
✅ Siapapun bisa melihat foto dan catatan
✅ Hanya pemilik rute yang bisa menambah point

-- Likes & Comments: Authenticated actions
✅ User login bisa like dan comment
✅ User bisa hapus komentar sendiri
```

---

## 📈 Fitur Utama

- ✅ **Authentication**: Email/password login & registration
- ✅ **GPS Tracking**: Real-time GPS tracking dengan polyline visualization
- ✅ **Photo Upload**: Upload foto dengan kompresi otomatis
- ✅ **Safety Rating**: Tag rute sebagai Safe/Moderate/Unsafe
- ✅ **Social Features**: Like, comment pada rute
- ✅ **Map Exploration**: Interactive map dengan semua rute
- ✅ **User Profile**: Statistik personal dan route management
- ✅ **Feed Discovery**: Browse rute dari komunitas
- ✅ **Location Notes**: Tambah catatan di lokasi spesifik
- ✅ **Sport Type Filter**: Filter rute berdasarkan jenis olahraga

---

## 🛣️ Roadmap

### ✅ Phase 1: MVP (Completed)
- Core features (Track, Feed, Explore, Profile)
- GPS tracking & photo upload
- Basic social features (like, comment)

### 🔄 Phase 2: Enhancements (In Progress)
- [ ] Push notifications
- [ ] Follow/Followers system
- [ ] Private routes option
- [ ] Dark mode support

### 📅 Phase 3: Advanced Features (Planned)
- [ ] Route recommendations (AI-based)
- [ ] Live location sharing
- [ ] Challenges & achievements
- [ ] Export to GPX
- [ ] Offline mode

---

## 🤝 Contributing

Kontribusi sangat diterima! Silakan:

1. Fork repository ini
2. Buat branch baru (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

---

## 👨‍💻 Developer

**[Your Name]**
- GitHub: (https://github.com/salsabilasitinuraini)
- Email: salsabilasitinuraini@mail.ugm.ac.id
---

## 🙏 Acknowledgments

- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/)
- [Supabase](https://supabase.com/)
- [React Navigation](https://reactnavigation.org/)
- OpenStreetMap contributors

---

**RouteMate** - *Share Your Route, Build Your Community* 🏃‍♂️🚴‍♀️🚶‍♂️
