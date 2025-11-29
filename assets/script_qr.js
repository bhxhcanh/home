
// assets/script_qr.js

function initQRCodeTool() {
    const generateBtn = document.getElementById('generate-btn');
    const qrCodeContainer = document.getElementById('qrcode-container');
    const statusMessage = document.getElementById('status-message');
    const qrPills = document.querySelectorAll('#qr-type-pills .nav-link');

    const textInput = document.getElementById('qr-text-input');
    const urlInput = document.getElementById('qr-url-input');
    const wifiSsidInput = document.getElementById('qr-wifi-ssid');
    const wifiPasswordInput = document.getElementById('qr-wifi-password');
    const wifiEncryptionSelect = document.getElementById('qr-wifi-encryption');
    const vcardNameInput = document.getElementById('qr-vcard-name');
    const vcardPhoneInput = document.getElementById('qr-vcard-phone');
    const vcardEmailInput = document.getElementById('qr-vcard-email');
    const vcardOrgInput = document.getElementById('qr-vcard-org');

    const uploader = document.getElementById('qr-reader-uploader');
    const uploadInput = document.getElementById('qr-upload-input');
    const resultContainer = document.getElementById('qr-reader-result-container');
    const resultText = document.getElementById('qr-reader-result-text');
    
    if (!generateBtn) return; // Guard if view not loaded

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
                if (data && !data.startsWith('http://') && !data.startsWith('https://')) data = 'https://' + data;
                break;
            case 'qr-wifi-pane':
                const ssid = wifiSsidInput.value;
                if (ssid) data = `WIFI:T:${wifiEncryptionSelect.value};S:${ssid};P:${wifiPasswordInput.value};;`;
                break;
            case 'qr-vcard-pane':
                const name = vcardNameInput.value;
                if (name || vcardPhoneInput.value || vcardEmailInput.value) {
                    data = `BEGIN:VCARD\nVERSION:3.0\nN:${name||''}\n`;
                    if(vcardOrgInput.value) data += `ORG:${vcardOrgInput.value}\n`;
                    if(vcardPhoneInput.value) data += `TEL:${vcardPhoneInput.value}\n`;
                    if(vcardEmailInput.value) data += `EMAIL:${vcardEmailInput.value}\n`;
                    data += `END:VCARD`;
                }
                break;
        }

        if (data) {
            try {
                 QrCreator.render({ text: data, size: 256, ecLevel: 'H', fill: '#000000', background: '#ffffff' }, qrCodeContainer);
            } catch (error) { statusMessage.textContent = 'Dữ liệu quá dài.'; }
        } else {
             if (activeQrTab !== 'qr-read-pane') statusMessage.textContent = 'Vui lòng nhập dữ liệu.';
        }
    }

    generateBtn.addEventListener('click', generateQrCode);

    function handleQrFile(file) {
        if (!file || !file.type.startsWith('image/')) { alert('Vui lòng chọn ảnh.'); return; }
        resultContainer.style.display = 'none';
        resultText.textContent = '';
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                canvas.width = img.width; canvas.height = img.height;
                ctx.drawImage(img, 0, 0, img.width, img.height);
                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code) { resultText.textContent = code.data; resultContainer.style.display = 'block'; }
                else { alert('Không tìm thấy QR.'); }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    if(uploadInput) uploadInput.addEventListener('change', (e) => handleQrFile(e.target.files[0]));
    if(uploader) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => uploader.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); }, false));
        uploader.addEventListener('drop', (e) => handleQrFile(e.dataTransfer.files[0]), false);
    }

    qrPills.forEach(pill => {
        pill.addEventListener('shown.bs.tab', (event) => {
            const newActiveTabId = event.target.getAttribute('aria-controls');
            generateBtn.style.display = (newActiveTabId === 'qr-read-pane') ? 'none' : 'block';
            qrCodeContainer.innerHTML = ''; statusMessage.textContent = ''; resultContainer.style.display = 'none'; resultText.textContent = ''; uploadInput.value = '';
        });
    });
}
document.addEventListener('DOMContentLoaded', initQRCodeTool);
