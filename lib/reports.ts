import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
export function download(bytes: BlobPart, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
const printable = (s: unknown) =>
  (typeof s === 'string'
    ? s
    : typeof s === 'number' || typeof s === 'boolean'
      ? String(s)
      : JSON.stringify(s ?? '')
  )
    .replace(/₹/g, 'INR ')
    .replace(/[^\x20-\x7E\n]/g, ' ');
export async function pdfReport(
  company: any,
  title: string,
  rows: any[],
  blank = false,
) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica),
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page: any,
    y = 0;
  let logo: any = null;
  if (company.logo) {
    const res = await fetch(`/api/files?id=${company.logo}`);
    if (!res.ok) throw Error('Company logo could not be loaded.');
    const b = await res.arrayBuffer();
    logo = res.headers.get('content-type')?.includes('png')
      ? await pdf.embedPng(b)
      : await pdf.embedJpg(b);
  }
  const newPage = () => {
    page = pdf.addPage([595, 842]);
    page.drawRectangle({
      x: 0,
      y: 744,
      width: 595,
      height: 98,
      color: rgb(0.94, 0.96, 0.98),
    });
    page.drawText(printable(company.name), {
      x: 44,
      y: 803,
      size: 16,
      font: bold,
      color: rgb(0.08, 0.25, 0.4),
    });
    page.drawText(printable(company.address || '').slice(0, 90), {
      x: 44,
      y: 782,
      size: 8,
      font: regular,
    });
    page.drawText(printable(title), { x: 44, y: 758, size: 12, font: bold });
    if (logo) {
      const dim = logo.scaleToFit(62, 34);
      page.drawImage(logo, {
        x: 490,
        y: 790,
        width: dim.width,
        height: dim.height,
      });
    }
    page.drawText(
      `Generated ${new Date().toLocaleDateString('en-IN')} | Compliance Calendar`,
      { x: 44, y: 720, size: 8, font: regular },
    );
    page.drawText(
      'Generated through Compliance Calendar | An MCCIA Digital Initiative',
      { x: 44, y: 30, size: 8, font: regular },
    );
    page.drawText(
      'Internal tracking report. Applicability requires qualified expert verification.',
      { x: 44, y: 18, size: 7, font: regular },
    );
    page.drawText(String(pdf.getPageCount()), {
      x: 540,
      y: 30,
      size: 8,
      font: regular,
    });
    y = 692;
  };
  const line = (text: string, heading = false) => {
    const words = printable(text).split(/\s+/);
    let current = '';
    for (const w of words) {
      if (
        (heading ? bold : regular).widthOfTextAtSize(
          current + ' ' + w,
          heading ? 11 : 9,
        ) > 500 &&
        current
      ) {
        if (y < 65) newPage();
        page.drawText(current, {
          x: 44,
          y,
          size: heading ? 11 : 9,
          font: heading ? bold : regular,
        });
        y -= 15;
        current = w;
      } else current += (current ? ' ' : '') + w;
    }
    if (current) {
      if (y < 65) newPage();
      page.drawText(current, {
        x: 44,
        y,
        size: heading ? 11 : 9,
        font: heading ? bold : regular,
      });
      y -= heading ? 24 : 17;
    }
  };
  newPage();
  if (!company.logo) line('Upload company logo to personalize this form.');
  if (!rows.length) line('No records match this report.');
  for (const r of rows) {
    line(r.title || r.name || 'Record', true);
    for (const [key, value] of Object.entries(r)) {
      if (
        [
          'id',
          'organization_id',
          'data',
          'version',
          'updated',
          'title',
          'history',
          'parent_id',
          'requirement_id',
          'template_id',
          'before_image',
          'after_image',
          'evidence_reference',
          'kind',
        ].includes(key) ||
        value == null ||
        value === ''
      )
        continue;
      if (Array.isArray(value)) {
        line(key.replaceAll('_', ' ').toUpperCase(), true);
        for (const item of value)
          line(
            typeof item === 'object'
              ? Object.entries(item)
                  .map(([k, v]) => `${k}: ${printable(v)}`)
                  .join(' | ')
              : String(item),
          );
      } else if (typeof value !== 'object')
        line(
          `${key.replaceAll('_', ' ')}: ${blank ? '________________________________' : printable(value)}`,
        );
    }
    for (const key of ['before_image', 'after_image'])
      if (r[key]) {
        const res = await fetch(`/api/files?id=${r[key]}`);
        if (res.ok) {
          const b = await res.arrayBuffer();
          const img = res.headers.get('content-type')?.includes('png')
            ? await pdf.embedPng(b)
            : await pdf.embedJpg(b);
          const dim = img.scaleToFit(230, 150);
          if (y < dim.height + 75) newPage();
          line(key === 'before_image' ? 'BEFORE' : 'AFTER', true);
          page.drawImage(img, {
            x: 44,
            y: y - dim.height,
            width: dim.width,
            height: dim.height,
          });
          y -= dim.height + 20;
        }
      }
    y -= 14;
  }
  return pdf.save();
}
export async function excelReport(company: any, title: string, rows: any[]) {
  const ExcelJS = (await import('exceljs')).default;
  const book = new ExcelJS.Workbook();
  book.creator = 'Compliance Calendar';
  const sheet = book.addWorksheet('Report');
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).filter(
    (k) =>
      ![
        'id',
        'organization_id',
        'data',
        'version',
        'history',
        'updated',
      ].includes(k) && !rows.some((r) => typeof r[k] === 'object'),
  );
  const columns = keys.length ? keys : ['No matching records'];
  sheet.addRow([company.name]);
  sheet.addRow([title]);
  sheet.addRow(['Generated', new Date()]);
  sheet.addRow([]);
  sheet.addRow(columns.map((k) => k.replaceAll('_', ' ')));
  for (const r of rows)
    sheet.addRow(
      columns.map((k) => {
        const v = r[k];
        if (typeof v === 'number') return v;
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v))
          return new Date(v);
        return String(v ?? '');
      }),
    );
  sheet.getRow(1).font = { size: 16, bold: true, color: { argb: 'FF174D80' } };
  sheet.getRow(5).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(5).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF174D80' },
  };
  sheet.columns.forEach((col, i) => {
    col.width = i === 0 ? 38 : 25;
    const key = columns[i];
    if (/due|date|expiry|issue/.test(key)) col.numFmt = 'dd mmm yyyy';
    if (/savings|amount/.test(key)) col.numFmt = '#,##0.00';
  });
  sheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5, column: columns.length },
  };
  sheet.views = [{ state: 'frozen', ySplit: 5 }];
  if (company.logo) {
    const res = await fetch(`/api/files?id=${company.logo}`);
    if (!res.ok) throw Error('Company logo could not be loaded.');
    const data = await res.arrayBuffer();
    const image = book.addImage({
      buffer: data as any,
      extension: res.headers.get('content-type')?.includes('png')
        ? 'png'
        : 'jpeg',
    });
    sheet.addImage(image, {
      tl: { col: 3, row: 0 },
      ext: { width: 95, height: 45 },
    });
  }
  return book.xlsx.writeBuffer();
}
