// script.js

const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwupeI_-uhLqsnv1HiHAnQvjEojHpXra-tZoxJt_Md8-WesJxz8Eif3Vz9WpmOv3sXs/exec'
};

let deviceId = localStorage.getItem('bhyt_deviceId');
if (!deviceId) {
  deviceId = self.crypto.randomUUID ? self.crypto.randomUUID() : 'dev-' + Date.now() + Math.random().toString(36).substring(2);
  localStorage.setItem('bhyt_deviceId', deviceId);
}

let currentEmail = '';
let tempLoginCredentials = {};
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
    else if (formId === 'forgotForm') modalTitle.textContent = 'Quên mật khẩu';
    else if (formId === 'resetForm') modalTitle.textContent = 'Đặt lại mật khẩu';
    else if (formId === 'deviceOtpForm') modalTitle.textContent = 'Xác thực thiết bị';
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
  tempLoginCredentials = { email, password };
  const body = `action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&deviceId=${encodeURIComponent(deviceId)}`;

  try {
    const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('bhyt_user', JSON.stringify(data.data));
      authModalInstance.hide();
      window.location.reload();
    } else if (data.requireOtp) {
      const deviceOtpMessage = document.getElementById('deviceOtpMessage');
      deviceOtpMessage.className = 'mt-3 text-info';
      deviceOtpMessage.innerText = data.message;
      currentEmail = email;
      showAuthForm('deviceOtpForm');
    } else {
      loginMessage.innerText = data.error || 'Đăng nhập thất bại.';
    }
  } catch (error) {
    console.error("Login error:", error);
    loginMessage.innerText = 'Lỗi kết nối. Vui lòng thử lại.';
  }
}

async function handleRegister() {
    const email = document.getElementById('regEmail').value.trim();
    const fullName = document.getElementById('regName').value.trim();
    const cccd = document.getElementById('regCCCD').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const registerMessage = document.getElementById('registerMessage');
    registerMessage.innerText = '';

    if (!email || !fullName || !cccd || !password) { registerMessage.innerText = 'Vui lòng điền đầy đủ thông tin.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { registerMessage.innerText = 'Định dạng email không hợp lệ.'; return; }
    if (!/^\d{12}$/.test(cccd)) { registerMessage.innerText = 'Số CCCD phải là 12 ký tự số.'; return; }
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) { registerMessage.innerText = 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm ít nhất 1 chữ hoa và 1 chữ số.'; return; }

    const body = `action=signup&email=${encodeURIComponent(email)}&fullName=${encodeURIComponent(fullName)}&cccd=${encodeURIComponent(cccd)}&password=${encodeURIComponent(password)}`;
    try {
        const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body });
        const data = await res.json();
        if (data.success) {
            alert(data.message || 'Đăng ký thành công! Tài khoản của bạn đang chờ phê duyệt.');
            showAuthForm('loginForm');
        } else {
            registerMessage.innerText = data.error || 'Đăng ký thất bại.';
        }
    } catch (error) {
        console.error("Registration error:", error);
        registerMessage.innerText = 'Lỗi kết nối. Vui lòng thử lại.';
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
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) { resetMessage.innerText = 'Mật khẩu mới phải có ít nhất 1 chữ hoa và 1 chữ số.'; return; }
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

async function handleDeviceVerification() {
    const otp = document.getElementById('deviceOtpCode').value.trim();
    const deviceOtpMessage = document.getElementById('deviceOtpMessage');
    deviceOtpMessage.innerText = '';
    if (!otp) { deviceOtpMessage.innerText = 'Vui lòng nhập mã OTP.'; return; }
    if (!tempLoginCredentials.email) { deviceOtpMessage.innerText = 'Phiên làm việc đã hết hạn. Vui lòng quay lại và đăng nhập.'; return; }
    const deviceName = navigator.userAgent;
    const body = `action=verifyDeviceAndLogin&email=${encodeURIComponent(tempLoginCredentials.email)}&password=${encodeURIComponent(tempLoginCredentials.password)}&otp=${encodeURIComponent(otp)}&deviceId=${encodeURIComponent(deviceId)}&deviceName=${encodeURIComponent(deviceName)}`;
    try {
        const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('bhyt_user', JSON.stringify(data.data));
            authModalInstance.hide();
            window.location.reload();
        } else {
            deviceOtpMessage.className = 'mt-3 text-danger';
            deviceOtpMessage.innerText = data.error || 'Xác thực thất bại.';
        }
    } catch (error) {
        console.error("Device verification error:", error);
        deviceOtpMessage.innerText = 'Lỗi kết nối. Vui lòng thử lại.';
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
        messageEl.textContent = 'Mật khẩu mới phải có ít nhất 1 chữ hoa và 1 chữ số.';
        messageEl.classList.add('text-danger');
        return;
    }

    const user = JSON.parse(localStorage.getItem('bhyt_user') || '{}');
    if (!user.sessionId) {
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
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

function exportToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Lỗi: Thư viện xuất Excel (SheetJS) chưa được tải. Vui lòng kiểm tra kết nối mạng và thử lại.');
    return;
  }

  const tableBody = document.getElementById('dataBody');
  const visibleRows = Array.from(tableBody.rows).filter(row => row.style.display !== 'none');

  if (visibleRows.length === 0) {
    alert('Không có dữ liệu để xuất. Vui lòng tải và lọc dữ liệu trước.');
    return;
  }

  const headerRow = document.querySelector('#bhyt-tab-pane thead tr:first-child');
  const headers = Array.from(headerRow.cells).map(th => th.textContent.trim());

  const data = visibleRows.map(row =>
    Array.from(row.cells).map(td => {
        const text = td.textContent.trim();
        // Cố gắng chuyển đổi các chuỗi số thành kiểu số để Excel định dạng tốt hơn
        if (/^-?\d+(\.\d+)?$/.test(text) && !text.includes('/')) {
            return Number(text);
        }
        return text;
    })
  );

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Tự động điều chỉnh độ rộng cột
  const cols = headers.map((header, index) => {
    let maxLength = header.length;
    data.forEach(row => {
      const cellContent = row[index];
      if (cellContent != null) {
        const len = cellContent.toString().length;
        if (len > maxLength) {
          maxLength = len;
        }
      }
    });
    return { wch: maxLength + 2 }; // Thêm một chút khoảng đệm
  });
  worksheet['!cols'] = cols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách BHYT');

  const today = new Date();
  const dateString = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
  XLSX.writeFile(workbook, `BHYT_den_han_${dateString}.xlsx`);
}

// --- Main page logic ---
const notificationLoadingElement = document.getElementById('notificationLoading');
const notificationContentElement = document.getElementById('notificationContent');
const monthSelectElement = document.getElementById('monthSelect');
let bhytDataLoaded = false;

async function loadNotification() {
  notificationContentElement.innerHTML = '';
  notificationLoadingElement.style.display = 'block';
  notificationLoadingElement.innerHTML = 'Đang tải thông báo...';
  const formBody = `action=fetchNotificationContent`;
  try {
    const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody });
    const data = await res.json();
    if (data.success && data.url) {
      const iframe = document.createElement('iframe');
      const url = new URL(data.url);
      url.searchParams.set('embedded', 'true');
      iframe.src = url.toString();
      iframe.style.width = '100%';
      iframe.style.height = '75vh';
      iframe.style.border = 'none';
      iframe.title = 'Thông báo từ quản trị viên';
      iframe.onload = () => { notificationLoadingElement.style.display = 'none'; };
      notificationContentElement.appendChild(iframe);
    } else {
      notificationLoadingElement.innerHTML = `<p class="text-danger">${data.error || 'Lỗi không xác định.'}</p>`;
    }
  } catch (err) {
    console.error('Error fetching notification content:', err);
    notificationLoadingElement.innerHTML = `<p class="text-danger">Lỗi hệ thống khi tải thông báo.</p>`;
  }
}

// --- BHYT Filtering Logic ---
function parseDateDDMMYYYY(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;
  const parts = dateString.trim().split('/');
  if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1000) {
          const date = new Date(year, month, day);
          // Check if it's a valid date (e.g., handles 31/02/2023)
          if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
              return date;
          }
      }
  }
  return null;
}

function applyFilters() {
  const filters = {
      hanThe: document.getElementById('filterHanThe').value.trim(),
      hoTen: document.getElementById('filterHoTen').value.trim().toLowerCase(),
      gioiTinh: document.getElementById('filterGioiTinh').value,
      ngaySinh: document.getElementById('filterNgaySinh').value.trim(),
      soDienThoai: document.getElementById('filterSoDienThoai').value.trim(),
      diaChi: document.getElementById('filterDiaChi').value.trim().toLowerCase(),
      maPb: document.getElementById('filterMaPb').value.trim().toLowerCase(),
      cmnd: document.getElementById('filterCmnd').value.trim(),
      maBv: document.getElementById('filterMaBv').value.trim().toLowerCase(),
      soKcb: document.getElementById('filterSoKcb').value.trim(),
      maDvi: document.getElementById('filterMaDvi').value.trim().toLowerCase()
  };

  const tableBody = document.getElementById('dataBody');
  if (!tableBody) return;

  for (const row of tableBody.rows) {
      const cells = row.cells;
      let visible = true;

      // Text filters
      if (filters.hoTen && !cells[1].textContent.toLowerCase().includes(filters.hoTen)) visible = false;
      if (filters.soDienThoai && !cells[4].textContent.includes(filters.soDienThoai)) visible = false;
      if (filters.diaChi && !cells[5].textContent.toLowerCase().includes(filters.diaChi)) visible = false;
      if (filters.maPb && !cells[6].textContent.toLowerCase().includes(filters.maPb)) visible = false;
      if (filters.cmnd && !cells[7].textContent.includes(filters.cmnd)) visible = false;
      if (filters.maBv && !cells[8].textContent.toLowerCase().includes(filters.maBv)) visible = false;
      if (filters.soKcb && !cells[9].textContent.includes(filters.soKcb)) visible = false;
      if (filters.maDvi && !cells[10].textContent.toLowerCase().includes(filters.maDvi)) visible = false;

      // Select filter
      if (filters.gioiTinh && cells[2].textContent !== filters.gioiTinh) visible = false;

      // Date filters (Hạn thẻ đến - col 0 & Ngày sinh - col 3)
      [
          { filter: filters.hanThe, cell: cells[0] },
          { filter: filters.ngaySinh, cell: cells[3] }
      ].forEach(dateFilter => {
          if (dateFilter.filter && visible) { // only process if still visible
              const cellDateText = dateFilter.cell.textContent;
              const cellDate = parseDateDDMMYYYY(cellDateText);
              let operator = '';
              let filterDateText = dateFilter.filter;

              if (filterDateText.startsWith('>=')) {
                  operator = '>=';
                  filterDateText = filterDateText.substring(2).trim();
              } else if (filterDateText.startsWith('<=')) {
                  operator = '<=';
                  filterDateText = filterDateText.substring(2).trim();
              } else if (filterDateText.startsWith('>')) {
                  operator = '>';
                  filterDateText = filterDateText.substring(1).trim();
              } else if (filterDateText.startsWith('<')) {
                  operator = '<';
                  filterDateText = filterDateText.substring(1).trim();
              } else if (filterDateText.startsWith('=')) {
                  operator = '=';
                  filterDateText = filterDateText.substring(1).trim();
              }

              const filterDate = parseDateDDMMYYYY(filterDateText);

              if (filterDate && cellDate) {
                  const cellTime = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate()).getTime();
                  const filterTime = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate()).getTime();
                  switch (operator) {
                      case '>=': if (!(cellTime >= filterTime)) visible = false; break;
                      case '<=': if (!(cellTime <= filterTime)) visible = false; break;
                      case '>':  if (!(cellTime > filterTime)) visible = false; break;
                      case '<': if (!(cellTime < filterTime)) visible = false; break;
                      case '=': if (cellTime !== filterTime) visible = false; break;
                      default: // if no operator, check if it contains
                         if (!cellDateText.includes(dateFilter.filter)) visible = false;
                  }
              } else { // If parsing fails, do a "contains" search
                  if (!cellDateText.includes(dateFilter.filter)) visible = false;
              }
          }
      });
      row.style.display = visible ? '' : 'none';
  }
}

function clearAllFilters() {
  const filterRow = document.querySelector('.filter-row');
  if (filterRow) {
      filterRow.querySelectorAll('input, select').forEach(input => {
          if(input.tagName === 'SELECT') {
              input.selectedIndex = 0;
          } else {
              input.value = "";
          }
      });
  }
  applyFilters();
}
// --- End of Filtering Logic ---

async function loadData(type) {
  document.getElementById('loading').innerText = 'Đang tải dữ liệu...';
  document.getElementById('dataBody').innerHTML = '';
  const user = JSON.parse(localStorage.getItem('bhyt_user') || '{}');
  if (!user.sessionId) { logout(); return; }

  const payload = { action: 'fetchBHYTData', filterType: type, sessionId: user.sessionId };
  if (type === 'byMonth') {
    const selectedValue = monthSelectElement.value;
    if (!selectedValue) {
        document.getElementById('loading').innerText = '';
        document.getElementById('dataBody').innerHTML = '<tr><td colspan="11">Vui lòng chọn một tháng.</td></tr>';
        return;
    }
    const [month, year] = selectedValue.split('/');
    payload.month = month;
    payload.year = year;
  }
  const formBody = Object.entries(payload).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  try {
    const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody });
    const data = await res.json();
    if (data.success) {
      bhytDataLoaded = true;
      const rows = data.data.map(row => `
        <tr>
          <td>${row.hanTheDen||''}</td><td>${row.hoTen||''}</td><td>${row.gioiTinh||''}</td><td>${row.ngaySinh||''}</td><td>${row.soDienThoai||''}</td><td>${row.diaChiLh||''}</td><td>${row.maPb||''}</td><td>${row.soCmnd||''}</td><td>${row.maBv||''}</td><td>${row.soKcb||''}</td><td>${row.maDvi||''}</td>
        </tr>`).join('');
      document.getElementById('dataBody').innerHTML = rows || '<tr><td colspan="11">Không có dữ liệu</td></tr>';
      // Apply filters to the newly loaded data
      applyFilters();
    } else {
       if (data.error && (data.error.includes('hết hạn') || data.error.includes('không hợp lệ'))) {
          alert(data.error + " Vui lòng đăng nhập lại."); logout();
       } else {
          document.getElementById('dataBody').innerHTML = `<tr><td colspan="11">${data.error || 'Lỗi không xác định.'}</td></tr>`;
       }
    }
  } catch (err) {
    console.error('Error fetching BHYT data:', err);
    document.getElementById('dataBody').innerHTML = `<tr><td colspan="11">Lỗi hệ thống khi tải dữ liệu.</td></tr>`;
  }
  document.getElementById('loading').innerText = '';
}

function initApp() {
    const user = JSON.parse(localStorage.getItem('bhyt_user') || '{}');
    const userActions = document.getElementById('userActions');

    if (user && user.sessionId) {
        // Logged In State
        userActions.innerHTML = `<div class="dropdown">
                                  <button class="btn btn-outline-secondary dropdown-toggle btn-sm" type="button" id="userMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
                                    Xin chào, ${user.fullName}
                                  </button>
                                  <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userMenuButton">
                                    <li><a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#changePasswordModal">Đổi mật khẩu</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item" href="#" onclick="logout()">Đăng xuất</a></li>
                                  </ul>
                                </div>`;

        document.getElementById('home-tab-li').style.display = 'block';
        document.getElementById('bhyt-tab-li').style.display = 'block';

        // Switch to home tab
        const homeTabEl = document.getElementById('home-tab');
        const qrcodeTabEl = document.getElementById('qrcode-tab');
        new bootstrap.Tab(homeTabEl).show();

        // Populate month/year dropdown
        const today = new Date();
        const currentYear = today.getFullYear();
        for (let yOffset = 0; yOffset <= 1; yOffset++) {
            const yearToDisplay = currentYear + yOffset;
            for (let m = 1; m <= 12; m++) {
                const option = document.createElement('option');
                option.value = `${m}/${yearToDisplay}`;
                option.textContent = `Tháng ${m}/${yearToDisplay}`;
                monthSelectElement.appendChild(option);
            }
        }

        // Add tab listeners for logged-in features
        const bhytTab = document.querySelector('#bhyt-tab');
        bhytTab.addEventListener('show.bs.tab', () => { if (!bhytDataLoaded) loadData('dueSoon'); });

        const homeTab = document.querySelector('#home-tab');
        homeTab.addEventListener('show.bs.tab', () => loadNotification());

        loadNotification(); // Load initial content for the default tab

    } else {
        // Logged Out State
        userActions.innerHTML = `<button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#authModal">Đăng nhập / Đăng ký</button>`;

        document.getElementById('home-tab-li').style.display = 'none';
        document.getElementById('bhyt-tab-li').style.display = 'none';

        // Ensure public tab is active
        const qrcodeTabEl = document.getElementById('qrcode-tab');
        new bootstrap.Tab(qrcodeTabEl).show();
    }
}

function initQRCodeTool() {
    const generateBtn = document.getElementById('generate-btn');
    const qrCodeContainer = document.getElementById('qrcode-container');
    const statusMessage = document.getElementById('status-message');
    const qrPills = document.querySelectorAll('#qr-type-pills .nav-link');

    // QR Generator elements
    const textInput = document.getElementById('qr-text-input');
    const urlInput = document.getElementById('qr-url-input');
    const wifiSsidInput = document.getElementById('qr-wifi-ssid');
    const wifiPasswordInput = document.getElementById('qr-wifi-password');
    const wifiEncryptionSelect = document.getElementById('qr-wifi-encryption');
    const vcardNameInput = document.getElementById('qr-vcard-name');
    const vcardPhoneInput = document.getElementById('qr-vcard-phone');
    const vcardEmailInput = document.getElementById('qr-vcard-email');
    const vcardOrgInput = document.getElementById('qr-vcard-org');

    // QR Reader elements
    const uploader = document.getElementById('qr-reader-uploader');
    const uploadInput = document.getElementById('qr-upload-input');
    const resultContainer = document.getElementById('qr-reader-result-container');
    const resultText = document.getElementById('qr-reader-result-text');

    // --- QR Code Generation ---
    function generateQrCode() {
        let data = '';
        statusMessage.textContent = '';
        qrCodeContainer.innerHTML = '';

        const activePill = document.querySelector('#qr-type-pills .nav-link.active');
        if (!activePill) return;
        const activeQrTab = activePill.getAttribute('aria-controls');

        switch (activeQrTab) {
            case 'qr-text-pane':
                data = textInput.value;
                break;
            case 'qr-url-pane':
                data = urlInput.value;
                if (data && !data.startsWith('http://') && !data.startsWith('https://')) {
                    data = 'https://' + data;
                }
                break;
            case 'qr-wifi-pane':
                const ssid = wifiSsidInput.value;
                const password = wifiPasswordInput.value;
                const encryption = wifiEncryptionSelect.value;
                if (ssid) {
                    data = `WIFI:T:${encryption};S:${ssid};P:${password};;`;
                }
                break;
            case 'qr-vcard-pane':
                const name = vcardNameInput.value;
                const phone = vcardPhoneInput.value;
                const email = vcardEmailInput.value;
                const org = vcardOrgInput.value;
                if (name || phone || email || org) {
                    data = `BEGIN:VCARD\nVERSION:3.0\nN:${name || ''}\n`;
                    if (org) data += `ORG:${org}\n`;
                    if (phone) data += `TEL:${phone}\n`;
                    if (email) data += `EMAIL:${email}\n`;
                    data += `END:VCARD`;
                }
                break;
        }

        if (data) {
            try {
                 new QRCode(qrCodeContainer, {
                    text: data,
                    width: 256,
                    height: 256,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            } catch (error) {
                console.error("QR Code generation error:", error);
                statusMessage.textContent = 'Không thể tạo mã QR. Dữ liệu có thể quá dài.';
            }
        } else {
             if (activeQrTab !== 'qr-read-pane') {
                statusMessage.textContent = 'Vui lòng nhập dữ liệu để tạo mã QR.';
            }
        }
    }

    if(generateBtn) {
        generateBtn.addEventListener('click', generateQrCode);
    }

    // --- QR Code Reading ---
    function handleQrFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert('Vui lòng chọn một tệp ảnh.');
            return;
        }

        resultContainer.style.display = 'none';
        resultText.textContent = '';

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0, img.width, img.height);
                const imageData = ctx.getImageData(0, 0, img.width, img.height);

                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code) {
                    resultText.textContent = code.data;
                    resultContainer.style.display = 'block';
                } else {
                    alert('Không tìm thấy mã QR trong ảnh.');
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    if(uploadInput) {
        uploadInput.addEventListener('change', (e) => handleQrFile(e.target.files[0]));
    }

    if(uploader) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploader.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
        });
        uploader.addEventListener('drop', (e) => {
             handleQrFile(e.dataTransfer.files[0]);
        }, false);
    }

    // --- Tab Management ---
    qrPills.forEach(pill => {
        pill.addEventListener('shown.bs.tab', (event) => {
            const newActiveTabId = event.target.getAttribute('aria-controls');
            generateBtn.style.display = (newActiveTabId === 'qr-read-pane') ? 'none' : 'block';
            qrCodeContainer.innerHTML = '';
            statusMessage.textContent = '';
            resultContainer.style.display = 'none';
            resultText.textContent = '';
            uploadInput.value = '';
        });
    });
}


document.addEventListener('DOMContentLoaded', () => {
  // Init Auth, BHYT, Notification, and QR Code tools
  authModalInstance = new bootstrap.Modal(document.getElementById('authModal'));
  changePasswordModalInstance = new bootstrap.Modal(document.getElementById('changePasswordModal'));

  // Login on Enter key press in the password field
  document.getElementById('loginPassword').addEventListener('keyup', function(event) {
      if (event.key === 'Enter') {
          event.preventDefault(); // Prevent any default action
          handleLogin();
      }
  });

  initApp();
  initQRCodeTool();

  // Initialize Image Editor logic if its tab exists
  if (document.getElementById('hinhanh-tab-pane')) {
    // --- Lấy các phần tử DOM ---
    const uploader = document.getElementById('uploader');
    const uploadInput = document.getElementById('upload-input');
    const editor = document.getElementById('editor');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    const tabBtns = document.querySelectorAll('.tabs .tab-btn');
    const tabContents = document.querySelectorAll('.controls-main .tab-content');

    // --- Các điều khiển ---
    const widthInput = document.getElementById('width-input');
    const heightInput = document.getElementById('height-input');
    const aspectRatioLock = document.getElementById('aspect-ratio-lock');
    const applyResizeBtn = document.getElementById('apply-resize-btn');

    const cropInputs = {
        x: document.getElementById('crop-x'),
        y: document.getElementById('crop-y'),
        width: document.getElementById('crop-width'),
        height: document.getElementById('crop-height')
    };
    const aspectBtns = document.querySelectorAll('.aspect-btn');
    const applyCropBtn = document.getElementById('apply-crop-btn');

    const rotateLeftBtn = document.getElementById('rotate-left-btn');
    const rotateRightBtn = document.getElementById('rotate-right-btn');
    const rotationSlider = document.getElementById('rotation-slider');
    const rotationValue = document.getElementById('rotation-value');
    const applyRotateBtn = document.getElementById('apply-rotate-btn');
    const resetRotateBtn = document.getElementById('reset-rotate-btn');

    const pixelateSlider = document.getElementById('pixelate-intensity-slider');
    const pixelateValue = document.getElementById('pixelate-value');
    const applyCensorBtn = document.getElementById('apply-censor-btn');

    const formatSelect = document.getElementById('format-select');
    const qualitySlider = document.getElementById('quality-slider');
    const qualityControl = document.getElementById('quality-control');
    const qualityValue = document.getElementById('quality-value');
    const estimatedSizeEl = document.getElementById('estimated-size');
    const downloadBtn = document.getElementById('download-btn');

    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const resetBtn = document.getElementById('reset-btn');

    // --- Trạng thái của ứng dụng ---
    let originalImage = null;
    let originalFilename = 'image.png';
    let currentImageState = null; // Trạng thái ảnh hiện tại { image, width, height }
    let history = [];
    let historyIndex = -1;
    let activeTab = 'resize';
    let originalAspectRatio = 1;

    // --- Trạng thái CẮT ảnh ---
    let cropRect = null; // {x, y, width, height} tính theo tọa độ ảnh đã scale
    let activeCropHandle = null; // ví dụ: 'topLeft', 'bottomRight'
    let isDraggingCropBox = false;
    let cropDragStart = { x: 0, y: 0 };
    const CROP_HANDLE_SIZE = 12; // Kích thước vùng có thể nhấp của tay cầm
    let currentCropAspectRatio = 'free';

    // --- Trạng thái XOAY ảnh ---
    let previewRotationAngle = 0; // Góc xoay để xem trước (độ)

    // --- Trạng thái LÀM MỜ (Censor) ---
    let censorAreas = []; // Mảng các vùng đã chọn để làm mờ
    let isDrawingCensor = false;
    let currentCensorRect = null;
    let censorDragStart = { x: 0, y: 0 };

    // --- Khởi tạo ---
    function init() {
        // Kéo và thả file
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploader.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });
        uploader.addEventListener('drop', handleDrop, false);
        uploadInput.addEventListener('change', (e) => handleFiles(e.target.files));

        // Các nút điều khiển
        resetBtn.addEventListener('click', resetEditor);
        undoBtn.addEventListener('click', undo);
        redoBtn.addEventListener('click', redo);

        // Chuyển tab
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        // Gán sự kiện cho các công cụ
        setupResizeControls();
        setupCropControls();
        setupRotateControls();
        setupCensorControls();
        setupExportControls();
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDrop(e) {
        let dt = e.dataTransfer;
        let files = dt.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        if (files.length === 0) return;
        let file = files[0];

        originalFilename = file.name;
        // Xử lý file HEIC/HEIF
        if (/\.(heic|heif)$/i.test(file.name)) {
            heic2any({ blob: file, toType: "image/png" })
                .then(conversionResult => {
                    const url = URL.createObjectURL(conversionResult);
                    loadImage(url);
                })
                .catch(err => {
                    alert("Lỗi chuyển đổi file HEIC. Vui lòng thử ảnh khác.");
                    console.error(err);
                });
        } else if (file.type.startsWith('image/')) {
            loadImage(URL.createObjectURL(file));
        } else {
            alert('Vui lòng chọn một file ảnh.');
        }
    }

    function loadImage(src) {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            originalAspectRatio = img.width / img.height;
            resetEditorState();
            addHistoryState({ image: img, width: img.width, height: img.height }, true);

            uploader.classList.add('hidden');
            editor.classList.remove('hidden');

            // Mặc định chọn tab resize
            switchTab('resize');
        };
        img.onerror = () => {
            alert('Không thể tải ảnh. File có thể bị lỗi hoặc không được hỗ trợ.');
        };
        img.src = src;
    }

    function resetEditor() {
        if (!confirm("Bạn có muốn tải ảnh mới không? Mọi thay đổi sẽ bị mất.")) return;

        uploader.classList.remove('hidden');
        editor.classList.add('hidden');
        uploadInput.value = ''; // Reset input để có thể chọn lại cùng file
        resetEditorState();
    }

    function resetEditorState() {
        originalImage = null;
        currentImageState = null;
        history = [];
        historyIndex = -1;
        updateHistoryButtons();
        // Reset các trạng thái công cụ
        resetCropState();
        resetRotationPreview();
        resetCensorState();
    }

    // --- Quản lý Lịch sử (Undo/Redo) ---
    function addHistoryState(state, isInitial = false) {
        if (historyIndex < history.length - 1) {
            history = history.slice(0, historyIndex + 1);
        }
        history.push(state);
        historyIndex++;

        setCurrentState(state);
        if (!isInitial) {
           updateHistoryButtons();
        }
    }

    function setCurrentState(state) {
        currentImageState = state;
        updateEditorWithState(state);
    }

    function updateEditorWithState(state) {
        widthInput.value = state.width;
        heightInput.value = state.height;
        drawCanvas();
        updateEstimatedSize();
    }

    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            setCurrentState(history[historyIndex]);
            updateHistoryButtons();
        }
    }

    function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            setCurrentState(history[historyIndex]);
            updateHistoryButtons();
        }
    }

    function updateHistoryButtons() {
        undoBtn.disabled = historyIndex <= 0;
        redoBtn.disabled = historyIndex >= history.length - 1;
    }

    // --- Vẽ lên Canvas ---
    function drawCanvas() {
        if (!currentImageState) return;

        const image = currentImageState.image;
        const container = document.querySelector('.canvas-container');
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        const scaleX = containerWidth / image.width;
        const scaleY = containerHeight / image.height;
        const scale = Math.min(scaleX, scaleY, 1);

        canvas.width = image.width * scale;
        canvas.height = image.height * scale;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Lưu trạng thái canvas trước khi xoay
        ctx.save();

        // Áp dụng xoay để xem trước nếu đang ở tab xoay
        if (activeTab === 'rotate' && previewRotationAngle !== 0) {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            ctx.translate(centerX, centerY);
            ctx.rotate(previewRotationAngle * Math.PI / 180);
            ctx.translate(-centerX, -centerY);
        }

        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        // Khôi phục lại trạng thái canvas (bỏ xoay)
        ctx.restore();

        // Vẽ các UI phụ trợ (khung cắt, vùng làm mờ)
        if (activeTab === 'crop' && cropRect) {
            drawCropUI();
        }
        if (activeTab === 'censor') {
            drawCensorUI();
        }
    }

    // --- Chuyển Tab ---
    function switchTab(tabId) {
        // Dọn dẹp trạng thái của tab cũ
        if (activeTab === 'crop') {
            resetCropState();
        }
        if (activeTab === 'rotate' && previewRotationAngle !== 0) {
            resetRotationPreview();
        }
        if (activeTab === 'censor') {
            resetCensorState();
        }

        canvas.style.cursor = 'default';
        canvas.onmousedown = null;
        canvas.onmousemove = null;
        canvas.onmouseup = null;
        canvas.onmouseleave = null;

        // Kích hoạt tab mới
        activeTab = tabId;
        tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
        tabContents.forEach(content => content.classList.toggle('active', content.id.startsWith(tabId)));

        // Thiết lập cho tab mới
        if (tabId === 'crop') {
            initializeCropRect();
            canvas.style.cursor = 'default'; // Được quản lý bởi mousemove
            canvas.onmousedown = handleCropMouseDown;
            canvas.onmousemove = handleCropMouseMove;
            canvas.onmouseup = handleCropMouseUp;
            canvas.onmouseleave = handleCropMouseUp; // Kết thúc nếu chuột ra ngoài
        } else if (tabId === 'censor') {
            canvas.style.cursor = 'crosshair';
            canvas.onmousedown = handleCensorMouseDown;
            canvas.onmousemove = handleCensorMouseMove;
            canvas.onmouseup = handleCensorMouseUp;
            canvas.onmouseleave = handleCensorMouseUp;
        }

        drawCanvas();
    }

    // --- Lấy tọa độ trên canvas ---
    function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    function canvasToImageCoords(coords) {
        const scale = canvas.width / currentImageState.width;
        return {
            x: coords.x / scale,
            y: coords.y / scale
        };
    }

    // --- Logic Công cụ: Đổi kích thước ---
    function setupResizeControls() {
        applyResizeBtn.addEventListener('click', applyResize);
        widthInput.addEventListener('change', () => {
            if (aspectRatioLock.checked) {
                heightInput.value = Math.round(widthInput.value / originalAspectRatio);
            }
        });
        heightInput.addEventListener('change', () => {
            if (aspectRatioLock.checked) {
                widthInput.value = Math.round(heightInput.value * originalAspectRatio);
            }
        });
    }

    function applyResize() {
        const width = parseInt(widthInput.value, 10);
        const height = parseInt(heightInput.value, 10);

        if (!width || !height || width <= 0 || height <= 0) {
            alert('Kích thước không hợp lệ.');
            return;
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(currentImageState.image, 0, 0, width, height);

        const newImage = new Image();
        newImage.onload = () => {
            addHistoryState({ image: newImage, width, height });
        };
        newImage.src = tempCanvas.toDataURL();
    }

    // --- Logic Công cụ: Cắt ảnh ---
    function setupCropControls() {
        applyCropBtn.addEventListener('click', applyCrop);
        aspectBtns.forEach(btn => btn.addEventListener('click', (e) => setCropAspectRatio(e.target.dataset.ratio, e.target)));
        Object.values(cropInputs).forEach(input => input.addEventListener('change', updateCropRectFromInputs));
    }

    function initializeCropRect() {
        if (!currentImageState) return;
        const imgWidth = currentImageState.width;
        const imgHeight = currentImageState.height;

        // Tạo khung cắt mặc định ở giữa, chiếm 80%
        const width = imgWidth * 0.8;
        const height = imgHeight * 0.8;
        const x = (imgWidth - width) / 2;
        const y = (imgHeight - height) / 2;

        cropRect = { x, y, width, height };
        updateCropInputs();
        applyCropBtn.disabled = false;
    }

    function resetCropState() {
        cropRect = null;
        activeCropHandle = null;
        isDraggingCropBox = false;
        applyCropBtn.disabled = true;
        if(document.querySelector('.aspect-btn.active')) {
            document.querySelector('.aspect-btn.active').classList.remove('active');
        }
        document.querySelector('.aspect-btn[data-ratio="free"]').classList.add('active');
        currentCropAspectRatio = 'free';
    }

    function drawCropUI() {
        const scale = canvas.width / currentImageState.width;
        const rx = cropRect.x * scale;
        const ry = cropRect.y * scale;
        const rw = cropRect.width * scale;
        const rh = cropRect.height * scale;

        ctx.save();
        // Lớp phủ màu đen mờ bên ngoài vùng cắt
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.rect(rx + rw, ry, -rw, rh); // Khoét lỗ vùng cắt
        ctx.fill();

        // Vẽ đường viền và các đường chia 1/3
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx, ry, rw, rh);

        ctx.beginPath();
        ctx.moveTo(rx + rw / 3, ry);
        ctx.lineTo(rx + rw / 3, ry + rh);
        ctx.moveTo(rx + rw * 2 / 3, ry);
        ctx.lineTo(rx + rw * 2 / 3, ry + rh);
        ctx.moveTo(rx, ry + rh / 3);
        ctx.lineTo(rx + rw, ry + rh / 3);
        ctx.moveTo(rx, ry + rh * 2 / 3);
        ctx.lineTo(rx + rw, ry + rh * 2 / 3);
        ctx.stroke();

        // Vẽ các tay cầm (handles)
        const handleSize = CROP_HANDLE_SIZE / 2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        getHandlePositions(rx, ry, rw, rh).forEach(handle => {
            ctx.fillRect(handle.x - handleSize, handle.y - handleSize, handleSize * 2, handleSize * 2);
        });
        ctx.restore();
    }

    function getHandlePositions(rx, ry, rw, rh) {
        return [
            { id: 'topLeft',     x: rx,          y: ry,          cursor: 'nwse-resize' },
            { id: 'topRight',    x: rx + rw,     y: ry,          cursor: 'nesw-resize' },
            { id: 'bottomLeft',  x: rx,          y: ry + rh,     cursor: 'nesw-resize' },
            { id: 'bottomRight', x: rx + rw,     y: ry + rh,     cursor: 'nwse-resize' },
            { id: 'top',         x: rx + rw / 2, y: ry,          cursor: 'ns-resize' },
            { id: 'bottom',      x: rx + rw / 2, y: ry + rh,     cursor: 'ns-resize' },
            { id: 'left',        x: rx,          y: ry + rh / 2, cursor: 'ew-resize' },
            { id: 'right',       x: rx + rw,     y: ry + rh / 2, cursor: 'ew-resize' }
        ];
    }

    function getHandleUnderMouse(canvasX, canvasY) {
        const scale = canvas.width / currentImageState.width;
        const handles = getHandlePositions(cropRect.x * scale, cropRect.y * scale, cropRect.width * scale, cropRect.height * scale);
        for (const handle of handles) {
            if (Math.abs(handle.x - canvasX) < CROP_HANDLE_SIZE && Math.abs(handle.y - canvasY) < CROP_HANDLE_SIZE) {
                return handle;
            }
        }
        return null;
    }

    function handleCropMouseDown(e) {
        const { x, y } = getCanvasCoords(e);
        const imageCoords = canvasToImageCoords({x, y});
        activeCropHandle = getHandleUnderMouse(x, y);

        if (activeCropHandle) {
            isDraggingCropBox = false;
        } else {
            const scale = canvas.width / currentImageState.width;
            if (x > cropRect.x * scale && x < (cropRect.x + cropRect.width) * scale && y > cropRect.y * scale && y < (cropRect.y + cropRect.height) * scale) {
                isDraggingCropBox = true;
                cropDragStart = { x: imageCoords.x - cropRect.x, y: imageCoords.y - cropRect.y };
            }
        }
    }

    // [BUGFIX] Replaced the entire function with a more robust and correct version.
    function handleCropMouseMove(e) {
        // First, handle cursor style update when NOT dragging
        if (!isDraggingCropBox && !activeCropHandle) {
            const { x: mouseX, y: mouseY } = getCanvasCoords(e);
            const handle = getHandleUnderMouse(mouseX, mouseY);
            if (handle) {
                canvas.style.cursor = handle.cursor;
            } else {
                const scale = canvas.width / currentImageState.width;
                const isInside = mouseX > cropRect.x * scale && mouseX < (cropRect.x + cropRect.width) * scale &&
                                mouseY > cropRect.y * scale && mouseY < (cropRect.y + cropRect.height) * scale;
                canvas.style.cursor = isInside ? 'move' : 'default';
            }
            return; // Exit early if not dragging
        }

        // If we are dragging, proceed
        if (!cropRect) return;

        const { x: mouseX, y: mouseY } = getCanvasCoords(e);
        const imageCoords = canvasToImageCoords({ x: mouseX, y: mouseY });
        const clampedMouseX = Math.max(0, Math.min(imageCoords.x, currentImageState.width));
        const clampedMouseY = Math.max(0, Math.min(imageCoords.y, currentImageState.height));

        if (isDraggingCropBox) {
            cropRect.x = Math.max(0, Math.min(clampedMouseX - cropDragStart.x, currentImageState.width - cropRect.width));
            cropRect.y = Math.max(0, Math.min(clampedMouseY - cropDragStart.y, currentImageState.height - cropRect.height));
        } else if (activeCropHandle) {
            const handleId = activeCropHandle.id;
            let { x, y, width, height } = cropRect;
            const right = x + width;
            const bottom = y + height;
            const centerX = x + width / 2;
            const centerY = y + height / 2;

            let ratio = (currentCropAspectRatio !== 'free') ? parseFloat(currentCropAspectRatio) : null;

            // Store original values before modification
            const originalX = x;
            const originalY = y;

            // Calculate new dimensions based on handle
            switch (handleId) {
                case 'topLeft':     x = clampedMouseX; y = clampedMouseY; width = right - x; height = bottom - y; break;
                case 'topRight':    y = clampedMouseY; width = clampedMouseX - originalX; height = bottom - y; break;
                case 'bottomLeft':  x = clampedMouseX; width = right - x; height = clampedMouseY - originalY; break;
                case 'bottomRight': width = clampedMouseX - originalX; height = clampedMouseY - originalY; break;
                case 'top':         y = clampedMouseY; height = bottom - y; break;
                case 'bottom':      height = clampedMouseY - originalY; break;
                case 'left':        x = clampedMouseX; width = right - x; break;
                case 'right':       width = clampedMouseX - originalX; break;
            }

            // Handle aspect ratio locking
            if (ratio) {
                if (handleId.includes('Left') || handleId.includes('Right')) { // Width changed, so adjust height
                    height = width / ratio;
                } else if (handleId.includes('Top') || handleId.includes('Bottom')) { // Height changed, so adjust width
                    width = height * ratio;
                }

                // Re-anchor the crop box based on which handle was dragged
                if (handleId.includes('Top'))    y = bottom - height;
                if (handleId.includes('Left'))   x = right - width;
                if (handleId === 'top' || handleId === 'bottom') x = centerX - width / 2;
                if (handleId === 'left' || handleId === 'right') y = centerY - height / 2;
            }

            // Handle flipping (when a handle is dragged past its opposite edge)
            if (width < 0) {
                x += width;
                width = Math.abs(width);
            }
            if (height < 0) {
                y += height;
                height = Math.abs(height);
            }

            // Assign final calculated values back to the cropRect
            cropRect.x = x;
            cropRect.y = y;
            cropRect.width = width;
            cropRect.height = height;
        }

        updateCropInputs();
        drawCanvas();
    }

    function handleCropMouseUp() {
        isDraggingCropBox = false;
        activeCropHandle = null;
    }

    function updateCropInputs() {
        if (!cropRect) return;
        cropInputs.x.value = Math.round(cropRect.x);
        cropInputs.y.value = Math.round(cropRect.y);
        cropInputs.width.value = Math.round(cropRect.width);
        cropInputs.height.value = Math.round(cropRect.height);
    }

    function updateCropRectFromInputs() {
        if (!cropRect) return;
        cropRect.x = parseInt(cropInputs.x.value, 10) || 0;
        cropRect.y = parseInt(cropInputs.y.value, 10) || 0;
        cropRect.width = parseInt(cropInputs.width.value, 10) || 0;
        cropRect.height = parseInt(cropInputs.height.value, 10) || 0;
        drawCanvas();
    }

    function setCropAspectRatio(ratioStr, target) {
        aspectBtns.forEach(btn => btn.classList.remove('active'));
        target.classList.add('active');

        if (ratioStr === 'free') {
            currentCropAspectRatio = 'free';
        } else {
            const [w, h] = ratioStr.split(',').map(Number);
            currentCropAspectRatio = w / h;
            if (!cropRect) return;
            cropRect.height = cropRect.width / currentCropAspectRatio;
            if (cropRect.y + cropRect.height > currentImageState.height) {
                cropRect.height = currentImageState.height - cropRect.y;
                cropRect.width = cropRect.height * currentCropAspectRatio;
            }
            updateCropInputs();
            drawCanvas();
        }
    }

    function applyCrop() {
        if (!cropRect || cropRect.width <= 0 || cropRect.height <= 0) return;

        const { x, y, width, height } = cropRect;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.round(width);
        tempCanvas.height = Math.round(height);
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.drawImage(
            currentImageState.image,
            Math.round(x), Math.round(y), Math.round(width), Math.round(height),
            0, 0, Math.round(width), Math.round(height)
        );

        const newImage = new Image();
        newImage.onload = () => {
            addHistoryState({ image: newImage, width: newImage.width, height: newImage.height });
            switchTab('resize');
        };
        newImage.src = tempCanvas.toDataURL();
    }

    // --- Logic Công cụ: Xoay ảnh ---
    function setupRotateControls() {
        rotationSlider.addEventListener('input', () => {
            previewRotationAngle = parseInt(rotationSlider.value, 10);
            rotationValue.textContent = previewRotationAngle;
            drawCanvas();
        });

        applyRotateBtn.addEventListener('click', () => {
             if (previewRotationAngle !== 0) {
                applyRotation(previewRotationAngle);
             }
        });

        resetRotateBtn.addEventListener('click', resetRotationPreview);

        rotateLeftBtn.addEventListener('click', () => applyRotation(-90));
        rotateRightBtn.addEventListener('click', () => applyRotation(90));
    }

    function resetRotationPreview() {
        previewRotationAngle = 0;
        rotationSlider.value = 0;
        rotationValue.textContent = 0;
        drawCanvas();
    }

    function applyRotation(degrees) {
        if (!currentImageState || degrees === 0) return;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        const image = currentImageState.image;
        const angleRad = degrees * Math.PI / 180;

        const cos = Math.abs(Math.cos(angleRad));
        const sin = Math.abs(Math.sin(angleRad));
        const newWidth = Math.round(image.width * cos + image.height * sin);
        const newHeight = Math.round(image.width * sin + image.height * cos);

        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;

        tempCtx.translate(newWidth / 2, newHeight / 2);
        tempCtx.rotate(angleRad);
        tempCtx.drawImage(image, -image.width / 2, -image.height / 2);

        const newImage = new Image();
        newImage.onload = () => {
            addHistoryState({ image: newImage, width: newWidth, height: newHeight });
            if(previewRotationAngle !== 0) {
                resetRotationPreview();
            }
        };
        newImage.src = tempCanvas.toDataURL();
    }

    // --- Logic Công cụ: Làm mờ (CENSOR - PIXELATE) ---
    function setupCensorControls() {
        pixelateSlider.addEventListener('input', () => {
            pixelateValue.textContent = pixelateSlider.value;
        });
        applyCensorBtn.addEventListener('click', applyCensor);
    }

    function resetCensorState() {
        censorAreas = [];
        isDrawingCensor = false;
        currentCensorRect = null;
        applyCensorBtn.disabled = true;
        if (activeTab === 'censor') {
            drawCanvas();
        }
    }

    function drawCensorUI() {
        ctx.save();
        ctx.strokeStyle = 'rgba(220, 53, 69, 0.9)';
        ctx.fillStyle = 'rgba(220, 53, 69, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        censorAreas.forEach(rect => {
            const scale = canvas.width / currentImageState.width;
            const rx = rect.x * scale;
            const ry = rect.y * scale;
            const rw = rect.width * scale;
            const rh = rect.height * scale;
            ctx.fillRect(rx, ry, rw, rh);
            ctx.strokeRect(rx, ry, rw, rh);
        });

        if (isDrawingCensor && currentCensorRect) {
            const scale = canvas.width / currentImageState.width;
            const { x, y, width, height } = currentCensorRect;
            ctx.strokeRect(x * scale, y * scale, width * scale, height * scale);
        }
        ctx.restore();
    }

    function handleCensorMouseDown(e) {
        isDrawingCensor = true;
        const coords = canvasToImageCoords(getCanvasCoords(e));
        censorDragStart = coords;
        currentCensorRect = { x: coords.x, y: coords.y, width: 0, height: 0 };
    }

    function handleCensorMouseMove(e) {
        if (!isDrawingCensor) return;
        const coords = canvasToImageCoords(getCanvasCoords(e));
        currentCensorRect.width = coords.x - censorDragStart.x;
        currentCensorRect.height = coords.y - censorDragStart.y;
        drawCanvas();
    }

    function handleCensorMouseUp() {
        if (!isDrawingCensor || !currentCensorRect) return;
        isDrawingCensor = false;

        let finalRect = { ...currentCensorRect };
        if (finalRect.width < 0) {
            finalRect.x += finalRect.width;
            finalRect.width *= -1;
        }
        if (finalRect.height < 0) {
            finalRect.y += finalRect.height;
            finalRect.height *= -1;
        }

        if(finalRect.width > 4 && finalRect.height > 4) {
            censorAreas.push(finalRect);
        }
        currentCensorRect = null;
        applyCensorBtn.disabled = censorAreas.length === 0;
        drawCanvas();
    }

    function applyCensor() {
        if (censorAreas.length === 0) return;

        const pixelSize = parseInt(pixelateSlider.value, 10);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = currentImageState.width;
        tempCanvas.height = currentImageState.height;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        tempCtx.drawImage(currentImageState.image, 0, 0);

        censorAreas.forEach(rect => {
            const { x, y, width, height } = rect;
            const ix = Math.floor(x);
            const iy = Math.floor(y);
            const iw = Math.floor(width);
            const ih = Math.floor(height);

            if (iw <= 0 || ih <= 0) return;

            const imageData = tempCtx.getImageData(ix, iy, iw, ih);
            const data = imageData.data;

            for (let j = 0; j < ih; j += pixelSize) {
                for (let i = 0; i < iw; i += pixelSize) {
                    const pixelIndex = (j * iw + i) * 4;
                    const r = data[pixelIndex];
                    const g = data[pixelIndex + 1];
                    const b = data[pixelIndex + 2];

                    tempCtx.fillStyle = `rgb(${r},${g},${b})`;
                    tempCtx.fillRect(ix + i, iy + j, pixelSize, pixelSize);
                }
            }
        });

        const newImage = new Image();
        newImage.onload = () => {
            addHistoryState({ image: newImage, width: newImage.width, height: newImage.height });
            resetCensorState();
        };
        newImage.src = tempCanvas.toDataURL();
    }

    // --- Logic Công cụ: Xuất ảnh ---
    function setupExportControls() {
        const setQualityVisibility = () => {
            qualityControl.style.display = formatSelect.value === 'image/jpeg' ? 'block' : 'none';
        };

        formatSelect.addEventListener('change', () => {
            setQualityVisibility();
            updateEstimatedSize();
        });
        qualitySlider.addEventListener('input', () => {
            qualityValue.textContent = qualitySlider.value;
            updateEstimatedSize();
        });
        downloadBtn.addEventListener('click', downloadImage);

        // Set initial visibility on load
        setQualityVisibility();
    }

    function updateEstimatedSize() {
        if (!currentImageState) return;
        const format = formatSelect.value;
        const quality = format === 'image/jpeg' ? parseFloat(qualitySlider.value) : undefined;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = currentImageState.width;
        tempCanvas.height = currentImageState.height;
        tempCanvas.getContext('2d').drawImage(currentImageState.image, 0, 0);

        tempCanvas.toBlob(blob => {
            if (blob) {
                estimatedSizeEl.textContent = formatBytes(blob.size);
            }
        }, format, quality);
    }

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function downloadImage() {
        const format = formatSelect.value;
        const quality = parseFloat(qualitySlider.value);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = currentImageState.width;
        tempCanvas.height = currentImageState.height;
        tempCanvas.getContext('2d').drawImage(currentImageState.image, 0, 0);

        const dataUrl = tempCanvas.toDataURL(format, quality);

        const link = document.createElement('a');
        const extension = format.split('/')[1];
        link.download = originalFilename.replace(/\.[^/.]+$/, "") + `_edited.${extension}`;
        link.href = dataUrl;
        link.click();
    }

    // Khởi chạy ứng dụng
    init();
  }
});
