




// assets/script_tracuu.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('tracuu-form');
    const birthDateInput = document.getElementById('tracuu-ngaysinh');
    const resultsContainer = document.getElementById('tracuu-results');
    const resultsBody = document.getElementById('tracuu-tbody');
    const resultsHead = document.getElementById('tracuu-thead');
    const messageEl = document.getElementById('tracuu-message');
    const submitBtn = document.getElementById('tracuu-btn');
    const resetBtn = document.getElementById('tracuu-reset-btn');
    const countBadge = document.getElementById('tracuu-count');

    if (!form) return;

    // Date Masking: Auto insert '/'
    birthDateInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Xóa ký tự không phải số
        if (value.length > 8) value = value.substring(0, 8);
        
        let formattedValue = '';
        if (value.length > 4) {
            formattedValue = `${value.substring(0, 2)}/${value.substring(2, 4)}/${value.substring(4, 8)}`;
        } else if (value.length > 2) {
            formattedValue = `${value.substring(0, 2)}/${value.substring(2, 4)}`;
        } else {
            formattedValue = value;
        }
        e.target.value = formattedValue;
    });

    // Reset Form
    resetBtn.addEventListener('click', () => {
        form.reset();
        resultsContainer.classList.add('d-none');
        resultsBody.innerHTML = '';
        resultsHead.innerHTML = '';
        messageEl.textContent = '';
        messageEl.className = 'mt-3 text-center';
    });

    // Handle Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const cccd = document.getElementById('tracuu-cccd').value.trim();
        const hoten = document.getElementById('tracuu-hoten').value.trim();
        const ngaysinh = document.getElementById('tracuu-ngaysinh').value.trim();
        const bhxh = document.getElementById('tracuu-bhxh').value.trim();

        // Validate: At least one field required
        if (!cccd && !hoten && !ngaysinh && !bhxh) {
            messageEl.textContent = 'Vui lòng nhập ít nhất một trường thông tin để tra cứu.';
            messageEl.className = 'mt-3 text-center text-danger';
            return;
        }

        // Validate Date format if entered
        if (ngaysinh && !/^\d{2}\/\d{2}\/\d{4}$/.test(ngaysinh)) {
            messageEl.textContent = 'Ngày sinh không đúng định dạng (dd/mm/yyyy).';
            messageEl.className = 'mt-3 text-center text-danger';
            return;
        }

        const user = JSON.parse(localStorage.getItem('bhyt_user') || '{}');
        if (!user.sessionId) {
            messageEl.textContent = 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
            messageEl.className = 'mt-3 text-center text-danger';
            // Optional: trigger login modal or logout
            return;
        }

        // UI Loading State
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang tìm...';
        messageEl.textContent = '';
        resultsContainer.classList.add('d-none');
        resultsBody.innerHTML = '';
        resultsHead.innerHTML = '';

        const payload = {
            cccd, hoten, ngaysinh, bhxh,
            sessionId: user.sessionId
        };

        const body = `action=searchDSTG&data=${encodeURIComponent(JSON.stringify(payload))}`;

        try {
            const res = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body,
                redirect: 'follow'
            });

            const data = await res.json();

            if (data.success) {
                if (data.results && data.results.length > 0) {
                    renderResults(data.results);
                    messageEl.textContent = '';
                } else {
                    messageEl.textContent = 'Không tìm thấy kết quả nào phù hợp.';
                    messageEl.className = 'mt-3 text-center text-warning fw-bold';
                }
            } else {
                messageEl.textContent = data.error || 'Có lỗi xảy ra.';
                messageEl.className = 'mt-3 text-center text-danger';
            }
        } catch (error) {
            console.error(error);
            messageEl.textContent = 'Lỗi kết nối máy chủ.';
            messageEl.className = 'mt-3 text-center text-danger';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-search"></i> Tìm kiếm';
        }
    });

    function renderResults(results) {
        countBadge.textContent = results.length;
        
        const user = JSON.parse(localStorage.getItem('bhyt_user') || '{}');
        const role = user.role || 'Người dùng';
        
        let columns = [];

        if (role === 'Quản trị') {
            columns = [
                { key: 'maDvi', label: 'Mã Đơn vị' },
                { key: 'maTinh', label: 'Mã Tỉnh' },
                { key: 'soBhxh', label: 'Số BHXH' },
                { key: 'soKcb', label: 'Số KCB' },
                { key: 'hoTen', label: 'Họ Tên' },
                { key: 'gioiTinh', label: 'Giới Tính' },
                { key: 'ngaySinh', label: 'Ngày Sinh' },
                { key: 'diaChiLh', label: 'Địa chỉ LH' },
                { key: 'nguoiGiamHo', label: 'Người Giám Hộ' },
                { key: 'soCmnd', label: 'CCCD/CMND' },
                { key: 'maBv', label: 'Mã BV' },
                { key: 'mucLuong', label: 'Mức Lương' },
                { key: 'heSoLuong', label: 'Hệ Số' },
                { key: 'congViec', label: 'Công Việc' },
                { key: 'maXaLh', label: 'Mã Xã LH' },
                { key: 'maTinhLh', label: 'Mã Tỉnh LH' },
                { key: 'hanTheTu', label: 'Hạn Thẻ Từ' },
                { key: 'hanTheDen', label: 'Hạn Thẻ Đến' },
                { key: 'soDienThoai', label: 'SĐT' },
                { key: 'VSS_EMAIL', label: 'Email' }
            ];
        } else {
            // Cộng tác viên, Tra cứu
            columns = [
                { key: 'soKcb', label: 'Số KCB' },
                { key: 'hoTen', label: 'Họ Tên' },
                { key: 'gioiTinh', label: 'Giới Tính' },
                { key: 'ngaySinh', label: 'Ngày Sinh' },
                { key: 'diaChiLh', label: 'Địa chỉ LH' },
                { key: 'nguoiGiamHo', label: 'Người Giám Hộ' },
                { key: 'soCmnd', label: 'CCCD/CMND' },
                { key: 'maBv', label: 'Mã BV' },
                { key: 'hanTheTu', label: 'Hạn Thẻ Từ' },
                { key: 'hanTheDen', label: 'Hạn Thẻ Đến' }
            ];
        }

        // Render Header
        let theadHtml = '<tr>';
        columns.forEach(col => {
            theadHtml += `<th>${col.label}</th>`;
        });
        theadHtml += '</tr>';
        resultsHead.innerHTML = theadHtml;

        // Render Body
        const formatDate = (dateStr) => {
            if(!dateStr) return '';
            const d = new Date(dateStr);
            if(isNaN(d.getTime())) return dateStr;
            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        }

        let tbodyHtml = '';
        results.forEach(item => {
            tbodyHtml += '<tr>';
            columns.forEach(col => {
                let value = item[col.key] || '';
                
                // Special Formatting
                if (col.key === 'hoTen') {
                    value = `<span class="fw-bold text-primary">${value}</span>`;
                } else if (col.key === 'mucLuong' && value) {
                    value = parseInt(value).toLocaleString('vi-VN');
                } else if (['ngaySinh', 'hanTheTu', 'hanTheDen'].includes(col.key)) {
                    value = formatDate(value);
                } else if (col.key === 'diaChiLh') {
                    value = `<span class="d-inline-block text-truncate" style="max-width: 150px;" title="${value}">${value}</span>`;
                }

                tbodyHtml += `<td>${value}</td>`;
            });
            tbodyHtml += '</tr>';
        });
        resultsBody.innerHTML = tbodyHtml;
        resultsContainer.classList.remove('d-none');
    }
});
