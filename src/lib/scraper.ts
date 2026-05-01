const WX_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.43',
  Referer: 'https://mp.weixin.qq.com/',
  'Accept-Language': 'zh-CN,zh;q=0.9',
};

interface ScrapedArticle {
  title: string;
  description: string;
  body: string;
  source: string;
  profileSignature: string;
  msgCdnUrl: string;
  coverUrl1x1: string;
  lang: string;
}

function decodeHtml(str: string): string {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function extractJsString(html: string, variableName: string): string {
  const escaped = variableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`var\\s+${escaped}\\s*=\\s*\"([\\s\\S]*?)\";`));
  return match?.[1]?.trim() ?? '';
}

function inferLang(title: string, description: string): string {
  const text = `${title} ${description}`;
  return /[\u4e00-\u9fff]/.test(text) ? 'zh-CN' : 'en-US';
}

export async function scrapeWxArticle(url: string): Promise<ScrapedArticle> {
  const res = await fetch(url, { headers: WX_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();

  // Extract title — class may have trailing space: "rich_media_title "
  const titleMatch = html.match(/<h1[^>]*class="rich_media_title\s*"[^>]*>([\s\S]*?)<\/h1>/);
  const title = titleMatch
    ? decodeHtml(titleMatch[1].replace(/<[^>]+>/g, ''))
    : 'Untitled';

  // Extract body HTML — WeChat stores article in id="js_content"
  // Use div nesting counter to find the correct closing tag
  const contentStart = html.indexOf('id="js_content"');
  if (contentStart === -1) {
    throw new Error('该文章需要在微信内打开');
  }
  const openDivIdx = html.lastIndexOf('<div', contentStart);
  let depth = 0;
  let i = openDivIdx;
  let closeIdx = -1;
  while (i < html.length) {
    if (html.substring(i, i + 4) === '<div') {
      depth++;
      i += 4;
    } else if (html.substring(i, i + 6) === '</div>') {
      depth--;
      if (depth === 0) {
        closeIdx = i;
        break;
      }
      i += 6;
    } else {
      i++;
    }
  }
  if (closeIdx === -1) {
    throw new Error('该文章需要在微信内打开');
  }
  const afterOpenTag = html.indexOf('>', openDivIdx) + 1;
  const rawBody = html.substring(afterOpenTag, closeIdx);

  // Clean up: remove scripts, hidden attrs, data-*, classes, ids
  // Keep inline styles (they define the article's visual appearance)
  const body = rawBody
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/visibility:\s*hidden;?\s*/gi, '')
    .replace(/opacity:\s*0;?\s*/gi, '')
    .replace(/data-src="/g, 'src="')
    .replace(/\s*data-[a-z-]+="[^"]*"/gi, '')
    .replace(/\s*class="[^"]*"/gi, '')
    .replace(/\s*id="[^"]*"/gi, '')
    .replace(/\s*nodeleaf=""/gi, '')
    .replace(/\s*style="\s*"/gi, '')
    .replace(/&nbsp;/g, ' ')
    .trim();

  // Extract source (公众号名称)
  const sourceMatch = html.match(/id="js_name"[^>]*>([\s\S]*?)<\/a>/);
  const source = sourceMatch
    ? decodeHtml(sourceMatch[1].replace(/<[^>]+>/g, ''))
    : new URL(url).hostname;

  const profileSignature = decodeHtml(extractJsString(html, 'profile_signature'));
  const msgCdnUrl = extractJsString(html, 'msg_cdn_url');
  const coverUrl1x1 = extractJsString(html, 'cdn_url_1_1');

  const metaDescription =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i)?.[1] ?? '';
  const description = decodeHtml(profileSignature || metaDescription || title);
  const lang = inferLang(title, description);

  return { title, description, body, source, profileSignature, msgCdnUrl, coverUrl1x1, lang };
}
