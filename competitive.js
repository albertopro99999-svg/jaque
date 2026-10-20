(() => {
  'use strict';

  const STORAGE_KEY = 'jaque-competitive-profile-v1';
  const K_FACTOR = 32;
  const ranks = [
    { name: 'Bronce', min: 100, icon: '♟', color: '#b97850' },
    { name: 'Plata', min: 1200, icon: '♞', color: '#b9c6cf' },
    { name: 'Oro', min: 1400, icon: '♝', color: '#e5bd55' },
    { name: 'Platino', min: 1600, icon: '♜', color: '#65d4c2' },
    { name: 'Experto', min: 1800, icon: '♛', color: '#bca0f4' },
    { name: 'Jaquers', min: 2000, icon: '♚', color: '#b5ef6a' }
  ];

  const freshProfile = () => ({ name: 'Jugador', elo: 1000, wins: 0, draws: 0, losses: 0, history: [] });
  function loadProfile() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return freshProfile();
      return {
        name: String(saved.name || 'Jugador').trim().slice(0, 24) || 'Jugador',
        elo: Number.isFinite(+saved.elo) ? Math.max(100, Math.min(4000, Math.round(+saved.elo))) : 1000,
        wins: Math.max(0, Number.parseInt(saved.wins, 10) || 0),
        draws: Math.max(0, Number.parseInt(saved.draws, 10) || 0),
        losses: Math.max(0, Number.parseInt(saved.losses, 10) || 0),
        history: Array.isArray(saved.history) ? saved.history.slice(0, 12) : []
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
    $('rankIcon').textContent = current.icon;
    $('rankIcon').style.color = current.color;
    $('rankProgressFill').style.width = progress + '%';
    $('rankProgressLabel').textContent = next ? `${Math.max(0, next.min - profile.elo)} Elo para ${next.name}` : 'Rango máximo alcanzado';
    $('rankRecord').textContent = `${profile.wins} V · ${profile.draws} T · ${profile.losses} D`;
    $('rankedMatches').textContent = `${profile.wins + profile.draws + profile.losses} partidas clasificatorias`;
    $('rankLadder').innerHTML = ranks.map(rank => {
      const upper = ranks[ranks.indexOf(rank) + 1]?.min;
      const active = current.name === rank.name;
      return `<div class="rank-step${active ? ' active' : ''}"><span class="rank-step-icon" style="--rank-color:${rank.color}">${rank.icon}</span><span><strong>${rank.name}</strong><small>${rank.min}${upper ? `–${upper - 1}` : '+'} Elo</small></span>${active ? '<b>ACTUAL</b>' : ''}</div>`;
    }).join('');
    $('rankHistory').innerHTML = profile.history.length ? profile.history.map(item => {
      const mark = item.result === 'win' ? 'Victoria' : item.result === 'draw' ? 'Tablas' : 'Derrota';
      const sign = item.change > 0 ? '+' : '';
      return `<div class="rank-history-row"><span>${mark} <small>vs. ${escapeHtml(item.opponent || 'Rival')}</small></span><strong>${sign}${item.change} Elo</strong></div>`;
    }).join('') : '<div class="rank-history-empty">Tus resultados aparecerán aquí al terminar partidas clasificatorias.</div>';
  }

  function playerData() { return { name: profile.name, elo: profile.elo }; }

  function recordResult(winnerColor, opponentRating, opponentName) {
    const score = winnerColor === null ? 0.5 : winnerColor === window.JaqueOnline.getHumanColor() ? 1 : 0;
    const rival = Math.max(100, Math.min(4000, Math.round(Number(opponentRating) || 1000)));
    const expected = 1 / (1 + Math.pow(10, (rival - profile.elo) / 400));
    const before = profile.elo;
    const change = Math.round(K_FACTOR * (score - expected));
    profile.elo = Math.max(100, before + change);
    if (score === 1) profile.wins++;
    else if (score === 0.5) profile.draws++;
    else profile.losses++;
    profile.history.unshift({ result: score === 1 ? 'win' : score === 0.5 ? 'draw' : 'loss', change: profile.elo - before, opponent: String(opponentName || 'Rival').slice(0, 24), at: Date.now() });
    profile.history = profile.history.slice(0, 12);
    saveProfile();
    const newRank = rankFor(profile.elo).name;
    const oldRank = rankFor(before).name;
    window.JaqueOnline.say(`Resultado guardado: ${change > 0 ? '+' : ''}${profile.elo - before} Elo · ${newRank}${oldRank !== newRank ? ` ¡Subiste a ${newRank}!` : ''}`);
  }

  function enterCompetitive() {
    window.JaqueOnline.openCompetitive();
  }

  document.querySelector('[data-mode="competitive"]').onclick = enterCompetitive;
  $('competitiveName').addEventListener('change', () => {
    profile.name = $('competitiveName').value.trim().slice(0, 24) || 'Jugador';
    saveProfile();
  });
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
})();

