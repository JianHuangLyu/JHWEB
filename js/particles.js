/*
 * 粒子網絡背景（純 Canvas 2D，無外部函式庫）
 * scripts.js 的 selectBackground() 會切換 .background-scene 的 hidden；
 * 這裡用 MutationObserver 監聽該屬性，場景顯示時啟動動畫、隱藏時暫停。
 */
(() => {
    'use strict';

    const scene = document.querySelector('.background-scene[data-background="particles"]');
    const canvas = scene?.querySelector('canvas');
    const context = canvas?.getContext('2d');
    if (!scene || !canvas || !context) return;

    const backdrop = scene.parentElement;
    const AREA_PER_NODE = 9500;
    const MIN_NODES = 40;
    const MAX_NODES = 150;
    const LINK_DISTANCE = 165;
    const LINK_ALPHA = 0.2;
    const POINTER_RADIUS = 190;
    const POINTER_PULL = 42;
    const FADE_IN = 160;
    const FADE_OUT = 420;
    const RELAX_RATE = 1.1;
    // 點擊時在該處長出新粒子：逐漸出現、緩慢散開加入網絡，一段時間後縮小消失
    const SPAWN_COUNT = 3;
    const SPAWN_LIMIT = 36;
    const SPAWN_APPEAR = 450;
    const SPAWN_LIFETIME = 12000;
    const SPAWN_VANISH = 1200;
    const SPAWN_QUICK_VANISH = 350;
    const SPAWN_HARD_LIMIT = Math.round(SPAWN_LIMIT * 1.5);
    // 連線依透明度分成幾組，每組只下一次 stroke，避免每條線各畫一次造成卡頓
    const ALPHA_STEPS = 8;
    // 深色大點、中灰、淺灰小點，比例 2:3:5
    const KINDS = [
        { radius: 3.5, alpha: 0.72, weight: 2 },
        { radius: 2.8, alpha: 0.36, weight: 3 },
        { radius: 1.8, alpha: 0.18, weight: 5 },
    ];
    const TOTAL_WEIGHT = KINDS.reduce((sum, kind) => sum + kind.weight, 0);

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = { x: 0, y: 0, active: false, strength: 0 };
    const buckets = Array.from({ length: ALPHA_STEPS }, () => []);
    const field = [];
    let nodes = [];
    let sparks = [];
    let width = 0;
    let height = 0;
    let accent = '#000';
    let frame = 0;
    let lastTime = 0;
    let reportedError = false;

    const isShown = () => !scene.hidden && !backdrop.hidden;
    const isAnimated = () => isShown() && !document.hidden && !motion.matches;

    function pickKind() {
        let roll = Math.random() * TOTAL_WEIGHT;
        for (const kind of KINDS) {
            roll -= kind.weight;
            if (roll < 0) return kind;
        }
        return KINDS[KINDS.length - 1];
    }

    function makeNode(x, y, angle = Math.random() * Math.PI * 2) {
        const kind = pickKind();
        const speed = 12 + Math.random() * 22;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        return { x, y, vx, vy, baseVx: vx, baseVy: vy, kind, presence: 1 };
    }

    function targetCount() {
        return Math.max(MIN_NODES, Math.min(MAX_NODES, Math.round((width * height) / AREA_PER_NODE)));
    }

    // 網格＋隨機偏移，避免節點擠成一團
    function seed() {
        const count = targetCount();
        const cols = Math.max(1, Math.round(Math.sqrt((count * width) / height)));
        const rows = Math.max(1, Math.ceil(count / cols));
        const cellWidth = width / cols;
        const cellHeight = height / rows;
        const cells = [];
        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < cols; col += 1) cells.push([col, row]);
        }
        for (let i = cells.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [cells[i], cells[j]] = [cells[j], cells[i]];
        }
        nodes = cells.slice(0, count).map(([col, row]) => makeNode(
            (col + 0.15 + Math.random() * 0.7) * cellWidth,
            (row + 0.15 + Math.random() * 0.7) * cellHeight,
        ));
    }

    function resize() {
        const nextWidth = scene.clientWidth;
        const nextHeight = scene.clientHeight;
        if (!nextWidth || !nextHeight) return false;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const pixelWidth = Math.round(nextWidth * ratio);
        const pixelHeight = Math.round(nextHeight * ratio);
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
        }
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        if (nextWidth === width && nextHeight === height && nodes.length) return true;

        width = nextWidth;
        height = nextHeight;
        if (!nodes.length) {
            seed();
            return true;
        }
        // 尺寸改變（例如手機網址列收合）時保留既有節點，只補足或減少數量
        const count = targetCount();
        for (const node of nodes) {
            node.x = Math.min(Math.max(node.x, 0), width);
            node.y = Math.min(Math.max(node.y, 0), height);
        }
        while (nodes.length < count) nodes.push(makeNode(Math.random() * width, Math.random() * height));
        if (nodes.length > count) nodes.length = count;
        return true;
    }

    function readColors() {
        accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#000';
    }

    function spawn(x, y, now) {
        const start = Math.random() * Math.PI * 2;
        for (let i = 0; i < SPAWN_COUNT; i += 1) {
            // 平均分配方向再加一點隨機，讓新粒子朝不同方向慢慢散開
            const angle = start + (i / SPAWN_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
            const node = makeNode(x + Math.cos(angle) * 4, y + Math.sin(angle) * 4, angle);
            node.presence = 0;
            node.born = now;
            node.expires = now + SPAWN_LIFETIME + Math.random() * 3000;
            node.vanish = SPAWN_VANISH;
            sparks.push(node);
        }
        // 同時存在的新粒子有上限：超過時最舊的快速消失；瘋狂點擊時再以硬上限直接移除最舊的
        const overflow = sparks.length - SPAWN_LIMIT;
        for (let i = 0; i < overflow; i += 1) {
            if (sparks[i].expires > now) {
                sparks[i].expires = now;
                sparks[i].vanish = SPAWN_QUICK_VANISH;
            }
        }
        if (sparks.length > SPAWN_HARD_LIMIT) sparks.splice(0, sparks.length - SPAWN_HARD_LIMIT);
    }

    function move(node, dt, relax, margin) {
        if (pointer.strength > 0) {
            const dx = pointer.x - node.x;
            const dy = pointer.y - node.y;
            const distance = Math.hypot(dx, dy);
            if (distance > 1 && distance < POINTER_RADIUS) {
                const pull = POINTER_PULL * (1 - distance / POINTER_RADIUS) * pointer.strength * dt;
                node.vx += (dx / distance) * pull;
                node.vy += (dy / distance) * pull;
            }
        }
        node.vx += (node.baseVx - node.vx) * relax;
        node.vy += (node.baseVy - node.vy) * relax;
        node.x += node.vx * dt;
        node.y += node.vy * dt;
        // 從一邊出去就從另一邊進來
        if (node.x < -margin) node.x += width + margin * 2;
        else if (node.x > width + margin) node.x -= width + margin * 2;
        if (node.y < -margin) node.y += height + margin * 2;
        else if (node.y > height + margin) node.y -= height + margin * 2;
    }

    function step(dt, now) {
        const goal = pointer.active ? 1 : 0;
        const fade = (dt * 1000) / (pointer.active ? FADE_IN : FADE_OUT);
        pointer.strength += Math.max(-fade, Math.min(fade, goal - pointer.strength));

        const relax = 1 - Math.exp(-dt * RELAX_RATE);
        for (const node of nodes) move(node, dt, relax, 12);

        for (let i = sparks.length - 1; i >= 0; i -= 1) {
            const spark = sparks[i];
            move(spark, dt, relax, 12);
            // 動畫幀的時間戳可能略早於點擊時間，進度一律從 0 起算，避免剛長出就被當成已消失
            if (now >= spark.expires) {
                spark.presence = 1 - (now - spark.expires) / spark.vanish;
                if (spark.presence <= 0) sparks.splice(i, 1);
            } else {
                const t = Math.min(Math.max((now - spark.born) / SPAWN_APPEAR, 0), 1);
                spark.presence = 1 - (1 - t) ** 3;
            }
        }
    }

    // 只在接近最大距離（最後 25%）時淡出，線條看起來俐落
    function linkAlpha(distance, reach) {
        const fadeFrom = reach * 0.75;
        return distance < fadeFrom ? 1 : (reach - distance) / (reach - fadeFrom);
    }

    function queueLine(level, x1, y1, x2, y2) {
        if (level <= 0) return;
        const index = Math.min(ALPHA_STEPS - 1, Math.ceil(level * ALPHA_STEPS) - 1);
        buckets[index].push(x1, y1, x2, y2);
    }

    function flushLines(maxAlpha) {
        for (let i = 0; i < ALPHA_STEPS; i += 1) {
            const segments = buckets[i];
            if (!segments.length) continue;
            context.globalAlpha = (maxAlpha * (i + 1)) / ALPHA_STEPS;
            context.beginPath();
            for (let k = 0; k < segments.length; k += 4) {
                context.moveTo(segments[k], segments[k + 1]);
                context.lineTo(segments[k + 2], segments[k + 3]);
            }
            context.stroke();
            segments.length = 0;
        }
    }

    function draw() {
        context.clearRect(0, 0, width, height);
        context.strokeStyle = accent;
        context.fillStyle = accent;
        context.lineWidth = 1;

        field.length = 0;
        field.push(...nodes, ...sparks);

        for (let i = 0; i < field.length; i += 1) {
            const a = field[i];
            for (let j = i + 1; j < field.length; j += 1) {
                const b = field[j];
                const dx = a.x - b.x;
                if (dx > LINK_DISTANCE || dx < -LINK_DISTANCE) continue;
                const dy = a.y - b.y;
                if (dy > LINK_DISTANCE || dy < -LINK_DISTANCE) continue;
                const distance = Math.hypot(dx, dy);
                if (distance >= LINK_DISTANCE) continue;
                queueLine(linkAlpha(distance, LINK_DISTANCE) * Math.min(a.presence, b.presence), a.x, a.y, b.x, b.y);
            }
        }
        flushLines(LINK_ALPHA);

        if (pointer.strength > 0) {
            for (const node of field) {
                const distance = Math.hypot(pointer.x - node.x, pointer.y - node.y);
                if (distance >= POINTER_RADIUS) continue;
                queueLine(linkAlpha(distance, POINTER_RADIUS) * node.presence, node.x, node.y, pointer.x, pointer.y);
            }
            flushLines(LINK_ALPHA * 1.4 * pointer.strength);
        }

        // 三種節點各填色一次；新粒子以半徑由小到大呈現出現與消失
        for (const kind of KINDS) {
            context.globalAlpha = kind.alpha;
            context.beginPath();
            for (const node of field) {
                if (node.kind !== kind || node.presence <= 0) continue;
                const radius = kind.radius * node.presence;
                context.moveTo(node.x + radius, node.y);
                context.arc(node.x, node.y, radius, 0, Math.PI * 2);
            }
            context.fill();
        }
        context.globalAlpha = 1;
    }

    function tick(now) {
        // 分頁切回或從上一頁還原時時間差可能很大，限制單步最多 50ms，避免節點瞬間跳動
        const dt = Math.min(Math.max((now - lastTime) / 1000, 0), 0.05);
        lastTime = now;
        try {
            step(dt, now);
            draw();
        } catch (error) {
            // 單一幀出錯不中斷動畫，只回報一次避免洗版
            if (!reportedError) {
                reportedError = true;
                console.error('粒子背景繪製失敗：', error);
            }
        } finally {
            frame = isAnimated() ? window.requestAnimationFrame(tick) : 0;
        }
    }

    function stop() {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
    }

    // 減少動態效果時只畫一張靜態網絡，不做動畫與互動
    function drawStatic() {
        pointer.active = false;
        pointer.strength = 0;
        sparks = [];
        draw();
    }

    function sync() {
        if (!isShown()) {
            stop();
            return;
        }
        if (!resize()) return;
        readColors();
        if (isAnimated()) {
            if (!frame) {
                lastTime = performance.now();
                frame = window.requestAnimationFrame(tick);
            }
            return;
        }
        stop();
        if (motion.matches) drawStatic();
    }

    function setPointer(x, y) {
        pointer.x = x;
        pointer.y = y;
        pointer.active = true;
    }

    function releasePointer() {
        pointer.active = false;
    }

    // 滑鼠與觸控筆用 pointer 事件；手指改用 touch 事件，因為捲動時 pointer 事件會被取消
    window.addEventListener('pointermove', event => {
        if (event.pointerType !== 'touch') setPointer(event.clientX, event.clientY);
    }, { passive: true });
    window.addEventListener('mouseout', event => {
        if (!event.relatedTarget) releasePointer();
    });
    window.addEventListener('blur', releasePointer);
    window.addEventListener('touchstart', event => {
        const touch = event.touches[0];
        if (touch) setPointer(touch.clientX, touch.clientY);
    }, { passive: true });
    window.addEventListener('touchmove', event => {
        const touch = event.touches[0];
        if (touch) setPointer(touch.clientX, touch.clientY);
    }, { passive: true });
    const endTouch = event => {
        if (!event.touches.length) releasePointer();
    };
    window.addEventListener('touchend', endTouch, { passive: true });
    window.addEventListener('touchcancel', endTouch, { passive: true });
    window.addEventListener('click', event => {
        // 鍵盤觸發的 click 沒有座標（detail 為 0），不產生粒子
        if (event.detail && isAnimated()) spawn(event.clientX, event.clientY, performance.now());
    });

    let resizeQueued = false;
    window.addEventListener('resize', () => {
        if (resizeQueued) return;
        resizeQueued = true;
        window.requestAnimationFrame(() => {
            resizeQueued = false;
            sync();
        });
    });

    const watcher = new MutationObserver(sync);
    watcher.observe(scene, { attributes: true, attributeFilter: ['hidden'] });
    watcher.observe(backdrop, { attributes: true, attributeFilter: ['hidden'] });
    // 切換玄素／霧藍時即時更新顏色（動畫中下一幀就會套用，靜態時立即重畫）
    new MutationObserver(() => {
        readColors();
        if (isShown() && motion.matches) drawStatic();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-view-theme'] });
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', sync);
    // 離開頁面時停止；按「上一頁」從瀏覽器快取還原時重新量尺寸、讀顏色並恢復動畫
    window.addEventListener('pagehide', () => {
        releasePointer();
        stop();
    });
    window.addEventListener('pageshow', () => {
        releasePointer();
        pointer.strength = 0;
        sync();
    });
    window.addEventListener('focus', sync);
    // 顯示卡重置等情況使 canvas 內容遺失後，恢復時重新開始繪製
    canvas.addEventListener('contextlost', stop);
    canvas.addEventListener('contextrestored', () => {
        width = 0;
        height = 0;
        sync();
    });

    sync();
})();
