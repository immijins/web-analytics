import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { UAParser } from 'ua-parser-js';

function getCorsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const body = await req.json();
    const { websiteId, path, referrer, screen } = body;

    if (!websiteId || !path) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    // IP 및 User-Agent 추출
    const userAgent = req.headers.get('user-agent') || '';
    const rawIp =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const ip = rawIp.split(',')[0].trim();

    // User-Agent 파싱 (안전 처리)
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'desktop';

    try {
      const parser = new UAParser(userAgent);
      const result = parser.getResult();
      browser = result.browser.name || 'Unknown';
      os = result.os.name || 'Unknown';
      device = result.device.type || 'desktop';
    } catch (parseError) {
      console.warn('UA Parsing error:', parseError);
    }

    // Supabase DB 저장
    const { data, error } = await supabase.from('page_views').insert([
      {
        website_id: websiteId,
        path: path,
        referrer: referrer || null,
        browser: browser,
        os: os,
        device: device,
        ip: ip,
        screen: screen || null,
      },
    ]);

    if (error) {
      console.error('[Collect API] Supabase Insert Error:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error('[Collect API] Unhandled Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}