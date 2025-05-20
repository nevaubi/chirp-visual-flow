
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.0/mod.ts';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL') || '',
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || '',
});

console.log('Redis Store Newsletter function started');

serve(async (req) => {
  try {
    const { data } = await req.json();
    
    if (!data || !data.id || !data.userId || !data.content) {
      return new Response(
        JSON.stringify({ error: 'Missing required newsletter data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Store the newsletter data
    const key = `user:${data.userId}:newsletters:${data.id}`;
    await redis.set(key, JSON.stringify(data));
    
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error storing newsletter in Redis:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
