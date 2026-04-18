import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { level = 'info', message, data } = body;
    
    const timestamp = new Date().toISOString();
    const logPrefix = `[CLIENT_LOG][${timestamp}][${level.toUpperCase()}]`;
    
    if (data) {
      console.log(logPrefix, message, JSON.stringify(data, null, 2));
    } else {
      console.log(logPrefix, message);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
