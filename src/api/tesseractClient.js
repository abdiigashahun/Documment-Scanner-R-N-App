import { Platform } from 'react-native';

const OCR_SPACE_API_KEY = process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY || 'helloworld';

if (!OCR_SPACE_API_KEY) {
  console.warn('[Tesseract] Missing EXPO_PUBLIC_OCR_SPACE_API_KEY. Falling back to demo key.');
}

const cleanOcrTextPreserveLayout = (rawText) => {
  if (typeof rawText !== 'string' || rawText.length === 0) return '';

  const newline = rawText.includes('\r\n') ? '\r\n' : '\n';
  const lines = rawText.split(/\r?\n/);

  const normalizeCore = (core) => {
    let text = core;

    text = text
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[‐‑‒–—]/g, '-');

    text = text
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/([,.;:!?])([^\s"')\]}])/g, '$1 $2')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .replace(/\[\s+/g, '[')
      .replace(/\s+\]/g, ']')
      .replace(/\{\s+/g, '{')
      .replace(/\s+\}/g, '}')
      .trim();

    text = text
      .replace(/\b0f\b/g, 'of')
      .replace(/\b1n\b/g, 'in')
      .replace(/\bl\b(?=\s)/g, 'I');

    const shouldSentenceCapitalize =
      /[a-z]/.test(text) &&
      !/^[A-Z0-9\s\W]+$/.test(text) &&
      !/^[A-Z]{2,}\b/.test(text);

    if (shouldSentenceCapitalize) {
      text = text.replace(/(^|[.!?]\s+)([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase());
      text = text.replace(/^([a-z])/, (_, letter) => letter.toUpperCase());
    }

    return text;
  };

  const cleaned = lines.map((line) => {
    if (!line.trim()) return line;

    const leading = line.match(/^\s*/)?.[0] ?? '';
    const trailing = line.match(/\s*$/)?.[0] ?? '';
    const core = line.trim();

    return `${leading}${normalizeCore(core)}${trailing}`;
  });

  return cleaned.join(newline);
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

const parseMrzPassport = (text) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, '').toUpperCase())
    .filter((line) => /^[A-Z0-9<]{30,}$/.test(line));

  if (lines.length < 2) return {};

  const line1 = lines[0];
  const line2 = lines[1];

  const namesPart = line1.slice(5).split('<<');
  const surname = namesPart[0]?.replace(/</g, ' ').trim();
  const givenNames = namesPart[1]?.replace(/</g, ' ').trim();

  const passportNumber = line2.slice(0, 9).replace(/</g, '').trim();
  const nationality = line2.slice(10, 13).replace(/</g, '').trim();
  const birthDate = line2.slice(13, 19).replace(/</g, '').trim();
  const sex = line2.slice(20, 21).replace(/</g, '').trim();
  const expiryDate = line2.slice(21, 27).replace(/</g, '').trim();

  return {
    surname,
    given_names: givenNames,
    passport_number: passportNumber,
    nationality,
    birth_date: birthDate,
    sex,
    expiry_date: expiryDate,
  };
};

const extractPassportFields = (text) => {
  const mrzFields = parseMrzPassport(text);

  const labelPassport = text.match(/(?:passport\s*(?:no|number)?)\s*[:\-]?\s*([A-Z0-9]{6,12})/i)?.[1];
  const labelNationality = text.match(/(?:nationality)\s*[:\-]?\s*([A-Z]{2,3})/i)?.[1];
  const labelSurname = text.match(/(?:surname)\s*[:\-]?\s*([^\n]+)/i)?.[1]?.trim();
  const labelGiven = text.match(/(?:given\s*names?)\s*[:\-]?\s*([^\n]+)/i)?.[1]?.trim();

  return {
    passport_number: mrzFields.passport_number || labelPassport,
    surname: mrzFields.surname || labelSurname,
    given_names: mrzFields.given_names || labelGiven,
    nationality: mrzFields.nationality || labelNationality,
    birth_date: mrzFields.birth_date,
    sex: mrzFields.sex,
    expiry_date: mrzFields.expiry_date,
  };
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
    if (totalMatch?.[1]) fields.total_amount = totalMatch[1].trim();
  }

  if (documentType === 'invoice') {
    const invoiceNo = text.match(/(?:invoice\s*(?:no|number)?|inv\s*#?)\s*[:\-]?\s*([A-Z0-9\-\/]+)/i)?.[1];
    if (invoiceNo) fields.invoice_number = invoiceNo;
  }

  if (documentType === 'passport') {
    Object.assign(fields, extractPassportFields(text));
  }

  return fields;
};

const buildFormattedOutput = ({ documentType, fields, summary }) => {
  if (documentType === 'passport') {
    return {
      title: 'Passport Preview',
      rows: [
        ['Document', 'Passport'],
        ['Passport No', fields.passport_number || ''],
        ['Surname', fields.surname || ''],
        ['Given Names', fields.given_names || ''],
        ['Nationality', fields.nationality || ''],
        ['Birth Date', fields.birth_date || ''],
        ['Sex', fields.sex || ''],
        ['Expiry Date', fields.expiry_date || ''],
      ],
    };
  }

  return {
    title: 'Structured Preview',
    rows: [
      ['Document Type', documentType],
      ['Summary', summary],
    ],
  };
};

const buildSummary = (text) => {
  if (!text) return 'No readable text detected.';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= 220 ? clean : `${clean.slice(0, 220)}...`;
};

const buildAnalysis = (text) => {
  const rawText = text || '';
  const cleanedText = cleanOcrTextPreserveLayout(rawText);
  const cleanText = cleanedText.trim();

  if (!cleanText) {
    return {
      document_type: 'generic_text',
      language: 'unknown',
      tags: ['ocr', 'empty', 'review_required'],
      fields: {},
      summary: 'No readable text detected from the image.',
      formatted_output: {
        title: 'Structured Preview',
        rows: [['Document Type', 'generic_text'], ['Summary', 'No readable text detected from the image.']],
      },
    };
  }

  const documentType = inferDocumentType(cleanText);
  const language = detectLanguage(cleanText);
  const fields = extractFields(cleanText, documentType);
  const tags = ['ocr', 'tesseract', documentType, language];

  if (documentType === 'generic_text') {
    tags.push('review_required');
  }

  if (
    documentType === 'passport' &&
    (!fields.passport_number || !fields.surname || !fields.given_names)
  ) {
    tags.push('review_required');
  }

  const summary = buildSummary(cleanText);

  return {
    document_type: documentType,
    language,
    tags: Array.from(new Set(tags)),
    fields,
    summary,
    cleaned_text: cleanedText,
    formatted_output: buildFormattedOutput({ documentType, fields, summary }),
  };
};

const parseOcrResponse = (payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Tesseract OCR returned an invalid response.');
  }

  if (payload.IsErroredOnProcessing) {
    const message = Array.isArray(payload.ErrorMessage)
      ? payload.ErrorMessage.join(' ')
      : payload.ErrorMessage || 'OCR processing failed.';
    throw new Error(`Tesseract OCR failed: ${message}`);
  }

  const text = payload.ParsedResults?.[0]?.ParsedText?.trim() || '';
  return buildAnalysis(text);
};

const buildAnalysisFromText = (text) => {
  return buildAnalysis(text);
};

const runTesseractJs = async ({ uri }) => {
  const tesseract = await import('tesseract.js');
  const { data } = await tesseract.recognize(uri, 'eng');
  return buildAnalysisFromText(data?.text || '');
};

const runOcrSpaceTesseract = async ({ uri, mimeType, fileName }) => {
  const formData = new FormData();
  formData.append('apikey', OCR_SPACE_API_KEY);
  formData.append('language', 'eng');
  formData.append('OCREngine', '2');
  formData.append('isOverlayRequired', 'false');
  formData.append('scale', 'true');

  formData.append('file', {
    uri,
    name: fileName || `scan.${(mimeType || 'image/jpeg').split('/')[1] || 'jpg'}`,
    type: mimeType || 'image/jpeg',
  });

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tesseract OCR API error: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  return parseOcrResponse(payload);
};

export async function analyzeDocumentImage({ uri, mimeType, fileName }) {
  if (!uri) {
    throw new Error('Missing image URI for Tesseract OCR.');
  }

  if (mimeType && !mimeType.startsWith('image/')) {
    throw new Error('Tesseract OCR currently supports image files only.');
  }

  if (Platform.OS === 'web') {
    return runTesseractJs({ uri });
  }

  return runOcrSpaceTesseract({ uri, mimeType, fileName });
}
