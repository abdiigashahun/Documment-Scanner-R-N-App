import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const toDisplayTags = (tags) => (Array.isArray(tags) ? tags.join(', ') : '');

const cloneRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => [row?.[0] || '', row?.[1] || '']);
};

const DocumentEditorScreen = ({ visible, initialDocument, onCancel, onApply }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [rows, setRows] = useState([]);
  const [fontSize, setFontSize] = useState(14);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [align, setAlign] = useState('left');

  useEffect(() => {
    if (!initialDocument) return;

    setTitle(initialDocument.formatted_output?.title || 'Document Preview');
    setBody(initialDocument.summary || '');
    setTagsText(toDisplayTags(initialDocument.tags));
    setRows(cloneRows(initialDocument.formatted_output?.rows));

    const style = initialDocument.editor_style || {};
    setFontSize(style.fontSize || 14);
    setBold(Boolean(style.bold));
    setItalic(Boolean(style.italic));
    setUnderline(Boolean(style.underline));
    setAlign(style.align || 'left');
  }, [initialDocument]);

  const previewStyle = useMemo(
    () => ({
      fontSize,
      fontWeight: bold ? '700' : '400',
      fontStyle: italic ? 'italic' : 'normal',
      textDecorationLine: underline ? 'underline' : 'none',
      textAlign: align,
      color: '#e5e7eb',
      lineHeight: Math.round(fontSize * 1.55),
    }),
    [align, bold, fontSize, italic, underline]
  );

  const updateRow = (index, part, value) => {
    setRows((prev) => {
      const next = [...prev];
      const target = [...(next[index] || ['', ''])];
      target[part] = value;
      next[index] = target;
      return next;
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, ['', '']]);
  };

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleApply = () => {
    const cleanRows = rows
      .map(([label, value]) => [String(label || '').trim(), String(value || '').trim()])
      .filter(([label, value]) => label || value);

    const tags = tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    onApply({
      ...initialDocument,
      summary: body,
      tags,
      formatted_output: {
        title: title.trim() || 'Document Preview',
        rows: cleanRows,
      },
      editor_style: {
        fontSize,
        bold,
        italic,
        underline,
        align,
      },
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onCancel}>
            <Text style={styles.headerButtonText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Document Editor</Text>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.toolbar}>
            <TouchableOpacity style={styles.toolBtn} onPress={() => setBold((v) => !v)}>
              <Text style={[styles.toolText, bold && styles.toolTextActive]}>B</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={() => setItalic((v) => !v)}>
              <Text style={[styles.toolText, italic && styles.toolTextActive]}>I</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={() => setUnderline((v) => !v)}>
              <Text style={[styles.toolText, underline && styles.toolTextActive]}>U</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={() => setAlign('left')}>
              <Text style={[styles.toolText, align === 'left' && styles.toolTextActive]}>L</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={() => setAlign('center')}>
              <Text style={[styles.toolText, align === 'center' && styles.toolTextActive]}>C</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={() => setAlign('right')}>
              <Text style={[styles.toolText, align === 'right' && styles.toolTextActive]}>R</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={() => setFontSize((s) => Math.max(10, s - 1))}>
              <Text style={styles.toolText}>A-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={() => setFontSize((s) => Math.min(30, s + 1))}>
              <Text style={styles.toolText}>A+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />

          <Text style={styles.label}>Tags (comma separated)</Text>
          <TextInput style={styles.input} value={tagsText} onChangeText={setTagsText} />

          <Text style={styles.label}>Structured Rows</Text>
          <View style={styles.rowsWrap}>
            {rows.map(([label, value], index) => (
              <View key={`row-${index}`} style={styles.rowEditor}>
                <TextInput
                  placeholder="Label"
                  placeholderTextColor="#6b7280"
                  style={[styles.input, styles.rowInput]}
                  value={label}
                  onChangeText={(text) => updateRow(index, 0, text)}
                />
                <TextInput
                  placeholder="Value"
                  placeholderTextColor="#6b7280"
                  style={[styles.input, styles.rowInput]}
                  value={value}
                  onChangeText={(text) => updateRow(index, 1, text)}
                />
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeRow(index)}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addRowBtn} onPress={addRow}>
              <Text style={styles.addRowBtnText}>+ Add Row</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Body</Text>
          <TextInput
            style={[styles.input, styles.bodyInput]}
            multiline
            textAlignVertical="top"
            value={body}
            onChangeText={setBody}
          />

          <Text style={styles.label}>Live Preview</Text>
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>{title || 'Document Preview'}</Text>
            {rows.map(([label, value], index) => (
              <View key={`preview-${index}`} style={styles.previewRow}>
                <Text style={styles.previewKey}>{label || '-'}</Text>
                <Text style={styles.previewValue}>{value || '-'}</Text>
              </View>
            ))}
            <Text style={[styles.previewBody, previewStyle]}>{body || 'No body content.'}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050816',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#f9fafb',
    fontSize: 17,
    fontWeight: '700',
  },
  headerButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 999,
  },
  headerButtonText: {
    color: '#e5e7eb',
    fontSize: 12,
  },
  applyButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
  applyButtonText: {
    color: '#022c22',
    fontSize: 12,
    fontWeight: '700',
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  toolBtn: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toolText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
  },
  toolTextActive: {
    color: '#4ade80',
  },
  label: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    color: '#f9fafb',
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#020617',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 14,
    fontSize: 13,
  },
  rowsWrap: {
    marginBottom: 4,
  },
  rowEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rowInput: {
    flex: 1,
    marginBottom: 0,
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#7f1d1d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: '#fca5a5',
  },
  addRowBtn: {
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    marginBottom: 14,
  },
  addRowBtnText: {
    color: '#bbf7d0',
    fontSize: 12,
    fontWeight: '600',
  },
  bodyInput: {
    minHeight: 140,
  },
  previewCard: {
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#020617',
    borderRadius: 12,
    padding: 12,
  },
  previewTitle: {
    color: '#f9fafb',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  previewKey: {
    color: '#86efac',
    fontSize: 12,
    flex: 1,
  },
  previewValue: {
    color: '#dcfce7',
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
  },
  previewBody: {
    marginTop: 12,
  },
});

export default DocumentEditorScreen;
