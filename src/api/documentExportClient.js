import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';

const SUPPORTED_EXPORT_FORMATS = ['pdf', 'doc', 'jpg', 'png', 'txt', 'json'];

const sanitize = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getBaseName = (fileName) => {
  if (!fileName) return `scan-${Date.now()}`;
  return fileName.replace(/\.[^/.]+$/, '');
};

const toExportDir = async () => {
  const exportDir = `${FileSystem.documentDirectory}exports/`;
  await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });
  return exportDir;
};

const buildDocumentHtml = ({ analysis, includePreviewStyles = true }) => {
  const rows = analysis?.formatted_output?.rows || [];
  const tags = Array.isArray(analysis?.tags) ? analysis.tags.join(', ') : '';

  const rowHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td><strong>${sanitize(label || '-')}</strong></td><td>${sanitize(value || '-')}</td></tr>`
    )
    .join('');

  const styles = includePreviewStyles
    ? `
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
        h1 { margin-bottom: 8px; }
        .meta { margin-bottom: 14px; color: #374151; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        td { border: 1px solid #d1d5db; padding: 8px; font-size: 13px; vertical-align: top; }
        .summary { margin-top: 14px; line-height: 1.5; }
      </style>
    `
    : '';

  return `
    <html>
      <head>${styles}</head>
      <body>
        <h1>${sanitize(analysis?.formatted_output?.title || 'Document Export')}</h1>
        <div class="meta">
          <div><strong>Type:</strong> ${sanitize(analysis?.document_type || 'unknown')}</div>
          <div><strong>Language:</strong> ${sanitize(analysis?.language || 'unknown')}</div>
          <div><strong>Tags:</strong> ${sanitize(tags)}</div>
        </div>
        <table>${rowHtml}</table>
        <div class="summary"><strong>Summary:</strong> ${sanitize(analysis?.summary || '')}</div>
      </body>
    </html>
  `;
};

const exportAsPdf = async ({ analysis, outputPath }) => {
  const html = buildDocumentHtml({ analysis });
  const result = await Print.printToFileAsync({ html });
  await FileSystem.copyAsync({ from: result.uri, to: outputPath });
  return outputPath;
};

const exportAsDoc = async ({ analysis, outputPath }) => {
  const html = buildDocumentHtml({ analysis });
  await FileSystem.writeAsStringAsync(outputPath, html, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return outputPath;
};

const exportAsTxt = async ({ analysis, outputPath }) => {
  const rows = analysis?.formatted_output?.rows || [];
  const tags = Array.isArray(analysis?.tags) ? analysis.tags.join(', ') : '';

  const lines = [
    `Title: ${analysis?.formatted_output?.title || 'Document Export'}`,
    `Type: ${analysis?.document_type || 'unknown'}`,
    `Language: ${analysis?.language || 'unknown'}`,
    `Tags: ${tags}`,
    '',
    'Fields:',
    ...rows.map(([label, value]) => `- ${label || '-'}: ${value || '-'}`),
    '',
    `Summary: ${analysis?.summary || ''}`,
  ];

  await FileSystem.writeAsStringAsync(outputPath, lines.join('\n'), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return outputPath;
};

const exportAsJson = async ({ analysis, outputPath }) => {
  await FileSystem.writeAsStringAsync(outputPath, JSON.stringify(analysis, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return outputPath;
};

const detectSourceImageFormat = (sourceFile) => {
  const mime = sourceFile?.mimeType || '';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';

  const fromName = sourceFile?.fileName?.split('.').pop()?.toLowerCase();
  if (fromName === 'png') return 'png';
  if (fromName === 'jpg' || fromName === 'jpeg') return 'jpg';
  return null;
};

const exportAsImage = async ({ sourceFile, format, outputPath }) => {
  if (!sourceFile?.uri) {
    throw new Error('Original image is required for image export.');
  }

  const sourceFormat = detectSourceImageFormat(sourceFile);
  if (sourceFormat && sourceFormat !== format) {
    throw new Error(
      `Image conversion ${sourceFormat.toUpperCase()} → ${format.toUpperCase()} is currently unavailable. ` +
        `Choose ${sourceFormat.toUpperCase()} or export as PDF/DOC/TXT/JSON.`
    );
  }

  await FileSystem.copyAsync({ from: sourceFile.uri, to: outputPath });
  return outputPath;
};

export async function exportDocument({ analysis, sourceFile, format }) {
  const targetFormat = String(format || '').toLowerCase();

  if (!SUPPORTED_EXPORT_FORMATS.includes(targetFormat)) {
    throw new Error(`Unsupported export format: ${targetFormat}`);
  }

  if (!analysis) {
    throw new Error('No document analysis available to export.');
  }

  const exportDir = await toExportDir();
  const baseName = getBaseName(sourceFile?.fileName || analysis?.document_type);
  const outputName = `${baseName}-export-${Date.now()}.${targetFormat}`;
  const outputPath = `${exportDir}${outputName}`;

  if (targetFormat === 'pdf') {
    await exportAsPdf({ analysis, outputPath });
  } else if (targetFormat === 'doc') {
    await exportAsDoc({ analysis, outputPath });
  } else if (targetFormat === 'txt') {
    await exportAsTxt({ analysis, outputPath });
  } else if (targetFormat === 'json') {
    await exportAsJson({ analysis, outputPath });
  } else {
    await exportAsImage({ sourceFile, format: targetFormat, outputPath });
  }

  return {
    uri: outputPath,
    fileName: outputName,
    format: targetFormat,
  };
}

export { SUPPORTED_EXPORT_FORMATS };
