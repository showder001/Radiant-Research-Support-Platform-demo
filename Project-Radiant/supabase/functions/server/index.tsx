import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// 用户注册路由
app.post('/make-server-df059afa/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: '邮箱和密码不能为空' }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || '' },
      // 自动确认邮箱，因为尚未配置邮件服务器
      email_confirm: true,
    });

    if (error) {
      console.log(`注册用户时发生错误: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ data, message: '注册成功' });
  } catch (error: any) {
    console.log(`注册用户时发生服务器错误: ${error.message}`);
    return c.json({ error: '服务器错误' }, 500);
  }
});

// 检查认证状态
app.get('/make-server-df059afa/auth-check', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ authenticated: false }, 401);
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ authenticated: false }, 401);
    }

    return c.json({ authenticated: true, user });
  } catch (error: any) {
    console.log(`认证检查时发生错误: ${error.message}`);
    return c.json({ authenticated: false, error: error.message }, 500);
  }
});

// 获取用户配置
app.get('/make-server-df059afa/user-profile', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: '未授权' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: '未授权' }, 401);
    }

    // 从KV存储获取用户配置
    const profile = await kv.get(`user_profile_${user.id}`);

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || '',
        profile: profile || {},
      },
    });
  } catch (error: any) {
    console.log(`获取用户配置时发生错误: ${error.message}`);
    return c.json({ error: '服务器错误' }, 500);
  }
});

// 更新用户配置
app.post('/make-server-df059afa/user-profile', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: '未授权' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: '未授权' }, 401);
    }

    const profileData = await c.req.json();

    // 保存用户配置到KV存储
    await kv.set(`user_profile_${user.id}`, profileData);

    return c.json({ message: '配置更新成功', profile: profileData });
  } catch (error: any) {
    console.log(`更新用户配置时发生错误: ${error.message}`);
    return c.json({ error: '服务器错误' }, 500);
  }
});

// 模拟审稿路由
app.post('/make-server-df059afa/review', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: '未授权' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: '未授权' }, 401);
    }

    const { content, reviewType } = await c.req.json();

    if (!content) {
      return c.json({ error: '内容不能为空' }, 400);
    }

    // 模拟审稿结果（实际应用中这里会调用AI服务）
    const mockReview = {
      reviewType: reviewType || 'comprehensive',
      timestamp: new Date().toISOString(),
      summary: '这是一个初步的审稿意见...',
      strengths: [
        '研究问题明确，具有一定的学术价值',
        '方法论较为完善',
        '数据分析较为全面',
      ],
      weaknesses: [
        '文献综述部分可以更加深入',
        '部分实验设计可以更加严谨',
        '结论部分需要进一步强化',
      ],
      suggestions: [
        '建议补充最新的相关文献',
        '建议增加对照实验验证假设',
        '建议在讨论部分增加对研究局限性的分析',
      ],
      score: {
        originality: 7,
        methodology: 8,
        clarity: 7,
        significance: 7,
        overall: 7.25,
      },
    };

    // 保存审稿历史
    const reviewHistory = (await kv.get(`review_history_${user.id}`)) || [];
    reviewHistory.unshift({
      id: crypto.randomUUID(),
      ...mockReview,
      contentPreview: content.substring(0, 100),
    });

    // 只保留最近20条记录
    if (reviewHistory.length > 20) {
      reviewHistory.splice(20);
    }

    await kv.set(`review_history_${user.id}`, reviewHistory);

    return c.json({ review: mockReview });
  } catch (error: any) {
    console.log(`模拟审稿时发生错误: ${error.message}`);
    return c.json({ error: '服务器错误' }, 500);
  }
});

// 获取审稿历史
app.get('/make-server-df059afa/review-history', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: '未授权' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: '未授权' }, 401);
    }

    const reviewHistory = (await kv.get(`review_history_${user.id}`)) || [];

    return c.json({ history: reviewHistory });
  } catch (error: any) {
    console.log(`获取审稿历史时发生错误: ${error.message}`);
    return c.json({ error: '服务器错误' }, 500);
  }
});

// 健康检查
app.get('/make-server-df059afa/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

Deno.serve(app.fetch);
