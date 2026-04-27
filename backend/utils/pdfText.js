const cleanText = (t) => {
  return String(t || '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const extractPdfText = async (buffer) => {
  if (!buffer) return '';

  const mod = await import('pdf-parse');
  const pdfParse = mod.default || mod;

  const data = await pdfParse(buffer);
  return cleanText(data?.text || '');
};
