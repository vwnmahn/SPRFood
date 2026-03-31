// ============================================
// CẤU HÌNH API
// ============================================
const API_BASE_URL = "https://your-api-domain.com/api"; // Thay bằng URL backend của bạn

// ============================================
// QUẢN LÝ ĐĂNG NHẬP
// ============================================

function getAuthToken() {
    return localStorage.getItem('sprfood_token') || sessionStorage.getItem('sprfood_token');
}

function getCurrentUser() {
    const userStr = localStorage.getItem('sprfood_user') || sessionStorage.getItem('sprfood_user');
    return userStr ? JSON.parse(userStr) : null;
}

function isLoggedIn() {
    return !!getAuthToken();
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const userDropdown = document.getElementById('userDropdown');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const cartBtnLink = document.getElementById('cartBtnLink');
    
    if (isLoggedIn()) {
        const user = getCurrentUser();
        if (loginBtn) loginBtn.style.display = 'none';
        if (userDropdown) {
            userDropdown.style.display = 'block';
            if (userNameDisplay) {
                const name = user?.name?.split(' ').pop() || 'User';
                userNameDisplay.textContent = name;
            }
        }
        // Cho phép vào giỏ hàng
        if (cartBtnLink) {
            cartBtnLink.onclick = null;
            cartBtnLink.href = 'cart.html';
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (userDropdown) userDropdown.style.display = 'none';
        // Chặn vào giỏ hàng, chuyển hướng ngay lập tức đến đăng nhập
        if (cartBtnLink) {
            cartBtnLink.href = 'javascript:void(0)';
            cartBtnLink.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 300);
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
    showNotification('👋 Đã đăng xuất!');
    setTimeout(() => window.location.reload(), 800);
}

function initUserDropdown() {
    const avatarBtn = document.getElementById('userAvatarBtn');
    const dropdownMenu = document.getElementById('userDropdownMenu');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (avatarBtn) {
        avatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dropdownMenu) dropdownMenu.classList.toggle('show');
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
// KIỂM TRA ĐĂNG NHẬP KHI VÀO TRANG CHI TIẾT QUÁN
function checkAuthAndRedirect() {
    if (!isLoggedIn()) {
        showNotification('🔐 Vui lòng đăng nhập để xem thông tin cửa hàng!', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 300);
        return false;
    }
    return true;
}
// GIỎ HÀNG - CHỈ HOẠT ĐỘNG KHI ĐÃ ĐĂNG NHẬP
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

function addToCart(restaurant, item) {
    if (!isLoggedIn()) {
        showNotification('🔐 Vui lòng đăng nhập để thêm vào giỏ hàng!', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 300);
        return false;
    }
    
    const cart = getCart();
    const existingItem = cart.find(i => i.restaurantId === restaurant.id && i.itemId === item.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: Date.now(),
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            restaurantSlug: restaurant.slug,
            itemId: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            image: item.image
        });
    }
    
    saveCart(cart);
    showNotification(`✅ Đã thêm "${item.name}" vào giỏ hàng!`);
    return true;
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
// DỮ LIỆU QUÁN ĂN
const restaurantsData = [
    { id: 1, name: "Phở Thìn - Bờ Hồ", slug: "pho-thin-bo-ho", address: "13 Lò Sũ, P. Lý Thái Tổ", city: "hanoi", district: "Hoàn Kiếm", fullAddress: "13 Lò Sũ, P. Lý Thái Tổ, Hoàn Kiếm, Hà Nội", category: "food", rating: 4.9, deliveryTime: "15-25 phút", discount: "12%", popular: true },
    { id: 2, name: "Royaltea - Tây Sơn", slug: "royaltea-tay-son", address: "126 Tây Sơn", city: "hanoi", district: "Đống Đa", fullAddress: "126 Tây Sơn, P. Quang Trung, Đống Đa, Hà Nội", category: "drink", rating: 4.9, deliveryTime: "20-30 phút", discount: "14%", popular: true },
    { id: 3, name: "Chay Sen - Hồ Tây", slug: "chay-sen-ho-tay", address: "20 Quảng An", city: "hanoi", district: "Tây Hồ", fullAddress: "20 Quảng An, P. Quảng An, Tây Hồ, Hà Nội", category: "vegan", rating: 4.8, deliveryTime: "25-35 phút", discount: "15%", popular: true },
    { id: 4, name: "Paris Gateaux - Tràng Tiền", slug: "paris-gateaux-trang-tien", address: "25 Tràng Tiền", city: "hanoi", district: "Hoàn Kiếm", fullAddress: "25 Tràng Tiền, P. Tràng Tiền, Hoàn Kiếm, Hà Nội", category: "cake", rating: 4.9, deliveryTime: "25-35 phút", discount: "10%", popular: true },
    { id: 5, name: "Pizza Hut - Thái Hà", slug: "pizza-hut-thai-ha", address: "112 Thái Hà", city: "hanoi", district: "Đống Đa", fullAddress: "112 Thái Hà, P. Trung Liệt, Đống Đa, Hà Nội", category: "fastfood", rating: 4.7, deliveryTime: "20-30 phút", discount: "15%", popular: true },
    { id: 6, name: "Phở 10 Lý Quốc Sư", slug: "pho-10-ly-quoc-su", address: "10 Lý Quốc Sư", city: "hanoi", district: "Hoàn Kiếm", fullAddress: "10 Lý Quốc Sư, P. Hàng Trống, Hoàn Kiếm, Hà Nội", category: "noodle", rating: 4.8, deliveryTime: "15-25 phút", discount: "10%", popular: true }
];

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

let currentCity = "hanoi";
let currentCityName = "Hà Nội";
let currentDistrict = "";
let currentCategory = "all";
let currentSearch = "";
let currentPage = 1;
const itemsPerPage = 6;
// ĐỊNH VỊ
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
    if (displaySpan) {
        displaySpan.textContent = currentDistrict ? `${currentDistrict}, ${currentCityName}` : currentCityName;
    }
    if (locationText) {
        locationText.textContent = currentDistrict ? `${currentDistrict}, ${currentCityName}` : currentCityName;
    }
    filterAndRender();
}

function saveLocation() {
    localStorage.setItem("sprfood_city", currentCity);
    localStorage.setItem("sprfood_district", currentDistrict);
}
// LỌC VÀ HIỂN THỊ
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
        filtered = filtered.filter(r => r.name.toLowerCase().includes(searchLower) || r.fullAddress.toLowerCase().includes(searchLower));
    }
    return filtered;
}

function getIconForCategory(category) {
    const icons = { food: "utensils", drink: "mug-hot", vegan: "leaf", cake: "cake-candles", fastfood: "burger", noodle: "bowl-food" };
    return icons[category] || "store";
}

function renderRestaurants() {
    let filtered = filterRestaurants();
    const total = filtered.length;
    document.getElementById("totalCount").textContent = total;
    document.getElementById("resultHint").textContent = `Tìm thấy ${total} địa điểm tại ${currentDistrict ? currentDistrict + ", " : ""}${currentCityName}`;
    
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);
    const colors = ["#f97316", "#f59e0b", "#8b5cf6", "#10b981", "#3b82f6", "#ef4444"];
    
    const grid = document.getElementById("restaurantGrid");
    if (paginated.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;"><i class="fas fa-store-slash" style="font-size:48px;color:var(--gray);margin-bottom:16px;"></i><p style="color:var(--gray);">Không tìm thấy địa điểm phù hợp</p></div>`;
        document.getElementById("pagination").innerHTML = "";
        return;
    }
    
    grid.innerHTML = paginated.map((r, i) => `
        <div class="restaurant-card" data-slug="${r.slug}" data-name="${r.name}">
            <div class="card-img" style="background: linear-gradient(135deg, ${colors[i % colors.length]}, ${colors[(i+2) % colors.length]});">
                <i class="fas fa-${getIconForCategory(r.category)}"></i>
                <span class="discount-badge">-${r.discount}</span>
            </div>
            <div class="card-content">
                <h3 class="card-title">${r.name}</h3>
                <div class="card-address"><i class="fas fa-location-dot"></i> ${r.fullAddress}</div>
                <div class="card-meta">
                    <div class="rating"><i class="fas fa-star"></i> ${r.rating}</div>
                    <div class="delivery-time"><i class="fas fa-motorcycle"></i> ${r.deliveryTime}</div>
                </div>
            </div>
        </div>
    `).join("");
    
    // Xử lý click vào quán - KIỂM TRA ĐĂNG NHẬP TRƯỚC KHI CHUYỂN
    document.querySelectorAll(".restaurant-card").forEach(card => {
        card.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Kiểm tra đăng nhập trước khi chuyển sang trang chi tiết
            if (!isLoggedIn()) {
                const restaurantName = card.getAttribute('data-name') || 'cửa hàng';
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 300);
                return;
            }
            
            // Nếu đã đăng nhập, chuyển đến trang chi tiết
            const slug = card.getAttribute("data-slug");
            if (slug) {
                window.location.href = `${slug}.html`;
            }
        });
    });
    
    const totalPages = Math.ceil(total / itemsPerPage);
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const paginationDiv = document.getElementById("pagination");
    if (totalPages <= 1) { paginationDiv.innerHTML = ""; return; }
    
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
// MODAL ĐỊNH VỊ
function openLocationModal() {
    const modal = document.getElementById("locationModal");
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
    renderCityList();
    renderDistrictList();
}

function closeLocationModal() {
    const modal = document.getElementById("locationModal");
    modal.classList.remove("show");
    document.body.style.overflow = "";
}

function renderCityList() {
    const cityList = document.getElementById("cityList");
    cityList.innerHTML = cities.map(city => `
        <div class="location-item ${currentCity === city.id ? 'selected' : ''}" data-city="${city.id}">
            <span>${city.name}</span>
            ${currentCity === city.id ? '<i class="fas fa-check-circle"></i>' : ''}
        </div>
    `).join("");
    document.querySelectorAll("[data-city]").forEach(el => {
        el.addEventListener("click", () => {
            currentCity = el.dataset.city;
            currentCityName = cities.find(c => c.id === currentCity).name;
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
                navigator.geolocation.getCurrentPosition(() => {
                    showNotification("📍 Đã xác định vị trí gần bạn!", "success");
                }, () => {
                    showNotification("⚠️ Không thể xác định vị trí!", "error");
                });
            } else {
                showNotification("⚠️ Trình duyệt không hỗ trợ định vị!", "error");
            }
        });
    }
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const keyword = e.target.value.toLowerCase();
            const districts = districtsByCity[currentCity] || [];
            const filtered = districts.filter(d => d.toLowerCase().includes(keyword));
            const districtList = document.getElementById("districtList");
            districtList.innerHTML = `
                <div class="location-item" data-district="">
                    <span>📌 Tất cả ${currentCityName}</span>
                </div>
                ${filtered.map(district => `<div class="location-item" data-district="${district}"><span>📍 ${district}</span></div>`).join("")}
                ${filtered.length === 0 && keyword ? '<div style="text-align:center;padding:20px;color:var(--gray);">Không tìm thấy</div>' : ''}
            `;
            document.querySelectorAll("[data-district]").forEach(el => {
                el.addEventListener("click", () => {
                    currentDistrict = el.dataset.district;
                    renderDistrictList();
                    updateLocationDisplay();
                });
            });
        });
    }
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
            document.getElementById(btn.dataset.tab === "city" ? "cityTab" : "districtTab").classList.add("active");
        });
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("show")) closeLocationModal();
    });
}
// KIỂM TRA ĐĂNG NHẬP KHI LOAD TRANG CHI TIẾT
function checkPageAccess() {
    // Lấy tên file hiện tại
    const currentPage = window.location.pathname.split('/').pop();
    
    // Nếu là trang chi tiết quán (không phải user.html, login.html, cart.html)
    const isDetailPage = currentPage !== 'user.html' && 
                         currentPage !== 'login.html' && 
                         currentPage !== 'cart.html' &&
                         currentPage !== '' &&
                         !currentPage.includes('user');
    
    if (isDetailPage && !isLoggedIn()) {
        showNotification('🔐 Vui lòng đăng nhập để xem thông tin cửa hàng!', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 300);
        return false;
    }
    return true;
}

// KHỞI TẠO

document.addEventListener("DOMContentLoaded", () => {
    // Kiểm tra đăng nhập khi vào trang
    checkPageAccess();
    
    // User
    updateAuthUI();
    initUserDropdown();
    updateCartBadge();
    
    // Định vị
    loadLocationFromStorage();
    initModal();
    document.getElementById("locationSelector")?.addEventListener("click", openLocationModal);
    
    // Tìm kiếm
    document.getElementById("searchInput")?.addEventListener("input", (e) => {
        currentSearch = e.target.value;
        filterAndRender();
    });
    
    // Danh mục
    document.querySelectorAll(".food-category-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".food-category-chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            currentCategory = chip.dataset.category;
            filterAndRender();
        });
    });
    
    renderRestaurants();
});

// Export functions để sử dụng trong các trang chi tiết quán
window.addToCart = addToCart;
window.isLoggedIn = isLoggedIn;
window.showNotification = showNotification;
window.checkAuthAndRedirect = checkAuthAndRedirect;