
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.0/mod.ts';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL') || '',
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || '',
});

console.log('Redis Get User Newsletters function started');

serve(async (req) => {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing user ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get all newsletter IDs for this user
    const key = `user:${userId}:newsletter_ids`;
    const ids = await redis.lrange(key, 0, -1) || [];
    
    if (!ids.length) {
      return new Response(
        JSON.stringify([]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Fetch each newsletter
    const newsletters = [];
    for (const id of ids) {
      const newsletterKey = `user:${userId}:newsletters:${id}`;
      const newsletterData = await redis.get(newsletterKey);
      
      if (newsletterData) {
        newsletters.push(JSON.parse(newsletterData));
      }
    }
    
    return new Response(
      JSON.stringify(newsletters),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error getting newsletters from Redis:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
