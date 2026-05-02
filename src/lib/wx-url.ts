function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function trimUrlTail(raw: string): string {
  return raw.trim().replace(/[),.;!?。，；！？】\]）>]+$/g, '');
}

export function extractWeChatArticleUrl(input: string): string | null {
  const text = input.trim();
  if (!text) return null;

  const direct = trimUrlTail(text);
  if (isValidWeChatArticleUrl(direct)) return direct;

  const matches = text.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
  for (const m of matches) {
    const candidate = trimUrlTail(m);
    if (isValidWeChatArticleUrl(candidate)) return candidate;
  }
  return null;
}

export function isValidWeChatArticleUrl(input: string): boolean {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return false;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  if (url.hostname !== 'mp.weixin.qq.com') return false;

  const path = url.pathname.toLowerCase();
  if (!path.startsWith('/s')) return false;

  const biz = safeDecode(url.searchParams.get('__biz') ?? '');
  const hasBiz = biz.length > 0;
  const hasMid = (url.searchParams.get('mid') ?? '').length > 0;
  const hasSn = (url.searchParams.get('sn') ?? '').length > 0;

  return hasBiz || (hasMid && hasSn);
}
