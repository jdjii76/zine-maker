const canvas = document.getElementById('zineCanvas');
const ctx = canvas.getContext('2d');
const pageButtons = document.getElementById('pageButtons');
const captionInput = document.getElementById('captionInput');
const imageInput = document.getElementById('imageInput');
const fitInput = document.getElementById('fitInput');
const currentPage = document.getElementById('currentPage');
const paperSize = document.getElementById('paperSize');

let selectedPage = 1;

const pages = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  caption: i === 0 ? 'Cover' : '',
  image: null,
  fit: 'cover'
}));

// Physical zine print order/rotation approximation for an 8-page one-sheet zine.
// Top row panels are rotated 180 degrees.
const layoutOrder = [8, 1, 2, 3, 7, 6, 5, 4];

function renderPageButtons() {
  pageButtons.innerHTML = '';
  pages.forEach(page => {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (page.id === selectedPage ? ' active' : '');
    btn.textContent = page.id === 1 ? '1 Cover' : `Page ${page.id}`;
    btn.onclick = () => selectPage(page.id);
    pageButtons.appendChild(btn);
  });
}

function selectPage(id) {
  selectedPage = id;
  const page = pages[id - 1];
  currentPage.textContent = id;
  captionInput.value = page.caption;
  fitInput.value = page.fit;
  imageInput.value = '';
  renderPageButtons();
  drawZine();
}

function drawImageInRect(img, x, y, w, h, fit) {
  const imgRatio = img.width / img.height;
  const rectRatio = w / h;
  let dw, dh, dx, dy;

  if (fit === 'contain') {
    if (imgRatio > rectRatio) {
      dw = w;
      dh = w / imgRatio;
    } else {
      dh = h;
      dw = h * imgRatio;
    }
  } else {
    if (imgRatio > rectRatio) {
      dh = h;
      dw = h * imgRatio;
    } else {
      dw = w;
      dh = w / imgRatio;
    }
  }

  dx = x + (w - dw) / 2;
  dy = y + (h - dh) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

function drawPanel(pageNumber, x, y, w, h, upsideDown = false) {
  const page = pages[pageNumber - 1];
  ctx.save();

  if (upsideDown) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(Math.PI);
    x = -w / 2;
    y = -h / 2;
  }

  ctx.fillStyle = '#faf6ec';
  ctx.fillRect(x, y, w, h);

  if (page.image) {
    drawImageInRect(page.image, x + 8, y + 8, w - 16, h - 58, page.fit);
  } else {
    ctx.fillStyle = '#e9dfcf';
    ctx.fillRect(x + 8, y + 8, w - 16, h - 58);
    ctx.fillStyle = '#777';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Page ${pageNumber}`, x + w / 2, y + h / 2);
  }

  ctx.fillStyle = '#111';
  ctx.font = '18px Arial';
  ctx.textAlign = 'left';
  wrapText(page.caption, x + 14, y + h - 35, w - 28, 20);

  ctx.strokeStyle = pageNumber === selectedPage ? '#d4a900' : '#111';
  ctx.lineWidth = pageNumber === selectedPage ? 5 : 2;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function drawZine() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f7f2e8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const margin = 50;
  const gridW = canvas.width - margin * 2;
  const gridH = canvas.height - margin * 2;
  const panelW = gridW / 4;
  const panelH = gridH / 2;

  layoutOrder.forEach((pageNum, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = margin + col * panelW;
    const y = margin + row * panelH;
    const upsideDown = row === 0;
    drawPanel(pageNum, x, y, panelW, panelH, upsideDown);
  });

  // Fold/cut guide
  ctx.save();
  ctx.strokeStyle = '#999';
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin + gridW / 2, margin);
  ctx.lineTo(margin + gridW / 2, margin + gridH);
  ctx.moveTo(margin, margin + gridH / 2);
  ctx.lineTo(margin + gridW, margin + gridH / 2);
  ctx.stroke();

  ctx.strokeStyle = '#c0392b';
  ctx.setLineDash([]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(margin + gridW / 4, margin + gridH / 2);
  ctx.lineTo(margin + (gridW / 4) * 3, margin + gridH / 2);
  ctx.stroke();
  ctx.restore();
}

captionInput.addEventListener('input', () => {
  pages[selectedPage - 1].caption = captionInput.value;
  drawZine();
});

fitInput.addEventListener('change', () => {
  pages[selectedPage - 1].fit = fitInput.value;
  drawZine();
});

imageInput.addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      pages[selectedPage - 1].image = img;
      drawZine();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

document.getElementById('clearImage').addEventListener('click', () => {
  pages[selectedPage - 1].image = null;
  imageInput.value = '';
  drawZine();
});

document.getElementById('resetAll').addEventListener('click', () => {
  if (!confirm('Clear all captions and images?')) return;
  pages.forEach((page, index) => {
    page.caption = index === 0 ? 'Cover' : '';
    page.image = null;
    page.fit = 'cover';
  });
  selectPage(1);
});

document.getElementById('downloadPng').addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'my-zine.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

document.getElementById('printZine').addEventListener('click', () => {
  const dataUrl = canvas.toDataURL('image/png');
  const win = window.open('', '_blank');
  win.document.write(`
    <html>
      <head>
        <title>Print Zine</title>
        <style>
          body { margin: 0; display: grid; place-items: center; min-height: 100vh; }
          img { max-width: 100%; height: auto; }
          @media print { body { margin: 0; } img { width: 100vw; height: auto; } }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" onload="window.print()" />
      </body>
    </html>
  `);
  win.document.close();
});

paperSize.addEventListener('change', () => {
  if (paperSize.value === 'a4') {
    canvas.width = 1050;
    canvas.height = 850;
  } else {
    canvas.width = 1100;
    canvas.height = 850;
  }
  drawZine();
});

renderPageButtons();
selectPage(1);
