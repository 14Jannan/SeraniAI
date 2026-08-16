import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';

const AppHeader = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          paddingTop: insets.top + 8,
        },
      ]}
    >
      <View style={styles.headerContent}>
        <Text style={[styles.title, { color: colors.text }]}>SeraniAI</Text>
        <NotificationBell tintColor={colors.text} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
});

export default AppHeader;
