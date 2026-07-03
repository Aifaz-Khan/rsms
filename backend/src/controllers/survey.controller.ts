import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { createError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth.middleware';
import QRCode from 'qrcode';
import { config } from '../config/env';

export const getSurveys = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Record<string, unknown> = {};
    if (req.user?.role !== 'ADMIN') {
      where.createdById = req.user!.id;
    }
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [surveys, total] = await Promise.all([
      prisma.survey.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { firstName: true, lastName: true, email: true } },
          _count: { select: { sections: true, responses: true } },
        },
      }),
      prisma.survey.count({ where }),
    ]);

    res.json({
      success: true,
      data: surveys,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

export const getSurveyById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const survey = await prisma.survey.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: { options: { orderBy: { order: 'asc' } } },
            },
          },
        },
        surveyLogic: true,
        _count: { select: { responses: true } },
      },
    });

    if (!survey) return next(createError('Survey not found', 404));
    res.json({ success: true, data: survey });
  } catch (error) {
    next(error);
  }
};

export const getSurveyBySlug = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const survey = await prisma.survey.findUnique({
      where: { slug: req.params.slug },
      include: {
        sections: {
          where: { isVisible: true },
          orderBy: { order: 'asc' },
          include: {
            questions: {
              where: { isVisible: true },
              orderBy: { order: 'asc' },
              include: { options: { orderBy: { order: 'asc' } } },
            },
          },
        },
        surveyLogic: true,
      },
    });

    if (!survey) return next(createError('Survey not found', 404));
    if (survey.status !== 'PUBLISHED') return next(createError('Survey is not available', 403));
    if (survey.endDate && survey.endDate < new Date()) return next(createError('Survey has expired', 410));

    res.json({ success: true, data: survey });
  } catch (error) {
    next(error);
  }
};

export const createSurvey = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, startDate, endDate, status, settings, theme, isPublic, allowAnonymous, maxResponses } = req.body;

    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${uuidv4().slice(0, 8)}`;

    const survey = await prisma.survey.create({
      data: {
        title,
        description,
        slug,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: status || 'DRAFT',
        settings,
        theme,
        isPublic: isPublic ?? true,
        allowAnonymous: allowAnonymous ?? true,
        maxResponses,
        createdById: req.user!.id,
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, surveyId: survey.id, action: 'CREATE', entity: 'Survey', entityId: survey.id, newValues: survey },
    });

    res.status(201).json({ success: true, data: survey });
  } catch (error) {
    next(error);
  }
};

export const updateSurvey = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.survey.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(createError('Survey not found', 404));

    const survey = await prisma.survey.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        updatedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, surveyId: survey.id, action: 'UPDATE', entity: 'Survey', entityId: survey.id, oldValues: existing, newValues: survey },
    });

    res.json({ success: true, data: survey });
  } catch (error) {
    next(error);
  }
};

export const deleteSurvey = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const survey = await prisma.survey.findUnique({ where: { id: req.params.id } });
    if (!survey) return next(createError('Survey not found', 404));

    await prisma.survey.delete({ where: { id: req.params.id } });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'DELETE', entity: 'Survey', entityId: req.params.id, oldValues: survey },
    });

    res.json({ success: true, message: 'Survey deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const duplicateSurvey = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const original = await prisma.survey.findUnique({
      where: { id: req.params.id },
      include: {
        sections: {
          include: { questions: { include: { options: true } } },
        },
        surveyLogic: true,
      },
    });

    if (!original) return next(createError('Survey not found', 404));

    const newSlug = `${original.slug}-copy-${uuidv4().slice(0, 8)}`;

    const newSurvey = await prisma.survey.create({
      data: {
        title: `${original.title} (Copy)`,
        description: original.description,
        slug: newSlug,
        status: 'DRAFT',
        settings: original.settings ?? undefined,
        theme: original.theme ?? undefined,
        isPublic: original.isPublic,
        allowAnonymous: original.allowAnonymous,
        createdById: req.user!.id,
      },
    });

    const sectionIdMap: Record<string, string> = {};
    const questionIdMap: Record<string, string> = {};

    for (const section of original.sections) {
      const newSection = await prisma.section.create({
        data: { surveyId: newSurvey.id, title: section.title, description: section.description, order: section.order, isVisible: section.isVisible },
      });
      sectionIdMap[section.id] = newSection.id;

      for (const question of section.questions) {
        const newQuestion = await prisma.question.create({
          data: {
            sectionId: newSection.id,
            type: question.type,
            title: question.title,
            description: question.description,
            placeholder: question.placeholder,
            helpText: question.helpText,
            tooltip: question.tooltip,
            isRequired: question.isRequired,
            order: question.order,
            defaultValue: question.defaultValue,
            validation: question.validation ?? undefined,
            settings: question.settings ?? undefined,
          },
        });
        questionIdMap[question.id] = newQuestion.id;

        for (const option of question.options) {
          await prisma.questionOption.create({
            data: { questionId: newQuestion.id, label: option.label, value: option.value, order: option.order, imageUrl: option.imageUrl },
          });
        }
      }
    }

    res.status(201).json({ success: true, data: newSurvey });
  } catch (error) {
    next(error);
  }
};

export const getSurveyQRCode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const survey = await prisma.survey.findUnique({ where: { id: req.params.id } });
    if (!survey) return next(createError('Survey not found', 404));

    const surveyUrl = `${config.frontendUrl}/survey/${survey.slug}`;
    const qrCode = await QRCode.toDataURL(surveyUrl, { width: 300, margin: 2 });

    res.json({ success: true, data: { qrCode, url: surveyUrl } });
  } catch (error) {
    next(error);
  }
};

export const publishSurvey = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const survey = await prisma.survey.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED' },
    });
    res.json({ success: true, data: survey });
  } catch (error) {
    next(error);
  }
};

export const archiveSurvey = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const survey = await prisma.survey.update({
      where: { id: req.params.id },
      data: { status: 'ARCHIVED' },
    });
    res.json({ success: true, data: survey });
  } catch (error) {
    next(error);
  }
};
