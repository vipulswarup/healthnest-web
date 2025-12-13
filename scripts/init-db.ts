// Load environment variables from .env file FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Now import other modules that might need environment variables
import { initializeIndexes } from '../lib/db/init-indexes';

async function main() {
  try {
    console.log('Initializing MongoDB indexes...');
    await initializeIndexes();
    console.log('Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

main();

