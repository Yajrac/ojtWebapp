/* Minimal OOXML package. Each page is embedded as an image to preserve its layout. */
(() => {
  'use strict';
  const encode = value => new TextEncoder().encode(value);
  function zip(files) {
    const parts = [], directory = [];
    let offset = 0, centralLength = 0;
    const crc = data => {
      let result = 0xffffffff;
      for (const byte of data) {
        result ^= byte;
        for (let i = 0; i < 8; i++) result = (result >>> 1) ^ ((result & 1) ? 0xedb88320 : 0);
      }
      return (result ^ 0xffffffff) >>> 0;
    };
    for (const [name, value] of files) {
      const filename = encode(name), data = typeof value === 'string' ? encode(value) : value;
      const checksum = crc(data);
      const local = new Uint8Array(30), lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint32(14, checksum, true);
      lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true); lv.setUint16(26, filename.length, true);
      parts.push(local, filename, data);
      const central = new Uint8Array(46), cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
      cv.setUint32(16, checksum, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
      cv.setUint16(28, filename.length, true); cv.setUint32(42, offset, true);
      directory.push(central, filename);
      centralLength += central.length + filename.length;
      offset += local.length + filename.length + data.length;
    }
    const end = new Uint8Array(22), view = new DataView(end.buffer);
    view.setUint32(0, 0x06054b50, true); view.setUint16(8, files.length, true); view.setUint16(10, files.length, true);
    view.setUint32(12, centralLength, true); view.setUint32(16, offset, true);
    return new Blob([...parts, ...directory, end], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }
  window.downloadPhotoDOCX = async (sheets, widthMM, heightMM, filename) => {
    const escape = text => text.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
    const media = [], relationships = [], pages = [];
    const usableWidth = widthMM - 20;
    const cellMM = usableWidth / 4;
    const cellTwips = Math.floor(cellMM / 25.4 * 1440);
    const maxImageHeight = (heightMM - 20) / 5 - 10;
    for (const sheet of sheets) {
      const blocks = [];
      for (const row of sheet.querySelectorAll('.photo-document-row')) {
        const title = row.querySelector('h3')?.textContent;
        if (title) blocks.push(`<w:p><w:pPr><w:keepNext/><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:i/><w:u w:val="single"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${escape(title)}</w:t></w:r></w:p>`);
        const cells = [];
        for (const image of row.querySelectorAll('img')) {
          await image.decode();
          if (!image.naturalWidth || !image.naturalHeight) throw new Error('Image is empty');
          const canvas = document.createElement('canvas');
          const downscale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
          canvas.width = Math.max(1, Math.round(image.naturalWidth * downscale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * downscale));
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.93));
          if (!blob || !blob.size) throw new Error('Image export failed');
          const id = media.length + 1;
          media.push([`word/media/photo${id}.jpg`, new Uint8Array(await blob.arrayBuffer())]);
          relationships.push(`<Relationship Id="rId${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/photo${id}.jpg"/>`);
          const ratio = Math.min((cellMM - 3) / image.naturalWidth, maxImageHeight / image.naturalHeight);
          const w = Math.round(image.naturalWidth * ratio * 36000), h = Math.round(image.naturalHeight * ratio * 36000);
          const drawing = `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${w}" cy="${h}"/><wp:docPr id="${id}" name="Photo ${id}"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="photo${id}.jpg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
          cells.push(`<w:tc><w:tcPr><w:tcW w:w="${cellTwips}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>${drawing}</w:p></w:tc>`);
          canvas.width = canvas.height = 0;
        }
        while (cells.length < 4) cells.push(`<w:tc><w:tcPr><w:tcW w:w="${cellTwips}" w:type="dxa"/></w:tcPr><w:p/></w:tc>`);
        blocks.push(`<w:tbl><w:tblPr><w:tblW w:w="${cellTwips * 4}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${Array.from({length:4},()=>`<w:gridCol w:w="${cellTwips}"/>`).join('')}</w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${cells.join('')}</w:tr></w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="2"/></w:rPr><w:t> </w:t></w:r></w:p>`);
      }
      pages.push(blocks.join(''));
    }
    if (!media.length) throw new Error('No photos to export');
    const files = [
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
      ['word/_rels/document.xml.rels', `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join('')}</Relationships>`],
      ['word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${pages.join('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')}<w:sectPr><w:pgSz w:w="${Math.round(widthMM / 25.4 * 1440)}" w:h="${Math.round(heightMM / 25.4 * 1440)}"/><w:pgMar w:top="567" w:right="567" w:bottom="567" w:left="567" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`],
      ...media
    ];
    const url = URL.createObjectURL(zip(files));
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
})();