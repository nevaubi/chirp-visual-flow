
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.0/mod.ts';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL') || '',
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || '',
});

console.log('Redis Get Newsletter function started');

serve(async (req) => {
  try {
    const { userId, newsletterId } = await req.json();
    
    if (!userId || !newsletterId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the newsletter data
    const key = `user:${userId}:newsletters:${newsletterId}`;
    const data = await redis.get(key);
    
    if (!data) {
      return new Response(
        JSON.stringify(null),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error getting newsletter from Redis:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
