// assets/script.js

const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbyNZD5MEluEvV0yNcc-U8aS77ouR62QlmXqSWZKEZXK9OM8rAQeaT8aMVK-7q7q3ZzC/exec'
};

let deviceId = localStorage.getItem('bhyt_deviceId');
if (!deviceId) {
  deviceId = self.crypto.randomUUID ? self.crypto.randomUUID() : 'dev-' + Date.now() + Math.random().toString(36).substring(2);
  localStorage.setItem('bhyt_deviceId', deviceId);
}

let currentEmail = '';
let tempRegEmail = ''; // For the new registration flow
let authModalInstance;
let changePasswordModalInstance;
let otpTimerInterval;

function showAuthForm(formId) {
    const modalTitle = document.getElementById('authModalLabel');
    document.querySelectorAll('#authModal .modal-body > div').forEach(form => {
        form.classList.add('hidden');
    });
    document.getElementById(formId).classList.remove('hidden');

    if (formId === 'loginForm') modalTitle.textContent = 'Đăng nhập';
    else if (formId === 'registerForm') modalTitle.textContent = 'Đăng ký';
    else if (formId === 'registerOtpForm') modalTitle.textContent = 'Xác thực đăng ký';
    else if (formId === 'forgotForm') modalTitle.textContent = 'Quên mật khẩu';
    else if (formId === 'resetForm') modalTitle.textContent = 'Đặt lại mật khẩu';
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
    
    const body = `action=registerAndRequestOtp&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    try {
        const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body });
        const data = await res.json();
        if (data.success) {
            tempRegEmail = email; // Store email for the next step
            document.getElementById('registerOtpEmailDisplay').textContent = email;
            showAuthForm('registerOtpForm');
        } else {
            registerMessage.innerText = data.error || 'Yêu cầu đăng ký thất bại.';
        }
    } catch (error) {
        console.error("Registration request error:", error);
        registerMessage.innerText = 'Lỗi kết nối. Vui lòng thử lại.';
    }
}

async function handleCompleteRegistration() {
    const otp = document.getElementById('registerOtpCode').value.trim();
    const messageEl = document.getElementById('registerOtpMessage');
    messageEl.innerText = '';

    if (!otp) {
        messageEl.innerText = 'Vui lòng nhập mã OTP.';
        return;
    }

    const body = `action=verifyRegistrationOtp&email=${encodeURIComponent(tempRegEmail)}&otp=${encodeURIComponent(otp)}`;
    try {
        const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
        const data = await res.json();
        if (data.success) {
            alert(data.message || 'Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.');
            showAuthForm('loginForm');
        } else {
            messageEl.innerText = data.error || 'Xác thực thất bại.';
        }
    } catch (error) {
        console.error("Registration completion error:", error);
        messageEl.innerText = 'Lỗi kết nối. Vui lòng thử lại.';
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

    updateTimer(); // Initial call
    otpTimerInterval = setInterval(updateTimer, 1000);
}

async function handleForgot(isResend = false) {
    const emailInput = document.getElementById('forgotEmail');
    const messageContainer = isResend ? document.getElementById('resetMessage') : document.getElementById('forgotMessage');

    // Clear previous messages
    document.getElementById('forgotMessage').innerText = '';
    document.getElementById('resetMessage').innerText = '';

    const email = isResend ? currentEmail : emailInput.value.trim();

    if (!email) {
        messageContainer.innerText = 'Vui lòng nhập email.';
        messageContainer.className = 'mt-3 text-danger';
        return;
    }

    if (!isResend) {
        currentEmail = email;
    }

    if (isResend) {
        document.getElementById('resendOtpContainer').innerHTML = `<span>Đang gửi...</span>`;
    } else {
        messageContainer.innerText = 'Đang gửi...';
        messageContainer.className = 'mt-3 text-muted';
    }

    const body = `action=requestPasswordOtp&email=${encodeURIComponent(email)}`;
    try {
        const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
        const data = await res.json();

        if (data.success) {
            if (!isResend) {
                document.getElementById('resetEmailDisplay').textContent = email;
                showAuthForm('resetForm');
            }
            // Show success message in the reset form's message area
            const resetMsgEl = document.getElementById('resetMessage');
            resetMsgEl.innerText = data.message;
            resetMsgEl.className = 'mt-3 text-success';

            startOtpCountdown();
        } else {
            // Show error in the appropriate message area
            messageContainer.className = 'mt-3 text-danger';
            messageContainer.innerText = data.error;
            // If it was a resend attempt, restore the resend link
            if (isResend) {
                document.getElementById('resendOtpContainer').innerHTML = `<a href="#" onclick="event.preventDefault(); handleForgot(true);">Gửi lại mã OTP</a>`;
            }
        }
    } catch (error) {
        console.error("Forgot password error:", error);
        messageContainer.innerText = 'Lỗi kết nối. Vui lòng thử lại.';
        messageContainer.className = 'mt-3 text-danger';
        if (isResend) {
             document.getElementById('resendOtpContainer').innerHTML = `<a href="#" onclick="event.preventDefault(); handleForgot(true);">Gửi lại mã OTP</a>`;
        }
    }
}


async function handleResetPassword() {
    const otp = document.getElementById('otpCode').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const resetMessage = document.getElementById('resetMessage');
    resetMessage.innerText = '';
    if (!otp || !newPassword) { resetMessage.innerText = 'Vui lòng nhập OTP và mật khẩu mới.'; return; }
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) { resetMessage.innerText = 'Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm ít nhất 1 chữ hoa và 1 chữ số.'; return; }
    
    const body = `action=verifyOtpAndResetPassword&email=${encodeURIComponent(currentEmail)}&otp=${encodeURIComponent(otp)}&newPassword=${encodeURIComponent(newPassword)}`;
    try {
        const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body });
        const data = await res.json();
        if (data.success) {
            alert(data.message || 'Đặt lại mật khẩu thành công!');
            showAuthForm('loginForm');
        } else {
            resetMessage.innerText = data.error || data.message;
        }
    } catch (error) {
        console.error("Reset password error:", error);
        resetMessage.innerText = 'Lỗi kết nối. Vui lòng thử lại.';
    }
}

async function handleChangePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('changeNewPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    const messageEl = document.getElementById('changePasswordMessage');
    messageEl.textContent = '';
    messageEl.className = 'mt-3';

    if (!currentPassword || !newPassword || !confirmPassword) {
        messageEl.textContent = 'Vui lòng điền đầy đủ các trường.';
        messageEl.classList.add('text-danger');
        return;
    }

    if (newPassword !== confirmPassword) {
        messageEl.textContent = 'Mật khẩu mới không khớp.';
        messageEl.classList.add('text-danger');
        return;
    }

    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
        messageEl.textContent = 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm ít nhất 1 chữ hoa và 1 chữ số.';
        messageEl.classList.add('text-danger');
        return;
    }

    const user = JSON.parse(localStorage.getItem('bhyt_user') || '{}');
    if (!user.sessionId) {
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        logout();
        return;
    }

    const body = `action=changePassword&sessionId=${encodeURIComponent(user.sessionId)}&currentPassword=${encodeURIComponent(currentPassword)}&newPassword=${encodeURIComponent(newPassword)}`;

    try {
        const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
        const data = await res.json();

        if (data.success) {
            messageEl.textContent = data.message;
            messageEl.classList.add('text-success');
            setTimeout(() => {
                changePasswordModalInstance.hide();
                // Clear fields after closing
                document.getElementById('currentPassword').value = '';
                document.getElementById('changeNewPassword').value = '';
                document.getElementById('confirmNewPassword').value = '';
                messageEl.textContent = '';
            }, 2000);
        } else {
            messageEl.textContent = data.error || 'Đã xảy ra lỗi.';
            messageEl.classList.add('text-danger');
        }
    } catch (error) {
        console.error('Change password error:', error);
        messageEl.textContent = 'Lỗi kết nối. Vui lòng thử lại.';
        messageEl.classList.add('text-danger');
    }
}

function logout() {
  const user = JSON.parse(localStorage.getItem('bhyt_user') || '{}');
  if (user.sessionId) {
    const body = `action=logout&sessionId=${encodeURIComponent(user.sessionId)}`;
    try {
      fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body, keepalive: true });
    } catch (error) {
      console.error("Error during server-side logout call:", error);
    }
  }
  localStorage.removeItem('bhyt_user');
  window.location.reload();
}

function initApp() {
    const user = JSON.parse(localStorage.getItem('bhyt_user') || '{}');
    const userActions = document.getElementById('userActions');

    if (user && user.sessionId) {
        // Logged In State
        const greeting = `Xin chào, ${user.email}`;
        
        userActions.innerHTML = `<div class="dropdown">
                                  <button class="btn btn-outline-secondary dropdown-toggle btn-sm" type="button" id="userMenuButton" data-bs-toggle="dropdown" aria-expanded="false" title="${greeting}">
                                    ${greeting}
                                  </button>
                                  <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userMenuButton">
                                    <li><a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#changePasswordModal">Đổi mật khẩu</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item" href="#" onclick="logout()">Đăng xuất</a></li>
                                  </ul>
                                </div>`;
    } else {
        // Logged Out State
        userActions.innerHTML = `<button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#authModal">Đăng nhập / Đăng ký</button>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
  // Init Auth Modals
  authModalInstance = new bootstrap.Modal(document.getElementById('authModal'));
  changePasswordModalInstance = new bootstrap.Modal(document.getElementById('changePasswordModal'));

  // Login on Enter key press in the password field
  const loginPasswordField = document.getElementById('loginPassword');
  if (loginPasswordField) {
    loginPasswordField.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent any default action
            handleLogin();
        }
    });
  }
  
  // Initialize main app logic
  initApp();

  // Auto-hide mobile navbar on menu item click
  const navLinks = document.querySelectorAll('#navbarContent .nav-link');
  const navbarContent = document.getElementById('navbarContent');
  
  if (navbarContent) {
    const bsCollapse = bootstrap.Collapse.getOrCreateInstance(navbarContent);
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        // If the collapsible menu is currently shown, hide it.
        // This is primarily for mobile view where the menu is toggled.
        if (navbarContent.classList.contains('show')) {
          bsCollapse.hide();
        }
      });
    });
  }
});
