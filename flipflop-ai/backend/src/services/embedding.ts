import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

class EmbeddingService {
  private openai: OpenAI;
  private pinecone: Pinecone | null = null;
  private pineconeIndex: any = null;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    // Initialize Pinecone if configured
    if (process.env.PINECONE_API_KEY) {
      this.initializePinecone();
    }
  }

  private async initializePinecone() {
    try {
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!,
        environment: process.env.PINECONE_ENVIRONMENT!,
      });

      this.pineconeIndex = this.pinecone.index(process.env.PINECONE_INDEX_NAME!);
      console.log('✅ Pinecone initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Pinecone:', error);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  async storeInVectorDb(
    id: string,
    embedding: number[],
    metadata: {
      teamId: string;
      type: string;
      source: string;
      timestamp: string;
    }
  ): Promise<void> {
    if (!this.pineconeIndex) {
      console.warn('Pinecone not initialized, skipping vector storage');
      return;
    }

    try {
      await this.pineconeIndex.upsert([
        {
          id,
          values: embedding,
          metadata,
        },
      ]);
    } catch (error) {
      console.error('Failed to store in vector DB:', error);
      throw error;
    }
  }

  async searchSimilar(
    embedding: number[],
    teamId: string,
    topK: number = 10
  ): Promise<any[]> {
    if (!this.pineconeIndex) {
      console.warn('Pinecone not initialized, returning empty results');
      return [];
    }

    try {
      const results = await this.pineconeIndex.query({
        vector: embedding,
        filter: { teamId },
        topK,
        includeMetadata: true,
      });

      return results.matches || [];
    } catch (error) {
      console.error('Failed to search vector DB:', error);
      throw error;
    }
  }

  async deleteFromVectorDb(id: string): Promise<void> {
    if (!this.pineconeIndex) {
      return;
    }

    try {
      await this.pineconeIndex.delete1(id);
    } catch (error) {
      console.error('Failed to delete from vector DB:', error);
      throw error;
    }
  }
}

export default new EmbeddingService();