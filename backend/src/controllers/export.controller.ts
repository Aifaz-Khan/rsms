import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middlewares/auth.middleware';
import { createError } from '../middlewares/errorHandler';
import * as XLSX from 'xlsx';

export const exportCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { surveyId } = req.params;

    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: { questions: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!survey) return next(createError('Survey not found', 404));

    const responses = await prisma.response.findMany({
      where: { surveyId },
      include: {
        answers: true,
        participantToken: { select: { email: true, createdAt: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    const questions = survey.sections.flatMap((s) => s.questions);
    const headers = ['Response ID', 'Status', 'Started At', 'Completed At', 'Email', ...questions.map((q) => q.title)];

    const rows = responses.map((response) => {
      const answerMap: Record<string, string> = {};
      response.answers.forEach((a) => {
        const val = a.value;
        answerMap[a.questionId] = Array.isArray(val) ? val.join(', ') : String(val ?? '');
      });

      return [
        response.id,
        response.status,
        response.startedAt.toISOString(),
        response.completedAt?.toISOString() ?? '',
        response.participantToken?.email ?? '',
        ...questions.map((q) => answerMap[q.id] ?? ''),
      ];
    });

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${survey.slug}-responses.csv"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

export const exportExcel = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { surveyId } = req.params;

    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: { questions: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!survey) return next(createError('Survey not found', 404));

    const responses = await prisma.response.findMany({
      where: { surveyId },
      include: {
        answers: true,
        participantToken: { select: { email: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    const questions = survey.sections.flatMap((s) => s.questions);

    const data = responses.map((response) => {
      const answerMap: Record<string, string> = {};
      response.answers.forEach((a) => {
        const val = a.value;
        answerMap[a.questionId] = Array.isArray(val) ? val.join(', ') : String(val ?? '');
      });

      const row: Record<string, string> = {
        'Response ID': response.id,
        Status: response.status,
        'Started At': response.startedAt.toISOString(),
        'Completed At': response.completedAt?.toISOString() ?? '',
        Email: response.participantToken?.email ?? '',
      };

      questions.forEach((q) => {
        row[q.title] = answerMap[q.id] ?? '';
      });

      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Responses');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${survey.slug}-responses.xlsx"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
