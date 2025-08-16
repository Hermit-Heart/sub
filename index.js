/* index.js  —— 整点提醒增强版（notifyHour）*/

/** ========== 公共工具函数 ========= */
function formatBeijingTime(date = new Date(), format = 'datetime') {
  return date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

/** ▼ 农历库（保持原逻辑，如有你自己的 lunarBiz 请替换此处） */
const lunarBiz = {
  daysToLunar: () => 0,
  lunar2solar: (l) => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  },
  addLunarPeriod: (l, v, u) => l
};

/** ========== 原来的 HTML 页面 ========= */
const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>订阅管理</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">
</head>
<body class="bg-gray-100">
  <div id="app" class="container mx-auto p-6">
    <h1 class="text-xl font-bold mb-4">订阅管理</h1>
    <button id="addBtn" class="px-4 py-2 bg-blue-600 text-white rounded">添加订阅</button>
    <div id="listContainer" class="mt-6"></div>

    <!-- 订阅表单 -->
    <div id="modal" class="hidden fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center">
      <div class="bg-white p-6 rounded w-full max-w-lg shadow max-h-screen overflow-y-auto">
        <h2 class="text-lg font-medium mb-4" id="modalTitle">添加订阅</h2>
        <form id="form">
          <input type="hidden" id="id" />

          <label class="block text-sm font-medium mb-1">名称</label>
          <input id="name" class="border px-2 py-1 w-full mb-3" required />

          <label class="block text-sm font-medium mb-1">开始日期</label>
          <input type="date" id="startDate" class="border px-2 py-1 w-full mb-3"/>

          <label class="block text-sm font-medium mb-1">到期日期 *</label>
          <input type="date" id="expiryDate" class="border px-2 py-1 w-full mb-3" required />

          <label class="block text-sm font-medium mb-1">提前提醒天数</label>
          <input type="number" id="reminderDays" value="7" min="0" class="border px-2 py-1 w-full mb-3" />

          <label class="block text-sm font-medium mb-1">周期数值 *</label>
          <input type="number" id="periodValue" value="1" min="1" class="border px-2 py-1 w-full mb-3" required />

          <label class="block text-sm font-medium mb-1">周期单位 *</label>
          <select id="periodUnit" class="border px-2 py-1 w-full mb-3">
            <option value="day">天</option>
            <option value="month" selected>月</option>
            <option value="year">年</option>
          </select>

          <label class="block text-sm font-medium mb-1">提醒整点 (北京时间，0~23) *</label>
          <select id="notifyHour" class="border px-2 py-1 w-full mb-3" required>
            <option value="">请选择整点</option>
            ${[...Array(24).keys()].map(h => `<option value="${h}">${h.toString().padStart(2,'0')}:00</option>`).join('')}
          </select>

          <label class="inline-flex items-center mb-4">
            <input type="checkbox" id="autoRenew" checked class="mr-2"/> 自动续订
          </label>

          <div class="flex justify-end mt-4 space-x-4">
            <button type="button" id="cancelBtn" class="border px-4 py-2">取消</button>
            <button id="saveBtn" type="submit" class="bg-blue-600 text-white px-4 py-2">保存</button>
          </div>
        </form>
      </div>
    </div>

  </div>
<script>
// ------- 前端脚本 -------

function loadList(){
  fetch('/api/subscriptions').then(r=>r.json()).then(list=>{
    const container = document.getElementById('listContainer');
    if(!list.length){ container.innerHTML = '<div class="text-gray-500">暂无订阅</div>'; return; }
    container.innerHTML = list.map(s=>\`
      <div class="border px-4 py-2 mb-2 flex justify-between">
        <div>
          <div><strong>\${s.name}</strong>（到期: \${s.expiryDate?.split('T')[0]}）</div>
          <div>提醒整点: \${s.notifyHour}:00</div>
        </div>
        <div>
          <button data-id="\${s.id}" class="editBtn text-blue-600 mr-3">编辑</button>
        </div>
      </div>\`).join('');
    document.querySelectorAll('.editBtn').forEach(btn=>{
      btn.onclick=e=>openModal(list.find(x=>x.id==e.target.dataset.id));
    });
  });
}

function openModal(item){
  document.getElementById('modal').classList.remove('hidden');
  if(item){
    document.getElementById('id').value = item.id;
    document.getElementById('name').value = item.name;
    document.getElementById('startDate').value = item.startDate?.split('T')[0]||'';
    document.getElementById('expiryDate').value = item.expiryDate.split('T')[0];
    document.getElementById('reminderDays').value = item.reminderDays||0;
    document.getElementById('periodValue').value = item.periodValue;
    document.getElementById('periodUnit').value = item.periodUnit;
    document.getElementById('notifyHour').value = item.notifyHour;
    document.getElementById('autoRenew').checked = item.autoRenew!==false;
  }else{
    // create
    document.getElementById('id').value='';
    document.getElementById('name').value='';
    document.getElementById('startDate').value='';
    document.getElementById('expiryDate').value='';
    document.getElementById('reminderDays').value='7';
    document.getElementById('periodValue').value='1';
    document.getElementById('notifyHour').value='';
    document.getElementById('autoRenew').checked=true;
  }
}
document.getElementById('addBtn').onclick=()=>openModal(null);
document.getElementById('cancelBtn').onclick=()=>document.getElementById('modal').classList.add('hidden');

document.getElementById('form').onsubmit=async(e)=>{
  e.preventDefault();
  const sub={
    id: document.getElementById('id').value || undefined,
    name: document.getElementById('name').value,
    startDate: document.getElementById('startDate').value,
    expiryDate: new Date(document.getElementById('expiryDate').value).toISOString(),
    reminderDays: Number(document.getElementById('reminderDays').value),
    periodValue: Number(document.getElementById('periodValue').value),
    periodUnit: document.getElementById('periodUnit').value,
    notifyHour: Number(document.getElementById('notifyHour').value),
    autoRenew: document.getElementById('autoRenew').checked
  };
  const method=sub.id?'PUT':'POST';
  const url=sub.id?('/api/subscriptions/'+sub.id):'/api/subscriptions';
  await fetch(url,{method,body:JSON.stringify(sub)});
  document.getElementById('modal').classList.add('hidden');
  loadList();
};
loadList();
</script>
</body></html>
`;

/** ========== Worker 本体 ========== */

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === '/' || pathname === '/admin') {
      return new Response(html, { headers: { 'content-type': 'text/html;charset=utf8' } });
    }
    if (pathname.startsWith('/api')) {
      return await handleApi(request, env);
    }
    return new Response('Not found', { status: 404 });
  },

  async scheduled(event, env, ctx) {
    await runCron(env);
  }
};
/** ==========  API 处理 ========== */
async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/subscriptions' && request.method === 'GET') {
    const list = await getAllSubscriptions(env);
    return json(list);
  }

  if (path === '/api/subscriptions' && request.method === 'POST') {
    const body = await request.json();
    body.id = crypto.randomUUID();
    const list = await getAllSubscriptions(env);
    list.push(body);
    await env.SUBSCRIPTIONS_KV.put('subscriptions', JSON.stringify(list));
    return json({ success: true });
  }

  const idMatch = path.match(/^\/api\/subscriptions\/(.+)$/);
  if (idMatch) {
    const subId = idMatch[1];
    if (request.method === 'PUT') {
      const list = await getAllSubscriptions(env);
      const body = await request.json();
      const idx = list.findIndex(i => i.id === subId);
      if (idx !== -1) {
        list[idx] = body;
        await env.SUBSCRIPTIONS_KV.put('subscriptions', JSON.stringify(list));
        return json({ success:true });
      }
      return json({ success:false });
    }
  }
  return new Response('Not found', { status: 404 });
}

/** ========== Cron 定时触发处理（整点提醒） ========= */
async function runCron(env){
  const now = new Date();
  const beijing = new Date(now.getTime()+8*60*60*1000);
  const beHour = beijing.getUTCHours();
  const todayKey = beijing.toISOString().slice(0,13);   // "YYYY-MM-DDTHH"

  const config = await getConfig(env);
  const list   = await getAllSubscriptions(env);

  const needSend = [];
  for(const sub of list){
    if(sub.isActive === false) continue;

    // 当前北京时间小时 != 订阅的整点 => 跳过
    if(Number(sub.notifyHour) !== beHour) continue;

    // 判断剩余天数
    const expiryDate = new Date(sub.expiryDate);
    let daysDiff = Math.ceil((expiryDate - now)/(1000*60*60*24));
    if(daysDiff < 0 && sub.autoRenew !== false){
      // 自动续期
      let d = new Date(expiryDate);
      if(sub.periodUnit==='day') d.setDate(d.getDate()+sub.periodValue);
      if(sub.periodUnit==='month') d.setMonth(d.getMonth()+sub.periodValue);
      if(sub.periodUnit==='year') d.setFullYear(d.getFullYear()+sub.periodValue);
      while(d < now){
        if(sub.periodUnit==='day') d.setDate(d.getDate()+sub.periodValue);
        if(sub.periodUnit==='month') d.setMonth(d.getMonth()+sub.periodValue);
        if(sub.periodUnit==='year') d.setFullYear(d.getFullYear()+sub.periodValue);
      }
      sub.expiryDate = d.toISOString();
      daysDiff = Math.ceil((d - now)/(1000*60*60*24));
    }

    const reminderDays = sub.reminderDays ?? 7;
    let should = false;
    if(reminderDays===0){
      should = daysDiff === 0;
    }else{
      should = (daysDiff>=0 && daysDiff<=reminderDays);
    }

    // 去重：如果该订阅在同一天 同一小时 已经发过 => 跳过
    const sentKey = `${sub.expiryDate}_${sub.notifyHour}_${todayKey}`;
    if(should && sub._lastNotifiedKey !== sentKey){
      sub._lastNotifiedKey = sentKey;
      needSend.push({...sub, daysRemaining:daysDiff});
    }
  }

  if(needSend.length>0){
    await env.SUBSCRIPTIONS_KV.put('subscriptions', JSON.stringify(list));
    let content = '';
    needSend.forEach(s=>{
      content += `📢 ${s.name} 将在 ${s.daysRemaining} 天后到期（${s.expiryDate.split('T')[0]}）\n`;
    });
    await sendNotificationToAllChannels('订阅到期提醒', content, config, '[定时任务]');
  }
}

/** ========== KV / 通知 / 工具函数 ========== */

function json(obj){
  return new Response(JSON.stringify(obj),{headers:{'content-type':'application/json'}});
}

async function getAllSubscriptions(env){
  const raw = await env.SUBSCRIPTIONS_KV.get('subscriptions');
  try{
    return raw ? JSON.parse(raw) : [];
  }catch(_){ return []; }
}

async function getConfig(env){
  const raw = await env.SUBSCRIPTIONS_KV.get('config');
  const cfg = raw ? JSON.parse(raw):{};
  return {
    RESEND_API_KEY: env.RESEND_API_KEY || cfg.RESEND_API_KEY,
    MAIL_TO:        cfg.MAIL_TO,
    FROM_EMAIL:     cfg.FROM_EMAIL || `no-reply@${(cfg.DOMAIN||'example.com')}`,
    TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN || cfg.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID:   env.TELEGRAM_CHAT_ID   || cfg.TELEGRAM_CHAT_ID,
    WEBHOOK_URL:        env.WEBHOOK_URL        || cfg.WEBHOOK_URL
  };
}

async function sendNotificationToAllChannels(subject, content, cfg, tag){
  // email
  if(cfg.RESEND_API_KEY && cfg.MAIL_TO){
    await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{
        Authorization:`Bearer ${cfg.RESEND_API_KEY}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        from: cfg.FROM_EMAIL,
        to: cfg.MAIL_TO,
        subject,
        html:`<pre>${content}</pre>`
      })
    });
  }
  // telegram
  if(cfg.TELEGRAM_BOT_TOKEN && cfg.TELEGRAM_CHAT_ID){
    await fetch(`https://api.telegram.org/bot${cfg.TELEGRAM_BOT_TOKEN}/sendMessage`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ chat_id:cfg.TELEGRAM_CHAT_ID,text:content })
    });
  }
  // webhook
  if(cfg.WEBHOOK_URL){
    await fetch(cfg.WEBHOOK_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ title:subject, content })
    });
  }
}

