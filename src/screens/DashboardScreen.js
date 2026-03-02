import React, { useState } from 'react';
import {
  Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { analyzeDocumentImage } from '../api/tesseractClient';
import { exportDocument, SUPPORTED_EXPORT_FORMATS } from '../api/documentExportClient';
import DocumentEditorScreen from './DocumentEditorScreen';

const getMimeTypeForFormat = (format) => {
  if (format === 'pdf') return 'application/pdf';
  if (format === 'doc') return 'application/msword';
  if (format === 'jpg') return 'image/jpeg';
  if (format === 'png') return 'image/png';
  if (format === 'txt') return 'text/plain';
  if (format === 'json') return 'application/json';
  return 'application/octet-stream';
};

const toFieldKey = (label) =>
  String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const createEditorDocument = (analysis) => {
  if (!analysis) return null;

  const rows =
    analysis.formatted_output?.rows ||
    Object.entries(analysis.fields || {}).map(([key, value]) => [key, String(value || '')]);

  return {
    ...analysis,
    formatted_output: {
      title: analysis.formatted_output?.title || 'Document Preview',
      rows,
    },
  };
};

const DashboardScreen = () => {
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [capturedUri, setCapturedUri] = useState(null);
  const [pickedFile, setPickedFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [sourceFile, setSourceFile] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const [selectedExportFormat, setSelectedExportFormat] = useState('pdf');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorDocument, setEditorDocument] = useState(null);

  const runAnalysis = async (uri, mimeType, fileName) => {
    try {
      setAnalyzing(true);
      setAnalysisError(null);
      setAnalysis(null);
      setSaveMessage(null);
      setPreviewVisible(true);
      setSourceFile({ uri, mimeType, fileName });

      const result = await analyzeDocumentImage({ uri, mimeType, fileName });
      setAnalysis(result);
    } catch (err) {
      console.error('Document analysis failed', err);
      setAnalysisError(err.message || 'Document analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExportDocument = async () => {
    if (!analysis) return;

    try {
      const exported = await exportDocument({
        analysis,
        sourceFile,
        format: selectedExportFormat,
      });

      setSaveMessage(`Exported as ${selectedExportFormat.toUpperCase()}: ${exported.fileName}`);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(exported.uri);
      }
    } catch (err) {
      console.error('Failed to export document', err);
      setSaveMessage(err.message || 'Failed to export document.');
    }
  };

  const handleExportToAndroidFiles = async () => {
    if (!analysis) return;

    if (Platform.OS !== 'android') {
      setSaveMessage('Android File Manager export is available only on Android.');
      return;
    }

    try {
      const exported = await exportDocument({
        analysis,
        sourceFile,
        format: selectedExportFormat,
      });

      const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permission.granted) {
        setSaveMessage('Export created, but folder access was not granted.');
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(exported.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const destinationUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permission.directoryUri,
        exported.fileName,
        getMimeTypeForFormat(exported.format)
      );

      await FileSystem.writeAsStringAsync(destinationUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setSaveMessage(`Saved to Android File Manager: ${exported.fileName}`);
    } catch (err) {
      console.error('Failed to export to Android File Manager', err);
      setSaveMessage(err.message || 'Failed to export to Android File Manager.');
    }
  };

  const handleOpenCamera = async () => {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) {
        return;
      }
    }
    setCameraVisible(true);
  };

  const handleCapture = async (cameraRef) => {
    if (!cameraRef) return;
    const photo = await cameraRef.takePictureAsync();
    setCapturedUri(photo.uri);
    setCameraVisible(false);

    // Assume JPEG for camera captures.
    runAnalysis(photo.uri, 'image/jpeg', 'camera-capture.jpg');
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;
    const file = result.assets?.[0];
    setPickedFile(file ?? null);

    if (file?.uri) {
      const mimeType = file.mimeType || 'image/jpeg';
      runAnalysis(file.uri, mimeType, file.name);
    }
  };

  const handleOpenEditor = () => {
    if (!analysis) return;
    setEditorDocument(createEditorDocument(analysis));
    setEditorVisible(true);
  };

  const handleApplyEditor = (editedDocument) => {
    const rows = editedDocument?.formatted_output?.rows || [];
    const nextFields = { ...(analysis?.fields || {}) };

    rows.forEach(([label, value]) => {
      const key = toFieldKey(label);
      if (!key) return;
      nextFields[key] = value;
    });

    setAnalysis({
      ...analysis,
      ...editedDocument,
      fields: nextFields,
      tags: Array.isArray(editedDocument?.tags) ? editedDocument.tags : analysis?.tags || [],
    });
    setEditorVisible(false);
  };

  let cameraRefLocal = null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.title}>Document Scanner</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>v1.0</Text>
          </View>
        </View>

        <View style={styles.cardPrimary}>
          <Text style={styles.cardTitle}>Quick Scan</Text>
          <Text style={styles.cardSubtitle}>
            Start a new scan from camera or upload an existing file.
          </Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.primaryButton}
              onPress={handleOpenCamera}
            >
              <Text style={styles.primaryButtonText}>Scan from Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.secondaryButton}
              onPress={handlePickDocument}
            >
              <Text style={styles.secondaryButtonText}>Import from Files</Text>
            </TouchableOpacity>
          </View>

          {capturedUri && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Last captured page</Text>
              <Image source={{ uri: capturedUri }} style={styles.previewImage} />
            </View>
          )}

          {pickedFile && (
            <View style={styles.fileContainer}>
              <Text style={styles.previewLabel}>Last uploaded file</Text>
              <Text style={styles.fileName} numberOfLines={1}>
                {pickedFile.name} ({Math.round((pickedFile.size || 0) / 1024)} KB)
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Smart suggestions</Text>
          <Text style={styles.sectionSubtitle}>
            These tiles are just UI previews of what you might do in a real app.
          </Text>

          <View style={styles.grid}>
            <View style={[styles.tile, styles.tileGreen]}>
              <Text style={styles.tileLabel}>Scan receipts</Text>
              <Text style={styles.tileHint}>Keep track of your expenses.</Text>
            </View>
            <View style={[styles.tile, styles.tileBlue]}>
              <Text style={styles.tileLabel}>Sign contracts</Text>
              <Text style={styles.tileHint}>Prepare PDFs for signing.</Text>
            </View>
          </View>

          <View style={styles.grid}>
            <View style={[styles.tile, styles.tileIndigo]}>
              <Text style={styles.tileLabel}>Export as PDF</Text>
              <Text style={styles.tileHint}>Bundle pages into a single file.</Text>
            </View>
            <View style={[styles.tile, styles.tileGray]}>
              <Text style={styles.tileLabel}>Share instantly</Text>
              <Text style={styles.tileHint}>Share documents securely.</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Camera, upload, and OCR-based text extraction are enabled. Preview the structured
            output before saving.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={cameraVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setCameraVisible(false)}
      >
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            ref={(ref) => {
              cameraRefLocal = ref;
            }}
          />
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.cameraButton}
              activeOpacity={0.7}
              onPress={() => handleCapture(cameraRefLocal)}
            >
              <Text style={styles.cameraButtonText}>Capture</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cameraSecondaryButton}
              activeOpacity={0.7}
              onPress={() => setCameraVisible(false)}
            >
              <Text style={styles.cameraSecondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={previewVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.previewOverlay}>
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Scan preview</Text>

            {analyzing && (
              <View style={styles.previewLoading}>
                <ActivityIndicator color="#22c55e" />
                <Text style={styles.previewLoadingText}>Extracting text with Tesseract.js…</Text>
              </View>
            )}

            {!analyzing && analysisError && (
              <View style={styles.previewError}>
                <Text style={styles.previewErrorText}>{analysisError}</Text>
              </View>
            )}

            {!analyzing && analysis && (
              <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={false}>
                {analysis.formatted_output?.rows?.length > 0 && (
                  <View style={styles.previewTemplateCard}>
                    <Text style={styles.previewTemplateTitle}>
                      {analysis.formatted_output.title || 'Structured Preview'}
                    </Text>
                    {analysis.formatted_output.rows.map(([label, value]) => (
                      <View key={`${label}-${value}`} style={styles.previewTemplateRow}>
                        <Text style={styles.previewTemplateKey}>{label}</Text>
                        <Text style={styles.previewTemplateValue}>{value || '-'}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.previewSection}>
                  <Text style={styles.previewSectionLabel}>Document type</Text>
                  <Text style={styles.previewSectionValue}>
                    {analysis.document_type || 'Unknown'}
                  </Text>
                </View>

                <View style={styles.previewSection}>
                  <Text style={styles.previewSectionLabel}>Language</Text>
                  <Text style={styles.previewSectionValue}>
                    {analysis.language || 'Not detected'}
                  </Text>
                </View>

                {Array.isArray(analysis.tags) && analysis.tags.length > 0 && (
                  <View style={styles.previewSection}>
                    <Text style={styles.previewSectionLabel}>Tags</Text>
                    <View style={styles.tagRow}>
                      {analysis.tags.map((tag) => (
                        <View key={tag} style={styles.tagPill}>
                          <Text style={styles.tagPillText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {analysis.summary && (
                  <View style={styles.previewSection}>
                    <Text style={styles.previewSectionLabel}>Summary</Text>
                    <Text style={styles.previewSummary}>{analysis.summary}</Text>
                  </View>
                )}

                {analysis.fields && (
                  <View style={styles.previewSection}>
                    <Text style={styles.previewSectionLabel}>Fields</Text>
                    {Object.entries(analysis.fields).map(([key, value]) => (
                      <View key={key} style={styles.fieldRow}>
                        <Text style={styles.fieldKey}>{key}</Text>
                        <Text style={styles.fieldValue}>{String(value)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.previewEditButton}
                activeOpacity={0.7}
                disabled={!analysis || analyzing || !!analysisError}
                onPress={handleOpenEditor}
              >
                <Text style={styles.previewEditText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewCancelButton}
                activeOpacity={0.7}
                onPress={() => {
                  setSaveMessage(null);
                  setPreviewVisible(false);
                }}
              >
                <Text style={styles.previewCancelText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.previewSaveButton,
                  (!analysis || analyzing || !!analysisError) && styles.previewSaveButtonDisabled,
                ]}
                activeOpacity={0.7}
                disabled={!analysis || analyzing || !!analysisError}
                onPress={handleExportDocument}
              >
                <Text style={styles.previewSaveText}>Export</Text>
              </TouchableOpacity>
              {Platform.OS === 'android' && (
                <TouchableOpacity
                  style={[
                    styles.previewFilesButton,
                    (!analysis || analyzing || !!analysisError) && styles.previewSaveButtonDisabled,
                  ]}
                  activeOpacity={0.7}
                  disabled={!analysis || analyzing || !!analysisError}
                  onPress={handleExportToAndroidFiles}
                >
                  <Text style={styles.previewFilesText}>Export to Files</Text>
                </TouchableOpacity>
              )}
            </View>

            {!analyzing && !analysisError && analysis && (
              <View style={styles.exportFormatsWrap}>
                <Text style={styles.exportFormatsLabel}>Export format</Text>
                <View style={styles.exportFormatRow}>
                  {SUPPORTED_EXPORT_FORMATS.map((format) => {
                    const active = selectedExportFormat === format;
                    return (
                      <TouchableOpacity
                        key={format}
                        style={[styles.exportFormatChip, active && styles.exportFormatChipActive]}
                        onPress={() => setSelectedExportFormat(format)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[styles.exportFormatChipText, active && styles.exportFormatChipTextActive]}
                        >
                          {format.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {!!saveMessage && <Text style={styles.previewInfoText}>{saveMessage}</Text>}
          </View>
        </View>
      </Modal>

      <DocumentEditorScreen
        visible={editorVisible}
        initialDocument={editorDocument}
        onCancel={() => setEditorVisible(false)}
        onApply={handleApplyEditor}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050816',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  greeting: {
    color: '#9ca3af',
    fontSize: 14,
  },
  title: {
    color: '#f9fafb',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  badgeText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  cardPrimary: {
    backgroundColor: '#020617',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#111827',
    marginBottom: 24,
  },
  cardTitle: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#022c22',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#020617',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#e5e7eb',
    fontWeight: '500',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  tile: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
  },
  tileGreen: {
    backgroundColor: '#022c22',
  },
  tileBlue: {
    backgroundColor: '#0b1120',
  },
  tileIndigo: {
    backgroundColor: '#111827',
  },
  tileGray: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#111827',
  },
  tileLabel: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  tileHint: {
    color: '#9ca3af',
    fontSize: 12,
  },
  footer: {
    marginTop: 8,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
  },
  previewContainer: {
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  previewLabel: {
    color: '#9ca3af',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  previewImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#020617',
  },
  fileContainer: {
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  fileName: {
    color: '#e5e7eb',
    fontSize: 12,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#020617',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cameraButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  cameraButtonText: {
    color: '#022c22',
    fontWeight: '600',
    fontSize: 14,
  },
  cameraSecondaryButton: {
    width: 90,
    backgroundColor: '#020617',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
    paddingVertical: 10,
  },
  cameraSecondaryButtonText: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '500',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  previewCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#020617',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  previewTitle: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  previewLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  previewLoadingText: {
    marginTop: 8,
    color: '#9ca3af',
    fontSize: 13,
  },
  previewError: {
    paddingVertical: 12,
  },
  previewErrorText: {
    color: '#fca5a5',
    fontSize: 13,
  },
  previewScroll: {
    marginTop: 4,
    marginBottom: 12,
  },
  previewSection: {
    marginBottom: 10,
  },
  previewSectionLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 2,
  },
  previewSectionValue: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '500',
  },
  previewTemplateCard: {
    borderWidth: 1,
    borderColor: '#14532d',
    backgroundColor: '#052e16',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  previewTemplateTitle: {
    color: '#bbf7d0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  previewTemplateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 10,
  },
  previewTemplateKey: {
    color: '#86efac',
    fontSize: 12,
    flex: 1,
  },
  previewTemplateValue: {
    color: '#dcfce7',
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
  },
  previewSummary: {
    color: '#e5e7eb',
    fontSize: 13,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#020617',
  },
  tagPillText: {
    color: '#9ca3af',
    fontSize: 11,
  },
  fieldRow: {
    marginBottom: 4,
  },
  fieldKey: {
    color: '#9ca3af',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    color: '#e5e7eb',
    fontSize: 13,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  previewCancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#374151',
  },
  previewCancelText: {
    color: '#e5e7eb',
    fontSize: 13,
  },
  previewEditButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#14532d',
  },
  previewEditText: {
    color: '#86efac',
    fontSize: 13,
    fontWeight: '600',
  },
  previewSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
  previewSaveButtonDisabled: {
    opacity: 0.45,
  },
  previewSaveText: {
    color: '#022c22',
    fontSize: 13,
    fontWeight: '600',
  },
  previewFilesButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  previewFilesText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '600',
  },
  previewInfoText: {
    color: '#86efac',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  exportFormatsWrap: {
    marginTop: 12,
  },
  exportFormatsLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 8,
  },
  exportFormatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exportFormatChip: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  exportFormatChipActive: {
    borderColor: '#22c55e',
    backgroundColor: '#052e16',
  },
  exportFormatChipText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
  },
  exportFormatChipTextActive: {
    color: '#86efac',
  },
});

export default DashboardScreen;

