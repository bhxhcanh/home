// photo/script.js

function initPhotoEditor() {
    // --- Lấy các phần tử DOM ---
    const uploader = document.getElementById('uploader');
    const uploadInput = document.getElementById('upload-input');
    const editor = document.getElementById('editor');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    const tabBtns = document.querySelectorAll('.hinhanh-app-wrapper .tabs .tab-btn');
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
                    alert('Lỗi chuyển đổi file HEIC. Vui lòng thử ảnh khác.');
                    console.error(err);
                });
        } else if (file.type.startsWith('image/')) {
            loadImage(URL.createObjectURL(file));
        } else {
            alert('Không thể tải ảnh. File có thể bị lỗi hoặc không được hỗ trợ.');
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
        if (!confirm('Bạn có muốn tải ảnh mới không? Mọi thay đổi sẽ bị mất.')) return;

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

document.addEventListener('DOMContentLoaded', initPhotoEditor);
