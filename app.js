const canvas = document.getElementById('zineCanvas');
const ctx = canvas.getContext('2d');

const PAPER = {
  letter: { label: 'US Letter', width: 1100, height: 850, pdf: [11, 8.5] },
  a4: { label: 'A4', width: 1123, height: 794, pdf: [11.69, 8.27] }
};

let state = {
  side: 'front',
  paper: 'letter',
  selectedPanel: 1,
  backMode: 'panels',
  fullBack: { image: null, caption: '' },
  panels: Array.from({ length: 16 }, (_, i) => ({
    id: i + 1,
    caption: i === 0 ? 'Cover' : '',
    image: null,
    fit: 'cover',
    layout: 'photoCaption'
  }))
};

const els = {
  frontBtn: document.getElementById('frontBtn'),
  backBtn: document.getElementById('backBtn'),
  previewTitle: document.getElementById('previewTitle'),
  previewHelp: document.getElementById('previewHelp'),
  paperSize: document.getElementById('paperSize'),
  panelSelect: document.getElementById('panelSelect'),
  layoutSelect: document.getElementById('layoutSelect'),
  fitSelect: document.getElementById('fitSelect'),
  captionInput: document.getElementById('captionInput'),
  imageInput: document.getElementById('imageInput'),
  clearPanelBtn: document.getElementById('clearPanelBtn'),
  exportPdfBtn: document.getElementById('exportPdfBtn'),
  downloadFrontBtn: document.getElementById('downloadFrontBtn'),
  downloadBackBtn: document.getElementById('downloadBackBtn'),
  panelEditor: document.getElementById('panelEditor'),
  fullBackEditor: document.getElementById('fullBackEditor'),
  fullBackImageInput: document.getElementById('fullBackImageInput'),
  fullBackCaption: document.getElementById('fullBackCaption')
};

function activePanelIds() {
  return state.side === 'front'
    ? [1,2,3,4,5,6,7,8]
    : [9,10,11,12,13,14,15,16];
}

function getPanel(id) {
  return state.panels.find(p => p.id === id);
}

function setupPanelSelect() {
  const ids = activePanelIds();
  els.panelSelect.innerHTML = ids.map(id => `<option value="${id}">Panel ${id}</option>`).join('');
  if (!ids.includes(state.selectedPanel)) state.selectedPanel = ids[0];
  els.panelSelect.value = state.selectedPanel;
  loadEditorFromPanel();
}

function panelRects() {
  const margin = 35;
  const gap = 12;
  const cols = 4;
  const rows = 2;
  const w = (canvas.width - margin * 2 - gap * (cols - 1)) / cols;
  const h = (canvas.height - margin * 2 - gap * (rows - 1)) / rows;
  const ids = activePanelIds();
  const rects = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      rects.push({ id: ids[idx], x: margin + c * (w + gap), y: margin + r * (h + gap), w, h });
    }
  }
  return rects;
}

function drawImageFit(img, x, y, w, h, fit='cover') {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = fit === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
  const nw = iw * scale;
  const nh = ih * scale;
  const nx = x + (w - nw) / 2;
  const ny = y + (h - nh) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, nx, ny, nw, nh);
  ctx.restore();
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

function drawPanel(rect) {
  const panel = getPanel(rect.id);
  const selected = rect.id === state.selectedPanel && !(state.side === 'back' && state.backMode === 'fullPhoto');
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = selected ? '#f4c542' : '#222';
  ctx.lineWidth = selected ? 5 : 2;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

  const pad = 12;
  const captionHeight = panel.layout === 'photoCaption' ? 44 : 0;
  const imgH = rect.h - pad * 2 - captionHeight;

  if (panel.image && panel.layout !== 'captionOnly') {
    drawImageFit(panel.image, rect.x + pad, rect.y + pad, rect.w - pad*2, imgH, panel.fit);
  } else if (panel.layout !== 'captionOnly') {
    ctx.fillStyle = '#f1f1f1';
    ctx.fillRect(rect.x + pad, rect.y + pad, rect.w - pad*2, imgH);
    ctx.fillStyle = '#888';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Photo ${rect.id}`, rect.x + rect.w/2, rect.y + rect.h/2 - 10);
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = '#111';
  ctx.font = panel.layout === 'captionOnly' ? '24px Arial' : '16px Arial';
  const textY = panel.layout === 'captionOnly' ? rect.y + 45 : rect.y + rect.h - 28;
  wrapText(panel.caption || '', rect.x + pad, textY, rect.w - pad*2, 22);

  ctx.fillStyle = 'rgba(0,0,0,.65)';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(`${rect.id}`, rect.x + 8, rect.y + 20);
  ctx.restore();
}

function drawFullBack() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (state.fullBack.image) {
    drawImageFit(state.fullBack.image, 0, 0, canvas.width, canvas.height, 'cover');
  } else {
    ctx.fillStyle = '#eee';
    ctx.fillRect(35, 35, canvas.width - 70, canvas.height - 70);
    ctx.fillStyle = '#777';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Full-size back photo', canvas.width/2, canvas.height/2);
  }
  if (state.fullBack.caption) {
    ctx.fillStyle = 'rgba(255,255,255,.86)';
    ctx.fillRect(55, canvas.height - 135, canvas.width - 110, 85);
    ctx.fillStyle = '#111';
    ctx.font = '28px Arial';
    ctx.textAlign = 'left';
    wrapText(state.fullBack.caption, 75, canvas.height - 92, canvas.width - 150, 32);
  }
}

function render() {
  const p = PAPER[state.paper];
  canvas.width = p.width;
  canvas.height = p.height;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  els.previewTitle.textContent = state.side === 'front' ? 'Front Side' : 'Back Side';
  els.previewHelp.textContent = state.side === 'back' && state.backMode === 'fullPhoto'
    ? 'Back side is set to one full-size photo.'
    : 'Click any panel to edit it.';

  els.frontBtn.classList.toggle('active', state.side === 'front');
  els.backBtn.classList.toggle('active', state.side === 'back');
  els.panelEditor.style.display = state.side === 'back' && state.backMode === 'fullPhoto' ? 'none' : 'block';
  els.fullBackEditor.style.display = state.side === 'back' && state.backMode === 'fullPhoto' ? 'block' : 'none';

  if (state.side === 'back' && state.backMode === 'fullPhoto') {
    drawFullBack();
  } else {
    panelRects().forEach(drawPanel);
  }
}

function loadEditorFromPanel() {
  const panel = getPanel(state.selectedPanel);
  els.panelSelect.value = panel.id;
  els.layoutSelect.value = panel.layout;
  els.fitSelect.value = panel.fit;
  els.captionInput.value = panel.caption;
}

function readImage(file, callback) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => callback(img);
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

canvas.addEventListener('click', e => {
  if (state.side === 'back' && state.backMode === 'fullPhoto') return;
  const bounds = canvas.getBoundingClientRect();
  const x = (e.clientX - bounds.left) * (canvas.width / bounds.width);
  const y = (e.clientY - bounds.top) * (canvas.height / bounds.height);
  const hit = panelRects().find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  if (hit) {
    state.selectedPanel = hit.id;
    setupPanelSelect();
    render();
  }
});

els.frontBtn.addEventListener('click', () => { state.side = 'front'; setupPanelSelect(); render(); });
els.backBtn.addEventListener('click', () => { state.side = 'back'; setupPanelSelect(); render(); });
els.paperSize.addEventListener('change', e => { state.paper = e.target.value; render(); });

document.querySelectorAll('input[name="backMode"]').forEach(input => {
  input.addEventListener('change', e => { state.backMode = e.target.value; render(); });
});

els.panelSelect.addEventListener('change', e => { state.selectedPanel = Number(e.target.value); loadEditorFromPanel(); render(); });
els.layoutSelect.addEventListener('change', e => { getPanel(state.selectedPanel).layout = e.target.value; render(); });
els.fitSelect.addEventListener('change', e => { getPanel(state.selectedPanel).fit = e.target.value; render(); });
els.captionInput.addEventListener('input', e => { getPanel(state.selectedPanel).caption = e.target.value; render(); });
els.imageInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  readImage(file, img => { getPanel(state.selectedPanel).image = img; render(); });
});
els.clearPanelBtn.addEventListener('click', () => {
  const p = getPanel(state.selectedPanel);
  p.image = null; p.caption = ''; p.layout = 'photoCaption'; p.fit = 'cover';
  els.imageInput.value = '';
  loadEditorFromPanel();
  render();
});
els.fullBackImageInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  readImage(file, img => { state.fullBack.image = img; render(); });
});
els.fullBackCaption.addEventListener('input', e => { state.fullBack.caption = e.target.value; render(); });

function downloadCanvas(side, filename) {
  const currentSide = state.side;
  state.side = side;
  render();
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/jpeg', 0.95);
  link.click();
  state.side = currentSide;
  render();
}

els.downloadFrontBtn.addEventListener('click', () => downloadCanvas('front', 'mini-book-front.jpg'));
els.downloadBackBtn.addEventListener('click', () => downloadCanvas('back', 'mini-book-back.jpg'));

els.exportPdfBtn.addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const currentSide = state.side;
  const paper = PAPER[state.paper];
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: paper.pdf });

  state.side = 'front'; render();
  const front = canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(front, 'JPEG', 0, 0, paper.pdf[0], paper.pdf[1]);

  pdf.addPage(paper.pdf, 'landscape');
  state.side = 'back'; render();
  const back = canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(back, 'JPEG', 0, 0, paper.pdf[0], paper.pdf[1]);

  pdf.save('mini-book-printable.pdf');
  state.side = currentSide;
  render();
});

setupPanelSelect();
render();
