import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MOCK_HISTORY = [
  {
    id: '1',
    title: 'Signed contract - ACME Corp',
    date: 'Today · 09:42',
    pages: 8,
    tag: 'Contract',
  },
  {
    id: '2',
    title: 'Receipt - Coffee Shop',
    date: 'Yesterday · 16:21',
    pages: 1,
    tag: 'Receipt',
  },
  {
    id: '3',
    title: 'Boarding pass - NYC trip',
    date: 'Feb 18 · 07:05',
    pages: 2,
    tag: 'Travel',
  },
  {
    id: '4',
    title: 'Notes - Meeting with Product',
    date: 'Feb 14 · 14:30',
    pages: 5,
    tag: 'Notes',
  },
];

const HistoryScreen = () => {
  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.itemContainer}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{item.tag}</Text>
        </View>
      </View>
      <View style={styles.itemMetaRow}>
        <Text style={styles.itemMeta}>{item.date}</Text>
        <Text style={styles.itemMeta}>{item.pages} pages</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>
            Static preview of what your recent scans could look like.
          </Text>
        </View>

        <FlatList
          data={MOCK_HISTORY}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Tapping items does nothing yet. Connect this to your document storage later.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050816',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    color: '#f9fafb',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 13,
  },
  listContent: {
    paddingVertical: 4,
  },
  itemContainer: {
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#111827',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTitle: {
    flex: 1,
    color: '#f9fafb',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#111827',
  },
  tagText: {
    color: '#9ca3af',
    fontSize: 11,
  },
  itemMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  itemMeta: {
    color: '#6b7280',
    fontSize: 12,
  },
  separator: {
    height: 10,
  },
  footer: {
    marginTop: 12,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default HistoryScreen;

