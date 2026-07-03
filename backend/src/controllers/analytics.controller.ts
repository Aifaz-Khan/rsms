import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middlewares/auth.middleware';
import { createError } from '../middlewares/errorHandler';

export const getSurveyAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { surveyId } = req.params;

    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                options: true,
                answers: { select: { value: true } },
              },
            },
          },
        },
        responses: { select: { status: true, completionTime: true, startedAt: true } },
      },
    });

    if (!survey) return next(createError('Survey not found', 404));

    const totalResponses = survey.responses.length;
    const completedResponses = survey.responses.filter((r) => r.status === 'COMPLETED').length;
    const completionRate = totalResponses > 0 ? Math.round((completedResponses / totalResponses) * 100) : 0;

    const avgCompletionTime =
      survey.responses
        .filter((r) => r.status === 'COMPLETED')
        .reduce((acc, r) => acc + (r.completionTime ?? 0), 0) /
      (completedResponses || 1);

    // Question-wise analysis
    const questionAnalysis = survey.sections.flatMap((section) =>
      section.questions.map((question) => {
        const answers = question.answers.map((a) => a.value);
        const answerCount = answers.length;

        let distribution: Record<string, number> = {};
        let textResponses: string[] = [];

        if (['RADIO', 'DROPDOWN', 'YES_NO'].includes(question.type)) {
          answers.forEach((val) => {
            const key = String(val);
            distribution[key] = (distribution[key] || 0) + 1;
          });
        } else if (['CHECKBOX', 'MULTIPLE_SELECT'].includes(question.type)) {
          answers.forEach((val) => {
            if (Array.isArray(val)) {
              val.forEach((v) => {
                const key = String(v);
                distribution[key] = (distribution[key] || 0) + 1;
              });
            }
          });
        } else if (['RATING', 'SLIDER'].includes(question.type)) {
          answers.forEach((val) => {
            const key = String(val);
            distribution[key] = (distribution[key] || 0) + 1;
          });
        } else if (question.type === 'LIKERT_SCALE') {
          answers.forEach((val) => {
            const key = String(val);
            distribution[key] = (distribution[key] || 0) + 1;
          });
        } else {
          // Collect text responses (e.g. for SHORT_TEXT, LONG_TEXT, EMAIL, etc.)
          textResponses = answers
            .filter((val) => val !== null && val !== undefined && val !== '')
            .map((val) => (typeof val === 'object' ? JSON.stringify(val) : String(val)))
            .slice(-30); // Return up to last 30 responses
        }

        return {
          questionId: question.id,
          questionTitle: question.title,
          questionType: question.type,
          sectionTitle: section.title,
          totalAnswers: answerCount,
          responseRate: totalResponses > 0 ? Math.round((answerCount / totalResponses) * 100) : 0,
          distribution,
          textResponses,
        };
      })
    );

    // Section completion rates
    const sectionCompletion = await Promise.all(
      survey.sections.map(async (section) => {
        const questionIds = section.questions.map((q) => q.id);
        if (questionIds.length === 0) return { sectionTitle: section.title, completionRate: 0 };

        const answeredCount = await prisma.answer.count({
          where: { questionId: { in: questionIds } },
        });

        const rate = totalResponses > 0 ? Math.round((answeredCount / (questionIds.length * totalResponses)) * 100) : 0;
        return { sectionTitle: section.title, completionRate: Math.min(rate, 100) };
      })
    );

    // Response trend (last 30 days)
    const responseTrend = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const startOfDay = new Date(dateStr);
      const endOfDay = new Date(dateStr);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const count = await prisma.response.count({
        where: { surveyId, startedAt: { gte: startOfDay, lt: endOfDay } },
      });
      responseTrend.push({ date: dateStr, responses: count });
    }

    res.json({
      success: true,
      data: {
        overview: { totalResponses, completedResponses, completionRate, avgCompletionTime: Math.round(avgCompletionTime / 60) },
        questionAnalysis,
        sectionCompletion,
        responseTrend,
      },
    });
  } catch (error) {
    next(error);
  }
};

function extractSense(title: string): string {
  const lower = title.toLowerCase();
  // Eyes
  if (lower.includes('eye') || lower.includes('vision') || lower.includes('cctv') || lower.includes('screen') || lower.includes('blurred') || lower.includes('headlight') || lower.includes('night driving') || lower.includes('computer screen') || lower.includes('watering')) return 'Eyes';
  // Ears
  if (lower.includes('ear') || lower.includes('hearing') || lower.includes('ringing') || lower.includes('tinnitus') || lower.includes('buzzing') || lower.includes('noise') || lower.includes('horns') || lower.includes('loud')) return 'Ears';
  // Nose
  if (lower.includes('nose') || lower.includes('nasal') || lower.includes('smell') || lower.includes('sneezing') || lower.includes('sneez') || lower.includes('blockage') || lower.includes('nostril') || lower.includes('perfume') || lower.includes('odour') || lower.includes('fumes')) return 'Nose';
  // Tongue / Taste / Oral
  if (lower.includes('tongue') || lower.includes('taste') || lower.includes('oral') || lower.includes('mouth') || lower.includes('thirst') || lower.includes('metallic')) return 'Tongue';
  // Skin
  if (lower.includes('skin') || lower.includes('itch') || lower.includes('rash') || lower.includes('dryness') || lower.includes('glove') || lower.includes('hand') || lower.includes('tingling') || lower.includes('numbness') || lower.includes('sanitizer') || lower.includes('disinfect')) return 'Skin';
  return 'unknown';
}

export const getPrimaryScores = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // All yes/no primary screening questions are stored as RADIO type
    // Fetch all RADIO answers, then filter only those with yes/no values
    const answers = await prisma.answer.findMany({
      where: { question: { type: 'RADIO' } },
      include: { question: { select: { title: true, type: true } } },
    });

    // Keep only yes/no answers (primary screening questions)
    const yesNoAnswers = answers.filter((a) => {
      const val = String(a.value).toLowerCase().trim();
      return val === 'yes' || val === 'no';
    });

    // Aggregate per sense
    const senseMap: Record<string, { yes: number; no: number; total: number }> = {};

    yesNoAnswers.forEach((a) => {
      const sense = extractSense(a.question.title);
      if (sense === 'unknown') return;
      if (!senseMap[sense]) senseMap[sense] = { yes: 0, no: 0, total: 0 };
      const val = String(a.value).toLowerCase().trim();
      senseMap[sense].total += 1;
      if (val === 'yes') senseMap[sense].yes += 1;
      else if (val === 'no') senseMap[sense].no += 1;
    });

    const result = Object.entries(senseMap).map(([sense, { yes, no, total }]) => ({
      sense,
      yesCount: yes,
      noCount: no,
      total,
      yesPercent: total > 0 ? Math.round((yes / total) * 100) : 0,
      noPercent: total > 0 ? Math.round((no / total) * 100) : 0,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Returns frequency answer distribution (Always/Often/Sometimes/Rarely/Never)
 * grouped by sense (Eyes, Ears, Nose, Tongue, Skin, General).
 * Yes/No answers are excluded.
 */
export const getFrequencyDistribution = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const FREQ_VALUES = ['always', 'often', 'sometimes', 'rarely', 'never'];

    const answers = await prisma.answer.findMany({
      where: { question: { type: 'RADIO' } },
      include: { question: { select: { title: true } } },
    });

    // Keep only frequency-type answers (not yes/no)
    const freqAnswers = answers.filter((a) =>
      FREQ_VALUES.includes(String(a.value).toLowerCase().trim())
    );

    function extractSenseFreq(title: string): string {
      const lower = title.toLowerCase();
      if (lower.includes('eye') || lower.includes('vision') || lower.includes('cctv') ||
          lower.includes('blurred') || lower.includes('headlight') || lower.includes('screen') ||
          lower.includes('watering')) return 'Eyes';
      if (lower.includes('ear') || lower.includes('hearing') || lower.includes('ringing') ||
          lower.includes('tinnitus') || lower.includes('buzzing') || lower.includes('loud') ||
          lower.includes('noise') || lower.includes('horns')) return 'Ears';
      if (lower.includes('nose') || lower.includes('nasal') || lower.includes('smell') ||
          lower.includes('sneez') || lower.includes('blockage') || lower.includes('perfume') ||
          lower.includes('odour') || lower.includes('fumes') || lower.includes('incense') ||
          lower.includes('pollen')) return 'Nose';
      if (lower.includes('tongue') || lower.includes('taste') || lower.includes('oral') ||
          lower.includes('mouth') || lower.includes('thirst') || lower.includes('metallic')) return 'Tongue';
      if (lower.includes('skin') || lower.includes('itch') || lower.includes('rash') ||
          lower.includes('dryness') || lower.includes('glove') || lower.includes('tingling') ||
          lower.includes('numbness') || lower.includes('sanitizer') || lower.includes('disinfect') ||
          lower.includes('weather') || lower.includes('hand')) return 'Skin';
      return 'General';
    }

    // ── Group by sense ────────────────────────────────────────────────────
    const SENSES = ['Eyes', 'Ears', 'Nose', 'Tongue', 'Skin', 'General'];
    const senseMap: Record<string, Record<string, number>> = {};
    SENSES.forEach((s) => { senseMap[s] = { Always: 0, Often: 0, Sometimes: 0, Rarely: 0, Never: 0 }; });

    freqAnswers.forEach((a) => {
      const sense = extractSenseFreq(a.question.title);
      const val = String(a.value).trim();
      const key = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
      if (!(sense in senseMap)) senseMap[sense] = { Always: 0, Often: 0, Sometimes: 0, Rarely: 0, Never: 0 };
      if (key in senseMap[sense]) senseMap[sense][key] += 1;
    });

    // Convert to array — one entry per sense with distribution array for pie
    const bySense = SENSES.filter((s) =>
      Object.values(senseMap[s] || {}).some((v) => v > 0)
    ).map((sense) => ({
      sense,
      distribution: Object.entries(senseMap[sense]).map(([label, count]) => ({ label, count })),
      total: Object.values(senseMap[sense]).reduce((s, v) => s + v, 0),
    }));

    res.json({ success: true, data: { bySense } });
  } catch (error) {
    next(error);
  }
};
