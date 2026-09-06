import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Check, ClipboardPaste, FlaskConical, FolderOpen, ShieldCheck, TriangleAlert, X } from 'lucide-react-native';
import { colors, fonts } from '../theme';
import { T } from '../components/T';
import { SecondaryButton } from '../components/Button';
import { Disclosure } from '../components/Disclosure';
import { Sheet } from '../components/Sheet';
import type { Deal } from '../state/useDeal';
import { sheetColors, sheetStyles } from './GuideSheet';

function CheckLine({ ok, label, color }: { ok: boolean; label: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      {ok ? <Check size={15} color={color} strokeWidth={2.2} /> : <X size={15} color={color} strokeWidth={2.2} />}
      <T size={12} color={color}>{label}</T>
    </View>
  );
}

export function VerifySheet({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const { agreement, busy, verifyResult, verifyText, setVerifyText, verifyLabel, checkRecord, pickRecord, pasteFromClipboard, checkAlteredCopy } = deal;
  const pass = !!verifyResult && verifyResult.valid && verifyResult.complete;
  const resultColor = pass ? colors.passText : colors.failText;

  return (
    <Sheet title="Trust the record. Check the proof." onClose={onClose}>
      <T size={14} color={sheetColors.intro} lineHeight={26} style={{ marginBottom: 22 }}>Verify a shared SANAD record, or test this agreement. Checks run locally on your device.</T>
      <View style={{ gap: 17 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Choose a signed record" onPress={() => { void pickRecord(); }} style={({ pressed }) => [styles.upload, pressed && { opacity: 0.8 }]}>
          <FolderOpen size={20} color="#52783e" strokeWidth={1.7} />
          <T weight="bold" size={14} color="#52783e">Choose a signed record</T>
          <T size={11} color="#52783e">.json · up to 200 KB</T>
        </Pressable>
        <Disclosure label="Or paste a JSON record" size={12} weight="regular" contentStyle={{ gap: 10, paddingBottom: 6 }}>
          <TextInput
            accessibilityLabel="JSON record to verify"
            value={verifyText}
            onChangeText={(value) => setVerifyText(value.slice(0, 200_000))}
            placeholder="Paste the full contents of a SANAD export"
            placeholderTextColor="#6a7c5c"
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            textAlignVertical="top"
            style={styles.textarea}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <SecondaryButton label="Paste" icon={ClipboardPaste} iconPosition="left" onPress={() => { void pasteFromClipboard(); }} disabled={busy} style={{ flex: 1 }} />
            <SecondaryButton label="Verify pasted record" onPress={() => { void checkRecord(verifyText, 'Pasted record'); }} disabled={!verifyText.trim() || busy} style={{ flex: 2 }} />
          </View>
        </Disclosure>
      </View>
      {agreement && (
        <View style={{ gap: 11, marginTop: 21 }}>
          <SecondaryButton label="Check original" icon={ShieldCheck} iconPosition="left" onPress={() => { void checkRecord(agreement, 'Original agreement'); }} disabled={busy} fullWidth />
          <SecondaryButton label="Test a changed amount" icon={FlaskConical} iconPosition="left" onPress={checkAlteredCopy} disabled={busy} fullWidth />
        </View>
      )}
      {busy && <T size={13} color={sheetColors.copy} style={{ marginTop: 16 }} accessibilityLiveRegion="polite">Checking the fingerprint and signatures…</T>}
      {verifyResult && (
        <View accessibilityLiveRegion="polite" style={[styles.result, { backgroundColor: pass ? colors.passBg : colors.failBg }]}>
          <View style={{ flexDirection: 'row', gap: 11, alignItems: 'flex-start' }}>
            {pass ? <ShieldCheck size={25} color={resultColor} strokeWidth={1.7} /> : <TriangleAlert size={25} color={resultColor} strokeWidth={1.7} />}
            <View style={{ flex: 1 }}>
              <T weight="semibold" size={15} color={resultColor} lineHeight={23}>
                {verifyResult.valid ? verifyResult.complete ? 'Record intact. Both signatures valid.' : 'Intact draft. Still needs signatures.' : 'This record did not pass verification.'}
              </T>
              <T size={11} color={resultColor} style={{ marginTop: 6 }}>{verifyLabel}</T>
            </View>
          </View>
          <T size={12} color={resultColor} lineHeight={22} style={{ marginTop: 15 }}>{verifyResult.message}</T>
          <View style={{ gap: 11, marginTop: 18 }}>
            <CheckLine ok={verifyResult.hashMatches} label="Content fingerprint matches" color={resultColor} />
            <CheckLine ok={verifyResult.signaturesValid} label="Included signatures are valid" color={resultColor} />
            <CheckLine ok={verifyResult.complete} label="Both distinct parties have signed" color={resultColor} />
          </View>
        </View>
      )}
      <T size={11} color={sheetColors.small} lineHeight={21} style={sheetStyles.smallCopy}>The change test alters a copy; your original stays intact. Verification proves consistency with the included keys, not a signer’s real-world identity. A malicious actor replacing the entire record and both keys requires an independent trusted copy to detect.</T>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  upload: { alignItems: 'center', gap: 9, paddingVertical: 20, paddingHorizontal: 13, backgroundColor: '#f0f6e7', borderWidth: 1, borderStyle: 'dashed', borderColor: '#95b279', borderRadius: 10 },
  textarea: { minHeight: 150, backgroundColor: '#f7faf0', borderWidth: 1, borderColor: '#bfd3a9', borderRadius: 7, padding: 12, fontFamily: fonts.mono, fontSize: 13, color: colors.ink },
  result: { padding: 16, borderRadius: 9, marginTop: 22 },
});
