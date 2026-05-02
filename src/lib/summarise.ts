import OpenAI from 'openai';
import type { BaseTagId } from './tags';

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

type SummaryBundle = {
  summary: string;
  primary_group: BaseTagId;
  secondary_tags: string[];
  confidence: number;
};

function normalizeBundle(raw: any): SummaryBundle {
  const summary = typeof raw?.summary === 'string' && raw.summary.trim() ? raw.summary.trim() : '摘要生成失败';
  const primary = raw?.primary_group;
  const primary_group: BaseTagId =
    primary === 'design' || primary === 'tech' || primary === 'default' ? primary : 'default';
  const secondary_tags = Array.isArray(raw?.secondary_tags)
    ? []
    : [];
  const confidence = typeof raw?.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : 0.5;

  return { summary, primary_group, secondary_tags, confidence };
}

export async function generateSummaryAndGrouping(body: string): Promise<SummaryBundle> {
  const apiKey = process.env.EXPO_PUBLIC_VOLCENGINE_API_KEY;
  if (!apiKey || apiKey === 'your-api-key-here') {
    throw new Error('请在 .env.local 中配置 EXPO_PUBLIC_VOLCENGINE_API_KEY');
  }

  const text = cleanHtmlForLlm(body);
  const inputText = text.slice(0, 6000);

  const response = await client.responses.create({
    model: process.env.EXPO_PUBLIC_VOLCENGINE_MODEL ?? 'doubao-seed-2-0-lite-260215',
    instructions: '你是文章摘要与分组助手。必须输出符合 JSON Schema 的内容。',
    input: `请完成两件事：
1) 生成中文摘要，格式严格为：
   - 第一部分：3-5句摘要导语（无标题）
   - 空一行
   - 固定标题：KEY TAKEAWAYS
   - 3-5条要点，每行以“• ”开头
2) 给文章分组，primary_group 只能从 default/design/tech 中选择其一。
   - 不确定或命中弱时选 default
   - secondary_tags 固定输出空数组 []

文章内容：
${inputText}`,
    text: {
      format: {
        type: 'json_schema',
        name: 'summary_and_grouping',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            summary: { type: 'string' },
            primary_group: { type: 'string', enum: ['default', 'design', 'tech'] },
            secondary_tags: { type: 'array', maxItems: 0, items: { type: 'string' } },
            confidence: { type: 'number' },
          },
          required: ['summary', 'primary_group', 'secondary_tags', 'confidence'],
        },
      },
    },
  });

  let parsed: any = null;
  try {
    parsed = JSON.parse(response.output_text ?? '{}');
  } catch {
    parsed = null;
  }

  return normalizeBundle(parsed);
}
