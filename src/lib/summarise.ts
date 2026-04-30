import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_VOLCENGINE_API_KEY,
  baseURL: process.env.EXPO_PUBLIC_VOLCENGINE_BASE_URL,
});

function cleanHtmlForLlm(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, '\n')
    .trim();
}

export async function generateSummary(body: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_VOLCENGINE_API_KEY;
  if (!apiKey || apiKey === 'your-api-key-here') {
    throw new Error('请在 .env.local 中配置 EXPO_PUBLIC_VOLCENGINE_API_KEY');
  }

  const text = cleanHtmlForLlm(body);

  const response = await client.responses.create({
    model: process.env.EXPO_PUBLIC_VOLCENGINE_MODEL ?? 'doubao-seed-2-0-lite-260215',
    input: `用3-5句话总结以下文章，输出纯中文，无需任何标题或前缀：\n\n${text.slice(0, 6000)}`,
  });

  return response.output_text ?? '摘要生成失败';
}
