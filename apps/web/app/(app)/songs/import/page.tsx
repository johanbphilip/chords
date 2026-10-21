'use client';

import { useState } from 'react';
import { PasteForm } from '@/components/songs/import/paste-form';
import { ReviewForm } from '@/components/songs/import/review-form';
import type { Parsed } from '@/lib/songs/types';

export default function ImportPage() {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<Parsed | null>(null);

  if (parsed) return <ReviewForm parsed={parsed} onBack={() => setParsed(null)} />;
  return (
    <PasteForm
      initialText={text}
      onParsed={(pasted, result) => {
        setText(pasted);
        setParsed(result);
      }}
    />
  );
}
