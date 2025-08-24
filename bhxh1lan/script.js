// bhxh1lan/script.js
document.addEventListener('DOMContentLoaded', () => {
    const periodsContainer = document.getElementById('periods-container');
    const addCompulsoryBtn = document.getElementById('add-compulsory-btn');
    const addVoluntaryBtn = document.getElementById('add-voluntary-btn');
    const addMaternityBtn = document.getElementById('add-maternity-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const resultContainer = document.getElementById('result-container');
    const resultAmountEl = document.getElementById('result-amount');
    const resultTextEl = document.getElementById('result-text');
    const errorContainer = document.getElementById('error-container');
    const totalParticipationTimeEl = document.getElementById('total-participation-time');
    const warning2025El = document.getElementById('bhxh-warning-2025');
    
    const currentYear = new Date().getFullYear();
    const startYear = 1980;

    const createMonthOptions = () => Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
    const createYearOptions = () => {
        let options = '';
        for (let year = currentYear; year >= startYear; year--) {
            options += `<option value="${year}">${year}</option>`;
        }
        return options;
    };
    
    const monthOptions = createMonthOptions();
    const yearOptions = createYearOptions();

    const formatNumber = (value) => {
        if (!value) return '';
        // Yêu cầu: Phân cách hàng nghìn bằng dấu chấm
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const unformatNumber = (value) => {
        if (!value) return '';
        // Yêu cầu: Xóa dấu chấm phân cách hàng nghìn trước khi xử lý
        return value.toString().replace(/\./g, '');
    };
    
    const createRowHTML = (type, id) => {
        const isCompulsory = type === 'batbuoc';
        const isVoluntary = type === 'tunguyen';
        const isMaternity = type === 'thaisan';

        return `
            <div class="period-row" data-type="${type}" data-id="${id}">
                <div class="row w-100 g-2 align-items-center">
                    <!-- Date Range -->
                    <div class="col-md-4">
                        <label class="form-label d-md-none">Giai đoạn nộp BHXH</label>
                        <div class="date-range-wrapper">
                            <div class="date-group">
                                <select class="form-select form-select-sm from-month" aria-label="Từ tháng">${monthOptions}</select>
                                <select class="form-select form-select-sm from-year" aria-label="Từ năm">${yearOptions}</select>
                            </div>
                            <span class="date-separator">Đến</span>
                            <div class="date-group">
                                <select class="form-select form-select-sm to-month" aria-label="Đến tháng">${monthOptions}</select>
                                <select class="form-select form-select-sm to-year" aria-label="Đến năm">${yearOptions}</select>
                            </div>
                        </div>
                    </div>

                    <!-- Details -->
                    <div class="col-md-5">
                         <label class="form-label d-md-none">Mức lương đóng BHXH</label>
                         <div class="details-inputs-wrapper">
                            ${isCompulsory ? `
                                <select class="form-select form-select-sm salary-type-select" style="width: 120px;">
                                    <option value="mucluong" selected>Mức lương</option>
                                    <option value="heso">Hệ số</option>
                                </select>
                                <div class="salary-inputs">
                                    <input type="text" class="form-control form-control-sm salary-input" placeholder="VD: 5.000.000 (VND)">
                                </div>
                                <div class="coefficient-inputs" style="display: none;">
                                    <div class="input-group input-group-sm">
                                        <input type="text" class="form-control" placeholder="Hệ số" data-field="heso">
                                        <input type="text" class="form-control" placeholder="PC Chức vụ" data-field="posAllowance">
                                        <input type="text" class="form-control" placeholder="TN Vượt khung" data-field="exFrameAllowance">
                                        <input type="text" class="form-control" placeholder="TN Nghề" data-field="jobAllowance">
                                    </div>
                                </div>
                            ` : ''}
                            ${isVoluntary ? `
                                <input type="text" class="form-control form-control-sm salary-input" placeholder="Mức thu nhập tháng (VND)">
                            ` : ''}
                            ${isMaternity ? `
                                <div class="maternity-text w-100 text-center">Giai đoạn thai sản</div>
                            ` : ''}
                         </div>
                    </div>

                    <!-- Category -->
                    <div class="col-md-2">
                        ${isVoluntary ? `
                             <label class="form-label d-md-none">Đối tượng tham gia</label>
                             <select class="form-select form-select-sm voluntary-category">
                                <option value="Khác">Khác</option>
                                <option value="Hộ nghèo">Hộ nghèo</option>
                                <option value="Cận nghèo">Cận nghèo</option>
                                <option value="Dân tộc">Dân tộc</option>
                             </select>
                        ` : ''}
                    </div>

                    <!-- Delete Button -->
                    <div class="col-md-1 text-end">
                        <button type="button" class="btn btn-sm btn-outline-danger delete-row-btn" aria-label="Xóa giai đoạn"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
            </div>
        `;
    };

    const addPeriodRow = (type) => {
        const newId = Date.now();
        const rowHTML = createRowHTML(type, newId);
        periodsContainer.insertAdjacentHTML('beforeend', rowHTML);
        validateAndSummarizePeriods();
    };
    
    const validateAndSummarizePeriods = () => {
        const rows = Array.from(periodsContainer.querySelectorAll('.period-row'));
        if (rows.length === 0) {
            totalParticipationTimeEl.textContent = '';
            warning2025El.style.display = 'none';
            return;
        }

        const periods = rows.map(row => {
            const fromMonthEl = row.querySelector('.from-month');
            const fromYearEl = row.querySelector('.from-year');
            return {
                element: row,
                fromMonthEl,
                fromYearEl,
                from: new Date(fromYearEl.value, fromMonthEl.value - 1, 1),
                to: new Date(row.querySelector('.to-year').value, row.querySelector('.to-month').value - 1, 1),
            }
        }).sort((a, b) => a.from - b.from);

        let totalMonths = 0;
        let firstParticipationDate = periods.length > 0 ? periods[0].from : null;

        periods.forEach((period, index) => {
            // Reset background color first
            period.fromMonthEl.classList.remove('non-consecutive');
            period.fromYearEl.classList.remove('non-consecutive');

            // Calculate total months for this period
            const fromDate = period.from;
            const toDate = period.to;
            if (toDate >= fromDate) {
                 totalMonths += (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth()) + 1;
            }

            // Check for continuity from the second period onwards
            if (index > 0) {
                const prevPeriod = periods[index - 1];
                const expectedFromDate = new Date(prevPeriod.to.getFullYear(), prevPeriod.to.getMonth() + 1, 1);

                if (period.from > expectedFromDate) {
                     period.fromMonthEl.classList.add('non-consecutive');
                     period.fromYearEl.classList.add('non-consecutive');
                }
            }
        });

        // Update total participation time display
        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;
        totalParticipationTimeEl.textContent = `Tổng thời gian tham gia: ${years} năm ${months} tháng`;

        // Check for 2025 warning
        const warningDate = new Date(2025, 6, 1); // July 2025
        if (firstParticipationDate && firstParticipationDate >= warningDate) {
            warning2025El.style.display = 'block';
        } else {
            warning2025El.style.display = 'none';
        }
    };

    periodsContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('salary-type-select')) {
            const row = e.target.closest('.period-row');
            const salaryInputs = row.querySelector('.salary-inputs');
            const coefficientInputs = row.querySelector('.coefficient-inputs');
            if (e.target.value === 'heso') {
                salaryInputs.style.display = 'none';
                coefficientInputs.style.display = 'block';
            } else {
                salaryInputs.style.display = 'block';
                coefficientInputs.style.display = 'none';
            }
        }
        
        if (e.target.matches('.from-month, .from-year, .to-month, .to-year')) {
            validateAndSummarizePeriods();
        }
    });
    
    periodsContainer.addEventListener('click', (e) => {
        if (e.target.closest('.delete-row-btn')) {
            e.target.closest('.period-row').remove();
            validateAndSummarizePeriods();
        }
    });

    periodsContainer.addEventListener('input', (e) => {
        // Định dạng mức lương với dấu chấm phân cách hàng nghìn
        if (e.target.classList.contains('salary-input')) {
            const unformatted = unformatNumber(e.target.value);
            if (!isNaN(unformatted) && unformatted) {
                e.target.value = formatNumber(unformatted);
            } else if (!unformatted) {
                 e.target.value = '';
            }
        }
        
        // [FIX] Sửa lỗi và cải thiện logic xác thực cho các trường nhập số thập phân (hệ số, phụ cấp)
        if (e.target.matches('[data-field="heso"], [data-field="posAllowance"], [data-field="exFrameAllowance"], [data-field="jobAllowance"]')) {
             let value = e.target.value;
             // 1. Thay thế dấu chấm bằng dấu phẩy để thống nhất
             value = value.replace(/\./g, ',');
             // 2. Loại bỏ các ký tự không hợp lệ (chỉ giữ lại số và dấu phẩy)
             value = value.replace(/[^0-9,]/g, '');
             // 3. Đảm bảo chỉ có một dấu phẩy (dấu thập phân). Giữ lại dấu đầu tiên và xóa các dấu sau đó.
             const firstCommaIndex = value.indexOf(',');
             if (firstCommaIndex !== -1) {
                 const integerPart = value.substring(0, firstCommaIndex);
                 const decimalPart = value.substring(firstCommaIndex + 1).replace(/,/g, ''); // Xóa tất cả các dấu phẩy sau dấu đầu tiên
                 value = integerPart + ',' + decimalPart;
             }
             e.target.value = value;
        }
    });

    const collectData = () => {
        const rows = periodsContainer.querySelectorAll('.period-row');
        const data = [];
        let isValid = true;
        
        hideMessages(); // Xóa các lỗi cũ trước khi kiểm tra

        rows.forEach(row => {
            if (!isValid) return; // Dừng sớm nếu đã có lỗi

            const periodType = row.dataset.type;
            const fromDate = {
                month: row.querySelector('.from-month').value,
                year: row.querySelector('.from-year').value
            };
            const toDate = {
                month: row.querySelector('.to-month').value,
                year: row.querySelector('.to-year').value
            };

            if (new Date(toDate.year, toDate.month - 1) < new Date(fromDate.year, fromDate.month - 1)) {
                showError('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.');
                isValid = false;
                return;
            }

            const periodData = { periodType, fromDate, toDate };

            if (periodType === 'batbuoc') {
                periodData.salaryType = row.querySelector('.salary-type-select').value;
                if (periodData.salaryType === 'mucluong') {
                    periodData.mucluong = unformatNumber(row.querySelector('.salary-input').value);
                } else {
                    // Chuyển đổi dấu phẩy thành dấu chấm cho backend xử lý
                    periodData.heso = row.querySelector('[data-field="heso"]').value.replace(',', '.');
                    periodData.posAllowance = row.querySelector('[data-field="posAllowance"]').value.replace(',', '.');
                    periodData.exFrameAllowance = row.querySelector('[data-field="exFrameAllowance"]').value.replace(',', '.');
                    periodData.jobAllowance = row.querySelector('[data-field="jobAllowance"]').value.replace(',', '.');
                }
            } else if (periodType === 'tunguyen') {
                periodData.mucluong = unformatNumber(row.querySelector('.salary-input').value);
                periodData.voluntaryCategory = row.querySelector('.voluntary-category').value;
            }
            
            data.push(periodData);
        });

        if (!isValid) return null;

        // Kiểm tra các khoảng thời gian có bị trùng lặp không
        if (data.length > 1) {
            const dateRanges = data.map(p => {
                const start = new Date(p.fromDate.year, p.fromDate.month - 1, 1);
                const end = new Date(p.toDate.year, p.toDate.month - 1);
                // Lấy ngày cuối cùng của tháng để so sánh chính xác
                const lastDayOfMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
                end.setDate(lastDayOfMonth);
                return { start, end };
            }).sort((a, b) => a.start - b.start); // Sắp xếp theo ngày bắt đầu

            for (let i = 1; i < dateRanges.length; i++) {
                // Nếu ngày bắt đầu của giai đoạn hiện tại nhỏ hơn hoặc bằng ngày kết thúc của giai đoạn trước -> trùng lặp
                if (dateRanges[i].start <= dateRanges[i - 1].end) {
                    showError('Các giai đoạn không được trùng lặp thời gian. Vui lòng kiểm tra lại.');
                    return null; 
                }
            }
        }
        
        return data;
    };
    
    const showError = (message) => {
        errorContainer.style.display = 'block';
        errorContainer.querySelector('.alert').textContent = message;
    };
    
    const hideMessages = () => {
        errorContainer.style.display = 'none';
        resultContainer.style.display = 'none';
    };

    const toggleLoading = (isLoading) => {
        const spinner = calculateBtn.querySelector('.spinner-border');
        const btnText = calculateBtn.querySelector('.btn-text');
        if (isLoading) {
            spinner.style.display = 'inline-block';
            btnText.textContent = 'Đang tính toán...';
            calculateBtn.disabled = true;
        } else {
            spinner.style.display = 'none';
            btnText.textContent = 'Tính bảo hiểm xã hội';
            calculateBtn.disabled = false;
        }
    };

    calculateBtn.addEventListener('click', async () => {
        hideMessages();
        const data = collectData();

        if (!data) return; 

        if (data.length === 0) {
            showError('Vui lòng thêm ít nhất một giai đoạn đóng BHXH.');
            return;
        }

        toggleLoading(true);

        const body = `action=calculateBhxh1lan&data=${encodeURIComponent(JSON.stringify(data))}`;
        
        try {
            const res = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body
            });
            const result = await res.json();
            
            if (result.success) {
                resultAmountEl.textContent = result.amount || '0 VNĐ';
                resultTextEl.innerHTML = result.text ? result.text.replace(/\n/g, '<br>') : 'Không có diễn giải chi tiết.';
                resultContainer.style.display = 'block';
            } else {
                showError(result.error || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error("Calculation error:", error);
            showError('Lỗi kết nối đến máy chủ. Vui lòng kiểm tra lại mạng và thử lại.');
        } finally {
            toggleLoading(false);
        }
    });

    addCompulsoryBtn.addEventListener('click', () => addPeriodRow('batbuoc'));
    addVoluntaryBtn.addEventListener('click', () => addPeriodRow('tunguyen'));
    addMaternityBtn.addEventListener('click', () => addPeriodRow('thaisan'));
    
    // Initial check in case of browser auto-fill
    validateAndSummarizePeriods();
});
