import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const url = 'http://localhost/Enguio_Project/Api/backend.php';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.text();
    
    // Try to parse as JSON, fallback to text
    try {
      const jsonData = JSON.parse(data);
      return NextResponse.json(jsonData);
    } catch {
      return new NextResponse(data, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Proxy error: ' + error.message,
        error: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = 'http://localhost/Enguio_Project/Api/backend.php';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.text();
    
    try {
      const jsonData = JSON.parse(data);
      return NextResponse.json(jsonData);
    } catch {
      return new NextResponse(data, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Proxy error: ' + error.message,
        error: error.message 
      },
      { status: 500 }
    );
  }
}

