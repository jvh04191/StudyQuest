import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useAccess } from '@/lib/access';
import { color as C, font, radius, size, space } from '@/theme/tokens';

export function AccessGate() {
  const { phase, error, submit } = useAccess();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  if (phase === 'checking') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.teal} />
      </View>
    );
  }

  const go = async () => {
    setBusy(true);
    await submit(value);
    setBusy(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
      <View style={{ width: '100%', maxWidth: 380, gap: space.md }}>
        <Text style={{ color: C.text, fontFamily: font.displayBold, fontSize: size.xl }}>StudyQuest</Text>
        <Text style={{ color: C.textMuted, fontFamily: font.body, fontSize: size.md }}>
          Enter your access code. It also keeps your progress in sync across your devices.
        </Text>
        <TextInput
          value={value}
          onChangeText={setValue}
          onSubmitEditing={go}
          placeholder="Access code"
          placeholderTextColor={C.textFaint}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            color: C.text,
            fontFamily: font.body,
            fontSize: size.md,
            backgroundColor: C.surface2,
            borderColor: C.lineStrong,
            borderWidth: 1,
            borderRadius: radius.md,
            padding: space.md,
          }}
        />
        {error ? <Text style={{ color: C.coral, fontFamily: font.bodyMedium, fontSize: size.sm }}>{error}</Text> : null}
        <Pressable
          onPress={go}
          disabled={busy}
          style={{ backgroundColor: C.teal, borderRadius: radius.md, padding: space.md, alignItems: 'center', opacity: busy ? 0.6 : 1 }}>
          <Text style={{ color: C.onAccent, fontFamily: font.bodyBold, fontSize: size.md }}>{busy ? 'Checking…' : 'Unlock'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
