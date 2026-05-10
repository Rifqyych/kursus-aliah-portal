import { useEffect, useMemo, useState } from "react";
import { seedCourses } from "./data/seed";
import { useLocalState } from "./hooks/useLocalState";
import { formatCurrency, formatDate } from "./utils/format";
import { supabase } from "./supabase";

const adminPin = "1987";
const adminSecretPath = "admin-aliah";

const pages = [
  { id: "home", label: "Beranda" },
  { id: "courses", label: "Program" },
  { id: "schedule", label: "Jadwal" },
  { id: "locations", label: "Lokasi" },
  { id: "register", label: "Pendaftaran" },
  { id: "status", label: "Cek Status" },
  { id: "certificate", label: "Sertifikat" },
];

const locations = [
  {
    id: "maccini",
    title: "Cabang Aliah Maccini",
    image: "/cabang-maccini.jpg",
    address: "Jl. Urip Sumoharjo No.240, Maccini, Kec. Makassar, Kota Makassar, Sulawesi Selatan 90144",
    mapsLink: "https://maps.google.com/?q=Jl.+Urip+Sumoharjo+No.240,+Makassar",
  },
  {
    id: "tamalanrea",
    title: "Cabang Aliah Tamalanrea",
    image: "/cabang-tamalanrea.jpg",
    address: "VGF2+3G9, Tamalanrea, Kota Makassar, Sulawesi Selatan 90245",
    mapsLink: "https://maps.google.com/?q=Tamalanrea,+Makassar",
  },
];

const scheduleItems = [
  {
    id: "sch-1",
    courseId: "drive-xenia",
    branchId: "maccini",
    day: "Senin, Rabu, Jumat",
    time: "16.00 - 17.30",
    mentor: "Kak Aisyah",
    mode: "Offline",
    level: "Pemula",
    seats: 12,
  },
  {
    id: "sch-2",
    courseId: "drive-new-xenia",
    branchId: "tamalanrea",
    day: "Selasa, Kamis, Sabtu",
    time: "15.30 - 17.00",
    mentor: "Kak Rahma",
    mode: "Offline",
    level: "Menengah",
    seats: 10,
  },
  {
    id: "sch-3",
    courseId: "drive-avanza",
    branchId: "maccini",
    day: "Senin, Rabu, Jumat",
    time: "19.00 - 20.30",
    mentor: "Kak Fikri",
    mode: "Hybrid",
    level: "Pemula",
    seats: 8,
  },
  {
    id: "sch-4",
    courseId: "drive-new-avanza",
    branchId: "tamalanrea",
    day: "Sabtu",
    time: "09.00 - 11.00",
    mentor: "Kak Nabila",
    mode: "Offline",
    level: "Intensif",
    seats: 15,
  },
  {
    id: "sch-5",
    courseId: "drive-avanza-veloz",
    branchId: "maccini",
    day: "Selasa, Kamis, Sabtu",
    time: "13.30 - 15.00",
    mentor: "Kak Dinda",
    mode: "Online",
    level: "Pemula",
    seats: 20,
  },
  {
    id: "sch-6",
    courseId: "drive-jazz",
    branchId: "tamalanrea",
    day: "Senin, Rabu, Jumat",
    time: "17.30 - 19.00",
    mentor: "Kak Rizal",
    mode: "Offline",
    level: "Menengah",
    seats: 9,
  },
];

const homeHighlights = [
  {
    title: "Program mudah dipilih",
    description: "Kategori kursus dipisahkan dengan rapi supaya pengunjung booth bisa cepat menemukan yang paling cocok.",
  },
  {
    title: "Jadwal lebih jelas",
    description: "Calon peserta bisa melihat hari, jam, cabang, dan ketersediaan kelas tanpa harus bertanya satu per satu.",
  },
  {
    title: "Proses peserta tertata",
    description: "Mulai dari pendaftaran, cek status, sampai pengambilan sertifikat dibuat dalam satu alur yang gampang dipahami.",
  },
];

const statusFlow = ["Baru", "Dikonfirmasi", "Menunggu kelas", "Sedang belajar", "Selesai"];

const initialForm = {
  fullName: "",
  phone: "",
  schoolOrigin: "",
  courseId: "",
  preferredDay: "Senin, Rabu, Jumat",
  preferredTime: "Sore",
  note: "",
};

function createCode() {
  const datePart = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  const randomPart = Math.floor(100 + Math.random() * 900);
  return `ALH-${datePart}-${randomPart}`;
}

function getStatusStepIndex(status) {
  return statusFlow.indexOf(status);
}

function App() {
  const urlHash = window.location.hash.replace("#", "");
  const isAdminPath = urlHash === adminSecretPath;

  const [page, setPage] = useState(isAdminPath ? "admin" : "home");
  const [isAdminMode, setIsAdminMode] = useState(isAdminPath);

  function handleSetPage(newPage) {
    if (newPage === "admin") {
      setIsAdminMode(true);
    }
    setPage(newPage);
  }
  const [courses, setCourses] = useLocalState("aliah-courses", seedCourses);
  const [enrollments, setEnrollments] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState(seedCourses[0]?.id ?? "");
  const [adminOpen, setAdminOpen] = useLocalState("aliah-admin-open", false);

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? courses[0];

  const categories = useMemo(() => {
    return [...new Set(courses.map((course) => course.category))];
  }, [courses]);

  const stats = useMemo(() => {
    const cheapest = courses.reduce((value, course) => Math.min(value, course.price), courses[0]?.price ?? 0);
    return {
      totalCourses: courses.length,
      totalCategories: categories.length,
      totalEnrollments: enrollments.length,
      cheapest,
    };
  }, [categories.length, courses, enrollments.length]);

  // Ambil data dari Supabase saat pertama kali buka
  useEffect(() => {
    async function fetchEnrollments() {
      setLoadingEnrollments(true);
      const { data, error } = await supabase
        .from("enrollments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Gagal ambil data:", error);
      } else {
        // Konversi field dari Supabase ke format yang dipakai di App
        const mapped = (data || []).map((item) => ({
          id: item.id,
          code: item.kode,
          fullName: item.nama,
          phone: item.no_hp,
          schoolOrigin: item.sekolah,
          courseId: item.program,
          courseName: item.program,
          preferredDay: item.jadwal,
          preferredTime: "",
          note: item.catatan,
          status: item.status || "Baru",
          createdAt: new Date(item.created_at).getTime(),
          certificateFile: item.sertifikat || "",
          certificateFileName: item.sertifikat ? item.sertifikat.split("/").pop() : "",
          certificateFileType: item.sertifikat ? (item.sertifikat.endsWith(".pdf") ? "application/pdf" : "image/jpeg") : "",
          certificateNumber: `SRT-${item.kode}`,
          certificateUploadedAt: item.sertifikat ? Date.now() : null,
        }));
        setEnrollments(mapped);
      }
      setLoadingEnrollments(false);
    }

    fetchEnrollments();
  }, []);

  async function handleRegister(payload) {
    const pickedCourse = courses.find((course) => course.id === payload.courseId);

    if (!pickedCourse) {
      return { ok: false, message: "Program belum dipilih." };
    }

    const kode = createCode();

    const { data, error } = await supabase
      .from("enrollments")
      .insert([
        {
          nama: payload.fullName,
          no_hp: payload.phone,
          sekolah: payload.schoolOrigin,
          program: pickedCourse.title,
          jadwal: `${payload.preferredDay} - ${payload.preferredTime}`,
          catatan: payload.note,
          kode: kode,
          status: "Baru",
          sertifikat: "",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Gagal daftar:", error);
      return { ok: false, message: "Pendaftaran gagal. Coba lagi." };
    }

    const newItem = {
      id: data.id,
      code: data.kode,
      fullName: data.nama,
      phone: data.no_hp,
      schoolOrigin: data.sekolah,
      courseId: payload.courseId,
      courseName: data.program,
      preferredDay: payload.preferredDay,
      preferredTime: payload.preferredTime,
      note: data.catatan,
      status: data.status,
      createdAt: new Date(data.created_at).getTime(),
      certificateFile: "",
      certificateFileName: "",
      certificateFileType: "",
      certificateNumber: "",
      certificateUploadedAt: null,
    };

    setEnrollments((current) => [newItem, ...current]);

    return {
      ok: true,
      message: `Pendaftaran berhasil. Kode kamu: ${kode}`,
      data: newItem,
    };
  }

  function handlePriceChange(courseId, nextPrice) {
    setCourses((current) =>
      current.map((course) =>
        course.id === courseId ? { ...course, price: Number(nextPrice) || 0 } : course
      )
    );
  }

  async function handleStatusChange(enrollmentId, nextStatus) {
    const { error } = await supabase
      .from("enrollments")
      .update({ status: nextStatus })
      .eq("id", enrollmentId);

    if (error) {
      console.error("Gagal update status:", error);
      return;
    }

    setEnrollments((current) =>
      current.map((item) => (item.id === enrollmentId ? { ...item, status: nextStatus } : item))
    );
  }

  async function handleDeleteEnrollment(enrollmentId) {
    const { error } = await supabase
      .from("enrollments")
      .delete()
      .eq("id", enrollmentId);

    if (error) {
      console.error("Gagal hapus:", error);
      return;
    }

    setEnrollments((current) => current.filter((item) => item.id !== enrollmentId));
  }

  async function handleCertificateUpload(enrollmentId, file, certificateNumber) {
    if (!file) {
      return { ok: false, message: "File sertifikat belum dipilih." };
    }

    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      return { ok: false, message: "File harus PDF, JPG, JPEG, PNG, atau WEBP." };
    }

    if (file.size > 1500000) {
      return { ok: false, message: "Ukuran file terlalu besar. Maksimal 1.5 MB." };
    }

    const target = enrollments.find((item) => item.id === enrollmentId);

    if (!target) {
      return { ok: false, message: "Data peserta tidak ditemukan." };
    }

    if (target.status !== "Selesai") {
      return { ok: false, message: "Status peserta harus Selesai dulu." };
    }

    const certNum = certificateNumber.trim() || `SRT-${target.code}`;
    const fileExt = file.name.split(".").pop();
    const fileName = `${certNum}.${fileExt}`;

    // Upload file ke Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("sertifikat")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error("Gagal upload file:", uploadError);
      return { ok: false, message: "Gagal upload file sertifikat." };
    }

    // Ambil URL publik file
    const { data: urlData } = supabase.storage
      .from("sertifikat")
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Simpan URL ke database
    const { error: dbError } = await supabase
      .from("enrollments")
      .update({ sertifikat: publicUrl })
      .eq("id", enrollmentId);

    if (dbError) {
      console.error("Gagal simpan URL:", dbError);
      return { ok: false, message: "Gagal menyimpan data sertifikat." };
    }

    setEnrollments((current) =>
      current.map((item) =>
        item.id === enrollmentId
          ? {
              ...item,
              certificateFile: publicUrl,
              certificateFileName: file.name,
              certificateFileType: file.type,
              certificateNumber: certNum,
              certificateUploadedAt: Date.now(),
            }
          : item
      )
    );

    return { ok: true, message: "Sertifikat berhasil diupload!" };
  }

  function handleAdminLogin(pin) {
    if (pin === adminPin) {
      setAdminOpen(true);
      return true;
    }
    return false;
  }

  function handlePickCourse(courseId) {
    setSelectedCourseId(courseId);
    handleSetPage("register");
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="container topbar-inner">
          <button type="button" className="brand" onClick={() => handleSetPage("home")}>
            <img src="/logo-aliah.jpeg" alt="Logo Kursus Aliah" className="brand-logo" />
            <span>
              <strong>Kursus Aliah</strong>
              <small>Makassar</small>
            </span>
          </button>

          <nav className="nav">
            {pages.map((item) => (
              <button
                type="button"
                key={item.id}
                className={page === item.id ? "nav-link active" : "nav-link"}
                onClick={() => handleSetPage(item.id)}
              >
                {item.label}
              </button>
            ))}
            {isAdminMode ? (
              <button
                type="button"
                className={page === "admin" ? "nav-link active" : "nav-link"}
                onClick={() => handleSetPage("admin")}
              >
                Admin
              </button>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="container main-content">
        {page === "home" ? (
          <HomeSection
            categories={categories}
            courses={courses}
            highlights={homeHighlights}
            locations={locations}
            onOpenRegister={handlePickCourse}
            onSeeCertificate={() => handleSetPage("certificate")}
            onSeeCourses={() => handleSetPage("courses")}
            onSeeLocations={() => handleSetPage("locations")}
            onSeeSchedule={() => handleSetPage("schedule")}
            scheduleItems={scheduleItems}
            stats={stats}
          />
        ) : null}

        {page === "courses" ? (
          <CoursesSection courses={courses} onOpenRegister={handlePickCourse} />
        ) : null}

        {page === "schedule" ? (
          <ScheduleSection
            courses={courses}
            locations={locations}
            onOpenRegister={handlePickCourse}
            scheduleItems={scheduleItems}
          />
        ) : null}

        {page === "locations" ? <LocationsSection locations={locations} /> : null}

        {page === "register" ? (
          <RegisterSection
            courses={courses}
            initialCourseId={selectedCourse?.id ?? ""}
            onSubmit={handleRegister}
          />
        ) : null}

        {page === "status" ? (
          <StatusSection
            enrollments={enrollments}
            loading={loadingEnrollments}
            onOpenCertificate={() => handleSetPage("certificate")}
          />
        ) : null}

        {page === "certificate" ? (
          <CertificateSection enrollments={enrollments} loading={loadingEnrollments} />
        ) : null}

        {page === "admin" ? (
          <AdminSection
            adminOpen={adminOpen}
            courses={courses}
            enrollments={enrollments}
            loading={loadingEnrollments}
            onCertificateUpload={handleCertificateUpload}
            onDeleteEnrollment={handleDeleteEnrollment}
            onLogin={handleAdminLogin}
            onLogout={() => { setAdminOpen(false); setIsAdminMode(false); handleSetPage("home"); }}
            onPriceChange={handlePriceChange}
            onStatusChange={handleStatusChange}
          />
        ) : null}
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div>
            <strong>Kursus Aliah</strong>
            <p>Website informasi, jadwal, pendaftaran, sertifikat, lokasi, dan pengelolaan kursus.</p>
          </div>
          <div>
            <strong>Kontak</strong>
            <p>Instagram: @aliahkursus</p>
            <p>WhatsApp: 0812-4218-1987</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HomeSection({
  categories,
  courses,
  highlights,
  locations,
  onOpenRegister,
  onSeeCertificate,
  onSeeCourses,
  onSeeLocations,
  onSeeSchedule,
  scheduleItems,
  stats,
}) {
  const featured = courses.slice(0, 4);
  const locationPreview = locations.slice(0, 2);
  const schedulePreview = scheduleItems.slice(0, 4);

  return (
    <div className="page-stack">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Website Resmi</span>
          <h1>Belajar lebih terarah, daftar lebih mudah, dan informasi kursus lebih jelas.</h1>
          <p>
            Kursus Aliah menghadirkan program belajar yang bisa dipilih sesuai kebutuhan. Pengunjung
            bisa melihat program, mengecek jadwal, lalu langsung mendaftar dari satu tampilan yang
            rapi dan mudah dipahami.
          </p>
          <div className="hero-actions">
            <button type="button" className="button-primary" onClick={onSeeCourses}>
              Lihat Program
            </button>
            <button type="button" className="button-secondary" onClick={onSeeSchedule}>
              Cek Jadwal
            </button>
            <button type="button" className="button-secondary" onClick={() => onOpenRegister(courses[0]?.id ?? "")}>
              Daftar Sekarang
            </button>
            <button type="button" className="button-secondary" onClick={onSeeCertificate}>
              Cek Sertifikat
            </button>
          </div>
        </div>

        <div className="hero-stats">
          <article className="stat-card">
            <span>Total Program</span>
            <strong>{stats.totalCourses}</strong>
          </article>
          <article className="stat-card">
            <span>Kategori</span>
            <strong>{stats.totalCategories}</strong>
          </article>
          <article className="stat-card">
            <span>Biaya Mulai</span>
            <strong>{formatCurrency(stats.cheapest)}</strong>
          </article>
          <article className="stat-card">
            <span>Total Pendaftar</span>
            <strong>{stats.totalEnrollments}</strong>
          </article>
        </div>
      </section>

      <section className="surface">
        <div className="section-head">
          <div>
            <span className="eyebrow">Keunggulan</span>
            <h2>Kenapa tampilan ini enak dipakai di booth</h2>
          </div>
        </div>
        <div className="grid cards-3">
          {highlights.map((item) => (
            <article key={item.title} className="course-card">
              <span className="course-category">Layanan Utama</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="surface">
        <div className="section-head">
          <div>
            <span className="eyebrow">Kategori</span>
            <h2>Bidang kursus yang tersedia</h2>
          </div>
        </div>
        <div className="category-list">
          {categories.map((category) => (
            <span key={category} className="pill">
              {category}
            </span>
          ))}
        </div>
      </section>

      <section className="surface">
        <div className="section-head">
          <div>
            <span className="eyebrow">Program Pilihan</span>
            <h2>Program yang paling sering ditanyakan</h2>
          </div>
          <button type="button" className="button-secondary" onClick={onSeeCourses}>
            Lihat semua program
          </button>
        </div>
        <div className="grid cards-4">
          {featured.map((course) => (
            <article key={course.id} className="course-card">
              <span className="course-category">{course.category}</span>
              <h3>{course.title}</h3>
              <p>{course.durationLabel}</p>
              <strong>{formatCurrency(course.price)}</strong>
              <button type="button" className="text-button" onClick={() => onOpenRegister(course.id)}>
                Ambil program
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="surface">
        <div className="section-head">
          <div>
            <span className="eyebrow">Jadwal Kelas</span>
            <h2>Beberapa jadwal yang sedang dibuka</h2>
          </div>
          <button type="button" className="button-secondary" onClick={onSeeSchedule}>
            Lihat semua jadwal
          </button>
        </div>

        <div className="grid cards-2 schedule-grid">
          {schedulePreview.map((item) => {
            const course = courses.find((entry) => entry.id === item.courseId) ?? courses[0];
            const branch = locations.find((location) => location.id === item.branchId);

            return (
              <article key={item.id} className="schedule-card">
                <div className="schedule-head">
                  <span className="schedule-badge">{item.level}</span>
                  <span className="schedule-mode">{item.mode}</span>
                </div>
                <h3>{course?.title ?? "Program Kursus"}</h3>
                <div className="schedule-meta">
                  <span>Hari: {item.day}</span>
                  <span>Jam: {item.time}</span>
                  <span>Cabang: {branch?.title ?? "-"}</span>
                  <span>Mentor: {item.mentor}</span>
                  <span>Sisa kursi: {item.seats}</span>
                </div>
                <button
                  type="button"
                  className="button-primary wide"
                  onClick={() => onOpenRegister(course?.id ?? "")}
                >
                  Ambil jadwal ini
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="surface">
        <div className="section-head">
          <div>
            <span className="eyebrow">Lokasi Kursus</span>
            <h2>Cabang yang bisa dipilih</h2>
          </div>
          <button type="button" className="button-secondary" onClick={onSeeLocations}>
            Lihat semua lokasi
          </button>
        </div>

        <div className="grid cards-2">
          {locationPreview.map((location) => (
            <article key={location.id} className="location-card">
              <img src={location.image} alt={location.title} className="location-image" />
              <div className="location-body">
                <h3>{location.title}</h3>
                <p>{location.address}</p>
                <a
                  href={location.mapsLink}
                  target="_blank"
                  rel="noreferrer"
                  className="button-secondary location-link"
                >
                  Buka Google Maps
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ScheduleSection({ courses, locations, onOpenRegister, scheduleItems }) {
  const [branchFilter, setBranchFilter] = useState("Semua");
  const [dayFilter, setDayFilter] = useState("Semua");
  const [modeFilter, setModeFilter] = useState("Semua");

  const branchOptions = locations.map((location) => location.id);
  const dayOptions = [...new Set(scheduleItems.map((item) => item.day))];
  const modeOptions = [...new Set(scheduleItems.map((item) => item.mode))];

  const filteredSchedules = useMemo(() => {
    return scheduleItems.filter((item) => {
      const matchesBranch = branchFilter === "Semua" || item.branchId === branchFilter;
      const matchesDay = dayFilter === "Semua" || item.day === dayFilter;
      const matchesMode = modeFilter === "Semua" || item.mode === modeFilter;
      return matchesBranch && matchesDay && matchesMode;
    });
  }, [branchFilter, dayFilter, modeFilter, scheduleItems]);

  return (
    <div className="page-stack">
      <section className="page-intro">
        <span className="eyebrow">Jadwal Kelas</span>
        <h1>Lihat jadwal kursus yang tersedia</h1>
        <p>Pilih cabang, hari, dan mode belajar yang paling sesuai dengan kebutuhanmu.</p>
      </section>

      <section className="surface">
        <div className="filter-grid">
          <label>
            Cabang
            <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
              <option>Semua</option>
              {branchOptions.map((branchId) => {
                const branch = locations.find((location) => location.id === branchId);
                return (
                  <option key={branchId} value={branchId}>
                    {branch?.title ?? branchId}
                  </option>
                );
              })}
            </select>
          </label>

          <label>
            Hari
            <select value={dayFilter} onChange={(event) => setDayFilter(event.target.value)}>
              <option>Semua</option>
              {dayOptions.map((day) => (
                <option key={day}>{day}</option>
              ))}
            </select>
          </label>

          <label>
            Mode Belajar
            <select value={modeFilter} onChange={(event) => setModeFilter(event.target.value)}>
              <option>Semua</option>
              {modeOptions.map((mode) => (
                <option key={mode}>{mode}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="grid cards-2 schedule-grid">
        {filteredSchedules.map((item) => {
          const course = courses.find((entry) => entry.id === item.courseId) ?? courses[0];
          const branch = locations.find((location) => location.id === item.branchId);

          return (
            <article key={item.id} className="schedule-card">
              <div className="schedule-head">
                <span className="schedule-badge">{item.level}</span>
                <span className="schedule-mode">{item.mode}</span>
              </div>
              <h3>{course?.title ?? "Program Kursus"}</h3>
              <div className="schedule-meta">
                <span>Hari: {item.day}</span>
                <span>Jam: {item.time}</span>
                <span>Cabang: {branch?.title ?? "-"}</span>
                <span>Mentor: {item.mentor}</span>
                <span>Sisa kursi: {item.seats}</span>
              </div>
              <button
                type="button"
                className="button-primary wide"
                onClick={() => onOpenRegister(course?.id ?? "")}
              >
                Daftar jadwal ini
              </button>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function LocationsSection({ locations }) {
  return (
    <div className="page-stack">
      <section className="page-intro">
        <span className="eyebrow">Lokasi</span>
        <h1>Lokasi cabang Kursus Aliah</h1>
        <p>Pilih cabang yang paling dekat dan mudah dijangkau.</p>
      </section>

      <section className="grid cards-2">
        {locations.map((location) => (
          <article key={location.id} className="location-card large">
            <img src={location.image} alt={location.title} className="location-image" />
            <div className="location-body">
              <span className="course-category">Cabang Aliah</span>
              <h3>{location.title}</h3>
              <p>{location.address}</p>
              <a href={location.mapsLink} target="_blank" rel="noreferrer" className="button-primary location-link">
                Buka Lokasi
              </a>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function CoursesSection({ courses, onOpenRegister }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const [modeFilter, setModeFilter] = useState("Semua");
  const [priceFilter, setPriceFilter] = useState("Semua");

  const categories = useMemo(() => [...new Set(courses.map((course) => course.category))], [courses]);
  const modes = useMemo(() => [...new Set(courses.map((course) => course.mode))], [courses]);

  const filteredCourses = useMemo(() => {
    const keyword = search.toLowerCase();

    return courses.filter((course) => {
      const matchesKeyword =
        !keyword ||
        course.title.toLowerCase().includes(keyword) ||
        course.category.toLowerCase().includes(keyword) ||
        course.features.some((feature) => feature.toLowerCase().includes(keyword));

      const matchesCategory = categoryFilter === "Semua" || course.category === categoryFilter;
      const matchesMode = modeFilter === "Semua" || course.mode === modeFilter;

      const matchesPrice =
        priceFilter === "Semua" ||
        (priceFilter === "upTo500" && course.price <= 500000) ||
        (priceFilter === "upTo800" && course.price <= 800000) ||
        (priceFilter === "above800" && course.price > 800000);

      return matchesKeyword && matchesCategory && matchesMode && matchesPrice;
    });
  }, [categoryFilter, courses, modeFilter, priceFilter, search]);

  return (
    <div className="page-stack">
      <section className="page-intro">
        <span className="eyebrow">Program Kursus</span>
        <h1>Daftar program yang bisa dipilih</h1>
        <p>Pilih kursus yang sesuai, lalu lanjut ke pendaftaran.</p>
      </section>

      <section className="surface">
        <div className="filter-grid">
          <label>
            Cari Program
            <input
              type="search"
              className="search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama kursus atau kategori..."
            />
          </label>

          <label>
            Kategori
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option>Semua</option>
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>

          <label>
            Mode Belajar
            <select value={modeFilter} onChange={(event) => setModeFilter(event.target.value)}>
              <option>Semua</option>
              {modes.map((mode) => (
                <option key={mode}>{mode}</option>
              ))}
            </select>
          </label>

          <label>
            Biaya
            <select value={priceFilter} onChange={(event) => setPriceFilter(event.target.value)}>
              <option value="Semua">Semua</option>
              <option value="upTo500">Sampai Rp 500.000</option>
              <option value="upTo800">Sampai Rp 800.000</option>
              <option value="above800">Di atas Rp 800.000</option>
            </select>
          </label>
        </div>
      </section>

      <section className="grid cards-3">
        {filteredCourses.map((course) => (
          <article key={course.id} className="course-card large">
            <span className="course-category">{course.category}</span>
            <h3>{course.title}</h3>
            <p>{course.mode}</p>
            <strong>{formatCurrency(course.price)}</strong>
            <ul>
              {course.features.slice(0, 4).map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button type="button" className="button-primary wide" onClick={() => onOpenRegister(course.id)}>
              Daftar program ini
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}

function RegisterSection({ courses, initialCourseId, onSubmit }) {
  const [form, setForm] = useState({ ...initialForm, courseId: initialCourseId });
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedCourse = courses.find((course) => course.id === form.courseId);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    const response = await onSubmit(form);
    setMessage(response.message);
    setLoading(false);

    if (response.ok) {
      setResult(response.data);
      setForm({ ...initialForm, courseId: form.courseId });
    }
  }

  return (
    <div className="page-stack">
      <section className="page-intro">
        <span className="eyebrow">Pendaftaran</span>
        <h1>Form pendaftaran peserta</h1>
        <p>Isi data dengan benar agar admin mudah memproses pendaftaran.</p>
      </section>

      <section className="grid form-layout">
        <form className="surface form-panel" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Nama lengkap
              <input
                type="text"
                value={form.fullName}
                onChange={(event) => updateForm("fullName", event.target.value)}
                required
              />
            </label>

            <label>
              Nomor WhatsApp
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => updateForm("phone", event.target.value)}
                required
              />
            </label>

            <label>
              Asal sekolah / pekerjaan
              <input
                type="text"
                value={form.schoolOrigin}
                onChange={(event) => updateForm("schoolOrigin", event.target.value)}
                required
              />
            </label>

            <label>
              Program
              <select
                value={form.courseId}
                onChange={(event) => updateForm("courseId", event.target.value)}
                required
              >
                <option value="">Pilih program</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.category} - {course.title}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Pilihan hari
              <select
                value={form.preferredDay}
                onChange={(event) => updateForm("preferredDay", event.target.value)}
              >
                <option>Senin, Rabu, Jumat</option>
                <option>Selasa, Kamis, Sabtu</option>
                <option>Jadwal fleksibel</option>
              </select>
            </label>

            <label>
              Pilihan waktu
              <select
                value={form.preferredTime}
                onChange={(event) => updateForm("preferredTime", event.target.value)}
              >
                <option>Pagi</option>
                <option>Siang</option>
                <option>Sore</option>
                <option>Malam</option>
              </select>
            </label>
          </div>

          <label>
            Catatan
            <textarea
              rows="4"
              value={form.note}
              onChange={(event) => updateForm("note", event.target.value)}
              placeholder="Tambahkan catatan jika perlu"
            />
          </label>

          <button type="submit" className="button-primary wide" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan pendaftaran"}
          </button>

          {message ? <p className="message-box">{message}</p> : null}
        </form>

        <aside className="surface summary-box">
          <span className="eyebrow">Ringkasan</span>
          <h2>{selectedCourse ? selectedCourse.title : "Pilih program dulu"}</h2>
          {selectedCourse ? (
            <>
              <strong className="summary-price">{formatCurrency(selectedCourse.price)}</strong>
              <ul>
                {selectedCourse.features.slice(0, 4).map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>Program yang kamu pilih akan tampil di sini.</p>
          )}

          {result ? (
            <div className="result-box">
              <p className="result-code">
                <span className="result-label">KODE PENDAFTARAN:</span>
                <strong>{result.code}</strong>
              </p>
              <p className="result-note">Simpan kode ini untuk cek status nanti.</p>
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}

function StatusSection({ enrollments, loading, onOpenCertificate }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return [];

    return enrollments.filter((item) => {
      const code = String(item.code || "").toLowerCase();
      const phone = String(item.phone || "").toLowerCase();
      const fullName = String(item.fullName || "").toLowerCase();
      return code.includes(keyword) || phone.includes(keyword) || fullName.includes(keyword);
    });
  }, [enrollments, query]);

  return (
    <div className="page-stack">
      <section className="page-intro">
        <span className="eyebrow">Cek Status</span>
        <h1>Lihat perkembangan pendaftaran</h1>
        <p>Cari dengan kode pendaftaran, nama, atau nomor HP.</p>
      </section>

      <section className="surface">
        <input
          type="search"
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Contoh: ALH-260427-123"
        />
      </section>

      {loading ? <section className="surface"><p className="empty-copy">Memuat data...</p></section> : null}

      {!loading && query && results.length === 0 ? (
        <section className="surface">
          <p className="empty-copy">Data tidak ditemukan.</p>
        </section>
      ) : null}

      {results.length > 0 ? (
        <section className="grid cards-2">
          {results.map((item) => {
            const currentStep = getStatusStepIndex(item.status);

            return (
              <article key={item.id} className="surface status-card">
                <div className="status-head">
                  <strong>{item.fullName || "-"}</strong>
                  <span className={`status-badge ${String(item.status || "Baru").toLowerCase().replaceAll(" ", "-")}`}>
                    {item.status || "Baru"}
                  </span>
                </div>

                <p>{item.courseName || "-"}</p>
                <small>Kode: {item.code || "-"}</small>
                <small>Asal: {item.schoolOrigin || "-"}</small>
                <small>Jadwal: {item.preferredDay || "-"}</small>
                {item.note ? <small>Catatan: {item.note}</small> : null}
                <small>Dibuat: {item.createdAt ? formatDate(item.createdAt) : "-"}</small>

                {item.status !== "Ditolak" ? (
                  <div className="status-progress">
                    {statusFlow.map((step, index) => {
                      const stepClass =
                        index < currentStep
                          ? "step-done"
                          : index === currentStep
                            ? "step-active"
                            : "step-pending";

                      return (
                        <div key={step} className={`progress-step ${stepClass}`}>
                          {step}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="status-reject-note">
                    Pendaftaran tidak dilanjutkan. Silakan hubungi admin untuk informasi lebih lanjut.
                  </p>
                )}

                {item.status === "Selesai" ? (
                  <button type="button" className="button-secondary" onClick={onOpenCertificate}>
                    Lihat sertifikat
                  </button>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}

function CertificateSection({ enrollments, loading }) {
  const [query, setQuery] = useState("");

  const selectedEnrollment = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return null;

    return (
      enrollments.find((item) => {
        const code = String(item.code || "").toLowerCase();
        const fullName = String(item.fullName || "").toLowerCase();
        const phone = String(item.phone || "").toLowerCase();
        return code.includes(keyword) || fullName.includes(keyword) || phone.includes(keyword);
      }) ?? null
    );
  }, [enrollments, query]);

  const isCompleted = selectedEnrollment?.status === "Selesai";
  const hasCertificate = Boolean(selectedEnrollment?.certificateFile);

  return (
    <div className="page-stack">
      <section className="page-intro">
        <span className="eyebrow">Sertifikat</span>
        <h1>Cek sertifikat peserta</h1>
        <p>Masukkan kode pendaftaran, nama, atau nomor HP untuk melihat sertifikat.</p>
      </section>

      <section className="surface certificate-search">
        <input
          type="search"
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Contoh: ALH-260427-123"
        />
      </section>

      {loading ? <section className="surface"><p className="empty-copy">Memuat data...</p></section> : null}
      {!loading && query && !selectedEnrollment ? (
        <section className="surface"><p className="empty-copy">Data peserta tidak ditemukan.</p></section>
      ) : null}
      {selectedEnrollment && !isCompleted ? (
        <section className="surface">
          <p className="empty-copy">
            Sertifikat belum bisa dilihat karena status peserta masih <strong>{selectedEnrollment.status}</strong>.
          </p>
        </section>
      ) : null}
      {selectedEnrollment && isCompleted && !hasCertificate ? (
        <section className="surface">
          <p className="empty-copy">Sertifikat belum diupload oleh admin.</p>
        </section>
      ) : null}
      {selectedEnrollment && isCompleted && hasCertificate ? (
        <section className="surface certificate-card">
          <span className="eyebrow">Sertifikat Peserta</span>
          <h2>{selectedEnrollment.fullName}</h2>
          <div className="certificate-meta">
            <div>
              <span className="certificate-label">Program</span>
              <strong>{selectedEnrollment.courseName}</strong>
            </div>
            <div>
              <span className="certificate-label">Nomor Sertifikat</span>
              <strong>SRT-{selectedEnrollment.code}</strong>
            </div>
            <div>
              <span className="certificate-label">Kode Pendaftaran</span>
              <strong>{selectedEnrollment.code}</strong>
            </div>
          </div>

          {selectedEnrollment.certificateFile && !selectedEnrollment.certificateFile.endsWith(".pdf") ? (
            <img
              src={selectedEnrollment.certificateFile}
              alt={`Sertifikat ${selectedEnrollment.fullName}`}
              className="certificate-image"
            />
          ) : selectedEnrollment.certificateFile ? (
            <iframe
              title={`Sertifikat ${selectedEnrollment.fullName}`}
              src={selectedEnrollment.certificateFile}
              className="certificate-frame"
            />
          ) : null}

          <div className="certificate-actions">
            <a
              href={selectedEnrollment.certificateFile}
              className="button-primary certificate-download"
              target="_blank"
              rel="noreferrer"
            >
              Download Sertifikat
            </a>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CertificateUploadField({ item, onUpload }) {
  const [certificateNumber, setCertificateNumber] = useState(item.certificateNumber || `SRT-${item.code}`);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setBusy(true);
    const response = await onUpload(item.id, file, certificateNumber);
    setMessage(response.message);
    setBusy(false);
    if (response.ok) setFile(null);
  }

  if (item.status !== "Selesai") {
    return <small className="upload-note">Ubah status ke Selesai dulu</small>;
  }

  return (
    <div className="certificate-upload">
      <input
        type="text"
        value={certificateNumber}
        onChange={(event) => setCertificateNumber(event.target.value)}
        placeholder="Nomor sertifikat"
      />
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <button type="button" className="button-secondary upload-button" onClick={handleSave} disabled={busy}>
        {busy ? "Menyimpan..." : "Upload"}
      </button>
      {item.certificateFile ? (
        <small className="upload-note success-note">Tersimpan: {item.certificateFileName || item.certificateFile}</small>
      ) : null}
      {message ? <small className="upload-note">{message}</small> : null}
    </div>
  );
}

function AdminSection({
  adminOpen,
  courses,
  enrollments,
  loading,
  onCertificateUpload,
  onDeleteEnrollment,
  onLogin,
  onLogout,
  onPriceChange,
  onStatusChange,
}) {
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const isValid = onLogin(pin);
    setMessage(isValid ? "Login berhasil." : "PIN salah.");
  }

  function handleDelete(item) {
    const isConfirmed = window.confirm(`Hapus data pendaftar atas nama ${item.fullName}?`);
    if (!isConfirmed) return;
    onDeleteEnrollment(item.id);
  }

  if (!adminOpen) {
    return (
      <div className="page-stack">
        <section className="page-intro">
          <span className="eyebrow">Admin</span>
          <h1>Masuk ke panel admin</h1>
          <p>Untuk demo tugas, gunakan PIN admin: 1987</p>
        </section>

        <form className="surface admin-login" onSubmit={handleSubmit}>
          <label>
            PIN admin
            <input
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="Masukkan PIN"
            />
          </label>
          <button type="submit" className="button-primary">Login</button>
          {message ? <p className="message-box">{message}</p> : null}
        </form>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="page-intro">
        <span className="eyebrow">Panel Admin</span>
        <h1>Kelola website kursus</h1>
        <p>Admin bisa mengubah harga program, status pendaftaran, upload sertifikat, dan menghapus data peserta.</p>
      </section>

      <div className="admin-actions">
        <button type="button" className="button-secondary" onClick={onLogout}>
          Keluar admin
        </button>
      </div>

      <section className="surface">
        <div className="section-head">
          <div>
            <span className="eyebrow">Kelola Harga</span>
            <h2>Daftar program</h2>
          </div>
        </div>

        <div className="grid cards-2">
          {courses.map((course) => (
            <article key={course.id} className="admin-card">
              <strong>{course.title}</strong>
              <span>{course.category}</span>
              <label>
                Harga
                <input
                  type="number"
                  value={course.price}
                  onChange={(event) => onPriceChange(course.id, event.target.value)}
                />
              </label>
            </article>
          ))}
        </div>
      </section>

      <section className="surface">
        <div className="section-head">
          <div>
            <span className="eyebrow">Kelola Pendaftar</span>
            <h2>Data masuk</h2>
          </div>
        </div>

        {loading ? (
          <p className="empty-copy">Memuat data...</p>
        ) : enrollments.length === 0 ? (
          <p className="empty-copy">Belum ada pendaftaran.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Peserta</th>
                  <th>Sekolah/Kerja</th>
                  <th>Program</th>
                  <th>Jadwal</th>
                  <th>Catatan</th>
                  <th>Kode</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th>Sertifikat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.fullName}</strong>
                      <small>{item.phone}</small>
                    </td>
                    <td>{item.schoolOrigin || "-"}</td>
                    <td>{item.courseName}</td>
                    <td>
                      <small>{item.preferredDay || "-"}</small>
                    </td>
                    <td>{item.note || "-"}</td>
                    <td>{item.code}</td>
                    <td>
                      <small>{item.createdAt ? formatDate(item.createdAt) : "-"}</small>
                    </td>
                    <td>
                      <select
                        value={item.status}
                        onChange={(event) => onStatusChange(item.id, event.target.value)}
                      >
                        <option>Baru</option>
                        <option>Dikonfirmasi</option>
                        <option>Menunggu kelas</option>
                        <option>Sedang belajar</option>
                        <option>Selesai</option>
                        <option>Ditolak</option>
                      </select>
                    </td>
                    <td>
                      <CertificateUploadField item={item} onUpload={onCertificateUpload} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => handleDelete(item)}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;