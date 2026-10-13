const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

// Look for .env in server/ folder first, or in current working directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z.string({
    required_error: 'MONGO_URI is required',
  }).min(1, 'MONGO_URI is required'),
  JWT_SECRET: z.string({
    required_error: 'JWT_SECRET is required',
  }).min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string({
    required_error: 'CLIENT_URL is required',
  }).min(1, 'CLIENT_URL is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('\nEnvironment validation failed:');
  parsedEnv.error.issues.forEach((issue) => {
    const field = issue.path.join('.');
    console.error(`- ${field}: ${issue.message}`);
  });
  console.error('Please check your .env file and restart the server.\n');
  process.exit(1);
}

module.exports = parsedEnv.data;
