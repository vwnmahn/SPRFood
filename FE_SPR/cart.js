// ============================================
// GIỎ HÀNG - LOCALSTORAGE
// ============================================

// Lấy giỏ hàng từ localStorage
function getCart() {
    const cart = localStorage.getItem("sprfood_cart");
    return cart ? JSON.parse(cart) : [];
}

// Lưu giỏ hàng vào localStorage
function saveCart(cart) {
    localStorage.setItem("sprfood_cart", JSON.stringify(cart));
}

// Tính tổng tiền
function calculateTotal(cart) {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// Tính tổng số lượng sản phẩm
function calculateTotalItems(cart) {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}

// Hiển thị thông báo
function showToast(message) {
    const oldToast = document.querySelector(".cart-toast");
    if (oldToast) oldToast.remove();
    
    const toast = document.createElement("div");
    toast.className = "cart-toast";
    toast.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// ============================================
// MODAL XÓA GIỎ HÀNG (DÙNG CHUNG)
// ============================================

let pendingDeleteItemId = null;  // Lưu id sản phẩm đang chờ xóa
let isClearAllMode = false;      // Chế độ xóa tất cả hay xóa 1 sản phẩm

// Hiển thị modal xác nhận xóa (xóa 1 sản phẩm)
function showDeleteItemModal(itemId, itemName) {
    const modal = document.getElementById('deleteConfirmModal');
    const modalBody = modal?.querySelector('.modal-delete-body p');
    
    if (modal && modalBody) {
        modalBody.innerHTML = `Bạn có đồng ý xóa <strong>"${itemName}"</strong> khỏi giỏ hàng không?`;
        pendingDeleteItemId = itemId;
        isClearAllMode = false;
        modal.classList.add('show');
    }
}

// Hiển thị modal xác nhận xóa tất cả
function showDeleteAllModal() {
    const modal = document.getElementById('deleteConfirmModal');
    const modalBody = modal?.querySelector('.modal-delete-body p');
    
    if (modal && modalBody) {
        modalBody.innerHTML = `Bạn có đồng ý xóa <strong>toàn bộ sản phẩm</strong> trong giỏ hàng không?`;
        pendingDeleteItemId = null;
        isClearAllMode = true;
        modal.classList.add('show');
    }
}

// Đóng modal
function hideDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.classList.remove('show');
        pendingDeleteItemId = null;
        isClearAllMode = false;
    }
}

// Xóa theo chế độ (1 sản phẩm hoặc tất cả)
function confirmDelete() {
    if (isClearAllMode) {
        // Xóa tất cả
        saveCart([]);
        renderCart();
        showToast("🗑️ Đã xóa toàn bộ giỏ hàng!");
    } else if (pendingDeleteItemId !== null) {
        // Xóa 1 sản phẩm
        let cart = getCart();
        const item = cart.find(i => i.id === pendingDeleteItemId);
        const itemName = item?.name || "sản phẩm";
        cart = cart.filter(i => i.id !== pendingDeleteItemId);
        saveCart(cart);
        renderCart();
        showToast(`🗑️ Đã xóa "${itemName}" khỏi giỏ hàng!`);
    }
    hideDeleteModal();
}

// Khởi tạo sự kiện cho modal
function initDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    const overlay = document.querySelector('.modal-delete-overlay');
    const cancelBtn = document.getElementById('cancelDeleteBtn');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    if (!modal) {
        console.error("Không tìm thấy modal deleteConfirmModal");
        return;
    }
    
    if (overlay) {
        overlay.addEventListener('click', hideDeleteModal);
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideDeleteModal);
    }
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmDelete);
    }
    
    // Đóng modal khi nhấn phím ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            hideDeleteModal();
        }
    });
    
    console.log("Modal đã được khởi tạo");
}

// ============================================
// CẬP NHẬT SỐ LƯỢNG & XÓA SẢN PHẨM
// ============================================

// Xóa một sản phẩm (mở modal xác nhận)
function removeItemWithConfirm(itemId, itemName) {
    showDeleteItemModal(itemId, itemName);
}

// Cập nhật số lượng sản phẩm
function updateQuantity(itemId, newQuantity) {
    if (newQuantity < 1) {
        // Nếu giảm về 0, hỏi xác nhận xóa
        let cart = getCart();
        const item = cart.find(i => i.id === itemId);
        if (item) {
            removeItemWithConfirm(itemId, item.name);
        }
        return;
    }
    
    let cart = getCart();
    const item = cart.find(i => i.id === itemId);
    if (item) {
        item.quantity = newQuantity;
        saveCart(cart);
        renderCart();
    }
}

// ============================================
// HIỂN THỊ GIỎ HÀNG
// ============================================

function renderCart() {
    const cart = getCart();
    const container = document.getElementById("cartItems");
    const summaryContainer = document.getElementById("cartSummary");
    
    if (!container || !summaryContainer) {
        console.error("Không tìm thấy phần tử cartItems hoặc cartSummary");
        return;
    }
    
    // Giỏ hàng trống
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
    
    // Hiển thị danh sách sản phẩm
    container.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
            <div class="cart-item-img">${item.image || "🍽️"}</div>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-restaurant"><i class="fas fa-store"></i> ${item.restaurantName}</div>
            </div>
            <div class="cart-item-price">${item.price.toLocaleString()}₫</div>
            <div class="cart-item-quantity">
                <button class="qty-btn minus" data-id="${item.id}" data-name="${item.name}">-</button>
                <span class="qty-value">${item.quantity}</span>
                <button class="qty-btn plus" data-id="${item.id}">+</button>
            </div>
            <div class="cart-item-total">${(item.price * item.quantity).toLocaleString()}₫</div>
            <button class="delete-btn" data-id="${item.id}" data-name="${item.name}"><i class="fas fa-trash-alt"></i></button>
        </div>
    `).join("");
    
    // Tính toán tổng kết
    const subtotal = calculateTotal(cart);
    const totalItems = calculateTotalItems(cart);
    const shipping = subtotal > 200000 ? 0 : 25000;
    const total = subtotal + shipping;
    
    // Hiển thị tổng kết
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
        <button class="checkout-btn" id="checkoutBtn">✅ Đặt hàng</button>
    `;
    
    // Thêm sự kiện cho nút giảm số lượng
    document.querySelectorAll(".minus").forEach(btn => {
        btn.removeEventListener('click', handleMinus);
        btn.addEventListener('click', handleMinus);
    });
    
    function handleMinus(e) {
        const id = parseInt(e.currentTarget.dataset.id);
        const item = cart.find(i => i.id === id);
        if (item && item.quantity > 1) {
            updateQuantity(id, item.quantity - 1);
        } else if (item && item.quantity === 1) {
            // Nếu quantity = 1, hỏi xác nhận xóa
            removeItemWithConfirm(id, item.name);
        }
    }
    
    // Thêm sự kiện cho nút tăng số lượng
    document.querySelectorAll(".plus").forEach(btn => {
        btn.removeEventListener('click', handlePlus);
        btn.addEventListener('click', handlePlus);
    });
    
    function handlePlus(e) {
        const id = parseInt(e.currentTarget.dataset.id);
        const item = cart.find(i => i.id === id);
        if (item) updateQuantity(id, item.quantity + 1);
    }
    
    // Thêm sự kiện cho nút xóa từng sản phẩm (icon thùng rác)
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.removeEventListener('click', handleDelete);
        btn.addEventListener('click', handleDelete);
    });
    
    function handleDelete(e) {
        const id = parseInt(e.currentTarget.dataset.id);
        const name = e.currentTarget.dataset.name;
        removeItemWithConfirm(id, name);
    }
    
    // Thêm sự kiện cho nút đặt hàng
    const checkoutBtn = document.getElementById("checkoutBtn");
    if (checkoutBtn) {
        checkoutBtn.removeEventListener('click', handleCheckout);
        checkoutBtn.addEventListener('click', handleCheckout);
    }
    
    function handleCheckout() {
        const cartCurrent = getCart();
        const total = calculateTotal(cartCurrent) + (calculateTotal(cartCurrent) > 200000 ? 0 : 25000);
        alert(`✅ Đặt hàng thành công!\n📦 Tổng đơn hàng: ${total.toLocaleString()}₫\n❤️ Cảm ơn bạn đã mua hàng!`);
        saveCart([]);
        renderCart();
    }
}

// ============================================
// THÊM CSS CHO TOAST
// ============================================

const style = document.createElement("style");
style.textContent = `
    .cart-toast {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: var(--dark);
        color: white;
        padding: 12px 24px;
        border-radius: 50px;
        font-size: 14px;
        z-index: 1000;
        transition: transform 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        white-space: nowrap;
    }
    .cart-toast.show {
        transform: translateX(-50%) translateY(0);
    }
    .cart-toast i {
        margin-right: 8px;
        color: var(--primary);
    }
    @media (max-width: 480px) {
        .cart-toast {
            white-space: normal;
            text-align: center;
            max-width: 90%;
        }
    }
`;
document.head.appendChild(style);

// ============================================
// KHỞI TẠO KHI TRANG LOAD XONG
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded - khởi tạo cart");
    
    // Hiển thị giỏ hàng
    renderCart();
    
    // Khởi tạo modal xóa
    initDeleteModal();
    
    // Gán sự kiện cho nút "Xóa tất cả"
    const clearCartBtn = document.getElementById('clearCartBtn');
    if (clearCartBtn) {
        clearCartBtn.removeEventListener('click', showDeleteAllModal);
        clearCartBtn.addEventListener('click', showDeleteAllModal);
        console.log("Đã gán sự kiện cho nút xóa tất cả");
    } else {
        console.error("Không tìm thấy nút clearCartBtn");
    }
});