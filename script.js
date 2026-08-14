// ====================\n// 全局变量和初始化\n// ====================\n
const STORAGE_KEY = 'werewolf_records';
const ROLE_CFG_KEY = 'werewolf_role_config';
const BEHAVIOR_LIB_KEY = 'werewolf_behavior_lib';
const GAME_SESSION_KEY = 'werewolf_game_session';

let records = [];
let roleConfig = {};
let behaviorLib = [];
let gameSession = null;

document.addEventListener('DOMContentLoaded', () => {
  loadRecords();
  loadRoleConfig();
  loadBehaviorLib();
  loadGameSession();

  setupTabs();
  renderAll();
});

function renderAll() {
  renderRoleConfigUi();
  renderBehaviorLibTable();
  renderManageTable();
  renderGameSessionUi();
  initAllChainSelects();
  initRoleSelects();
}

// ====================\n// 数据加载/保存模块\n// ====================\n
function loadRecords() {
  const data = localStorage.getItem(STORAGE_KEY);
  records = data ? JSON.parse(data) : [];
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function loadRoleConfig() {
  const data = localStorage.getItem(ROLE_CFG_KEY);
  roleConfig = data ? JSON.parse(data) : {
    '好人': ['村民', '预言家', '女巫', '猎人', '守卫', '白痴'],
    '狼人': ['狼人', '白狼王', '狼美人']
  };
}

function saveRoleConfig() {
  localStorage.setItem(ROLE_CFG_KEY, JSON.stringify(roleConfig));
}

function loadBehaviorLib() {
  const data = localStorage.getItem(BEHAVIOR_LIB_KEY);
  behaviorLib = data ? JSON.parse(data) : ['发言', '投票', '技能'];
}

function saveBehaviorLib() {
  localStorage.setItem(BEHAVIOR_LIB_KEY, JSON.stringify(behaviorLib));
}

function loadGameSession() {
  const data = localStorage.getItem(GAME_SESSION_KEY);
  gameSession = data ? JSON.parse(data) : null;
}

function saveGameSession() {
  localStorage.setItem(GAME_SESSION_KEY, JSON.stringify(gameSession));
}

// ====================\n// UI通用模块\n// ====================\n
function setupTabs() {
  const tabContainer = document.querySelector('.tab-bar');
  tabContainer.addEventListener('click', (e) => {
    if (e.target.matches('.tab-btn')) {
      const tabId = e.target.dataset.tab;
      
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
    }
  });
}

function initRoleSelects() {
  const mainSelects = [document.getElementById('add-roleMain')];
  const subSelects = [document.getElementById('add-roleSub')];

  mainSelects.forEach(select => {
    if (!select) return;
    select.innerHTML = Object.keys(roleConfig).map(main => `<option value="${main}">${main}</option>`).join('');
    select.addEventListener('change', () => {
      const selectedMain = select.value;
      const correspondingSub = subSelects[mainSelects.indexOf(select)];
      if (correspondingSub) {
        updateSubRoleOptions(correspondingSub, selectedMain);
      }
    });
    if (select.options.length > 0) {
      select.dispatchEvent(new Event('change'));
    }
  });
}

function updateSubRoleOptions(subSelect, mainRole) {
  if (!subSelect) return;
  const subRoles = roleConfig[mainRole] || [];
  subSelect.innerHTML = subRoles.map(sub => `<option value="${sub}">${sub}</option>`).join('');
}

function initAllChainSelects() {
  initChainSelect('add-chain-wrap');
  initChainSelect('pro-chain-wrap');
  initChainSelect('q-chain-wrap');
  initChainSelect('game-chain-wrap');
}

function initChainSelect(wrapId) {
  const wrap = document.getElementById(wrapId);
  if (wrap) {
    wrap.innerHTML = '';
    addChainRow(wrapId);
  }
}

function addChainRow(wrapId) {
  const wrap = document.getElementById(wrapId);
  const newRow = document.createElement('div');
  newRow.className = 'form-row';
  
  const select = document.createElement('select');
  select.innerHTML = behaviorLib.map(b => `<option value="${b}">${b}</option>`).join('');
  
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = '行为详情，如：发言-聊爆了';
  
  const delBtn = document.createElement('button');
  delBtn.textContent = '删除';
  delBtn.className = 'del';
  delBtn.onclick = () => newRow.remove();

  newRow.appendChild(select);
  newRow.appendChild(input);
  newRow.appendChild(delBtn);
  wrap.appendChild(newRow);
}

function getChainBehaviors(wrapId) {
  const wrap = document.getElementById(wrapId);
  const behaviors = [];
  wrap.querySelectorAll('.form-row').forEach(row => {
    const select = row.querySelector('select');
    const input = row.querySelector('input');
    if (select && input && (select.value || input.value.trim())) {
      behaviors.push(`${select.value}:${input.value.trim()}`);
    }
  });
  return behaviors;
}

// ====================\n// 对局模块 (Game Session)\n// ====================\n
function startNewGame() {
  if (gameSession && !confirm('当前有未结束的对局，开始新游戏将清空当前进度，确定吗？')) {
    return;
  }
  gameSession = {
    players: [],
    onField: [],
    knownRoles: {},
    records: []
  };
  saveGameSession();
  renderGameSessionUi();
  document.getElementById('game-status').textContent = '对局进行中...';
}

function addPlayerToPool() {
  const input = document.getElementById('pool-add-player');
  const newPlayers = input.value.split(';').map(p => p.trim()).filter(p => p);
  if (newPlayers.length === 0) return;

  if (!gameSession) {
    alert('请先点击 "新游戏开始"');
    return;
  }

  newPlayers.forEach(p => {
    if (!gameSession.players.includes(p)) {
      gameSession.players.push(p);
    }
  });
  
  saveGameSession();
  renderGameSessionUi();
  input.value = '';
}

function removePlayerFromPool(player) {
  if (!gameSession) return;

  if (confirm(`确定要从候选池中删除玩家 "${player}" 吗？\n该玩家将同时从上场玩家中移除。`)) {
    const playerIndex = gameSession.players.indexOf(player);
    if (playerIndex > -1) {
      gameSession.players.splice(playerIndex, 1);
    }

    const onFieldIndex = gameSession.onField.indexOf(player);
    if (onFieldIndex > -1) {
      gameSession.onField.splice(onFieldIndex, 1);
    }

    if (gameSession.knownRoles[player]) {
      delete gameSession.knownRoles[player];
    }

    saveGameSession();
    renderGameSessionUi();
  }
}

function toggleOnField(player) {
  if (!gameSession) return;
  const index = gameSession.onField.indexOf(player);
  if (index > -1) {
    gameSession.onField.splice(index, 1);
  } else {
    gameSession.onField.push(player);
  }
  saveGameSession();
  renderGameSessionUi();
}

function setKnownRole(player) {
  const mainRole = document.getElementById(`known-main-${player}`).value;
  const subRole = document.getElementById(`known-sub-${player}`).value;
  if (mainRole && subRole) {
    gameSession.knownRoles[player] = { main: mainRole, sub: subRole };
  } else {
    delete gameSession.knownRoles[player];
  }
  saveGameSession();
  renderGameSessionUi();
}

function addTempRecord() {
  if (!gameSession) return;
  const actorId = document.getElementById('game-actor').value;
  const targetId = document.getElementById('game-target').value;
  const behaviors = getChainBehaviors('game-chain-wrap');
  const note = document.getElementById('game-note').value.trim();

  if (!actorId || behaviors.length === 0) {
    alert('发起者和行为不能为空');
    return;
  }

  gameSession.records.push({ actorId, targetId, behaviors, note });
  saveGameSession();
  renderGameSessionUi();

  document.getElementById('game-tip').textContent = '临时记录已添加';
  setTimeout(() => document.getElementById('game-tip').textContent = '', 2000);
  initChainSelect('game-chain-wrap');
}

function deleteTempRecord(index) {
  if (!gameSession) return;
  if (confirm('确定删除这条临时记录吗？')) {
    gameSession.records.splice(index, 1);
    saveGameSession();
    renderGameSessionUi();
  }
}

function renderGameSessionUi() {
  const ui = document.getElementById('game-session-ui');
  const endGameBtn = document.getElementById('end-game-btn');

  if (!gameSession) {
    ui.classList.add('hidden');
    endGameBtn.disabled = true;
    document.getElementById('game-status').textContent = '未开启对局';
    return;
  }

  ui.classList.remove('hidden');
  endGameBtn.disabled = false;

  const { players, onField, knownRoles, records: tempRecords } = gameSession;

  const poolWrap = document.getElementById('player-pool-wrap');
  poolWrap.innerHTML = players.map(p => `
    <span class="player-tag">
      ${p}
      <button class="del-tiny" onclick="removePlayerFromPool('${p}')" title="从候选池移除">&times;</button>
    </span>
  `).join('');

  const onFieldWrap = document.getElementById('on-field-wrap');
  onFieldWrap.innerHTML = players.map(p => `
    <label>
      <input type="checkbox" ${onField.includes(p) ? 'checked' : ''} onchange="toggleOnField('${p}')">
      ${p}
    </label>
  `).join('');

  const knownRolesWrap = document.getElementById('known-roles-wrap');
  knownRolesWrap.innerHTML = onField.map(p => {
    const known = knownRoles[p] || {};
    const mainSelectHtml = Object.keys(roleConfig).map(m => `<option value="${m}" ${known.main === m ? 'selected' : ''}>${m}</option>`).join('');
    const subRoles = roleConfig[known.main] || [];
    const subSelectHtml = subRoles.map(s => `<option value="${s}" ${known.sub === s ? 'selected' : ''}>${s}</option>`).join('');
    
    return `
      <div class="form-row">
        <label>${p}:</label>
        <select id="known-main-${p}" onchange="updateSubRoleOptions(document.getElementById('known-sub-${p}'), this.value); setKnownRole('${p}');">
          <option value="">--阵营--</option>
          ${mainSelectHtml}
        </select>
        <select id="known-sub-${p}" onchange="setKnownRole('${p}');">
          <option value="">--身份--</option>
          ${subSelectHtml}
        </select>
      </div>
    `;
  }).join('');

  const actorSelect = document.getElementById('game-actor');
  const targetSelect = document.getElementById('game-target');
  const optionsHtml = onField.map(p => `<option value="${p}">${p}</option>`).join('');
  actorSelect.innerHTML = optionsHtml;
  targetSelect.innerHTML = `<option value="">--无--</option>${optionsHtml}`;

  const tempRecordsWrap = document.getElementById('temp-records-wrap');
  tempRecordsWrap.innerHTML = tempRecords.map((r, i) => `
    <div class="result-box">
      <p><strong>发起者:</strong> ${r.actorId}, <strong>对象:</strong> ${r.targetId || '无'}, <strong>备注:</strong> ${r.note || '无'}</p>
      <p><strong>行为:</strong> ${r.behaviors.join(' -> ')}</p>
      <button class="del" onclick="deleteTempRecord(${i})">删除</button>
    </div>
  `).join('');
}

function openGameEndModal() {
  if (!gameSession || gameSession.onField.length === 0) {
    alert('没有上场玩家，无法结束对局。');
    return;
  }
  const modal = document.getElementById('game-end-modal');
  const form = document.getElementById('game-end-form');
  
  form.innerHTML = gameSession.onField.map(p => {
    const known = gameSession.knownRoles[p] || {};
    const mainSelectHtml = Object.keys(roleConfig).map(m => `<option value="${m}" ${known.main === m ? 'selected' : ''}>${m}</option>`).join('');
    const subRoles = roleConfig[known.main] || [];
    const subSelectHtml = subRoles.map(s => `<option value="${s}" ${known.sub === s ? 'selected' : ''}>${s}</option>`).join('');

    return `
      <div class="form-row">
        <label>${p} 的身份是:</label>
        <select id="end-main-${p}" onchange="updateSubRoleOptions(document.getElementById('end-sub-${p}'), this.value)">
          <option value="">--阵营--</option>
          ${mainSelectHtml}
        </select>
        <select id="end-sub-${p}">
          <option value="">--身份--</option>
          ${subSelectHtml}
        </select>
      </div>
    `;
  }).join('');

  modal.style.display = 'block';
}

function closeGameEndModal() {
  document.getElementById('game-end-modal').style.display = 'none';
}

function confirmGameEnd() {
  const onFieldPlayers = gameSession.onField;
  let allRolesFilled = true;
  const finalRoles = {};

  onFieldPlayers.forEach(p => {
    const mainRole = document.getElementById(`end-main-${p}`).value;
    const subRole = document.getElementById(`end-sub-${p}`).value;
    if (!mainRole || !subRole) {
      allRolesFilled = false;
    }
    finalRoles[p] = { main: mainRole, sub: subRole };
  });

  if (!allRolesFilled) {
    alert('请为所有上场玩家选择完整的身份！');
    return;
  }

  gameSession.records.forEach(rec => {
    const actorRole = finalRoles[rec.actorId];
    if (actorRole) {
      const newRecord = {
        ...rec,
        roleMain: actorRole.main,
        roleSub: actorRole.sub,
        timestamp: new Date().toISOString()
      };
      addOrUpdateRecord(newRecord);
    }
  });

  saveRecords();
  
  gameSession = null;
  saveGameSession();
  renderGameSessionUi();
  closeGameEndModal();
  alert('本局记录已成功提交至总数据库！');
  document.getElementById('game-status').textContent = '未开启对局';
  renderManageTable();
}

// ====================\n// 新增记录模块 (旧)\n// ====================\n
function addOrUpdateRecord(record) {
  const existingRecord = records.find(r => 
    r.actorId === record.actorId &&
    r.targetId === record.targetId &&
    r.roleMain === record.roleMain &&
    r.roleSub === record.roleSub &&
    JSON.stringify(r.behaviors) === JSON.stringify(record.behaviors)
  );

  if (existingRecord) {
    existingRecord.count = (existingRecord.count || 1) + 1;
  } else {
    record.count = 1;
    records.push(record);
  }
}

function addRecord() {
  const actorId = document.getElementById('add-actorId').value.trim();
  const targetId = document.getElementById('add-targetId').value.trim();
  const roleMain = document.getElementById('add-roleMain').value;
  const roleSub = document.getElementById('add-roleSub').value;
  const note = document.getElementById('add-note').value.trim();
  const behaviors = getChainBehaviors('add-chain-wrap');

  if (!actorId || !roleMain || !roleSub || behaviors.length === 0) {
    alert('发起者、身份和行为不能为空');
    return;
  }

  const newRecord = {
    actorId,
    targetId,
    roleMain,
    roleSub,
    behaviors,
    note,
    timestamp: new Date().toISOString()
  };

  addOrUpdateRecord(newRecord);

  saveRecords();
  document.getElementById('add-tip').textContent = '保存成功！';
  setTimeout(() => document.getElementById('add-tip').textContent = '', 2000);
  
  document.getElementById('add-actorId').value = '';
  document.getElementById('add-targetId').value = '';
  document.getElementById('add-note').value = '';
  initChainSelect('add-chain-wrap');
  
  renderManageTable();
}

// ====================\n// 查询模块 (已连接后端)\n// ====================\n
async function calcCampProb() {
  const actor = document.getElementById('q-actor').value.trim();
  const target = document.getElementById('q-target').value.trim();
  const behaviors = getChainBehaviors('q-chain-wrap');
  const resultBox = document.getElementById('q-result');

  if (!actor || behaviors.length === 0) {
    resultBox.innerHTML = '<p class="error">玩家ID和行为不能为空</p>';
    return;
  }

  resultBox.innerHTML = '<p>正在向AI模型请求阵营预测...</p>';

  try {
    const response = await fetch('http://127.0.0.1:5000/api/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        actor,
        target,
        behaviors,
        prediction_type: 'camp'
      }),
    });

    if (!response.ok) {
      throw new Error(`服务器错误: ${response.statusText}`);
    }

    const data = await response.json();
    resultBox.innerHTML = `<p>${data.message}</p>`;

  } catch (error) {
    console.error('请求预测失败:', error);
    resultBox.innerHTML = `<p class="error">请求AI模型失败，请检查后端服务是否正在运行。</p>`;
  }
}

async function calcProphecyProb() {
  const actor = document.getElementById('pro-actor').value.trim();
  const target = document.getElementById('pro-target').value.trim();
  const behaviors = getChainBehaviors('pro-chain-wrap');
  const resultBox = document.getElementById('pro-result');

  if (!actor || behaviors.length === 0) {
    resultBox.innerHTML = '<p class="error">玩家ID和行为不能为空</p>';
    return;
  }
  
  resultBox.innerHTML = '<p>正在向AI模型请求预言家概率预测...</p>';

  try {
    const response = await fetch('http://127.0.0.1:5000/api/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        actor,
        target,
        behaviors,
        prediction_type: 'prophecy'
      }),
    });

    if (!response.ok) {
      throw new Error(`服务器错误: ${response.statusText}`);
    }

    const data = await response.json();
    resultBox.innerHTML = `<p>${data.message}</p>`;

  } catch (error) {
    console.error('请求预测失败:', error);
    resultBox.innerHTML = `<p class="error">请求AI模型失败，请检查后端服务是否正在运行。</p>`;
  }
}

// ====================\n// 记录管理模块\n// ====================\n
function renderManageTable() {
  const wrap = document.getElementById('manage-table-wrap');
  const filterActor = document.getElementById('filter-actor').value.trim().toLowerCase();
  
  const filteredRecords = records.filter(r => 
    !filterActor || r.actorId.toLowerCase().includes(filterActor)
  );

  if (!wrap) return; // Guard against null element
  if (filteredRecords.length === 0) {
    wrap.innerHTML = '<p>没有记录。</p>';
    return;
  }

  const table = `
    <table>
      <thead>
        <tr>
          <th>发起者</th>
          <th>对象</th>
          <th>身份</th>
          <th>行为</th>
          <th>次数</th>
          <th>备注</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${filteredRecords.map((r, i) => `
          <tr>
            <td>${r.actorId}</td>
            <td>${r.targetId || '-'}</td>
            <td>${r.roleMain} - ${r.roleSub}</td>
            <td>${r.behaviors.join('<br>')}</td>
            <td>${r.count || 1}</td>
            <td>${r.note || '-'}</td>
            <td><button class="del" onclick="deleteRecordByIndex(${i})">删除</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  wrap.innerHTML = table;
}

function findRecordIndex(originalIndex) {
    const filterActor = document.getElementById('filter-actor').value.trim().toLowerCase();
    const filteredRecords = records.filter(r => 
        !filterActor || r.actorId.toLowerCase().includes(filterActor)
    );
    const recordToDelete = filteredRecords[originalIndex];
    return records.findIndex(r => r === recordToDelete);
}

function deleteRecordByIndex(index) {
    const actualIndex = findRecordIndex(index);
    if (actualIndex !== -1) {
        if (confirm('确定要删除这条记录吗？')) {
            records.splice(actualIndex, 1);
            saveRecords();
            renderManageTable();
        }
    }
}

function deleteAllRecords() {
  if (confirm('警告：此操作将删除所有记录，且无法恢复！确定吗？')) {
    records = [];
    saveRecords();
    renderManageTable();
  }
}

function exportRecords() {
  const dataStr = JSON.stringify({
    records,
    roleConfig,
    behaviorLib
  }, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `werewolf_data_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importRecords(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (confirm('这将覆盖现有的所有记录和配置，确定导入吗？')) {
        records = data.records || [];
        roleConfig = data.roleConfig || {};
        behaviorLib = data.behaviorLib || [];
        saveRecords();
        saveRoleConfig();
        saveBehaviorLib();
        renderAll();
        alert('导入成功！');
      }
    } catch (err) {
      alert('导入失败，文件格式错误！');
      console.error(err);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}


// ====================\n// 系统配置模块\n// ====================\n
function renderRoleConfigUi() {
  const view = document.getElementById('cfg-view');
  const mainSelect = document.getElementById('cfg-select-main');
  if (!view || !mainSelect) return;

  let html = '';
  for (const main in roleConfig) {
    html += `<div><strong>${main}:</strong> ${roleConfig[main].join(', ')}</div>`;
  }
  view.innerHTML = html;

  mainSelect.innerHTML = Object.keys(roleConfig).map(main => `<option value="${main}">${main}</option>`).join('');
}

function addNewMainRole() {
  const input = document.getElementById('cfg-new-main');
  const newMain = input.value.trim();
  if (newMain && !roleConfig[newMain]) {
    roleConfig[newMain] = [];
    saveRoleConfig();
    renderRoleConfigUi();
    initRoleSelects();
    input.value = '';
  }
}

function deleteMainRole() {
    const mainSelect = document.getElementById('cfg-select-main');
    const mainToDelete = mainSelect.value;
    if (mainToDelete && confirm(`确定删除一级身份 "${mainToDelete}" 及其下所有二级身份吗？`)) {
        delete roleConfig[mainToDelete];
        saveRoleConfig();
        renderRoleConfigUi();
        initRoleSelects();
    }
}

function addNewSubRole() {
    const mainSelect = document.getElementById('cfg-select-main');
    const subInput = document.getElementById('cfg-new-sub');
    const main = mainSelect.value;
    const sub = subInput.value.trim();

    if (main && sub && !roleConfig[main].includes(sub)) {
        roleConfig[main].push(sub);
        saveRoleConfig();
        renderRoleConfigUi();
        initRoleSelects();
        subInput.value = '';
    }
}

function deleteSubRole() {
    // This is more complex UX-wise. For now, let's omit this
    // or require user to type the name to confirm.
    alert('删除二级身份的功能暂未实现。');
}

function renderBehaviorLibTable() {
  const wrap = document.getElementById('beh-lib-wrap');
  if (!wrap) return;
  wrap.innerHTML = behaviorLib.map((beh, i) => `
    <div class="form-row">
      <input type="text" value="${beh}" id="beh-input-${i}" onchange="updateBehavior(${i}, this.value)">
      <button class="del" onclick="deleteBehavior(${i})">删除</button>
    </div>
  `).join('');
}

function addNewBehavior() {
  const input = document.getElementById('beh-new-input');
  const newBeh = input.value.trim();
  if (newBeh && !behaviorLib.includes(newBeh)) {
    behaviorLib.push(newBeh);
    saveBehaviorLib();
    renderBehaviorLibTable();
    initAllChainSelects();
    input.value = '';
  }
}

function updateBehavior(index, newValue) {
  newValue = newValue.trim();
  if (newValue) {
    behaviorLib[index] = newValue;
    saveBehaviorLib();
    initAllChainSelects();
  } else {
    // If value is empty, revert to original
    document.getElementById(`beh-input-${index}`).value = behaviorLib[index];
  }
}

function deleteBehavior(index) {
  if (confirm('确定删除这个行为吗？')) {
    behaviorLib.splice(index, 1);
    saveBehaviorLib();
    renderBehaviorLibTable();
    initAllChainSelects();
  }
}