import JSZip from 'jszip';
// Read cached cell values without evaluating formulas or using Node stream
// parsers (which can log document payloads in some edge compatibility layers).
const decode = (s: string) =>
  s.replace(
    /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi,
    (_, entity: string) => {
      if (entity[0] === '#') {
        const n =
          entity[1].toLowerCase() === 'x'
            ? parseInt(entity.slice(2), 16)
            : parseInt(entity.slice(1), 10);
        return n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
      }
      return (
        (
          { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<
            string,
            string
          >
        )[entity.toLowerCase()] || ''
      );
    },
  );
function textNodes(xml: string) {
  return [...xml.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)]
    .map((m) => decode(m[1]))
    .join('');
}
export async function extractWorkbook(bytes: Uint8Array): Promise<string[]> {
  const zip = await JSZip.loadAsync(bytes),
    sharedFile = zip.file('xl/sharedStrings.xml'),
    shared: string[] = [];
  if (sharedFile) {
    const xml = await sharedFile.async('string');
    for (const match of xml.matchAll(
      /<(?:\w+:)?si(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?si>/g,
    ))
      shared.push(textNodes(match[1]));
  }
  const parts: string[] = [];
  for (const name of Object.keys(zip.files)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort()) {
    const xml = await zip.file(name)!.async('string');
    let count = 0;
    const rows: string[] = [];
    for (const row of xml.matchAll(
      /<(?:\w+:)?row(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?row>/g,
    )) {
      if (++count > 20000)
        throw new Error('Worksheets are limited to 20,000 rows.');
      const values: string[] = [];
      for (const cell of row[1].matchAll(
        /<(?:\w+:)?c\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?c>/g,
      )) {
        const type = cell[1].match(/\bt=["']([^"']+)["']/)?.[1],
          value =
            cell[2].match(
              /<(?:\w+:)?v(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?v>/,
            )?.[1] || '';
        values.push(
          type === 's'
            ? shared[Number(value)] || ''
            : type === 'inlineStr'
              ? textNodes(cell[2])
              : decode(value),
        );
      }
      rows.push(values.join(' | '));
    }
    parts.push(`Worksheet ${name.split('/').pop()}\n${rows.join('\n')}`);
  }
  return parts;
}
