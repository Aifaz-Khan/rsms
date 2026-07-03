import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getQuestionBank = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category, type, search } = req.query;
    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { category: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const questions = await prisma.questionBank.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: questions });
  } catch (error) {
    next(error);
  }
};

export const addToQuestionBank = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const question = await prisma.questionBank.create({ data: req.body });
    res.status(201).json({ success: true, data: question });
  } catch (error) {
    next(error);
  }
};

export const deleteFromQuestionBank = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.questionBank.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Question removed from bank' });
  } catch (error) {
    next(error);
  }
};
