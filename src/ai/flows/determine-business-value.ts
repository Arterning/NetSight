import OpenAI from 'openai';

const openai = new OpenAI({ 
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY }
);

export async function determineBusinessValue(input: { url: string, description: string }) {
  const prompt = `请根据以下描述判断其业务价值，并简要说明理由：${input.description}`;
  const completion = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
  });
  return completion.choices[0].message.content;
}
