import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Forward the request to the PHP backend
    const response = await fetch('http://localhost/Enguio_Project/Api/backend.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Proxy error: ' + error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Action parameter required' },
        { status: 400 }
      );
    }
    
    // Forward the request to the PHP backend
    const response = await fetch(`http://localhost/Enguio_Project/Api/backend.php?action=${action}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Proxy error: ' + error.message 
      },
      { status: 500 }
    );
  }
}
