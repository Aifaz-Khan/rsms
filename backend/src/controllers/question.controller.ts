import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { createError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getQuestions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const questions = await prisma.question.findMany({
      where: { sectionId: req.params.sectionId },
      orderBy: { order: 'asc' },
      include: { options: { orderBy: { order: 'asc' } } },
    });
    res.json({ success: true, data: questions });
  } catch (error) {
    next(error);
  }
};

export const createQuestion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { sectionId } = req.params;
    const { type, title, description, placeholder, helpText, tooltip, isRequired, defaultValue, validation, settings, options } = req.body;

    const lastQuestion = await prisma.question.findFirst({
      where: { sectionId },
      orderBy: { order: 'desc' },
    });

    const question = await prisma.question.create({
      data: {
        sectionId,
        type,
        title,
        description,
        placeholder,
        helpText,
        tooltip,
        isRequired: isRequired ?? false,
        order: (lastQuestion?.order ?? 0) + 1,
        defaultValue,
        validation,
        settings,
      },
    });

    if (options && Array.isArray(options)) {
      await Promise.all(
        options.map((opt: { label: string; value: string; imageUrl?: string }, i: number) =>
          prisma.questionOption.create({
            data: { questionId: question.id, label: opt.label, value: opt.value, order: i + 1, imageUrl: opt.imageUrl },
          })
        )
      );
    }

    const fullQuestion = await prisma.question.findUnique({
      where: { id: question.id },
      include: { options: { orderBy: { order: 'asc' } } },
    });

    res.status(201).json({ success: true, data: fullQuestion });
  } catch (error) {
    next(error);
  }
};

export const updateQuestion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { options, ...questionData } = req.body;

    const question = await prisma.question.update({
      where: { id: req.params.id },
      data: questionData,
    });

    if (options && Array.isArray(options)) {
      await prisma.questionOption.deleteMany({ where: { questionId: question.id } });
      await Promise.all(
        options.map((opt: { label: string; value: string; imageUrl?: string }, i: number) =>
          prisma.questionOption.create({
            data: { questionId: question.id, label: opt.label, value: opt.value, order: i + 1, imageUrl: opt.imageUrl },
          })
        )
      );
    }

    const fullQuestion = await prisma.question.findUnique({
      where: { id: question.id },
      include: { options: { orderBy: { order: 'asc' } } },
    });

    res.json({ success: true, data: fullQuestion });
  } catch (error) {
    next(error);
  }
};

export const deleteQuestion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.question.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Question deleted' });
  } catch (error) {
    next(error);
  }
};

export const reorderQuestions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { questions } = req.body as { questions: { id: string; order: number }[] };
    await Promise.all(
      questions.map((q) => prisma.question.update({ where: { id: q.id }, data: { order: q.order } }))
    );
    res.json({ success: true, message: 'Questions reordered' });
  } catch (error) {
    next(error);
  }
};

export const addOption = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { label, value, imageUrl } = req.body;
    const lastOption = await prisma.questionOption.findFirst({
      where: { questionId: req.params.questionId },
      orderBy: { order: 'desc' },
    });
    const option = await prisma.questionOption.create({
      data: { questionId: req.params.questionId, label, value, order: (lastOption?.order ?? 0) + 1, imageUrl },
    });
    res.status(201).json({ success: true, data: option });
  } catch (error) {
    next(error);
  }
};

export const updateOption = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const option = await prisma.questionOption.update({
      where: { id: req.params.optionId },
      data: req.body,
    });
    res.json({ success: true, data: option });
  } catch (error) {
    next(error);
  }
};

export const deleteOption = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.questionOption.delete({ where: { id: req.params.optionId } });
    res.json({ success: true, message: 'Option deleted' });
  } catch (error) {
    next(error);
  }
};

export const reorderOptions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { options } = req.body as { options: { id: string; order: number }[] };
    await Promise.all(
      options.map((o) => prisma.questionOption.update({ where: { id: o.id }, data: { order: o.order } }))
    );
    res.json({ success: true, message: 'Options reordered' });
  } catch (error) {
    next(error);
  }
};

export const setSurveyLogic = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { surveyId, conditionQuestionId, operator, conditionValue, action, targetSectionId, targetQuestionId, order } = req.body;

    const logic = await prisma.surveyLogic.create({
      data: { surveyId, conditionQuestionId, operator, conditionValue, action, targetSectionId, targetQuestionId, order: order ?? 0 },
    });

    res.status(201).json({ success: true, data: logic });
  } catch (error) {
    next(error);
  }
};

export const deleteSurveyLogic = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.surveyLogic.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Logic rule deleted' });
  } catch (error) {
    next(error);
  }
};
