// ============================================
// ADMIN DASHBOARD - SPRFood (Complete Version)
// ============================================

const API_BASE_URL = "http://localhost:8080/api";
const IMAGE_BASE_URL = "http://localhost:8080/uploads/";

function getImageUrl(path) {
    if (!path) return '';

    // nếu đã là full url
    if (path.startsWith('http')) {
        return path;
    }

    // nếu backend trả /uploads/abc.jpg
    if (path.startsWith('/uploads/')) {
        return "http://localhost:8080" + path;
    }

    // nếu backend chỉ trả abc.jpg
    return IMAGE_BASE_URL + path;
}
// ========== STATE ==========
let currentTab = 'orders';
let currentOrderFilter = 'all';
let currentUserFilter = 'all';
let currentRestaurantFilter = 'all';
let restaurantSearchKeyword = '';
let allOrders = [];
let allUsers = [];
let allRestaurants = [];
let editingRestaurantId = null;
let editingMenuItemId = null;
let currentRestaurantIdForMenu = null;

// Biến lưu file ảnh
let selectedRestaurantImageFile = null;
let selectedMenuItemImageFile = null;

// WebSocket
let stompClient = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// ========== UTILITIES ==========
function showToast(message, type = 'success') {
    const oldToast = document.querySelector('.toast');
    if (oldToast) oldToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconHtml = '';
    if (type === 'success') iconHtml = '<i class="fas fa-check-circle"></i>';
    else if (type === 'error') iconHtml = '<i class="fas fa-exclamation-circle"></i>';
    else if (type === 'warning') iconHtml = '<i class="fas fa-exclamation-triangle"></i>';
    else iconHtml = '<i class="fas fa-info-circle"></i>';
    
    toast.innerHTML = `
        <div class="toast-content">
            ${iconHtml}
            <span class="toast-message">${message}</span>
        </div>
        <div class="toast-progress">
            <div class="toast-progress-bar"></div>
        </div>
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');
}

function getAuthToken() {
    return localStorage.getItem('sprfood_token') || sessionStorage.getItem('sprfood_token');
}

function getCurrentUser() {
    const userStr = localStorage.getItem('sprfood_user') || sessionStorage.getItem('sprfood_user');
    return userStr ? JSON.parse(userStr) : null;
}

function clearAuthData() {
    localStorage.removeItem('sprfood_token');
    localStorage.removeItem('sprfood_user');
    sessionStorage.removeItem('sprfood_token');
    sessionStorage.removeItem('sprfood_user');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function formatCurrency(amount) {
    return (amount || 0).toLocaleString('vi-VN') + '₫';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
}

// ========== UPLOAD IMAGE ==========
async function uploadImage(file, type = 'restaurant') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/admin/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.imageUrl;
        }
        return null;
    } catch (error) {
        console.error('Upload error:', error);
        return null;
    }
}

// ========== CHECK LOGIN ==========
function checkLoginAndRedirect() {
    const token = getAuthToken();
    const user = getCurrentUser();
    
    if (!token || !user) {
        showToast('Vui lòng đăng nhập!', 'error');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return false;
    }
    const roles = user.roles || [];
    const isAdmin = 
    // Trường hợp roles là mảng string: ["ROLE_ADMIN"]
    roles.includes('ROLE_ADMIN') ||
    roles.includes('ADMIN') ||
    // Trường hợp roles là mảng object: [{authority: "ROLE_ADMIN"}]
    roles.some(r => r?.authority === 'ROLE_ADMIN' || r?.authority === 'ADMIN') ||
    // Trường hợp role là string đơn
    user.role === 'ADMIN' ||
    user.role === 'ROLE_ADMIN';
    
    if (!isAdmin) {
        showToast('Bạn không có quyền truy cập trang này!', 'error');
        setTimeout(() => window.location.href = 'user.html', 1500);
        return false;
    }
    
    return true;
}

// ========== API CALLS ==========
async function apiCall(url, options = {}) {
    const token = getAuthToken();
    if (!token) throw new Error('No token');
    
    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    
    if (response.status === 401) {
        clearAuthData();
        showToast('Phiên đăng nhập hết hạn!', 'error');
        setTimeout(() => window.location.href = 'login.html', 1500);
        throw new Error('Unauthorized');
    }
    
    if (response.status === 403) {
        showToast('Không có quyền truy cập!', 'error');
        throw new Error('Forbidden');
    }
    
    if (response.status === 204) return null;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (e) {
        console.warn('apiCall: failed to parse JSON response', e);
        return null;
    }
}

// ========== WEBSOCKET ==========
function disconnectWebSocket() {
    if (stompClient && stompClient.connected) {
        stompClient.disconnect(() => console.log('WebSocket disconnected'));
        stompClient = null;
    }
}

function connectWebSocket() {
    if (stompClient && stompClient.connected) return;
    if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') {
        setTimeout(connectWebSocket, 2000);
        return;
    }
    
    try {
        const socket = new SockJS('http://localhost:8080/ws');
        stompClient = Stomp.over(socket);
        stompClient.debug = null;
        
        stompClient.connect({}, function(frame) {
            console.log('WebSocket connected');
            reconnectAttempts = 0;
            
            stompClient.subscribe('/topic/new-orders', function(message) {
                try {
                    const newOrder = JSON.parse(message.body);
                    showToast(`Đơn hàng mới #${newOrder.orderCode || newOrder.id}!`, 'success');
                    fetchAllOrders();
                } catch(e) {}
            });
            
            stompClient.subscribe('/topic/updated-orders', function(message) {
                try {
                    const updatedOrder = JSON.parse(message.body);
                    showToast(` Đơn hàng #${updatedOrder.orderCode || updatedOrder.id} đã được cập nhật`, 'info');
                    fetchAllOrders();
                } catch(e) {}
            });
            
        }, function(error) {
            console.error('WebSocket error:', error);
            reconnectAttempts++;
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                setTimeout(connectWebSocket, 5000);
            }
        });
    } catch(e) {
        console.error('WebSocket creation error:', e);
        setTimeout(connectWebSocket, 5000);
    }
}

// ========== ORDERS API ==========
async function fetchAllOrders() {
    try {
        const data = await apiCall('/admin/orders');
        allOrders = Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching orders:', error);
        allOrders = [];
    }
    renderOrders();
    updateStats();
    renderStatistics();
}

async function updateOrderStatus(orderId, status) {
    try {
        await apiCall(`/admin/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        showToast(`Đã cập nhật trạng thái đơn hàng`, 'success');
        await fetchAllOrders();
    } catch (error) {
        showToast('Cập nhật thất bại!', 'error');
    }
}

async function viewOrderDetail(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const modalBody = document.getElementById('orderDetailBody');
    if (!modalBody) return;
    
    const items = order.items || [];
    let itemsHtml = '';
    let totalAmount = 0;
    
        const customerName = order.customerName || order.account?.fullname || order.account?.username || order.recipientName || 'Khách hàng';
    const customerPhone = order.phone || 'Chưa cập nhật';
    const deliveryAddress = order.deliveryAddress || 'Chưa cập nhật';
    
    for (const item of items) {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        totalAmount += itemTotal;
        itemsHtml += `
            <div class="order-detail-item">
                <span><strong>${escapeHtml(item.name || 'Sản phẩm')}</strong> x${item.quantity || 1}</span>
                <span>${formatCurrency(itemTotal)}</span>
            </div>
        `;
    }
    
    modalBody.innerHTML = `
        <div class="delivery-info">
            <h4 style="margin-bottom: 12px; color: var(--primary);"><i class="fas fa-user"></i> Thông tin khách hàng</h4>
            <p><strong>Họ và tên:</strong> ${escapeHtml(customerName)}</p>
            <p><strong>Số điện thoại:</strong> ${escapeHtml(customerPhone)}</p>
            <p><strong>Địa chỉ giao hàng:</strong> ${escapeHtml(deliveryAddress)}</p>
            ${order.note ? `<p><strong>Ghi chú:</strong> ${escapeHtml(order.note)}</p>` : ''}
        </div>
        <div class="delivery-info">
            <h4 style="margin-bottom: 12px; color: var(--primary);"><i class="fas fa-store"></i> Thông tin đơn hàng</h4>
            <p><strong>Mã đơn:</strong> ${order.orderCode || order.id}</p>
            <p><strong>Nhà hàng:</strong> ${escapeHtml(order.restaurantName)}</p>
            <p><strong>Thời gian đặt:</strong> ${formatDate(order.createdAt)}</p>
            <p><strong>Trạng thái:</strong> <span class="status-badge ${getStatusClass(order.status)}">${getStatusText(order.status)}</span></p>
            ${order.cancelReason ? `<p><strong>Lý do hủy:</strong> ${escapeHtml(order.cancelReason)}</p>` : ''}
        </div>
        <h4 style="margin: 16px 0 12px 0;"><i class="fas fa-utensils"></i> Chi tiết món ăn</h4>
        <div class="detail-items">${itemsHtml || '<p>Không có món nào</p>'}</div>
        <div class="order-total-detail">
            <span>TỔNG CỘNG:</span>
            <span style="color: var(--primary); font-weight: 700;">${formatCurrency(order.totalAmount || totalAmount)}</span>
        </div>
    `;
    
    document.getElementById('orderDetailModal').classList.add('show');
}

// ========== USERS API ==========
async function fetchUsers() {
    try {
        const data = await apiCall('/admin/users');
        allUsers = Array.isArray(data) ? data : [];
        renderUsers();
        updateStats();
        renderStatistics();
    } catch (error) {
        console.error('Error fetching users:', error);
        allUsers = [];
        renderUsers();
    }
}

// ========== CUSTOM CONFIRM DIALOG ==========
function showConfirmDialog(title, message, type = 'info') {
    return new Promise((resolve) => {
        const oldDialog = document.querySelector('.custom-confirm-dialog');
        if (oldDialog) oldDialog.remove();
        
        const dialog = document.createElement('div');
        dialog.className = `custom-confirm-dialog ${type}`;
        
        let iconHtml = '';
        let iconClass = '';
        if (type === 'warning') {
            iconHtml = '<i class="fas fa-exclamation-triangle"></i>';
            iconClass = 'warning';
        } else if (type === 'danger') {
            iconHtml = '<i class="fas fa-trash-alt"></i>';
            iconClass = 'danger';
        } else {
            iconHtml = '<i class="fas fa-info-circle"></i>';
            iconClass = 'info';
        }
        
        dialog.innerHTML = `
            <div class="confirm-overlay"></div>
            <div class="confirm-container">
                <div class="confirm-icon ${iconClass}">
                    ${iconHtml}
                </div>
                <h3>${escapeHtml(title)}</h3>
                <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
                <div class="confirm-buttons">
                    <button class="confirm-btn cancel">Hủy bỏ</button>
                    <button class="confirm-btn confirm ${iconClass}">Xác nhận</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        setTimeout(() => dialog.classList.add('show'), 10);
        
        const cancelBtn = dialog.querySelector('.confirm-btn.cancel');
        const confirmBtn = dialog.querySelector('.confirm-btn.confirm');
        const overlay = dialog.querySelector('.confirm-overlay');
        
        const closeDialog = (result) => {
            dialog.classList.remove('show');
            setTimeout(() => dialog.remove(), 300);
            resolve(result);
        };
        
        cancelBtn.onclick = () => closeDialog(false);
        confirmBtn.onclick = () => closeDialog(true);
        overlay.onclick = () => closeDialog(false);
        
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeDialog(false);
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    });
}

async function toggleUserStatus(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    const isLocked = user.locked === true;
    const action = isLocked ? 'mở khóa' : 'khóa';
    const actionText = isLocked ? 'MỞ KHÓA' : 'KHÓA';
    
    const confirmed = await showConfirmDialog(
        `${actionText} TÀI KHOẢN`,
        `Bạn có chắc chắn muốn ${action} tài khoản "${escapeHtml(user.username || user.email || 'người dùng')}" không?`,
        action === 'khóa' ? 'warning' : 'info'
    );
    
    if (!confirmed) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/toggle-status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showToast(isLocked ? ' Đã mở khóa tài khoản!' : ' Đã khóa tài khoản!', 'success');
            await fetchUsers();
        } else {
            const error = await response.json().catch(() => ({}));
            showToast(error.message || 'Cập nhật thất bại!', 'error');
        }
    } catch (error) {
        console.error('Toggle user status error:', error);
        showToast('Lỗi kết nối!', 'error');
    }
}

async function deleteUserById(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const confirmed = await showConfirmDialog(
        'XÓA TÀI KHOẢN',
        `Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${escapeHtml(user.username || user.email || 'người dùng')}" không?\n\n Hành động này không thể hoàn tác!`,
        'danger'
    );
    
    if (!confirmed) return;
    
    try {
        await apiCall(`/admin/users/${userId}`, { method: 'DELETE' });
        showToast(' Đã xóa người dùng thành công!', 'success');
        await fetchUsers();
    } catch (error) {
        showToast('Xóa thất bại!', 'error');
    }
}

// ========== RESTAURANTS API (CÓ UPLOAD ẢNH) ==========
async function fetchRestaurants() {
    try {
        const data = await apiCall('/admin/restaurants');
        allRestaurants = Array.isArray(data) ? data : [];
        renderRestaurants();
        updateStats();
        renderStatistics();
    } catch (error) {
        console.error('Error fetching restaurants:', error);
        allRestaurants = [];
        renderRestaurants();
    }
}

async function saveRestaurant() {
    let imageUrl = document.getElementById('restaurantImageUrl')?.value || '';
    
    if (selectedRestaurantImageFile) {
        const uploadedUrl = await uploadImage(selectedRestaurantImageFile, 'restaurant');
        if (uploadedUrl) {
            imageUrl = uploadedUrl;
        }
    }
    
const restaurantData = {
    id: editingRestaurantId,
    name: document.getElementById('restaurantName').value,
    address: document.getElementById('restaurantAddress').value,
    rating: parseFloat(document.getElementById('restaurantRating').value) || 0,
    discount: parseInt(document.getElementById('restaurantDiscount').value) || 0,
    category: document.getElementById('restaurantCategory').value,
    deliveryTime: document.getElementById('restaurantDeliveryTime').value,

    status: editingRestaurantId
        ? allRestaurants.find(r => r.id === editingRestaurantId)?.status || 'ACTIVE'
        : 'ACTIVE',

    imageUrl: imageUrl
};
    try {
        if (editingRestaurantId) {
            await apiCall(`/admin/restaurants/${editingRestaurantId}`, {
                method: 'PUT',
                body: JSON.stringify(restaurantData)
            });
            showToast('Cập nhật nhà hàng thành công!', 'success');
        } else {
            await apiCall('/admin/restaurants', {
                method: 'POST',
                body: JSON.stringify(restaurantData)
            });
            showToast('Thêm nhà hàng thành công!', 'success');
        }
        selectedRestaurantImageFile = null;
        await fetchRestaurants();
        closeModal('restaurantModal');
    } catch (error) {
        showToast('Thao tác thất bại!', 'error');
    }
}

function openAddRestaurantModal() {
    editingRestaurantId = null;
    selectedRestaurantImageFile = null;
    document.getElementById('restaurantModalTitle').innerHTML = '<i class="fas fa-store"></i> Thêm nhà hàng';
    document.getElementById('restaurantName').value = '';
    document.getElementById('restaurantAddress').value = '';
    document.getElementById('restaurantRating').value = '';
    document.getElementById('restaurantDiscount').value = '';
    document.getElementById('restaurantDeliveryTime').value = '';
    document.getElementById('restaurantCategory').value = 'food';
    if (document.getElementById('restaurantImagePreview')) {
        document.getElementById('restaurantImagePreview').style.display = 'none';
        document.getElementById('restaurantImageUrl').value = '';
    }
    if (document.getElementById('restaurantImageInput')) {
        document.getElementById('restaurantImageInput').value = '';
    }
    document.getElementById('restaurantModal').classList.add('show');
}

function editRestaurant(id) {
    const restaurant = allRestaurants.find(r => r.id === id);
    if (!restaurant) return;
    
    editingRestaurantId = id;
    selectedRestaurantImageFile = null;
    document.getElementById('restaurantModalTitle').innerHTML = '<i class="fas fa-edit"></i> Sửa nhà hàng';
    document.getElementById('restaurantName').value = restaurant.name || '';
    document.getElementById('restaurantAddress').value = restaurant.address || '';
    document.getElementById('restaurantRating').value = restaurant.rating || '';
    document.getElementById('restaurantDiscount').value = restaurant.discount || '';
    document.getElementById('restaurantDeliveryTime').value = restaurant.deliveryTime || '';
    document.getElementById('restaurantCategory').value = restaurant.category || 'food';
    if (restaurant.imageUrl && document.getElementById('restaurantImagePreview')) {
        document.getElementById('restaurantPreviewImg').src =
    getImageUrl(restaurant.imageUrl);
        document.getElementById('restaurantImagePreview').style.display = 'block';
        document.getElementById('restaurantImageUrl').value = restaurant.imageUrl;
    }
    
    document.getElementById('restaurantModal').classList.add('show');
}

async function toggleRestaurantStatus(restaurantId, isActive) {
    // isActive = true -> đang ACTIVE -> muốn chuyển thành INACTIVE
    // isActive = false -> đang INACTIVE -> muốn chuyển thành ACTIVE
    const newStatus = isActive ? 'INACTIVE' : 'ACTIVE';
    const action = isActive ? 'DỪNG HOẠT ĐỘNG' : 'KÍCH HOẠT';
    
    const confirmed = await showConfirmDialog(
        `${action} NHÀ HÀNG`,
        `Bạn có chắc chắn muốn ${action.toLowerCase()} nhà hàng này không?`,
        isActive ? 'warning' : 'info'
    );
    
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/restaurants/${restaurantId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            showToast(isActive ? ' Đã dừng hoạt động nhà hàng!' : ' Đã kích hoạt lại nhà hàng!', 'success');
            await fetchRestaurants();
        } else {
            const error = await response.json().catch(() => ({}));
            showToast(error.message || 'Cập nhật thất bại!', 'error');
        }
    } catch (error) {
        console.error('Toggle restaurant status error:', error);
        showToast('Lỗi kết nối!', 'error');
    }
}

async function deleteRestaurant(id) {
    const confirmed = await showConfirmDialog(
        'XÓA NHÀ HÀNG',
        'Bạn có chắc chắn muốn xóa nhà hàng này?\n\n Hành động này không thể hoàn tác!',
        'danger'
    );
    
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/restaurants/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok || response.status === 204) {
            showToast(' Đã xóa nhà hàng thành công!', 'success');
            await fetchRestaurants();
        } else {
            const error = await response.json().catch(() => ({}));
            showToast(error.message || 'Xóa thất bại!', 'error');
            await fetchRestaurants();
        }
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Lỗi kết nối!', 'error');
        await fetchRestaurants();
    }
}

// ========== MENU API (CÓ UPLOAD ẢNH) ==========
async function fetchMenuItems(restaurantId) {
    try {
        return await apiCall(`/admin/restaurants/${restaurantId}/menu`);
    } catch (error) {
        console.error('Error fetching menu:', error);
        return [];
    }
}

async function addMenuItem(restaurantId, itemData) {
    try {
        await apiCall(`/admin/restaurants/${restaurantId}/menu`, {
            method: 'POST',
            body: JSON.stringify(itemData)
        });
        showToast('Thêm món ăn thành công!', 'success');
        return true;
    } catch (error) {
        showToast('Thêm thất bại!', 'error');
        return false;
    }
}

async function updateMenuItem(restaurantId, itemId, itemData) {
    try {
        await apiCall(`/admin/restaurants/${restaurantId}/menu/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify(itemData)
        });
        showToast('Cập nhật món ăn thành công!', 'success');
        return true;
    } catch (error) {
        showToast('Cập nhật thất bại!', 'error');
        return false;
    }
}

async function deleteMenuItem(restaurantId, itemId) {
    const confirmed = await showConfirmDialog(
        'XÓA MÓN ĂN',
        'Bạn có chắc chắn muốn xóa món ăn này không?',
        'warning'
    );
    
    if (!confirmed) return false;
    
    try {
        await apiCall(`/admin/restaurants/${restaurantId}/menu/${itemId}`, { method: 'DELETE' });
        showToast('Xóa món ăn thành công!', 'success');
        return true;
    } catch (error) {
        showToast('Xóa thất bại!', 'error');
        return false;
    }
}

async function saveMenuItem() {
    const restaurantId = document.getElementById('currentRestaurantId').value;
    
    let imageUrl = document.getElementById('menuItemImageUrl')?.value || '';
    
    if (selectedMenuItemImageFile) {
        const uploadedUrl = await uploadImage(selectedMenuItemImageFile, 'menu');
        if (uploadedUrl) {
            imageUrl = uploadedUrl;
        }
    }
    
    const itemData = {
        name: document.getElementById('menuItemName').value,
        description: document.getElementById('menuItemDesc').value,
        price: parseInt(document.getElementById('menuItemPrice').value) || 0,
        oldPrice: parseInt(document.getElementById('menuItemOldPrice').value) || 0,
        category: document.getElementById('menuItemCategory').value,
        popular: document.getElementById('menuItemPopular').checked,
        imageUrl: imageUrl,
        image: imageUrl || '🍽️'
    };
    
    let success;
    if (editingMenuItemId) {
        success = await updateMenuItem(restaurantId, editingMenuItemId, itemData);
    } else {
        success = await addMenuItem(restaurantId, itemData);
    }
    
    if (success) {
        selectedMenuItemImageFile = null;
        closeModal('menuItemModal');
        await loadMenuItemsForRestaurant(parseInt(restaurantId), '');
    }
}

// ========== ACCORDION TOGGLE & LOAD MENU ==========
async function toggleRestaurantDetail(restaurantId, restaurantName) {
    const menuRow = document.getElementById(`menu-row-${restaurantId}`);
    const expandIcon = document.getElementById(`expand-icon-${restaurantId}`);
    
    if (menuRow.style.display === 'table-row') {
        menuRow.style.display = 'none';
        if (expandIcon) expandIcon.innerHTML = '<i class="fas fa-chevron-down"></i>';
    } else {
        menuRow.style.display = 'table-row';
        if (expandIcon) expandIcon.innerHTML = '<i class="fas fa-chevron-up"></i>';
        await loadMenuItemsForRestaurant(restaurantId, restaurantName);
    }
}

async function loadMenuItemsForRestaurant(restaurantId, restaurantName) {
    const menuContainer = document.getElementById(`menu-list-${restaurantId}`);
    if (!menuContainer) return;
    
    menuContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Đang tải món ăn...</div>';
    
    const menuItems = await fetchMenuItems(restaurantId);
    
    if (!menuItems || menuItems.length === 0) {
        menuContainer.innerHTML = `
            <div class="empty-menu">
                <i class="fas fa-utensils"></i>
                <p>Chưa có món ăn nào</p>
                <button class="btn-add-menu" onclick="openAddMenuItemModal(${restaurantId}, '${escapeHtml(restaurantName)}')">
                    <i class="fas fa-plus"></i> Thêm món đầu tiên
                </button>
            </div>
        `;
        return;
    }
    
    // BẢNG KHÔNG CÓ CỘT ẢNH
    menuContainer.innerHTML = `
        <div class="menu-subtable-wrapper">
            <table class="menu-subtable">
                <thead>
                    <tr>
                        <th style="width: 28%;">Tên món</th>
                        <th style="width: 37%;">Mô tả</th>
                        <th style="width: 15%; text-align: right;">Giá</th>      
                        <th style="width: 20%; text-align: center;">Thao tác</th> 
                    </tr>
                </thead>
                <tbody>
                    ${menuItems.map(item => `
                        <tr>
                            <td>
                                <div class="menu-item-name">
                                    ${escapeHtml(item.name)}
                                    ${item.popular ? '<span class="popular-badge">🔥 Phổ biến</span>' : ''}
                                </div>
                            </td>
                            <td class="description">${escapeHtml(item.description || '')}</td>
                            <td class="price">${formatCurrency(item.price || 0)}</td>
                            <td>
                                <div class="action-group">
                                    <button class="menu-action-btn edit" onclick="editMenuItemInline(${restaurantId}, ${item.id})">
                                        <i class="fas fa-edit"></i> Sửa
                                    </button>
                                    <button class="menu-action-btn delete" onclick="deleteMenuItemInline(${restaurantId}, ${item.id})">
                                        <i class="fas fa-trash"></i> Xóa
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function getCategoryName(category) {
    const map = { main: 'Món chính', appetizer: 'Khai vị', dessert: 'Tráng miệng', drink: 'Đồ uống' };
    return map[category] || 'Món chính';
}

function openAddMenuItemModal(restaurantId, restaurantName) {
    currentRestaurantIdForMenu = restaurantId;
    editingMenuItemId = null;
    selectedMenuItemImageFile = null;
    document.getElementById('menuItemModalTitle').innerHTML = `<i class="fas fa-utensils"></i> Thêm món ăn - ${escapeHtml(restaurantName)}`;
    document.getElementById('menuItemName').value = '';
    document.getElementById('menuItemDesc').value = '';
    document.getElementById('menuItemPrice').value = '';
    document.getElementById('menuItemOldPrice').value = '';
    document.getElementById('menuItemCategory').value = 'main';
    document.getElementById('menuItemPopular').checked = false;
    document.getElementById('currentRestaurantId').value = restaurantId;
    
    if (document.getElementById('menuItemImagePreview')) {
        document.getElementById('menuItemImagePreview').style.display = 'none';
        document.getElementById('menuItemImageUrl').value = '';
    }
    if (document.getElementById('menuItemImageInput')) {
        document.getElementById('menuItemImageInput').value = '';
    }
    
    document.getElementById('menuItemModal').classList.add('show');
}

function editMenuItemInline(restaurantId, itemId) {
    loadMenuItemsForRestaurant(restaurantId, '').then(async () => {
        const menuItems = await fetchMenuItems(restaurantId);
        const item = menuItems.find(i => i.id === itemId);
        if (!item) return;
        
        editingMenuItemId = itemId;
        currentRestaurantIdForMenu = restaurantId;
        selectedMenuItemImageFile = null;
        
        document.getElementById('menuItemModalTitle').innerHTML = `<i class="fas fa-edit"></i> Sửa món ăn`;
        document.getElementById('menuItemName').value = item.name || '';
        document.getElementById('menuItemDesc').value = item.description || '';
        document.getElementById('menuItemPrice').value = item.price || 0;
        document.getElementById('menuItemOldPrice').value = item.oldPrice || 0;
        document.getElementById('menuItemCategory').value = item.category || 'main';
        document.getElementById('menuItemPopular').checked = item.popular || false;
        document.getElementById('currentRestaurantId').value = restaurantId;
        
        if (item.imageUrl && document.getElementById('menuItemImagePreview')) {
           document.getElementById('menuItemPreviewImg').src =
    getImageUrl(item.imageUrl);
            document.getElementById('menuItemImagePreview').style.display = 'block';
            document.getElementById('menuItemImageUrl').value = item.imageUrl;
        }
        
        document.getElementById('menuItemModal').classList.add('show');
    });
}

async function deleteMenuItemInline(restaurantId, itemId) {
    const success = await deleteMenuItem(restaurantId, itemId);
    if (success) {
        await loadMenuItemsForRestaurant(restaurantId, '');
    }
}

// ========== RENDER FUNCTIONS ==========
function getStatusText(status) {
    const map = {
        pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận',
        delivering: 'Đang giao', completed: 'Hoàn thành', cancelled: 'Đã hủy'
    };
    return map[status?.toLowerCase()] || status;
}

function getStatusClass(status) {
    const map = {
        pending: 'status-pending', confirmed: 'status-confirmed',
        delivering: 'status-delivering', completed: 'status-completed', cancelled: 'status-cancelled'
    };
    return map[status?.toLowerCase()] || '';
}

function isAdminUser(user) {
    if (!user) return false;
    if (user.role) {
        const role = String(user.role).toUpperCase();
        if (role === 'ADMIN' || role === 'ROLE_ADMIN') return true;
    }
    if (Array.isArray(user.roles)) {
        return user.roles.some(r => {
            const role = String(r).toUpperCase();
            return role === 'ADMIN' || role === 'ROLE_ADMIN';
        });
    }
    return false;
}

function renderOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    let filtered = currentOrderFilter === 'all' ? allOrders : allOrders.filter(o => o.status?.toLowerCase() === currentOrderFilter);
    
    if (!filtered.length) {
        tbody.innerHTML = '<td><td colspan="8" class="empty-state"><i class="fas fa-inbox"></i> Không có đơn hàng nào</td>' + '</tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(order => {
        const customerName = order.customerUsername || order.customerName || order.account?.username || 'Khách hàng';
        const customerPhone = order.phone || 'N/A';
        
        return `
        <tr>
            <td>#${order.orderCode || order.id}</td>
            <td><strong>${escapeHtml(customerName)}</strong><br><small style="color:#6c757d"> </small></td>
            <td>${escapeHtml(order.restaurantName || 'N/A')}</td>
            <td>${formatCurrency(order.totalAmount || 0)}</td>
            <td>${formatDate(order.createdAt)}</td>
            <td><span class="status-badge ${getStatusClass(order.status)}">${getStatusText(order.status)}</span></td>
            <td>${renderOrderActions(order)}</td>
        </tr>
    `;
    }).join('');
}

function renderOrderActions(order) {
    const status = order.status?.toLowerCase();
    let buttons = `<button class="action-btn btn-view" onclick="viewOrderDetail(${order.id})"><i class="fas fa-eye"></i> Xem</button>`;
    
    if (status === 'pending') {
        buttons += `<button class="action-btn btn-confirm" onclick="updateOrderStatus(${order.id}, 'CONFIRMED')"><i class="fas fa-check"></i> Xác nhận</button>`;
    }
    if (status === 'confirmed') {
        buttons += `<button class="action-btn btn-delivering" onclick="updateOrderStatus(${order.id}, 'DELIVERING')"><i class="fas fa-truck"></i> Đang giao</button>`;
    }
    if (status === 'delivering') {
        buttons += `<button class="action-btn btn-complete" onclick="updateOrderStatus(${order.id}, 'COMPLETED')"><i class="fas fa-check-double"></i> Hoàn thành</button>`;
    }
    if (status === 'pending' || status === 'confirmed') {
        buttons += `<button class="action-btn btn-cancel" onclick="updateOrderStatus(${order.id}, 'CANCELLED')"><i class="fas fa-times"></i> Hủy</button>`;
    }
    
    return buttons;
}

function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    let filteredUsers = [...allUsers];
    if (currentUserFilter === 'active') {
        filteredUsers = filteredUsers.filter(user => user.locked === false);
    } else if (currentUserFilter === 'locked') {
        filteredUsers = filteredUsers.filter(user => user.locked === true);
    }
    
    if (!filteredUsers.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><i class="fas fa-users"></i> Không có người dùng nào';
        return;
    }
    
    tbody.innerHTML = filteredUsers.map(user => {
        const isLocked = user.locked === true;
        const isAdmin = isAdminUser(user);
        const roleLabel = user.roles?.[0] ? String(user.roles[0]).replace('ROLE_', '') : (user.role ? String(user.role).replace('ROLE_', '') : 'USER');

        return `
        <tr>
            <td>${user.id}</td>
            <td>${escapeHtml(user.username || 'N/A')}</td>
            <td>${escapeHtml(user.fullname || user.firstName + ' ' + user.lastName || 'N/A')}</td>
            <td>${escapeHtml(user.email || 'N/A')}</td>
            <td>${user.phoneNumber || user.phone || 'N/A'}</td>
            <td>${escapeHtml(user.address || 'N/A')}</td>
            <td><span class="status-badge ${isLocked ? 'user-locked' : 'user-active'}">${isLocked ? ' Bị khóa' : ' Hoạt động'}</span></td>
            <td><span class="status-badge">${escapeHtml(roleLabel)}</span></td>
            <td>
                ${!isAdmin ? `
                    <button class="action-btn ${isLocked ? 'btn-unlock' : 'btn-delete'}" onclick="toggleUserStatus(${user.id})">
                        <i class="fas ${isLocked ? 'fa-unlock-alt' : 'fa-lock'}"></i> 
                        ${isLocked ? 'Mở khóa' : 'Khóa'}
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteUserById(${user.id})">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                ` : '<span class="admin-badge">Admin</span>'}
            </td>
        </tr>
    `;
    }).join('');
}

function renderRestaurants() {
    const tbody = document.getElementById('restaurantsTableBody');
    if (!tbody) return;
    
    let filtered = [...allRestaurants];
    
    // Lọc theo status - đồng bộ với BE (ACTIVE / INACTIVE)
    if (currentRestaurantFilter !== 'all') {
        if (currentRestaurantFilter === 'active') {
            filtered = filtered.filter(r => r.status === 'ACTIVE');
        } else if (currentRestaurantFilter === 'inactive') {
            filtered = filtered.filter(r => r.status === 'INACTIVE');
        }
    }
    
    if (restaurantSearchKeyword) {
        const keyword = restaurantSearchKeyword.toLowerCase();
        filtered = filtered.filter(r => 
            r.name?.toLowerCase().includes(keyword) || 
            r.address?.toLowerCase().includes(keyword)
        );
    }
    
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-store"></i> Không tìm thấy nhà hàng nào</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(rest => {
        const isActive = rest.status === 'ACTIVE';
        
        return `
        <tr class="restaurant-row" data-id="${rest.id}">
            <td>${rest.id}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    ${rest.imageUrl ? 
                        `<img src="${getImageUrl(rest.imageUrl)}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">` : 
                        `<div style="width: 40px; height: 40px; background: #f0f2f5; border-radius: 8px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-store"></i></div>`
                    }
                    <strong>${escapeHtml(rest.name)}</strong>
                </div>
            </td>
            <td><i class="fas fa-map-marker-alt"></i> ${escapeHtml(rest.address || 'Chưa cập nhật')}</td>
            <td> ${rest.rating || 'N/A'}</td>
            <td><span class="status-badge ${isActive ? 'user-active' : 'user-locked'}">${isActive ? ' Hoạt động' : ' Tạm dừng'}</span></td>
            <td>
                <div class="action-group">
                    <button class="action-btn btn-detail" onclick="toggleRestaurantDetail(${rest.id}, '${escapeHtml(rest.name)}')">
                        <i class="fas fa-utensils"></i> Món ăn
                    </button>
                    <button class="action-btn btn-edit" onclick="editRestaurant(${rest.id})">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                    <button class="action-btn ${isActive ? 'btn-warning' : 'btn-success'}" onclick="toggleRestaurantStatus(${rest.id}, ${isActive})">
                        <i class="fas ${isActive ? 'fa-pause-circle' : 'fa-play-circle'}"></i> 
                        ${isActive ? 'Dừng hoạt động' : 'Kích hoạt'}
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteRestaurant(${rest.id})">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </div>
            </td>
        </tr>
        <tr class="menu-detail-row" id="menu-row-${rest.id}" style="display: none;">
            <td colspan="7" style="padding: 0 !important;">
                <div class="menu-detail-container">
                    <div class="menu-detail-header">
                        <h4><i class="fas fa-utensils"></i> Danh sách món ăn - ${escapeHtml(rest.name)}</h4>
                        <button class="btn-add-menu" onclick="openAddMenuItemModal(${rest.id}, '${escapeHtml(rest.name)}')">
                            <i class="fas fa-plus"></i> Thêm món ăn
                        </button>
                    </div>
                    <div id="menu-list-${rest.id}" class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

function searchRestaurants() {
    const input = document.getElementById('searchRestaurantInput');
    restaurantSearchKeyword = input ? input.value : '';
    renderRestaurants();
}

function renderStatistics() {
    const totalRevenue = allOrders
        .filter(o => o.status === 'COMPLETED')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    document.getElementById('statTotalOrders').textContent = allOrders.length;
    document.getElementById('statTotalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('statTotalUsers').textContent = allUsers.length;
    document.getElementById('statTotalRestaurants').textContent = allRestaurants.length;
    
    const statusCounts = {
        pending: allOrders.filter(o => o.status === 'PENDING').length,
        confirmed: allOrders.filter(o => o.status === 'CONFIRMED').length,
        delivering: allOrders.filter(o => o.status === 'DELIVERING').length,
        completed: allOrders.filter(o => o.status === 'COMPLETED').length,
        cancelled: allOrders.filter(o => o.status === 'CANCELLED').length
    };
    
    const statusNames = {
        pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận',
        delivering: 'Đang giao', completed: 'Hoàn thành', cancelled: 'Đã hủy'
    };
    
    const statusColors = {
        pending: '#ffc107', confirmed: '#17a2b8',
        delivering: '#17a2b8', completed: '#28a745', cancelled: '#dc3545'
    };
    
    const statusStatsDiv = document.getElementById('statusStats');
    if (statusStatsDiv) {
        statusStatsDiv.innerHTML = Object.entries(statusCounts).map(([key, count]) => `
            <div class="status-stat-item" style="border-left: 3px solid ${statusColors[key]}">
                <div class="stat-number" style="color: ${statusColors[key]}">${count}</div>
                <div class="stat-label">${statusNames[key]}</div>
            </div>
        `).join('');
    }
}

function updateStats() {
    const totalOrders = allOrders.length;
    const pendingOrders = allOrders.filter(o => o.status === 'PENDING').length;
    const totalRevenue = allOrders
        .filter(o => o.status === 'COMPLETED')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    const totalOrdersEl = document.getElementById('totalOrders');
    if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
    
    const pendingCountEl = document.getElementById('pendingCount');
    if (pendingCountEl) pendingCountEl.textContent = pendingOrders;
    
    const totalRevenueEl = document.getElementById('totalRevenue');
    if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(totalRevenue);
    
    const userCountEl = document.getElementById('userCount');
    if (userCountEl) userCountEl.textContent = allUsers.length;
}

function switchTab(tabId) {
    currentTab = tabId;
    
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.tab === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const activeTab = document.getElementById(`${tabId}Tab`);
    if (activeTab) activeTab.classList.add('active');
    
    const titles = {
        orders: 'Quản lý đơn hàng',
        users: 'Quản lý người dùng',
        restaurants: 'Quản lý nhà hàng',
        statistics: 'Thống kê'
    };
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = titles[tabId] || 'Dashboard';
}

function logout() {
    disconnectWebSocket();
    clearAuthData();
    showToast('Đã đăng xuất!', 'success');
    setTimeout(() => window.location.href = 'login.html', 1000);
}

// ========== INIT IMAGE UPLOAD ==========
function initImageUpload() {
    // Restaurant image upload
    const restaurantImageInput = document.getElementById('restaurantImageInput');
    if (restaurantImageInput) {
        restaurantImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
                selectedRestaurantImageFile = file;
                const reader = new FileReader();
                reader.onload = (event) => {
                    const preview = document.getElementById('restaurantPreviewImg');
                    const previewDiv = document.getElementById('restaurantImagePreview');
                    if (preview) preview.src = event.target.result;
                    if (previewDiv) previewDiv.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Menu item image upload
    const menuImageInput = document.getElementById('menuItemImageInput');
    if (menuImageInput) {
        menuImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
                selectedMenuItemImageFile = file;
                const reader = new FileReader();
                reader.onload = (event) => {
                    const preview = document.getElementById('menuItemPreviewImg');
                    const previewDiv = document.getElementById('menuItemImagePreview');
                    if (preview) preview.src = event.target.result;
                    if (previewDiv) previewDiv.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

function clearRestaurantImage() {
    selectedRestaurantImageFile = null;
    document.getElementById('restaurantImagePreview').style.display = 'none';
    document.getElementById('restaurantPreviewImg').src = '';
    document.getElementById('restaurantImageUrl').value = '';
    document.getElementById('restaurantImageInput').value = '';
}

function clearMenuItemImage() {
    selectedMenuItemImageFile = null;
    document.getElementById('menuItemImagePreview').style.display = 'none';
    document.getElementById('menuItemPreviewImg').src = '';
    document.getElementById('menuItemImageUrl').value = '';
    document.getElementById('menuItemImageInput').value = '';
}

function initEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.dataset.tab;
            if (tab) switchTab(tab);
        });
    });
    
    document.querySelectorAll('#ordersTab .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#ordersTab .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentOrderFilter = btn.dataset.status;
            renderOrders();
        });
    });
    
    document.querySelectorAll('#usersTab .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#usersTab .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentUserFilter = btn.dataset.userStatus;
            renderUsers();
        });
    });
    
    document.querySelectorAll('#restaurantsTab .filter-btn[data-restaurant-status]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#restaurantsTab .filter-btn[data-restaurant-status]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentRestaurantFilter = btn.dataset.restaurantStatus;
            renderRestaurants();
        });
    });
    
    const searchBtn = document.getElementById('searchRestaurantBtn');
    const searchInput = document.getElementById('searchRestaurantInput');
    if (searchBtn) searchBtn.addEventListener('click', searchRestaurants);
    if (searchInput) searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchRestaurants();
    });
    
    const addRestaurantBtn = document.getElementById('addRestaurantBtn');
    if (addRestaurantBtn) addRestaurantBtn.addEventListener('click', openAddRestaurantModal);
    
    const saveRestaurantBtn = document.getElementById('saveRestaurantBtn');
    if (saveRestaurantBtn) saveRestaurantBtn.addEventListener('click', saveRestaurant);
    
    const saveMenuItemBtn = document.getElementById('saveMenuItemBtn');
    if (saveMenuItemBtn) saveMenuItemBtn.addEventListener('click', saveMenuItem);
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    document.querySelectorAll('.modal-close, .modal-cancel, .modal-overlay').forEach(el => {
        el.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('show');
            });
        });
    });
    
    const clearRestaurantImgBtn = document.getElementById('clearRestaurantImage');
    if (clearRestaurantImgBtn) clearRestaurantImgBtn.addEventListener('click', clearRestaurantImage);
    
    const clearMenuItemImgBtn = document.getElementById('clearMenuItemImage');
    if (clearMenuItemImgBtn) clearMenuItemImgBtn.addEventListener('click', clearMenuItemImage);
}

async function init() {
    console.log("Admin page initializing...");
    
    if (!checkLoginAndRedirect()) return;
    
    const user = getCurrentUser();
    const adminNameEl = document.getElementById('adminName');
    if (adminNameEl && user) {
        adminNameEl.textContent = user?.fullname || user?.username || user?.firstName || 'Admin';
    }
    
    await Promise.all([
        fetchAllOrders(),
        fetchUsers(),
        fetchRestaurants()
    ]);
    
    initEventListeners();
    initImageUpload();
    connectWebSocket();
    
    console.log("Admin page initialized");
}

// Start
init();
