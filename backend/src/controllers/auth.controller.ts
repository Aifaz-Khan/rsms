import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { config } from '../config/env';
import { createError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendPasswordResetEmail } from '../services/email.service';

const generateTokens = (userId: string, email: string, role: string) => {
  const accessToken = jwt.sign({ id: userId, email, role }, config.jwtSecret as string, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign({ id: userId, email, role }, config.jwtRefreshSecret as string, {
    expiresIn: config.jwtRefreshExpiresIn as jwt.SignOptions['expiresIn'],
  });
  return { accessToken, refreshToken };
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return next(createError('Invalid credentials', 401));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(createError('Invalid credentials', 401));
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, organization } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return next(createError('Email already registered', 409));
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName, organization, role: 'RESEARCHER' },
    });

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      data: {
        accessToken,
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (!token) return next(createError('Refresh token required', 401));

    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      return next(createError('Invalid or expired refresh token', 401));
    }

    const decoded = jwt.verify(token, config.jwtRefreshSecret as string) as { id: string; email: string; role: string };
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.id, decoded.email, decoded.role);

    await prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { token: newRefreshToken, userId: decoded.id, expiresAt },
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: { accessToken } });
  } catch (error) {
    next(createError('Invalid refresh token', 401));
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      await prisma.refreshToken.updateMany({ where: { token }, data: { isRevoked: true } });
    }
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordReset.create({ data: { email, token, expiresAt } });
    await sendPasswordResetEmail(email, token, user.firstName);

    res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;

    const reset = await prisma.passwordReset.findUnique({ where: { token } });
    if (!reset || reset.used || reset.expiresAt < new Date()) {
      return next(createError('Invalid or expired reset token', 400));
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { email: reset.email }, data: { password: hashedPassword } });
    await prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } });
    await prisma.refreshToken.updateMany({ where: { userId: (await prisma.user.findUnique({ where: { email: reset.email } }))!.id }, data: { isRevoked: true } });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, avatar: true, phone: true, organization: true, createdAt: true },
    });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, phone, organization } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { firstName, lastName, phone, organization },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, avatar: true, phone: true, organization: true },
    });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return next(createError('User not found', 404));

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return next(createError('Current password is incorrect', 400));

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};
