import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { createError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getSections = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sections = await prisma.section.findMany({
      where: { surveyId: req.params.surveyId },
      orderBy: { order: 'asc' },
      include: { _count: { select: { questions: true } } },
    });
    res.json({ success: true, data: sections });
  } catch (error) {
    next(error);
  }
};

export const createSection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { surveyId } = req.params;
    const { title, description, isVisible } = req.body;

    const lastSection = await prisma.section.findFirst({
      where: { surveyId },
      orderBy: { order: 'desc' },
    });

    const section = await prisma.section.create({
      data: { surveyId, title, description, isVisible: isVisible ?? true, order: (lastSection?.order ?? 0) + 1 },
    });

    res.status(201).json({ success: true, data: section });
  } catch (error) {
    next(error);
  }
};

export const updateSection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const section = await prisma.section.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: section });
  } catch (error) {
    next(error);
  }
};

export const deleteSection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.section.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Section deleted' });
  } catch (error) {
    next(error);
  }
};

export const reorderSections = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { sections } = req.body as { sections: { id: string; order: number }[] };

    await Promise.all(
      sections.map((s) => prisma.section.update({ where: { id: s.id }, data: { order: s.order } }))
    );

    res.json({ success: true, message: 'Sections reordered' });
  } catch (error) {
    next(error);
  }
};
