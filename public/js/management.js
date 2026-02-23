// Management JavaScript
const API_BASE = "/api";

// State
let currentPage = 1;
let currentLimit = 10;
let currentSortBy = "updated_at";
let currentSortOrder = "DESC";
let searchTimeout;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadUsers();
  loadLastSyncTime();
  loadFilterOptions();
});

// SYNC FUNCTIONS

async function syncData() {
  const btn = document.querySelector(".btn-sync");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> Syncing...';
  btn.disabled = true;

  try {
    const count = document.getElementById("syncCount").value;
    const response = await fetch(`${API_BASE}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: parseInt(count) }),
    });

    const data = await response.json();

    if (data.success) {
      showToast(
        `Sinkronisasi berhasil! ${data.recordsAdded} ditambahkan, ${data.recordsUpdated} diperbarui.`,
        "success",
      );
      loadUsers();
      loadLastSyncTime();
    } else {
      showToast("Gagal sinkronisasi data.", "error");
    }
  } catch (error) {
    console.error("Sync error:", error);
    showToast("Terjadi kesalahan saat sinkronisasi.", "error");
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

async function loadLastSyncTime() {
  try {
    const response = await fetch(`${API_BASE}/sync/last`);
    const data = await response.json();

    if (data.sync_time) {
      // Handle both ISO format (with Z) and SQLite format (without timezone)
      let syncTime = data.sync_time;
      if (!syncTime.endsWith('Z') && !syncTime.includes('+')) {
        // SQLite CURRENT_TIMESTAMP format without timezone - append Z to treat as UTC
        syncTime = syncTime.replace(' ', 'T') + 'Z';
      }
      const date = new Date(syncTime);
      document.getElementById("lastSyncTime").textContent =
        date.toLocaleString("id-ID", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }) +
        ` (${data.records_added} ditambahkan, ${data.records_updated} diperbarui)`;
    }
  } catch (error) {
    console.error("Error loading sync time:", error);
  }
}

// =====================
// LOAD & DISPLAY DATA
// =====================

async function loadUsers() {
  const tbody = document.getElementById("usersTableBody");
  tbody.innerHTML =
    '<tr><td colspan="11" class="loading">Memuat data...</td></tr>';

  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: currentLimit,
      sortBy: currentSortBy,
      sortOrder: currentSortOrder,
      search: document.getElementById("searchInput").value,
      gender: document.getElementById("filterGender").value,
      nationality: document.getElementById("filterNationality").value,
      startDate: document.getElementById("filterStartDate").value,
      endDate: document.getElementById("filterEndDate").value,
    });

    const response = await fetch(`${API_BASE}/users?${params}`);
    const data = await response.json();

    if (data.data && data.data.length > 0) {
      renderTable(data.data);
      updatePagination(data.pagination);
    } else {
      tbody.innerHTML = `
                <tr>
                    <td colspan="11" class="empty-state">
                        <div class="icon">📭</div>
                        <p>Tidak ada data. Klik "Sync Data dari API" untuk mengambil data.</p>
                    </td>
                </tr>
            `;
    }
  } catch (error) {
    console.error("Error loading users:", error);
    tbody.innerHTML =
      '<tr><td colspan="11" class="loading">Gagal memuat data.</td></tr>';
  }
}

function renderTable(users) {
  const tbody = document.getElementById("usersTableBody");
  tbody.innerHTML = users
    .map(
      (user) => `
        <tr>
            <td>${user.id}</td>
            <td>
                <img src="${user.picture_thumbnail || "https://via.placeholder.com/40"}" 
                     alt="${user.first_name}" class="user-avatar"
                     onerror="this.src='https://via.placeholder.com/40'">
            </td>
            <td>${user.title || ""} ${user.first_name} ${user.last_name}</td>
            <td>${user.email || "-"}</td>
            <td><span class="badge badge-${user.gender}">${user.gender === "male" ? "Laki-laki" : "Perempuan"}</span></td>
            <td>${user.age || "-"}</td>
            <td>${user.nationality || "-"}</td>
            <td>${user.country || "-"}</td>
            <td>${formatDate(user.registered_date)}</td>
            <td>${formatDateTime(user.updated_at)}</td>
            <td class="action-btns">
                <button class="btn-view" onclick="viewUser(${user.id})" title="Lihat Detail">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                </button>
                <button class="btn-edit" onclick="editUser(${user.id})" title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                </button>
                <button class="btn-delete" onclick="deleteUser(${user.id})" title="Hapus">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                </button>
            </td>
        </tr>
    `,
    )
    .join("");
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// PAGINATION & SORTING

function updatePagination(pagination) {
  const { page, totalPages, total } = pagination;
  document.getElementById("pageInfo").textContent =
    `Halaman ${page} dari ${totalPages} (${total} data)`;
  document.getElementById("prevBtn").disabled = page <= 1;
  document.getElementById("nextBtn").disabled = page >= totalPages;
}

function changePage(direction) {
  if (direction === "prev" && currentPage > 1) {
    currentPage--;
  } else if (direction === "next") {
    currentPage++;
  }
  loadUsers();
}

function changeLimit() {
  currentLimit = parseInt(document.getElementById("limitSelect").value);
  currentPage = 1;
  loadUsers();
}

function sortTable(column) {
  if (currentSortBy === column) {
    currentSortOrder = currentSortOrder === "ASC" ? "DESC" : "ASC";
  } else {
    currentSortBy = column;
    currentSortOrder = "ASC";
  }

  // Update UI sort indicators
  document
    .querySelectorAll("th")
    .forEach((th) => th.classList.remove("sorted"));
  document.querySelector(`th[data-sort="${column}"]`)?.classList.add("sorted");

  loadUsers();
}

// SEARCH & FILTER

function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage = 1;
    loadUsers();
  }, 300);
}

async function loadFilterOptions() {
  try {
    const response = await fetch(`${API_BASE}/filters/options`);
    const data = await response.json();

    const nationalitySelect = document.getElementById("filterNationality");
    if (data.nationalities) {
      data.nationalities.forEach((nat) => {
        const option = document.createElement("option");
        option.value = nat;
        option.textContent = nat;
        nationalitySelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error loading filter options:", error);
  }
}

// CRUD OPERATIONS

// VIEW
async function viewUser(id) {
  try {
    const response = await fetch(`${API_BASE}/users/${id}`);
    const user = await response.json();

    if (response.ok) {
      const detailHtml = `
                <div class="user-detail-header">
                    <img src="${user.picture_large || "https://via.placeholder.com/100"}" 
                         alt="${user.first_name}"
                         onerror="this.src='https://via.placeholder.com/100'">
                    <div>
                        <h4>${user.title || ""} ${user.first_name} ${user.last_name}</h4>
                        <p>${user.email}</p>
                    </div>
                </div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Gender</label>
                        <span>${user.gender === "male" ? "Laki-laki" : "Perempuan"}</span>
                    </div>
                    <div class="detail-item">
                        <label>Usia</label>
                        <span>${user.age || "-"} tahun</span>
                    </div>
                    <div class="detail-item">
                        <label>Tanggal Lahir</label>
                        <span>${formatDate(user.date_of_birth)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Telepon</label>
                        <span>${user.phone || "-"}</span>
                    </div>
                    <div class="detail-item">
                        <label>HP</label>
                        <span>${user.cell || "-"}</span>
                    </div>
                    <div class="detail-item">
                        <label>Nationality</label>
                        <span>${user.nationality || "-"}</span>
                    </div>
                    <div class="detail-item">
                        <label>Kota</label>
                        <span>${user.city || "-"}</span>
                    </div>
                    <div class="detail-item">
                        <label>Provinsi/State</label>
                        <span>${user.state || "-"}</span>
                    </div>
                    <div class="detail-item">
                        <label>Negara</label>
                        <span>${user.country || "-"}</span>
                    </div>
                    <div class="detail-item">
                        <label>Kode Pos</label>
                        <span>${user.postcode || "-"}</span>
                    </div>
                    <div class="detail-item">
                        <label>Tanggal Registrasi</label>
                        <span>${formatDate(user.registered_date)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Terakhir Diperbarui</label>
                        <span>${formatDateTime(user.updated_at)}</span>
                    </div>
                </div>
            `;
      document.getElementById("userDetail").innerHTML = detailHtml;
      document.getElementById("viewModal").classList.add("active");
    }
  } catch (error) {
    console.error("Error viewing user:", error);
    showToast("Gagal memuat detail user.", "error");
  }
}

function closeViewModal() {
  document.getElementById("viewModal").classList.remove("active");
}

// CREATE
function openCreateModal() {
  document.getElementById("modalTitle").textContent = "Tambah User Baru";
  document.getElementById("userForm").reset();
  document.getElementById("userId").value = "";

  // Set default date
  document.getElementById("registeredDate").value = new Date()
    .toISOString()
    .split("T")[0];

  document.getElementById("userModal").classList.add("active");
}

// EDIT
async function editUser(id) {
  try {
    const response = await fetch(`${API_BASE}/users/${id}`);
    const user = await response.json();

    if (response.ok) {
      document.getElementById("modalTitle").textContent = "Edit User";
      document.getElementById("userId").value = user.id;
      document.getElementById("title").value = user.title || "Mr";
      document.getElementById("gender").value = user.gender;
      document.getElementById("firstName").value = user.first_name;
      document.getElementById("lastName").value = user.last_name;
      document.getElementById("email").value = user.email;
      document.getElementById("phone").value = user.phone || "";
      document.getElementById("cell").value = user.cell || "";
      document.getElementById("dateOfBirth").value = user.date_of_birth || "";
      document.getElementById("age").value = user.age || "";
      document.getElementById("nationality").value = user.nationality || "";
      document.getElementById("city").value = user.city || "";
      document.getElementById("state").value = user.state || "";
      document.getElementById("country").value = user.country || "";
      document.getElementById("postcode").value = user.postcode || "";
      document.getElementById("registeredDate").value =
        user.registered_date || "";

      document.getElementById("userModal").classList.add("active");
    }
  } catch (error) {
    console.error("Error loading user:", error);
    showToast("Gagal memuat data user.", "error");
  }
}

// SAVE (Create/Update)
async function saveUser(event) {
  event.preventDefault();

  const userId = document.getElementById("userId").value;
  const userData = {
    title: document.getElementById("title").value,
    gender: document.getElementById("gender").value,
    first_name: document.getElementById("firstName").value,
    last_name: document.getElementById("lastName").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    cell: document.getElementById("cell").value,
    date_of_birth: document.getElementById("dateOfBirth").value,
    age: document.getElementById("age").value
      ? parseInt(document.getElementById("age").value)
      : null,
    nationality: document.getElementById("nationality").value.toUpperCase(),
    city: document.getElementById("city").value,
    state: document.getElementById("state").value,
    country: document.getElementById("country").value,
    postcode: document.getElementById("postcode").value,
    registered_date: document.getElementById("registeredDate").value,
  };

  try {
    const url = userId ? `${API_BASE}/users/${userId}` : `${API_BASE}/users`;
    const method = userId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    if (response.ok) {
      showToast(
        userId ? "User berhasil diperbarui!" : "User berhasil ditambahkan!",
        "success",
      );
      closeModal();
      loadUsers();
    } else {
      const error = await response.json();
      showToast(error.message || "Gagal menyimpan user.", "error");
    }
  } catch (error) {
    console.error("Error saving user:", error);
    showToast("Terjadi kesalahan saat menyimpan.", "error");
  }
}

// DELETE
async function deleteUser(id) {
  if (!confirm("Apakah Anda yakin ingin menghapus user ini?")) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      showToast("User berhasil dihapus!", "success");
      loadUsers();
    } else {
      showToast("Gagal menghapus user.", "error");
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    showToast("Terjadi kesalahan saat menghapus.", "error");
  }
}

function closeModal() {
  document.getElementById("userModal").classList.remove("active");
}

// Close modal when clicking outside
document.getElementById("userModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("userModal")) {
    closeModal();
  }
});

document.getElementById("viewModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("viewModal")) {
    closeViewModal();
  }
});

// TOAST NOTIFICATION

function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
