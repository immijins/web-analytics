import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { UAParser } from 'ua-parser-js';

function getCorsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: getCorsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const body = await req.json();
    
    // tracker.js에서 보내는 신규 필드들 추출
    const { 
      websiteId, 
      sessionId, 
      path, 
      referrer, 
      screen, 
      duration, 
      maxScroll, 
      utmSource, 
      utmMedium, 
      utmCampaign, 
      utmTerm 
    } = body;

    if (!websiteId || !path) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders });
    }

    const userAgent = req.headers.get('user-agent') || '';
    const rawIp = req.headers.get('x-forwarded-for') || req.ip || '';
    const ip = rawIp.split(',')[0].trim();

    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser().name || 'Unknown';
    const os = parser.getOS().name || 'Unknown';
    const device = parser.getDevice().type || 'desktop';

    // Supabase DB 저장 (새 데이터 컬럼 포함)
    const { error } = await supabase.from('page_views').insert([
      {
        website_id: websiteId,
        session_id: sessionId || null,
        path: path,
        referrer: referrer || null,
        browser: browser,
        os: os,
        device: device,
        ip: ip,
        screen: screen || null,
        duration: duration || 0,
        max_scroll: maxScroll || 0,
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
        utm_term: utmTerm || null,
      },
    ]);

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}