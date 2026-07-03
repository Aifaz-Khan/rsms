import { PrismaClient, Question, QuestionType } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Utility to extract sense name from a question title.
 * Assumes the title contains one of the sense keywords.
 */
function extractSense(title: string): string {
  const senses = ['eyes', 'ears', 'nose', 'tongue', 'skin'];
  const lower = title.toLowerCase();
  for (const s of senses) {
    if (lower.includes(s)) return s;
  }
  return 'unknown';
}

/**
 * API endpoint that aggregates Yes/No counts for primary‑screening questions per sense.
 * Returns an array of objects like:
 *   { sense: string, yesCount: number, noCount: number, averageYes: number, averageNo: number }
 *
 * It queries the `Answer` table, joins with `Question` to filter YES_NO type
 * and groups by the detected sense.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const prisma = new PrismaClient();
  try {
    // Fetch all answers for YES_NO questions (primary screening)
    const answers = await prisma.answer.findMany({
      include: { question: true },
    });

    // Filter to YES_NO questions only
    const yesNoAnswers = answers.filter(a => a.question.type === QuestionType.YES_NO);

    // Aggregate per sense
    const senseMap: Record<string, { yes: number; no: number }> = {};
    yesNoAnswers.forEach(a => {
      const sense = extractSense(a.question.title);
      if (sense === 'unknown') return; // skip if we cannot determine
      if (!senseMap[sense]) senseMap[sense] = { yes: 0, no: 0 };
      const val = (a.value as any) as string; // stored as JSON string
      if (val.toLowerCase() === 'yes') senseMap[sense].yes += 1;
      else if (val.toLowerCase() === 'no') senseMap[sense].no += 1;
    });

    const totalResponses = yesNoAnswers.length / 5; // approximate respondents per sense assuming equal questions per sense
    const result = Object.entries(senseMap).map(([sense, { yes, no }]) => ({
      sense,
      yesCount: yes,
      noCount: no,
      averageYes: totalResponses ? yes / totalResponses : 0,
      averageNo: totalResponses ? no / totalResponses : 0,
    }));

    return res.status(200).json(result);
  } catch (e) {
    console.error('Failed to compute primary scores', e);
    return res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await prisma.$disconnect();
  }
}
