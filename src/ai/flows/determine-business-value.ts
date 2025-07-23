import OpenAI from 'openai';

const openai = new OpenAI({ 
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY }
);

export async function determineBusinessValue(input: { url: string, content: string, valueKeywords: string[] }): Promise<{ valuePropositionScore: number, analysis: string }> {
  const prompt = `请分析以下网站内容并评估其业务价值，重点关注内容与以下关键词的相关性：

价值评估关键词：${input.valueKeywords.join('、')}

网站内容：
${input.content}

请按照以下要求进行分析：
1. 评估内容与每个关键词的相关性程度（高/中/低）
2. 指出内容中与关键词最相关的具体部分
3. 综合评估整体业务价值
4. 给出改进建议（如果有的话）
5. 请给出网站内容与上述关键词的整体相关性评分（0-100，0为完全无关，100为高度相关），并以如下JSON格式输出：
{"valuePropositionScore": 88, "analysis": "你的详细分析内容..."}
valuePropositionScore是数字，analysis是字符串。`;

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
        analysis: json.analysis || text
      };
    }
  } catch (e) {}
  // fallback
  return {
    valuePropositionScore: 0,
    analysis: text
  };
}