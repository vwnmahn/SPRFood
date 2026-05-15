// ============================================
// CẤU HÌNH API BACKEND
// ============================================
const API_BASE_URL = "http://localhost:8080/api";

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

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

// ============================================
// REDIRECT THEO ROLE
// ============================================
function redirectByRole(user) {
    // Lấy role từ nhiều nguồn khác nhau
    let role = '';
    if (user.role) {
        role = user.role;
    } else if (user.roles && user.roles.length > 0) {
        role = user.roles[0];
    } else if (user.authority) {
        role = user.authority;
    }
    
    const roleStr = typeof role === 'string' ? role.toUpperCase() : '';
    console.log("Role của user:", roleStr);
    
    if (roleStr === 'ADMIN' || roleStr === 'ROLE_ADMIN') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'user.html';
    }
}

function isAccountLocked(user) {
    if (!user) return false;
    return user.locked === true || user.status === 'locked' || user.status === 'LOCKED' || user.accountStatus === 'LOCKED' || user.enabled === false;
}

let isLoggingIn = false;
let isRegistering = false;

async function handleRegister(e) {
    e.preventDefault();
    if (isRegistering) return;
    
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
                username, 
                firstName, 
                lastName, 
                email, 
                phoneNumber, 
                address, 
                password, 
                confirmPassword 
            })
        });
        const data = await response.json();
        
        if (response.ok && data.code === 200) {
            showToast('🎉 Đăng ký thành công! Vui lòng đăng nhập');
            document.querySelector('[data-tab="login"]')?.click();
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

async function handleLogin(e) {
    e.preventDefault();
    if (isLoggingIn) return;

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
        // Kiểm tra nếu có thể là admin thì thử cả 2 endpoint
        const isPossibleAdmin = identifier === 'admin' || identifier === 'admin@sprfood.com';
        
        let response;
        let data;
        
        if (isPossibleAdmin) {
            // Thử endpoint admin trước
            console.log("Thử đăng nhập admin...");
            response = await fetch(`${API_BASE_URL}/auth/login/admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });
            data = await response.json();
            
            // Nếu admin thất bại, thử user endpoint
            if (!response.ok) {
                console.log("Admin login failed, trying user login...");
                response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier, password })
                });
                data = await response.json();
            }
        } else {
            // Dùng endpoint user thường
            response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });
            data = await response.json();
        }

        console.log("=== RESPONSE FROM BACKEND ===");
        console.log("Status:", response.status);
        console.log("Data:", data);

        let token = null;
        let user = null;

        // Cấu trúc response: { code, message, data: { token, accountDTO } }
        if (data.code === 200 && data.data) {
            token = data.data.token;
            user = data.data.accountDTO || data.data.user;
            console.log("✅ Lấy token và user từ data.data");
        }
        // Cấu trúc response trực tiếp
        else if (data.token && data.accountDTO) {
            token = data.token;
            user = data.accountDTO;
            console.log("✅ Cấu trúc trực tiếp: token + accountDTO");
        }
        // Cấu trúc có accessToken
        else if (data.accessToken) {
            token = data.accessToken;
            user = data.user;
            console.log("✅ accessToken + user");
        }

        if (response.ok && token && user) {
            const accountLocked = isAccountLocked(user);
            if (accountLocked) {
                console.warn('Tài khoản đang bị khóa:', user);
                showToast('Tài khoản đã bị khóa. Vui lòng liên hệ admin.', 'error');
                return;
            }

            console.log("Token lấy được:", token.substring(0, 50) + "...");
            console.log("User gốc từ API:", user);
            
            // ========== QUAN TRỌNG: GÁN ROLE CHO USER ==========
            // Kiểm tra nếu user chưa có role thì gán mặc định
            let userRole = '';
            let userRoles = [];
            
            // Thử lấy role từ nhiều nguồn
            if (user.role) {
                userRole = user.role;
                userRoles = [user.role];
            } else if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
                userRole = user.roles[0];
                userRoles = user.roles;
            } else if (data.data?.role) {
                userRole = data.data.role;
                userRoles = [data.data.role];
            } else if (data.role) {
                userRole = data.role;
                userRoles = [data.role];
            }
            
            // Nếu vẫn chưa có role, kiểm tra identifier
            if (!userRole) {
                if (identifier === 'admin' || identifier === 'admin@sprfood.com' || user.username === 'admin') {
                    userRole = 'ADMIN';
                    userRoles = ['ROLE_ADMIN', 'ADMIN'];
                    console.log("✅ Gán role ADMIN dựa trên identifier");
                } else {
                    userRole = 'USER';
                    userRoles = ['ROLE_USER', 'USER'];
                    console.log("✅ Gán role USER mặc định");
                }
            }
            
            // Gán lại role cho user object
            user.role = userRole;
            user.roles = userRoles;
            
            console.log("✅ User sau khi gán role:", { username: user.username, role: user.role, roles: user.roles });
            
            // Lưu thông tin
            if (rememberMe) {
                localStorage.setItem('sprfood_token', token);
                localStorage.setItem('sprfood_user', JSON.stringify(user));
            } else {
                sessionStorage.setItem('sprfood_token', token);
                sessionStorage.setItem('sprfood_user', JSON.stringify(user));
            }
            
            console.log("✅ Đã lưu thông tin đăng nhập");
            showToast(`🎉 Chào mừng ${user.username || user.email || user.firstName || 'bạn'} trở lại!`);
            
            setTimeout(() => redirectByRole(user), 800);
        } else {
            const errorMsg = data.message || data.error || 'Sai email/số điện thoại hoặc mật khẩu';
            console.error("Login failed:", errorMsg);
            showToast(errorMsg, 'error');
        }
    } catch (error) {
        console.error("Login error:", error);
        showToast('Lỗi kết nối đến máy chủ', 'error');
    } finally {
        setLoading(submitBtn, false);
        isLoggingIn = false;
    }
}

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
            body: JSON.stringify({ identifier })
        });
        const data = await response.json();
        if (response.ok && data.code === 200) {
            showToast(` Hướng dẫn đã được gửi đến ${identifier}`);
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

function closeForgotModal() {
    const modal = document.getElementById('forgotModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        document.getElementById('forgotIdentifier').value = '';
    }
}

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
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        });
    }
    const closeModal = () => {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        document.getElementById('forgotIdentifier').value = '';
    };
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', closeModal);
    sendBtn?.addEventListener('click', handleForgotPassword);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.classList.contains('show')) closeModal();
    });
}

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

function initSocialLogin() {
    document.getElementById('googleLogin')?.addEventListener('click', () => {
        window.location.href = `${API_BASE_URL}/auth/google`;
    });
    document.getElementById('facebookLogin')?.addEventListener('click', () => {
        window.location.href = `${API_BASE_URL}/auth/facebook`;
    });
}

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const loginPane = document.getElementById('loginPane');
    const registerPane = document.getElementById('registerPane');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loginPane?.classList.remove('active');
            registerPane?.classList.remove('active');
            if (tab === 'login' && loginPane) loginPane.classList.add('active');
            if (tab === 'register' && registerPane) registerPane.classList.add('active');
        });
    });
}

function checkAlreadyLoggedIn() {
    const token = localStorage.getItem('sprfood_token') || sessionStorage.getItem('sprfood_token');
    if (token) {
        console.log("User already logged in, redirecting...");
        const userStr = localStorage.getItem('sprfood_user') || sessionStorage.getItem('sprfood_user');
        const user = userStr ? JSON.parse(userStr) : {};
        redirectByRole(user);
        return true;
    }
    return false;
}

document.addEventListener('DOMContentLoaded', () => {
    if (checkAlreadyLoggedIn()) return;
    
    initTabs();
    initTogglePassword();
    initForgotModal();
    initSocialLogin();
    
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
});