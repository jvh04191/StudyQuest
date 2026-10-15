import { aiConfigured, modelName, provider } from '@/server/ai';
import { accessLocked } from '@/server/guard';

export function GET() {
  const on = aiConfigured();
  return Response.json({ ai: on, provider: on ? provider() : null, model: on ? modelName() : null, locked: accessLocked() });
}
