import React, { useState } from 'react';
import {
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
import { analyzeDocumentImage } from '../api/mlkitClient';

const DashboardScreen = () => {
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [capturedUri, setCapturedUri] = useState(null);
  const [pickedFile, setPickedFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const runAnalysis = async (uri, mimeType) => {
    try {
      setAnalyzing(true);
      setAnalysisError(null);
      setAnalysis(null);
      setPreviewVisible(true);

      const result = await analyzeDocumentImage({ uri, mimeType });
      setAnalysis(result);
    } catch (err) {
      console.error('Document analysis failed', err);
      setAnalysisError(err.message || 'Document analysis failed.');
    } finally {
      setAnalyzing(false);
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
    runAnalysis(photo.uri, 'image/jpeg');
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
      runAnalysis(file.uri, mimeType);
    }
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
            Camera, upload, and AI-powered text extraction are enabled. Preview the structured
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
                <Text style={styles.previewLoadingText}>Extracting text with Google ML Kit…</Text>
              </View>
            )}

            {!analyzing && analysisError && (
              <View style={styles.previewError}>
                <Text style={styles.previewErrorText}>{analysisError}</Text>
              </View>
            )}

            {!analyzing && analysis && (
              <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={false}>
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
                style={styles.previewCancelButton}
                activeOpacity={0.7}
                onPress={() => setPreviewVisible(false)}
              >
                <Text style={styles.previewCancelText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewSaveButton}
                activeOpacity={0.7}
                onPress={() => setPreviewVisible(false)}
              >
                <Text style={styles.previewSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  previewSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
  previewSaveText: {
    color: '#022c22',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default DashboardScreen;

