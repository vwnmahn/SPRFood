// ============================================
// ORDER HISTORY PAGE - SPRFood (PRE-FETCH + CACHE)
// ============================================

const API_BASE_URL = "http://localhost:8080/api";

// ========== STATE ==========
let allOrders = [];
let currentFilter = 'all';
let pendingCancelOrderId = null;
let isLoadingDetail = false;
let isLoadingOrders = false;

// ========== CACHE CHO CHI TIẾT ĐƠN HÀNG ==========
const detailCache = new Map(); // Cache kết quả chi tiết đơn hàng
let hoverTimer = null;

// ========== DOM CACHE ==========
const dom = {};

function cacheDom() {
    dom.ordersContainer = document.getElementById('ordersContainer');
    dom.modalBody = document.getElementById('modalBody');
    dom.orderModal = document.getElementById('orderModal');
    dom.cancelModal = document.getElementById('cancelModal');
    dom.toast = document.getElementById('toast');
    dom.cartCount = document.getElementById('cartCount');
    dom.userMenu = document.getElementById('userMenu');
    dom.authButtons = document.getElementById('authButtons');
    dom.userName = document.getElementById('userName');
    dom.cancelOrderId = document.getElementById('cancelOrderId');
    dom.cancelReason = document.getElementById('cancelReason');
}

// ========== UTILITIES ==========
function getAuthToken() {
    return localStorage.getItem('sprfood_token') || sessionStorage.getItem('sprfood_token');
}

function formatCurrency(amount) {
    return (amount || 0).toLocaleString('vi-VN') + '₫';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function getCurrentUser() {
    const userStr = localStorage.getItem('sprfood_user') || sessionStorage.getItem('sprfood_user');
    if (!userStr || userStr === 'undefined' || userStr === 'null') {
        return null;
    }
    try {
        return JSON.parse(userStr);
    } catch (e) {
        console.error('Lỗi parse user data:', e);
        localStorage.removeItem('sprfood_user');
        sessionStorage.removeItem('sprfood_user');
        return null;
    }
}

function getAvatarUrl(user) {
    if (!user) return '';
    return user.avatarUrl || user.avatar || user.imageUrl || user.image || user.picture || user.avatarPath || '';
}

function renderUserAvatar() {
    const userBtn = document.getElementById('userBtn');
    if (!userBtn) return;

    let avatarImg = userBtn.querySelector('img.user-avatar-img');
    const defaultIcon = userBtn.querySelector('i.fa-user-circle');

    if (!avatarImg) {
        avatarImg = document.createElement('img');
        avatarImg.className = 'user-avatar-img';
        avatarImg.alt = 'Avatar';
        avatarImg.style.display = 'none';
        userBtn.prepend(avatarImg);
    }

    const user = getCurrentUser();
    const avatarUrl = getAvatarUrl(user);
    const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

    if (avatarUrl) {
        avatarImg.onload = () => {
            avatarImg.style.display = 'inline-block';
            if (defaultIcon) defaultIcon.style.display = 'none';
        };
        avatarImg.onerror = () => {
            avatarImg.style.display = 'none';
            if (defaultIcon) defaultIcon.style.display = 'inline-block';
        };
        avatarImg.src = avatarUrl.startsWith('http') ? avatarUrl : `${SERVER_BASE_URL}${avatarUrl}`;
    } else {
        avatarImg.style.display = 'none';
        if (defaultIcon) defaultIcon.style.display = 'inline-block';
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const diff = Date.now() - date;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    if (mins < 1440) return `${Math.floor(mins / 60)} giờ trước`;
    if (mins < 10080) return `${Math.floor(mins / 1440)} ngày trước`;
    return date.toLocaleDateString('vi-VN');
}

function getStatusText(s) {
    return { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', delivering: 'Đang giao', completed: 'Hoàn thành', cancelled: 'Đã hủy' }[s] || s;
}

function getStatusClass(s) {
    return { pending: 'status-pending', confirmed: 'status-confirmed', delivering: 'status-delivering', completed: 'status-completed', cancelled: 'status-cancelled' }[s] || '';
}

function getStatusIcon(s) {
    return { pending: 'fa-clock', confirmed: 'fa-check-circle', delivering: 'fa-truck', completed: 'fa-check-double', cancelled: 'fa-times-circle' }[s] || 'fa-info-circle';
}

function mapStatus(be) {
    return { PENDING: 'pending', CONFIRMED: 'confirmed', DELIVERING: 'delivering', COMPLETED: 'completed', CANCELLED: 'cancelled' }[be] || 'pending';
}

function getTimelineSteps(status) {
    const steps = [
        { label: 'Đặt hàng', icon: 'fa-clipboard-list' },
        { label: 'Xác nhận', icon: 'fa-check-circle' },
        { label: 'Đang giao', icon: 'fa-truck' },
        { label: 'Hoàn thành', icon: 'fa-check-double' }
    ];
    const order = ['pending', 'confirmed', 'delivering', 'completed'];
    const idx = order.indexOf(status);
    return steps.map((step, i) => ({ ...step, active: i === idx, completed: i < idx }));
}

function getEmojiForRestaurant(name) {
    if (!name) return '';
    if (name.includes('Phở')) return '';
    if (name.includes('Royaltea')) return '';
    if (name.includes('Chay')) return '';
    if (name.includes('Paris')) return '';
    if (name.includes('Pizza')) return '';
    return '';
}

function showToast(msg, type = 'success') {
    if (!dom.toast) return;
    dom.toast.className = `toast ${type} show`;
    dom.toast.querySelector('.toast-message').textContent = msg;
    setTimeout(() => dom.toast.classList.remove('show'), 3000);
}

// ========== API ==========
async function apiCall(url, options = {}) {
    const token = getAuthToken();
    if (!token) throw new Error('No token');
    
    const res = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers }
    });
    
    if (res.status === 401) {
        showToast('Phiên đăng nhập hết hạn!', 'error');
        setTimeout(() => window.location.href = 'login.html', 1500);
        throw new Error('Unauthorized');
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function fetchAllOrders() {
    const orders = await apiCall('/orders');
    return transformOrders(orders);
}

async function fetchOrdersByStatus(status) {
    const orders = await apiCall(`/orders/status/${status.toLowerCase()}`);
    return transformOrders(orders);
}

async function cancelOrderAPI(orderId, reason) {
    await apiCall(`/orders/${orderId}/cancel`, { method: 'PUT', body: JSON.stringify({ reason: reason || '' }) });
    return true;
}

function transformOrders(orders) {
    if (!orders?.length) return [];
    return orders.map(o => ({
        id: o.id,
        orderCode: o.orderCode,
        restaurantName: o.restaurantName,
        restaurantImage: o.restaurantImage || getEmojiForRestaurant(o.restaurantName),
        orderDate: o.createdAt,
        total: o.totalAmount,
        status: mapStatus(o.status),
        items: (o.items || []).map(i => ({ name: i.name, quantity: i.quantity, price: i.price, image: i.image })),
        deliveryAddress: o.deliveryAddress,
        phone: o.phone,
        note: o.note || '',
        cancelReason: o.cancelReason
    }));
}

// ========== PRE-FETCH: Tải trước khi hover ==========
async function prefetchOrderDetail(orderId) {
    if (detailCache.has(orderId)) return; // Đã có cache
    
    try {
        const token = getAuthToken();
        if (!token) return;
        
        const order = await apiCall(`/orders/${orderId}`);
        detailCache.set(orderId, order);
        console.log(` Prefetched order ${orderId}`);
    } catch (error) {
        console.log(` Failed to prefetch order ${orderId}`);
    }
}

// ========== VIEW ORDER DETAIL (VỚI CACHE) ==========
async function viewOrderDetail(orderId) {
    if (isLoadingDetail) return;
    
    const token = getAuthToken();
    if (!token) return;
    
    isLoadingDetail = true;
    
    // Mở modal + loading ngay lập tức (hiệu ứng skeleton)
    dom.orderModal?.classList.add('show');
    if (dom.modalBody) {
        dom.modalBody.innerHTML = `
            <div class="skeleton-detail">
                <div class="skeleton-line shimmer"></div>
                <div class="skeleton-line shimmer"></div>
                <div class="skeleton-line shimmer" style="width: 70%"></div>
                <div class="skeleton-line shimmer" style="width: 50%"></div>
                <div class="skeleton-divider shimmer"></div>
                <div class="skeleton-line shimmer"></div>
                <div class="skeleton-line shimmer" style="width: 60%"></div>
            </div>
            <div style="text-align:center;padding:20px">
                <div class="fast-spinner"></div>
                <p style="color:#6c757d;margin-top:16px">Đang tải chi tiết...</p>
            </div>
        `;
    }
    
    try {
        // Lấy từ cache nếu có, không thì gọi API
        let order = detailCache.get(orderId);
        if (!order) {
            order = await apiCall(`/orders/${orderId}`);
            detailCache.set(orderId, order);
        }
        
        const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : 'Không xác định';
        const statusClass = getStatusClass(mapStatus(order.status));
        const statusText = getStatusText(mapStatus(order.status));
        
        let itemsHtml = '';
        let totalAmount = 0;
        const items = order.items || [];
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemTotal = item.price * item.quantity;
            totalAmount += itemTotal;
            itemsHtml += `
                <div class="detail-item" style="animation: fadeInUp 0.2s ease forwards; animation-delay: ${i * 0.03}s">
                    <div><strong>${escapeHtml(item.name)}</strong><span class="item-quantity"> x${item.quantity}</span></div>
                    <div>${formatCurrency(itemTotal)}</div>
                </div>
            `;
        }
        
        if (dom.modalBody) {
            dom.modalBody.innerHTML = `
                <div class="delivery-info" style="animation: fadeInUp 0.2s ease forwards">
                    <p><strong><i class="fas fa-store"></i> Nhà hàng:</strong> ${escapeHtml(order.restaurantName)}</p>
                    <p><strong><i class="fas fa-phone"></i> SĐT:</strong> ${escapeHtml(order.phone || 'Chưa cập nhật')}</p>
                    <p><strong><i class="fas fa-map-marker-alt"></i> Địa chỉ:</strong> ${escapeHtml(order.deliveryAddress)}</p>
                    ${order.note ? `<p><strong><i class="fas fa-sticky-note"></i> Ghi chú:</strong> ${escapeHtml(order.note)}</p>` : ''}
                    <p><strong><i class="far fa-calendar-alt"></i> Thời gian:</strong> ${orderDate}</p>
                    <p><strong><i class="fas fa-tag"></i> Trạng thái:</strong> <span class="status-badge ${statusClass}">${statusText}</span></p>
                    ${order.cancelReason ? `<p><strong><i class="fas fa-comment"></i> Lý do hủy:</strong> ${escapeHtml(order.cancelReason)}</p>` : ''}
                </div>
                <h4 style="margin:20px 0 16px 0; animation: fadeInUp 0.2s ease forwards 0.05s"><i class="fas fa-utensils"></i> Chi tiết món ăn</h4>
                <div class="detail-items">${itemsHtml || '<div style="text-align:center;padding:20px">Không có món nào</div>'}</div>
                <div class="detail-summary" style="animation: fadeInUp 0.2s ease forwards 0.1s">
                    <div class="summary-row total"><span>THANH TOÁN:</span><span>${formatCurrency(totalAmount)}</span></div>
                </div>
            `;
        }
    } catch (error) {
        if (dom.modalBody) {
            dom.modalBody.innerHTML = `
                <div style="text-align:center;padding:50px">
                    <i class="fas fa-exclamation-circle" style="font-size:48px;color:#dc3545;margin-bottom:16px"></i>
                    <p style="color:#6c757d">Không thể tải chi tiết đơn hàng!</p>
                    <button class="btn-primary" style="margin-top:16px;padding:8px 24px" onclick="closeModals()">Đóng</button>
                </div>
            `;
        }
    } finally {
        isLoadingDetail = false;
    }
}

// ========== RENDER ==========
function renderOrders() {
    if (!dom.ordersContainer) return;
    
    const filtered = currentFilter === 'all' ? allOrders : allOrders.filter(o => o.status === currentFilter);
    
    if (!filtered.length) {
        dom.ordersContainer.innerHTML = `
            <div class="empty-orders">
                <i class="fas fa-inbox"></i>
                <h3>Không có đơn hàng nào</h3>
                <button class="btn-primary" onclick="window.location.href='user.html'"><i class="fas fa-store"></i> Đặt hàng ngay</button>
            </div>
        `;
        return;
    }
    
    dom.ordersContainer.innerHTML = filtered.map(order => `
        <div class="order-card" data-order-id="${order.id}">
            <div class="order-header">
                <div class="order-id">#${order.orderCode || order.id}</div>
                <div class="order-restaurant"><span>${order.restaurantImage}</span><span>${escapeHtml(order.restaurantName)}</span></div>
                <div class="order-date"><i class="far fa-calendar-alt"></i> ${formatDate(order.orderDate)}</div>
                <div class="status-badge ${getStatusClass(order.status)}"><i class="fas ${getStatusIcon(order.status)}"></i> ${getStatusText(order.status)}</div>
            </div>
            ${order.status !== 'cancelled' ? `
            <div class="order-timeline">
                <div class="timeline-steps">
                    ${getTimelineSteps(order.status).map(s => `
                        <div class="step ${s.completed ? 'completed' : ''} ${s.active ? 'active' : ''}">
                            <div class="step-icon"><i class="fas ${s.icon}"></i></div>
                            <div class="step-label">${s.label}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            <div class="order-body">
                <div class="items-preview">
                    ${(order.items.slice(0, 2).map(i => `
                        <div class="preview-item">
                            <div class="item-name"><span>${escapeHtml(i.name)}</span><span class="item-quantity">x${i.quantity}</span></div>
                            <div class="item-price">${formatCurrency(i.price * i.quantity)}</div>
                        </div>
                    `).join(''))}
                    ${order.items.length > 2 ? `<div class="more-items"><i class="fas fa-ellipsis-h"></i> và ${order.items.length - 2} món khác</div>` : ''}
                </div>
                <div class="order-total"><span>Tổng cộng:</span><span>${formatCurrency(order.total)}</span></div>
            </div>
            <div class="order-actions">
                <button class="btn-view" data-id="${order.id}"><i class="fas fa-eye"></i> Chi tiết</button>
                ${order.status === 'pending' ? `<button class="btn-cancel" data-id="${order.id}" data-code="${order.orderCode}"><i class="fas fa-times"></i> Hủy đơn</button>` : ''}
                ${order.status === 'completed' ? `<button class="btn-reorder" data-id="${order.id}"><i class="fas fa-shopping-cart"></i> Đặt lại</button>` : ''}
            </div>
        </div>
    `).join('');
    
    // Attach events với pre-fetch on hover
    dom.ordersContainer.querySelectorAll('.btn-view').forEach(btn => {
        const orderId = parseInt(btn.dataset.id);
        
        // Pre-fetch khi hover (tải trước, không đợi click)
        btn.onmouseenter = () => {
            if (hoverTimer) clearTimeout(hoverTimer);
            hoverTimer = setTimeout(() => prefetchOrderDetail(orderId), 100);
        };
        
        btn.onclick = (e) => { 
            e.stopPropagation(); 
            viewOrderDetail(orderId);
        };
    });
    
    dom.ordersContainer.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); showCancelModal(parseInt(btn.dataset.id)); };
    });
    
    dom.ordersContainer.querySelectorAll('.btn-reorder').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); reorder(parseInt(btn.dataset.id)); };
    });
}

// ========== ORDER ACTIONS ==========
function showCancelModal(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    pendingCancelOrderId = orderId;
    if (dom.cancelOrderId) dom.cancelOrderId.textContent = order?.orderCode || orderId;
    if (dom.cancelReason) dom.cancelReason.value = '';
    dom.cancelModal?.classList.add('show');
}

async function confirmCancelOrder() {
    if (!pendingCancelOrderId) return;
    const reason = dom.cancelReason?.value || '';
    const success = await cancelOrderAPI(pendingCancelOrderId, reason);
    if (success) {
        showToast('Đã hủy đơn hàng!');
        await loadOrders();
    }
    closeCancelModal();
    pendingCancelOrderId = null;
}

function reorder(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    let cart = JSON.parse(localStorage.getItem('sprfood_cart') || '[]');
    order.items.forEach(item => {
        const existing = cart.find(i => i.name === item.name && i.restaurantName === order.restaurantName);
        if (existing) existing.quantity += item.quantity;
        else cart.push({ id: Date.now() + Math.random(), name: item.name, price: item.price, quantity: item.quantity, restaurantId: order.id, restaurantName: order.restaurantName, image: item.image || '🍽️' });
    });
    
    localStorage.setItem('sprfood_cart', JSON.stringify(cart));
    updateCartCount();
    showToast('Đã thêm vào giỏ hàng!');
    setTimeout(() => window.location.href = 'cart.html', 800);
}

// ========== LOAD DATA ==========
async function loadOrders() {
    if (isLoadingOrders) return;
    isLoadingOrders = true;
    
    if (dom.ordersContainer) {
        dom.ordersContainer.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Đang tải...</p></div>`;
    }
    
    try {
        allOrders = await fetchAllOrders();
        renderOrders();
    } catch (error) {
        if (dom.ordersContainer) {
            dom.ordersContainer.innerHTML = `<div class="empty-orders"><i class="fas fa-exclamation-circle"></i><h3>Lỗi tải dữ liệu</h3><button class="btn-primary" onclick="location.reload()">Thử lại</button></div>`;
        }
    } finally {
        isLoadingOrders = false;
    }
}

function updateCartCount() {
    if (!dom.cartCount) return;
    const cart = JSON.parse(localStorage.getItem('sprfood_cart') || '[]');
    const total = cart.reduce((s, i) => s + i.quantity, 0);
    dom.cartCount.textContent = total;
    dom.cartCount.style.display = total ? 'inline-flex' : 'none';
}

// ========== UI ==========
function closeModals() {
    dom.orderModal?.classList.remove('show');
    dom.cancelModal?.classList.remove('show');
}

function closeCancelModal() {
    dom.cancelModal?.classList.remove('show');
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = async () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.status;
            detailCache.clear(); // Xóa cache khi đổi filter
            await loadOrders();
        };
    });
    
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModals);
    document.getElementById('closeModalFooterBtn')?.addEventListener('click', closeModals);
    document.getElementById('closeCancelModalBtn')?.addEventListener('click', closeCancelModal);
    document.getElementById('keepOrderBtn')?.addEventListener('click', closeCancelModal);
    document.getElementById('confirmCancelBtn')?.addEventListener('click', confirmCancelOrder);
    document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', closeModals));
    
    document.getElementById('loginBtn')?.addEventListener('click', () => window.location.href = 'login.html');
    document.getElementById('registerBtn')?.addEventListener('click', () => window.location.href = 'register.html');
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'login.html';
    });
    
    const userBtn = document.getElementById('userBtn');
    const userDropdown = document.getElementById('userDropdown');
    if (userBtn && userDropdown) {
        userBtn.onclick = (e) => {
            e.stopPropagation();
            userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
        };
        document.onclick = () => userDropdown.style.display = 'none';
    }
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    cacheDom();
    setupEventListeners();
    updateCartCount();
    
    const token = getAuthToken();
    if (token) {
        try {
            const user = getCurrentUser();
            if (dom.userMenu) dom.userMenu.style.display = 'block';
            if (dom.authButtons) dom.authButtons.style.display = 'none';
            if (dom.userName) dom.userName.textContent = user?.fullname || user?.username || 'User';
            renderUserAvatar();
        } catch(e) {}
    }
    
    await loadOrders();
});