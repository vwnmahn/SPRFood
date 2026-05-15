// ============================================
// RESTAURANT DETAIL - DÙNG CHUNG CHO TẤT CẢ NHÀ HÀNG
// ============================================

// Lấy ID nhà hàng từ URL
const urlParams = new URLSearchParams(window.location.search);
const RESTAURANT_ID = parseInt(urlParams.get('id'));
if (isNaN(RESTAURANT_ID) || RESTAURANT_ID <= 0) {
    console.error('Invalid restaurant ID in URL:', urlParams.get('id'));
    // Hiển thị thông báo lỗi và chuyển hướng
    document.body.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: 'Inter', sans-serif; text-align: center; padding: 20px;">
            <i class="fas fa-store-slash" style="font-size: 64px; color: #dc3545; margin-bottom: 20px;"></i>
            <h2 style="margin-bottom: 10px;">❌ Không tìm thấy nhà hàng</h2>
            <p style="color: #6c757d; margin-bottom: 20px;">ID nhà hàng không hợp lệ. Vui lòng quay lại trang chủ.</p>
            <button onclick="window.location.href='user.html'" style="background: #ff5e3a; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;">
                <i class="fas fa-arrow-left"></i> Về trang chủ
            </button>
        </div>
    `;
    throw new Error('Invalid restaurant ID');
}
// API URL
const API_BASE_URL = "http://localhost:8080/api";
const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

// State
let currentRestaurant = null;
let menuData = [];
let selectedItem = null;
let selectedQuantity = 1;
let currentCategory = "all";

// ========== LẤY TOKEN ==========
function getAuthToken() {
    return localStorage.getItem('sprfood_token') || sessionStorage.getItem('sprfood_token');
}

function isLoggedIn() {
    return !!getAuthToken();
}

function getCurrentUser() {
    const userStr = localStorage.getItem('sprfood_user') || sessionStorage.getItem('sprfood_user');
    if (!userStr || userStr === 'undefined' || userStr === 'null') return null;
    try {
        return JSON.parse(userStr);
    } catch (e) {
        console.error("Parse user error:", e);
        return null;
    }
}

// ========== AVATAR USER ==========
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

// ========== CẬP NHẬT UI ĐĂNG NHẬP ==========
function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const userDropdown = document.getElementById('userDropdown');
    const userNameDisplay = document.getElementById('userNameDisplay');
    
    console.log("Updating Auth UI - isLoggedIn:", isLoggedIn());
    
    if (isLoggedIn()) {
        const user = getCurrentUser();
        console.log("User data:", user);
        
        if (loginBtn) loginBtn.style.display = 'none';
        if (userDropdown) {
            userDropdown.style.display = 'block';
            if (userNameDisplay) {
                const name = user?.username || user?.email?.split('@')[0] || 'User';
                userNameDisplay.textContent = name;
                console.log("Set username to:", name);
            }
            // 👉 HIỂN THỊ AVATAR TỪ DATABASE
            renderUserAvatar(getAvatarUrl(user));
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (userDropdown) userDropdown.style.display = 'none';
    }
}

// ========== ĐỒNG BỘ USER TỪ SERVER ==========
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
            const stored = getCurrentUser();
            const merged = { ...stored, ...freshUser };
            localStorage.setItem('sprfood_user', JSON.stringify(merged));
            // 👉 CẬP NHẬT AVATAR
            renderUserAvatar(getAvatarUrl(merged));
        }
    } catch (e) {
        console.warn('Không thể đồng bộ thông tin user:', e);
    }
}

// ========== GỌI API CÓ TOKEN ==========
async function apiCall(url, options = {}) {
    const token = getAuthToken();
    
    if (!token) {
        console.warn("No token found, redirecting to login");
        showNotification('🔐 Vui lòng đăng nhập!', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return null;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        });
        
        if (response.status === 401) {
            localStorage.removeItem('sprfood_token');
            localStorage.removeItem('sprfood_user');
            sessionStorage.removeItem('sprfood_token');
            sessionStorage.removeItem('sprfood_user');
            showNotification('🔐 Phiên đăng nhập hết hạn!', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return null;
        }
        
        if (response.status === 404) {
            return null;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showNotification('❌ Lỗi kết nối đến server!', 'error');
        return null;
    }
}

// ========== LẤY DỮ LIỆU ==========

// Lấy thông tin nhà hàng từ DB
async function fetchRestaurant() {
    const data = await apiCall(`/restaurants/${RESTAURANT_ID}`);
    
    if (!data || data.status === 'INACTIVE') {
        showRestaurantNotFound();
        return null;
    }
    
    currentRestaurant = data;
    console.log("Restaurant data:", data);
    console.log("Restaurant imageUrl:", data.imageUrl);
    
    // Cập nhật tên nhà hàng
    const nameEl = document.getElementById("restaurantName");
    if (nameEl) nameEl.textContent = data.name || 'Nhà hàng';
    
    // Cập nhật địa chỉ
    const addressEl = document.getElementById("restaurantAddress");
    if (addressEl) addressEl.textContent = data.address || 'Đang cập nhật';
    
    // Cập nhật số sao
    const ratingEl = document.getElementById("restaurantRating");
    if (ratingEl) ratingEl.textContent = data.rating || '4.5';
    
    // Cập nhật thời gian giao hàng
    const deliveryTimeEl = document.getElementById("restaurantDeliveryTime");
    if (deliveryTimeEl) {
        deliveryTimeEl.textContent = data.deliveryTime || '20-30 phút';
    }
    
    // 👉 CẬP NHẬT ẢNH NHÀ HÀNG
    updateRestaurantImage(data.imageUrl);
    
    // Cập nhật giảm giá
    const discountEl = document.getElementById("restaurantDiscount");
    const discountBadge = document.getElementById("discountBadge");
    if (discountEl && discountBadge) {
        if (data.discount && data.discount > 0) {
            discountEl.textContent = `Giảm ${data.discount}%`;
            discountBadge.style.display = 'flex';
        } else {
            discountBadge.style.display = 'none';
        }
    }
    
    document.title = `${data.name || 'Nhà hàng'} | SPRFood`;
    
    return data;
}

// 👉 HÀM CẬP NHẬT ẢNH NHÀ HÀNG
function updateRestaurantImage(imageUrl) {
    const bannerImg = document.getElementById('restaurantBannerImg');
    const placeholder = document.querySelector('.restaurant-banner-placeholder');
    
    if (!bannerImg) return;
    
    if (imageUrl) {
        let fullUrl = imageUrl;
        if (!fullUrl.startsWith('http')) {
            if (fullUrl.startsWith('/uploads')) {
                fullUrl = `${SERVER_BASE_URL}${fullUrl}`;
            } else {
                fullUrl = `${SERVER_BASE_URL}/uploads/restaurant/${fullUrl}`;
            }
        }
        
        console.log('Setting banner image to:', fullUrl);
        bannerImg.src = fullUrl;
        bannerImg.onload = () => {
            bannerImg.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
        };
        bannerImg.onerror = () => {
            console.warn('Failed to load image:', fullUrl);
            bannerImg.style.display = 'none';
            if (placeholder) placeholder.style.display = 'flex';
        };
    } else {
        bannerImg.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
    }
}

// Lấy danh sách món ăn từ DB
async function fetchMenu() {
    const data = await apiCall(`/restaurants/${RESTAURANT_ID}/menu`);
    
    console.log("Menu data received:", data);
    
    if (!data || data.length === 0) {
        showEmptyMenu();
        return;
    }
    
    menuData = data;
    console.log(`✅ Đã tải ${menuData.length} món ăn`);
    renderMenu();
}

// Hiển thị lỗi nếu nhà hàng không tồn tại
function showRestaurantNotFound() {
    const container = document.querySelector('.restaurant-detail-container') || document.querySelector('main');
    if (container) {
        container.innerHTML = `
            <div style="text-align:center;padding:80px;font-family: 'Inter', sans-serif;">
                <i class="fas fa-store-slash" style="font-size:64px;color:#dc3545;margin-bottom:20px;"></i>
                <h2>Không tìm thấy nhà hàng</h2>
                <p>Nhà hàng này có thể đã ngừng hoạt động hoặc không tồn tại.</p>
                <button onclick="window.location.href='user.html'" style="margin-top:20px;padding:12px 24px;background:#ff5e3a;color:white;border:none;border-radius:8px;cursor:pointer;">
                    <i class="fas fa-arrow-left"></i> Về trang chủ
                </button>
            </div>
        `;
    }
}

// Hiển thị khi chưa có món ăn
function showEmptyMenu() {
    const menuGrid = document.getElementById("menuGrid");
    if (menuGrid) {
        menuGrid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px;">
                <i class="fas fa-utensils" style="font-size:48px;color:#6c757d;"></i>
                <p style="color:#6c757d;margin-top:16px;">Nhà hàng đang cập nhật thực đơn</p>
                <p style="color:#6c757d;font-size:13px;">Vui lòng quay lại sau!</p>
            </div>
        `;
    }
}

// Lấy icon theo danh mục
function getCategoryIcon(category) {
    const icons = {
        main: "🍚",
        appetizer: "🥗",
        dessert: "🍰",
        drink: "🥤",
        snack: "🌯",
        cake: "🍰",
        fastfood: "🍔",
        noodle: "🍜",
        food: "🍽️"
    };
    return icons[category] || "🍽️";
}

// Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Lấy URL ảnh món ăn đầy đủ
function getMenuItemImageUrl(item) {
    if (item.imageUrl) {
        if (item.imageUrl.startsWith('http')) return item.imageUrl;
        if (item.imageUrl.startsWith('/uploads')) return `${SERVER_BASE_URL}${item.imageUrl}`;
        return `${SERVER_BASE_URL}/uploads/menu/${item.imageUrl}`;
    }
    return null;
}

// Render menu từ dữ liệu API
function renderMenu() {
    const menuGrid = document.getElementById("menuGrid");
    if (!menuGrid) return;
    
    let filtered = currentCategory === "all" ? menuData : menuData.filter(item => item.category === currentCategory);
    
    if (filtered.length === 0) {
        menuGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;">
            <i class="fas fa-search" style="font-size:48px;color:#6c757d;"></i>
            <p style="color:#6c757d;">Chưa có món trong danh mục này</p>
        </div>`;
        return;
    }
    
    menuGrid.innerHTML = filtered.map(item => {
        const imageUrl = getMenuItemImageUrl(item);
        return `
            <div class="menu-item" data-id="${item.id}">
                <div class="menu-item-image">
                    ${imageUrl ? 
                        `<img src="${imageUrl}" alt="${escapeHtml(item.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : 
                        ''
                    }
                    <span style="${imageUrl ? 'display:none' : 'display:flex'}">${escapeHtml(item.image) || getCategoryIcon(item.category)}</span>
                </div>
                <div class="menu-item-details">
                    <h3 class="menu-item-title">${escapeHtml(item.name)}</h3>
                    ${item.popular ? '<span class="popular-badge">Phổ biến</span>' : ''}
                    <p class="menu-item-description">${escapeHtml(item.description || '')}</p>
                    <div class="menu-item-price">
                        <span class="current-price">${(item.price || 0).toLocaleString()}₫</span>
                        ${item.oldPrice ? `<span class="old-price">${item.oldPrice.toLocaleString()}₫</span>` : ''}
                    </div>
                    <button class="add-to-cart" data-id="${item.id}">
                        <i class="fas fa-cart-plus"></i> Thêm vào giỏ
                    </button>
                </div>
            </div>
        `;
    }).join("");
    
    // Gắn sự kiện cho nút thêm vào giỏ
    document.querySelectorAll(".add-to-cart").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const itemId = parseInt(btn.dataset.id);
            const item = menuData.find(i => i.id === itemId);
            if (item) {
                openQuantityModal(item);
            }
        });
    });
}

// ========== MODAL SỐ LƯỢNG ==========
function openQuantityModal(item) {
    selectedItem = item;
    selectedQuantity = 1;
    
    const imgEl = document.getElementById("selectedItemImg");
    const nameEl = document.getElementById("selectedItemName");
    const priceEl = document.getElementById("selectedItemPrice");
    const qtyEl = document.getElementById("quantityValue");
    
    const imageUrl = getMenuItemImageUrl(item);
    if (imgEl) {
        if (imageUrl) {
            imgEl.innerHTML = `<img src="${imageUrl}" style="width:60px;height:60px;object-fit:cover;border-radius:12px;">`;
        } else {
            imgEl.innerHTML = item.image || getCategoryIcon(item.category);
        }
    }
    if (nameEl) nameEl.textContent = item.name;
    if (priceEl) priceEl.textContent = (item.price || 0).toLocaleString() + "₫";
    if (qtyEl) qtyEl.textContent = "1";
    
    const modal = document.getElementById("quantityModal");
    if (modal) modal.classList.add("show");
}

function closeQuantityModal() {
    const modal = document.getElementById("quantityModal");
    if (modal) modal.classList.remove("show");
    selectedItem = null;
}

function incrementQuantity() {
    selectedQuantity++;
    const qtyEl = document.getElementById("quantityValue");
    if (qtyEl) qtyEl.textContent = selectedQuantity;
}

function decrementQuantity() {
    if (selectedQuantity > 1) {
        selectedQuantity--;
        const qtyEl = document.getElementById("quantityValue");
        if (qtyEl) qtyEl.textContent = selectedQuantity;
    }
}

function confirmAddToCart() {
    if (!selectedItem) return;
    
    const cart = JSON.parse(localStorage.getItem("sprfood_cart") || "[]");
    const existing = cart.find(i => i.restaurantId === RESTAURANT_ID && i.itemId === selectedItem.id);
    
    if (existing) {
        existing.quantity += selectedQuantity;
    } else {
        cart.push({
            id: Date.now(),
            restaurantId: RESTAURANT_ID,
            restaurantName: currentRestaurant?.name || 'Nhà hàng',
            itemId: selectedItem.id,
            name: selectedItem.name,
            price: selectedItem.price,
            quantity: selectedQuantity,
            image: selectedItem.image || getCategoryIcon(selectedItem.category)
        });
    }
    
    localStorage.setItem("sprfood_cart", JSON.stringify(cart));
    showNotification(` Đã thêm ${selectedQuantity} "${selectedItem.name}" vào giỏ hàng!`);
    closeQuantityModal();
    updateCartBadge();
}

function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem("sprfood_cart") || "[]");
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
    }, 2500);
}

// ========== USER DROPDOWN EVENTS ==========
function initUserDropdown() {
    const avatarBtn = document.getElementById('userAvatarBtn');
    const dropdownMenu = document.getElementById('userDropdownMenu');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileLink = document.getElementById('profileLink');
    const ordersLink = document.getElementById('ordersLink');
    
    console.log("Init dropdown - elements:", { avatarBtn, dropdownMenu });
    
    // Toggle dropdown khi click avatar
    if (avatarBtn) {
        // Xóa event cũ để tránh trùng
        const newBtn = avatarBtn.cloneNode(true);
        avatarBtn.parentNode.replaceChild(newBtn, avatarBtn);
        
        newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log("Avatar clicked, toggling dropdown");
            if (dropdownMenu) {
                dropdownMenu.classList.toggle('show');
            }
        });
    }
    
    // Đóng dropdown khi click ra ngoài
    document.addEventListener('click', function(e) {
        if (dropdownMenu && avatarBtn && !avatarBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });
    
    // Xử lý đăng xuất
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    // Xử lý link tài khoản
    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            if (!isLoggedIn()) {
                e.preventDefault();
                showNotification(' Vui lòng đăng nhập!', 'error');
                setTimeout(() => window.location.href = 'login.html', 500);
            }
        });
    }
    
    // Xử lý link đơn hàng
    if (ordersLink) {
        ordersLink.addEventListener('click', (e) => {
            if (!isLoggedIn()) {
                e.preventDefault();
                showNotification(' Vui lòng đăng nhập!', 'error');
                setTimeout(() => window.location.href = 'login.html', 500);
            }
        });
    }
}

// ========== HÀM ĐĂNG XUẤT ==========
async function logout() {
    const token = getAuthToken();
    if (token) {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch(e) {
            console.error("Logout error:", e);
        }
    }
    
    localStorage.removeItem('sprfood_token');
    localStorage.removeItem('sprfood_user');
    sessionStorage.removeItem('sprfood_token');
    sessionStorage.removeItem('sprfood_user');
    
    showNotification(' Đã đăng xuất!');
    setTimeout(() => window.location.href = 'login.html', 1000);
}

// ========== MODAL EVENTS ==========
function initModalEvents() {
    const modal = document.getElementById("quantityModal");
    if (!modal) return;
    
    const closeBtn = modal.querySelector(".quantity-modal-close");
    const overlay = modal.querySelector(".quantity-modal-overlay");
    const plusBtn = modal.querySelector(".qty-plus");
    const minusBtn = modal.querySelector(".qty-minus");
    const confirmBtn = modal.querySelector(".btn-confirm-modal");
    const cancelBtn = modal.querySelector(".btn-cancel-modal");
    
    if (closeBtn) closeBtn.onclick = closeQuantityModal;
    if (overlay) overlay.onclick = closeQuantityModal;
    if (plusBtn) plusBtn.onclick = incrementQuantity;
    if (minusBtn) minusBtn.onclick = decrementQuantity;
    if (confirmBtn) confirmBtn.onclick = confirmAddToCart;
    if (cancelBtn) cancelBtn.onclick = closeQuantityModal;
}

// ========== KHỞI TẠO ==========
async function init() {
    console.log("Initializing restaurant detail page...");
    
    // Cập nhật UI đăng nhập
    updateAuthUI();
    
    // Khởi tạo dropdown user
    initUserDropdown();
    
    // Đồng bộ user từ server (cập nhật avatar)
    syncUserFromServer();
    
    // Kiểm tra đăng nhập
    if (!isLoggedIn()) {
        showNotification(' Vui lòng đăng nhập để xem chi tiết nhà hàng!', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }
    
    // Hiển thị loading
    const menuGrid = document.getElementById("menuGrid");
    if (menuGrid) {
        menuGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;">
            <i class="fas fa-spinner fa-spin" style="font-size:48px;color:#ff5e3a;"></i>
            <p style="margin-top:16px;">Đang tải thực đơn...</p>
        </div>`;
    }
    
    await fetchRestaurant();
    await fetchMenu();
    
    // Gắn sự kiện cho category chips
    const categoryChips = document.querySelectorAll(".category-chip");
    if (categoryChips.length > 0) {
        categoryChips.forEach(chip => {
            chip.addEventListener("click", () => {
                categoryChips.forEach(c => c.classList.remove("active"));
                chip.classList.add("active");
                currentCategory = chip.dataset.category;
                renderMenu();
            });
        });
    }
    
    updateCartBadge();
    console.log(" Restaurant detail page initialized");
}

// ========== DOM CONTENT LOADED ==========
document.addEventListener("DOMContentLoaded", () => {
    initModalEvents();
    init();
});