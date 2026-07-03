import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { createError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth.middleware';

// Generate or retrieve participant token
export const getParticipantToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { surveyId, email } = req.body;
    const existingToken = req.headers['x-participant-token'] as string;

    // Check if existing token is valid
    if (existingToken) {
      const tokenRecord = await prisma.participantToken.findUnique({
        where: { token: existingToken },
        include: { response: true },
      });

      if (tokenRecord && tokenRecord.surveyId === surveyId) {
        await prisma.participantToken.update({
          where: { id: tokenRecord.id },
          data: { lastSeenAt: new Date() },
        });
        return res.json({
          success: true,
          data: {
            token: tokenRecord.token,
            responseId: tokenRecord.response?.id,
            status: tokenRecord.response?.status,
            currentSectionId: tokenRecord.response?.currentSectionId,
          },
        });
      }
    }

    // Create new token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const participantToken = await prisma.participantToken.create({
      data: { surveyId, email, expiresAt },
    });

    res.status(201).json({
      success: true,
      data: { token: participantToken.token },
    });
  } catch (error) {
    next(error);
  }
};

export const startResponse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const participantToken = req.headers['x-participant-token'] as string;
    if (!participantToken) return next(createError('Participant token required', 401));

    const tokenRecord = await prisma.participantToken.findUnique({
      where: { token: participantToken },
      include: { response: true },
    });

    if (!tokenRecord) return next(createError('Invalid participant token', 401));
    if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
      return next(createError('Participant token expired', 401));
    }

    // Return existing response if exists
    if (tokenRecord.response) {
      const response = await prisma.response.findUnique({
        where: { id: tokenRecord.response.id },
        include: { answers: true },
      });
      return res.json({ success: true, data: response });
    }

    // Create new response
    const survey = await prisma.survey.findUnique({
      where: { id: tokenRecord.surveyId },
      include: { sections: { orderBy: { order: 'asc' }, take: 1 } },
    });

    if (!survey) return next(createError('Survey not found', 404));

    const response = await prisma.response.create({
      data: {
        surveyId: tokenRecord.surveyId,
        participantTokenId: tokenRecord.id,
        status: 'IN_PROGRESS',
        currentSectionId: survey.sections[0]?.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      include: { answers: true },
    });

    res.status(201).json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
};

export const saveAnswers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const participantToken = req.headers['x-participant-token'] as string;
    if (!participantToken) return next(createError('Participant token required', 401));

    const { responseId, answers, currentSectionId, currentQuestionOrder } = req.body;

    const tokenRecord = await prisma.participantToken.findUnique({ where: { token: participantToken } });
    if (!tokenRecord) return next(createError('Invalid participant token', 401));

    const response = await prisma.response.findUnique({ where: { id: responseId } });
    if (!response || response.participantTokenId !== tokenRecord.id) {
      return next(createError('Unauthorized', 403));
    }

    if (response.status === 'COMPLETED') {
      return next(createError('Survey already submitted', 400));
    }

    // Upsert answers
    await Promise.all(
      answers.map((answer: { questionId: string; value: unknown }) =>
        prisma.answer.upsert({
          where: { responseId_questionId: { responseId, questionId: answer.questionId } },
          update: { value: answer.value as never, updatedAt: new Date() },
          create: { responseId, questionId: answer.questionId, value: answer.value as never },
        })
      )
    );

    await prisma.response.update({
      where: { id: responseId },
      data: { currentSectionId, currentQuestionOrder, lastSavedAt: new Date() },
    });

    await prisma.participantToken.update({
      where: { id: tokenRecord.id },
      data: { lastSeenAt: new Date() },
    });

    res.json({ success: true, message: 'Answers saved', data: { savedAt: new Date() } });
  } catch (error) {
    next(error);
  }
};

export const submitResponse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const participantToken = req.headers['x-participant-token'] as string;
    if (!participantToken) return next(createError('Participant token required', 401));

    const { responseId, answers } = req.body;

    const tokenRecord = await prisma.participantToken.findUnique({ where: { token: participantToken } });
    if (!tokenRecord) return next(createError('Invalid participant token', 401));

    const response = await prisma.response.findUnique({
      where: { id: responseId },
      include: { survey: { include: { sections: { include: { questions: { where: { isRequired: true } } } } } } },
    });

    if (!response || response.participantTokenId !== tokenRecord.id) {
      return next(createError('Unauthorized', 403));
    }

    if (response.status === 'COMPLETED') {
      return next(createError('Survey already submitted', 400));
    }

    // Save final answers
    if (answers && answers.length > 0) {
      await Promise.all(
        answers.map((answer: { questionId: string; value: unknown }) =>
          prisma.answer.upsert({
            where: { responseId_questionId: { responseId, questionId: answer.questionId } },
            update: { value: answer.value as never, updatedAt: new Date() },
            create: { responseId, questionId: answer.questionId, value: answer.value as never },
          })
        )
      );
    }

    const completionTime = Math.floor((Date.now() - response.startedAt.getTime()) / 1000);

    await prisma.response.update({
      where: { id: responseId },
      data: { status: 'COMPLETED', completedAt: new Date(), completionTime, lastSavedAt: new Date() },
    });

    res.json({ success: true, message: 'Survey submitted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getResponses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { surveyId, page = 1, limit = 20, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Record<string, unknown> = {};
    if (surveyId) where.surveyId = surveyId;
    if (status) where.status = status;

    const [responses, total] = await Promise.all([
      prisma.response.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { startedAt: 'desc' },
        include: {
          survey: { select: { title: true, slug: true } },
          participantToken: { select: { email: true, metadata: true } },
          _count: { select: { answers: true } },
        },
      }),
      prisma.response.count({ where }),
    ]);

    res.json({
      success: true,
      data: responses,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

export const getResponseById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const response = await prisma.response.findUnique({
      where: { id: req.params.id },
      include: {
        survey: {
          include: {
            sections: {
              orderBy: { order: 'asc' },
              include: { questions: { orderBy: { order: 'asc' }, include: { options: true } } },
            },
          },
        },
        answers: { include: { question: { select: { title: true, type: true } } } },
        participantToken: { select: { email: true, metadata: true, createdAt: true } },
      },
    });

    if (!response) return next(createError('Response not found', 404));
    res.json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
};

export const deleteResponse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.response.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Response deleted' });
  } catch (error) {
    next(error);
  }
};
