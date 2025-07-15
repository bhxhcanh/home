document.addEventListener('DOMContentLoaded', () => {
    // THAY THẾ BẰNG URL WEB APP CỦA BẠN
    const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw98atO4DVVxrEUvvcgNrao_j0jSqCBRk-179yAwmdm8mlJIBSdvXc08BTxJWEtZWlUdA/exec';

    const generateBtn = document.getElementById('generate-btn');
    const qrContainer = document.getElementById('qrcode-container');
    const statusMessage = document.getElementById('status-message');

    // Nếu không tìm thấy nút generate, không thực hiện gì cả (để tránh lỗi trên các trang khác)
    if (!generateBtn) {
        return;
    }

    async function logToGoogleSheet(content) {
        try {
            await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors', // Sử dụng no-cors vì Google Apps Script không trả về CORS headers đúng cách cho POST đơn giản
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: content })
            });
            statusMessage.textContent = 'Tạo mã thành công!';
            statusMessage.style.color = 'green';
        } catch (error) {
            console.error('Error logging to Google Sheet:', error);
            statusMessage.textContent = 'Tạo mã thành công nhưng lỗi lưu log!';
            statusMessage.style.color = 'red';
        }
    }
    
    function generateQrCode() {
        const activeTab = document.querySelector('#qr-type-pills .nav-link.active');
        if (!activeTab) {
            statusMessage.textContent = 'Lỗi: Không tìm thấy tab nào đang hoạt động.';
            statusMessage.style.color = 'red';
            return;
        }
        
        const activePaneId = activeTab.getAttribute('data-bs-target');
        let qrContent = '';
        let isValid = true;
        let validationMessage = 'Vui lòng điền đầy đủ thông tin bắt buộc.';

        // Hàm để thoát các ký tự đặc biệt cho định dạng WiFi
        const escapeWifi = (str) => str.replace(/([\\;,"])/g, '\\$1');

        switch (activePaneId) {
            case '#qr-text-pane':
                qrContent = document.getElementById('qr-text-input').value.trim();
                if (!qrContent) isValid = false;
                break;
            
            case '#qr-url-pane':
                qrContent = document.getElementById('qr-url-input').value.trim();
                if (!qrContent) {
                    isValid = false;
                } else if (!qrContent.startsWith('http://') && !qrContent.startsWith('https://') && !qrContent.startsWith('mailto:') && !qrContent.startsWith('tel:')) {
                    // Tự động thêm http:// nếu không có giao thức nào được chỉ định
                    qrContent = 'https://' + qrContent;
                }
                break;

            case '#qr-wifi-pane':
                const ssid = document.getElementById('qr-wifi-ssid').value.trim();
                const password = document.getElementById('qr-wifi-password').value;
                const encryption = document.getElementById('qr-wifi-encryption').value;
                if (!ssid) {
                    isValid = false;
                    validationMessage = 'Tên mạng WiFi (SSID) là bắt buộc.';
                } else {
                    qrContent = `WIFI:T:${encryption};S:${escapeWifi(ssid)};P:${escapeWifi(password)};;`;
                }
                break;

            case '#qr-vcard-pane':
                const name = document.getElementById('qr-vcard-name').value.trim();
                const phone = document.getElementById('qr-vcard-phone').value.trim();
                const email = document.getElementById('qr-vcard-email').value.trim();
                const org = document.getElementById('qr-vcard-org').value.trim();
                if (!name && !phone && !email && !org) {
                    isValid = false;
                    validationMessage = 'Vui lòng nhập ít nhất một thông tin cho danh thiếp.';
                } else {
                    let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';
                    if (name) vcard += `FN:${name}\n`;
                    if (org) vcard += `ORG:${org}\n`;
                    if (phone) vcard += `TEL:${phone}\n`;
                    if (email) vcard += `EMAIL:${email}\n`;
                    vcard += 'END:VCARD';
                    qrContent = vcard;
                }
                break;
            
            default:
                isValid = false;
                validationMessage = 'Loại mã QR không được hỗ trợ.';
        }

        // Xóa mã QR cũ và thông báo
        qrContainer.innerHTML = '';
        statusMessage.textContent = '';
        
        if (!isValid) {
            statusMessage.textContent = validationMessage;
            statusMessage.style.color = 'red';
            return;
        }

        statusMessage.textContent = 'Đang tạo...';
        statusMessage.style.color = 'orange';

        try {
            new QRCode(qrContainer, {
                text: qrContent,
                width: 256,
                height: 256,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            // Ghi log ngay sau khi tạo thành công
            logToGoogleSheet(qrContent);
        } catch (e) {
            console.error("QR Code generation error:", e);
            statusMessage.textContent = 'Lỗi khi tạo mã QR. Dữ liệu có thể quá dài.';
            statusMessage.style.color = 'red';
        }
    }

    generateBtn.addEventListener('click', generateQrCode);
});
