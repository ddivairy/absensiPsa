import app from '../server/index';
import { createVercelHandler } from '../server/vercelHandler';

export const config = {
  maxDuration: 30,
};

export default createVercelHandler(app as any);
