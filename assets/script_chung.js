

// assets/script_chung.js

const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbyNZD5MEluEvV0yNcc-U8aS77ouR62QlmXqSWZKEZXK9OM8rAQeaT8aMVK-7q7q3ZzC/exec'
};

let deviceId = localStorage.getItem('bhyt_deviceId');
if (!deviceId) {
  deviceId = self.crypto.randomUUID ? self.crypto.randomUUID() : 'dev-' + Date.now() + Math.random().toString(36).substring(2);
  localStorage.setItem('bhyt_deviceId', deviceId);
}

let currentEmail = '';
let tempRegEmail = ''; 
let authModalInstance;
let changePasswordModalInstance;
let otpTimerInterval;

// --- VIEW NAVIGATION (SPA) ---
function switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('d-none'));
    
    // Show active view
    const activeView = document.getElementById(`view-${viewName}`);
    if (activeView) {
        activeView.classList.remove('d-none');
    }
    
    // Update active nav state
    document.querySelectorAll('#mainNavItems .nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.view === viewName) {
            link.classList.add('active');
        }
    });

    // Close mobile menu if open
    const navbarContent = document.getElementById('navbarContent');
    if (navbarContent && navbarContent.classList.contains('show')) {
        bootstrap.Collapse.getOrCreateInstance(navbarContent).hide();
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// --- AUTH LOGIC ---
function showAuthForm(formId) {
    const forms = document.querySelectorAll('#authModalBody .auth-form-container');
    forms.forEach(form => form.classList.add('d-none'));

    const modalTitle = document.getElementById('authModalLabel');
    modalTitle.textContent = 'Tài khoản';

    const authTabNav = document.getElementById('authTabNav');
    document.querySelectorAll('.text-danger').forEach(el => el.innerText = '');

    if (formId === 'loginForm' || formId === 'registerForm') {
        authTabNav.classList.remove('d-none');
        document.getElementById(formId).classList.remove('d-none');
        
        document.querySelectorAll('#authTabNav .nav-link').forEach(btn => btn.classList.remove('active'));
        if (formId === 'loginForm') {
            document.getElementById('tab-login-btn').classList.add('active');
            modalTitle.textContent = 'Chào mừng trở lại';
        } else {
            document.getElementById('tab-register-btn').classList.add('active');
            modalTitle.textContent = 'Tạo tài khoản mới';
        }
    } else {
        authTabNav.classList.add('d-none');
        document.getElementById(formId).classList.remove('d-none');

        if (formId === 'registerOtpForm') modalTitle.textContent = 'Xác thực đăng ký';
        else if (formId === 'forgotForm') modalTitle.textContent = 'Quên mật khẩu';
        else if (formId === 'resetForm') modalTitle.textContent = 'Đặt lại mật khẩu';
    }
}

async function handleLogin() {
  let email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const loginMessage = document.getElementById('loginMessage');
  loginMessage.innerText = '';

  if (email && !email.includes('@')) {
    email += '@gmail.com';
  }

  if (!email || !password) {
    loginMessage.innerText = 'Vui lòng nhập email và mật khẩu.';
    return;
  }
  
  const loginBtn = document.querySelector('#loginForm button');
  const originalBtnText = loginBtn.innerHTML;
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang xử lý...';

  const body = `action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;

  try {
    const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('bhyt_user', JSON.stringify(data.data));
      authModalInstance.hide();
      window.location.reload();
    } else {
      loginMessage.innerText = data.error || 'Đăng nhập thất bại.';
    }
  } catch (error) {
    console.error("Login error:", error);
    loginMessage.innerText = 'Lỗi kết nối. Vui lòng thử lại.';
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = originalBtnText;
  }
}

async function handleRegistrationRequest() {
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const passwordConfirm = document.getElementById('regPasswordConfirm').value.trim();
    const registerMessage = document.getElementById('registerMessage');
    registerMessage.innerText = '';

    if (!email || !password || !passwordConfirm) { registerMessage.innerText = 'Vui lòng điền đầy đủ thông tin.'; return; }
    if (password !== passwordConfirm) { registerMessage.innerText = 'Mật khẩu xác nhận không khớp.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { registerMessage.innerText = 'Định dạng email không hợp lệ.'; return; }
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) { registerMessage.innerText = 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm ít nhất 1 chữ hoa và 1 chữ số.'; return; }
    
    const regBtn = document.querySelector('#registerForm button');
    const originalBtnText = regBtn.innerHTML;
    regBtn.disabled = true;
    regBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang xử lý...';

    const body = `action=registerAndRequestOtp&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    try {
        const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body });
        const data = await res.json();
        if (data.success) {
            tempRegEmail = email; 
            document.getElementById('registerOtpEmailDisplay').textContent = email;
            showAuthForm('registerOtpForm');
        } else {
            registerMessage.innerText = data.error || 'Yêu cầu đăng ký thất bại.';
        }
    } catch (error) {
        registerMessage.innerText = 'Lỗi kết nối. Vui lòng thử lại.';
    } finally {
        regBtn.disabled = false;
        regBtn.innerHTML = originalBtnText;
    }
}

async function handleCompleteRegistration() {
    const otp = document.getElementById('registerOtpCode').value.trim();
    const messageEl = document.getElementById('registerOtpMessage');
    messageEl.innerText = '';
    if (!otp) { messageEl.innerText = 'Vui lòng nhập mã OTP.'; return; }

    const body = `action=verifyRegistrationOtp&email=${encodeURIComponent(tempRegEmail)}&otp=${encodeURIComponent(otp)}`;
    try {
        const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
        const data = await res.json();
        if (data.success) {
            alert(data.message || 'Đăng ký thành công!');
            showAuthForm('loginForm');
        } else {
            messageEl.innerText = data.error || 'Xác thực thất bại.';
        }
    } catch (error) {
        messageEl.innerText = 'Lỗi kết nối.';
    }
}

function startOtpCountdown(duration = 60) {
    if (otpTimerInterval) clearInterval(otpTimerInterval);
    const container = document.getElementById('resendOtpContainer');
    let timer = duration;
    const updateTimer = () => {
        if (timer > 0) {
            container.innerHTML = `<span>Gửi lại mã sau ${timer}s</span>`;
            timer--;
        } else {
            clearInterval(otpTimerInterval);
            container.innerHTML = `<a href="#" onclick="event.preventDefault(); handleForgot(true);">Gửi lại mã OTP</a>`;
        }
    };
    updateTimer();
    otpTimerInterval = setInterval(updateTimer, 1000);
}

async function handleForgot(isResend = false) {
    const emailInput = document.getElementById('forgotEmail');
    const messageContainer = isResend ? document.getElementById('resetMessage') : document.getElementById('forgotMessage');
    document.getElementById('forgotMessage').innerText = '';
    document.getElementById('resetMessage').innerText = '';

    const email = isResend ? currentEmail : emailInput.value.trim();
    if (!email) { messageContainer.innerText = 'Vui lòng nhập email.'; return; }
    if (!isResend) currentEmail = email;

    if (isResend) document.getElementById('resendOtpContainer').innerHTML = `<span>Đang gửi...</span>`;
    else messageContainer.innerText = 'Đang gửi...';

    const body = `action=requestPasswordOtp&email=${encodeURIComponent(email)}`;
    try {
        const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
        const data = await res.json();
        if (data.success) {
            if (!isResend) {
                document.getElementById('resetEmailDisplay').textContent = email;
                showAuthForm('resetForm');
            }
            const resetMsgEl = document.getElementById('resetMessage');
            resetMsgEl.innerText = data.message;
            resetMsgEl.className = 'mt-3 text-success';
            startOtpCountdown();
        } else {
            messageContainer.className = 'mt-3 text-danger';
            messageContainer.innerText = data.error;
            if (isResend) document.getElementById('resendOtpContainer').innerHTML = `<a href="#" onclick="event.preventDefault(); handleForgot(true);">Gửi lại mã OTP</a>`;
        }
    } catch (error) {
        messageContainer.innerText = 'Lỗi kết nối.';
        if (isResend) document.getElementById('resendOtpContainer').innerHTML = `<a href="#" onclick="event.preventDefault(); handleForgot(true);">Gửi lại mã OTP</a>`;
    }
}

async function handleResetPassword() {
    const otp = document.getElementById('otpCode').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const resetMessage = document.getElementById('resetMessage');
    if (!otp || !newPassword) { resetMessage.innerText = 'Vui lòng nhập OTP và mật khẩu mới.'; return; }
    
    const body = `action=verifyOtpAndResetPassword&email=${encodeURIComponent(currentEmail)}&otp=${encodeURIComponent(otp)}&newPassword=${encodeURIComponent(newPassword)}`;
    try {
        const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body });
        const data = await res.json();
        if (data.success) {
            alert(data.message || 'Đặt lại mật khẩu thành công!');
            showAuthForm('loginForm');
        } else {
            resetMessage.innerText = data.error;
        }
    } catch (error) {
        resetMessage.innerText = 'Lỗi kết nối.';
    }
}

async function handleChangePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('changeNewPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    const messageEl = document.getElementById('changePasswordMessage');
    
    if (!currentPassword || !newPassword || !confirmPassword) { messageEl.textContent = 'Vui lòng điền đầy đủ.'; return; }
    if (newPassword !== confirmPassword) { messageEl.textContent = 'Mật khẩu không khớp.'; return; }
    
    const user = JSON.parse(localStorage.getItem('bhyt_user') || '{}');
    const body = `action=changePassword&sessionId=${encodeURIComponent(user.sessionId)}&currentPassword=${encodeURIComponent(currentPassword)}&newPassword=${encodeURIComponent(newPassword)}`;
    try {
        const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
        const data = await res.json();
        if (data.success) {
            messageEl.textContent = data.message;
            messageEl.classList.add('text-success');
            setTimeout(() => { changePasswordModalInstance.hide(); messageEl.textContent = ''; }, 2000);
        } else {
            messageEl.textContent = data.error || 'Lỗi.';
        }
    } catch (error) {
        messageEl.textContent = 'Lỗi kết nối.';
    }
}

function logout() {
  const user = JSON.parse(localStorage.getItem('bhyt_user') || '{}');
  if (user.sessionId) {
    const body = `action=logout&sessionId=${encodeURIComponent(user.sessionId)}`;
    fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body, keepalive: true }).catch(console.error);
  }
  localStorage.removeItem('bhyt_user');
  window.location.reload();
}

function initApp() {
    const user = JSON.parse(localStorage.getItem('bhyt_user') || '{}');
    const userActions = document.getElementById('userActions');
    const navTracuu = document.getElementById('nav-tracuu');

    if (user && user.sessionId) {
        const greeting = `Xin chào, ${user.email}`;
        userActions.innerHTML = `<div class="dropdown">
                                  <button class="btn btn-outline-secondary dropdown-toggle btn-sm" type="button" id="userMenuButton" data-bs-toggle="dropdown" aria-expanded="false" title="${greeting}">
                                    <i class="bi bi-person-circle me-1"></i> ${greeting}
                                  </button>
                                  <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userMenuButton">
                                    <li><a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#changePasswordModal">Đổi mật khẩu</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger" href="#" onclick="logout()">Đăng xuất</a></li>
                                  </ul>
                                </div>`;
        
        // Kiểm tra quyền tra cứu
        const allowedRoles = ['Cộng tác viên', 'Tra cứu', 'Quản trị'];
        if (user.role && allowedRoles.includes(user.role)) {
            if (navTracuu) navTracuu.classList.remove('d-none');
        } else {
            if (navTracuu) navTracuu.classList.add('d-none');
        }

    } else {
        userActions.innerHTML = `<button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#authModal">Đăng nhập / Đăng ký</button>`;
        if (navTracuu) navTracuu.classList.add('d-none');
    }
}

document.addEventListener('DOMContentLoaded', () => {
  authModalInstance = new bootstrap.Modal(document.getElementById('authModal'));
  changePasswordModalInstance = new bootstrap.Modal(document.getElementById('changePasswordModal'));
  
  initApp();

  const loginPasswordField = document.getElementById('loginPassword');
  if (loginPasswordField) {
    loginPasswordField.addEventListener('keyup', (event) => { if (event.key === 'Enter') handleLogin(); });
  }
});
