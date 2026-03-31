import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/calendar, text/plain, */*',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch from target URL. Status: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.text();

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  } catch (error) {
    console.error('Proxy fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch the requested URL due to a network error' },
      { status: 500 }
    );
  }
}
