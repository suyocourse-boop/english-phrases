import { NextResponse } from 'next/server';

const CHAPTER_URLS: Record<string, string> = {
  chapter1: 'https://raw.githubusercontent.com/suyocourse-boop/my-book-data/main/chapter1.json',
  chapter2: 'https://raw.githubusercontent.com/suyocourse-boop/my-book-data/main/chapter2.json',
  chapter3: 'https://raw.githubusercontent.com/suyocourse-boop/my-book-data/main/chapter3.json',
  chapter4: 'https://raw.githubusercontent.com/suyocourse-boop/my-book-data/main/chapter4.json',
  chapter5: 'https://raw.githubusercontent.com/suyocourse-boop/my-book-data/main/chapte5.json',
  chapter6: 'https://raw.githubusercontent.com/suyocourse-boop/my-book-data/main/chapter6.json',
  chapter7: 'https://raw.githubusercontent.com/suyocourse-boop/my-book-data/main/chapter7.json',
  chapter8: 'https://raw.githubusercontent.com/suyocourse-boop/my-book-data/main/chapter8.json',
  chapter9: 'https://raw.githubusercontent.com/suyocourse-boop/my-book-data/main/chapter9.json',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chapter = searchParams.get('chapter') || 'chapter1';

  const url = CHAPTER_URLS[chapter];
  if (!url) {
    return NextResponse.json({ error: 'Invalid chapter' }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}