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
        }

        return {
          questionId: question.id,
          questionTitle: question.title,
          questionType: question.type,
          sectionTitle: section.title,
          totalAnswers: answerCount,
          responseRate: totalResponses > 0 ? Math.round((answerCount / totalResponses) * 100) : 0,
          distribution,
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
