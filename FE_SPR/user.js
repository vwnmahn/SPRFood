// ============================================
// CẤU HÌNH API
// ============================================
const API_BASE_URL = "http://localhost:8080/api";

// ========== BIẾN TOÀN CỤC ==========
let restaurantsData = [];
let currentCity = "hanoi";
let currentCityName = "Hà Nội";
let currentDistrict = "";
let currentCategory = "all";
let currentSearch = "";
let currentPage = 1;
const itemsPerPage = 6;

// ========== DỮ LIỆU TĨNH ==========
const cities = [
    { id: "hanoi", name: "Hà Nội" },
    { id: "hcm", name: "TP. Hồ Chí Minh" },
    { id: "danang", name: "Đà Nẵng" },
    { id: "haiphong", name: "Hải Phòng" },
    { id: "cantho", name: "Cần Thơ" }
];

const districtsByCity = {
    hanoi: ["Ba Đình", "Cầu Giấy", "Đống Đa", "Hà Đông", "Hai Bà Trưng", "Hoàn Kiếm", "Hoàng Mai", "Long Biên", "Tây Hồ", "Thanh Xuân", "Bắc Từ Liêm", "Nam Từ Liêm"],
    hcm: ["Quận 1", "Quận 2", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 7", "Quận 8", "Quận 9", "Quận 10", "Quận 11", "Quận 12", "Bình Thạnh", "Phú Nhuận", "Tân Bình"],
    danang: ["Hải Châu", "Thanh Khê", "Sơn Trà", "Ngũ Hành Sơn", "Liên Chiểu", "Cẩm Lệ"],
    haiphong: ["Hồng Bàng", "Ngô Quyền", "Lê Chân", "Hải An", "Kiến An", "Đồ Sơn"],
    cantho: ["Ninh Kiều", "Bình Thủy", "Cái Răng", "Ô Môn", "Thốt Nốt"]
};

const categoryIconMap = {
    "food": "utensils",
    "drink": "mug-hot",
    "vegan": "leaf",
    "vegetarian": "leaf",
    "cake": "cake-candles",
    "fastfood": "burger",
    "noodle": "bowl-food",
    "default": "store"
};

// ============================================
// QUẢN LÝ ĐĂNG NHẬP
// ============================================

function getAuthToken() {
    return localStorage.getItem('sprfood_token') || sessionStorage.getItem('sprfood_token');
}

function getCurrentUser() {
    const userStr = localStorage.getItem('sprfood_user') || sessionStorage.getItem('sprfood_user');
    if (!userStr || userStr === 'undefined' || userStr === 'null') return null;
    try {
        return JSON.parse(userStr);
    } catch (e) {
        console.error("Lỗi parse user data:", e);
        localStorage.removeItem('sprfood_user');
        sessionStorage.removeItem('sprfood_user');
        return null;
    }
}

function isLoggedIn() {
    return !!getAuthToken();
}

function isUserLocked(user) {
    if (!user) return false;
    return user.locked === true || user.status === 'locked' || user.status === 'LOCKED' || user.accountStatus === 'LOCKED' || user.enabled === false;
}

function enforceLockedUser() {
    const user = getCurrentUser();
    if (user && isUserLocked(user)) {
        showNotification(' Tài khoản của bạn đã bị khóa. Đăng xuất...','error');
        logout();
        return true;
    }
    return false;
}

// ========== AVATAR ==========
const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

function getAvatarUrl(user) {
    if (!user) return '';
    return user.avatarUrl || user.avatar || '';
}

function normalizeAvatarUrl(avatarUrl) {
    if (!avatarUrl) return '';
    avatarUrl = avatarUrl.trim();
    if (!avatarUrl) return '';
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
    if (avatarUrl.startsWith('/')) return `${SERVER_BASE_URL}${avatarUrl}`;
    return `${SERVER_BASE_URL}/${avatarUrl}`;
}

function renderUserAvatar(avatarUrl) {
    const avatarBtn = document.getElementById('userAvatarBtn');
    if (!avatarBtn) return;

    let avatarImg = avatarBtn.querySelector('img.user-avatar-img');
    const defaultIcon = avatarBtn.querySelector('i');

    if (!avatarImg) {
        avatarImg = document.createElement('img');
        avatarImg.className = 'user-avatar-img';
        avatarImg.alt = 'Avatar';
        avatarImg.style.cssText = 'display:none;width:32px;height:32px;border-radius:50%;object-fit:cover;';
        avatarBtn.prepend(avatarImg);
    }

    if (avatarUrl) {
        avatarImg.onerror = () => {
            avatarImg.style.display = 'none';
            if (defaultIcon) defaultIcon.style.display = 'inline-block';
        };
        avatarImg.onload = () => {
            avatarImg.style.display = 'inline-block';
            if (defaultIcon) defaultIcon.style.display = 'none';
        };
        avatarImg.src = normalizeAvatarUrl(avatarUrl) + `?t=${Date.now()}`;
    } else {
        avatarImg.style.display = 'none';
        if (defaultIcon) defaultIcon.style.display = 'inline-block';
    }
}

// ========== Đồng bộ user từ server ==========
async function syncUserFromServer() {
    if (!isLoggedIn()) return;
    try {
        const token = getAuthToken();
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            const freshUser = data.data || data;

            // Merge với dữ liệu cũ trong localStorage
            if (isUserLocked(freshUser)) {
                showNotification(' Tài khoản của bạn đã bị khóa. Đăng xuất...', 'error');
                logout();
                return;
            }

            const stored = getCurrentUser();
            const merged = { ...stored, ...freshUser };
            localStorage.setItem('sprfood_user', JSON.stringify(merged));

            // Cập nhật avatar trên navbar
            renderUserAvatar(getAvatarUrl(merged));
        }
    } catch (e) {
        console.warn('Không thể đồng bộ thông tin user:', e);
    }
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const userDropdown = document.getElementById('userDropdown');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const cartBtnLink = document.getElementById('cartBtnLink');

    if (isLoggedIn()) {
        if (enforceLockedUser()) return;
        const user = getCurrentUser();
        if (loginBtn) loginBtn.style.display = 'none';
        if (userDropdown) {
            userDropdown.style.display = 'block';
            if (userNameDisplay) {
                const name = user?.username || user?.email?.split('@')[0] || 'User';
                userNameDisplay.textContent = name;
            }
            // Hiển thị avatar từ localStorage trước (tránh chờ API)
            renderUserAvatar(getAvatarUrl(user));
        }
        if (cartBtnLink) {
            cartBtnLink.onclick = null;
            cartBtnLink.href = 'cart.html';
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (userDropdown) userDropdown.style.display = 'none';
        if (cartBtnLink) {
            cartBtnLink.href = 'javascript:void(0)';
            cartBtnLink.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                setTimeout(() => { window.location.href = 'login.html'; }, 300);
            };
        }
    }
}

async function logout() {
    const token = getAuthToken();
    if (token) {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    localStorage.removeItem('sprfood_token');
    localStorage.removeItem('sprfood_user');
    sessionStorage.removeItem('sprfood_token');
    sessionStorage.removeItem('sprfood_user');

    updateAuthUI();
    showNotification(' Đã đăng xuất!');
    setTimeout(() => window.location.reload(), 800);
}

function initUserDropdown() {
    const avatarBtn = document.getElementById('userAvatarBtn');
    const dropdownMenu = document.getElementById('userDropdownMenu');
    const logoutBtn = document.getElementById('logoutBtn');
    const ordersLink = document.getElementById('userOrdersLink');

    if (avatarBtn) {
        avatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
    }

    if (ordersLink) {
        ordersLink.addEventListener('click', (e) => {
            if (!isLoggedIn()) {
                e.preventDefault();
                showNotification(' Vui lòng đăng nhập để xem đơn hàng!', 'error');
                setTimeout(() => { window.location.href = 'login.html'; }, 500);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    document.addEventListener('click', (e) => {
        if (dropdownMenu && avatarBtn && !avatarBtn.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });
}

// ============================================
// GIỎ HÀNG
// ============================================
function getCart() {
    if (!isLoggedIn()) return [];
    const cart = localStorage.getItem("sprfood_cart");
    return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
    if (!isLoggedIn()) return;
    localStorage.setItem("sprfood_cart", JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    if (!isLoggedIn()) {
        const badge = document.getElementById("cartBadge");
        if (badge) badge.textContent = "0";
        return;
    }
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartBadge = document.getElementById("cartBadge");
    if (cartBadge) {
        cartBadge.textContent = totalItems;
        cartBadge.style.display = totalItems > 0 ? "flex" : "none";
    }
}

function showNotification(message, type = 'success') {
    const oldNoti = document.querySelector(".cart-notification");
    if (oldNoti) oldNoti.remove();

    const noti = document.createElement("div");
    noti.className = `cart-notification ${type}`;
    noti.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${message}</span>`;
    document.body.appendChild(noti);

    setTimeout(() => noti.classList.add("show"), 10);
    setTimeout(() => {
        noti.classList.remove("show");
        setTimeout(() => noti.remove(), 300);
    }, 2000);
}

// ============================================
// LẤY DỮ LIỆU NHÀ HÀNG TỪ API
// ============================================
async function loadRestaurantsFromAPI() {
    const grid = document.getElementById("restaurantGrid");
    if (grid) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;">
            <i class="fas fa-spinner fa-spin" style="font-size:48px;color:var(--primary);margin-bottom:16px;"></i>
            <p>Đang tải danh sách nhà hàng...</p>
        </div>`;
    }

    try {
        const token = getAuthToken();
        if (!token) {
            showNotification(' Vui lòng đăng nhập để xem danh sách nhà hàng!', 'error');
            restaurantsData = [];
            filterAndRender();
            return;
        }

        const response = await fetch(`${API_BASE_URL}/restaurants`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            showNotification(' Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!', 'error');
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
            return;
        }

        if (response.ok) {
            const restaurants = await response.json();
            const activeRestaurants = restaurants.filter(r =>
                r.status === 'ACTIVE' || r.status === 'active' || r.status === true
            );

            restaurantsData = activeRestaurants.map(rest => ({
                id: rest.id,
                name: rest.name,
                slug: convertToSlug(rest.name, rest.id),
                address: rest.address,
                city: extractCityFromAddress(rest.address) || "hanoi",
                district: extractDistrict(rest.address),
                fullAddress: rest.address,
                category: rest.category || "food",
                rating: rest.rating || 4.5,
                deliveryTime: rest.deliveryTime || "20-30 phút",
                discount: rest.discount ? rest.discount + "%" : "0%",
                popular: rest.popular || false,
                status: rest.status,
                imageUrl: rest.imageUrl || null
            }));

            console.log(` Đã tải ${restaurantsData.length} nhà hàng từ database`);

            if (restaurantsData.length === 0) {
                showNotification(' Hiện chưa có nhà hàng nào đang hoạt động!', 'info');
                if (grid) {
                    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;">
                        <i class="fas fa-store-slash" style="font-size:48px;color:var(--gray);margin-bottom:16px;"></i>
                        <p style="color:var(--gray);">Chưa có nhà hàng nào</p>
                        <p style="color:var(--gray);font-size:13px;">Vui lòng quay lại sau!</p>
                    </div>`;
                }
            }
        } else {
            console.error("API failed with status:", response.status);
            restaurantsData = [];
            showNotification(' Không thể tải danh sách nhà hàng!', 'error');
        }
    } catch (error) {
        console.error("Error loading restaurants:", error);
        restaurantsData = [];
        showNotification(' Lỗi kết nối đến server!', 'error');
    }

    filterAndRender();
}

function convertToSlug(name, id) {
    const slug = name.toLowerCase()
        .replace(/[đ]/g, 'd')
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-');
    return `${slug}-${id}`;
}

function extractCityFromAddress(address) {
    if (!address) return "hanoi";
    const lowerAddr = address.toLowerCase();
    if (lowerAddr.includes('hồ chí minh') || lowerAddr.includes('hcm')) return "hcm";
    if (lowerAddr.includes('đà nẵng')) return "danang";
    if (lowerAddr.includes('hải phòng')) return "haiphong";
    if (lowerAddr.includes('cần thơ')) return "cantho";
    return "hanoi";
}

function extractDistrict(address) {
    if (!address) return "";
    const allDistricts = [
        ...districtsByCity.hanoi,
        ...districtsByCity.hcm,
        ...districtsByCity.danang,
        ...districtsByCity.haiphong,
        ...districtsByCity.cantho
    ];
    for (const district of allDistricts) {
        if (address.includes(district)) return district;
    }
    return "";
}

// ============================================
// ĐỊNH VỊ
// ============================================
function loadLocationFromStorage() {
    const savedCity = localStorage.getItem("sprfood_city");
    const savedDistrict = localStorage.getItem("sprfood_district");
    if (savedCity) {
        currentCity = savedCity;
        currentCityName = cities.find(c => c.id === savedCity)?.name || "Hà Nội";
    }
    if (savedDistrict) currentDistrict = savedDistrict;
    updateLocationDisplay();
}

function updateLocationDisplay() {
    const displaySpan = document.querySelector("#locationDisplay span");
    const locationText = document.querySelector("#selectedLocation");
    if (displaySpan) displaySpan.textContent = currentDistrict ? `${currentDistrict}, ${currentCityName}` : currentCityName;
    if (locationText) locationText.textContent = currentDistrict ? `${currentDistrict}, ${currentCityName}` : currentCityName;
    filterAndRender();
}

function saveLocation() {
    localStorage.setItem("sprfood_city", currentCity);
    localStorage.setItem("sprfood_district", currentDistrict);
}

// ============================================
// LỌC VÀ HIỂN THỊ
// ============================================
function filterRestaurants() {
    let filtered = restaurantsData.filter(r => r.city === currentCity);
    if (currentDistrict && currentDistrict !== "Tất cả") {
        filtered = filtered.filter(r => r.district === currentDistrict);
    }
    if (currentCategory !== "all") {
        filtered = filtered.filter(r => r.category === currentCategory);
    }
    if (currentSearch) {
        const searchLower = currentSearch.toLowerCase();
        filtered = filtered.filter(r =>
            r.name.toLowerCase().includes(searchLower) ||
            (r.fullAddress && r.fullAddress.toLowerCase().includes(searchLower))
        );
    }
    return filtered;
}

function getIconForCategory(category) {
    return categoryIconMap[category] || categoryIconMap.default;
}

function renderRestaurants() {
    let filtered = filterRestaurants();
    const total = filtered.length;

    const totalCountEl = document.getElementById("totalCount");
    const resultHintEl = document.getElementById("resultHint");
    if (totalCountEl) totalCountEl.textContent = total;
    if (resultHintEl) {
        resultHintEl.textContent = `Tìm thấy ${total} địa điểm tại ${currentDistrict ? currentDistrict + ", " : ""}${currentCityName}`;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);

    const grid = document.getElementById("restaurantGrid");
    if (!grid) return;

    if (paginated.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;">
            <i class="fas fa-store-slash" style="font-size:48px;color:var(--gray);margin-bottom:16px;"></i>
            <p style="color:var(--gray);">Không tìm thấy địa điểm phù hợp</p>
            <p style="color:var(--gray);font-size:13px;">Hãy thử thay đổi bộ lọc hoặc quay lại sau!</p>
        </div>`;
        const paginationEl = document.getElementById("pagination");
        if (paginationEl) paginationEl.innerHTML = "";
        return;
    }

    grid.innerHTML = paginated.map(r => {
        const imageUrl = r.imageUrl ? (r.imageUrl.startsWith('http') ? r.imageUrl : `${SERVER_BASE_URL}${r.imageUrl}`) : null;
        const categoryIcon = getIconForCategory(r.category);
        
        return `
            <div class="restaurant-card" data-id="${r.id}" data-slug="${r.slug}" data-name="${escapeHtml(r.name)}">
                <div class="card-img">
                    ${imageUrl ? 
                        `<img src="${imageUrl}" alt="${escapeHtml(r.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : 
                        ''
                    }
                    <div class="card-img-placeholder" style="display: ${imageUrl ? 'none' : 'flex'}; width:100%;height:100%;align-items:center;justify-content:center;background: linear-gradient(135deg, var(--primary), #e6492d);">
                        <i class="fas fa-${categoryIcon}" style="font-size:48px;color:white;"></i>
                    </div>
                    ${r.discount !== "0%" ? `<span class="discount-badge">-${r.discount}</span>` : ''}
                </div>
                <div class="card-content">
                    <h3 class="card-title">${escapeHtml(r.name)}</h3>
                    <div class="card-address"><i class="fas fa-location-dot"></i> ${escapeHtml(r.fullAddress || r.address)}</div>
                    <div class="card-meta">
                        <div class="rating"><i class="fas fa-star"></i> ${r.rating}</div>
                        <div class="delivery-time"><i class="fas fa-motorcycle"></i> ${r.deliveryTime}</div>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    document.querySelectorAll(".restaurant-card").forEach(card => {
        card.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isLoggedIn()) {
                const restaurantName = card.getAttribute('data-name') || 'cửa hàng';
                showNotification(` Vui lòng đăng nhập để xem "${restaurantName}"!`, 'error');
                setTimeout(() => { window.location.href = 'login.html'; }, 300);
                return;
            }
            const id = card.getAttribute("data-id");
            if (id) window.location.href = `restaurant.html?id=${id}`;
        });
    });

    const totalPages = Math.ceil(total / itemsPerPage);
    renderPagination(totalPages);
}
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function renderPagination(totalPages) {
    const paginationDiv = document.getElementById("pagination");
    if (!paginationDiv) return;

    if (totalPages <= 1) {
        paginationDiv.innerHTML = "";
        return;
    }

    let pages = [];
    for (let i = 1; i <= totalPages; i++) {
        pages.push(`<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`);
    }
    paginationDiv.innerHTML = pages.join("");

    document.querySelectorAll(".page-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            currentPage = parseInt(btn.dataset.page);
            renderRestaurants();
        });
    });
}

function filterAndRender() {
    currentPage = 1;
    renderRestaurants();
}

// ============================================
// MODAL ĐỊNH VỊ
// ============================================
function openLocationModal() {
    const modal = document.getElementById("locationModal");
    if (modal) {
        modal.classList.add("show");
        document.body.style.overflow = "hidden";
        renderCityList();
        renderDistrictList();
    }
}

function closeLocationModal() {
    const modal = document.getElementById("locationModal");
    if (modal) {
        modal.classList.remove("show");
        document.body.style.overflow = "";
    }
}

function renderCityList() {
    const cityList = document.getElementById("cityList");
    if (!cityList) return;

    cityList.innerHTML = cities.map(city => `
        <div class="location-item ${currentCity === city.id ? 'selected' : ''}" data-city="${city.id}">
            <span>${city.name}</span>
            ${currentCity === city.id ? '<i class="fas fa-check-circle"></i>' : ''}
        </div>
    `).join("");

    document.querySelectorAll("[data-city]").forEach(el => {
        el.addEventListener("click", () => {
            currentCity = el.dataset.city;
            currentCityName = cities.find(c => c.id === currentCity)?.name || "Hà Nội";
            currentDistrict = "";
            renderCityList();
            renderDistrictList();
            updateLocationDisplay();
        });
    });
}

function renderDistrictList() {
    const districts = districtsByCity[currentCity] || [];
    const districtList = document.getElementById("districtList");
    if (!districtList) return;

    districtList.innerHTML = `
        <div class="location-item ${currentDistrict === "" ? 'selected' : ''}" data-district="">
            <span>📌 Tất cả ${currentCityName}</span>
            ${currentDistrict === "" ? '<i class="fas fa-check-circle"></i>' : ''}
        </div>
        ${districts.map(district => `
            <div class="location-item ${currentDistrict === district ? 'selected' : ''}" data-district="${district}">
                <span>📍 ${district}</span>
                ${currentDistrict === district ? '<i class="fas fa-check-circle"></i>' : ''}
            </div>
        `).join("")}
    `;

    document.querySelectorAll("[data-district]").forEach(el => {
        el.addEventListener("click", () => {
            currentDistrict = el.dataset.district;
            renderDistrictList();
            updateLocationDisplay();
        });
    });
}

function initModal() {
    const modal = document.getElementById("locationModal");
    const overlay = document.querySelector(".modal-overlay");
    const closeBtn = document.getElementById("modalClose");
    const confirmBtn = document.getElementById("confirmLocation");
    const useLocationBtn = document.getElementById("useCurrentLocationBtn");
    const searchInput = document.getElementById("locationSearchInput");

    if (overlay) overlay.addEventListener("click", closeLocationModal);
    if (closeBtn) closeBtn.addEventListener("click", closeLocationModal);
    if (confirmBtn) confirmBtn.addEventListener("click", () => {
        saveLocation();
        updateLocationDisplay();
        closeLocationModal();
    });
    if (useLocationBtn) {
        useLocationBtn.addEventListener("click", () => {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    () => showNotification(" Đã xác định vị trí gần bạn!", "success"),
                    () => showNotification(" Không thể xác định vị trí!", "error")
                );
            } else {
                showNotification(" Trình duyệt không hỗ trợ định vị!", "error");
            }
        });
    }
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const keyword = e.target.value.toLowerCase();
            const districts = districtsByCity[currentCity] || [];
            const filtered = districts.filter(d => d.toLowerCase().includes(keyword));
            const districtList = document.getElementById("districtList");
            if (districtList) {
                districtList.innerHTML = `
                    <div class="location-item" data-district="">
                        <span>📌 Tất cả ${currentCityName}</span>
                    </div>
                    ${filtered.map(district => `<div class="location-item" data-district="${district}"><span> ${district}</span></div>`).join("")}
                    ${filtered.length === 0 && keyword ? '<div style="text-align:center;padding:20px;color:var(--gray);">Không tìm thấy</div>' : ''}
                `;
                document.querySelectorAll("[data-district]").forEach(el => {
                    el.addEventListener("click", () => {
                        currentDistrict = el.dataset.district;
                        renderDistrictList();
                        updateLocationDisplay();
                    });
                });
            }
        });
    }

    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
            const activeTab = document.getElementById(btn.dataset.tab === "city" ? "cityTab" : "districtTab");
            if (activeTab) activeTab.classList.add("active");
        });
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal && modal.classList.contains("show")) closeLocationModal();
    });
}

// ============================================
// KHỞI TẠO
// ============================================
document.addEventListener("DOMContentLoaded", async () => {
    updateAuthUI();
    initUserDropdown();
    updateCartBadge();

    loadLocationFromStorage();
    initModal();

    const locationSelector = document.getElementById("locationSelector");
    if (locationSelector) locationSelector.addEventListener("click", openLocationModal);

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentSearch = e.target.value;
            filterAndRender();
        });
    }

    document.querySelectorAll(".food-category-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".food-category-chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            currentCategory = chip.dataset.category;
            filterAndRender();
        });
    });

    //  Đồng bộ avatar từ server (chạy song song, không block load trang)
    syncUserFromServer();

    // Load nhà hàng từ API (CHỈ TỪ DATABASE, KHÔNG MOCK)
    await loadRestaurantsFromAPI();
});

// Export functions
window.showNotification = showNotification;
window.isLoggedIn = isLoggedIn;