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
 * Returns response count broken down by participant type.
 * Combines "Are you.." (student/teaching_staff/intern) and
 * "Are you? (For Non-teaching staff)" (receptionist/nurse/etc.) questions.
 */
export const getParticipantBreakdown = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const LABEL_MAP: Record<string, string> = {
      student: 'Student',
      teaching_staff: 'Teaching Staff',
      intern: 'Intern',
      receptionist: 'Receptionist',
      cleaner: 'Cleaner',
      watchmen: 'Watchmen',
      driver: 'Driver',
      nurse: 'Nurse',
      gardener: 'Gardener',
    };

    // Primary type question  ("Are you..")
    const primaryQ = await prisma.question.findFirst({
      where: { title: { contains: 'Are you..', mode: 'insensitive' } },
      select: { id: true },
    });

    // Non-teaching staff sub-type question
    const nonTeachingQ = await prisma.question.findFirst({
      where: { title: { contains: 'For Non-teaching staff', mode: 'insensitive' } },
      select: { id: true },
    });

    const counts: Record<string, number> = {};

    if (primaryQ) {
      const answers = await prisma.answer.findMany({ where: { questionId: primaryQ.id }, select: { value: true } });
      answers.forEach((a) => {
        const raw = String(a.value).toLowerCase().trim();
        const label = LABEL_MAP[raw] ?? raw;
        counts[label] = (counts[label] || 0) + 1;
      });
    }

    if (nonTeachingQ) {
      const answers = await prisma.answer.findMany({ where: { questionId: nonTeachingQ.id }, select: { value: true } });
      answers.forEach((a) => {
        const raw = String(a.value).toLowerCase().trim();
        const label = LABEL_MAP[raw] ?? raw;
        counts[label] = (counts[label] || 0) + 1;
      });
    }

    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    const breakdown = Object.entries(counts)
      .map(([type, count]) => ({ type, count, percent: total > 0 ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    res.json({ success: true, data: { breakdown, total } });
  } catch (error) {
    next(error);
  }
};

/**
 * Returns frequency answer distribution (Always/Often/Sometimes/Rarely/Never)
 * grouped by sense organ (Indriya) across all survey sections.
 * Questions from professional/detailed assessment sections are all classified
 * by keyword matching so every eye/ear/nose/tongue/skin question appears
 * under the correct indriya tab regardless of which section it lives in.
 */
export const getFrequencyDistribution = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const FREQ_VALUES = ['always', 'often', 'sometimes', 'rarely', 'never'];
    const ORDER = ['Always', 'Often', 'Sometimes', 'Rarely', 'Never'];

    // Load all sections → questions in survey order
    const sections = await prisma.section.findMany({
      orderBy: { order: 'asc' },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          select: { id: true, title: true, type: true },
        },
      },
    });

    // Load all RADIO answers with questionId
    const answers = await prisma.answer.findMany({
      where: { question: { type: 'RADIO' } },
      select: { questionId: true, value: true },
    });

    // Build questionId → frequency distribution map
    const qMap: Record<string, Record<string, number>> = {};
    answers.forEach((a) => {
      const val = String(a.value).toLowerCase().trim();
      if (!FREQ_VALUES.includes(val)) return;
      const key = val.charAt(0).toUpperCase() + val.slice(1);
      if (!qMap[a.questionId]) qMap[a.questionId] = { Always: 0, Often: 0, Sometimes: 0, Rarely: 0, Never: 0 };
      qMap[a.questionId][key] = (qMap[a.questionId][key] || 0) + 1;
    });

    // Classify a question title into an indriya group
    function classifyIndriya(title: string): string {
      const t = title.toLowerCase();
      if (
        t.includes('eye') || t.includes('vision') || t.includes('blurred') ||
        t.includes('headlight') || t.includes('watering') || t.includes('goggle') ||
        t.includes('cctv') || t.includes('computer screen') || t.includes('eye strain') ||
        t.includes('eye irritation') || t.includes('eye examination') || t.includes('eye protection') ||
        t.includes('seeing clearly') || t.includes('reading road signs') || t.includes('bright lights') ||
        t.includes('night driving') || t.includes('screen') || t.includes('chakshu')
      ) return 'Eyes (Chakshu)';

      if (
        t.includes('ear') || t.includes('hearing') || t.includes('ringing') ||
        t.includes('tinnitus') || t.includes('buzzing') || t.includes('horns') ||
        t.includes('loud noise') || t.includes('audiometry') || t.includes('shrotra') ||
        t.includes('loud traffic') || t.includes('loud conversations') || t.includes('machinery')
      ) return 'Ears (Karna)';

      if (
        t.includes('nose') || t.includes('nasal') || t.includes('smell') ||
        t.includes('sneez') || t.includes('blockage') || t.includes('perfume') ||
        t.includes('odour') || t.includes('fumes') || t.includes('incense') ||
        t.includes('cold (running') || t.includes('ghrana') || t.includes('olfact') ||
        t.includes('hot air') || t.includes('room freshener') || t.includes('chemical fumes') ||
        t.includes('dust, smoke')
      ) return 'Nose (Ghrana)';

      if (
        t.includes('tongue') || t.includes('taste') || t.includes('oral') ||
        t.includes('mouth ulcer') || t.includes('tongue scraper') || t.includes('coating on') ||
        t.includes('thirst') || t.includes('metallic taste') || t.includes('dryness of mouth') ||
        t.includes('rasana') || t.includes('loss of taste') || t.includes('prolonged speaking')
      ) return 'Tongue (Rasana)';

      if (
        t.includes('skin') || t.includes('itch') || t.includes('rash') ||
        t.includes('dryness') || t.includes('glove') || t.includes('tingling') ||
        t.includes('numbness') || t.includes('sanitizer') || t.includes('disinfect') ||
        t.includes('extreme weather') || t.includes('hot or cold water') || t.includes('sparsha') ||
        t.includes('bare hands') || t.includes('thorn') || t.includes('insect bite') ||
        t.includes('wash your hand') || t.includes('wash your eyes') ||
        t.includes('protective measures') || t.includes('sanitary precautions') ||
        t.includes('mask while') || t.includes('garbage') || t.includes('chemicals with bare')
      ) return 'Skin (Sparsha)';

      if (
        t.includes('mental') || t.includes('stress') || t.includes('focus') ||
        t.includes('memory') || t.includes('concentration') || t.includes('forget') ||
        t.includes('recall') || t.includes('meditation') || t.includes('yoga') ||
        t.includes('anxiety') || t.includes('attentive') || t.includes('alert') ||
        t.includes('sleep') || t.includes('tired') || t.includes('mistakes') ||
        t.includes('reminders') || t.includes('mentally') || t.includes('pranayama') ||
        t.includes('manas')
      ) return 'Manas (Mind)';

      if (
        t.includes('physical activity') || t.includes('exercise') ||
        t.includes('unhealthy') || t.includes('processed food') || t.includes('skip meals') ||
        t.includes('irregular timing') || t.includes('pollutant') || t.includes('ayurvedic') ||
        t.includes('lifestyle') || t.includes('breaks while using') || t.includes('digital devices')
      ) return 'Risk Factors & Lifestyle';

      return 'General';
    }

    // Group questions by indriya
    const indriyas: Record<string, { question: string; total: number; distribution: { label: string; count: number; percent: number }[] }[]> = {};

    sections.forEach((s) => {
      s.questions.forEach((q) => {
        if (!qMap[q.id]) return;
        const group = classifyIndriya(q.title);
        const dist = qMap[q.id];
        const total = Object.values(dist).reduce((sum, v) => sum + v, 0);
        if (total === 0) return;
        if (!indriyas[group]) indriyas[group] = [];
        // Avoid duplicate question titles across sections
        if (!indriyas[group].some((x) => x.question === q.title)) {
          indriyas[group].push({
            question: q.title,
            total,
            distribution: ORDER.map((label) => ({
              label,
              count: dist[label] ?? 0,
              percent: total > 0 ? Math.round(((dist[label] ?? 0) / total) * 100) : 0,
            })),
          });
        }
      });
    });

    // Ordered indriya output
    const INDRIYA_ORDER = ['Eyes (Chakshu)', 'Ears (Karna)', 'Nose (Ghrana)', 'Tongue (Rasana)', 'Skin (Sparsha)', 'Manas (Mind)', 'Risk Factors & Lifestyle', 'General'];
    const byIndriya = INDRIYA_ORDER
      .filter((name) => indriyas[name] && indriyas[name].length > 0)
      .map((name) => ({
        section: name,
        totalAnswers: indriyas[name].reduce((s, q) => s + q.total, 0),
        questions: indriyas[name],
      }));

    res.json({ success: true, data: { bySectionTitle: byIndriya } });
  } catch (error) {
    next(error);
  }
};
