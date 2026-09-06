import { View } from 'react-native';
import { RotateCcw } from 'lucide-react-native';
import { T } from '../components/T';
import { PrimaryButton, SecondaryButton } from '../components/Button';
import { Sheet } from '../components/Sheet';
import { sheetColors } from './GuideSheet';

export function ConfirmSheet({ kind, onClose, onConfirm }: { kind: 'reset' | 'revise'; onClose: () => void; onConfirm: () => void }) {
  const reset = kind === 'reset';
  return (
    <Sheet title={reset ? 'Start the sample deal again?' : 'Create a fresh agreement?'} onClose={onClose}>
      <T size={14} color={sheetColors.intro} lineHeight={26} style={{ marginBottom: 22 }}>
        {reset
          ? 'This clears messages, edits and signatures in this demo. Share a sealed record first if you want to keep it.'
          : 'Changing the terms starts a new draft. Existing signatures cannot carry over. Share the current record first if you need it.'}
      </T>
      <View style={{ gap: 10 }}>
        <PrimaryButton label={reset ? 'Reset demo' : 'Start new draft'} icon={RotateCcw} onPress={onConfirm} fullWidth />
        <SecondaryButton label="Keep working" onPress={onClose} fullWidth />
      </View>
    </Sheet>
  );
}
