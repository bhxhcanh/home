

// assets/script_photo.js

function initPhotoEditor() {
    const uploader = document.getElementById('uploader');
    const uploadInput = document.getElementById('upload-input');
    const editor = document.getElementById('editor');
    const canvas = document.getElementById('canvas');
    if (!canvas) return; // Guard
    const ctx = canvas.getContext('2d');

    const tabBtns = document.querySelectorAll('.hinhanh-app-wrapper .tabs .tab-btn');
    const tabContents = document.querySelectorAll('.controls-main .tab-content');

    const widthInput = document.getElementById('width-input');
    const heightInput = document.getElementById('height-input');
    const aspectRatioLock = document.getElementById('aspect-ratio-lock');
    const applyResizeBtn = document.getElementById('apply-resize-btn');

    const cropInputs = { x: document.getElementById('crop-x'), y: document.getElementById('crop-y'), width: document.getElementById('crop-width'), height: document.getElementById('crop-height') };
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

    let currentImageState = null, history = [], historyIndex = -1, activeTab = 'resize', originalAspectRatio = 1;
    let cropRect = null, isDraggingCropBox = false, cropDragStart = { x: 0, y: 0 }, activeCropHandle = null, currentCropAspectRatio = 'free';
    const CROP_HANDLE_SIZE = 12;
    let previewRotationAngle = 0;
    let censorAreas = [], isDrawingCensor = false, currentCensorRect = null, censorDragStart = { x: 0, y: 0 };

    function init() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
             uploader.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); }, false);
             document.body.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); }, false);
        });
        uploader.addEventListener('drop', e => handleFiles(e.dataTransfer.files), false);
        uploadInput.addEventListener('change', e => handleFiles(e.target.files));
        resetBtn.addEventListener('click', resetEditor);
        undoBtn.addEventListener('click', undo);
        redoBtn.addEventListener('click', redo);
        tabBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
        setupControls();
    }

    function handleFiles(files) {
        if (files.length === 0) return;
        let file = files[0];
        if (/\.(heic|heif)$/i.test(file.name)) {
            heic2any({ blob: file, toType: "image/png" }).then(res => loadImage(URL.createObjectURL(res))).catch(err => alert('Lỗi HEIC'));
        } else if (file.type.startsWith('image/')) {
            loadImage(URL.createObjectURL(file));
        } else alert('File không hỗ trợ');
    }

    function loadImage(src) {
        const img = new Image();
        img.onload = () => {
            originalAspectRatio = img.width / img.height;
            resetEditorState();
            addHistoryState({ image: img, width: img.width, height: img.height }, true);
            uploader.classList.add('d-none'); editor.classList.remove('d-none'); switchTab('resize');
        };
        img.src = src;
    }

    function resetEditor() {
        if (!confirm('Tải ảnh mới?')) return;
        uploader.classList.remove('d-none'); editor.classList.add('d-none'); uploadInput.value = ''; resetEditorState();
    }

    function resetEditorState() {
        currentImageState = null; history = []; historyIndex = -1;
        updateHistoryButtons(); resetCropState(); resetRotationPreview(); resetCensorState();
    }

    function addHistoryState(state, isInitial = false) {
        if (historyIndex < history.length - 1) history = history.slice(0, historyIndex + 1);
        history.push(state); historyIndex++; setCurrentState(state);
        if (!isInitial) updateHistoryButtons();
    }
    function setCurrentState(state) { currentImageState = state; widthInput.value = state.width; heightInput.value = state.height; drawCanvas(); updateEstimatedSize(); }
    function undo() { if (historyIndex > 0) { historyIndex--; setCurrentState(history[historyIndex]); updateHistoryButtons(); } }
    function redo() { if (historyIndex < history.length - 1) { historyIndex++; setCurrentState(history[historyIndex]); updateHistoryButtons(); } }
    function updateHistoryButtons() { undoBtn.disabled = historyIndex <= 0; redoBtn.disabled = historyIndex >= history.length - 1; }

    function drawCanvas() {
        if (!currentImageState) return;
        const img = currentImageState.image;
        const cont = document.querySelector('.canvas-container');
        const scale = Math.min(cont.clientWidth / img.width, cont.clientHeight / img.height, 1);
        canvas.width = img.width * scale; canvas.height = img.height * scale;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        if (activeTab === 'rotate' && previewRotationAngle !== 0) {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(previewRotationAngle * Math.PI / 180);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        if (activeTab === 'crop' && cropRect) drawCropUI();
        if (activeTab === 'censor') drawCensorUI();
    }

    function switchTab(tabId) {
        if (activeTab === 'crop') resetCropState();
        if (activeTab === 'rotate') resetRotationPreview();
        if (activeTab === 'censor') resetCensorState();
        activeTab = tabId;
        tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
        tabContents.forEach(content => content.classList.toggle('active', content.id.startsWith(tabId)));
        
        canvas.onmousedown = null; canvas.onmousemove = null; canvas.onmouseup = null; canvas.onmouseleave = null; canvas.style.cursor = 'default';
        if (tabId === 'crop') {
            initializeCropRect(); canvas.onmousedown = handleCropMouseDown; canvas.onmousemove = handleCropMouseMove; canvas.onmouseup = handleCropMouseUp; canvas.onmouseleave = handleCropMouseUp;
        } else if (tabId === 'censor') {
            canvas.style.cursor = 'crosshair'; canvas.onmousedown = handleCensorMouseDown; canvas.onmousemove = handleCensorMouseMove; canvas.onmouseup = handleCensorMouseUp; canvas.onmouseleave = handleCensorMouseUp;
        }
        drawCanvas();
    }

    function setupControls() {
        // Resize
        applyResizeBtn.addEventListener('click', () => {
            const w = parseInt(widthInput.value), h = parseInt(heightInput.value);
            const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
            tmp.getContext('2d').drawImage(currentImageState.image, 0, 0, w, h);
            const img = new Image(); img.onload = () => addHistoryState({image: img, width: w, height: h}); img.src = tmp.toDataURL();
        });
        widthInput.addEventListener('change', () => { if(aspectRatioLock.checked) heightInput.value = Math.round(widthInput.value / originalAspectRatio); });
        heightInput.addEventListener('change', () => { if(aspectRatioLock.checked) widthInput.value = Math.round(heightInput.value * originalAspectRatio); });

        // Crop
        applyCropBtn.addEventListener('click', () => {
            if (!cropRect) return;
            const tmp = document.createElement('canvas'); tmp.width = cropRect.width; tmp.height = cropRect.height;
            tmp.getContext('2d').drawImage(currentImageState.image, cropRect.x, cropRect.y, cropRect.width, cropRect.height, 0, 0, cropRect.width, cropRect.height);
            const img = new Image(); img.onload = () => { addHistoryState({image: img, width: img.width, height: img.height}); switchTab('resize'); }; img.src = tmp.toDataURL();
        });
        aspectBtns.forEach(btn => btn.addEventListener('click', e => {
            aspectBtns.forEach(b => b.classList.remove('active')); e.target.classList.add('active');
            const ratio = e.target.dataset.ratio;
            if(ratio === 'free') currentCropAspectRatio = 'free';
            else { const [w, h] = ratio.split(','); currentCropAspectRatio = w/h; adjustCropRect(); drawCanvas(); }
        }));
        Object.values(cropInputs).forEach(inp => inp.addEventListener('change', () => {
             cropRect.x = parseInt(cropInputs.x.value); cropRect.y = parseInt(cropInputs.y.value); 
             cropRect.width = parseInt(cropInputs.width.value); cropRect.height = parseInt(cropInputs.height.value);
             drawCanvas();
        }));

        // Rotate
        rotationSlider.addEventListener('input', () => { previewRotationAngle = parseInt(rotationSlider.value); rotationValue.textContent = previewRotationAngle; drawCanvas(); });
        applyRotateBtn.addEventListener('click', () => { if(previewRotationAngle) applyRotation(previewRotationAngle); });
        resetRotateBtn.addEventListener('click', resetRotationPreview);
        rotateLeftBtn.addEventListener('click', () => applyRotation(-90));
        rotateRightBtn.addEventListener('click', () => applyRotation(90));

        // Censor
        pixelateSlider.addEventListener('input', () => pixelateValue.textContent = pixelateSlider.value);
        applyCensorBtn.addEventListener('click', applyCensor);

        // Export
        formatSelect.addEventListener('change', () => { qualityControl.style.display = formatSelect.value === 'image/jpeg' ? 'block' : 'none'; updateEstimatedSize(); });
        qualitySlider.addEventListener('input', () => { qualityValue.textContent = qualitySlider.value; updateEstimatedSize(); });
        downloadBtn.addEventListener('click', () => {
            const tmp = document.createElement('canvas'); tmp.width = currentImageState.width; tmp.height = currentImageState.height;
            tmp.getContext('2d').drawImage(currentImageState.image, 0, 0);
            const link = document.createElement('a'); link.download = 'edited_image.' + formatSelect.value.split('/')[1];
            link.href = tmp.toDataURL(formatSelect.value, parseFloat(qualitySlider.value)); link.click();
        });
        qualityControl.style.display = 'block';
    }

    // --- Helpers ---
    function getCanvasCoords(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function canvasToImageCoords(c) { const s = canvas.width / currentImageState.width; return { x: c.x / s, y: c.y / s }; }
    function initializeCropRect() {
        if (!currentImageState) return;
        const w = currentImageState.width * 0.8, h = currentImageState.height * 0.8;
        cropRect = { x: (currentImageState.width - w)/2, y: (currentImageState.height - h)/2, width: w, height: h };
        updateCropInputs(); applyCropBtn.disabled = false;
    }
    function resetCropState() { cropRect = null; activeCropHandle = null; isDraggingCropBox = false; applyCropBtn.disabled = true; currentCropAspectRatio = 'free'; }
    function updateCropInputs() { if(!cropRect) return; cropInputs.x.value = Math.round(cropRect.x); cropInputs.y.value = Math.round(cropRect.y); cropInputs.width.value = Math.round(cropRect.width); cropInputs.height.value = Math.round(cropRect.height); }
    function adjustCropRect() { if(!cropRect || currentCropAspectRatio==='free') return; cropRect.height = cropRect.width/currentCropAspectRatio; updateCropInputs(); }
    
    function drawCropUI() {
        const s = canvas.width / currentImageState.width;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0,canvas.width,canvas.height);
        const r = {x: cropRect.x*s, y: cropRect.y*s, w: cropRect.width*s, h: cropRect.height*s};
        ctx.clearRect(r.x, r.y, r.w, r.h); ctx.drawImage(currentImageState.image, 0,0, currentImageState.width, currentImageState.height, 0,0, canvas.width, canvas.height); // Redraw clear area
        ctx.strokeStyle = '#fff'; ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = '#fff';
        const h = CROP_HANDLE_SIZE/2;
        [[r.x,r.y],[r.x+r.w,r.y],[r.x,r.y+r.h],[r.x+r.w,r.y+r.h]].forEach(p=>ctx.fillRect(p[0]-h,p[1]-h,h*2,h*2));
    }

    function handleCropMouseDown(e) {
        const c = getCanvasCoords(e), i = canvasToImageCoords(c);
        const s = canvas.width / currentImageState.width;
        if (c.x > cropRect.x*s && c.x < (cropRect.x+cropRect.width)*s && c.y > cropRect.y*s && c.y < (cropRect.y+cropRect.height)*s) {
            isDraggingCropBox = true; cropDragStart = {x: i.x - cropRect.x, y: i.y - cropRect.y};
        }
    }
    function handleCropMouseMove(e) {
        if (!isDraggingCropBox || !cropRect) return;
        const i = canvasToImageCoords(getCanvasCoords(e));
        cropRect.x = Math.max(0, Math.min(i.x - cropDragStart.x, currentImageState.width - cropRect.width));
        cropRect.y = Math.max(0, Math.min(i.y - cropDragStart.y, currentImageState.height - cropRect.height));
        updateCropInputs(); drawCanvas();
    }
    function handleCropMouseUp() { isDraggingCropBox = false; }

    function resetRotationPreview() { previewRotationAngle = 0; rotationSlider.value = 0; rotationValue.textContent = 0; drawCanvas(); }
    function applyRotation(deg) {
        const r = deg * Math.PI / 180, cos = Math.abs(Math.cos(r)), sin = Math.abs(Math.sin(r));
        const w = currentImageState.width, h = currentImageState.height;
        const nw = Math.round(w*cos + h*sin), nh = Math.round(w*sin + h*cos);
        const tmp = document.createElement('canvas'); tmp.width = nw; tmp.height = nh;
        const tctx = tmp.getContext('2d'); tctx.translate(nw/2, nh/2); tctx.rotate(r); tctx.drawImage(currentImageState.image, -w/2, -h/2);
        const img = new Image(); img.onload = () => { addHistoryState({image: img, width: nw, height: nh}); resetRotationPreview(); }; img.src = tmp.toDataURL();
    }

    function resetCensorState() { censorAreas = []; isDrawingCensor = false; applyCensorBtn.disabled = true; if(activeTab==='censor') drawCanvas(); }
    function drawCensorUI() {
        const s = canvas.width / currentImageState.width;
        ctx.fillStyle = 'rgba(255,0,0,0.3)'; ctx.strokeStyle = 'red';
        censorAreas.concat(currentCensorRect ? [currentCensorRect] : []).forEach(r => {
            ctx.fillRect(r.x*s, r.y*s, r.width*s, r.height*s); ctx.strokeRect(r.x*s, r.y*s, r.width*s, r.height*s);
        });
    }
    function handleCensorMouseDown(e) { isDrawingCensor = true; censorDragStart = canvasToImageCoords(getCanvasCoords(e)); currentCensorRect = {x:censorDragStart.x, y:censorDragStart.y, width:0, height:0}; }
    function handleCensorMouseMove(e) { if(!isDrawingCensor) return; const c = canvasToImageCoords(getCanvasCoords(e)); currentCensorRect.width = c.x - censorDragStart.x; currentCensorRect.height = c.y - censorDragStart.y; drawCanvas(); }
    function handleCensorMouseUp() { if(!isDrawingCensor) return; isDrawingCensor = false; if(currentCensorRect && Math.abs(currentCensorRect.width)>5) censorAreas.push(currentCensorRect); currentCensorRect = null; applyCensorBtn.disabled = !censorAreas.length; drawCanvas(); }

    function applyCensor() {
        const p = parseInt(pixelateSlider.value);
        const tmp = document.createElement('canvas'); tmp.width = currentImageState.width; tmp.height = currentImageState.height;
        const tctx = tmp.getContext('2d'); tctx.drawImage(currentImageState.image, 0, 0);
        censorAreas.forEach(r => {
             // Logic pixelate (simplified)
             const x = Math.floor(r.x), y = Math.floor(r.y), w = Math.floor(r.width), h = Math.floor(r.height);
             if (w<=0 || h<=0) return;
             const idata = tctx.getImageData(x, y, w, h); const d = idata.data;
             for(let j=0; j<h; j+=p) for(let i=0; i<w; i+=p) {
                 const idx = (j*w + i)*4;
                 tctx.fillStyle = `rgb(${d[idx]},${d[idx+1]},${d[idx+2]})`; tctx.fillRect(x+i, y+j, p, p);
             }
        });
        const img = new Image(); img.onload = () => { addHistoryState({image: img, width: img.width, height: img.height}); resetCensorState(); }; img.src = tmp.toDataURL();
    }
    
    function updateEstimatedSize() {
        if(!currentImageState) return;
        const tmp = document.createElement('canvas'); tmp.width = currentImageState.width; tmp.height = currentImageState.height;
        tmp.getContext('2d').drawImage(currentImageState.image, 0, 0);
        tmp.toBlob(blob => estimatedSizeEl.textContent = (blob.size/1024).toFixed(2) + ' KB', formatSelect.value, parseFloat(qualitySlider.value));
    }

    init();
}
document.addEventListener('DOMContentLoaded', initPhotoEditor);
