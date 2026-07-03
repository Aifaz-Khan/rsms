import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [
      totalSurveys,
      activeSurveys,
      totalResponses,
      completedResponses,
      incompleteResponses,
    ] = await Promise.all([
      prisma.survey.count(),
      prisma.survey.count({ where: { status: 'PUBLISHED' } }),
      prisma.response.count(),
      prisma.response.count({ where: { status: 'COMPLETED' } }),
      prisma.response.count({ where: { status: 'IN_PROGRESS' } }),
    ]);

    const completionRate = totalResponses > 0 ? Math.round((completedResponses / totalResponses) * 100) : 0;

    const avgCompletionTimeResult = await prisma.response.aggregate({
      where: { status: 'COMPLETED', completionTime: { not: null } },
      _avg: { completionTime: true },
    });

    const avgCompletionTime = Math.round((avgCompletionTimeResult._avg.completionTime ?? 0) / 60);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentResponses = await prisma.response.groupBy({
      by: ['startedAt'],
      where: { startedAt: { gte: sevenDaysAgo } },
      _count: true,
    });

    // Daily responses for chart
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const startOfDay = new Date(dateStr);
      const endOfDay = new Date(dateStr);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const count = await prisma.response.count({
        where: { startedAt: { gte: startOfDay, lt: endOfDay } },
      });

      dailyData.push({ date: dateStr, responses: count });
    }

    // Recent surveys
    const recentSurveys = await prisma.survey.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { responses: true } } },
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalSurveys,
          activeSurveys,
          totalParticipants: totalResponses,
          completedResponses,
          incompleteResponses,
          completionRate,
          avgCompletionTime,
        },
        dailyData,
        recentSurveys,
      },
    });
  } catch (error) {
    next(error);
  }
};
