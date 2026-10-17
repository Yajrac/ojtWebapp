/* Build a downloadable PDF from locally rendered JPEG pages, without a server. */
(() => {
  'use strict';
  const encode = text => new TextEncoder().encode(text);
  window.renderPhotoPages = async (sheets, widthMM, heightMM) => {
    const pages = [];
    const scale = 150 / 25.4;
    for (const sheet of sheets) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(widthMM * scale);
      canvas.height = Math.round(heightMM * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Image rendering is unavailable.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const margin = 10 * scale;
      const gap = 3 * scale;
      const cellW = (canvas.width - margin * 2 - gap * 3) / 4;
      const rowH = (canvas.height - margin * 2 - gap * 4) / 5;
      const rows = Array.from(sheet.querySelectorAll('.photo-document-row'));
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        let top = margin + rowIndex * (rowH + gap);
        const bottom = top + rowH;
        const label = row.querySelector('h3')?.textContent;
        if (label) {
          const maxWidth = canvas.width - margin * 2;
          ctx.font = `italic bold ${3.6 * scale}px Arial, sans-serif`;
          ctx.fillStyle = '#111111';
          const lines = [];
          let line = '';
          for (const char of label) {
            if (ctx.measureText(line + char).width > maxWidth && line) { lines.push(line); line = ''; }
            line += char;
          }
          if (line) lines.push(line);
          for (const text of lines) {
            const baseline = top + 4 * scale;
            ctx.fillText(text, margin, baseline);
            ctx.fillRect(margin, baseline + 0.5 * scale, ctx.measureText(text).width, 0.2 * scale);
            top += 5 * scale;
          }
          top += 2 * scale;
        }
        const cellH = Math.max(1, bottom - top);
        const images = Array.from(row.querySelectorAll('img'));
        for (let index = 0; index < images.length; index++) {
          const image = images[index];
          await image.decode();
          const ratio = Math.min(cellW / image.naturalWidth, cellH / image.naturalHeight);
          const w = image.naturalWidth * ratio;
          const h = image.naturalHeight * ratio;
          const x = margin + index * (cellW + gap) + (cellW - w) / 2;
          const y = top + (cellH - h) / 2;
          ctx.drawImage(image, x, y, w, h);
        }
      }
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.93));
      if (!blob) throw new Error('Unable to render a PDF page.');
      pages.push({ data: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height });
      canvas.width = canvas.height = 0;
    }
    return pages;
  };
  window.downloadPhotoPDF = async (sheets, widthMM, heightMM, filename) => {
    const pages = await window.renderPhotoPages(sheets, widthMM, heightMM);
    const chunks = [];
    const offsets = [0];
    let length = 0;
    const append = value => { const bytes = typeof value === 'string' ? encode(value) : value; chunks.push(bytes); length += bytes.length; };
    const object = (id, body, stream) => {
      offsets[id] = length;
      append(`${id} 0 obj\n${body}`);
      if (stream) { append('\nstream\n'); append(stream); append('\nendstream'); }
      append('\nendobj\n');
    };
    const width = widthMM * 72 / 25.4;
    const height = heightMM * 72 / 25.4;
    append('%PDF-1.4\n');
    object(1, '<< /Type /Catalog /Pages 2 0 R >>');
    object(2, `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>`);
    pages.forEach((page, i) => {
      const id = 3 + i * 3;
      object(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Photo ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`);
      object(id + 1, `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.data.length} >>`, page.data);
      const commands = encode(`q\n${width} 0 0 ${height} 0 0 cm\n/Photo Do\nQ`);
      object(id + 2, `<< /Length ${commands.length} >>`, commands);
    });
    const xref = length;
    append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
    for (let i = 1; i < offsets.length; i++) append(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
    append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    const file = new Blob(chunks, { type: 'application/pdf' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(file);
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
})();
