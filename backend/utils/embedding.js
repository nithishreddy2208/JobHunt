import { pipeline } from '@xenova/transformers';

const EMBEDDING_MODEL = process.env.LOCAL_EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';

let embedderPromise = null;

const getEmbedder = async () => {
  if (!embedderPromise) {
    embedderPromise = pipeline('feature-extraction', EMBEDDING_MODEL);
  }

  return embedderPromise;
};

export const getEmbedding = async (text) => {
  const input = (text || '').toString().trim();
  if (!input) {
    throw new Error('Embedding input is empty');
  }

  const embedder = await getEmbedder();

  const output = await embedder(input, {
    pooling: 'mean',
    normalize: true
  });

  const vector = output?.data ? Array.from(output.data) : null;

  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error('Empty embedding returned');
  }

  return vector;
};