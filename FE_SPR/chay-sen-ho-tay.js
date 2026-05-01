// ============================================
// GIỎ HÀNG - LOCALSTORAGE
// ============================================
// Thêm nút trang chủ vào header
document.addEventListener('DOMContentLoaded', () => {
    const headerActions = document.querySelector('.header-actions');
    if (headerActions && !document.querySelector('.btn-home')) {
        const homeBtn = document.createElement('a');
        homeBtn.href = 'user.html';
        homeBtn.className = 'btn-home';
        homeBtn.innerHTML = '<i class="fas fa-home"></i> Trang chủ';
        headerActions.insertBefore(homeBtn, headerActions.firstChild);
    }
});
// Thông tin quán hiện tại
const currentRestaurant = {
    id: 3,
    name: "Chay Sen - Hồ Tây",
    slug: "chay-sen-ho-tay"
};

// Lấy giỏ hàng từ localStorage
function getCart() {
    const cart = localStorage.getItem("sprfood_cart");
    return cart ? JSON.parse(cart) : [];
}

// Lưu giỏ hàng vào localStorage
function saveCart(cart) {
    localStorage.setItem("sprfood_cart", JSON.stringify(cart));
    updateCartBadge();
}

// Cập nhật số lượng hiển thị trên icon giỏ hàng
function updateCartBadge() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartBadge = document.querySelector(".cart-badge");
    
    if (cartBadge) {
        if (totalItems > 0) {
            cartBadge.textContent = totalItems;
            cartBadge.style.display = "flex";
        } else {
            cartBadge.style.display = "none";
        }
    }
}

// Thêm sản phẩm vào giỏ hàng
function addToCart(item) {
    const cart = getCart();
    const existingItem = cart.find(i => i.restaurantId === currentRestaurant.id && i.itemId === item.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: Date.now(),
            restaurantId: currentRestaurant.id,
            restaurantName: currentRestaurant.name,
            restaurantSlug: currentRestaurant.slug,
            itemId: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            image: item.image
        });
    }
    
    saveCart(cart);
    showNotification(` 🛒 Đã thêm "${item.name}" vào giỏ hàng!`);
}

// Hiển thị thông báo
function showNotification(message) {
    const oldNoti = document.querySelector(".cart-notification");
    if (oldNoti) oldNoti.remove();
    
    const noti = document.createElement("div");
    noti.className = "cart-notification";
    noti.innerHTML = `<i class="fas fa-check-circle"></i><span>${message}</span>`;
    document.body.appendChild(noti);
    
    setTimeout(() => noti.classList.add("show"), 10);
    setTimeout(() => {
        noti.classList.remove("show");
        setTimeout(() => noti.remove(), 300);
    }, 2000);
}

// ============================================
// DỮ LIỆU MENU CHO QUÁN CHAY SEN - HỒ TÂY
// ============================================
const menuData = [
    { id: 1, name: "Cơm chay đặc biệt", description: "Cơm trắng, đậu hũ sốt cà, rau luộc, canh chay", price: 55000, oldPrice: 65000, category: "main", popular: true, image: "🍱" },
    { id: 2, name: "Bún chay", description: "Bún tươi, đậu hũ chiên, nấm, rau sống", price: 45000, oldPrice: 55000, category: "main", popular: true, image: "🍜" },
    { id: 3, name: "Phở chay", description: "Phở chay nước dùng nấm, đậu hũ", price: 45000, oldPrice: 55000, category: "main", popular: true, image: "🍜" },
    { id: 4, name: "Đậu hũ sốt cà", description: "Đậu hũ chiên sốt cà chua", price: 35000, oldPrice: 45000, category: "main", popular: true, image: "🥘" },
    { id: 5, name: "Nấm xào tỏi", description: "Nấm các loại xào tỏi thơm lừng", price: 40000, oldPrice: 50000, category: "main", popular: false, image: "🍄" },
    { id: 6, name: "Rau củ luộc", description: "Rau củ luộc chấm mắm chay", price: 30000, oldPrice: 40000, category: "main", popular: true, image: "🥬" },
    { id: 7, name: "Trà sen", description: "Trà sen thơm mát, thanh lọc cơ thể", price: 20000, oldPrice: 30000, category: "drink", popular: true, image: "🍵" },
    { id: 8, name: "Nước sâm", description: "Nước sâm bổ dưỡng, giải nhiệt", price: 25000, oldPrice: 35000, category: "drink", popular: true, image: "🍶" },
    { id: 9, name: "Sữa đậu nành", description: "Sữa đậu nành nóng, thơm béo", price: 15000, oldPrice: 20000, category: "drink", popular: true, image: "🥛" },
    { id: 10, name: "Chả giò chay", description: "Chả giò chay giòn rụm, nhân nấm mộc nhĩ", price: 35000, oldPrice: 45000, category: "snack", popular: true, image: "🌯" },
    { id: 11, name: "Bánh bột lọc", description: "Bánh bột lọc chay nhân nấm", price: 25000, oldPrice: 35000, category: "snack", popular: true, image: "🥟" }
];

let currentCategory = "all";
const menuGrid = document.getElementById("menuGrid");
const categoryChips = document.querySelectorAll(".category-chip");

function renderMenu() {
    let filtered = currentCategory === "all" ? menuData : menuData.filter(item => item.category === currentCategory);
    if (filtered.length === 0) {
        menuGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;"><i class="fas fa-leaf" style="font-size:48px;color:var(--gray-text);margin-bottom:16px;"></i><p style="color:var(--gray-text);">Chưa có món ăn trong danh mục này</p></div>`;
        return;
    }
    menuGrid.innerHTML = filtered.map(item => `
        <div class="menu-item">
            <div class="menu-item-img"><span style="font-size:56px;">${item.image}</span>${item.popular ? '<span class="popular-badge">🌱 Phổ biến</span>' : ''}</div>
            <div class="menu-item-info">
                <h3 class="menu-item-name">${item.name}</h3>
                <p class="menu-item-desc">${item.description}</p>
                <div class="menu-item-price"><span class="current-price">${item.price.toLocaleString()}₫</span><span class="old-price">${item.oldPrice.toLocaleString()}₫</span></div>
                <button class="add-to-cart" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" data-image="${item.image}"><i class="fas fa-cart-plus"></i> Thêm vào giỏ</button>
            </div>
        </div>
    `).join("");
    
    document.querySelectorAll(".add-to-cart").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const item = {
                id: parseInt(btn.dataset.id),
                name: btn.dataset.name,
                price: parseInt(btn.dataset.price),
                image: btn.dataset.image
            };
            addToCart(item);
        });
    });
}

categoryChips.forEach(chip => {
    chip.addEventListener("click", () => {
        categoryChips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        currentCategory = chip.dataset.category;
        renderMenu();
    });
});

// Nút giỏ hàng - CHUYỂN SANG TRANG GIỎ HÀNG
const cartBtn = document.querySelector(".btn-cart");
if (cartBtn) {
    cartBtn.addEventListener("click", () => {
        window.location.href = "cart.html";
    });
}

const logo = document.querySelector(".logo");
if (logo) {
    logo.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "user.html";
    });
}

// Style
const style = document.createElement("style");
style.textContent = `
    .cart-notification {
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: #2ecc71;
        color: white;
        padding: 12px 20px;
        border-radius: 50px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 500;
        z-index: 1000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .cart-notification.show { transform: translateX(0); }
    .cart-notification i { font-size: 18px; }
    .cart-badge {
        position: absolute;
        top: -8px;
        right: -8px;
        background: #2ecc71;
        color: white;
        font-size: 11px;
        font-weight: 600;
        min-width: 18px;
        height: 18px;
        border-radius: 50%;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
    }
    .btn-cart { position: relative; }
    .popular-badge {
        position: absolute;
        top: 12px;
        left: 12px;
        background: #2ecc71;
        color: white;
        padding: 4px 10px;
        border-radius: 30px;
        font-size: 12px;
        font-weight: 700;
    }
`;
document.head.appendChild(style);

renderMenu();
updateCartBadge();