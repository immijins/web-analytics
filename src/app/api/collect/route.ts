// app/api/collect/route.ts (또는 pages/api/collect.ts)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      websiteId, 
      sessionId, 
      path, 
      referrer, 
      screen, 
      duration, 
      utmSource, 
      utmMedium, 
      utmCampaign,
      viewId // 클라이언트에서 생성한 해당 페이지뷰의 고유 ID
    } = body;

    if (!websiteId || !path) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. duration이 전달된 경우 (이탈 시점 업데이트)
    if (duration && duration > 0 && viewId) {
      const { error: updateError } = await supabase
        .from('page_views')
        .update({ duration: duration })
        .eq('id', viewId);

      if (updateError) console.error('Duration update error:', updateError);
      return NextResponse.json({ success: true, updated: true });
    }

    // 2. 최초 진입 시 신규 페이지뷰 INSERT
    const { data, error } = await supabase
      .from('page_views')
      .insert([
        {
          id: viewId, // 클라이언트 생성 ID 사용 (또는 오토아이디)
          website_id: websiteId,
          session_id: sessionId,
          path: path,
          referrer: referrer || null,
          screen: screen,
          duration: 0,
          utm_source: utmSource || null,
          utm_medium: utmMedium || null,
          utm_campaign: utmCampaign || null,
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.error('Supabase Insert Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, viewId: data?.id });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// CORS 처리 (외부 사이트에서 스크립트를 호출하므로 필수)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}