// 외부 사이트에서 보내오는 트래킹 데이터 처리, CORS 헤더 설정 API
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { UAParser } from 'ua-parser-js';


// CORS 허용
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

export async function POST(req:NextRequest) {
    try {
        const body = await req.json();
        const { websiteId, path, referrer, screen } = body;

        if (!websiteId || !path) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 } )
        }

        // Header 정보 추출
        const userAgent = req.headers.get('user-agent') || '';
        const rawIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
        const ip = rawIp.split(',')[0].trim();

        // User-Agent 파싱(브라우저, OS, 기기 종류)
        const parser = new UAParser(userAgent);
        const browser = parser.getBrowser().name || 'Unknown';
        const os = parser.getOS().name || 'Unknown';
        const device = parser.getDevice().type || 'desktop';
    
        // DB에 저장 
        const { error } = await supabase.from('page_views').insert([
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
            console.error("supabse Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Response 반환
        return new NextResponse(JSON.stringify({ success: true }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (err) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}