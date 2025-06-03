
// More restrictive CORS configuration for better security
const getAllowedOrigins = () => {
  const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development';
  
  if (isDevelopment) {
    return [
      'http://localhost:3000',
      'http://localhost:5173', // Vite dev server
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
  }
  
  return [
    'https://xuntjnqljyorysqxlker.supabase.co', // Your Supabase project domain
    // Add your production domain(s) here when deployed
    // 'https://yourdomain.com'
  ];
};

export const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400', // 24 hours
};

export const getCorsHeaders = (origin?: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  
  // Check if the origin is allowed
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);
  
  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
  };
};

// Helper function to handle CORS preflight requests
export const handleCorsPreflightRequest = (request: Request) => {
  const origin = request.headers.get('origin');
  
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: getCorsHeaders(origin),
    });
  }
  
  return null;
};
