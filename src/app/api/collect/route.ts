import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { UAParser } from 'ua-parser-js';

function getCorsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const body = await req.json();

    console.log('[Collect API] body:', body);

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
      utmTerm,
    } = body;

    if (!websiteId || !path) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const userAgent = req.headers.get('user-agent') || '';

    const rawIp =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      '';

    const ip = rawIp
      ? rawIp.split(',')[0].trim()
      : null;

    const parser = new UAParser(userAgent);

    const browser = parser.getBrowser().name || 'Unknown';
    const os = parser.getOS().name || 'Unknown';
    const device = parser.getDevice().type || 'desktop';

    const durationValue = Number(duration) || 0;
    const maxScrollValue = Number(maxScroll) || 0;

    console.log('[Collect API] parsed:', {
      websiteId,
      path,
      ip,
      browser,
      os,
      device,
      durationValue,
      maxScrollValue,
    });

    const { data, error } = await supabase
      .from('page_views')
      .insert([
        {
          website_id: websiteId,
          session_id: sessionId || null,
          path,
          referrer: referrer || null,
          browser,
          os,
          device,
          ip: ip || null,
          screen: screen || null,
          duration: durationValue,
          max_scroll: maxScrollValue,
          utm_source: utmSource || null,
          utm_medium: utmMedium || null,
          utm_campaign: utmCampaign || null,
          utm_term: utmTerm || null,
        },
      ])
      .select();

    if (error) {
      console.error('[Collect API] Supabase Error:', error);

      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    console.log('[Collect API] Insert success:', data);

    return NextResponse.json(
      { success: true },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (err: any) {
    console.error('[Collect API] Unhandled Error:', err);

    return NextResponse.json(
      {
        error: err?.message || 'Internal Server Error',
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}