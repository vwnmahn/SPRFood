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

// Cập nhật số lượng sản phẩm
function updateQuantity(itemId, newQuantity) {
    if (newQuantity < 1) {
        removeItem(itemId);
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

// Xóa một sản phẩm khỏi giỏ hàng
function removeItem(itemId) {
    let cart = getCart();
    cart = cart.filter(i => i.id !== itemId);
    saveCart(cart);
    renderCart();
    showToast("🗑️ Đã xóa sản phẩm khỏi giỏ hàng!");
}

// Xóa toàn bộ giỏ hàng
function clearCart() {
    if (confirm("Bạn có chắc muốn xóa toàn bộ giỏ hàng?")) {
        saveCart([]);
        renderCart();
        showToast("🗑️ Đã xóa toàn bộ giỏ hàng!");
    }
}

// Tính tổng tiền
function calculateTotal(cart) {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// Tính tổng số lượng sản phẩm
function calculateTotalItems(cart) {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}

// Hiển thị thông báo nhẹ
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

// Hiển thị giỏ hàng
function renderCart() {
    const cart = getCart();
    const container = document.getElementById("cartItems");
    const summaryContainer = document.getElementById("cartSummary");
    
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
                <button class="qty-btn minus" data-id="${item.id}">-</button>
                <span class="qty-value">${item.quantity}</span>
                <button class="qty-btn plus" data-id="${item.id}">+</button>
            </div>
            <div class="cart-item-total">${(item.price * item.quantity).toLocaleString()}₫</div>
            <button class="delete-btn" data-id="${item.id}"><i class="fas fa-trash-alt"></i></button>
        </div>
    `).join("");
    
    // Hiển thị tổng kết
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
        <button class="checkout-btn" id="checkoutBtn">Đặt hàng</button>
    `;
    
    // Thêm sự kiện cho các nút
    document.querySelectorAll(".minus").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            const item = cart.find(i => i.id === id);
            if (item) updateQuantity(id, item.quantity - 1);
        });
    });
    
    document.querySelectorAll(".plus").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            const item = cart.find(i => i.id === id);
            if (item) updateQuantity(id, item.quantity + 1);
        });
    });
    
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => removeItem(parseInt(btn.dataset.id)));
    });
    
    const checkoutBtn = document.getElementById("checkoutBtn");
    if (checkoutBtn) {
        checkoutBtn.addEventListener("click", () => {
            const total = calculateTotal(cart) + (calculateTotal(cart) > 200000 ? 0 : 25000);
            alert(`✅ Đặt hàng thành công!\n📦 Tổng đơn hàng: ${total.toLocaleString()}₫\n Cảm ơn bạn đã mua hàng!`);
            saveCart([]);
            renderCart();
        });
    }
}

// Thêm CSS cho toast
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

// Khởi tạo
renderCart();

// Xóa tất cả
document.getElementById("clearCartBtn")?.addEventListener("click", clearCart);