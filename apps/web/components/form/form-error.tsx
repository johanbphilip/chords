import { Alert, AlertDescription } from '@/components/ui/alert';

/** What went wrong on the server (or the network) when a valid form was sent. Nothing when there is no error. */
export function FormError({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  );
}
