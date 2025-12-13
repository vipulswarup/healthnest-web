import { MongoClient, Db } from 'mongodb';

function getMongoConfig() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Please add your Mongo URI to .env');
  }

  if (!process.env.MONGODB_DB_NAME) {
    throw new Error('Please add your Mongo DB name to .env');
  }

  const uri = process.env.MONGODB_URI.trim();
  
  // Validate connection string format
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://');
  }

  return {
    uri,
    dbName: process.env.MONGODB_DB_NAME,
  };
}

let client: MongoClient;
let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  if (clientPromise) {
    return clientPromise;
  }

  const config = getMongoConfig();

  if (process.env.NODE_ENV === 'development') {
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(config.uri, {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      });
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    client = new MongoClient(config.uri, {
      serverSelectionTimeoutMS: 5000,
    });
    clientPromise = client.connect();
  }

  return clientPromise;
}

export async function getDatabase(): Promise<Db> {
  const config = getMongoConfig();
  const client = await getClientPromise();
  return client.db(config.dbName);
}

export default getClientPromise;

