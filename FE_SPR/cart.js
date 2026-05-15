// ============================================
// GIỎ HÀNG - SPRFood
// ============================================

const API_BASE_URL = "http://localhost:8080/api";

function getAuthToken() {
    return localStorage.getItem('sprfood_token') || sessionStorage.getItem('sprfood_token');
}

function getCurrentUser() {
    const userStr = localStorage.getItem('sprfood_user') || sessionStorage.getItem('sprfood_user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch(e) {
        return null;
    }
}

let cartCache = null;

function getCart() {
    if (cartCache !== null) return cartCache;
    const cart = localStorage.getItem("sprfood_cart");
    cartCache = cart ? JSON.parse(cart) : [];
    return cartCache;
}

function saveCart(cart) {
    cartCache = cart;
    localStorage.setItem("sprfood_cart", JSON.stringify(cart));
}

function calculateTotal(cart) {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function calculateTotalItems(cart) {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}

let toastTimeout = null;
function showToast(message, type = 'info') {
    const oldToast = document.querySelector(".cart-toast");
    if (oldToast) oldToast.remove();
    if (toastTimeout) clearTimeout(toastTimeout);
    
    const toast = document.createElement("div");
    toast.className = `cart-toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add("show"), 10);
    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== MODAL XÓA GIỎ HÀNG ==========
let modalState = {
    pendingId: null,
    isClearAll: false,
    isOpen: false
};

function showDeleteItemModal(itemId, itemName) {
    const modal = document.getElementById('deleteConfirmModal');
    const modalBody = modal?.querySelector('.modal-delete-body p');
    
    if (modal && modalBody && !modalState.isOpen) {
        modalBody.innerHTML = `Bạn có đồng ý xóa <strong>"${itemName}"</strong> khỏi giỏ hàng không?`;
        modalState.pendingId = itemId;
        modalState.isClearAll = false;
        modalState.isOpen = true;
        modal.classList.add('show');
    }
}

function showDeleteAllModal() {
    const modal = document.getElementById('deleteConfirmModal');
    const modalBody = modal?.querySelector('.modal-delete-body p');
    
    if (modal && modalBody && !modalState.isOpen) {
        modalBody.innerHTML = `Bạn có đồng ý xóa <strong>toàn bộ sản phẩm</strong> trong giỏ hàng không?`;
        modalState.pendingId = null;
        modalState.isClearAll = true;
        modalState.isOpen = true;
        modal.classList.add('show');
    }
}

function hideDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.classList.remove('show');
        modalState = { pendingId: null, isClearAll: false, isOpen: false };
    }
}

function confirmDelete() {
    if (modalState.isClearAll) {
        saveCart([]);
        renderCart();
        showToast(" Đã xóa toàn bộ giỏ hàng!", "success");
    } else if (modalState.pendingId !== null) {
        let cart = getCart();
        const item = cart.find(i => i.id === modalState.pendingId);
        const itemName = item?.name || "sản phẩm";
        cart = cart.filter(i => i.id !== modalState.pendingId);
        saveCart(cart);
        renderCart();
        showToast(` Đã xóa "${itemName}" khỏi giỏ hàng!`, "success");
    }
    hideDeleteModal();
}

// ========== MODAL XÁC NHẬN ĐỊA CHỈ TRƯỚC KHI ĐẶT HÀNG ==========
let addressModalOpen = false;
let successModalTimeout = null;

function showAddressConfirmModal() {
    const cart = getCart();
    const user = getCurrentUser();
    
    if (cart.length === 0) {
        showToast("🛒 Giỏ hàng trống!", "error");
        return;
    }
    
    const token = getAuthToken();
    if (!token) {
        showToast(" Vui lòng đăng nhập để đặt hàng!", "error");
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }
    
    const subtotal = calculateTotal(cart);
    const shipping = subtotal > 200000 ? 0 : 25000;
    const total = subtotal + shipping;
    
    // Điền thông tin user hiện tại
    let fullName = '';
    if (user?.firstName && user?.lastName) {
        fullName = `${user.firstName} ${user.lastName}`.trim();
    } else {
        fullName = user?.fullname || user?.name || '';
    }
    document.getElementById('confirmFullName').value = fullName;
    document.getElementById('confirmUsername').value = user?.username || '';
    document.getElementById('confirmPhone').value = user?.phoneNumber || user?.phone || '';
    document.getElementById('confirmAddress').value = user?.address || user?.deliveryAddress || '';
    document.getElementById('confirmNote').value = '';
    document.getElementById('confirmTotalAmount').innerHTML = total.toLocaleString() + '₫';
    
    const modal = document.getElementById('addressConfirmModal');
    if (modal && !addressModalOpen) {
        addressModalOpen = true;
        modal.classList.add('show');
    }
}

function hideAddressConfirmModal() {
    const modal = document.getElementById('addressConfirmModal');
    if (modal) {
        modal.classList.remove('show');
        addressModalOpen = false;
    }
}

// ========== ĐẶT HÀNG ==========
async function confirmOrder() {
    const fullName = document.getElementById('confirmFullName').value.trim();
    const phone = document.getElementById('confirmPhone').value.trim();
    const address = document.getElementById('confirmAddress').value.trim();
    const note = document.getElementById('confirmNote').value.trim();
    
    if (!fullName) {
        showToast("Vui lòng nhập họ tên!", "error");
        return;
    }
    if (!phone) {
        showToast("Vui lòng nhập số điện thoại!", "error");
        return;
    }
    if (!address) {
        showToast("Vui lòng nhập địa chỉ giao hàng!", "error");
        return;
    }
    
    const cart = getCart();
    if (cart.length === 0) {
        showToast("Giỏ hàng trống!", "error");
        hideAddressConfirmModal();
        return;
    }
    
    const firstItem = cart[0];
    const sameRestaurant = cart.every(item => item.restaurantId === firstItem.restaurantId);
    if (!sameRestaurant) {
        showToast("Vui lòng chỉ đặt hàng từ cùng một nhà hàng!", "error");
        return;
    }
    
    const token = getAuthToken();
    if (!token) {
        showToast(" Vui lòng đăng nhập lại!", "error");
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }
    
    const orderData = {
        restaurantId: firstItem.restaurantId,
        recipientName: fullName,
        phone: phone,
        deliveryAddress: address,
        note: note,
        items: cart.map(item => ({
            menuItemId: item.itemId,
            quantity: item.quantity,
            price: item.price,
            name: item.name
        }))
    };
    
    console.log(" Dữ liệu gửi lên:", orderData);
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        if (response.status === 401) {
            showToast("Phiên đăng nhập hết hạn!", "error");
            setTimeout(() => window.location.href = 'login.html', 1500);
            return;
        }
        
        if (response.ok) {
            const result = await response.json();
            console.log(" Đặt hàng thành công:", result);
            showToast(" Đặt hàng thành công!", "success");
            
            // Xóa giỏ hàng
            saveCart([]);
            renderCart();
            hideAddressConfirmModal();
            showSuccessOrderModal();
            
            setTimeout(() => {
                window.location.href = 'order-history.html';
            }, 2500);
        } else {
            const error = await response.json();
            console.error(" Lỗi:", error);
            showToast(error.message || "Đặt hàng thất bại!", "error");
        }
    } catch (error) {
        console.error(" Lỗi kết nối:", error);
        showToast("Lỗi kết nối đến máy chủ!", "error");
    }
}

function showSuccessOrderModal() {
    const modal = document.getElementById('orderSuccessModal');
    if (modal) {
        if (successModalTimeout) clearTimeout(successModalTimeout);
        modal.classList.add('show');
        successModalTimeout = setTimeout(() => hideSuccessOrderModal(), 2000);
    }
}

function hideSuccessOrderModal() {
    const modal = document.getElementById('orderSuccessModal');
    if (modal) {
        modal.classList.remove('show');
        if (successModalTimeout) clearTimeout(successModalTimeout);
    }
}

// ========== CẬP NHẬT SỐ LƯỢNG ==========
function updateQuantity(itemId, delta) {
    let cart = getCart();
    const index = cart.findIndex(i => i.id === itemId);
    if (index === -1) return;
    
    const newQuantity = cart[index].quantity + delta;
    
    if (newQuantity < 1) {
        showDeleteItemModal(itemId, cart[index].name);
        return;
    }
    
    cart[index].quantity = newQuantity;
    saveCart(cart);
    
    const cartItem = document.querySelector(`.cart-item[data-id='${itemId}']`);
    if (cartItem) {
        const quantitySpan = cartItem.querySelector('.qty-value');
        const totalSpan = cartItem.querySelector('.cart-item-total');
        if (quantitySpan) quantitySpan.textContent = newQuantity;
        if (totalSpan) totalSpan.textContent = (cart[index].price * newQuantity).toLocaleString() + '₫';
        updateSummary();
    } else {
        renderCart();
    }
}

function updateSummary() {
    const cart = getCart();
    const summaryContainer = document.getElementById("cartSummary");
    if (!summaryContainer || cart.length === 0) {
        if (cart.length === 0) summaryContainer.innerHTML = "";
        return;
    }
    
    const subtotal = calculateTotal(cart);
    const totalItems = calculateTotalItems(cart);
    const shipping = subtotal > 200000 ? 0 : 25000;
    const total = subtotal + shipping;
    
    summaryContainer.innerHTML = `
        <div class="summary-row">
            <span>Tạm tính (${totalItems} sản phẩm)</span>
            <span>${subtotal.toLocaleString()}₫</span>
        </div>
        <div class="summary-row">
            <span>Phí giao hàng</span>
            <span>${shipping === 0 ? "Miễn phí" : shipping.toLocaleString() + "₫"}</span>
        </div>
        <div class="summary-row total">
            <span>Tổng cộng</span>
            <span>${total.toLocaleString()}₫</span>
        </div>
        <button class="checkout-btn" id="checkoutBtn">✅ Đặt hàng ngay</button>
    `;
    
    const checkoutBtn = document.getElementById("checkoutBtn");
    if (checkoutBtn) {
        checkoutBtn.onclick = () => window.location.href = 'checkout.html';
    }
}

// ========== RENDER GIỎ HÀNG ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function renderCart() {
    const cart = getCart();
    const container = document.getElementById("cartItems");
    const summaryContainer = document.getElementById("cartSummary");
    
    if (!container || !summaryContainer) return;
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>🛒 Giỏ hàng của bạn đang trống</p>
                <a href="user.html">🍽️ Mua sắm ngay</a>
            </div>
        `;
        summaryContainer.innerHTML = "";
        return;
    }
    
    container.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
            <div class="cart-item-img">${item.image || "🍽️"}</div>
            <div class="cart-item-info">
                <div class="cart-item-name">${escapeHtml(item.name)}</div>
                <div class="cart-item-restaurant"><i class="fas fa-store"></i> ${escapeHtml(item.restaurantName)}</div>
            </div>
            <div class="cart-item-price">${item.price.toLocaleString()}₫</div>
            <div class="cart-item-quantity">
                <button class="qty-btn minus" data-id="${item.id}">-</button>
                <span class="qty-value">${item.quantity}</span>
                <button class="qty-btn plus" data-id="${item.id}">+</button>
            </div>
            <div class="cart-item-total">${(item.price * item.quantity).toLocaleString()}₫</div>
            <button class="delete-btn" data-id="${item.id}" data-name="${escapeHtml(item.name)}"><i class="fas fa-trash-alt"></i></button>
        </div>
    `).join("");
    
    // Gắn sự kiện
    document.querySelectorAll('.minus').forEach(btn => {
        btn.onclick = () => updateQuantity(parseInt(btn.dataset.id), -1);
    });
    document.querySelectorAll('.plus').forEach(btn => {
        btn.onclick = () => updateQuantity(parseInt(btn.dataset.id), 1);
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => {
            const id = parseInt(btn.dataset.id);
            const name = btn.dataset.name;
            showDeleteItemModal(id, name);
        };
    });
    
    updateSummary();
}

// ========== KHỞI TẠO ==========
function initEventListeners() {
    // Modal xóa
    const deleteOverlay = document.querySelector('.modal-delete-overlay');
    const cancelDelete = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    
    if (deleteOverlay) deleteOverlay.onclick = hideDeleteModal;
    if (cancelDelete) cancelDelete.onclick = hideDeleteModal;
    if (confirmDeleteBtn) confirmDeleteBtn.onclick = confirmDelete;
    
    // Modal địa chỉ
    const addressOverlay = document.querySelector('.modal-address-overlay');
    const cancelAddress = document.getElementById('cancelAddressBtn');
    const confirmAddress = document.getElementById('confirmAddressOrderBtn');
    const closeAddress = document.getElementById('closeAddressModal');
    
    if (addressOverlay) addressOverlay.onclick = hideAddressConfirmModal;
    if (cancelAddress) cancelAddress.onclick = hideAddressConfirmModal;
    if (closeAddress) closeAddress.onclick = hideAddressConfirmModal;
    if (confirmAddress) confirmAddress.onclick = confirmOrder;
    
    // Modal thành công
    const successOverlay = document.querySelector('.modal-success-overlay');
    const closeSuccess = document.getElementById('closeSuccessModal');
    
    if (successOverlay) successOverlay.onclick = hideSuccessOrderModal;
    if (closeSuccess) closeSuccess.onclick = hideSuccessOrderModal;
    
    // Nút xóa tất cả
    const clearCartBtn = document.getElementById('clearCartBtn');
    if (clearCartBtn) clearCartBtn.onclick = showDeleteAllModal;
    
    // ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (modalState.isOpen) hideDeleteModal();
            if (addressModalOpen) hideAddressConfirmModal();
            hideSuccessOrderModal();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderCart();
    initEventListeners();
});