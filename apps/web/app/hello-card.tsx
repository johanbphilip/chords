'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiGet } from '@/lib/api';

export function HelloCard() {
  const { data, error, isPending } = useQuery({
    queryKey: ['hello'],
    queryFn: () => apiGet<{ message: string }>('/hello'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chords</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? 'Loading…' : error ? 'Could not reach the API' : data.message}
      </CardContent>
    </Card>
  );
}
