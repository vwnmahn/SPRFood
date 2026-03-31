
// GIỎ HÀNG - LOCALSTORAGE
const currentRestaurant = {
    id: 4,
    name: "Paris Gateaux - Tràng Tiền",
    slug: "paris-gateaux-trang-tien"
};

function getCart() {
    const cart = localStorage.getItem("sprfood_cart");
    return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
    localStorage.setItem("sprfood_cart", JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartBadge = document.querySelector(".cart-badge");
    if (cartBadge) {
        cartBadge.textContent = totalItems;
        cartBadge.style.display = totalItems > 0 ? "flex" : "none";
    }
}

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
// DỮ LIỆU MENU
// ============================================
const menuData = [
    { id: 1, name: "Bánh kem Opera", description: "Bánh kem Opera Pháp", price: 180000, oldPrice: 220000, category: "main", popular: true, image: "🍰" },
    { id: 2, name: "Bánh kem Mousse", description: "Bánh kem mousse trái cây", price: 160000, oldPrice: 200000, category: "main", popular: true, image: "🍓" },
    { id: 3, name: "Bánh kem Tiramisu", description: "Bánh kem tiramisu Ý", price: 170000, oldPrice: 210000, category: "main", popular: true, image: "☕" },
    { id: 4, name: "Cappuccino", description: "Cappuccino thơm bọt", price: 50000, oldPrice: 60000, category: "drink", popular: true, image: "☕" },
    { id: 5, name: "Socola nóng", description: "Socola nóng thơm ngon", price: 45000, oldPrice: 55000, category: "drink", popular: true, image: "🍫" },
    { id: 6, name: "Macaron", description: "Macaron Pháp các vị", price: 25000, oldPrice: 35000, category: "snack", popular: true, image: "🍪" },
    { id: 7, name: "Bánh sừng bò", description: "Croissant bơ", price: 35000, oldPrice: 45000, category: "snack", popular: true, image: "🥐" }
];

let currentCategory = "all";
const menuGrid = document.getElementById("menuGrid");
const categoryChips = document.querySelectorAll(".category-chip");

function renderMenu() {
    let filtered = currentCategory === "all" ? menuData : menuData.filter(item => item.category === currentCategory);
    if (filtered.length === 0) {
        menuGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;"><i class="fas fa-cake-candles" style="font-size:48px;color:var(--gray-text);margin-bottom:16px;"></i><p style="color:var(--gray-text);">Chưa có món ăn trong danh mục này</p></div>`;
        return;
    }
    menuGrid.innerHTML = filtered.map(item => `
        <div class="menu-item">
            <div class="menu-item-img"><span style="font-size:56px;">${item.image}</span>${item.popular ? '<span class="popular-badge">🔥 Phổ biến</span>' : ''}</div>
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
            addToCart({
                id: parseInt(btn.dataset.id),
                name: btn.dataset.name,
                price: parseInt(btn.dataset.price),
                image: btn.dataset.image
            });
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

document.querySelector(".btn-cart")?.addEventListener("click", () => {
    window.location.href = "cart.html";
});

document.querySelector(".logo")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "user.html";
});

const style = document.createElement("style");
style.textContent = `
    .cart-notification { position: fixed; bottom: 30px; right: 30px; background: #2ecc71; color: white; padding: 12px 20px; border-radius: 50px; display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; z-index: 1000; transform: translateX(400px); transition: transform 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .cart-notification.show { transform: translateX(0); }
    .cart-notification i { font-size: 18px; }
    .cart-badge { position: absolute; top: -8px; right: -8px; background: #2ecc71; color: white; font-size: 11px; font-weight: 600; min-width: 18px; height: 18px; border-radius: 50%; display: none; align-items: center; justify-content: center; padding: 0 4px; }
    .btn-cart { position: relative; }
    .popular-badge { position: absolute; top: 12px; left: 12px; background: var(--primary); color: white; padding: 4px 10px; border-radius: 30px; font-size: 12px; font-weight: 700; }
`;
document.head.appendChild(style);

renderMenu();
updateCartBadge();