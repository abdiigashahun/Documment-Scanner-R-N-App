import MlkitOcr from 'react-native-mlkit-ocr';

const normalizeOcrText = (result) => {
  if (!Array.isArray(result)) return '';

  return result
    .map((item) => {
      if (!item) return '';
      if (typeof item === 'string') return item;
      if (typeof item.text === 'string') return item.text;
      return '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
};

const detectLanguage = (text) => {
  if (!text) return 'unknown';
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';
  return 'en';
};

const inferDocumentType = (text) => {
  const lower = text.toLowerCase();

  if (/passport|nationality|surname|given names|place of birth/.test(lower)) return 'passport';
  if (/identity card|id card|date of birth|national id|personal number/.test(lower)) return 'id_card';
  if (/invoice|bill to|invoice number|due date|amount due/.test(lower)) return 'invoice';
  if (/receipt|cash|change|subtotal|vat|tax/.test(lower)) return 'receipt';

  return 'generic_text';
};

const extractFields = (text, documentType) => {
  const fields = {};

  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = text.match(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)\d{3,4}[\s-]?\d{3,4}/)?.[0];
  const date = text.match(/\b(?:\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})\b/)?.[0];

  if (email) fields.email = email;
  if (phone) fields.phone = phone;
  if (date) fields.date = date;

  if (documentType === 'invoice' || documentType === 'receipt') {
    const totalMatch = text.match(
      /(?:total|amount due|grand total|balance)\s*[:\-]?\s*([$€£]?\s?\d+(?:[\.,]\d{2})?)/i
    );
    if (totalMatch?.[1]) {
      fields.total_amount = totalMatch[1].trim();
    }
  }

  if (documentType === 'invoice') {
    const invoiceNo = text.match(/(?:invoice\s*(?:no|number)?|inv\s*#?)\s*[:\-]?\s*([A-Z0-9\-\/]+)/i)?.[1];
    if (invoiceNo) fields.invoice_number = invoiceNo;
  }

  if (documentType === 'passport') {
    const passportNo = text.match(/(?:passport\s*(?:no|number)?)\s*[:\-]?\s*([A-Z0-9]{6,12})/i)?.[1];
    if (passportNo) fields.passport_number = passportNo;
  }

  return fields;
};

const buildSummary = (text) => {
  if (!text) return 'No readable text detected.';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= 220 ? clean : `${clean.slice(0, 220)}...`;
};

export async function analyzeDocumentImage({ uri, mimeType }) {
  if (!uri) {
    throw new Error('Missing document URI for ML Kit analysis.');
  }

  if (mimeType && !mimeType.startsWith('image/')) {
    throw new Error('Google ML Kit OCR currently supports image files only. Please scan or import an image.');
  }

  const ocrResult = await MlkitOcr.detectFromUri(uri);
  const text = normalizeOcrText(ocrResult);

  if (!text) {
    return {
      document_type: 'generic_text',
      language: 'unknown',
      tags: ['ocr', 'empty'],
      fields: {},
      summary: 'No readable text detected from the image.',
    };
  }

  const documentType = inferDocumentType(text);
  const language = detectLanguage(text);
  const fields = extractFields(text, documentType);

  const tags = ['ocr', documentType, language];
  if (documentType === 'receipt' || documentType === 'invoice') {
    tags.push('finance');
  }

  return {
    document_type: documentType,
    language,
    tags: Array.from(new Set(tags)),
    fields,
    summary: buildSummary(text),
  };
}
