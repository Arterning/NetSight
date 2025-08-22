import OpenAI from 'openai';

export async function determineBusinessValue(input: { url: string, content: string, valueKeywords: string[] }): Promise<{ valuePropositionScore: number, analysis: string, keywords: string }> {
  
  const openai = new OpenAI({ 
    baseURL: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY }
  );

  let prompt: string;

  if (input.valueKeywords && input.valueKeywords.length > 0) {
    prompt = `请分析以下网站内容并评估其业务价值，重点关注内容与以下关键词的相关性：

价值评估关键词：${input.valueKeywords.join('、')}

网站内容：
${input.content}

请按照以下要求进行分析：
1. 评估内容与每个关键词的相关性程度（高/中/低）
2. 指出内容中与关键词最相关的具体部分
3. 综合评估整体业务价值
4. 给出改进建议（如果有的话）
5. 从网站内容中提取5-8个核心关键词。
6. 请给出网站内容与上述关键词的整体相关性评分（0-100），并以如下JSON格式输出：
{"valuePropositionScore": 88, "analysis": "你的详细分析内容...", "keywords": "关键词1 关键词2"}
valuePropositionScore是数字，analysis是字符串, keywords 是空格分割的关键词字符串。`;
  } else {
    prompt = `请分析以下网站内容并评估其业务价值。由于没有提供具体的价值评估关键词，请你首先自主从内容中提取5-8个核心关键词，然后基于这些关键词进行分析。

网站内容：
${input.content}

请按照以下要求进行分析：
1. 列出你自主提取的核心关键词。
2. 评估内容与这些核心关键词的相关性。
3. 综合评估网站的整体业务价值、潜在用途或目标受众。
4. 给出改进建议（如果有的话）。
5. 请根据你的综合分析，给出一个整体价值评分（0-100），并将你提取的核心关键词以空格分隔的字符串形式放入 'keywords' 字段, 最后以如下JSON格式输出：
{"valuePropositionScore": 88, "analysis": "你的详细分析内容, 包括你提取的关键词...", "keywords": "关键词1 关键词2"}
valuePropositionScore是数字，analysis是字符串, keywords 是空格分割的关键词字符串。`;
  }

  const completion = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3
  });

  // 尝试解析AI返回的JSON
  const text = completion.choices[0]?.message?.content || "";
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const json = JSON.parse(match[0]);
      return {
        valuePropositionScore: Number(json.valuePropositionScore) || 0,
        analysis: json.analysis || text,
        keywords: json.keywords || ''
      };
    }
  } catch (e) {}
  // fallback
  return {
    valuePropositionScore: 0,
    analysis: text,
    keywords: ''
  };
}
