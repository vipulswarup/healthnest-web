import { NextResponse } from 'next/server';
import { privacyPolicy } from '@/lib/legal/privacy';
export async function GET() { return NextResponse.json(privacyPolicy); }
