import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

async function getMessage(): Promise<string> {
  try {
    const res = await fetch(`${process.env.API_URL ?? 'http://localhost:4000'}/hello`, {
      cache: 'no-store',
    });
    if (!res.ok) return `API error ${res.status}`;
    const body = (await res.json()) as { message: string };
    return body.message;
  } catch {
    return 'Could not reach the API';
  }
}

export default async function Home() {
  const message = await getMessage();
  return (
    <main className="mx-auto max-w-md p-4">
      <Card>
        <CardHeader>
          <CardTitle>Chords</CardTitle>
        </CardHeader>
        <CardContent>{message}</CardContent>
      </Card>
    </main>
  );
}
