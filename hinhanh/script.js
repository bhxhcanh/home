document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const uploaderSection = document.getElementById('uploader');
    const editorSection = document.getElementById('editor');
    const uploadInput = document.getElementById('upload-input');
    const uploadLabel = document.querySelector('.upload-label');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Resize controls
    const widthInput = document.getElementById('width-input');
    const heightInput = document.getElementById('height-input');
    const aspectRatioLock = document.getElementById('aspect-ratio-lock');
    const applyResizeBtn = document.getElementById('apply-resize-btn');

    // Crop controls
    const applyCropBtn = document.getElementById('apply-crop-btn');
    const cropXInput = document.getElementById('crop-x');
    const cropYInput = document.getElementById('crop-y');
    const cropWidthInput = document.getElementById('crop-width');
    const cropHeightInput = document.getElementById('crop-height');
    const cropInputs = [cropXInput, cropYInput, cropWidthInput, cropHeightInput];
    const aspectBtns = document.querySelectorAll('.aspect-btn');

    // Rotate controls
    const rotateLeftBtn = document.getElementById('rotate-left-btn');
    const rotateRightBtn = document.getElementById('rotate-right-btn');
    
    // Censor (Pixelate) controls
    const applyCensorBtn = document.getElementById('apply-censor-btn');
    const pixelateSlider = document.getElementById('pixelate-intensity-slider');
    const pixelateValue = document.getElementById('pixelate-value');

    // Export controls
    const formatSelect = document.getElementById('format-select');
    const qualityControl = document.getElementById('quality-control');
    const qualitySlider = document.getElementById('quality-slider');
    const qualityValue = document.getElementById('quality-value');
    const estimatedSizeEl = document.getElementById('estimated-size');
    const downloadBtn = document.getElementById('download-btn');
    
    // Footer Buttons
    const resetBtn = document.getElementById('reset-btn');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');

    // State
    let originalImage = new Image();
    let editedImage = new Image();
    let originalAspectRatio = 1;

    // Tool State
    let activeTool = 'none'; // 'crop', 'censor'
    let isDragging = false;
    let selectionRect = { startX: 0, startY: 0, width: 0, height: 0, x: 0, y: 0, w: 0, h: 0 };
    let cropAspectRatio = 'free';
    
    // History State
    let historyStack = [];
    let redoStack = [];
    
    // --- UTILITY FUNCTIONS ---
    
    const debounce = (func, delay) => {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    };

    // --- UPLOAD & INITIALIZATION ---

    const handleImageUpload = (file) => {
        if (!file) {
            alert('Vui lòng chọn một tệp.');
            return;
        }

        const fileName = file.name.toLowerCase();
        const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif');

        if (isHeic) {
            if (typeof heic2any === 'undefined') {
                alert('Thư viện chuyển đổi HEIC chưa sẵn sàng. Vui lòng thử lại.');
                return;
            }
            uploadLabel.querySelector('span').textContent = 'Đang chuyển đổi ảnh HEIC...';
            heic2any({
                blob: file,
                toType: "image/png",
                quality: 0.9,
            })
            .then(conversionResult => {
                processImageFile(conversionResult);
                uploadLabel.querySelector('span').textContent = 'Nhấp để tải lên hoặc kéo & thả';
            })
            .catch(err => {
                console.error(err);
                alert('Đã xảy ra lỗi khi chuyển đổi tệp HEIC. Tệp có thể bị hỏng hoặc không được hỗ trợ.');
                uploadLabel.querySelector('span').textContent = 'Nhấp để tải lên hoặc kéo & thả';
            });
            return;
        }

        if (!file.type.startsWith('image/')) {
            alert('Vui lòng chọn một tệp hình ảnh hợp lệ.');
            return;
        }
        processImageFile(file);
    };

    const processImageFile = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage.src = e.target.result;
            originalImage.onload = () => {
                editedImage.src = originalImage.src;
                editedImage.onload = setupEditor;
            };
        };
        reader.readAsDataURL(file);
    };
    
    const setupEditor = () => {
        originalAspectRatio = editedImage.naturalWidth / editedImage.naturalHeight;
        updateCanvas(editedImage);
        updateResizeInputs();
        uploaderSection.classList.add('hidden');
        editorSection.classList.remove('hidden');
        activateTab('resize');
        applyCropBtn.disabled = true;
        historyStack = [];
        redoStack = [];
        updateUndoRedoButtons();
        updateEstimatedSize();
    };
    
    const updateCanvas = (imageSource) => {
        canvas.width = imageSource.naturalWidth;
        canvas.height = imageSource.naturalHeight;
        ctx.drawImage(imageSource, 0, 0, imageSource.naturalWidth, imageSource.naturalHeight);
    };
    
    const updateResizeInputs = () => {
        widthInput.value = editedImage.width;
        heightInput.value = editedImage.height;
    }

    const resetEditor = () => {
        uploaderSection.classList.remove('hidden');
        editorSection.classList.add('hidden');
        uploadInput.value = '';
        originalImage = new Image();
        editedImage = new Image();
        activeTool = 'none';
        historyStack = [];
        redoStack = [];
    };

    // --- EVENT LISTENERS ---

    uploadInput.addEventListener('change', (e) => handleImageUpload(e.target.files[0]));
    
    uploadLabel.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadLabel.classList.add('dragover');
    });
    uploadLabel.addEventListener('dragleave', () => uploadLabel.classList.remove('dragover'));
    uploadLabel.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadLabel.classList.remove('dragover');
        handleImageUpload(e.dataTransfer.files[0]);
    });

    tabs.forEach(tab => tab.addEventListener('click', () => activateTab(tab.dataset.tab)));

    widthInput.addEventListener('input', () => handleDimensionChange('width'));
    heightInput.addEventListener('input', () => handleDimensionChange('height'));
    applyResizeBtn.addEventListener('click', applyResize);
    
    aspectBtns.forEach(btn => btn.addEventListener('click', (e) => {
        aspectBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        cropAspectRatio = e.currentTarget.dataset.ratio;
    }));
    
    canvas.addEventListener('mousedown', startSelection);
    canvas.addEventListener('mousemove', dragSelection);
    canvas.addEventListener('mouseup', endSelection);
    canvas.addEventListener('mouseleave', endSelection);
    applyCropBtn.addEventListener('click', applyCrop);
    cropInputs.forEach(input => input.addEventListener('input', handleCropInputChange));
    
    rotateLeftBtn.addEventListener('click', () => rotateImage(-90));
    rotateRightBtn.addEventListener('click', () => rotateImage(90));

    pixelateSlider.addEventListener('input', () => pixelateValue.textContent = pixelateSlider.value);
    applyCensorBtn.addEventListener('click', applyPixelate);

    formatSelect.addEventListener('change', () => {
        toggleQualitySlider();
        updateEstimatedSize();
    });
    qualitySlider.addEventListener('input', () => {
        qualityValue.textContent = qualitySlider.value;
        debouncedUpdateSize();
    });
    downloadBtn.addEventListener('click', downloadImage);
    
    resetBtn.addEventListener('click', resetEditor);
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);


    // --- HISTORY (UNDO/REDO) LOGIC ---
    
    function saveState() {
        redoStack = [];
        historyStack.push(editedImage.src);
        updateUndoRedoButtons();
    }
    
    function updateUndoRedoButtons() {
        undoBtn.disabled = historyStack.length === 0;
        redoBtn.disabled = redoStack.length === 0;
    }

    function undo() {
        if (historyStack.length === 0) return;
        redoStack.push(editedImage.src);
        const prevState = historyStack.pop();
        editedImage.src = prevState;
        editedImage.onload = () => {
            handleImageStateChange();
            updateUndoRedoButtons();
        };
    }
    
    function redo() {
        if (redoStack.length === 0) return;
        historyStack.push(editedImage.src);
        const nextState = redoStack.pop();
        editedImage.src = nextState;
        editedImage.onload = () => {
            handleImageStateChange();
            updateUndoRedoButtons();
        };
    }
    
    function handleImageStateChange() {
        originalAspectRatio = editedImage.width / editedImage.height;
        updateCanvas(editedImage);
        updateResizeInputs();
        resetSelection();
        updateEstimatedSize();
    }

    // --- TAB LOGIC ---

    function activateTab(tabName) {
        activeTool = ['crop', 'censor'].includes(tabName) ? tabName : 'none';

        tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
        tabContents.forEach(content => content.classList.toggle('active', content.id === `${tabName}-controls`));
        
        canvas.classList.remove('cropping-cursor', 'censoring-cursor');
        if (activeTool === 'crop') canvas.classList.add('cropping-cursor');
        if (activeTool === 'censor') canvas.classList.add('censoring-cursor');

        resetSelection();
        redrawCanvasWithOverlay(); 
    }
    
    function resetSelection() {
        isDragging = false;
        selectionRect = { startX: 0, startY: 0, width: 0, height: 0, x: 0, y: 0, w: 0, h: 0 };
        applyCropBtn.disabled = true;
        applyCensorBtn.disabled = true;
        updateCropInputs();
        redrawCanvasWithOverlay();
    }


    // --- RESIZE LOGIC ---
    
    function handleDimensionChange(changed) {
        if (!aspectRatioLock.checked) return;
        const width = parseInt(widthInput.value);
        const height = parseInt(heightInput.value);

        if (changed === 'width' && width > 0) {
            heightInput.value = Math.round(width / originalAspectRatio);
        } else if (changed === 'height' && height > 0) {
            widthInput.value = Math.round(height * originalAspectRatio);
        }
    }
    
    function applyResize() {
        const width = parseInt(widthInput.value);
        const height = parseInt(heightInput.value);

        if (width <= 0 || height <= 0 || !width || !height) {
            alert('Vui lòng nhập kích thước hợp lệ.');
            return;
        }
        
        saveState();

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = width;
        tempCanvas.height = height;
        tempCtx.drawImage(editedImage, 0, 0, width, height);

        editedImage.src = tempCanvas.toDataURL();
        editedImage.onload = handleImageStateChange;
    }
    
    // --- SELECTION LOGIC (for CROP & CENSOR) ---
    
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
          x: (e.clientX - rect.left) * (canvas.width / rect.width),
          y: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
    }
    
    function startSelection(e) {
        if (activeTool === 'none') return;
        e.preventDefault();
        isDragging = true;
        const pos = getMousePos(e);
        selectionRect.startX = pos.x;
        selectionRect.startY = pos.y;
        selectionRect.width = 0;
        selectionRect.height = 0;
        applyCropBtn.disabled = true;
        applyCensorBtn.disabled = true;
    }

    function dragSelection(e) {
        if (activeTool === 'none' || !isDragging) return;
        e.preventDefault();
        const pos = getMousePos(e);

        if (activeTool === 'crop' && cropAspectRatio !== 'free') {
            const [ratioW, ratioH] = cropAspectRatio.split(',').map(Number);
            const aspectRatio = ratioW / ratioH;
            
            let newWidth = pos.x - selectionRect.startX;
            let newHeight = newWidth / aspectRatio;
            
            selectionRect.width = newWidth;
            selectionRect.height = newHeight;
        } else {
            selectionRect.width = pos.x - selectionRect.startX;
            selectionRect.height = pos.y - selectionRect.startY;
        }
        
        updateSelectionRectDimensions();
        redrawCanvasWithOverlay();
        if (activeTool === 'crop') {
            updateCropInputs();
        }
    }

    function endSelection() {
        if (activeTool === 'none' || !isDragging) return;
        isDragging = false;
        if (selectionRect.w > 10 && selectionRect.h > 10) {
           if (activeTool === 'crop') applyCropBtn.disabled = false;
           if (activeTool === 'censor') applyCensorBtn.disabled = false;
        } else {
           resetSelection();
        }
    }
    
    function updateSelectionRectDimensions() {
        selectionRect.x = selectionRect.width > 0 ? selectionRect.startX : selectionRect.startX + selectionRect.width;
        selectionRect.y = selectionRect.height > 0 ? selectionRect.startY : selectionRect.startY + selectionRect.height;
        selectionRect.w = Math.abs(selectionRect.width);
        selectionRect.h = Math.abs(selectionRect.height);
    }
    
    function redrawCanvasWithOverlay() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(editedImage, 0, 0, canvas.width, canvas.height);

        if (activeTool === 'none' || selectionRect.w < 1 || selectionRect.h < 1 ) return;

        if (activeTool === 'crop') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.clearRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
            ctx.strokeStyle = '#007bff';
            ctx.lineWidth = 2;
            ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
        } else if (activeTool === 'censor') {
            ctx.strokeStyle = '#ffc107'; // Yellow
            ctx.lineWidth = 2;
            ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
        }
    }

    // --- CROP LOGIC ---
    
    function updateCropInputs() {
        cropXInput.value = Math.round(selectionRect.x);
        cropYInput.value = Math.round(selectionRect.y);
        cropWidthInput.value = Math.round(selectionRect.w);
        cropHeightInput.value = Math.round(selectionRect.h);
    }
    
    function handleCropInputChange() {
        selectionRect.x = parseInt(cropXInput.value) || 0;
        selectionRect.y = parseInt(cropYInput.value) || 0;
        selectionRect.w = parseInt(cropWidthInput.value) || 0;
        selectionRect.h = parseInt(cropHeightInput.value) || 0;
        
        selectionRect.startX = selectionRect.x;
        selectionRect.startY = selectionRect.y;
        selectionRect.width = selectionRect.w;
        selectionRect.height = selectionRect.h;

        applyCropBtn.disabled = selectionRect.w <= 0 || selectionRect.h <= 0;
        redrawCanvasWithOverlay();
    }
    
    function applyCrop() {
        if (selectionRect.w < 1 || selectionRect.h < 1) return;
        saveState();
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = selectionRect.w;
        tempCanvas.height = selectionRect.h;
        
        tempCtx.drawImage(editedImage, selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h, 0, 0, selectionRect.w, selectionRect.h);
        
        editedImage.src = tempCanvas.toDataURL();
        editedImage.onload = handleImageStateChange;
    }

    // --- ROTATE LOGIC ---

    function rotateImage(degrees) {
        saveState();
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCanvas.width = editedImage.height;
        tempCanvas.height = editedImage.width;
        
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.rotate(degrees * Math.PI / 180);
        tempCtx.drawImage(editedImage, -editedImage.width / 2, -editedImage.height / 2);
        
        editedImage.src = tempCanvas.toDataURL();
        editedImage.onload = handleImageStateChange;
    }

    // --- CENSOR (PIXELATE) LOGIC ---
    
    function applyPixelate() {
        if (selectionRect.w < 1 || selectionRect.h < 1) return;
        saveState();

        const pixelSize = parseInt(pixelateSlider.value, 10);
        const x = Math.round(selectionRect.x);
        const y = Math.round(selectionRect.y);
        const w = Math.round(selectionRect.w);
        const h = Math.round(selectionRect.h);

        // Turn off image smoothing to get crisp pixels
        ctx.imageSmoothingEnabled = false;

        // Downscale the selected region to a tiny size
        const smallW = Math.max(1, Math.round(w / pixelSize));
        const smallH = Math.max(1, Math.round(h / pixelSize));
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = smallW;
        tempCanvas.height = smallH;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, x, y, w, h, 0, 0, smallW, smallH);

        // Draw the tiny version back onto the main canvas.
        // The browser will scale it up, creating the pixelated effect.
        ctx.drawImage(tempCanvas, 0, 0, smallW, smallH, x, y, w, h);

        // Turn image smoothing back on for other operations
        ctx.imageSmoothingEnabled = true;

        editedImage.src = canvas.toDataURL();
        editedImage.onload = () => {
            handleImageStateChange();
        };
    }


    // --- EXPORT LOGIC ---
    
    function toggleQualitySlider() {
        const format = formatSelect.value;
        qualityControl.style.display = (format === 'image/jpeg' || format === 'image/webp') ? 'flex' : 'none';
    }
    
    const debouncedUpdateSize = debounce(updateEstimatedSize, 250);

    function updateEstimatedSize() {
        const format = formatSelect.value;
        const quality = (format === 'image/jpeg' || format === 'image/webp') ? parseFloat(qualitySlider.value) : undefined;

        const dataUrl = canvas.toDataURL(format, quality);
        const head = `data:${format};base64,`;
        const bytes = Math.round((dataUrl.length - head.length) * 3 / 4);

        if (bytes > 1024 * 1024) {
            estimatedSizeEl.textContent = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        } else if (bytes > 1024) {
            estimatedSizeEl.textContent = `${(bytes / 1024).toFixed(1)} KB`;
        } else {
            estimatedSizeEl.textContent = `${bytes} Bytes`;
        }
    }

    function downloadImage() {
        const format = formatSelect.value;
        const quality = parseFloat(qualitySlider.value);
        const extension = format.split('/')[1];
        
        const dataUrl = canvas.toDataURL(format, quality);
        
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `edited-image.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Initial setup
    toggleQualitySlider();
});
