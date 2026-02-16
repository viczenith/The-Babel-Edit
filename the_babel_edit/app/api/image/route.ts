import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const imageUrl = request.nextUrl.searchParams.get('url');

    if (!imageUrl) {
      console.warn('[Image Proxy] Missing image URL parameter');
      return NextResponse.json(
        { error: 'Missing image URL' },
        { status: 400 }
      );
    }

    // Decode URL in case it's double-encoded
    let decodedUrl = imageUrl;
    try {
      decodedUrl = decodeURIComponent(imageUrl);
    } catch (e) {
      console.warn('[Image Proxy] URL decode failed, using as-is');
    }

    // Fetch the image from the backend with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    let response;
    try {
      response = await fetch(decodedUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'image/*',
        }
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { error: `Failed to fetch image: ${fetchError?.message || 'Network error'}` },
        { status: 500 }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return NextResponse.json(
        { error: `Backend error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the content type header
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Stream the image response
    const buffer = await response.arrayBuffer().catch(err => {
      throw err;
    });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    );
  }
}
