(() => {
  'use strict';

  const STORAGE_KEY = 'jaque-competitive-profile-v1';
  const K_FACTOR = 32;
  const ranks = [
    { key: 'bronce', name: 'Bronce', min: 100, reward: 10, image: './assets/rank-bronce.png.b64', icon: '♟', color: '#b97850' },
    { key: 'plata', name: 'Plata', min: 1200, reward: 30, image: './assets/rank-plata.png.b64', icon: '♞', color: '#b9c6cf' },
    { key: 'oro', name: 'Oro', min: 1400, reward: 60, image: './assets/rank-oro.png.b64', icon: '♝', color: '#e5bd55' },
    { key: 'platino', name: 'Platino', min: 1600, reward: 100, image: './assets/rank-platino.png.b64', icon: '♜', color: '#65d4c2' },
    { key: 'experto', name: 'Experto', min: 1800, reward: 120, image: './assets/rank-experto.png.b64', icon: '♛', color: '#bca0f4' },
    { key: 'jaquers', name: 'Jaquers', min: 2000, reward: 200, image: './assets/rank-jaquers.png.b64', icon: '♚', color: '#b5ef6a' }
  ];
  const rankArtwork = Object.create(null);

  const freshProfile = () => ({ name: 'Jugador', elo: 1000, jaqwinn: 0, wins: 0, draws: 0, losses: 0, history: [] });
  function loadProfile() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return freshProfile();
      return {
        name: String(saved.name || 'Jugador').trim().slice(0, 24) || 'Jugador',
        elo: Number.isFinite(+saved.elo) ? Math.max(100, Math.min(4000, Math.round(+saved.elo))) : 1000,
        jaqwinn: Number.isFinite(+saved.jaqwinn) ? Math.max(0, Math.min(1000000000, Math.floor(+saved.jaqwinn))) : 0,
        wins: Math.max(0, Number.parseInt(saved.wins, 10) || 0),
        draws: Math.max(0, Number.parseInt(saved.draws, 10) || 0),
        losses: Math.max(0, Number.parseInt(saved.losses, 10) || 0),
        history: Array.isArray(saved.history)
          ? saved.history.filter(item => item && typeof item === 'object' && ['win', 'draw', 'loss'].includes(item.result) && Number.isFinite(Number(item.change))).slice(0, 12).map(item => ({
            result: item.result,
            change: Math.round(Number(item.change)),
            opponent: String(item.opponent || 'Rival').slice(0, 24),
            at: Number.isFinite(Number(item.at)) ? Number(item.at) : Date.now()
          }))
          : []
      };
    } catch {
      return freshProfile();
    }
  }

  let profile = loadProfile();
  const $ = id => document.getElementById(id);
  const rankFor = elo => [...ranks].reverse().find(rank => elo >= rank.min) || ranks[0];
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  function saveProfile() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch {}
    render();
  }

  function render() {
    const current = rankFor(profile.elo);
    const index = ranks.indexOf(current);
    const next = ranks[index + 1];
    const progress = next ? Math.max(0, Math.min(100, (profile.elo - current.min) / (next.min - current.min) * 100)) : 100;
    $('competitiveName').value = profile.name;
    $('eloValue').textContent = profile.elo.toLocaleString('es-AR');
    $('rankName').textContent = current.name;
    $('rankIcon').innerHTML = rankArtwork[current.key]
      ? `<img class="rank-current-image" src="${rankArtwork[current.key]}" alt="Insignia de rango ${escapeHtml(current.name)}">`
      : current.icon;
    $('rankIcon').style.color = current.color;
    $('rankOverview').style.setProperty('--rank-current', current.color);
    const progressBar = $('rankProgress');
    progressBar.setAttribute('aria-valuemin', String(current.min));
    progressBar.setAttribute('aria-valuemax', String(next ? next.min : current.min));
    progressBar.setAttribute('aria-valuenow', String(profile.elo));
    progressBar.setAttribute('aria-valuetext', next ? `${profile.elo} Elo; tramo ${current.min} a ${next.min} Elo; ${Math.max(0, next.min - profile.elo)} para ${next.name}` : 'Rango máximo alcanzado');
    $('rankProgressFill').style.width = progress + '%';
    $('rankProgressLabel').textContent = next ? `Tramo ${current.min.toLocaleString('es-AR')}–${next.min.toLocaleString('es-AR')} Elo · ${Math.max(0, next.min - profile.elo).toLocaleString('es-AR')} para ${next.name}` : 'Rango máximo alcanzado';
    $('rankProgressPercent').textContent = `${Math.round(progress)}%`;
    $('rankRecord').textContent = `${profile.wins} V · ${profile.draws} T · ${profile.losses} D`;
    $('rankedMatches').textContent = `${profile.wins + profile.draws + profile.losses} partidas clasificatorias`;
    $('jaqwinnBalance').textContent = profile.jaqwinn.toLocaleString('es-AR');
    $('jaqwinnReward').textContent = `+${current.reward} por partida competitiva en ${current.name}`;
    $('rankLadder').innerHTML = ranks.map((rank, rankIndex) => {
      const upper = ranks[rankIndex + 1]?.min;
      const active = current.name === rank.name;
      const state = active ? 'current' : rankIndex < index ? 'passed' : 'upcoming';
      const stateText = active ? 'Tu rango' : state === 'passed' ? 'Superado' : 'Por alcanzar';
      const range = upper ? `${rank.min.toLocaleString('es-AR')}–${(upper - 1).toLocaleString('es-AR')}` : `${rank.min.toLocaleString('es-AR')}+`;
      const badge = rankArtwork[rank.key]
        ? `<img class="rank-badge-image" src="${rankArtwork[rank.key]}" alt="">`
        : `<span class="rank-step-glyph">${rank.icon}</span>`;
      return `<article class="rank-step ${state}" style="--rank-color:${rank.color}" data-rank-slot="${rank.key}"><div class="rank-step-art${rankArtwork[rank.key] ? ' has-image' : ''}" aria-hidden="true">${badge}</div><div class="rank-step-copy"><div class="rank-step-heading"><strong>${rank.name}</strong><span class="rank-state-label">${stateText}</span></div><small>${range} Elo</small></div></article>`;
    }).join('');
    $('rankHistory').innerHTML = profile.history.length ? profile.history.map(item => {
      const mark = item.result === 'win' ? 'Victoria' : item.result === 'draw' ? 'Tablas' : 'Derrota';
      const sign = item.change > 0 ? '+' : '';
      return `<div class="rank-history-row"><span>${mark} <small>vs. ${escapeHtml(item.opponent || 'Rival')}</small></span><strong>${sign}${item.change} Elo <small>+${Number(item.jaqwinn) || 0} Jaqwinn</small></strong></div>`;
    }).join('') : '<div class="rank-history-empty">Tus resultados aparecerán aquí al terminar partidas clasificatorias.</div>';
  }

  function playerData() { return { name: profile.name, elo: profile.elo }; }

  function recordResult(winnerColor, opponentRating, opponentName) {
    const score = winnerColor === null ? 0.5 : winnerColor === window.JaqueOnline.getHumanColor() ? 1 : 0;
    const rival = Math.max(100, Math.min(4000, Math.round(Number(opponentRating) || 1000)));
    const expected = 1 / (1 + Math.pow(10, (rival - profile.elo) / 400));
    const before = profile.elo;
    const reward = rankFor(before).reward;
    const change = Math.round(K_FACTOR * (score - expected));
    profile.elo = Math.max(100, before + change);
    profile.jaqwinn = Math.min(1000000000, profile.jaqwinn + reward);
    if (score === 1) profile.wins++;
    else if (score === 0.5) profile.draws++;
    else profile.losses++;
    profile.history.unshift({ result: score === 1 ? 'win' : score === 0.5 ? 'draw' : 'loss', change: profile.elo - before, jaqwinn: reward, opponent: String(opponentName || 'Rival').slice(0, 24), at: Date.now() });
    profile.history = profile.history.slice(0, 12);
    saveProfile();
    const newRank = rankFor(profile.elo).name;
    const oldRank = rankFor(before).name;
    window.JaqueOnline.say(`Resultado guardado: ${change > 0 ? '+' : ''}${profile.elo - before} Elo · +${reward} Jaqwinn · ${newRank}${oldRank !== newRank ? ` ¡Subiste a ${newRank}!` : ''}`);
  }

  function enterCompetitive() {
    window.JaqueOnline.openCompetitive();
  }

  document.querySelector('[data-mode="competitive"]').onclick = enterCompetitive;
  $('competitiveName').addEventListener('change', () => {
    profile.name = $('competitiveName').value.trim().slice(0, 24) || 'Jugador';
    saveProfile();
  });
  $('quickMatchBtn').onclick = () => window.JaqueOnline.quickMatch();
  $('stopQuickMatchBtn').onclick = () => window.JaqueOnline.stopQuickMatch();
  $('createRankedRoom').onclick = () => window.JaqueOnline.startPeer('host', '');
  $('joinRankedRoom').onclick = () => {
    const raw = $('joinRankedId').value.trim();
    let room = raw;
    if (raw.includes('#room=')) {
      try { room = new URL(raw).hash.slice(6); } catch {}
    } else if (raw.includes('#')) room = raw.split('#').pop();
    try { room = decodeURIComponent(room).trim(); } catch {}
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(room)) {
      window.JaqueOnline.say('Pega un enlace o código de sala válido');
      return;
    }
    window.JaqueOnline.startPeer('guest', room);
  };
  $('copyRankedInvite').onclick = async () => {
    const invite = window.JaqueOnline.getInvite();
    try {
      await navigator.clipboard.writeText(invite);
      window.JaqueOnline.say('Enlace clasificatorio copiado');
    } catch {
      $('rankedRoomCode').textContent = invite;
      window.JaqueOnline.say('Copia el enlace que aparece en la sala');
    }
  };
  $('leaveRanked').onclick = () => window.JaqueOnline.close();
  $('rankedRoomCode').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.JaqueOnline.getInvite());
      window.JaqueOnline.say('Enlace clasificatorio copiado');
    } catch {}
  });

  window.JaqueCompetitive = { playerData, recordResult, render };
  render();
  Promise.all(ranks.map(async rank => {
    try {
      const response = await fetch(rank.image);
      if (!response.ok) return;
      const base64 = (await response.text()).trim();
      if (/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) rankArtwork[rank.key] = `data:image/png;base64,${base64}`;
    } catch {}
  })).then(render);
})();



