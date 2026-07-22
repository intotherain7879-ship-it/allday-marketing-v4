export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Vercel에 OPENAI_API_KEY가 아직 등록되지 않았습니다.' });

  const { imageUrl, site = {} } = req.body || {};
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    return res.status(400).json({ error: 'Supabase에 저장된 공개 사진 URL이 필요합니다.' });
  }

  try {
    const apiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        input: [{
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `한국 이삿짐센터의 실제 현장 사진을 분석하세요. 추측을 최소화하고 사진에서 직접 확인되는 것만 기록하세요. 고객 얼굴, 주소, 차량번호 등 개인정보는 설명하지 마세요. 현장 참고정보: 지역=${site.region || '미입력'}, 이사종류=${site.moveType || '미입력'}, 사다리차=${site.ladder || '미입력'}, 엘리베이터=${site.elevator || '미입력'}. 반드시 JSON만 출력하세요. 형식: {"caption":"사진 아래에 넣을 자연스러운 한 문장","summary":"사진에서 확인되는 작업 상황 1~2문장","tags":["거실","포장작업"],"stage":"작업전|포장중|운반중|정리중|작업완료|판단어려움","confidence":0.0}`
            },
            { type: 'input_image', image_url: imageUrl, detail: 'low' }
          ]
        }]
      })
    });

    const payload = await apiResponse.json();
    if (!apiResponse.ok) throw new Error(payload?.error?.message || 'OpenAI API 요청에 실패했습니다.');
    const text = (payload.output || []).flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text || '';
    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    return res.status(200).json({
      caption: String(parsed.caption || ''),
      summary: String(parsed.summary || ''),
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8).map(String) : [],
      stage: String(parsed.stage || '판단어려움'),
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0))
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'AI 사진 분석 중 오류가 발생했습니다.' });
  }
}
