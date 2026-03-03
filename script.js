// ================== 全局函数暴露给 HTML 的 onclick ==================
window.showToast = function(msg) {
  let toast = document.getElementById('sys-toast');
  if(!toast) {
    toast = document.createElement('div'); toast.id = 'sys-toast';
    toast.style.cssText = 'position:fixed;top:max(60px, env(safe-area-inset-top));left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.75);color:#fff;padding:10px 20px;border-radius:999px;font-size:14px;font-weight:500;z-index:99999;opacity:0;transition:opacity 0.3s, transform 0.3s;pointer-events:none;backdrop-filter:blur(10px);box-shadow:0 10px 30px rgba(0,0,0,0.1);';
    document.body.appendChild(toast);
  }
  toast.style.transform = 'translate(-50%, 10px)';
  toast.textContent = msg; toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translate(-50%, 0)'; }, 2000);
};

if (window.marked) {
  marked.setOptions({ breaks: true });
}

// ================== 等待 DOM 加载完毕后再绑定事件 ==================
document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ DOM已加载，开始初始化...');

  const STORAGE_KEY = 'softphone-settings-v31'; 

  const defaultSettings = {
    wallpaper: '', sticker: '', customCss: '',
    iconChat: '', iconWorldbook: '', iconForum: '', iconSettings: '',
    bgInfo: '', bgWallet: '', bgMusic: '', bgAnni: '', bgTodo: '',
    alphaStatus: 85, alphaCard: 92, alphaDock: 85,
    fontUrl: '', fontFamily: '', fontBase64: '', fontSize: 14, fontColor: '#4b4548', fontGlowPx: 0, fontGlowColor: '#ffffff',
    apiUrl: '', apiKey: '', apiModel: '', apiTemp: 0.7,
    apiVoiceGroup: '', apiVoiceKey: '', apiVoiceId: '',
    
    user: { name: 'ひげとしっぽ', sign: '3月1日 · 周日 · 广州', avatar: '', cover: '', status: '在线' },
    wallet: { title: '我的钱包', val: '¥ 88.00' },
    transactions: [], 
    music: { title: '暂无音乐', artist: '点击设置导入', cover: '', audio: '' },
    widgetAnni: { title: '纪念日', date: '2025-11-25' },
    widgetTodo: { title: '待办事项', items: ['给小猫喂食', '写今天的日记'] },
    stickers: [ { group: '默认', url: 'https://i.postimg.cc/Jnn0pCvF/tu-ceng-210.png' } ],
    
    personas: [ { id: 'p_default', name: '普通用户', desc: '一个普通的聊天用户，性格随和。', avatar: '' } ],
    favorites: [],
    gifts: [], 
    worldbooks: [],

    contacts: [
      { 
        id: 'ai', name: 'AI 助手', remark: '', realName: '', gender: '',
        signature: '点击设置修改签名', avatar: '', profileBg: '',
        persona: '你是一个温柔的AI助手。', personality: '温柔、体贴', 
        worldbook: '', myPersona: '普通用户', 
        
        chatBg: '', bubbleCss: '', globalCss: '', uiColor: '',
        showAvatar: true, avatarShape: 'circle', avatarSize: 32,
        
        memoryLimit: 50, globalMemory: false, shareMemory: false, autoSummary: false, summaryInterval: 30,
        timeAwareness: false, weatherAwareness: false,
        timestamps: true, enablePoke: true, proactive: false, proactiveCall: false,
        
        lastMsg: '你好呀！我是你的 AI 助手~', time: '12:00', pinned: false, isGroup: false,
        innerVoices: []
      }
    ],
    chatHistory: {}
  };

  let settings = JSON.parse(JSON.stringify(defaultSettings));

  async function loadSettings() {
    try {
      let raw = await localforage.getItem(STORAGE_KEY);
      if (!raw) {
          raw = localStorage.getItem('softphone-settings-v30') || await localforage.getItem('softphone-settings-v30'); 
          if (raw) await localforage.setItem(STORAGE_KEY, raw);
      }
      if (!raw) return { ...defaultSettings };
      let parsed = JSON.parse(raw);
      if (Array.isArray(parsed.chatHistory)) parsed.chatHistory = { 'ai': parsed.chatHistory };
      if (!parsed.contacts) parsed.contacts = defaultSettings.contacts;
      if (!parsed.stickers) parsed.stickers = defaultSettings.stickers;
      if (!parsed.music) parsed.music = defaultSettings.music;
      
      if (!parsed.user.cover) parsed.user.cover = '';
      if (!parsed.user.status) parsed.user.status = '在线';
      if (!parsed.personas) parsed.personas = defaultSettings.personas;
      if (!parsed.favorites) parsed.favorites = [];
      if (!parsed.gifts) parsed.gifts = defaultSettings.gifts;
      if (!parsed.transactions) parsed.transactions = [];
      if (!parsed.worldbooks) parsed.worldbooks = [];

      parsed.contacts = parsed.contacts.map(c => ({ ...defaultSettings.contacts[0], ...c, innerVoices: c.innerVoices || [] }));
      return { ...defaultSettings, ...parsed };
    } catch (e) { return { ...defaultSettings }; }
  }

  function saveSettings() {
    try {
      localforage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(e => console.error(e));
      return true; 
    } catch (e) { return false; }
  }

  localforage.ready().then(async () => {
      settings = await loadSettings();
      applySettings();
      renderChatList();
      renderProfilePage(); 
      if (!document.getElementById('chat-room-view').classList.contains('hidden')) renderChatHistory();
  });

  function fileToBase64Compressed(file, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (file.type.startsWith('audio/') || file.name.match(/\.(ttf|woff|woff2|otf)$/i)) { 
          callback(e.target.result); return; 
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        const maxDim = 800; 
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
          else { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function applySettings() {
    const root = document.documentElement;
    if (settings.wallpaper) root.style.setProperty('--wallpaper-url', `url('${settings.wallpaper}')`);
    else root.style.setProperty('--wallpaper-url', 'none');
    
    root.style.setProperty('--color-status-bg', `rgba(255, 255, 255, ${settings.alphaStatus / 100})`);
    root.style.setProperty('--color-card-bg', `rgba(255, 255, 255, ${settings.alphaCard / 100})`);
    root.style.setProperty('--color-dock-bg', `rgba(255, 255, 255, ${settings.alphaDock / 100})`);

    let styleTag = document.getElementById('user-font-face');
    if (!styleTag) { styleTag = document.createElement('style'); styleTag.id = 'user-font-face'; document.head.appendChild(styleTag); }
    styleTag.textContent = ''; 

    if (settings.fontBase64) {
        styleTag.textContent = `@font-face { font-family: 'CustomUserFont'; src: url('${settings.fontBase64}'); font-weight: normal; font-style: normal; }`;
    } else if (settings.fontUrl) {
        if (settings.fontUrl.endsWith('.css') || settings.fontUrl.includes('fonts.googleapis.com')) {
            let link = document.getElementById('user-font-link');
            if (!link) { link = document.createElement('link'); link.id = 'user-font-link'; link.rel = 'stylesheet'; document.head.appendChild(link); }
            link.href = settings.fontUrl;
        } else {
            styleTag.textContent = `@font-face { font-family: 'CustomUserFont'; src: url('${settings.fontUrl}'); }`;
        }
    }
    
    let activeFontFamily = settings.fontFamily;
    if (!activeFontFamily && settings.fontUrl && settings.fontUrl.includes('family=')) {
        const match = settings.fontUrl.match(/family=([^&:]+)/);
        if (match) activeFontFamily = match[1].replace(/\+/g, ' ').split(':')[0];
    }

    if (activeFontFamily) {
        root.style.setProperty('--font-main', `'${activeFontFamily}', 'CustomUserFont', system-ui, -apple-system, sans-serif`);
    } else {
        root.style.setProperty('--font-main', `'CustomUserFont', system-ui, -apple-system, sans-serif`);
    }
    
    root.style.setProperty('--font-size-global', settings.fontSize + 'px');
    root.style.setProperty('--font-color-global', settings.fontColor);
    root.style.setProperty('--font-glow-px', settings.fontGlowPx + 'px');
    root.style.setProperty('--font-glow-color', settings.fontGlowColor);

    let cssTag = document.getElementById('user-custom-css');
    if (!cssTag) { cssTag = document.createElement('style'); cssTag.id = 'user-custom-css'; document.head.appendChild(cssTag); }
    cssTag.textContent = settings.customCss || '';

    const stickerEl = document.getElementById('home-sticker');
    if(stickerEl) {
      if(settings.sticker) { stickerEl.style.backgroundImage = `url('${settings.sticker}')`; stickerEl.style.display = 'block'; }
      else { stickerEl.style.display = 'none'; }
    }

    const apps = ['chat', 'worldbook', 'forum', 'settings'];
    apps.forEach(app => {
      const el = document.getElementById(`icon-${app}`);
      if(el) {
        const iconData = settings[`icon${app.charAt(0).toUpperCase() + app.slice(1)}`];
        const svg = el.querySelector('.default-svg');
        if(iconData) { el.style.backgroundImage = `url('${iconData}')`; el.style.backgroundSize = 'cover'; if(svg) svg.style.display = 'none'; } 
        else { el.style.backgroundImage = 'none'; if(svg) svg.style.display = 'block'; }
      }
    });

    const comps = ['info', 'wallet', 'music', 'anni', 'todo'];
    comps.forEach(c => {
      const el = document.getElementById(`widget-${c}`);
      if (el) {
        const bgData = settings[`bg${c.charAt(0).toUpperCase() + c.slice(1)}`];
        if (bgData) { el.style.backgroundImage = `url('${bgData}')`; } else { el.style.backgroundImage = 'none'; }
      }
    });

    document.getElementById('edit-user-name').textContent = settings.user.name;
    document.getElementById('edit-user-sign').textContent = settings.user.sign;
    if(settings.user.avatar) document.getElementById('user-avatar-disp').style.backgroundImage = `url('${settings.user.avatar}')`;
    
    document.getElementById('edit-wallet-title').textContent = settings.wallet.title;
    document.getElementById('edit-wallet-val').textContent = settings.wallet.val;
    
    document.getElementById('music-title-disp').textContent = settings.music.title || '暂无音乐';
    document.getElementById('music-artist-disp').textContent = settings.music.artist || '点击设置导入';
    if(settings.music.cover) document.getElementById('music-cover-disp').style.backgroundImage = `url('${settings.music.cover}')`;
    if(settings.music.audio) document.getElementById('sys-audio-player').src = settings.music.audio;

    document.getElementById('edit-anni-title').textContent = settings.widgetAnni.title;
    updateAnniversary();
    document.getElementById('edit-todo-title').textContent = settings.widgetTodo.title;
    renderTodos();
  }

  function formatTime(now) { return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; }

  function updateWallet(amount, title = '转账') {
    let current = parseFloat(settings.wallet.val.replace(/[^\d.-]/g, '')) || 0;
    let amtNum = parseFloat(amount);
    current += amtNum;
    settings.wallet.val = `¥ ${current.toFixed(2)}`;
    document.getElementById('edit-wallet-val').textContent = settings.wallet.val;
    document.getElementById('profile-wallet-val').textContent = settings.wallet.val;

    if(!settings.transactions) settings.transactions = [];
    settings.transactions.unshift({
        title: title,
        amount: amtNum > 0 ? `+${amtNum.toFixed(2)}` : `${amtNum.toFixed(2)}`,
        time: formatTime(new Date()) + ' ' + new Date().toLocaleDateString(),
        type: amtNum > 0 ? 'plus' : 'minus'
    });
    saveSettings();
  }

  window.showWalletModal = function() {
    document.getElementById('wallet-modal-balance').textContent = settings.wallet.val;
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    if(!settings.transactions || settings.transactions.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#999; padding:20px 0; font-size:13px;">暂无账单明细</div>';
    } else {
        settings.transactions.forEach(t => {
            list.innerHTML += `<div class="trans-item">
                <div class="trans-info">
                    <span class="trans-title">${t.title}</span>
                    <span class="trans-time">${t.time}</span>
                </div>
                <span class="trans-amt ${t.type}">${t.amount}</span>
            </div>`;
        });
    }
    document.getElementById('wallet-detail-modal').classList.remove('hidden');
  }

  window.rechargeWallet = function() {
    const amt = prompt('请输入充值金额 (¥)：', '100');
    if(amt && !isNaN(amt)) {
        updateWallet(parseFloat(amt), '手动充值');
        showWalletModal(); 
        window.showToast('充值成功');
    }
  }

  window.showGiftDetail = function(giftId) {
    const g = settings.gifts.find(x => x.id === giftId);
    if(!g) return;
    document.getElementById('gift-detail-icon').textContent = g.icon;
    document.getElementById('gift-detail-name').textContent = g.name;
    document.getElementById('gift-detail-sender').textContent = `来自: ${g.senderName || 'AI'}`;
    
    const descEl = document.getElementById('gift-detail-desc');
    const btnGen = document.getElementById('btn-generate-gift-msg');
    
    if (g.message) {
        descEl.innerHTML = marked.parse(g.message);
        btnGen.style.display = 'none';
    } else {
        descEl.innerHTML = '尚未生成贺卡，点击上方按钮让TA写一段寄语吧~';
        btnGen.style.display = 'inline-block';
        btnGen.onclick = () => generateGiftMessage(g);
    }
    
    document.getElementById('gift-detail-modal').classList.remove('hidden');
  }

  async function generateGiftMessage(g) {
    const descEl = document.getElementById('gift-detail-desc');
    const btnGen = document.getElementById('btn-generate-gift-msg');
    
    if (!settings.apiUrl || !settings.apiKey || !settings.apiModel) {
        window.showToast("请先配置 API！");
        return;
    }

    btnGen.style.display = 'none';
    descEl.innerHTML = '<span style="color:var(--color-accent);">AI 正在为你写贺卡... ✨</span>';

    try {
        const c = settings.contacts.find(x => x.id === g.senderId) || settings.contacts[0];
        const sysPrompt = `你是${c.name}。性格：${c.personality}。人设：${c.persona}。
你刚刚送给用户一份礼物：${g.icon} ${g.name}。
请用符合你人设、简短、温柔、有苏感的语气写一段送礼寄语（不超过50字）。不要有任何多余的解释或动作描写，直接说出你想对TA说的话。`;
        
        const res = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
            body: JSON.stringify({ model: settings.apiModel, messages: [{role:'user', content:sysPrompt}], temperature: 0.8 })
        });
        const data = await res.json();
        const msg = data.choices[0].message.content.trim();
        g.message = msg;
        saveSettings();
        descEl.innerHTML = marked.parse(msg);
    } catch(err) {
        descEl.textContent = "获取寄语失败：" + err.message;
        btnGen.style.display = 'inline-block';
    }
  }

  let isFavMultiSelect = false;
  let isGiftMultiSelect = false;

  function renderProfilePage() {
      document.getElementById('profile-name-edit').textContent = settings.user.name;
      document.getElementById('profile-sign-edit').textContent = settings.user.sign;
      document.getElementById('profile-status-disp').textContent = settings.user.status;
      document.getElementById('profile-wallet-val').textContent = settings.wallet.val;
      
      if(settings.user.avatar) document.getElementById('profile-avatar-disp').style.backgroundImage = `url('${settings.user.avatar}')`;
      if(settings.user.cover) document.getElementById('profile-cover-disp').style.backgroundImage = `url('${settings.user.cover}')`;
      
      const personasList = document.getElementById('personas-list-container');
      if (personasList) {
          personasList.innerHTML = '';
          settings.personas.forEach((p, idx) => {
              const wrap = document.createElement('div');
              wrap.className = 'persona-list-wrap';
              const bg = p.avatar ? `style="background-image:url('${p.avatar}')"` : '';
              wrap.innerHTML = `
                <div class="persona-scroll-area">
                  <div class="persona-card-content" onclick="editPersona('${p.id}')">
                    <div class="persona-avatar" ${bg}></div>
                    <div class="persona-info">
                        <div class="persona-name-row">
                          <span class="persona-name">${p.name}</span>
                          <span class="persona-tag">${p.personality || '普通'}</span>
                        </div>
                        <div class="persona-desc">${p.desc || '暂无描述'}</div>
                    </div>
                  </div>
                  <div class="persona-actions">
                    <button class="persona-btn-delete" onclick="deletePersona(${idx})">删除</button>
                  </div>
                </div>
              `;
              personasList.appendChild(wrap);
          });
      }

      const favList = document.getElementById('favorites-list-container');
      if (favList) {
          favList.innerHTML = '';
          document.getElementById('fav-multi-action-bar').classList.toggle('hidden', !isFavMultiSelect);
          
          if (settings.favorites.length === 0) {
              favList.innerHTML = '<div style="text-align:center;color:#999;padding:20px;font-size:13px;">暂无收藏，长按聊天消息即可收藏</div>';
          } else {
              settings.favorites.forEach((f, idx) => {
                  const card = document.createElement('div');
                  card.className = `fav-card ${isFavMultiSelect ? 'selectable' : ''}`;
                  
                  let contentHtml = f.content;
                  if (f.content.includes('<img')) contentHtml = '[图片]';
                  else contentHtml = f.content.replace(/<[^>]*>?/gm, ''); 
                  
                  card.innerHTML = `
                      <div class="fav-cb-wrap"><input type="checkbox" class="ios-checkbox fav-cb" value="${idx}"></div>
                      <div class="fav-content-area">
                        <div class="fav-text">${contentHtml}</div>
                        <div class="fav-meta"><span>来自: ${f.from}</span><span>${f.time}</span></div>
                      </div>
                  `;
                  if(!isFavMultiSelect) {
                      card.onclick = () => {
                          if(confirm('取消收藏该内容？')) { settings.favorites.splice(idx, 1); saveSettings(); renderProfilePage(); }
                      };
                  } else {
                      card.onclick = (e) => {
                          if(e.target.tagName !== 'INPUT') {
                              const cb = card.querySelector('.fav-cb');
                              cb.checked = !cb.checked;
                          }
                      }
                  }
                  favList.appendChild(card);
              });
          }
      }

      // 🚨 礼物箱多选渲染逻辑
      const giftList = document.getElementById('gifts-list-container');
      if (giftList) {
          giftList.innerHTML = '';
          document.getElementById('gift-multi-action-bar').classList.toggle('hidden', !isGiftMultiSelect);
          
          let hasGift = false;
          settings.gifts.forEach((g, idx) => {
              if (g.count > 0) {
                  hasGift = true;
                  const item = document.createElement('div');
                  item.className = `gift-item card-clickable ${isGiftMultiSelect ? 'selectable' : ''}`;
                  item.style.position = 'relative';
                  
                  let cbHtml = isGiftMultiSelect ? `<div style="position:absolute; top:8px; right:8px;"><input type="checkbox" class="ios-checkbox gift-cb" value="${idx}"></div>` : '';
                  
                  item.innerHTML = `
                      ${cbHtml}
                      <div class="gift-icon">${g.icon}</div>
                      <div class="gift-name">${g.name}</div>
                      <div class="gift-count">x ${g.count}</div>
                  `;
                  
                  if (!isGiftMultiSelect) {
                      item.onclick = () => showGiftDetail(g.id);
                  } else {
                      item.onclick = (e) => {
                          if (e.target.tagName !== 'INPUT') {
                              const cb = item.querySelector('.gift-cb');
                              if (cb) cb.checked = !cb.checked;
                          }
                      };
                  }
                  giftList.appendChild(item);
              }
          });
          
          if (!hasGift) {
              giftList.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#999;padding:20px;font-size:13px;">礼物箱空空如也，快让AI送你礼物吧</div>';
          }
      }
  }

  document.getElementById('btn-fav-edit').addEventListener('click', function() {
      isFavMultiSelect = !isFavMultiSelect;
      this.textContent = isFavMultiSelect ? '取消' : '多选';
      renderProfilePage();
  });
  document.getElementById('fav-select-all').addEventListener('change', (e) => {
      document.querySelectorAll('.fav-cb').forEach(cb => cb.checked = e.target.checked);
  });
  document.getElementById('fav-delete-selected').addEventListener('click', () => {
      const checked = Array.from(document.querySelectorAll('.fav-cb:checked')).map(cb => parseInt(cb.value)).sort((a,b) => b-a);
      if(checked.length === 0) return window.showToast('未选择任何项');
      if(confirm(`确定删除选中的 ${checked.length} 条收藏吗？`)) {
          checked.forEach(idx => settings.favorites.splice(idx, 1));
          saveSettings(); renderProfilePage(); window.showToast('已删除');
      }
  });

  // 🚨 礼物箱多选操作
  document.getElementById('btn-gift-edit')?.addEventListener('click', function() {
      isGiftMultiSelect = !isGiftMultiSelect;
      this.textContent = isGiftMultiSelect ? '取消' : '多选';
      renderProfilePage();
  });
  document.getElementById('gift-select-all')?.addEventListener('change', (e) => {
      document.querySelectorAll('.gift-cb').forEach(cb => cb.checked = e.target.checked);
  });
  document.getElementById('gift-delete-selected')?.addEventListener('click', () => {
      const checked = Array.from(document.querySelectorAll('.gift-cb:checked')).map(cb => parseInt(cb.value)).sort((a,b) => b-a);
      if(checked.length === 0) return window.showToast('未选择任何项');
      if(confirm(`确定删除选中的 ${checked.length} 个礼物吗？`)) {
          checked.forEach(idx => settings.gifts.splice(idx, 1));
          saveSettings(); renderProfilePage(); window.showToast('已删除');
      }
  });

  window.deletePersona = function(idx) {
      if(confirm('确定删除该面具吗？')) {
          settings.personas.splice(idx, 1);
          saveSettings(); renderProfilePage(); window.showToast('已删除');
      }
  }

  window.editProfileStatus = function() {
      const newStatus = prompt('请输入你的当前状态（如：在线、忙碌、睡觉中）：', settings.user.status);
      if (newStatus) { settings.user.status = newStatus; saveSettings(); renderProfilePage(); }
  };

  document.getElementById('profile-name-edit').addEventListener('blur', (e) => {
      settings.user.name = e.target.textContent; document.getElementById('edit-user-name').textContent = settings.user.name;
      if(saveSettings()) window.showToast('名字已保存');
  });
  document.getElementById('profile-sign-edit').addEventListener('blur', (e) => {
      settings.user.sign = e.target.textContent; document.getElementById('edit-user-sign').textContent = settings.user.sign;
      if(saveSettings()) window.showToast('签名已保存');
  });

  document.getElementById('inp-profile-avatar').addEventListener('change', e => {
      fileToBase64Compressed(e.target.files[0], res => { 
          settings.user.avatar = res; 
          if(saveSettings()){ applySettings(); renderProfilePage(); window.showToast('头像已更换'); } 
      });
  });
  document.getElementById('inp-profile-cover').addEventListener('change', e => {
      fileToBase64Compressed(e.target.files[0], res => { 
          settings.user.cover = res; 
          if(saveSettings()){ renderProfilePage(); window.showToast('封面已更换'); } 
      });
  });

  window.showAddPersonaModal = function() {
      document.getElementById('persona-modal-title').textContent = '新建面具';
      document.getElementById('inp-persona-id').value = '';
      document.getElementById('inp-persona-name').value = '';
      document.getElementById('inp-persona-personality').value = '';
      document.getElementById('inp-persona-desc').value = '';
      document.getElementById('persona-modal').classList.remove('hidden');
  };

  window.editPersona = function(id) {
      const p = settings.personas.find(x => x.id === id);
      if (!p) return;
      document.getElementById('persona-modal-title').textContent = '编辑面具';
      document.getElementById('inp-persona-id').value = p.id;
      document.getElementById('inp-persona-name').value = p.name;
      document.getElementById('inp-persona-personality').value = p.personality || '';
      document.getElementById('inp-persona-desc').value = p.desc;
      document.getElementById('persona-modal').classList.remove('hidden');
  };

  let tempPersonaAvatar = '';
  document.getElementById('inp-persona-avatar').addEventListener('change', e => {
      fileToBase64Compressed(e.target.files[0], res => tempPersonaAvatar = res);
  });

  document.getElementById('btn-save-persona').addEventListener('click', () => {
      const id = document.getElementById('inp-persona-id').value;
      const name = document.getElementById('inp-persona-name').value.trim();
      const personality = document.getElementById('inp-persona-personality').value.trim();
      const desc = document.getElementById('inp-persona-desc').value.trim();
      if (!name) return window.showToast('面具名称不能为空');

      if (id) {
          const p = settings.personas.find(x => x.id === id);
          if (p) {
              p.name = name; p.personality = personality; p.desc = desc;
              if (tempPersonaAvatar) p.avatar = tempPersonaAvatar;
          }
      } else {
          settings.personas.push({
              id: 'p_' + Date.now(),
              name: name, personality: personality, desc: desc,
              avatar: tempPersonaAvatar
          });
      }
      
      tempPersonaAvatar = ''; saveSettings(); renderProfilePage();
      document.getElementById('persona-modal').classList.add('hidden');
      window.showToast('面具保存成功');
  });

  function updateAnniversary() {
    if(!settings.widgetAnni.date) return;
    const target = new Date(settings.widgetAnni.date);
    const diff = target - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    document.getElementById('anni-days').textContent = Math.abs(days);
    const dayStr = ['日','一','二','三','四','五','六'][target.getDay()];
    document.getElementById('anni-date-btn').textContent = `${settings.widgetAnni.date} 星期${dayStr}`;
  }

  function renderTodos() {
    const list = document.getElementById('todo-list');
    list.innerHTML = '';
    settings.widgetTodo.items.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'todo-item'; li.textContent = item;
      li.oncontextmenu = (e) => { e.preventDefault(); if(confirm('删除此待办？')){ settings.widgetTodo.items.splice(idx, 1); if(saveSettings()) renderTodos(); } };
      list.appendChild(li);
    });
  }

  document.querySelectorAll('[contenteditable="true"]').forEach(el => {
    if (el.id.includes('profile') || el.id.includes('cs-disp')) return; 
    el.addEventListener('blur', (e) => {
      const id = e.target.id; const txt = e.target.textContent;
      if(id === 'edit-user-name') { settings.user.name = txt; document.getElementById('profile-name-edit').textContent = txt; }
      if(id === 'edit-user-sign') { settings.user.sign = txt; document.getElementById('profile-sign-edit').textContent = txt; }
      if(id === 'edit-wallet-title') settings.wallet.title = txt;
      if(id === 'edit-wallet-val') { settings.wallet.val = txt; document.getElementById('profile-wallet-val').textContent = txt; }
      if(id === 'edit-anni-title') settings.widgetAnni.title = txt;
      if(id === 'edit-todo-title') settings.widgetTodo.title = txt;
      if(saveSettings()) window.showToast('文字已保存');
    });
  });

  document.getElementById('add-todo-btn').addEventListener('click', () => {
    const text = prompt('输入新的待办事项：');
    if (text) { settings.widgetTodo.items.push(text); if(saveSettings()){ renderTodos(); window.showToast('待办已添加'); } }
  });
  document.getElementById('todo-list').addEventListener('click', (e) => {
    if (e.target.classList.contains('todo-item')) e.target.classList.toggle('done');
  });
  document.getElementById('inp-avatar').addEventListener('change', e => fileToBase64Compressed(e.target.files[0], res => { settings.user.avatar = res; if(saveSettings()){ applySettings(); renderProfilePage(); window.showToast('头像已更换'); } }));

  function updateTopTime() {
    const t = formatTime(new Date());
    ['status-time', 'home-clock'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = t; });
  }
  updateTopTime(); setInterval(updateTopTime, 30_000);

  const views = document.querySelectorAll('.view');
  const dockItems = document.querySelectorAll('.dock-icon-button');
  function switchView(viewName) {
    views.forEach(view => view.classList.toggle('hidden', view.dataset.view !== viewName));
    dockItems.forEach(btn => btn.classList.toggle('active', btn.dataset.target === viewName));
    const dock = document.getElementById('sys-dock');
    const mainView = document.querySelector('.main-view');
    if (viewName === 'home') {
      if(dock) dock.style.display = 'flex';
      if(mainView) mainView.classList.remove('no-dock');
    } else {
      if(dock) dock.style.display = 'none';
      if(mainView) mainView.classList.add('no-dock');
    }
  }

  document.querySelectorAll('[data-target], [data-jump]').forEach(btn => {
    btn.addEventListener('click', () => { const target = btn.dataset.target || btn.dataset.jump; if (target) switchView(target); });
  });

  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.back; if (!target) return;
      if (target === 'settings') { tempSettings = {}; window.showToast('已取消修改'); }
      if (target === 'chat') { 
          renderChatList(); 
          exitMultiSelectMode(); 
          clearQuote(); 
      }
      switchView(target);
    });
  });

  document.querySelectorAll('[data-subview]').forEach(btn => {
    btn.addEventListener('click', () => { const target = btn.dataset.subview; switchView(target); initSubView(target); });
  });

  const pager = document.querySelector('.home-pager');
  const pagerDots = document.querySelectorAll('#pager-dots .dot');
  if (pager) {
    pager.addEventListener('scroll', () => {
      const idx = Math.round(pager.scrollLeft / pager.clientWidth);
      pagerDots.forEach((dot, i) => dot.classList.toggle('active', i === idx));
    });
  }

  let tempSettings = {};

  function initSubView(viewName) {
    if (viewName === 'settings-api') {
      document.getElementById('api-url').value = settings.apiUrl;
      document.getElementById('api-key').value = settings.apiKey;
      document.getElementById('api-temp').value = settings.apiTemp;
      document.getElementById('temp-val').textContent = settings.apiTemp;
      if (settings.apiModel) document.getElementById('api-model').innerHTML = `<option value="${settings.apiModel}">${settings.apiModel}</option>`;
    } else if (viewName === 'settings-appearance') {
      document.getElementById('inp-alpha-status').value = settings.alphaStatus; document.getElementById('val-alpha-status').textContent = settings.alphaStatus + '%';
      document.getElementById('inp-alpha-card').value = settings.alphaCard; document.getElementById('val-alpha-card').textContent = settings.alphaCard + '%';
      document.getElementById('inp-alpha-dock').value = settings.alphaDock; document.getElementById('val-alpha-dock').textContent = settings.alphaDock + '%';
    } else if (viewName === 'settings-font') {
      document.getElementById('inp-font-url').value = settings.fontUrl || '';
      document.getElementById('inp-font-family').value = settings.fontFamily;
      document.getElementById('inp-font-size').value = settings.fontSize; document.getElementById('val-font-size').textContent = settings.fontSize + 'px';
      document.getElementById('inp-font-color').value = settings.fontColor;
      document.getElementById('inp-font-glow').value = settings.fontGlowPx; document.getElementById('val-font-glow').textContent = settings.fontGlowPx + 'px';
      document.getElementById('inp-glow-color').value = settings.fontGlowColor;
    } else if (viewName === 'settings-css') {
      document.getElementById('inp-custom-css').value = settings.customCss;
    } else if (viewName === 'settings-data') {
      localforage.getItem(STORAGE_KEY).then(data => {
          if(data) {
              const kb = (data.length / 1024).toFixed(2);
              document.getElementById('mem-usage').textContent = `${kb} KB`;
          } else {
              document.getElementById('mem-usage').textContent = `0.00 KB`;
          }
      });
    }
  }

  document.querySelectorAll('input[type="range"]').forEach(input => {
    input.addEventListener('input', (e) => {
      const targetId = e.target.id.replace('inp-', 'val-').replace('api-temp', 'temp-val').replace('cs-memory', 'val-cs-memory');
      const display = document.getElementById(targetId);
      if (display) display.textContent = e.target.value + (e.target.id.includes('alpha') ? '%' : (e.target.id.includes('temp') ? '' : ''));
    });
  });

  document.getElementById('btn-fetch-models')?.addEventListener('click', async function() {
    const btn = this; 
    const url = document.getElementById('api-url').value.trim();
    const key = document.getElementById('api-key').value.trim();
    if (!url || !key) { window.showToast('请先填写 URL 和 Key！'); return; }
    btn.textContent = '拉取中...'; btn.style.opacity = '0.7';
    try {
      const res = await fetch(`${url}/models`, { headers: { 'Authorization': `Bearer ${key}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const select = document.getElementById('api-model');
      select.innerHTML = '';
      if(data.data && data.data.length > 0) {
        data.data.forEach(m => { const opt = document.createElement('option'); opt.value = m.id; opt.textContent = m.id; select.appendChild(opt); });
        btn.textContent = '✅ 连接成功'; btn.classList.add('success');
        setTimeout(() => { btn.textContent = '拉取模型 (真实请求)'; btn.classList.remove('success'); btn.style.opacity = '1'; }, 2000);
        window.showToast('模型拉取成功！');
      } else { throw new Error('模型列表为空'); }
    } catch (err) {
      btn.textContent = '❌ 拉取失败'; btn.classList.add('error');
      window.showToast('拉取失败: ' + err.message);
      setTimeout(() => { btn.textContent = '拉取模型 (真实请求)'; btn.classList.remove('error'); btn.style.opacity = '1'; }, 2000);
    }
  });

  document.getElementById('save-api')?.addEventListener('click', () => {
    settings.apiUrl = document.getElementById('api-url').value.trim();
    settings.apiKey = document.getElementById('api-key').value.trim();
    settings.apiModel = document.getElementById('api-model-manual').value.trim() || document.getElementById('api-model').value;
    settings.apiTemp = parseFloat(document.getElementById('api-temp').value);
    if(saveSettings()){ switchView('settings'); window.showToast('API 设置已保存！'); }
  });

  const fileInputs = [
    { id: 'inp-wallpaper', key: 'wallpaper' }, { id: 'inp-sticker', key: 'sticker' },
    { id: 'inp-icon-chat', key: 'iconChat' }, { id: 'inp-icon-worldbook', key: 'iconWorldbook' },
    { id: 'inp-icon-forum', key: 'iconForum' }, { id: 'inp-icon-settings', key: 'iconSettings' },
    { id: 'inp-bg-info', key: 'bgInfo' }, { id: 'inp-bg-wallet', key: 'bgWallet' },
    { id: 'inp-bg-music', key: 'bgMusic' }, { id: 'inp-bg-anni', key: 'bgAnni' }, { id: 'inp-bg-todo', key: 'bgTodo' }
  ];
  fileInputs.forEach(item => {
    document.getElementById(item.id)?.addEventListener('change', e => {
      fileToBase64Compressed(e.target.files[0], res => tempSettings[item.key] = res);
    });
  });

  document.getElementById('btn-clear-wallpaper')?.addEventListener('click', () => tempSettings.wallpaper = '');
  document.getElementById('btn-clear-sticker')?.addEventListener('click', () => tempSettings.sticker = '');

  document.getElementById('save-appearance')?.addEventListener('click', () => {
    Object.assign(settings, tempSettings);
    settings.alphaStatus = document.getElementById('inp-alpha-status').value;
    settings.alphaCard = document.getElementById('inp-alpha-card').value;
    settings.alphaDock = document.getElementById('inp-alpha-dock').value;
    if(saveSettings()) { applySettings(); switchView('settings'); window.showToast('外观与壁纸已保存！'); tempSettings = {}; }
  });

  let tempFontBase64 = '';
  document.getElementById('inp-font-file')?.addEventListener('change', e => {
    fileToBase64Compressed(e.target.files[0], res => {
        tempFontBase64 = res;
        window.showToast('本地字体已加载，请点击保存');
    });
  });

  document.getElementById('save-font')?.addEventListener('click', () => {
    settings.fontUrl = document.getElementById('inp-font-url').value.trim();
    settings.fontFamily = document.getElementById('inp-font-family').value.trim();
    if (tempFontBase64) settings.fontBase64 = tempFontBase64;
    
    settings.fontSize = document.getElementById('inp-font-size').value;
    settings.fontColor = document.getElementById('inp-font-color').value;
    settings.fontGlowPx = document.getElementById('inp-font-glow').value;
    settings.fontGlowColor = document.getElementById('inp-glow-color').value;
    
    if(saveSettings()){ 
        applySettings(); 
        switchView('settings'); 
        window.showToast('字体设置已保存！'); 
        tempFontBase64 = '';
    }
  });

  document.getElementById('save-css')?.addEventListener('click', () => {
    settings.customCss = document.getElementById('inp-custom-css').value;
    if(saveSettings()){ applySettings(); switchView('settings'); window.showToast('全局 CSS 已生效！'); }
  });

  document.getElementById('btn-export')?.addEventListener('click', async () => {
    const data = await localforage.getItem(STORAGE_KEY);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(data);
    const a = document.createElement('a'); a.href = dataStr; a.download = "minaphone_backup.json";
    document.body.appendChild(a); a.click(); a.remove(); window.showToast('导出成功！');
  });
  
  document.getElementById('btn-import')?.addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        await localforage.setItem(STORAGE_KEY, JSON.stringify(importedData));
        alert('导入成功，即将刷新页面！'); location.reload();
      } catch (err) { alert('JSON 格式错误，导入失败。'); }
    };
    reader.readAsText(file);
  });
  
  document.getElementById('btn-clear')?.addEventListener('click', async () => {
    if (confirm('确定要清理所有缓存数据吗？此操作不可逆！')) { 
        await localforage.clear(); 
        localStorage.clear();
        location.reload(); 
    }
  });

  let currentChatId = 'ai';

  function renderChatList() {
    const container = document.getElementById('chat-list-container');
    if (!container) return;
    container.innerHTML = '';
    
    const sorted = [...settings.contacts].sort((a, b) => {
        if (a.pinned !== b.pinned) return b.pinned ? -1 : 1;
        return 0; 
    });

    sorted.forEach(c => {
      const item = document.createElement('div');
      item.className = `chat-list-item sys-card ${c.pinned ? 'is-pinned' : ''}`;
      const bg = c.avatar ? `style="background-image:url('${c.avatar}')"` : '';
      const pinText = c.pinned ? '取消置顶' : '置顶';
      const dispName = c.remark || c.realName || c.name;
      
      item.innerHTML = `
        <div class="chat-list-scroll">
          <div class="chat-list-content" onclick="openChatRoom('${c.id}')">
            <div class="chat-list-avatar" ${bg}></div>
            <div class="chat-list-info">
              <div class="chat-list-name">${dispName} ${c.pinned ? '📌' : ''}</div>
              <div class="chat-list-msg">${c.lastMsg || '暂无消息'}</div>
            </div>
            <div class="chat-list-time">${c.time || ''}</div>
          </div>
          <div class="chat-list-actions">
            <button class="btn-pin" onclick="togglePin('${c.id}')">${pinText}</button>
            <button class="btn-delete" onclick="deleteContact('${c.id}')">删除</button>
          </div>
        </div>
      `;
      container.appendChild(item);
    });
  }

  // ================== 🎨 打开聊天房间 (动态美化生效) ==================
  window.openChatRoom = function(id) {
    currentChatId = id;
    const c = settings.contacts.find(x => x.id === id);
    document.getElementById('chat-target-name').textContent = c.remark || c.realName || c.name;
    
    const bioEl = document.getElementById('chat-target-bio');
    if(bioEl) bioEl.textContent = c.signature ? c.signature : '点击设置修改签名';
    
    const aiAvatarEl = document.getElementById('header-ai-avatar');
    const userAvatarEl = document.getElementById('header-user-avatar');
    aiAvatarEl.style.backgroundImage = c.avatar ? `url('${c.avatar}')` : 'none';
    
    let userAvatar = settings.user.avatar;
    if (c.myPersona) {
        const p = settings.personas.find(x => x.desc === c.myPersona || x.name === c.myPersona);
        if (p && p.avatar) userAvatar = p.avatar;
    }
    userAvatarEl.style.backgroundImage = userAvatar ? `url('${userAvatar}')` : 'none';

    if (!settings.chatHistory[id]) settings.chatHistory[id] = [];
    
    const room = document.getElementById('chat-room-view');
    room.style.backgroundImage = c.chatBg ? `url('${c.chatBg}')` : 'none';
    
    let bcss = document.getElementById('chat-bubble-css');
    if(!bcss) { bcss = document.createElement('style'); bcss.id = 'chat-bubble-css'; document.head.appendChild(bcss); }
    bcss.textContent = c.bubbleCss || '';

    let gcss = document.getElementById('chat-global-css');
    if(!gcss) { gcss = document.createElement('style'); gcss.id = 'chat-global-css'; document.head.appendChild(gcss); }
    gcss.textContent = c.globalCss || '';

    const chatBody = document.getElementById('chat-messages');
    if (c.showAvatar === false) chatBody.classList.add('hide-avatar');
    else chatBody.classList.remove('hide-avatar');

    document.documentElement.style.setProperty('--chat-avatar-size', (c.avatarSize || 32) + 'px');
    if (c.avatarShape === 'square') chatBody.classList.add('square-avatar');
    else chatBody.classList.remove('square-avatar');

    if (c.uiColor) {
        room.style.color = c.uiColor;
        document.getElementById('chat-target-name').style.color = c.uiColor;
    } else {
        room.style.color = '';
        document.getElementById('chat-target-name').style.color = '';
    }

    renderChatHistory();
    switchView('chat-room');
  }

  window.togglePin = function(id) {
    const c = settings.contacts.find(x => x.id === id);
    if (c) { c.pinned = !c.pinned; saveSettings(); renderChatList(); window.showToast(c.pinned ? '已置顶' : '已取消置顶'); }
  }

  window.deleteContact = function(id) {
    if (confirm('确定删除该联系人及聊天记录吗？')) {
      settings.contacts = settings.contacts.filter(x => x.id !== id);
      delete settings.chatHistory[id];
      saveSettings(); renderChatList(); window.showToast('已删除');
    }
  }

  document.getElementById('chat-search-input')?.addEventListener('input', (e) => {
    const kw = e.target.value.toLowerCase();
    const items = document.querySelectorAll('.chat-list-item');
    items.forEach(item => {
      const name = item.querySelector('.chat-list-name').textContent.toLowerCase();
      const msg = item.querySelector('.chat-list-msg').textContent.toLowerCase();
      item.style.display = (name.includes(kw) || msg.includes(kw)) ? 'block' : 'none';
    });
  });

  document.querySelectorAll('.chat-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.chattab;
      document.querySelectorAll('.chat-tab-content').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.chat-nav-item').forEach(el => el.classList.remove('active'));
      document.getElementById(targetId).classList.remove('hidden');
      btn.classList.add('active');
    });
  });

  document.getElementById('btn-chat-add')?.addEventListener('click', (e) => {
    e.stopPropagation(); document.getElementById('chat-add-menu').classList.toggle('hidden');
  });

  window.showAddCharModal = function() {
    document.getElementById('chat-add-menu').classList.add('hidden');
    document.getElementById('add-char-modal').classList.remove('hidden');
  };

  window.showAddGroupModal = function() {
    document.getElementById('chat-add-menu').classList.add('hidden');
    const list = document.getElementById('group-member-list');
    list.innerHTML = '';
    settings.contacts.forEach(c => {
      if (c.isGroup) return;
      const div = document.createElement('div');
      div.innerHTML = `<label style="display:flex; align-items:center; gap:8px; margin-bottom:8px; font-weight:normal; cursor:pointer;"><input type="checkbox" value="${c.id}" class="group-member-cb"> ${c.name}</label>`;
      list.appendChild(div);
    });
    document.getElementById('add-group-modal').classList.remove('hidden');
  };

  let tempNewCharAvatar = '';
  document.getElementById('new-char-avatar')?.addEventListener('change', e => fileToBase64Compressed(e.target.files[0], res => tempNewCharAvatar = res));

  document.getElementById('btn-save-new-char')?.addEventListener('click', () => {
    const name = document.getElementById('new-char-name').value.trim();
    const persona = document.getElementById('new-char-persona').value.trim();
    const greeting = document.getElementById('new-char-greeting').value.trim() || '你好呀！';
    if (!name) return window.showToast('名称不能为空');
    
    const newChar = {
      ...defaultSettings.contacts[0],
      id: 'char_' + Date.now(),
      name: name, avatar: tempNewCharAvatar, persona: persona,
      lastMsg: greeting, time: formatTime(new Date()),
      pinned: false, isGroup: false, innerVoices: []
    };
    
    settings.contacts.unshift(newChar);
    settings.chatHistory[newChar.id] = [{ role: 'assistant', content: greeting, time: formatTime(new Date()) }];
    saveSettings(); renderChatList();
    document.getElementById('add-char-modal').classList.add('hidden');
    window.showToast('角色添加成功');
    
    document.getElementById('new-char-name').value = '';
    document.getElementById('new-char-persona').value = '';
    document.getElementById('new-char-greeting').value = '';
    tempNewCharAvatar = '';
  });

  document.getElementById('btn-save-new-group')?.addEventListener('click', () => {
    const name = document.getElementById('new-group-name').value.trim();
    if (!name) return window.showToast('群名称不能为空');
    const cbs = document.querySelectorAll('.group-member-cb:checked');
    const members = Array.from(cbs).map(cb => cb.value);
    if (members.length < 2) return window.showToast('至少选择2个成员');
    
    const newGroup = {
      ...defaultSettings.contacts[0],
      id: 'group_' + Date.now(),
      name: name, avatar: '', isGroup: true, members: members,
      lastMsg: '群聊创建成功', time: formatTime(new Date()), pinned: false, innerVoices: []
    };
    
    settings.contacts.unshift(newGroup);
    settings.chatHistory[newGroup.id] = [{ role: 'system', content: '群聊创建成功', time: formatTime(new Date()) }];
    saveSettings(); renderChatList();
    document.getElementById('add-group-modal').classList.add('hidden');
    window.showToast('群聊创建成功');
  });

  document.getElementById('inp-import-char')?.addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        const newChar = {
          ...defaultSettings.contacts[0],
          id: 'char_' + Date.now(),
          name: data.name || '未知角色',
          avatar: data.avatar || '',
          persona: data.persona || data.system_prompt || '',
          personality: data.personality || '',
          lastMsg: '你好！我是' + (data.name || '新角色'),
          time: formatTime(new Date()),
          pinned: false, innerVoices: []
        };
        settings.contacts.push(newChar);
        settings.chatHistory[newChar.id] = [{ role: 'assistant', content: newChar.lastMsg }];
        saveSettings(); renderChatList(); window.showToast('角色卡导入成功！');
      } catch(err) { window.showToast('JSON 格式错误！'); }
    };
    reader.readAsText(file);
  });

  const chatInput = document.getElementById('chat-input');
  const chatSendBtn = document.getElementById('chat-send-btn');
  const chatGenBtn = document.getElementById('chat-generate-btn');
  const chatRegenBtn = document.getElementById('chat-regen-btn');
  const chatMessages = document.getElementById('chat-messages');

  chatInput.addEventListener('input', function() {
    this.style.height = 'auto'; 
    this.style.height = (this.scrollHeight) + 'px'; 
  });

  function scrollToBottom() {
    if (!chatMessages) return;
    requestAnimationFrame(() => { 
      chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' }); 
      setTimeout(() => { chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' }); }, 150);
    });
    const images = chatMessages.querySelectorAll('img:not([data-loaded])');
    images.forEach(img => {
      img.addEventListener('load', () => {
        img.dataset.loaded = 'true';
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
      });
    });
  }

  chatInput.addEventListener('focus', () => { 
    setTimeout(() => { window.scrollTo(0, 0); scrollToBottom(); }, 300); 
  });
  chatInput.addEventListener('blur', () => { window.scrollTo(0, 0); });

  let currentQuoteText = '';

  function renderChatHistory() {
    chatMessages.innerHTML = '';
    const history = settings.chatHistory[currentChatId] || [];
    const c = settings.contacts.find(x => x.id === currentChatId);
    
    history.forEach((msg, idx) => { appendMsgToUI(msg.role, msg.content, idx, msg.time, c.timestamps !== false); });
    setTimeout(() => { chatMessages.scrollTop = chatMessages.scrollHeight; }, 10);
  }

  function appendMsgToUI(role, content, index = -1, timeStr = '', showTimestamp = true) {
    const row = document.createElement('div');
    row.dataset.index = index;
    
    const cbHtml = `<div class="msg-select-wrap"><input type="checkbox" class="ios-checkbox msg-cb" value="${index}"></div>`;

    if (role === 'system') {
      row.className = `msg-row system`;
      row.innerHTML = `${cbHtml}<div class="msg-system">${content}</div>`;
    } else {
      row.className = `msg-row ${role === 'user' ? 'right' : 'left'}`;
      const timeHtml = (showTimestamp && timeStr) ? `<div class="msg-timestamp">${timeStr}</div>` : '';
      
      let bubbleClass = 'msg-bubble';
      if (content.includes('voice-icon')) bubbleClass += ' voice';
      if (content.includes('<img')) bubbleClass += ' image-bubble'; 
      if (content.includes('transfer-card-new')) bubbleClass = 'transfer-bubble-wrapper'; 
      if (content.includes('fake-photo-icon')) bubbleClass += ' fake-photo-bubble';

      let displayContent = content;
      if (!content.includes('<svg') && !content.includes('<img') && !content.includes('transfer-card-new')) {
          if (window.marked) {
              displayContent = marked.parse(content);
          }
      }

      const c = settings.contacts.find(x => x.id === currentChatId);

      if (role === 'user') {
        let userAvatar = settings.user.avatar;
        if (c && c.myPersona) {
            const p = settings.personas.find(x => x.desc === c.myPersona || x.name === c.myPersona);
            if (p && p.avatar) userAvatar = p.avatar;
        }
        const bg = userAvatar ? `style="background-image:url('${userAvatar}')"` : '';
        
        row.innerHTML = `
          ${cbHtml}
          <div class="msg-bubble-wrapper">
            <div class="${bubbleClass} mine">${displayContent}</div>
            ${timeHtml}
          </div>
          <div class="avatar small mine" ${bg}></div>`;
      } else {
        const bg = c && c.avatar ? `style="background-image:url('${c.avatar}')"` : '';
        row.innerHTML = `
          ${cbHtml}
          <div class="avatar small" ${bg}></div>
          <div class="msg-bubble-wrapper">
            <div class="${bubbleClass}">${displayContent}</div>
            ${timeHtml}
          </div>`;
      }
    }
    chatMessages.appendChild(row);
  }

  function updateContactLastMsg(id, msg, time) {
    const cIdx = settings.contacts.findIndex(x => x.id === id);
    if (cIdx > -1) {
        const c = settings.contacts[cIdx];
        const cleanMsg = msg.replace(/<[^>]*>?/gm, '');
        const shortMsg = cleanMsg.substring(0, 15) + (cleanMsg.length > 15 ? '...' : '');
        c.lastMsg = shortMsg;
        c.time = time;
        settings.contacts.splice(cIdx, 1);
        settings.contacts.unshift(c);
    }
  }

  chatSendBtn.addEventListener('click', () => {
    let val = chatInput.value.trim(); if (!val) return;
    const time = formatTime(new Date());
    
    let finalContent = val;
    if (currentQuoteText) {
        finalContent = `<div class="quote-block">${currentQuoteText}</div>` + val;
    }

    const msgObj = { role: 'user', content: finalContent, time: time };
    
    if (!settings.chatHistory[currentChatId]) settings.chatHistory[currentChatId] = [];
    settings.chatHistory[currentChatId].push(msgObj);
    
    const c = settings.contacts.find(x => x.id === currentChatId);
    appendMsgToUI('user', finalContent, settings.chatHistory[currentChatId].length - 1, time, c.timestamps !== false);
    updateContactLastMsg(currentChatId, val, time);
    saveSettings(); 
    
    chatInput.value = '';
    chatInput.style.height = 'auto'; 
    clearQuote(); 
    scrollToBottom();
  });

  chatInput.addEventListener('keydown', (e) => { 
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); 
      chatSendBtn.click(); 
    } 
  });

  document.getElementById('inp-send-image').addEventListener('change', function(e) {
    fileToBase64Compressed(e.target.files[0], res => {
      const html = `<img src="${res}" alt="图片">`;
      const time = formatTime(new Date());
      const c = settings.contacts.find(x => x.id === currentChatId);
      appendMsgToUI('user', html, settings.chatHistory[currentChatId].length, time, c.timestamps !== false);
      settings.chatHistory[currentChatId].push({ role: 'user', content: html, time: time });
      updateContactLastMsg(currentChatId, '[图片]', time);
      saveSettings(); scrollToBottom();
    });
  });

  function showTypingIndicator(c) {
    const id = 'ai-typing-indicator';
    if(document.getElementById(id)) return;
    const row = document.createElement('div'); 
    row.className = `msg-row left`; row.id = id;
    const bg = c && c.avatar ? `style="background-image:url('${c.avatar}')"` : '';
    row.innerHTML = `<div class="avatar small" ${bg}></div><div class="msg-bubble-wrapper"><div class="msg-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div></div>`;
    chatMessages.appendChild(row); 
    scrollToBottom();
  }

  // ================== 🚨 AI 生成核心逻辑 ==================
  chatGenBtn.addEventListener('click', async () => {
    if (!settings.apiUrl || !settings.apiKey || !settings.apiModel) { window.showToast("请先配置 API！"); return; }
    const c = settings.contacts.find(x => x.id === currentChatId);
    
    const nameEl = document.getElementById('chat-target-name');
    const originalName = nameEl.textContent;
    nameEl.textContent = "对方正在输入...";
    nameEl.classList.add('typing');

    showTypingIndicator(c);

    try {
      const availableStickers = settings.stickers.map(s => s.group).join('、') || '无';

      let sysPrompt = `你扮演：${c.realName || c.name}
性别：${c.gender || '未知'}
性格：${c.personality || '未设置'}
核心人设：${c.persona || '未设置'}
用户扮演：${c.myPersona || '普通用户'}。

【世界观与背景设定】
${c.worldbook ? (settings.worldbooks?.find(w => w.id === c.worldbook)?.content || '无特殊背景') : '无特殊背景'}

【核心要求】
请杜绝任何带有强烈侵略性、动物化、过度戏剧化、陈词滥调式浪漫以及强制控制感的描写风格。我需要更自然、新颖或平实的叙述。

【char 语言与回复风格总则】
- 说话不带句号，多用空格和换行，自然停顿就好。
- 语气日常轻松，像和朋友或对象聊天，会接梗，会开玩笑。
- 只说正在想什么、在做什么，不写小说腔，不铺垫长比喻。
- 消息日常【1–10句】就行，信息量正常人水平，不用面面俱到。
- 可以单独回一个「？」或「。」表达疑惑、无语或结束话题。

【记忆与人设一致性】
- char 不会失忆，会记得之前的聊天和发生过的事。
- 玩梗与说话风格必须【贴合人设与当时情绪】。
  - 不会突然从温柔乖乖女变成满嘴恶臭的抽象男。
  - 不会从冷淡寡言突然变成嘴碎段子手（除非剧情中有合理转变过程）。
- 语言保持：直白、日常、口语化。不绕圈，不堆书面语。语句可以碎，但情绪要真，实话实说。
- 可以使用颜文字或者emoji，但是不会每一轮信息都用，要看语境。

【专属隐藏指令】（必须单独占一行，且不要带任何多余符号）：
- 想要给用户转账：[转账:金额,备注] (例如: [转账:52.0,去买杯奶茶])
- 想要发照片：[发送照片:照片画面描述]
- 想要发语音：[发送语音:时长秒数,语音文字内容]
- 想要发表情包：[发送表情:表情包的描述] (你目前拥有的表情包类型：${availableStickers}。请严格从这些类型中选择)
- 想要拍一拍用户：[拍一拍]
- 发现自己说错话想撤回：[撤回消息]
- 想要送给用户虚拟礼物：[送礼:礼物名称,emoji图标] (例如: [送礼:奶茶,🥤])
- 【重要】如果用户发了一张图片，并明确要求你“把它换成你的头像”，你必须回复指令：[更换头像]。`;

      if (c.timeAwareness) sysPrompt += `\n当前现实时间：${new Date().toLocaleString()}`;
      if (c.weatherAwareness) sysPrompt += `\n系统提示：当前天气感知已开启，请根据你的设定或语境合理推测天气。`;
      
      let pendingTransferIndex = -1; let pendingTransferAmt = 0;
      const history = settings.chatHistory[currentChatId] || [];
      
      for(let i = history.length - 1; i >= 0; i--) {
          if(history[i].role === 'user' && history[i].content.includes('data-status="pending"')) {
              pendingTransferIndex = i;
              const matchAmt = history[i].content.match(/data-amount="([^"]+)"/);
              if(matchAmt) pendingTransferAmt = matchAmt[1];
              break;
          }
      }

      if (pendingTransferIndex !== -1) {
          sysPrompt += `\n\n[系统重要提示] 用户刚刚向你发起了一笔转账（金额：${pendingTransferAmt}元）。请根据你的人设决定是否收下。如果收下，请在回复中单独写上 [确认收款]；如果拒绝，请写上 [退还转账]。必须且只能写其中一个。`;
      }
      
      let messages = [{ role: 'system', content: sysPrompt }];
      const recentHistory = history.slice(-(c.memoryLimit || 50));
      
      messages = messages.concat(recentHistory.map(m => {
          const imgMatch = m.content.match(/<img[^>]+src="([^">]+)"/);
          let textContent = m.content.replace(/<[^>]*>?/gm, '').trim();
          
          if (m.role === 'user' && m.content.includes('class="quote-block"')) {
              const quoteMatch = m.content.match(/<div class="quote-block">(.*?)<\/div>/);
              if (quoteMatch) {
                  textContent = `[回复了你的消息："${quoteMatch[1]}"] ` + textContent;
              }
          }
          
          if (imgMatch) {
              const base64Url = imgMatch[1];
              return {
                  role: m.role === 'system' ? 'user' : m.role,
                  content: [
                      { type: "text", text: textContent || "请看这张图片" },
                      { type: "image_url", image_url: { url: base64Url } }
                  ]
              };
          } else {
              return { 
                  role: m.role === 'system' ? 'user' : m.role, 
                  content: textContent || ' '
              };
          }
      }));

      const res = await fetch(`${settings.apiUrl}/chat/completions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
        body: JSON.stringify({ model: settings.apiModel, messages: messages, temperature: settings.apiTemp })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let aiText = data.choices[0].message.content;

      if (pendingTransferIndex !== -1) {
          let action = '';
          if (aiText.includes('[确认收款]')) { action = 'received'; aiText = aiText.replace(/\[确认收款\]/g, ''); }
          else if (aiText.includes('[退还转账]')) { action = 'refunded'; aiText = aiText.replace(/\[退还转账\]/g, ''); }
          if (action) {
              const oldContent = history[pendingTransferIndex].content;
              history[pendingTransferIndex].content = oldContent.replace('data-status="pending"', `data-status="${action}"`);
              const sysTime = formatTime(new Date());
              const sysText = action === 'received' ? `"${c.remark || c.name}" 已收款` : `"${c.remark || c.name}" 已退还了转账`;
              history.push({ role: 'system', content: sysText, time: sysTime });
              
              if (action === 'refunded') {
                  updateWallet(parseFloat(pendingTransferAmt), `收到 ${c.remark || c.name} 退还的转账`);
              }
              
              renderChatHistory(); saveSettings();
          }
      }

      if (aiText.includes('[更换头像]')) {
          aiText = aiText.replace(/\[更换头像\]/g, '');
          let lastImg = '';
          for(let i = history.length - 1; i >= 0; i--) {
              if(history[i].role === 'user' && history[i].content.includes('<img')) {
                  const match = history[i].content.match(/src="([^"]+)"/);
                  if(match) { lastImg = match[1]; break; }
              }
          }
          if(lastImg) {
              c.avatar = lastImg;
              document.getElementById('header-ai-avatar').style.backgroundImage = `url('${lastImg}')`;
              aiText += `\n||SPLIT||[SYSTEM_MSG] "${c.remark || c.name}" 更换了新头像\n`;
          }
      }

      if (aiText.includes('[拍一拍]')) {
          aiText = aiText.replace(/\[拍一拍\]/g, `\n||SPLIT||[SYSTEM_MSG] "${c.remark || c.name}" 拍了拍你\n`);
      }

      if (aiText.includes('[撤回消息]')) {
          aiText = aiText.replace(/\[撤回消息\]/g, `\n||SPLIT||[ACTION_RECALL]\n`);
      }

      aiText = aiText.replace(/\[送礼[：:]\s*(.*?)\s*[，,]\s*(.*?)\]/g, (match, giftName, giftIcon) => {
          let existGift = settings.gifts.find(g => g.name === giftName && g.senderId === c.id);
          if (existGift) { existGift.count += 1; } 
          else { settings.gifts.push({ id: 'g_' + Date.now(), name: giftName, icon: giftIcon, count: 1, senderId: c.id, senderName: c.remark || c.name }); }
          saveSettings(); renderProfilePage(); 
          return `\n||SPLIT||[SYSTEM_MSG] "${c.remark || c.name}" 送给你一份礼物：${giftIcon} ${giftName}\n`;
      });

      aiText = aiText.replace(/\[转账[：:]\s*(\d+(\.\d+)?)\s*[，,]\s*(.*?)\]/g, (match, amt, _, note) => {
          const tHtml = window.createTransferCardHTML(amt, note, 'pending', 'assistant', formatTime(new Date())).replace(/\n/g, '');
          return `\n||SPLIT||${tHtml}\n`;
      });

      aiText = aiText.replace(/\[发送照片[：:]\s*(.*?)\]/g, (match, desc) => {
          const pHtml = `<svg class="fake-photo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg><span>[照片] ${desc}</span>`;
          return `\n||SPLIT||${pHtml}\n`;
      });

      aiText = aiText.replace(/\[发送语音[：:]\s*(\d+)\s*[，,]\s*(.*?)\]/g, (match, duration, text) => {
          const vHtml = `<svg viewBox="0 0 24 24" class="voice-icon" fill="currentColor"><path d="M12 3v18m-4-14v10m8-10v10m-12-6v2m16-2v2"/></svg><span class="voice-duration">${duration}"</span><span class="voice-hidden-text" style="display:none;">${text}</span>`;
          return `\n||SPLIT||${vHtml}\n`;
      });

      aiText = aiText.replace(/\[发送表情[：:]\s*(.*?)\]/g, (match, desc) => {
          let targetSticker = settings.stickers.find(s => desc.includes(s.group) || s.group.includes(desc));
          if (!targetSticker && settings.stickers.length > 0) {
              targetSticker = settings.stickers[Math.floor(Math.random() * settings.stickers.length)];
          }
          if (targetSticker) return `\n||SPLIT||<img src="${targetSticker.url}" class="image-bubble" alt="表情包">\n`;
          else return `\n||SPLIT||[表情] ${desc}\n`;
      });

      aiText = aiText.replace(/\n+/g, '||SPLIT||');
      let slices = aiText.split('||SPLIT||').map(s => s.trim()).filter(s => s.length > 0);
      if (slices.length === 0) slices = ["..."];

      const processQueue = async () => {
          for (let i = 0; i < slices.length; i++) {
              let sliceText = slices[i];
              
              let typeTime = Math.min(2500, 600 + sliceText.length * 80);
              if (sliceText.includes('<svg') || sliceText.includes('[SYSTEM_MSG]')) typeTime = 800;
              
              await new Promise(resolve => setTimeout(resolve, typeTime));
              
              const oldTyping = document.getElementById('ai-typing-indicator');
              if(oldTyping) oldTyping.remove();

              const time = formatTime(new Date());

              if (sliceText === '[ACTION_RECALL]') {
                  let lastAiIdx = -1;
                  for(let j = history.length - 1; j >= 0; j--) {
                      if(history[j].role === 'assistant') { lastAiIdx = j; break; }
                  }
                  if(lastAiIdx !== -1) {
                      history[lastAiIdx] = { role: 'system', content: `"${c.remark || c.name}" 撤回了一条消息`, time: time };
                      renderChatHistory(); saveSettings();
                  }
              } 
              else if (sliceText.startsWith('[SYSTEM_MSG]')) {
                  const sysText = sliceText.replace('[SYSTEM_MSG]', '').trim();
                  appendMsgToUI('system', sysText, history.length, time, true);
                  history.push({ role: 'system', content: sysText, time: time });
              } 
              else {
                  appendMsgToUI('assistant', sliceText, history.length, time, c.timestamps !== false);
                  history.push({ role: 'assistant', content: sliceText, time: time });
                  
                  let shortPreview = sliceText;
                  if(sliceText.includes('transfer-card-new')) shortPreview = '[收到转账]';
                  if(sliceText.includes('fake-photo-icon')) shortPreview = '[图片]';
                  if(sliceText.includes('voice-icon')) shortPreview = '[语音]';
                  updateContactLastMsg(currentChatId, shortPreview, time);
              }
              
              saveSettings(); scrollToBottom();

              if (i < slices.length - 1) { showTypingIndicator(c); }
          }
          
          nameEl.textContent = originalName;
          nameEl.classList.remove('typing');
      };

      processQueue();
      
    } catch (err) {
      const oldTyping = document.getElementById('ai-typing-indicator');
      if(oldTyping) oldTyping.remove();
      appendMsgToUI('system', `[系统提示] AI 开小差了: ${err.message}`);
      scrollToBottom();
      nameEl.textContent = originalName;
      nameEl.classList.remove('typing');
    }
  });

  chatRegenBtn.addEventListener('click', () => {
    const history = settings.chatHistory[currentChatId];
    if (!history || history.length === 0) return;
    
    let lastUserIdx = -1;
    for(let i = history.length - 1; i >= 0; i--) {
        if(history[i].role === 'user') { lastUserIdx = i; break; }
    }
    
    if (lastUserIdx !== -1 && lastUserIdx < history.length - 1) {
        if(!confirm('确定要重新生成这一轮的消息吗？原有的 AI 回复将被删除。')) return;
        history.splice(lastUserIdx + 1);
        saveSettings(); 
        renderChatHistory();
        chatGenBtn.click(); 
    } else {
        window.showToast('没有可重新生成的对话');
    }
  });

  chatMessages.addEventListener('dblclick', (e) => {
    const c = settings.contacts.find(x => x.id === currentChatId);
    if (c.enablePoke === false) return; 

    const avatar = e.target.closest('.avatar');
    if (!avatar) return;
    
    avatar.classList.add('shake');
    setTimeout(() => avatar.classList.remove('shake'), 400);

    const remark = c.remark || c.name;
    const text = avatar.classList.contains('mine') ? `你拍了拍自己` : `你拍了拍"${remark}"`;
    const time = formatTime(new Date());
    
    settings.chatHistory[currentChatId].push({role: 'system', content: text, time: time});
    appendMsgToUI('system', text, settings.chatHistory[currentChatId].length - 1, time, true);
    saveSettings(); scrollToBottom();
  });

  let pressTimer; let longPressIndex = -1;
  const startPress = (e) => {
    const target = e.target.closest('.msg-bubble') || e.target.closest('.msg-system') || e.target.closest('.transfer-card-new'); 
    if (!target) return;
    const row = target.closest('.msg-row');
    longPressIndex = parseInt(row.dataset.index);
    
    pressTimer = setTimeout(() => {
      if (document.getElementById('chat-messages').classList.contains('multi-select-mode')) return;

      const menu = document.getElementById('msg-context-menu');
      menu.classList.remove('hidden');
      let touch = e.touches ? e.touches[0] : e;
      
      const menuWidth = 140; const menuHeight = 260;
      let left = touch.clientX; let top = touch.clientY;
      if (left + menuWidth > window.innerWidth) left = window.innerWidth - menuWidth - 10;
      if (top + menuHeight > window.innerHeight) top = window.innerHeight - menuHeight - 10;
      if (top < 20) top = 20;
      
      menu.style.left = left + 'px'; menu.style.top = top + 'px';
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };
  const cancelPress = () => clearTimeout(pressTimer);

  chatMessages.addEventListener('touchstart', startPress); chatMessages.addEventListener('touchend', cancelPress); chatMessages.addEventListener('touchmove', cancelPress);
  chatMessages.addEventListener('mousedown', startPress); chatMessages.addEventListener('mouseup', cancelPress); chatMessages.addEventListener('mousemove', cancelPress);
  chatMessages.addEventListener('contextmenu', e => { if (e.target.closest('.msg-bubble') || e.target.closest('.msg-system') || e.target.closest('.transfer-card-new')) e.preventDefault(); });

  // 🚨 修复：事件委托处理转账卡片点击、语音点击、多选
  chatMessages.addEventListener('click', (e) => {
      // 1. 多选模式
      if (chatMessages.classList.contains('multi-select-mode')) {
          const row = e.target.closest('.msg-row');
          if (row && e.target.tagName !== 'INPUT') {
              const cb = row.querySelector('.msg-cb');
              if(cb) cb.checked = !cb.checked;
          }
          return;
      } 
      
      // 2. 转账卡片双向交互
      const transferCard = e.target.closest('.transfer-card-new');
      if (transferCard) {
          const status = transferCard.dataset.status;
          const role = transferCard.dataset.role;
          const amt = transferCard.dataset.amount;
          const row = transferCard.closest('.msg-row');
          const idx = parseInt(row.dataset.index);

          // 只有当转账是 pending 状态，且是对方发给我的，我才能点击收款/退还
          if (status === 'pending' && role === 'assistant') {
              window.currentTransferIndex = idx;
              window.currentTransferAmt = parseFloat(amt);
              document.getElementById('recv-transfer-amt').textContent = amt;
              document.getElementById('receive-transfer-modal').classList.remove('hidden');
          }
          return;
      }

      // 3. 语音气泡点击展示文字与动画
      const voiceBubble = e.target.closest('.msg-bubble.voice');
      if (voiceBubble) {
          // 播放动画
          if (!voiceBubble.classList.contains('voice-playing')) {
              voiceBubble.classList.add('voice-playing');
              const durationSpan = voiceBubble.querySelector('.voice-duration');
              let duration = 3;
              if (durationSpan) duration = parseInt(durationSpan.textContent) || 3;
              setTimeout(() => {
                  voiceBubble.classList.remove('voice-playing');
              }, duration * 1000);
          }

          // 展开/收起文字
          const hiddenText = voiceBubble.querySelector('.voice-hidden-text');
          if (hiddenText) {
              const wrapper = voiceBubble.closest('.msg-bubble-wrapper');
              let transDiv = wrapper.querySelector('.voice-trans-text');
              if (!transDiv) {
                  transDiv = document.createElement('div');
                  transDiv.className = 'voice-trans-text';
                  transDiv.textContent = hiddenText.textContent;
                  const timestamp = wrapper.querySelector('.msg-timestamp');
                  if (timestamp) {
                      wrapper.insertBefore(transDiv, timestamp);
                  } else {
                      wrapper.appendChild(transDiv);
                  }
              } else {
                  transDiv.remove();
              }
          }
      }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#msg-context-menu') && !e.target.closest('.msg-bubble') && !e.target.closest('.msg-system') && !e.target.closest('.transfer-card-new')) {
      document.getElementById('msg-context-menu').classList.add('hidden');
    }
    if (!e.target.closest('#btn-chat-add') && !e.target.closest('#chat-add-menu')) {
      document.getElementById('chat-add-menu')?.classList.add('hidden');
    }
    if (!e.target.closest('.chat-tools-row') && !e.target.closest('.chat-sticker-panel') && !e.target.closest('.chat-extra-menu')) {
      document.getElementById('chat-sticker-panel').classList.add('hidden');
      document.getElementById('chat-extra-menu').classList.add('hidden');
    }
    if (e.target.classList.contains('modal-backdrop')) {
      if (e.target.id === 'char-details-modal') {
          e.target.classList.add('hidden');
      } else if (e.target.id === 'chat-settings-modal') {
          if (document.getElementById('char-details-modal').classList.contains('hidden')) {
              e.target.classList.add('hidden');
          }
      } else {
          e.target.classList.add('hidden');
      }
    }
  });

  function clearQuote() {
      currentQuoteText = '';
      document.getElementById('quote-preview-bar').classList.add('hidden');
  }
  document.getElementById('btn-close-quote').addEventListener('click', clearQuote);

  function enterMultiSelectMode() {
      document.getElementById('chat-messages').classList.add('multi-select-mode');
      document.getElementById('chat-input-bar').classList.add('hidden');
      document.getElementById('chat-multi-action-bar').classList.remove('hidden');
  }
  function exitMultiSelectMode() {
      document.getElementById('chat-messages').classList.remove('multi-select-mode');
      document.getElementById('chat-input-bar').classList.remove('hidden');
      document.getElementById('chat-multi-action-bar').classList.add('hidden');
      document.querySelectorAll('.msg-cb').forEach(cb => cb.checked = false);
  }
  document.getElementById('btn-multi-cancel').addEventListener('click', exitMultiSelectMode);

  document.getElementById('btn-multi-delete').addEventListener('click', () => {
      const checked = Array.from(document.querySelectorAll('.msg-cb:checked')).map(cb => parseInt(cb.value)).sort((a,b) => b-a);
      if(checked.length === 0) return window.showToast('未选择任何消息');
      if(confirm(`确定删除选中的 ${checked.length} 条消息吗？`)) {
          const history = settings.chatHistory[currentChatId];
          checked.forEach(idx => history.splice(idx, 1));
          saveSettings(); renderChatHistory(); exitMultiSelectMode(); window.showToast('已删除');
      }
  });

  document.getElementById('btn-multi-forward').addEventListener('click', () => {
      const checked = Array.from(document.querySelectorAll('.msg-cb:checked')).map(cb => parseInt(cb.value));
      if(checked.length === 0) return window.showToast('未选择任何消息');
      
      const listEl = document.getElementById('forward-contact-list');
      listEl.innerHTML = '';
      settings.contacts.forEach(c => {
          if (c.id === currentChatId) return; 
          const div = document.createElement('div');
          div.style.cssText = 'padding: 12px; border-bottom: 1px solid #eee; display:flex; align-items:center; gap:10px; cursor:pointer;';
          const bg = c.avatar ? `style="background-image:url('${c.avatar}')"` : '';
          div.innerHTML = `<div class="avatar small" ${bg}></div><div style="font-weight:600; color:#333;">${c.remark || c.name}</div>`;
          
          div.onclick = () => {
              const history = settings.chatHistory[currentChatId];
              const sourceChar = settings.contacts.find(x => x.id === currentChatId);
              
              let forwardText = `[合并转发的聊天记录]\n`;
              checked.forEach(idx => {
                  const msg = history[idx];
                  const sender = msg.role === 'user' ? '我' : (sourceChar.remark || sourceChar.name);
                  let content = msg.content;
                  if (content.includes('<img')) content = '[图片]';
                  else content = content.replace(/<[^>]*>?/gm, ''); 
                  forwardText += `${sender}: ${content}\n`;
              });

              if (!settings.chatHistory[c.id]) settings.chatHistory[c.id] = [];
              settings.chatHistory[c.id].push({ role: 'system', content: forwardText, time: formatTime(new Date()) });
              saveSettings();
              document.getElementById('forward-modal').classList.add('hidden');
              exitMultiSelectMode();
              window.showToast('已转发');
          };
          listEl.appendChild(div);
      });
      document.getElementById('forward-modal').classList.remove('hidden');
  });

  window.msgAction = function(action) {
    document.getElementById('msg-context-menu').classList.add('hidden');
    if (longPressIndex < 0 || isNaN(longPressIndex)) return;
    const history = settings.chatHistory[currentChatId];
    const msgObj = history[longPressIndex];
    
    if (action === 'copy') {
      navigator.clipboard.writeText(msgObj.content.replace(/<[^>]*>?/gm, '')); window.showToast('已复制到剪贴板');
    } else if (action === 'delete') {
      if(confirm('确定要删除这条消息吗？')) {
        history.splice(longPressIndex, 1); saveSettings(); renderChatHistory(); window.showToast('已删除');
      }
    } else if (action === 'rewind') {
      if(confirm('确定要回溯到此处吗？这会删除此消息之后的所有对话！')) {
        history.splice(longPressIndex + 1); saveSettings(); renderChatHistory(); window.showToast('已回溯');
      }
    } else if (action === 'recall') {
      const isMine = msgObj.role === 'user';
      const c = settings.contacts.find(x => x.id === currentChatId);
      const text = isMine ? '你撤回了一条消息' : `"${c.remark || c.name}" 撤回了一条消息`;
      
      msgObj.role = 'system';
      msgObj.content = text;
      saveSettings(); renderChatHistory(); window.showToast('已撤回');
    } else if (action === 'favorite') {
      const c = settings.contacts.find(x => x.id === currentChatId);
      const fromWho = msgObj.role === 'user' ? '我' : (c.remark || c.name);
      settings.favorites.push({
          content: msgObj.content,
          from: fromWho,
          time: formatTime(new Date())
      });
      saveSettings(); renderProfilePage(); window.showToast('已加入收藏');
    } else if (action === 'reply') {
      let rawText = msgObj.content;
      if (rawText.includes('<img')) rawText = '[图片]';
      else rawText = rawText.replace(/<[^>]*>?/gm, ''); 
      
      currentQuoteText = rawText;
      document.getElementById('quote-preview-text').textContent = rawText;
      document.getElementById('quote-preview-bar').classList.remove('hidden');
      chatInput.focus();
    } else if (action === 'select') {
      enterMultiSelectMode();
      setTimeout(() => {
          const row = document.querySelector(`.msg-row[data-index="${longPressIndex}"]`);
          if(row) row.querySelector('.msg-cb').checked = true;
      }, 100);
    } else {
      window.showToast('该功能开发中...');
    }
  };

  // ================== ⚙️ 聊天设置与详情重构逻辑 ==================
  window.tempCsProfileBg = null; 
  window.tempCsChatBg = null;

  document.getElementById('btn-chat-settings').addEventListener('click', () => {
    const c = settings.contacts.find(x => x.id === currentChatId);
    
    document.getElementById('cs-profile-bg').style.backgroundImage = c.profileBg ? `url('${c.profileBg}')` : 'none';
    document.getElementById('cs-avatar-back').style.backgroundImage = c.avatar ? `url('${c.avatar}')` : 'none';
    document.getElementById('cs-avatar-front').style.backgroundImage = c.avatar ? `url('${c.avatar}')` : 'none';
    document.getElementById('cs-disp-name').textContent = c.remark || c.realName || c.name;
    document.getElementById('cs-disp-id').textContent = `ID: ${c.id.replace('char_', 'user_')}`;
    document.getElementById('cs-disp-bio').textContent = c.signature || '暂无介绍';

    document.getElementById('cs-memory-limit').value = c.memoryLimit || 50;
    document.getElementById('cs-global-memory').checked = c.globalMemory || false;
    document.getElementById('cs-share-memory').checked = c.shareMemory || false;
    document.getElementById('cs-auto-summary').checked = c.autoSummary || false;
    document.getElementById('cs-summary-interval').value = c.summaryInterval || 30;

    document.getElementById('cs-time-aware').checked = c.timeAwareness || false;
    document.getElementById('cs-weather-aware').checked = c.weatherAwareness || false;

    document.getElementById('cs-show-avatar').checked = c.showAvatar !== false;
    document.getElementById('cs-avatar-shape').value = c.avatarShape || 'circle';
    document.getElementById('cs-avatar-size').value = c.avatarSize || 32;
    document.getElementById('cs-bubble-css').value = c.bubbleCss || '';
    document.getElementById('cs-global-css').value = c.globalCss || '';
    document.getElementById('cs-ui-color').value = c.uiColor || '#4b4548';

    document.getElementById('cs-show-timestamp').checked = c.timestamps !== false;
    document.getElementById('cs-enable-poke').checked = c.enablePoke !== false;
    document.getElementById('cs-proactive-msg').checked = c.proactive || false;
    document.getElementById('cs-proactive-call').checked = c.proactiveCall || false;

    document.getElementById('chat-settings-modal').classList.remove('hidden');
  });

  window.showCharDetailsModal = function() {
    const c = settings.contacts.find(x => x.id === currentChatId);
    document.getElementById('cd-avatar-preview').style.backgroundImage = c.avatar ? `url('${c.avatar}')` : 'none';
    document.getElementById('cd-remark').value = c.remark || '';
    document.getElementById('cd-realname').value = c.realName || c.name || '';
    document.getElementById('cd-gender').value = c.gender || '';
    document.getElementById('cd-personality').value = c.personality || '';
    document.getElementById('cd-persona').value = c.persona || '';
    
    const wbSelect = document.getElementById('cd-worldbook');
    wbSelect.innerHTML = '<option value="">未关联</option>';
    if(settings.worldbooks) {
        settings.worldbooks.forEach(w => {
            const opt = document.createElement('option');
            opt.value = w.id; opt.textContent = w.title;
            if(c.worldbook === w.id) opt.selected = true;
            wbSelect.appendChild(opt);
        });
    }

    const mypSelect = document.getElementById('cd-mypersona');
    mypSelect.innerHTML = '<option value="">默认身份</option>';
    settings.personas.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.desc; opt.textContent = p.name;
        if (c.myPersona === p.desc || c.myPersona === p.name) opt.selected = true;
        mypSelect.appendChild(opt);
    });

    document.getElementById('char-details-modal').classList.remove('hidden');
  };

  let tempCdAvatar = null;
  document.getElementById('cd-avatar-upload').addEventListener('change', e => fileToBase64Compressed(e.target.files[0], res => {
      tempCdAvatar = res;
      document.getElementById('cd-avatar-preview').style.backgroundImage = `url('${res}')`;
  }));

  document.getElementById('cd-save').addEventListener('click', () => {
      const c = settings.contacts.find(x => x.id === currentChatId);
      if(tempCdAvatar) c.avatar = tempCdAvatar;
      c.remark = document.getElementById('cd-remark').value;
      c.realName = document.getElementById('cd-realname').value;
      c.gender = document.getElementById('cd-gender').value;
      c.personality = document.getElementById('cd-personality').value;
      c.persona = document.getElementById('cd-persona').value;
      c.worldbook = document.getElementById('cd-worldbook').value;
      c.myPersona = document.getElementById('cd-mypersona').value;

      saveSettings();
      document.getElementById('char-details-modal').classList.add('hidden');
      
      document.getElementById('cs-avatar-back').style.backgroundImage = c.avatar ? `url('${c.avatar}')` : 'none';
      document.getElementById('cs-avatar-front').style.backgroundImage = c.avatar ? `url('${c.avatar}')` : 'none';
      document.getElementById('cs-disp-name').textContent = c.remark || c.realName || c.name;
      
      window.showToast('人物设定已保存');
      tempCdAvatar = null;
  });

  document.getElementById('cs-bg-upload').addEventListener('change', e => fileToBase64Compressed(e.target.files[0], res => {
      window.tempCsProfileBg = res;
      document.getElementById('cs-profile-bg').style.backgroundImage = `url('${res}')`;
  }));
  document.getElementById('cs-chat-bg').addEventListener('change', e => fileToBase64Compressed(e.target.files[0], res => {
      window.tempCsChatBg = res;
      window.showToast('聊天背景已选择，请点击保存');
  }));

  document.getElementById('cs-cancel').addEventListener('click', () => document.getElementById('chat-settings-modal').classList.add('hidden'));
  document.getElementById('cs-save').addEventListener('click', () => {
    const c = settings.contacts.find(x => x.id === currentChatId);
    
    if (window.tempCsProfileBg) c.profileBg = window.tempCsProfileBg;
    if (window.tempCsChatBg === 'clear') c.chatBg = ''; else if (window.tempCsChatBg) c.chatBg = window.tempCsChatBg;

    c.signature = document.getElementById('cs-disp-bio').textContent;

    c.memoryLimit = parseInt(document.getElementById('cs-memory-limit').value);
    c.globalMemory = document.getElementById('cs-global-memory').checked;
    c.shareMemory = document.getElementById('cs-share-memory').checked;
    c.autoSummary = document.getElementById('cs-auto-summary').checked;
    c.summaryInterval = parseInt(document.getElementById('cs-summary-interval').value);

    c.timeAwareness = document.getElementById('cs-time-aware').checked;
    c.weatherAwareness = document.getElementById('cs-weather-aware').checked;

    c.showAvatar = document.getElementById('cs-show-avatar').checked;
    c.avatarShape = document.getElementById('cs-avatar-shape').value;
    c.avatarSize = parseInt(document.getElementById('cs-avatar-size').value);
    c.bubbleCss = document.getElementById('cs-bubble-css').value;
    c.globalCss = document.getElementById('cs-global-css').value;
    c.uiColor = document.getElementById('cs-ui-color').value;

    c.timestamps = document.getElementById('cs-show-timestamp').checked;
    c.enablePoke = document.getElementById('cs-enable-poke').checked;
    c.proactive = document.getElementById('cs-proactive-msg').checked;
    c.proactiveCall = document.getElementById('cs-proactive-call').checked;

    if(saveSettings()) {
      document.getElementById('chat-settings-modal').classList.add('hidden');
      openChatRoom(currentChatId); 
      renderChatList(); 
      window.showToast('聊天设置已保存');
      window.tempCsProfileBg = null; window.tempCsChatBg = null;
    }
  });

  window.clearSpecificChat = function(includeMemory) {
      const msg = includeMemory ? '确定清空聊天记录和所有记忆/心声吗？此操作不可逆！' : '确定仅清空聊天记录吗？';
      if(confirm(msg)) {
          settings.chatHistory[currentChatId] = [];
          if(includeMemory) {
              const c = settings.contacts.find(x => x.id === currentChatId);
              c.innerVoices = [];
          }
          saveSettings(); renderChatHistory();
          document.getElementById('chat-settings-modal').classList.add('hidden');
          window.showToast('已清空');
      }
  };

  window.deleteCurrentContact = function() {
      if(confirm('确定永久删除该联系人及所有数据吗？')) {
          settings.contacts = settings.contacts.filter(x => x.id !== currentChatId);
          delete settings.chatHistory[currentChatId];
          saveSettings(); 
          document.getElementById('chat-settings-modal').classList.add('hidden');
          document.querySelector('[data-back="chat"]').click(); 
          renderChatList();
          window.showToast('联系人已删除');
      }
  };

  document.getElementById('btn-export-chat-json').addEventListener('click', () => {
      const c = settings.contacts.find(x => x.id === currentChatId);
      const history = settings.chatHistory[currentChatId] || [];
      const exportData = { contact: c, history: history };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const a = document.createElement('a'); a.href = dataStr; a.download = `${c.name}_chat_backup.json`;
      document.body.appendChild(a); a.click(); a.remove(); window.showToast('导出成功！');
  });

  document.getElementById('inp-import-chat').addEventListener('change', (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const data = JSON.parse(event.target.result);
              if(data.history) {
                  settings.chatHistory[currentChatId] = data.history;
                  if(data.contact) {
                      const idx = settings.contacts.findIndex(x => x.id === currentChatId);
                      settings.contacts[idx] = { ...settings.contacts[idx], ...data.contact, id: currentChatId }; 
                  }
                  saveSettings(); renderChatHistory();
                  document.getElementById('chat-settings-modal').classList.add('hidden');
                  window.showToast('记录导入成功！');
              } else {
                  window.showToast('JSON 格式不包含 history 字段');
              }
          } catch(err) { window.showToast('JSON 格式错误！'); }
      };
      reader.readAsText(file);
  });

  // ================== 🚨 修复补充：缺失的弹窗和面板切换逻辑 ==================

  window.showMusicModal = function() {
    document.getElementById('inp-music-title').value = settings.music.title || '';
    document.getElementById('inp-music-artist').value = settings.music.artist || '';
    document.getElementById('inp-music-url').value = settings.music.audio && settings.music.audio.startsWith('http') ? settings.music.audio : '';
    document.getElementById('music-modal').classList.remove('hidden');
  };

  let tempMusicCover = '';
  let tempMusicAudio = '';
  document.getElementById('inp-music-cover')?.addEventListener('change', e => {
    fileToBase64Compressed(e.target.files[0], res => tempMusicCover = res);
  });
  document.getElementById('inp-music-file')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => tempMusicAudio = event.target.result;
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('btn-save-music')?.addEventListener('click', () => {
    settings.music.title = document.getElementById('inp-music-title').value || '未知歌曲';
    settings.music.artist = document.getElementById('inp-music-artist').value || '未知歌手';
    const url = document.getElementById('inp-music-url').value.trim();
    
    if (tempMusicCover) settings.music.cover = tempMusicCover;
    if (url) {
        settings.music.audio = url;
    } else if (tempMusicAudio) {
        settings.music.audio = tempMusicAudio;
    }
    
    saveSettings();
    applySettings(); 
    document.getElementById('music-modal').classList.add('hidden');
    window.showToast('音乐设置已保存');
  });

  window.toggleMusicPlay = function() {
    const audio = document.getElementById('sys-audio-player');
    const btn = document.getElementById('btn-play-pause');
    const disc = document.getElementById('music-cover-disp');
    if (!audio.src || audio.src === window.location.href) {
      window.showToast('请先长按或点击设置音乐文件');
      return;
    }
    if (audio.paused) {
      audio.play();
      btn.classList.add('playing');
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
      disc.classList.add('playing');
    } else {
      audio.pause();
      btn.classList.remove('playing');
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
      disc.classList.remove('playing');
    }
  };

  window.showAnniModal = function() {
    document.getElementById('inp-anni-title').value = settings.widgetAnni.title || '';
    document.getElementById('inp-anni-date').value = settings.widgetAnni.date || '';
    document.getElementById('anni-modal').classList.remove('hidden');
  };

  document.getElementById('btn-save-anni')?.addEventListener('click', () => {
    settings.widgetAnni.title = document.getElementById('inp-anni-title').value || '纪念日';
    settings.widgetAnni.date = document.getElementById('inp-anni-date').value;
    saveSettings();
    applySettings();
    document.getElementById('anni-modal').classList.add('hidden');
    window.showToast('纪念日已保存');
  });

  window.toggleStickerPanel = function() {
    const panel = document.getElementById('chat-sticker-panel');
    const extra = document.getElementById('chat-extra-menu');
    if (!panel.classList.contains('hidden')) {
      panel.classList.add('hidden');
    } else {
      extra.classList.add('hidden');
      renderStickerPanel(); 
      panel.classList.remove('hidden');
    }
  };

  window.toggleExtraMenu = function() {
    const panel = document.getElementById('chat-sticker-panel');
    const extra = document.getElementById('chat-extra-menu');
    if (!extra.classList.contains('hidden')) {
      extra.classList.add('hidden');
    } else {
      panel.classList.add('hidden');
      extra.classList.remove('hidden');
    }
  };

  window.showStickerManagerModal = function() {
    document.getElementById('chat-sticker-panel').classList.add('hidden');
    renderStickerManagerList();
    document.getElementById('sticker-manager-modal').classList.remove('hidden');
  };

  document.getElementById('btn-add-sticker')?.addEventListener('click', () => {
    const url = document.getElementById('inp-sticker-url').value.trim();
    const group = document.getElementById('inp-sticker-group').value.trim() || '默认';
    if (!url) return window.showToast('请输入图片URL');
    settings.stickers.push({ group, url });
    saveSettings();
    document.getElementById('inp-sticker-url').value = '';
    renderStickerManagerList();
    window.showToast('表情包已添加');
  });

  function renderStickerManagerList() {
    const list = document.getElementById('sticker-manager-list');
    list.innerHTML = '';
    settings.stickers.forEach((s, idx) => {
      const img = document.createElement('img');
      img.src = s.url;
      img.style.cssText = 'width: 50px; height: 50px; object-fit: contain; background: #eee; border-radius: 8px; cursor: pointer;';
      img.title = `点击删除 [${s.group}]`;
      img.onclick = () => {
        if(confirm(`确定删除该表情包吗？`)) {
          settings.stickers.splice(idx, 1);
          saveSettings();
          renderStickerManagerList();
        }
      };
      list.appendChild(img);
    });
  }

  function renderStickerPanel() {
    const tabs = document.getElementById('sticker-tabs');
    const list = document.getElementById('sticker-list');
    tabs.innerHTML = ''; list.innerHTML = '';
    
    const groups = [...new Set(settings.stickers.map(s => s.group))];
    if (groups.length === 0) {
      list.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#999;font-size:12px;padding:20px;">暂无表情包，请点击下方管理添加</div>';
      return;
    }
    
    let activeGroup = groups[0];
    
    const renderList = (groupName) => {
      list.innerHTML = '';
      settings.stickers.filter(s => s.group === groupName).forEach(s => {
        const div = document.createElement('div');
        div.className = 'sticker-item';
        div.style.backgroundImage = `url('${s.url}')`;
        div.onclick = () => {
          const time = formatTime(new Date());
          const html = `<img src="${s.url}" class="image-bubble" alt="表情包">`;
          const c = settings.contacts.find(x => x.id === currentChatId);
          appendMsgToUI('user', html, settings.chatHistory[currentChatId].length, time, c.timestamps !== false);
          settings.chatHistory[currentChatId].push({ role: 'user', content: html, time: time });
          updateContactLastMsg(currentChatId, '[表情包]', time);
          saveSettings();
          scrollToBottom();
          document.getElementById('chat-sticker-panel').classList.add('hidden');
        };
        list.appendChild(div);
      });
    };

    groups.forEach(g => {
      const btn = document.createElement('button');
      btn.className = `sticker-tab ${g === activeGroup ? 'active' : ''}`;
      btn.textContent = g;
      btn.onclick = () => {
        document.querySelectorAll('.sticker-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderList(g);
      };
      tabs.appendChild(btn);
    });
    renderList(activeGroup);
  }

  window.showFakeVoiceModal = function() {
    document.getElementById('chat-extra-menu').classList.add('hidden');
    document.getElementById('inp-fake-voice').value = '';
    document.getElementById('fake-voice-modal').classList.remove('hidden');
  };

  document.getElementById('btn-send-fake-voice')?.addEventListener('click', () => {
    const text = document.getElementById('inp-fake-voice').value.trim() || '语音消息';
    const duration = document.getElementById('inp-voice-duration').value || 3;
    const vHtml = `<svg viewBox="0 0 24 24" class="voice-icon" fill="currentColor"><path d="M12 3v18m-4-14v10m8-10v10m-12-6v2m16-2v2"/></svg><span class="voice-duration">${duration}"</span><span class="voice-hidden-text" style="display:none;">${text}</span>`;
    const time = formatTime(new Date());
    const c = settings.contacts.find(x => x.id === currentChatId);
    appendMsgToUI('user', vHtml, settings.chatHistory[currentChatId].length, time, c.timestamps !== false);
    
    settings.chatHistory[currentChatId].push({ role: 'user', content: vHtml, time: time });
    updateContactLastMsg(currentChatId, '[语音]', time);
    saveSettings(); scrollToBottom();
    document.getElementById('fake-voice-modal').classList.add('hidden');
  });

  window.showFakePhotoModal = function() {
    document.getElementById('chat-extra-menu').classList.add('hidden');
    document.getElementById('inp-fake-photo').value = '';
    document.getElementById('fake-photo-modal').classList.remove('hidden');
  };

  document.getElementById('btn-send-fake-photo')?.addEventListener('click', () => {
    const desc = document.getElementById('inp-fake-photo').value.trim() || '一张照片';
    const pHtml = `<svg class="fake-photo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg><span>[照片] ${desc}</span>`;
    const time = formatTime(new Date());
    const c = settings.contacts.find(x => x.id === currentChatId);
    appendMsgToUI('user', pHtml, settings.chatHistory[currentChatId].length, time, c.timestamps !== false);
    settings.chatHistory[currentChatId].push({ role: 'user', content: pHtml, time: time });
    
    updateContactLastMsg(currentChatId, '[图片]', time);
    saveSettings(); scrollToBottom();
    document.getElementById('fake-photo-modal').classList.add('hidden');
  });

  window.showTransferModal = function() {
    document.getElementById('chat-extra-menu').classList.add('hidden');
    document.getElementById('inp-transfer-amount').value = '';
    document.getElementById('inp-transfer-note').value = '转账给你';
    document.getElementById('transfer-modal').classList.remove('hidden');
  };

  window.createTransferCardHTML = function(amount, note, status = 'pending', role = 'user', time = '') {
    let statusText = '请收款';
    let opacity = '1';
    if (status === 'received') { statusText = '已收款'; opacity = '0.7'; }
    if (status === 'refunded') { statusText = '已退还'; opacity = '0.7'; }
    return `<div class="transfer-card-new" data-status="${status}" data-amount="${amount}" data-role="${role}" style="opacity: ${opacity};"><div class="transfer-card-top"><div class="transfer-icon-area"><div class="transfer-icon-circle">¥</div></div><div class="transfer-content"><div class="transfer-amount">¥${amount}</div><div class="transfer-note">${note}</div></div></div><div class="transfer-time">${statusText}</div></div>`;
  };

  document.getElementById('btn-send-transfer')?.addEventListener('click', () => {
    const amt = document.getElementById('inp-transfer-amount').value;
    const note = document.getElementById('inp-transfer-note').value || '转账给你';
    if (!amt || isNaN(amt) || parseFloat(amt) <= 0) return window.showToast('请输入有效金额');
    
    const currentWallet = parseFloat(settings.wallet.val.replace(/[^\d.-]/g, '')) || 0;
    if (currentWallet < parseFloat(amt)) return window.showToast('钱包余额不足！请先去"我"的页面充值');

    updateWallet(-parseFloat(amt), `转账给 ${document.getElementById('chat-target-name').textContent}`);

    const tHtml = window.createTransferCardHTML(amt, note, 'pending', 'user', formatTime(new Date()));
    const time = formatTime(new Date());
    const c = settings.contacts.find(x => x.id === currentChatId);
    
    appendMsgToUI('user', tHtml, settings.chatHistory[currentChatId].length, time, c.timestamps !== false);
    settings.chatHistory[currentChatId].push({ role: 'user', content: tHtml, time: time });
    
    updateContactLastMsg(currentChatId, '[转账]', time);
    saveSettings(); scrollToBottom();
    document.getElementById('transfer-modal').classList.add('hidden');
  });

  // 🚨 接收 AI 转账逻辑
  window.currentTransferIndex = -1;
  window.currentTransferAmt = 0;

  document.getElementById('btn-confirm-transfer')?.addEventListener('click', () => processUserTransferAction('received'));
  document.getElementById('btn-refund-transfer')?.addEventListener('click', () => processUserTransferAction('refunded'));

  function processUserTransferAction(action) {
      const idx = window.currentTransferIndex;
      if (idx < 0) return;
      const history = settings.chatHistory[currentChatId];
      const c = settings.contacts.find(x => x.id === currentChatId);
      
      let oldContent = history[idx].content;
      oldContent = oldContent.replace('data-status="pending"', `data-status="${action}"`);
      history[idx].content = oldContent;

      if (action === 'received') {
          updateWallet(window.currentTransferAmt, `收到 ${c.remark || c.name} 的转账`);
      }

      const sysText = action === 'received' ? `你已收款` : `你退还了转账`;
      history.push({ role: 'system', content: sysText, time: formatTime(new Date()) });
      
      saveSettings();
      renderChatHistory();
      document.getElementById('receive-transfer-modal').classList.add('hidden');
  }

  // 🚨 心声多选逻辑
  let isIvMultiSelect = false;
  document.getElementById('iv-multi-select-btn')?.addEventListener('click', function() {
      isIvMultiSelect = !isIvMultiSelect;
      this.textContent = isIvMultiSelect ? '取消' : '多选';
      window.renderInnerVoiceList();
  });

  document.getElementById('iv-select-all')?.addEventListener('change', (e) => {
      document.querySelectorAll('.iv-cb').forEach(cb => cb.checked = e.target.checked);
  });

  document.getElementById('iv-delete-selected')?.addEventListener('click', () => {
      const checked = Array.from(document.querySelectorAll('.iv-cb:checked')).map(cb => parseInt(cb.value)).sort((a,b) => b-a);
      if(checked.length === 0) return window.showToast('未选择任何项');
      if(confirm(`确定删除选中的 ${checked.length} 条心声吗？`)) {
          const c = settings.contacts.find(x => x.id === currentChatId);
          checked.forEach(origIdx => c.innerVoices.splice(origIdx, 1));
          saveSettings(); window.renderInnerVoiceList(); window.showToast('已删除');
      }
  });

  window.renderInnerVoiceList = function() {
    const list = document.getElementById('iv-list');
    list.innerHTML = '';
    document.getElementById('iv-multi-action-bar').classList.toggle('hidden', !isIvMultiSelect);
    
    const c = settings.contacts.find(x => x.id === currentChatId);
    if (!c.innerVoices || c.innerVoices.length === 0) {
      list.innerHTML = '<div style="text-align:center; color:#999; padding: 40px 0;">暂无心声记录，点击右上角生成</div>';
      return;
    }
    
    [...c.innerVoices].reverse().forEach((iv, reverseIdx) => {
      const origIdx = c.innerVoices.length - 1 - reverseIdx;
      const card = document.createElement('div');
      card.className = 'iv-card';
      
      let cbHtml = isIvMultiSelect ? `<div class="iv-checkbox-wrap"><input type="checkbox" class="ios-checkbox iv-cb" value="${origIdx}"></div>` : '';
      
      card.innerHTML = `
        ${cbHtml}
        <div class="iv-card-header">
          <span class="iv-time">${iv.time}</span>
          <span class="iv-mood">${iv.mood || '平静'}</span>
        </div>
        <div class="iv-section">
          <span class="iv-label">当前的动作</span>
          <span class="iv-text">${iv.fact}</span>
        </div>
        <div class="iv-section">
          <span class="iv-label">内心独白</span>
          <span class="iv-text">"${iv.thought}"</span>
        </div>
      `;
      
      if (isIvMultiSelect) {
          card.onclick = (e) => {
              if (e.target.tagName !== 'INPUT') {
                  const cb = card.querySelector('.iv-cb');
                  if (cb) cb.checked = !cb.checked;
              }
          };
      }
      list.appendChild(card);
    });
  };

  document.getElementById('btn-inner-voice')?.addEventListener('click', () => {
    isIvMultiSelect = false;
    const btn = document.getElementById('iv-multi-select-btn');
    if(btn) btn.textContent = '多选';
    window.renderInnerVoiceList();
    document.getElementById('inner-voice-modal').classList.remove('hidden');
  });

  document.getElementById('iv-close')?.addEventListener('click', () => {
    document.getElementById('inner-voice-modal').classList.add('hidden');
  });

  document.getElementById('iv-regen')?.addEventListener('click', async () => {
    if (!settings.apiUrl || !settings.apiKey || !settings.apiModel) return window.showToast("请先配置 API！");
    const c = settings.contacts.find(x => x.id === currentChatId);
    const history = settings.chatHistory[currentChatId] || [];
    if (history.length === 0) return window.showToast("暂无聊天记录可生成心声");

    const btn = document.getElementById('iv-regen');
    btn.textContent = '感知中...'; btn.style.opacity = '0.7';

    try {
      const recentHistory = history.slice(-10).map(m => `${m.role === 'user' ? '用户' : c.name}: ${m.content.replace(/<[^>]*>?/gm, '')}`).join('\n');
      
      const prompt = `你现在是${c.name}。根据以下最近的聊天记录，推测你此时此刻的内心活动。
请严格返回 JSON 格式数据，不要有任何其他多余文本：
{
  "mood": "当前的情绪状态（如：吃醋、开心、失落，2-4个字）",
  "fact": "用第三人称描写你此时此刻正在做的一个小动作或微表情（如：不自觉地咬了咬下唇，手指在屏幕上无意识地划动）",
  "thought": "用第一人称写下你此时最真实的内心独白（如：可恶，他居然真的拒绝了，好气哦！）"
}

聊天记录：
${recentHistory}`;

      const res = await fetch(`${settings.apiUrl}/chat/completions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
        body: JSON.stringify({ 
            model: settings.apiModel, 
            messages: [{role: 'user', content: prompt}], 
            temperature: 0.8,
            response_format: { type: "json_object" }
        })
      });
      
      const data = await res.json();
      const result = JSON.parse(data.choices[0].message.content);
      
      if (!c.innerVoices) c.innerVoices = [];
      c.innerVoices.push({
        time: formatTime(new Date()) + ' ' + new Date().toLocaleDateString(),
        mood: result.mood, fact: result.fact, thought: result.thought
      });
      
      saveSettings();
      window.renderInnerVoiceList();
      window.showToast('心声已记录');
    } catch (err) {
      window.showToast('生成心声失败，请检查API或稍后再试');
      console.error(err);
    } finally {
      btn.textContent = '生成心声'; btn.style.opacity = '1';
    }
  });

  console.log('✅ 系统初始化完成！');
});
