
// assets/script_1lan.js
document.addEventListener('DOMContentLoaded', () => {
    // UPDATED SELECTORS WITH PREFIX 'bhxh-'
    const periodsContainer = document.getElementById('bhxh-periods-container');
    const addCompulsoryBtn = document.getElementById('bhxh-add-compulsory-btn');
    const addVoluntaryBtn = document.getElementById('bhxh-add-voluntary-btn');
    const addMaternityBtn = document.getElementById('bhxh-add-maternity-btn');
    const calculateBtn = document.getElementById('bhxh-calculate-btn');
    const resultContainer = document.getElementById('bhxh-result-container');
    const resultAmountEl = document.getElementById('bhxh-result-amount');
    const resultTextEl = document.getElementById('bhxh-result-text');
    const errorContainer = document.getElementById('bhxh-error-container');
    const totalParticipationTimeEl = document.getElementById('bhxh-total-participation-time');
    const warning2025El = document.getElementById('bhxh-warning-2025');
    
    if(!periodsContainer) return; // Guard clause if view not loaded

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
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const unformatNumber = (value) => {
        if (!value) return '';
        return value.toString().replace(/\./g, '');
    };
    
    const createRowHTML = (type, id) => {
        const isCompulsory = type === 'batbuoc';
        const isVoluntary = type === 'tunguyen';
        const isMaternity = type === 'thaisan';

        return `
            <div class="period-row" data-type="${type}" data-id="${id}">
                <div class="row w-100 g-2 align-items-center">
                    <div class="col-md-4">
                        <label class="form-label d-md-none">Giai đoạn</label>
                        <div class="date-range-wrapper">
                            <div class="date-group"><select class="form-select form-select-sm from-month">${monthOptions}</select><select class="form-select form-select-sm from-year">${yearOptions}</select></div>
                            <span class="date-separator">Đến</span>
                            <div class="date-group"><select class="form-select form-select-sm to-month">${monthOptions}</select><select class="form-select form-select-sm to-year">${yearOptions}</select></div>
                        </div>
                    </div>
                    <div class="col-md-5">
                         <label class="form-label d-md-none">Mức lương</label>
                         <div class="details-inputs-wrapper">
                            ${isCompulsory ? `
                                <select class="form-select form-select-sm salary-type-select" style="width: 120px;"><option value="mucluong" selected>Mức lương</option><option value="heso">Hệ số</option></select>
                                <div class="salary-inputs"><input type="text" class="form-control form-control-sm salary-input" placeholder="VD: 5.000.000"></div>
                                <div class="coefficient-inputs" style="display: none;"><div class="input-group input-group-sm"><input type="text" class="form-control" placeholder="Hệ số" data-field="heso"><input type="text" class="form-control" placeholder="PC CV" data-field="posAllowance"><input type="text" class="form-control" placeholder="TN VK" data-field="exFrameAllowance"><input type="text" class="form-control" placeholder="TN Nghề" data-field="jobAllowance"></div></div>
                            ` : ''}
                            ${isVoluntary ? `<input type="text" class="form-control form-control-sm salary-input" placeholder="Thu nhập tháng">` : ''}
                            ${isMaternity ? `<div class="maternity-text w-100 text-center">Thai sản</div>` : ''}
                         </div>
                    </div>
                    <div class="col-md-2">
                        ${isVoluntary ? `<label class="form-label d-md-none">Đối tượng</label><select class="form-select form-select-sm voluntary-category"><option value="Khác">Khác</option><option value="Hộ nghèo">Hộ nghèo</option><option value="Cận nghèo">Cận nghèo</option><option value="Dân tộc">Dân tộc</option></select>` : ''}
                    </div>
                    <div class="col-md-1 text-end"><button type="button" class="btn btn-sm btn-outline-danger delete-row-btn"><i class="bi bi-trash"></i></button></div>
                </div>
            </div>
        `;
    };

    const addPeriodRow = (type) => {
        const newId = Date.now();
        periodsContainer.insertAdjacentHTML('beforeend', createRowHTML(type, newId));
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
                element: row, fromMonthEl, fromYearEl,
                from: new Date(fromYearEl.value, fromMonthEl.value - 1, 1),
                to: new Date(row.querySelector('.to-year').value, row.querySelector('.to-month').value - 1, 1),
            }
        }).sort((a, b) => a.from - b.from);

        let totalMonths = 0;
        let firstParticipationDate = periods.length > 0 ? periods[0].from : null;

        periods.forEach((period, index) => {
            period.fromMonthEl.classList.remove('non-consecutive');
            period.fromYearEl.classList.remove('non-consecutive');
            if (period.to >= period.from) {
                 totalMonths += (period.to.getFullYear() - period.from.getFullYear()) * 12 + (period.to.getMonth() - period.from.getMonth()) + 1;
            }
            if (index > 0) {
                const prevPeriod = periods[index - 1];
                const expectedFromDate = new Date(prevPeriod.to.getFullYear(), prevPeriod.to.getMonth() + 1, 1);
                if (period.from > expectedFromDate) {
                     period.fromMonthEl.classList.add('non-consecutive');
                     period.fromYearEl.classList.add('non-consecutive');
                }
            }
        });

        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;
        totalParticipationTimeEl.textContent = `Tổng thời gian: ${years} năm ${months} tháng`;

        const warningDate = new Date(2025, 6, 1);
        if (firstParticipationDate && firstParticipationDate >= warningDate) {
            warning2025El.style.display = 'block';
        } else {
            warning2025El.style.display = 'none';
        }
    };

    periodsContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('salary-type-select')) {
            const row = e.target.closest('.period-row');
            if (e.target.value === 'heso') {
                row.querySelector('.salary-inputs').style.display = 'none';
                row.querySelector('.coefficient-inputs').style.display = 'block';
            } else {
                row.querySelector('.salary-inputs').style.display = 'block';
                row.querySelector('.coefficient-inputs').style.display = 'none';
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
        if (e.target.classList.contains('salary-input')) {
            const unformatted = unformatNumber(e.target.value);
            if (!isNaN(unformatted) && unformatted) e.target.value = formatNumber(unformatted);
            else if (!unformatted) e.target.value = '';
        }
        if (e.target.matches('[data-field="heso"], [data-field="posAllowance"], [data-field="exFrameAllowance"], [data-field="jobAllowance"]')) {
             let value = e.target.value.replace(/\./g, ',').replace(/[^0-9,]/g, '');
             const firstCommaIndex = value.indexOf(',');
             if (firstCommaIndex !== -1) {
                 const integerPart = value.substring(0, firstCommaIndex);
                 const decimalPart = value.substring(firstCommaIndex + 1).replace(/,/g, '');
                 value = integerPart + ',' + decimalPart;
             }
             e.target.value = value;
        }
    });

    const collectData = () => {
        const rows = periodsContainer.querySelectorAll('.period-row');
        const data = [];
        let isValid = true;
        errorContainer.style.display = 'none'; resultContainer.style.display = 'none';

        rows.forEach(row => {
            if (!isValid) return;
            const periodType = row.dataset.type;
            const fromDate = { month: row.querySelector('.from-month').value, year: row.querySelector('.from-year').value };
            const toDate = { month: row.querySelector('.to-month').value, year: row.querySelector('.to-year').value };

            if (new Date(toDate.year, toDate.month - 1) < new Date(fromDate.year, fromDate.month - 1)) {
                errorContainer.style.display = 'block'; errorContainer.querySelector('.alert').textContent = 'Ngày kết thúc phải lớn hơn ngày bắt đầu.';
                isValid = false; return;
            }

            const periodData = { periodType, fromDate, toDate };
            if (periodType === 'batbuoc') {
                periodData.salaryType = row.querySelector('.salary-type-select').value;
                if (periodData.salaryType === 'mucluong') {
                    periodData.mucluong = unformatNumber(row.querySelector('.salary-input').value);
                } else {
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
        return isValid ? data : null;
    };

    calculateBtn.addEventListener('click', async () => {
        errorContainer.style.display = 'none';
        const data = collectData();
        if (!data) return;
        if (data.length === 0) { errorContainer.style.display = 'block'; errorContainer.querySelector('.alert').textContent = 'Thêm ít nhất 1 giai đoạn.'; return; }

        calculateBtn.disabled = true;
        calculateBtn.querySelector('.spinner-border').style.display = 'inline-block';
        calculateBtn.querySelector('.btn-text').textContent = 'Đang tính...';

        const body = `action=calculateBhxh1lan&data=${encodeURIComponent(JSON.stringify(data))}`;
        try {
            const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body });
            const result = await res.json();
            if (result.success) {
                resultAmountEl.textContent = result.amount || '0 VNĐ';
                resultTextEl.innerHTML = result.text ? result.text.replace(/\n/g, '<br>') : 'Không có diễn giải.';
                resultContainer.style.display = 'block';
            } else {
                errorContainer.style.display = 'block'; errorContainer.querySelector('.alert').textContent = result.error || 'Lỗi.';
            }
        } catch (error) {
            errorContainer.style.display = 'block'; errorContainer.querySelector('.alert').textContent = 'Lỗi kết nối.';
        } finally {
            calculateBtn.disabled = false;
            calculateBtn.querySelector('.spinner-border').style.display = 'none';
            calculateBtn.querySelector('.btn-text').textContent = 'Tính bảo hiểm xã hội';
        }
    });

    addCompulsoryBtn.addEventListener('click', () => addPeriodRow('batbuoc'));
    addVoluntaryBtn.addEventListener('click', () => addPeriodRow('tunguyen'));
    addMaternityBtn.addEventListener('click', () => addPeriodRow('thaisan'));
    validateAndSummarizePeriods();
});
