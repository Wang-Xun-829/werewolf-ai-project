// 全局变量，用于存储各种数据
let gameRecords = []; // 存储所有对局记录
let roleConfigurations = {}; // 存储角色配置
let behaviorLibrary = []; // 存储行为库
let playerPool = []; // 玩家池
let currentGame = { // 当前对局状态
    players: [],
    records: []
};

// DOM加载完成后执行的初始化函数
document.addEventListener('DOMContentLoaded', () => {
    // 加载所有本地存储的数据
    loadAllData();
    // 初始化所有UI组件
    initializeUI();
    // 绑定所有事件监听器
    bindEventListeners();
    // 默认显示第一个标签页
    showTab('tab-game');
});

/**
 * 加载所有存储在localStorage中的数据
 */
function loadAllData() {
    gameRecords = JSON.parse(localStorage.getItem('gameRecords')) || [];
    roleConfigurations = JSON.parse(localStorage.getItem('roleConfigurations')) || {
        good: ['预言家', '女巫', '猎人', '白痴', '守卫', '平民', '平民', '平民'],
        evil: ['狼人', '狼人', '狼人', '狼人']
    };
    behaviorLibrary = JSON.parse(localStorage.getItem('behaviorLibrary')) || [
        '第一天发言', '第二天发言', '第三天发言', '第四天发言',
        '警上发言', '警下发言', '放逐发言', '遗言',
        '查杀', '金水', '银水', '悍跳', '倒钩', '冲票', '反水',
        '自刀', '自爆', '守', '救', '毒', '带'
    ];
    playerPool = JSON.parse(localStorage.getItem('playerPool')) || [];
    const savedGame = localStorage.getItem('currentGame');
    if (savedGame) {
        currentGame = JSON.parse(savedGame);
    }
}

/**
 * 保存所有数据到localStorage
 */
function saveAllData() {
    localStorage.setItem('gameRecords', JSON.stringify(gameRecords));
    localStorage.setItem('roleConfigurations', JSON.stringify(roleConfigurations));
    localStorage.setItem('behaviorLibrary', JSON.stringify(behaviorLibrary));
    localStorage.setItem('playerPool', JSON.stringify(playerPool));
    localStorage.setItem('currentGame', JSON.stringify(currentGame));
}

/**
 * 初始化UI界面
 */
function initializeUI() {
    updateRoleConfigDisplay();
    updateBehaviorLibraryDisplay();
    updatePlayerPoolDisplay(); // 更新配置页的玩家池
    updateGameTabPlayerSetup(); // 更新对局页的玩家准备区
    updateGameRecordsDisplay();
    renderCurrentGame();
    populateBehaviorDropdowns();
}

/**
 * 绑定所有的事件监听器
 */
function bindEventListeners() {
    // 标签页切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            showTab(btn.dataset.tab);
        });
    });

    // 对局标签页
    document.getElementById('load-players-btn').addEventListener('click', loadPlayersFromInput);
    document.getElementById('start-game-btn').addEventListener('click', startGame);
    document.getElementById('add-game-record-btn').addEventListener('click', addGameRecord);
    document.getElementById('end-game-btn').addEventListener('click', endGame);

    // 数据查询标签页
    document.getElementById('calc-camp-prob-btn').addEventListener('click', calcCampProb);
    document.getElementById('calc-prophecy-prob-btn').addEventListener('click', calcProphecyProb);
    document.getElementById('add-q-behavior-btn').addEventListener('click', () => addBehaviorToChain('q-behavior', 'q-chain-wrap'));
    document.getElementById('add-pro-behavior-btn').addEventListener('click', () => addBehaviorToChain('pro-behavior', 'pro-chain-wrap'));

    // 数据管理标签页
    document.getElementById('export-data-btn').addEventListener('click', exportData);
    document.getElementById('import-data-btn').addEventListener('click', () => document.getElementById('import-file-input').click());
    document.getElementById('import-file-input').addEventListener('change', importData);
    document.getElementById('clear-data-btn').addEventListener('click', clearAllData);

    // 系统配置标签页
    document.getElementById('add-good-role-btn').addEventListener('click', () => addRole('good'));
    document.getElementById('add-evil-role-btn').addEventListener('click', () => addRole('evil'));
    document.getElementById('add-behavior-lib-btn').addEventListener('click', addBehaviorToLibrary);
    document.getElementById('add-player-pool-btn').addEventListener('click', addPlayerToPool);
}

/**
 * 显示指定的标签页
 * @param {string} tabId - 标签页的ID
 */
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById(tabId).style.display = 'block';
}

// =================================================================
// 对局功能 (Game Tab)
// =================================================================

/**
 * 从文本框加载玩家，并更新玩家池
 */
function loadPlayersFromInput() {
    const textarea = document.getElementById('player-names-input');
    const names = textarea.value.split(';')
        .map(name => name.trim())
        .filter(name => name.length > 0);
    
    // 使用Set来自动去重
    playerPool = [...new Set(names)];
    
    saveAllData();
    renderPlayerSelection(); // 重新渲染可选的玩家列表
    updatePlayerPoolDisplay(); // 同步更新到配置页的列表
    alert(`玩家列表已更新，共 ${playerPool.length} 名玩家。`);
}

/**
 * 渲染对局页的可选玩家列表
 */
function renderPlayerSelection() {
    const selectionArea = document.getElementById('player-selection-area');
    selectionArea.innerHTML = '';
    if (playerPool.length === 0) {
        selectionArea.innerHTML = '<p>请在上方文本框输入玩家并点击“加载/刷新玩家列表”。</p>';
        return;
    }

    const container = document.createElement('div');
    container.className = 'player-selection-grid';
    playerPool.forEach(playerName => {
        const playerTag = document.createElement('div');
        playerTag.className = 'player-selectable-tag';
        // 使用 label 和 checkbox 关联，点击文字也能选中
        playerTag.innerHTML = `
            <input type="checkbox" id="player-select-${playerName.replace(/\s/g, '')}" data-player-name="${playerName}">
            <label for="player-select-${playerName.replace(/\s/g, '')}">${playerName}</label>
        `;
        container.appendChild(playerTag);
    });
    selectionArea.appendChild(container);
}

/**
 * 开始新对局
 */
function startGame() {
    const playerCount = parseInt(document.getElementById('player-count').value);
    if (isNaN(playerCount) || playerCount <= 0) {
        alert('请输入有效的上场玩家人数！');
        return;
    }

    const selectedPlayerNodes = document.querySelectorAll('#player-selection-area input[type="checkbox"]:checked');
    let selectedPlayers = Array.from(selectedPlayerNodes).map(node => node.dataset.playerName);

    if (selectedPlayers.length < playerCount) {
        alert(`您只选择了 ${selectedPlayers.length} 名玩家，不足 ${playerCount} 人，请选择足够数量的玩家上场！`);
        return;
    }

    if (currentGame.players.length > 0 && !confirm('当前已有对局正在进行，开始新对局将清空当前进度，确定吗？')) {
        return;
    }

    // 洗牌算法，随机打乱已选中的玩家顺序
    for (let i = selectedPlayers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selectedPlayers[i], selectedPlayers[j]] = [selectedPlayers[j], selectedPlayers[i]];
    }

    // 从打乱后的玩家中，取指定数量的玩家上场
    const gamePlayers = selectedPlayers.slice(0, playerCount);

    currentGame = {
        players: gamePlayers.map((playerName, index) => ({
            id: (index + 1).toString(), // 玩家座位号
            name: playerName,          // 玩家真实姓名
            role: '',
            isEvil: null
        })),
        records: []
    };

    renderCurrentGame();
    saveAllData();
    alert('新对局已开始！');
}


/**
 * 添加对局行为记录
 */
function addGameRecord() {
    if (currentGame.players.length === 0) {
        alert('请先开始一局游戏！');
        return;
    }
    const actor = document.getElementById('game-actor').value.trim();
    const target = document.getElementById('game-target').value.trim();
    const behavior = document.getElementById('game-behavior').value;

    if (!actor || !behavior) {
        alert('执行者和行为不能为空！');
        return;
    }

    currentGame.records.push({
        actor,
        target,
        behavior
    });
    renderCurrentGame();
    saveAllData();
}

/**
 * 结束对局并保存记录
 */
function endGame() {
    if (currentGame.players.length === 0) {
        alert('没有正在进行的对局！');
        return;
    }

    // 更新玩家阵营信息
    currentGame.players.forEach(player => {
        const roleInput = document.getElementById(`role-${player.id}`);
        const isEvilCheckbox = document.getElementById(`is-evil-${player.id}`);
        if (roleInput && isEvilCheckbox) {
            player.role = roleInput.value.trim();
            player.isEvil = isEvilCheckbox.checked;
        }
    });

    if (confirm('确定要结束当前对局并保存记录吗？')) {
        gameRecords.push({
            ...currentGame,
            date: new Date().toISOString()
        });
        currentGame = {
            players: [],
            records: []
        };
        renderCurrentGame();
        updateGameRecordsDisplay();
        saveAllData();
        alert('对局已结束并成功保存！');
    }
}

/**
 * 渲染当前对局状态
 */
function renderCurrentGame() {
    const playerSetup = document.getElementById('player-setup');
    const gameFlow = document.getElementById('game-flow');

    playerSetup.innerHTML = '';
    gameFlow.innerHTML = '';

    if (currentGame.players.length === 0) {
        playerSetup.innerHTML = '<p>暂无对局进行中。</p>';
        return;
    }

    // 渲染玩家设置区域
    const playerGrid = document.createElement('div');
    playerGrid.className = 'player-grid';
    currentGame.players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-input-group';
        // 同时显示座位号和玩家名
        playerDiv.innerHTML = `
            <label>玩家 ${player.id} (${player.name}):</label>
            <input type="text" id="role-${player.id}" placeholder="角色" value="${player.role || ''}">
            <div class="checkbox-wrapper">
                <input type="checkbox" id="is-evil-${player.id}" ${player.isEvil ? 'checked' : ''}>
                <label for="is-evil-${player.id}">是狼人</label>
            </div>
        `;
        playerGrid.appendChild(playerDiv);
    });
    playerSetup.appendChild(playerGrid);


    // 渲染对局流程记录
    if (currentGame.records.length > 0) {
        const recordList = document.createElement('ul');
        currentGame.records.forEach(rec => {
            const li = document.createElement('li');
            li.textContent = `玩家 ${rec.actor} 对 ${rec.target || '无目标'} 执行了 ${rec.behavior}`;
            recordList.appendChild(li);
        });
        gameFlow.appendChild(recordList);
    } else {
        gameFlow.innerHTML = '<p>暂无行为记录。</p>';
    }
}


// =================================================================
// 数据查询功能 (Query Tab)
// =================================================================

/**
 * 向后端请求阵营概率预测
 */
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
        const response = await fetch('https://werewolf-ai-project.onrender.com/api/predict', {
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

/**
 * 向后端请求预言家概率预测
 */
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
        const response = await fetch('https://werewolf-ai-project.onrender.com/api/predict', {
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


/**
 * 将行为添加到行为链中
 * @param {string} selectId - 下拉框的ID
 * @param {string} wrapperId - 行为链容器的ID
 */
function addBehaviorToChain(selectId, wrapperId) {
    const behavior = document.getElementById(selectId).value;
    const wrapper = document.getElementById(wrapperId);
    if (behavior) {
        const behaviorTag = document.createElement('span');
        behaviorTag.className = 'behavior-tag';
        behaviorTag.textContent = behavior;
        behaviorTag.onclick = () => wrapper.removeChild(behaviorTag);
        wrapper.appendChild(behaviorTag);
    }
}

/**
 * 从行为链容器中获取所有行为
 * @param {string} wrapperId - 行为链容器的ID
 * @returns {string[]} - 行为数组
 */
function getChainBehaviors(wrapperId) {
    const wrapper = document.getElementById(wrapperId);
    return Array.from(wrapper.children).map(tag => tag.textContent);
}


// =================================================================
// 数据管理功能 (Manage Tab)
// =================================================================

/**
 * 导出所有数据为JSON文件
 */
function exportData() {
    const dataStr = JSON.stringify({
        gameRecords,
        roleConfigurations,
        behaviorLibrary,
        playerPool
    }, null, 2);
    const dataBlob = new Blob([dataStr], {
        type: 'application/json'
    });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'werewolf_data_backup.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * 从JSON文件导入数据
 * @param {Event} event - 文件输入事件
 */
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm('导入数据将覆盖现有所有配置和记录，确定吗？')) {
                gameRecords = data.gameRecords || [];
                roleConfigurations = data.roleConfigurations || {};
                behaviorLibrary = data.behaviorLibrary || [];
                playerPool = data.playerPool || [];
                saveAllData();
                initializeUI(); // 重新渲染所有UI
                alert('数据导入成功！');
            }
        } catch (error)
{
            alert('导入失败，文件格式错误！');
            console.error(error);
        }
    };
    reader.readAsText(file);
    // 清空input的值，以便可以再次选择同一个文件
    event.target.value = '';
}

/**
 * 清空所有本地数据
 */
function clearAllData() {
    if (confirm('警告：此操作将删除所有对局记录、角色配置、行为库和玩家池，且无法恢复！确定要继续吗？')) {
        localStorage.clear();
        // 重置所有全局变量
        gameRecords = [];
        roleConfigurations = {
            good: ['预言家', '女巫', '猎人', '白痴', '守卫', '平民', '平民', '平民'],
            evil: ['狼人', '狼人', '狼人', '狼人']
        };
        behaviorLibrary = [
            '第一天发言', '第二天发言', '第三天发言', '第四天发言',
            '警上发言', '警下发言', '放逐发言', '遗言',
            '查杀', '金水', '银水', '悍跳', '倒钩', '冲票', '反水',
            '自刀', '自爆', '守', '救', '毒', '带'
        ];
        playerPool = [];
        currentGame = {
            players: [],
            records: []
        };
        initializeUI();
        alert('所有数据已清空！');
    }
}

/**
 * 更新对局记录显示
 */
function updateGameRecordsDisplay() {
    const container = document.getElementById('game-records-list');
    container.innerHTML = '';
    if (gameRecords.length === 0) {
        container.innerHTML = '<p>暂无历史对局记录。</p>';
        return;
    }
    gameRecords.forEach((record, index) => {
        const recordDiv = document.createElement('div');
        recordDiv.className = 'record-item';
        recordDiv.innerHTML = `
            <h4>对局 ${index + 1} - ${new Date(record.date).toLocaleString()}</h4>
            <p>玩家数: ${record.players.length}</p>
            <button class="delete-record-btn" data-index="${index}">删除</button>
        `;
        container.appendChild(recordDiv);
    });

    // 绑定删除按钮事件
    document.querySelectorAll('.delete-record-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const indexToDelete = parseInt(e.target.dataset.index);
            if (confirm(`确定要删除对局 ${indexToDelete + 1} 的记录吗？`)) {
                gameRecords.splice(indexToDelete, 1);
                saveAllData();
                updateGameRecordsDisplay();
            }
        });
    });
}


// =================================================================
// 系统配置功能 (Config Tab)
// =================================================================

/**
 * 添加角色到配置
 * @param {string} camp - 'good' 或 'evil'
 */
function addRole(camp) {
    const inputId = `new-${camp}-role`;
    const roleName = document.getElementById(inputId).value.trim();
    if (roleName) {
        roleConfigurations[camp].push(roleName);
        document.getElementById(inputId).value = '';
        updateRoleConfigDisplay();
        saveAllData();
    }
}

/**
 * 更新角色配置显示
 */
function updateRoleConfigDisplay() {
    const goodRolesContainer = document.getElementById('good-roles');
    const evilRolesContainer = document.getElementById('evil-roles');
    goodRolesContainer.innerHTML = '';
    evilRolesContainer.innerHTML = '';

    roleConfigurations.good.forEach((role, index) => {
        goodRolesContainer.appendChild(createTag(role, 'good', index));
    });
    roleConfigurations.evil.forEach((role, index) => {
        evilRolesContainer.appendChild(createTag(role, 'evil', index));
    });
}

/**
 * 添加行为到行为库
 */
function addBehaviorToLibrary() {
    const input = document.getElementById('new-behavior-lib');
    const behavior = input.value.trim();
    if (behavior && !behaviorLibrary.includes(behavior)) {
        behaviorLibrary.push(behavior);
        input.value = '';
        updateBehaviorLibraryDisplay();
        populateBehaviorDropdowns(); // 更新所有下拉框
        saveAllData();
    }
}

/**
 * 更新行为库显示
 */
function updateBehaviorLibraryDisplay() {
    const container = document.getElementById('behavior-lib-list');
    container.innerHTML = '';
    behaviorLibrary.forEach((behavior, index) => {
        container.appendChild(createTag(behavior, 'behavior', index));
    });
}

/**
 * 添加玩家到玩家池
 */
function addPlayerToPool() {
    const input = document.getElementById('new-player-pool');
    const playerName = input.value.trim();
    if (playerName && !playerPool.includes(playerName)) {
        playerPool.push(playerName);
        input.value = '';
        updatePlayerPoolDisplay();
        updateGameTabPlayerSetup(); // 同步到对局页
        saveAllData();
    }
}

/**
 * 更新配置页的玩家池显示
 */
function updatePlayerPoolDisplay() {
    const container = document.getElementById('player-pool-list');
    container.innerHTML = '';
    playerPool.forEach((player, index) => {
        container.appendChild(createTag(player, 'player', index));
    });
}

/**
 * 更新对局页的玩家准备区
 */
function updateGameTabPlayerSetup() {
    const textarea = document.getElementById('player-names-input');
    textarea.value = playerPool.join('; ');
    renderPlayerSelection();
}

/**
 * 创建一个可删除的标签
 * @param {string} text - 标签文本
 * @param {string} type - 'good', 'evil', 'behavior', 'player'
 * @param {number} index - 在数组中的索引
 * @returns {HTMLElement} - 创建的span元素
 */
function createTag(text, type, index) {
    const tag = document.createElement('span');
    tag.className = 'config-tag';
    tag.textContent = text;
    tag.onclick = () => {
        if (confirm(`确定要删除 "${text}" 吗？`)) {
            switch (type) {
                case 'good':
                    roleConfigurations.good.splice(index, 1);
                    updateRoleConfigDisplay();
                    break;
                case 'evil':
                    roleConfigurations.evil.splice(index, 1);
                    updateRoleConfigDisplay();
                    break;
                case 'behavior':
                    behaviorLibrary.splice(index, 1);
                    updateBehaviorLibraryDisplay();
                    populateBehaviorDropdowns();
                    break;
                case 'player':
                    playerPool.splice(index, 1);
                    updatePlayerPoolDisplay();
                    updateGameTabPlayerSetup(); // 同步到对局页
                    break;
            }
            saveAllData();
        }
    };
    return tag;
}

/**
 * 填充所有行为相关的下拉框
 */
function populateBehaviorDropdowns() {
    const dropdownIds = ['game-behavior', 'q-behavior', 'pro-behavior'];
    dropdownIds.forEach(id => {
        const select = document.getElementById(id);
        const currentValue = select.value;
        select.innerHTML = '';
        behaviorLibrary.forEach(behavior => {
            const option = document.createElement('option');
            option.value = behavior;
            option.textContent = behavior;
            select.appendChild(option);
        });
        if (currentValue && behaviorLibrary.includes(currentValue)) {
            select.value = currentValue;
        }
    });
}