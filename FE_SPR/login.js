// ============================================
// CẤU HÌNH API BACKEND
// ============================================
const API_BASE_URL = "http://localhost:8080/api";

// ============================================
// CHẶN GET REQUEST ĐẾN API AUTH (CHỈ 1 LẦN)
// ============================================
(function() {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args[0];
        const options = args[1] || {};
        const method = options.method || 'GET';
        
        // Nếu là GET request đến API auth và không phải /me
        if (url && typeof url === 'string' && url.includes('/api/auth/') && method === 'GET' && !url.includes('/me')) {
            console.warn('⚠️ Đã chặn GET request không hợp lệ:', url);
            return Promise.reject(new Error('Method not allowed. Please use POST.'));
        }
        return originalFetch.apply(this, args);
    };
})();

// ============================================
// XÓA DỮ LIỆU CŨ KHI RELOAD TRANG
// ============================================
if (window.performance) {
    if (performance.navigation.type === 1 || 
        (performance.getEntriesByType && performance.getEntriesByType("navigation")[0]?.type === "reload")) {
        console.log("Trang được tải lại, xóa dữ liệu cũ");
        localStorage.removeItem('sprfood_token');
        localStorage.removeItem('sprfood_user');
        sessionStorage.removeItem('sprfood_token');
        sessionStorage.removeItem('sprfood_user');
    }
}

// ============================================
// HÀM HIỂN THỊ THÔNG BÁO
// ============================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// HIỂN THỊ LOADING
// ============================================
function setLoading(button, isLoading, originalText = null) {
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        button.setAttribute('data-original-text', button.innerHTML);
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
    } else {
        button.disabled = false;
        button.innerHTML = button.getAttribute('data-original-text') || originalText || button.innerHTML;
    }
}

// ============================================
// LƯU TRỮ TOKEN & USER
// ============================================
function saveAuthData(token, user, remember = false) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('sprfood_token', token);
    storage.setItem('sprfood_user', JSON.stringify(user));
}

function clearAuthData() {
    localStorage.removeItem('sprfood_token');
    localStorage.removeItem('sprfood_user');
    sessionStorage.removeItem('sprfood_token');
    sessionStorage.removeItem('sprfood_user');
}

function getAuthToken() {
    return localStorage.getItem('sprfood_token') || sessionStorage.getItem('sprfood_token');
}

function isLoggedIn() {
    return !!getAuthToken();
}

// ============================================
// FLAG CHỐNG GỬI REQUEST TRÙNG LẶP
// ============================================
let isLoggingIn = false;
let isRegistering = false;

// ============================================
// API ĐĂNG KÝ
// ============================================
async function handleRegister(e) {
    e.preventDefault();
    
    if (isRegistering) {
        console.log("Đang xử lý đăng ký, vui lòng đợi...");
        return;
    }
    
    const username = document.getElementById('regUsername').value.trim();
    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phoneNumber = document.getElementById('regPhone').value.trim();
    const address = document.getElementById('regAddress').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const termsAgree = document.getElementById('termsAgree').checked;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    if (!username || !firstName || !lastName || !email || !phoneNumber || !address || !password || !confirmPassword) {
        showToast('Vui lòng nhập đầy đủ thông tin', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Mật khẩu xác nhận không khớp', 'error');
        return;
    }
    
    if (!termsAgree) {
        showToast('Vui lòng đồng ý với điều khoản sử dụng', 'error');
        return;
    }
    
    isRegistering = true;
    setLoading(submitBtn, true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                firstName: firstName,
                lastName: lastName,
                email: email,
                phoneNumber: phoneNumber,
                address: address,
                password: password,
                confirmPassword: confirmPassword
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.code === 200) {
            showToast('🎉 Đăng ký thành công! Vui lòng đăng nhập.');
            
            const loginTab = document.querySelector('[data-tab="login"]');
            if (loginTab) loginTab.click();
            
            document.getElementById('regUsername').value = '';
            document.getElementById('regFirstName').value = '';
            document.getElementById('regLastName').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPhone').value = '';
            document.getElementById('regAddress').value = '';
            document.getElementById('regPassword').value = '';
            document.getElementById('regConfirmPassword').value = '';
            document.getElementById('termsAgree').checked = false;
        } else {
            showToast(data.message || 'Đăng ký thất bại', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showToast('Lỗi kết nối đến máy chủ', 'error');
    } finally {
        setLoading(submitBtn, false);
        isRegistering = false;
    }
}

// ============================================
// API ĐĂNG NHẬP
// ============================================
async function handleLogin(e) {
    e.preventDefault();
    
    if (isLoggingIn) {
        console.log("Đang xử lý đăng nhập, vui lòng đợi...");
        return;
    }
    
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    if (!identifier || !password) {
        showToast('Vui lòng nhập email/số điện thoại và mật khẩu', 'error');
        return;
    }
    
    isLoggingIn = true;
    setLoading(submitBtn, true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identifier: identifier,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.code === 200 && data.data) {
            clearAuthData();
            saveAuthData(data.data.token, data.data.user, rememberMe);
            
            const userName = data.data.user?.username || data.data.user?.email || 'bạn';
            showToast(`🎉 Chào mừng ${userName} quay trở lại!`);
            
            setTimeout(() => {
                window.location.replace('user.html');
            }, 500);
        } else {
            showToast(data.message || 'Sai email/số điện thoại hoặc mật khẩu', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Lỗi kết nối đến máy chủ', 'error');
    } finally {
        setLoading(submitBtn, false);
        isLoggingIn = false;
    }
}

// ============================================
// API QUÊN MẬT KHẨU
// ============================================
async function handleForgotPassword() {
    const identifier = document.getElementById('forgotIdentifier').value.trim();
    const sendBtn = document.getElementById('sendResetLink');
    
    if (!identifier) {
        showToast('Vui lòng nhập email hoặc số điện thoại', 'error');
        return;
    }
    
    setLoading(sendBtn, true, 'Gửi yêu cầu');
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: identifier })
        });
        
        const data = await response.json();
        
        if (response.ok && data.code === 200) {
            showToast(`📧 Nếu tài khoản tồn tại, hướng dẫn đã được gửi đến ${identifier}`);
            closeForgotModal();
        } else {
            showToast(data.message || 'Có lỗi xảy ra', 'error');
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        showToast('Lỗi kết nối đến máy chủ', 'error');
    } finally {
        setLoading(sendBtn, false);
    }
}

// ============================================
// API LẤY THÔNG TIN USER HIỆN TẠI
// ============================================
async function getCurrentUser() {
    const token = getAuthToken();
    if (!token) return null;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.code === 200 && data.data) {
            return data.data;
        } else {
            clearAuthData();
            return null;
        }
    } catch (error) {
        console.error('Get current user error:', error);
        clearAuthData();
        return null;
    }
}

// ============================================
// ĐĂNG XUẤT
// ============================================
async function logout() {
    const token = getAuthToken();
    
    if (token) {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    clearAuthData();
    showToast('👋 Đã đăng xuất!');
    setTimeout(() => {
        window.location.replace('login.html');
    }, 1000);
}

// ============================================
// KIỂM TRA ĐĂNG NHẬP KHI VÀO TRANG
// ============================================
async function checkExistingLogin() {
    const token = getAuthToken();
    if (!token) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.code === 200 && data.data) {
            window.location.replace('user.html');
        } else {
            clearAuthData();
        }
    } catch (error) {
        console.error('Check login error:', error);
        clearAuthData();
    }
}

// ============================================
// ĐÓNG MODAL QUÊN MẬT KHẨU
// ============================================
function closeForgotModal() {
    const modal = document.getElementById('forgotModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        const input = document.getElementById('forgotIdentifier');
        if (input) input.value = '';
    }
}

// ============================================
// HIỂN THỊ/ẨN MẬT KHẨU
// ============================================
function initTogglePassword() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = btn.querySelector('i');
            
            if (input && input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            } else if (input) {
                input.type = 'password';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        });
    });
}

// ============================================
// MODAL QUÊN MẬT KHẨU
// ============================================
function initForgotModal() {
    const forgotLink = document.getElementById('forgotPasswordLink');
    const modal = document.getElementById('forgotModal');
    const closeBtn = document.getElementById('closeForgotModal');
    const cancelBtn = document.getElementById('cancelForgot');
    const sendBtn = document.getElementById('sendResetLink');
    const overlay = modal?.querySelector('.modal-overlay');
    
    if (forgotLink) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (modal) {
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        });
    }
    
    const closeModal = () => {
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
            const input = document.getElementById('forgotIdentifier');
            if (input) input.value = '';
        }
    };
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);
    if (sendBtn) sendBtn.addEventListener('click', handleForgotPassword);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.classList.contains('show')) {
            closeModal();
        }
    });
}

// ============================================
// SOCIAL LOGIN (Google, Facebook)
// ============================================
function initSocialLogin() {
    const googleBtn = document.getElementById('googleLogin');
    const facebookBtn = document.getElementById('facebookLogin');
    
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            window.location.href = `${API_BASE_URL}/auth/google`;
        });
    }
    
    if (facebookBtn) {
        facebookBtn.addEventListener('click', () => {
            window.location.href = `${API_BASE_URL}/auth/facebook`;
        });
    }
}

// ============================================
// CHUYỂN TAB
// ============================================
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const loginPane = document.getElementById('loginPane');
    const registerPane = document.getElementById('registerPane');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (loginPane) loginPane.classList.remove('active');
            if (registerPane) registerPane.classList.remove('active');
            
            if (tab === 'login' && loginPane) loginPane.classList.add('active');
            if (tab === 'register' && registerPane) registerPane.classList.add('active');
        });
    });
}

// ============================================
// KHỞI CHẠY
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    checkExistingLogin();
    initTabs();
    initTogglePassword();
    initForgotModal();
    initSocialLogin();
    
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
});

// Export cho trang chủ
window.isLoggedIn = isLoggedIn;
window.getAuthToken = getAuthToken;
window.getCurrentUser = getCurrentUser;
window.logout = logout;