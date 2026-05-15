// ============================================
// PROFILE PAGE - SPRFood (COMPLETE)
// ============================================

const API_BASE_URL = "http://localhost:8080/api";

// ========== DOM Elements ==========
const displayUsername = document.getElementById('displayUsername');
const displayFullName = document.getElementById('displayFullName');
const displayEmail = document.getElementById('displayEmail');
const displayPhone = document.getElementById('displayPhone');
const displayAddress = document.getElementById('displayAddress');
const displayRoles = document.getElementById('displayRoles');
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const totalOrdersEl = document.getElementById('totalOrdersBadge');
const memberDaysEl = document.getElementById('memberDays');
const favoriteCountEl = document.getElementById('favoriteCount');
const recentOrdersContainer = document.getElementById('recentOrders');

// Edit form
const editForm = document.getElementById('editForm');
const editFullName = document.getElementById('editFullName');
const editPhone = document.getElementById('editPhone');
const editAddress = document.getElementById('editAddress');
const profileForm = document.getElementById('profileForm');
const editInfoBtn = document.getElementById('editInfoBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// Change password
const changePasswordForm = document.getElementById('changePasswordForm');

// Avatar
const changeAvatarBtn = document.getElementById('changeAvatarBtn');
const avatarInput = document.getElementById('avatarInput');
const avatarImg = document.getElementById('avatarImg');
const avatarIcon = document.getElementById('avatarIcon');

// ========== Utilities ==========
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

function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.className = `toast ${type} show`;
    toast.textContent = message;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function getDisplayName(user) {
    if (!user) return '---';
    const fullname = user.fullname || user.fullName || user.name;
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const combined = `${firstName} ${lastName}`.trim();
    return fullname || combined || user.username || '---';
}

function parseNameParts(fullname) {
    const name = (fullname || '').trim();
    if (!name) return { firstName: '', lastName: '' };
    const parts = name.split(/\s+/);
    return {
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || ''
    };
}

// ========== API Calls ==========
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
        showToast('Phiên đăng nhập hết hạn!', 'error');
        setTimeout(() => window.location.href = 'login.html', 1500);
        throw new Error('Unauthorized');
    }

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.message || `Lỗi ${response.status}`);
        error.status = response.status;
        throw error;
    }

    return data.data !== undefined ? data.data : data;
}

// ========== Load User Profile ==========
async function loadUserProfile() {
    try {
        const user = await apiCall('/auth/me');
        console.log('User profile:', user);

        if (displayUsername) displayUsername.textContent = user.username || '---';
        if (displayFullName) displayFullName.textContent = getDisplayName(user);
        if (displayEmail) displayEmail.textContent = user.email || '---';
        if (displayPhone) displayPhone.textContent = user.phoneNumber || user.phone || '---';
        if (displayAddress) displayAddress.textContent = user.address || '---';
        if (displayRoles) {
            const roles = user.roles || [];
            displayRoles.textContent = roles.join(', ') || 'USER';
        }
        if (userName) userName.textContent = getDisplayName(user) || 'Tài khoản của tôi';
        if (userRole) {
            const roles = user.roles || [];
            userRole.textContent = roles.includes('ADMIN') ? 'Quản trị viên' : 'Thành viên';
        }

        if (editFullName) editFullName.value = getDisplayName(user) === '---' ? '' : getDisplayName(user);
        if (editPhone) editPhone.value = user.phoneNumber || user.phone || '';
        if (editAddress) editAddress.value = user.address || '';

        // ✅ Hiển thị avatar nếu có
        renderAvatar(user.avatarUrl);

        const storedUser = getCurrentUser();
        if (storedUser) {
            const updatedUser = { ...storedUser, ...user };
            localStorage.setItem('sprfood_user', JSON.stringify(updatedUser));
        }

        return user;
    } catch (error) {
        console.error('Load profile error:', error);
        const localUser = getCurrentUser();
        if (localUser) {
            if (displayUsername) displayUsername.textContent = localUser.username || '---';
            if (displayFullName) displayFullName.textContent = getDisplayName(localUser);
            if (displayEmail) displayEmail.textContent = localUser.email || '---';
            if (displayPhone) displayPhone.textContent = localUser.phoneNumber || '---';
            if (displayAddress) displayAddress.textContent = localUser.address || '---';
            if (userName) userName.textContent = getDisplayName(localUser) || localUser.username || 'Tài khoản của tôi';
            renderAvatar(localUser.avatarUrl);
        }
        showToast('Không thể tải thông tin từ server!', 'error');
    }
}

// ========== Render Avatar ==========
function renderAvatar(avatarUrl) {
    if (!avatarImg || !avatarIcon) return;

    if (avatarUrl) {
        // Thêm timestamp để tránh cache khi upload ảnh mới
        avatarImg.src = avatarUrl.startsWith('http')
            ? avatarUrl
            : `http://localhost:8080${avatarUrl}?t=${Date.now()}`;
        avatarImg.style.display = 'block';
        avatarImg.onerror = () => {
            // Nếu load ảnh lỗi thì fallback về icon
            avatarImg.style.display = 'none';
            avatarIcon.style.display = 'block';
        };
        avatarIcon.style.display = 'none';
    } else {
        avatarImg.style.display = 'none';
        avatarIcon.style.display = 'block';
    }
}

// ========== Avatar Upload ==========
async function uploadAvatar(file) {
    // Validate loại file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
        showToast('Chỉ chấp nhận file ảnh JPEG hoặc PNG!', 'error');
        return;
    }

    // Validate kích thước (tối đa 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast('Ảnh không được vượt quá 5MB!', 'error');
        return;
    }

    // Preview ảnh ngay lập tức trước khi upload
    const previewUrl = URL.createObjectURL(file);
    if (avatarImg) {
        avatarImg.src = previewUrl;
        avatarImg.style.display = 'block';
        if (avatarIcon) avatarIcon.style.display = 'none';
    }

    // Hiện loading
    if (changeAvatarBtn) {
        changeAvatarBtn.disabled = true;
        changeAvatarBtn.textContent = 'Đang upload...';
    }

    try {
        const token = getAuthToken();
        if (!token) throw new Error('Chưa đăng nhập');

        const formData = new FormData();
        formData.append('avatar', file);

        const response = await fetch(`${API_BASE_URL}/auth/avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        console.log('Upload avatar response:', data);

        if (response.ok) {
            // Backend trả ApiResponse<Map> nên avatarUrl nằm trong data.data.avatarUrl
            const avatarUrl = data?.data?.avatarUrl || data?.avatarUrl;

            if (avatarUrl) {
                renderAvatar(avatarUrl);

                // Cập nhật localStorage
                const currentUser = getCurrentUser();
                if (currentUser) {
                    currentUser.avatarUrl = avatarUrl;
                    localStorage.setItem('sprfood_user', JSON.stringify(currentUser));
                    sessionStorage.setItem('sprfood_user', JSON.stringify(currentUser));
                }
            }

            showToast('Cập nhật ảnh đại diện thành công!');
        } else {
            // Upload thất bại — revert preview về ảnh cũ
            URL.revokeObjectURL(previewUrl);
            const currentUser = getCurrentUser();
            renderAvatar(currentUser?.avatarUrl);

            const errorMsg = data?.message || data?.data?.message || 'Upload ảnh thất bại!';
            showToast(errorMsg, 'error');
        }
    } catch (error) {
        console.error('Upload avatar error:', error);
        // Revert preview
        URL.revokeObjectURL(previewUrl);
        const currentUser = getCurrentUser();
        renderAvatar(currentUser?.avatarUrl);
        showToast('Lỗi kết nối đến server!', 'error');
    } finally {
        // Restore nút
        if (changeAvatarBtn) {
            changeAvatarBtn.disabled = false;
            changeAvatarBtn.textContent = 'Đổi ảnh';
        }
        // Reset input để có thể chọn lại cùng file
        if (avatarInput) avatarInput.value = '';
    }
}

// ========== Avatar Handler Init ==========
function initAvatarUpload() {
    if (!changeAvatarBtn || !avatarInput) return;

    changeAvatarBtn.addEventListener('click', () => {
        avatarInput.click();
    });

    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) uploadAvatar(file);
    });

    // Hỗ trợ kéo thả ảnh vào avatar
    const avatarWrapper = avatarImg?.parentElement;
    if (avatarWrapper) {
        avatarWrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            avatarWrapper.style.opacity = '0.7';
        });

        avatarWrapper.addEventListener('dragleave', () => {
            avatarWrapper.style.opacity = '1';
        });

        avatarWrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            avatarWrapper.style.opacity = '1';
            const file = e.dataTransfer.files[0];
            if (file) uploadAvatar(file);
        });
    }
}

// ========== Update User Profile ==========
async function updateUserProfile(formData) {
    const user = getCurrentUser();
    if (!user) {
        showToast('Không tìm thấy thông tin người dùng!', 'error');
        return;
    }

    const userId = user.id || user._id || user.userId;
    if (!userId) {
        showToast('Không tìm thấy ID người dùng để cập nhật!', 'error');
        return;
    }

    const nameParts = parseNameParts(formData.fullname);
    const updateBody = JSON.stringify({
        fullname: formData.fullname,
        fullName: formData.fullname,
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        phoneNumber: formData.phoneNumber,
        address: formData.address
    });

    const endpoints = [`/auth/users/${userId}`, '/auth/me'];
    let updatedUser = null;
    let lastError = null;

    for (const endpoint of endpoints) {
        try {
            updatedUser = await apiCall(endpoint, { method: 'PUT', body: updateBody });
            break;
        } catch (error) {
            lastError = error;
            if (endpoint === `/auth/users/${userId}` && (error.status === 404 || error.status === 405)) continue;
            throw error;
        }
    }

    if (!updatedUser) throw lastError || new Error('Cập nhật thông tin thất bại!');

    showToast('Cập nhật thông tin thành công!');

    const currentUser = getCurrentUser();
    if (currentUser) {
        const updated = { ...currentUser, ...updatedUser, ...formData, fullname: formData.fullname, fullName: formData.fullname, firstName: nameParts.firstName, lastName: nameParts.lastName };
        localStorage.setItem('sprfood_user', JSON.stringify(updated));
        sessionStorage.setItem('sprfood_user', JSON.stringify(updated));
    }

    await loadUserProfile();

    if (editForm) editForm.style.display = 'none';
    const infoGrid = document.querySelector('#infoTab .info-grid');
    if (infoGrid) infoGrid.style.display = 'grid';

    return updatedUser;
}

// ========== Change Password ==========
async function changePassword(currentPassword, newPassword, confirmPassword) {
    if (!currentPassword) {
        showToast('Vui lòng nhập mật khẩu hiện tại!', 'error');
        return false;
    }

    if (newPassword !== confirmPassword) {
        showToast('Mật khẩu mới không khớp!', 'error');
        return false;
    }

    //  Đồng bộ với @Pattern của backend
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        showToast('Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&)!', 'error');
        return false;
    }

    if (currentPassword === newPassword) {
        showToast('Mật khẩu mới không được trùng với mật khẩu cũ!', 'error');
        return false;
    }

    try {
        const token = getAuthToken();

        //  Chỉ gửi 2 fields mà DTO có (không gửi confirmPassword)
        const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Đổi mật khẩu thành công!');
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmNewPassword').value = '';

            const strengthBar = document.getElementById('strengthBar');
            const strengthText = document.getElementById('strengthText');
            if (strengthBar) { strengthBar.style.width = '0%'; strengthBar.className = 'strength-bar'; }
            if (strengthText) strengthText.textContent = '';

            return true;
        } else {
            const errorMsg = data.message || data.data?.message || 'Đổi mật khẩu thất bại!';
            showToast(errorMsg, 'error');
            return false;
        }
    } catch (error) {
        console.error('Change password error:', error);
        showToast('Lỗi kết nối đến server!', 'error');
        return false;
    }
}

// ========== Load Order Statistics ==========
async function loadOrderStatistics() {
    try {
        const orders = await apiCall('/orders');
        const totalOrders = Array.isArray(orders) ? orders.length : 0;
        if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
        return { totalOrders, orders };
    } catch (error) {
        console.error('Load order statistics error:', error);
        if (totalOrdersEl) totalOrdersEl.textContent = '0';
        return { totalOrders: 0, orders: [] };
    }
}

// ========== Load Member Days ==========
async function loadMemberDays() {
    try {
        const user = await apiCall('/auth/me');
        if (user?.createdAt && memberDaysEl) {
            const diffDays = Math.ceil(Math.abs(new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
            memberDaysEl.textContent = diffDays;
        }
    } catch (error) {
        if (memberDaysEl) memberDaysEl.textContent = '7';
    }
}

// ========== Load Recent Orders ==========
async function loadRecentOrders() {
    if (!recentOrdersContainer) return;

    try {
        const orders = await apiCall('/orders');
        const orderList = Array.isArray(orders) ? orders : [];

        if (orderList.length === 0) {
            recentOrdersContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Chưa có đơn hàng nào</p>
                    <a href="user.html" class="btn-primary" style="display:inline-block;margin-top:12px;padding:8px 20px;background:#ff5e3a;color:white;border-radius:40px;text-decoration:none;">Đặt hàng ngay</a>
                </div>
            `;
            return;
        }

        const statusMap = {
            'PENDING':    { text: 'Chờ xác nhận', class: 'status-pending' },
            'CONFIRMED':  { text: 'Đã xác nhận',  class: 'status-confirmed' },
            'DELIVERING': { text: 'Đang giao',     class: 'status-delivering' },
            'COMPLETED':  { text: 'Hoàn thành',    class: 'status-completed' },
            'CANCELLED':  { text: 'Đã hủy',        class: 'status-cancelled' }
        };

        const recentOrders = [...orderList]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 3);

        recentOrdersContainer.innerHTML = recentOrders.map(order => {
            const status = statusMap[order.status] || { text: order.status, class: '' };
            return `
                <div class="order-item" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #eee;">
                    <div class="order-info">
                        <div class="order-code" style="font-weight:600;">#${order.orderCode || order.id}</div>
                        <div class="order-restaurant" style="font-size:13px;color:#666;">${escapeHtml(order.restaurantName || 'Nhà hàng')}</div>
                        <div class="order-date" style="font-size:12px;color:#999;">${formatDate(order.createdAt)}</div>
                    </div>
                    <div class="order-status ${status.class}" style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;background:#f0f2f5;">${status.text}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Load recent orders error:', error);
        recentOrdersContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Không thể tải đơn hàng</p>
                <button onclick="location.reload()" style="margin-top:12px;padding:8px 20px;background:#ff5e3a;color:white;border-radius:40px;border:none;cursor:pointer;">Thử lại</button>
            </div>
        `;
    }
}

// ========== Load Favorite Count ==========
async function loadFavoriteCount() {
    if (!favoriteCountEl) return;
    try {
        const favorites = await apiCall('/favorites/count').catch(() => null);
        favoriteCountEl.textContent = favorites?.count || 0;
    } catch (error) {
        favoriteCountEl.textContent = '0';
    }
}

// ========== Tab Navigation ==========
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            panes.forEach(pane => {
                pane.id === `${targetTab}Tab`
                    ? pane.classList.add('active')
                    : pane.classList.remove('active');
            });
            if (targetTab === 'orders') loadRecentOrders();
        });
    });
}

// ========== Edit Form ==========
function initEditForm() {
    if (editInfoBtn) {
        editInfoBtn.addEventListener('click', () => {
            if (editForm) editForm.style.display = 'block';
            const infoGrid = document.querySelector('#infoTab .info-grid');
            if (infoGrid) infoGrid.style.display = 'none';
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            if (editForm) editForm.style.display = 'none';
            const infoGrid = document.querySelector('#infoTab .info-grid');
            if (infoGrid) infoGrid.style.display = 'grid';
        });
    }

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateUserProfile({
                fullname: editFullName?.value || '',
                phoneNumber: editPhone?.value || '',
                address: editAddress?.value || ''
            });
        });
    }
}

// ========== Logout ==========
function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async () => {
        try {
            const token = getAuthToken();
            if (token) {
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        } catch(e) {}

        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'login.html';
    });
}

// ========== Change Password Handler ==========
function initChangePassword() {
    if (!changePasswordForm) return;

    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword     = document.getElementById('currentPassword').value;
        const newPassword         = document.getElementById('newPassword').value;
        const confirmNewPassword  = document.getElementById('confirmNewPassword').value;
        await changePassword(currentPassword, newPassword, confirmNewPassword);
    });
}

// ========== Toggle Password Visibility ==========
function initPasswordToggle() {
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            if (!input) return;
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            btn.innerHTML = `<i class="fas fa-${isPassword ? 'eye' : 'eye-slash'}"></i>`;
        });
    });
}

// ========== INIT ==========
async function init() {
    const token = getAuthToken();
    if (!token) {
        showToast('Vui lòng đăng nhập để xem thông tin!', 'error');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    await loadUserProfile();
    await loadMemberDays();
    await loadOrderStatistics();
    await loadRecentOrders();
    await loadFavoriteCount();

    initTabs();
    initEditForm();
    initLogout();
    initAvatarUpload();
    initChangePassword();
    initPasswordToggle();

    console.log(' Profile page initialized');
}

document.addEventListener('DOMContentLoaded', init);