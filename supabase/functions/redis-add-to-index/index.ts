
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.0/mod.ts';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL') || '',
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || '',
});

console.log('Redis Add to Index function started');

serve(async (req) => {
  try {
    const { userId, newsletterId } = await req.json();
    
    if (!userId || !newsletterId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Add the ID to the user's list of newsletters
    const key = `user:${userId}:newsletter_ids`;
    await redis.lpush(key, newsletterId);
    
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error adding to index in Redis:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
