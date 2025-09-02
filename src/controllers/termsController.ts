import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getTerms = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.sendFile(path.join(__dirname, '../public/privacy_policy.html'));
  } catch (error) {
    next(error);
  }
};
