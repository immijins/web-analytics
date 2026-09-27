import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { UAParser } from 'ua-parser-js';

function getCorsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(req),
  });
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);

  try {
    // 1. 요청 Body를 텍스트로 받아 안전하게 JSON 파싱
    const text = await req.text();
    if (!text) {
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const body = JSON.parse(text);
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
      return NextResponse.json(
        { error: 'Missing required fields: websiteId or path' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. IP 및 User-Agent 추출
    const userAgent = req.headers.get('user-agent') || '';
    const rawIp =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const ip = rawIp.split(',')[0].trim();

    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser().name || 'Unknown';
    const os = parser.getOS().name || 'Unknown';
    const device = parser.getDevice().type || 'desktop';

    // 3. Supabase DB 저장
    const { data, error } = await supabase.from('page_views').insert([
      {
        website_id: String(websiteId),
        session_id: sessionId ? String(sessionId) : null,
        path: String(path),
        referrer: referrer ? String(referrer) : null,
        browser: browser,
        os: os,
        device: device,
        ip: ip,
        screen: screen ? String(screen) : null,
        duration: Number(duration) || 0,
        max_scroll: Number(maxScroll) || 0,
        utm_source: utmSource ? String(utmSource) : null,
        utm_medium: utmMedium ? String(utmMedium) : null,
        utm_campaign: utmCampaign ? String(utmCampaign) : null,
        utm_term: utmTerm ? String(utmTerm) : null,
      },
    ]);

    if (error) {
      console.error('❌ Supabase Insert Error:', error);
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error('❌ [Collect API] Unhandled Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}