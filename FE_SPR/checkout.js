// ============================================
// CHECKOUT PAGE - SPRFood
// ============================================

const API_BASE_URL = "http://localhost:8080/api";

// DOM Elements
let cartItems = [];
let currentRestaurant = null;

function getAuthToken() {
    return localStorage.getItem('sprfood_token') || sessionStorage.getItem('sprfood_token');
}

function getCurrentUser() {
    const userStr = localStorage.getItem('sprfood_user') || sessionStorage.getItem('sprfood_user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch (e) {
        return null;
    }
}

function formatCurrency(amount) {
    return (amount || 0).toLocaleString('vi-VN') + '₫';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.className = `toast ${type} show`;
        toast.querySelector('.toast-message').textContent = message;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

// Lấy giỏ hàng từ localStorage
function getCart() {
    const cart = localStorage.getItem('sprfood_cart');
    return cart ? JSON.parse(cart) : [];
}

// Hiển thị sản phẩm trong giỏ
function renderCartItems() {
    const cart = getCart();
    const container = document.getElementById('cartItems');
    let subtotal = 0;
    
    if (!cart.length) {
        container.innerHTML = '<div style="text-align:center;padding:40px">Giỏ hàng trống</div>';
        document.getElementById('subtotal').textContent = '0₫';
        document.getElementById('grandTotal').textContent = '0₫';
        return;
    }
    
    // Lấy thông tin nhà hàng (giả sử tất cả item cùng 1 nhà hàng)
    if (cart.length > 0) {
        currentRestaurant = {
            id: cart[0].restaurantId,
            name: cart[0].restaurantName
        };
    }
    
    container.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${escapeHtml(item.name)}</div>
                    <div class="cart-item-quantity">Số lượng: ${item.quantity}</div>
                </div>
                <div class="cart-item-price">${formatCurrency(itemTotal)}</div>
            </div>
        `;
    }).join('');
    
    const deliveryFee = subtotal > 200000 ? 0 : 25000;
    const grandTotal = subtotal + deliveryFee;
    
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('shippingFee').textContent = deliveryFee === 0 ? 'Miễn phí' : formatCurrency(deliveryFee);
    document.getElementById('grandTotal').textContent = formatCurrency(grandTotal);
    
    return { subtotal, deliveryFee, grandTotal };
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

// Lấy thông tin user hiện tại
function loadUserInfo() {
    const user = getCurrentUser();
    if (user) {
        // Ưu tiên firstName + lastName, nếu không có thì dùng fullName hoặc name
        let fullName = '';
        if (user.firstName && user.lastName) {
            fullName = `${user.firstName} ${user.lastName}`.trim();
        } else {
            fullName = user.fullName || user.name || '';
        }
        document.getElementById('fullName').value = fullName;
        document.getElementById('username').value = user.username || '';
        document.getElementById('phone').value = user.phoneNumber || user.phone || '';
        document.getElementById('address').value = user.address || user.deliveryAddress || '';
    }
}

// ========== MODAL XÁC NHẬN ĐỊA CHỈ ==========
function showAddressConfirmModal() {
    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    
    // Validate
    if (!fullName) {
        showToast('Vui lòng nhập họ tên!', 'error');
        document.getElementById('fullName').focus();
        return false;
    }
    
    if (!phone) {
        showToast('Vui lòng nhập số điện thoại!', 'error');
        document.getElementById('phone').focus();
        return false;
    }
    
    if (!address) {
        showToast('Vui lòng nhập địa chỉ giao hàng!', 'error');
        document.getElementById('address').focus();
        return false;
    }
    
    // Hiển thị thông tin xác nhận
    document.getElementById('confirmName').textContent = fullName;
    document.getElementById('confirmPhone').textContent = phone;
    document.getElementById('confirmAddress').textContent = address;
    
    // Mở modal
    const modal = document.getElementById('addressConfirmModal');
    if (modal) modal.classList.add('show');
    
    return true;
}

function closeAddressModal() {
    const modal = document.getElementById('addressConfirmModal');
    if (modal) modal.classList.remove('show');
}

// ========== TẠO ĐƠN HÀNG ==========
async function createOrder() {
    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    const note = document.getElementById('note').value.trim();
    const cart = getCart();
    
    if (!cart.length) {
        showToast('Giỏ hàng trống!', 'error');
        return false;
    }
    
    // Tính tổng tiền
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = subtotal > 200000 ? 0 : 25000;
    const totalAmount = subtotal + deliveryFee;
    
    const orderData = {
        restaurantId: currentRestaurant?.id || cart[0]?.restaurantId,
        restaurantName: currentRestaurant?.name || cart[0]?.restaurantName,
        items: cart.map(item => ({
            menuItemId: item.itemId,
            name: item.name,
            quantity: item.quantity,
            price: item.price
        })),
        totalAmount: totalAmount,
        deliveryAddress: address,
        phone: phone,
        recipientName: fullName,
        note: note,
        paymentMethod: "COD"
    };
    
    try {
        const token = getAuthToken();
        if (!token) throw new Error('No token');
        
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });
        
        if (response.status === 401) {
            showToast('Phiên đăng nhập hết hạn!', 'error');
            setTimeout(() => window.location.href = 'login.html', 1500);
            return false;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        // Xóa giỏ hàng sau khi đặt thành công
        localStorage.removeItem('sprfood_cart');
        
        showToast('Đặt hàng thành công!');
        setTimeout(() => {
            window.location.href = 'order-history.html';
        }, 1500);
        
        return true;
    } catch (error) {
        console.error('Order error:', error);
        showToast('Đặt hàng thất bại! Vui lòng thử lại.', 'error');
        return false;
    }
}

// ========== KHỞI TẠO ==========
function init() {
    renderCartItems();
    loadUserInfo();
    
    // Nút xác nhận đơn hàng - hiển thị modal xác nhận địa chỉ
    const confirmBtn = document.getElementById('confirmOrderBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', showAddressConfirmModal);
    }
    
    // Nút xác nhận cuối cùng trong modal
    const finalConfirmBtn = document.getElementById('finalConfirmBtn');
    if (finalConfirmBtn) {
        finalConfirmBtn.addEventListener('click', () => {
            closeAddressModal();
            createOrder();
        });
    }
    
    // Nút chỉnh sửa - đóng modal
    const editBtn = document.getElementById('editAddressBtn');
    if (editBtn) {
        editBtn.addEventListener('click', closeAddressModal);
    }
    
    // Nút đóng modal
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeAddressModal);
    }
    
    // Đóng modal khi click overlay
    const overlay = document.querySelector('#addressConfirmModal .modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', closeAddressModal);
    }
    
    // ESC key đóng modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAddressModal();
        }
    });
}

// Khởi tạo khi DOM ready
document.addEventListener('DOMContentLoaded', init);