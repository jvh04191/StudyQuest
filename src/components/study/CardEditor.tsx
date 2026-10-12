import { useState } from 'react';
import { View } from 'react-native';

import { Button, Field, T } from '@/components/ui/primitives';
import type { DraftCard } from '@/store/useStore';
import { color as C, radius, space } from '@/theme/tokens';

export function CardEditor({
  initial,
  onSave,
  onCancel,
  saveLabel = 'Save card',
}: {
  initial?: DraftCard;
  onSave: (c: DraftCard) => void;
  onCancel: () => void;
  saveLabel?: string;
}) {
  const [front, setFront] = useState(initial?.front ?? '');
  const [back, setBack] = useState(initial?.back ?? '');
  const [detail, setDetail] = useState(initial?.detail ?? '');
  const [hint, setHint] = useState(initial?.hint ?? '');
  const [d1, setD1] = useState(initial?.distractors?.[0] ?? '');
  const [d2, setD2] = useState(initial?.distractors?.[1] ?? '');
  const [d3, setD3] = useState(initial?.distractors?.[2] ?? '');
  const ok = front.trim() && back.trim();
  return (
    <View style={{ gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.lineStrong }}>
      <Field label="Question" value={front} onChangeText={setFront} placeholder="What does the mitochondrion do?" multiline inputStyle={{ minHeight: 70 }} />
      <Field label="Answer" value={back} onChangeText={setBack} placeholder="Short answers work best for typed questions" />
      <Field label="Explanation (optional)" value={detail} onChangeText={setDetail} placeholder="Why the answer is right" multiline inputStyle={{ minHeight: 70 }} />
      <Field label="Hint (optional)" value={hint} onChangeText={setHint} placeholder="A nudge that doesn’t give it away" />
      <View style={{ gap: 6 }}>
        <T v="caption">Wrong answers for multiple choice (optional, add at least 2)</T>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Field value={d1} onChangeText={setD1} placeholder="Wrong answer 1" style={{ flex: 1, minWidth: 150 }} accessibilityLabel="Wrong answer 1" />
          <Field value={d2} onChangeText={setD2} placeholder="Wrong answer 2" style={{ flex: 1, minWidth: 150 }} accessibilityLabel="Wrong answer 2" />
          <Field value={d3} onChangeText={setD3} placeholder="Wrong answer 3" style={{ flex: 1, minWidth: 150 }} accessibilityLabel="Wrong answer 3" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button
          label={saveLabel}
          icon="check"
          disabled={!ok}
          onPress={() =>
            onSave({
              front,
              back,
              detail,
              hint,
              distractors: [d1, d2, d3].map((x) => x.trim()).filter(Boolean),
              aliases: initial?.aliases,
              source: initial?.source,
            })
          }
        />
        <Button kind="ghost" label="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}
