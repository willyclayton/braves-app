import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadPlayerOrigin } from '../../lib/origin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const idRaw = req.query.id;
  const id = Number(Array.isArray(idRaw) ? idRaw[0] : idRaw);
  if (!Number.isFinite(id) || id < 1) {
    res.status(400).json({ error: 'Missing player id' });
    return;
  }

  const groupRaw = Array.isArray(req.query.group) ? req.query.group[0] : req.query.group;
  const group = groupRaw === 'pitching' ? 'pitching' : 'hitting';

  try {
    const origin = await loadPlayerOrigin(id, group);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(origin);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to load player history' });
  }
}
