import { accessRequired } from '@/server/access';
import { aiConfigured, modelName, provider } from '@/server/ai';

export function GET() {
  const on = aiConfigured();
  return Response.json({ ai: on, provider: on ? provider() : null, model: on ? modelName() : null, codeRequired: accessRequired() });
}
