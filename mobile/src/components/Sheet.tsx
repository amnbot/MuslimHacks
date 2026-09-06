import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors } from '../theme';
import { IconButton } from './Button';
import { T } from './T';

/**
 * Replaces the web app's native <dialog>. iOS shows a page sheet; Android slides a
 * full-height surface in. A nested SafeAreaProvider measures the modal's own window.
 */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ios = Platform.OS === 'ios';
  return (
    <Modal visible animationType="slide" presentationStyle={ios ? 'pageSheet' : 'fullScreen'} onRequestClose={onClose} statusBarTranslucent={!ios}>
      <SafeAreaProvider>
        <SafeAreaView edges={ios ? ['bottom'] : ['top', 'bottom']} style={styles.surface}>
          <KeyboardAvoidingView style={styles.surface} behavior={ios ? 'padding' : undefined}>
            <View style={styles.head}>
              <T serif size={24} lineHeight={32} style={styles.title}>{title}</T>
              <IconButton icon={X} label="Close dialog" onPress={onClose} size={20} style={styles.close} />
            </View>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              {children}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  surface: { flex: 1, backgroundColor: colors.paper },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 20,
    paddingBottom: 16,
    paddingLeft: 18,
    paddingRight: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: { flex: 1, letterSpacing: -0.4, color: '#2c2446' },
  close: { marginTop: -6 },
  content: { padding: 22, paddingBottom: 40 },
});
