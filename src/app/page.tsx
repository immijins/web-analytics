'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { Users, Eye, Clock, Smartphone, Globe, ArrowUpRight } from 'lucide-react';

interface PageView {
  id: string;
  website_id: string;
  path: string;
  referrer: string;
  browser: string;
  os: string;
  device: string;
  duration: string;
  created_at: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<PageView[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<string>('all');

  // 데이터 로드
  const fetchAnalytics = async () => {
    setLoading(true);
    let query = supabase.from('page_views').select('*').order('created_at', { ascending: false });
  
    if (selectedWebsite !== 'all') {
      query = query.eq('website_id', selectedWebsite);
    }

    const { data, error } = await query;
    if (!error && data) {
      setLogs(data as PageView[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedWebsite]);

  // 지표 계산
  const totalViews = logs.length;

  // 오늘 방문 로그
  const todayStr = new Date().toISOString().split('T')[0];
  const todayViews = logs.filter(l => l.created_at.startsWith(todayStr)).length;

  // 평균 체류 시간
  const avgDuration = totalViews > 0
    ? Math.round(logs.reduce((acc, cur) => acc + (Number((cur.duration || 0))), 0) / totalViews)
    : 0;

  // 인기 페이지 
  const pathCounts = logs.reduce((acc: Record<string, number>, cur) => {
    acc[cur.path] = (acc[cur.path] || 0) + 1;
    return acc;
  }, {});
  const topPaths = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 유입 경로
  const referrerCounts = logs.reduce((acc: Record<string, number>, cur) => {
    let ref = cur.referrer;
    if (!ref || ref === '' || ref === 'null') ref = '직접 접속(Direct)';
    else {
      try {
        ref = new URL(ref).hostname;
      } catch {
        ref = cur.referrer;
      }
    }
    acc[ref] = (acc[ref] || 0) + 1;
    return acc;
  }, {});
  const topReferrers = Object.entries(referrerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 기기별 비율(Desktop / Mobile / Tablet)
  const deviceCounts = logs.reduce((acc: Record<string, number>, cur) => {
    const dev = cur.device || 'desktop';
    acc[dev] = (acc[dev] || 0) + 1;
    return acc;
  }, {});
  const deviceData = Object.entries(deviceCounts).map(([name, value]) => ({name, value}));

  // 등록된 웹사이트 목록 추출
  const websiteIds = Array.from(new Set(logs.map(l => l.website_id)));

  if (loading) {
    return (
      <div className='flex h-screen items-center justify-center bg-gray-50'>
        <p className='text-gray-500 font-medium animate-pulse'>분석 데이터를 불러오는 중입니다.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto space-y-8">
        
        {/* 상단 헤더 & 필터 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">웹 분석 대시보드</h1>
            <p className="text-sm text-gray-500 mt-1">실시간 방문자 및 유입 경로 추적</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedWebsite}
              onChange={(e) => setSelectedWebsite(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체 웹사이트</option>
              {websiteIds.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>

            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow"
            >
              새로고침
            </button>
          </div>
        </div>

        {/* 1. 요약 카드 (Summary Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">오늘 페이지뷰</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{todayViews.toLocaleString()}회</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">총 페이지뷰</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalViews.toLocaleString()}회</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">평균 체류 시간</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{avgDuration}초</h3>
            </div>
          </div>
        </div>

        {/* 2. 유입 경로 & 인기 페이지 (Top Referrers & Pages) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 유입 경로 TOP 5 */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-bold text-gray-900">유입 경로 TOP 5</h2>
            </div>
            <div className="space-y-3">
              {topReferrers.map(([ref, count], idx) => {
                const percentage = Math.round((count / totalViews) * 100) || 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700 truncate max-w-[200px]">{ref}</span>
                      <span className="text-gray-500">{count}회 ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 인기 페이지 TOP 5 */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ArrowUpRight className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-bold text-gray-900">인기 페이지 TOP 5</h2>
            </div>
            <div className="space-y-3">
              {topPaths.map(([path, count], idx) => {
                const percentage = Math.round((count / totalViews) * 100) || 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700 truncate max-w-[200px]">{path}</span>
                      <span className="text-gray-500">{count}회 ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* 3. 접속 기기 비율 & 최근 로그 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 접속 기기 (파이 차트) */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-bold text-gray-900">접속 기기</h2>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deviceData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs text-gray-600">
              {deviceData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                  <span className="capitalize">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 최근 실시간 로그 테이블 */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-2 overflow-hidden">
            <h2 className="text-lg font-bold text-gray-900 mb-4">실시간 접속 기록</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b">
                  <tr>
                    <th className="py-2 px-3">시간</th>
                    <th className="py-2 px-3">경로</th>
                    <th className="py-2 px-3">브라우저/OS</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.slice(0, 5).map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleTimeString('ko-KR')}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-800 truncate max-w-[150px]">
                        {log.path}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">
                        {log.browser} / {log.os}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
