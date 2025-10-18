/* Clean Stream Game */
(function(){
	const canvas = document.getElementById('gameCanvas');
	const ctx = canvas.getContext('2d');
	const playBtn = document.getElementById('playBtn');
	const aboutBtn = document.getElementById('aboutBtn');
	const donateBtn = document.getElementById('donateBtn');
	const tutorialBtn = document.getElementById('tutorialBtn');
	const mobileInstrBtn = document.getElementById('mobileInstrBtn');
	const difficultyBtn = document.getElementById('difficultyBtn');
	const cleanBtn = document.getElementById('cleanBtn');
	const resetBtn = document.getElementById('resetBtn');
	const quitBtn = document.getElementById('quitBtn');
	const overlay = document.getElementById('overlay');
	const overlayContent = document.getElementById('overlayContent');
	const overlayClose = document.getElementById('overlayClose');
	const milestonePopup = document.getElementById('milestonePopup');
	const milestoneTitle = document.getElementById('milestoneTitle');
	const milestoneFact = document.getElementById('milestoneFact');
	const milestoneClose = document.getElementById('milestoneClose');
	const popupDonateBtn = document.getElementById('popupDonateBtn');
	const endScreen = document.getElementById('endScreen');
	const endTitle = document.getElementById('endTitle');
	const endSummary = document.getElementById('endSummary');
	const badgeArea = document.getElementById('badgeArea');
	const playAgainBtn = document.getElementById('playAgainBtn');
	const nextLevelBtn = document.getElementById('nextLevelBtn');
	const endDonateBtn = document.getElementById('endDonateBtn');
	const cleanBar = document.getElementById('cleanBar');
	const cleanPercent = document.getElementById('cleanPercent');
	const scoreEl = document.getElementById('score');
	const dropsEl = document.getElementById('drops');
	const timerEl = document.getElementById('timer');
	const levelEl = document.getElementById('level');
	const highScoreEl = document.getElementById('highScore');
	const difficultyLabel = document.getElementById('difficultyLabel');
	const joystick = document.getElementById('joystick');
	const confetti = document.getElementById('confetti');
	const soundToggle = document.getElementById('soundToggle');

	const screens = {
		splash: document.getElementById('splash'),
		game: document.getElementById('gameUI')
	};

	const FACTS = [
		'1 in 10 people lack access to clean water.',
		'Diseases from dirty water kill more people every year than all forms of violence.',
		'Access to clean water can improve school attendance for children.',
		'Women and girls spend 200 million hours daily collecting water.',
		'Clean water helps break the cycle of poverty.'
	];

	const MILESTONES = [25,50,75];
	const DIFFICULTY_SETTINGS = {
		Easy:   { pollutants: 10, time: 70, speed: 2.4, droplets:5 },
		Medium: { pollutants: 16, time: 60, speed: 2.8, droplets:7 },
		Hard:   { pollutants: 22, time: 55, speed: 3.2, droplets:9 }
	};

	const STATE = {
		current:'splash',
		level:1,
		difficulty:'Easy',
		pollutants:[],
		droplets:[],
		obstacles:[],
		cleaned:0,
		score:0,
		dropsCollected:0,
		timeLeft:0,
		boat:null,
		milestoneIndex:0,
		highScore: parseInt(localStorage.getItem('cleanStreamHighScore')||'0',10),
		badges: JSON.parse(localStorage.getItem('cleanStreamBadges')||'[]'),
		lastFrame: 0,
		joystick: { active:false, x:0, y:0},
		paused:false,
		audioCtx:null,
		soundOn:true,
		menuMusic:null,
		gameMusic:null,
		menuMusicInterval:null,
		gameMusicInterval:null
	};
	highScoreEl.textContent = STATE.highScore;

	function setState(newState){ STATE.current = newState; }
	function showScreen(name){ Object.values(screens).forEach(s=>s.classList.add('hidden')); screens[name].classList.remove('hidden'); }

	function random(min,max){ return Math.random()*(max-min)+min; }
	function uuid(){ return Math.random().toString(36).slice(2,9); }

	function initBoat(){
		STATE.boat = {
			x: canvas.width/2,
			y: canvas.height - 80,
			w: 70,
			h: 40,
			vx:0, vy:0
		};
	}

	function spawnEntities(){
		const settings = DIFFICULTY_SETTINGS[STATE.difficulty];
		STATE.pollutants = [];
		const types = ['plastic','oil','trash'];
		for(let i=0;i<settings.pollutants;i++){
			STATE.pollutants.push({
				id: uuid(),
				type: types[Math.floor(Math.random()*types.length)],
				x: random(40, canvas.width-100),
				y: random(40, canvas.height-160),
				w: 46,
				h: 46,
				cleaned:false
			});
		}
		// droplets
		STATE.droplets = [];
		for(let i=0;i<settings.droplets;i++){
			STATE.droplets.push({ id: uuid(), x: random(30, canvas.width-60), y: random(30, canvas.height-140), w:26, h:34, collected:false });
		}
		// obstacles (toxic barrel) reduce score
		STATE.obstacles = [];
		for(let i=0;i<Math.floor(settings.pollutants/5); i++){
			STATE.obstacles.push({ id: uuid(), type:'barrel', x: random(50, canvas.width-90), y: random(60, canvas.height-200), w:46, h:60 });
		}
	}

	function cleanlinessPercent(){
		const total = STATE.pollutants.length;
		const cleaned = STATE.pollutants.filter(p=>p.cleaned).length;
		return total? Math.round(cleaned/total*100) : 0;
	}

	function updateHUD(){
		const pct = cleanlinessPercent();
		cleanBar.style.width = pct + '%';
		cleanPercent.textContent = pct + '%';
		scoreEl.textContent = STATE.score;
		dropsEl.textContent = STATE.dropsCollected;
		timerEl.textContent = STATE.timeLeft.toFixed(0);
		levelEl.textContent = STATE.level;
		highScoreEl.textContent = STATE.highScore;
	}

	function startLevel(){
		setState('playing');
		stopMenuMusic(); startGameMusic();
		const settings = DIFFICULTY_SETTINGS[STATE.difficulty];
		STATE.timeLeft = settings.time;
		STATE.milestoneIndex = 0;
		spawnEntities();
		initBoat();
		showScreen('game');
		requestAnimationFrame(gameLoop);
	}

	function openOverlay(html){ overlayContent.innerHTML = html; overlay.classList.remove('hidden'); }
	function closeOverlay(){ overlay.classList.add('hidden'); }
	overlayClose.addEventListener('click', closeOverlay);

	function showMilestone(pct){
		milestoneTitle.textContent = 'River ' + pct + '% Clean!';
		const fact = FACTS[(pct/25 -1) % FACTS.length];
		milestoneFact.textContent = fact;
		milestonePopup.classList.remove('hidden');
		STATE.paused = true; // pause timer & movement
		// award badge
		const badgeId = 'milestone-'+pct;
		if(!STATE.badges.includes(badgeId)){
			STATE.badges.push(badgeId);
			persistBadges();
		}
		STATE.score += 50; // milestone bonus
	}
	milestoneClose.addEventListener('click', ()=> { milestonePopup.classList.add('hidden'); STATE.paused=false; STATE.lastFrame=performance.now(); });
	popupDonateBtn.addEventListener('click', ()=> window.open('https://www.charitywater.org/donate','_blank'));

	function showEnd(type){
		endScreen.classList.remove('hidden');
		stopGameMusic(); // stop action music during end screen
		let title, summary;
		const pct = cleanlinessPercent();
		if(type==='victory'){
			title = 'River Restored!';
			summary = 'Final Score: '+STATE.score+' | Cleanliness: '+pct+'% | Droplets: '+STATE.dropsCollected;
				launchConfetti();
				playCelebrationMusic();
		} else if(type==='level'){
			title = 'Level Complete';
			summary = 'Score: '+STATE.score+' | Cleanliness: '+pct+'%';
			nextLevelBtn.classList.remove('hidden');
				launchConfetti();
				playCelebrationMusic();
		} else {
			title = 'Time\'s Up!';
			summary = 'You cleaned '+pct+'% of the river. Score: '+STATE.score;
				playFailureSound();
		}
		endTitle.textContent = title;
		endSummary.textContent = summary;
		badgeArea.innerHTML = STATE.badges.map(b=>'<span class="badge">'+b+'</span>').join('');
		if(STATE.score > STATE.highScore){ STATE.highScore = STATE.score; localStorage.setItem('cleanStreamHighScore', STATE.highScore); }
		updateHUD();
	}
	playAgainBtn.addEventListener('click', ()=> { endScreen.classList.add('hidden'); resetGame(); });
	nextLevelBtn.addEventListener('click', ()=> { endScreen.classList.add('hidden'); nextLevelBtn.classList.add('hidden'); STATE.level++; startLevel(); });
	endDonateBtn.addEventListener('click', ()=> window.open('https://www.charitywater.org/donate','_blank'));

	function persistBadges(){ localStorage.setItem('cleanStreamBadges', JSON.stringify(STATE.badges)); }

	function resetGame(){
		STATE.score = 0; STATE.dropsCollected=0; STATE.level=1; STATE.badges=[]; persistBadges(); startLevel();
	}

	function cycleDifficulty(){
		const order = ['Easy','Medium','Hard'];
		const idx = order.indexOf(STATE.difficulty);
		STATE.difficulty = order[(idx+1)%order.length];
		difficultyLabel.textContent = STATE.difficulty;
	}
	difficultyBtn.addEventListener('click', cycleDifficulty);

	// Sound toggle setup
	soundToggle?.addEventListener('click', () => {
		STATE.soundOn = !STATE.soundOn;
		if(soundToggle){
			soundToggle.textContent = 'Sound: ' + (STATE.soundOn ? 'On' : 'Off');
			soundToggle.setAttribute('aria-pressed', STATE.soundOn ? 'true' : 'false');
		}
		if(!STATE.soundOn && STATE.audioCtx){ try { STATE.audioCtx.suspend(); } catch(e){} }
		else if(STATE.soundOn && STATE.audioCtx?.state === 'suspended'){ STATE.audioCtx.resume(); }
	});

	function ensureAudio(){ if(!STATE.audioCtx){ STATE.audioCtx = new (window.AudioContext||window.webkitAudioContext)(); } return STATE.audioCtx; }

	function playCleaningSound(){ if(!STATE.soundOn) return; const actx = ensureAudio();
		const osc = actx.createOscillator(); const gain = actx.createGain();
		osc.type='triangle'; osc.frequency.setValueAtTime(520, actx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(880, actx.currentTime+0.18);
		gain.gain.setValueAtTime(0.001, actx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.25, actx.currentTime+0.03);
		gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime+0.28);
		osc.connect(gain).connect(actx.destination);
		osc.start(); osc.stop(actx.currentTime+0.3);
	}

	function playCelebrationMusic(){ if(!STATE.soundOn) return; const actx = ensureAudio();
		const notes = [523.25,659.25,783.99,1046.5]; // C5 E5 G5 C6
		notes.forEach((f,i)=>{
			const osc = actx.createOscillator(); const gain = actx.createGain();
			osc.type='sine'; osc.frequency.value=f;
			gain.gain.setValueAtTime(0.0001, actx.currentTime + i*0.18);
			gain.gain.exponentialRampToValueAtTime(0.35, actx.currentTime + i*0.18 + 0.06);
			gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + i*0.18 + 0.75);
			osc.connect(gain).connect(actx.destination);
			osc.start(actx.currentTime + i*0.18);
			osc.stop(actx.currentTime + i*0.18 + 0.78);
		});
		// Noise burst for excitement
		const bufferSize = 0.4 * actx.sampleRate; const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate); const data = buffer.getChannelData(0);
		for(let i=0;i<bufferSize;i++){ data[i] = (Math.random()*2-1) * Math.pow(1 - i/bufferSize, 2); }
		const noise = actx.createBufferSource(); noise.buffer = buffer; const ng = actx.createGain(); ng.gain.setValueAtTime(0.25, actx.currentTime); ng.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime+0.4); noise.connect(ng).connect(actx.destination); noise.start();
	}

	// Failure sound (timer runs out)
	function playFailureSound(){ // Car crash impact: metallic clang + glass shatter + low thud
		if(!STATE.soundOn) return; const actx = ensureAudio();
		const now = actx.currentTime;
		// Low thud (quick pitch drop)
		const thud = actx.createOscillator(); thud.type='sine'; thud.frequency.setValueAtTime(160, now); thud.frequency.exponentialRampToValueAtTime(60, now+0.5); const thudGain = actx.createGain(); thudGain.gain.setValueAtTime(0.6, now); thudGain.gain.exponentialRampToValueAtTime(0.0001, now+0.55); thud.connect(thudGain).connect(actx.destination); thud.start(); thud.stop(now+0.56);
		// Metallic clang (frequency burst with FM feel)
		for(let i=0;i<3;i++){ const osc = actx.createOscillator(); osc.type='square'; osc.frequency.setValueAtTime(420 + i*40, now); osc.frequency.exponentialRampToValueAtTime(120 + i*30, now+0.35); const g = actx.createGain(); g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.5/(i+1), now+0.02); g.gain.exponentialRampToValueAtTime(0.0001, now+0.4); osc.connect(g).connect(actx.destination); osc.start(); osc.stop(now+0.42); }
		// Glass shatter (high-passed noise with exponential decay and small random pings)
		const size = 0.5 * actx.sampleRate; const buf = actx.createBuffer(1,size,actx.sampleRate); const data = buf.getChannelData(0); for(let i=0;i<size;i++){ data[i] = (Math.random()*2-1) * Math.pow(1 - i/size, 0.3); }
		const src = actx.createBufferSource(); src.buffer = buf; const hp = actx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=1800; const glassGain = actx.createGain(); glassGain.gain.setValueAtTime(0.45, now); glassGain.gain.exponentialRampToValueAtTime(0.0001, now+0.6); src.connect(hp).connect(glassGain).connect(actx.destination); src.start();
		// Random glass pings (short sine blips)
		for(let i=0;i<6;i++){ const ping = actx.createOscillator(); ping.type='sine'; ping.frequency.value=1200 + Math.random()*800; const pg = actx.createGain(); const startT = now + 0.05 + Math.random()*0.25; pg.gain.setValueAtTime(0.0001, startT); pg.gain.exponentialRampToValueAtTime(0.3, startT+0.01); pg.gain.exponentialRampToValueAtTime(0.0001, startT+0.18); ping.connect(pg).connect(actx.destination); ping.start(startT); ping.stop(startT+0.19); }
	}

	// Droplet pickup sound
	function playDropletSound(){ if(!STATE.soundOn) return; const actx = ensureAudio(); const osc = actx.createOscillator(); const gain = actx.createGain(); osc.type='square'; osc.frequency.setValueAtTime(660, actx.currentTime); osc.frequency.exponentialRampToValueAtTime(990, actx.currentTime+0.15); gain.gain.setValueAtTime(0.0001, actx.currentTime); gain.gain.exponentialRampToValueAtTime(0.3, actx.currentTime+0.02); gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime+0.25); osc.connect(gain).connect(actx.destination); osc.start(); osc.stop(actx.currentTime+0.27); }

	// Toxic attempt sound (player tries to clean obstacle)
	function playToxicAttemptSound(){ // Warning: dissonant tri-tone + buzzy noise
		if(!STATE.soundOn) return; const actx = ensureAudio();
		const freqs = [260, 368, 520]; // clashy set
		freqs.forEach((f,i)=>{ const o = actx.createOscillator(); const g=actx.createGain(); o.type='square'; o.frequency.value=f; const startT = actx.currentTime + i*0.01; g.gain.setValueAtTime(0.0001,startT); g.gain.exponentialRampToValueAtTime(0.28,startT+0.04); g.gain.exponentialRampToValueAtTime(0.0001,startT+0.3); o.connect(g).connect(actx.destination); o.start(startT); o.stop(startT+0.31); });
		// Buzz noise
		const size = 0.2 * actx.sampleRate; const buffer = actx.createBuffer(1,size,actx.sampleRate); const d = buffer.getChannelData(0); for(let i=0;i<size;i++){ d[i] = (Math.random()*2-1) * (1 - i/size); }
		const src = actx.createBufferSource(); src.buffer = buffer; const bp = actx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=600; const gain = actx.createGain(); gain.gain.setValueAtTime(0.15, actx.currentTime); gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime+0.25); src.connect(bp).connect(gain).connect(actx.destination); src.start();
	}

	// Background music helpers (simple looped ambient pad)
	function startMenuMusic(){
		if(!STATE.soundOn) return; if(STATE.menuMusic) return; const actx = ensureAudio();
		// Continuous water noise (filtered white noise with gentle modulation)
		const noiseSize = 2 * actx.sampleRate; const noiseBuffer = actx.createBuffer(1, noiseSize, actx.sampleRate); const nd = noiseBuffer.getChannelData(0);
		for(let i=0;i<noiseSize;i++){ nd[i] = (Math.random()*2-1) * 0.6; }
		const noiseSrc = actx.createBufferSource(); noiseSrc.loop = true; noiseSrc.buffer = noiseBuffer;
		const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1400; const hp = actx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=280;
		const flowGain = actx.createGain(); flowGain.gain.value=0.22;
		noiseSrc.connect(hp).connect(lp).connect(flowGain).connect(actx.destination); noiseSrc.start(); STATE.menuMusic = noiseSrc;
		// Gentle lfo modulating lowpass cutoff (simulate varying stream)
		const lfo = actx.createOscillator(); lfo.type='sine'; lfo.frequency.value=0.15; const lfoGain = actx.createGain(); lfoGain.gain.value=320; lfo.connect(lfoGain).connect(lp.frequency); lfo.start(); STATE.menuLFO = lfo;
		// Occasional droplet plinks
		STATE.menuMusicInterval = setInterval(()=>{
			if(!STATE.soundOn) return; if(Math.random()<0.6){ const drop = actx.createOscillator(); const g=actx.createGain(); drop.type='sine'; const f = [660,740,880][Math.floor(Math.random()*3)]; drop.frequency.value=f; g.gain.setValueAtTime(0.0001, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.25, actx.currentTime+0.02); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime+0.4); drop.connect(g).connect(actx.destination); drop.start(); drop.stop(actx.currentTime+0.42); }
		}, 900);
	}
	function stopMenuMusic(){ if(STATE.menuMusic){ try{ STATE.menuMusic.stop(); }catch(e){} STATE.menuMusic=null; } if(STATE.menuLFO){ try{ STATE.menuLFO.stop(); }catch(e){} STATE.menuLFO=null; } if(STATE.menuMusicInterval){ clearInterval(STATE.menuMusicInterval); STATE.menuMusicInterval=null; } }

	function startGameMusic(){
		if(!STATE.soundOn) return; if(STATE.gameMusic) return; const actx = ensureAudio();
		// Stronger rushing water: layered noise bands
		const bands = [400, 900, 1600]; const sources = []; const masterGain = actx.createGain(); masterGain.gain.value=0.25; masterGain.connect(actx.destination);
		bands.forEach((center,i)=>{ const size = 2 * actx.sampleRate; const buf = actx.createBuffer(1,size,actx.sampleRate); const data = buf.getChannelData(0); for(let j=0;j<size;j++){ data[j] = (Math.random()*2-1) * 0.5; } const src = actx.createBufferSource(); src.buffer=buf; src.loop=true; const bp = actx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=center; bp.Q.value=1.2; const g=actx.createGain(); g.gain.value=0.18 + i*0.04; src.connect(bp).connect(g).connect(masterGain); src.start(); sources.push(src); });
		STATE.gameWaterSources = sources; STATE.gameMusic = sources[0];
		// LFO modulating master gain for gentle surges
		const lfo = actx.createOscillator(); lfo.type='sine'; lfo.frequency.value=0.22; const lfoGain = actx.createGain(); lfoGain.gain.value=0.06; lfo.connect(lfoGain).connect(masterGain.gain); lfo.start(); STATE.gameLFO = lfo;
		// Droplet and whoosh events
		STATE.gameMusicInterval = setInterval(()=>{
			if(!STATE.soundOn) return;
			// Droplet plink (lower pitched than menu to differentiate)
			if(Math.random()<0.7){ const drop = actx.createOscillator(); const g=actx.createGain(); drop.type='sine'; const f = [520,600,680][Math.floor(Math.random()*3)]; drop.frequency.value=f; g.gain.setValueAtTime(0.0001, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.28, actx.currentTime+0.02); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime+0.42); drop.connect(g).connect(actx.destination); drop.start(); drop.stop(actx.currentTime+0.44); }
			// Occasional whoosh (broad filtered noise swell)
			if(Math.random()<0.35){ const size = 0.7 * actx.sampleRate; const buf = actx.createBuffer(1,size,actx.sampleRate); const d = buf.getChannelData(0); for(let k=0;k<size;k++){ d[k] = (Math.random()*2-1) * Math.pow(1 - k/size,0.8); } const src = actx.createBufferSource(); src.buffer=buf; const filt = actx.createBiquadFilter(); filt.type='lowpass'; filt.frequency.setValueAtTime(1800, actx.currentTime); filt.frequency.exponentialRampToValueAtTime(600, actx.currentTime+0.6); const g=actx.createGain(); g.gain.setValueAtTime(0.0001, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.3, actx.currentTime+0.08); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime+0.75); src.connect(filt).connect(g).connect(actx.destination); src.start(); }
		}, 1000);
	}
	function stopGameMusic(){ if(STATE.gameWaterSources){ STATE.gameWaterSources.forEach(s=>{ try{ s.stop(); }catch(e){} }); STATE.gameWaterSources=null; } if(STATE.gameLFO){ try{ STATE.gameLFO.stop(); }catch(e){} STATE.gameLFO=null; } if(STATE.gameMusicInterval){ clearInterval(STATE.gameMusicInterval); STATE.gameMusicInterval=null; } STATE.gameMusic=null; }

	playBtn.addEventListener('click', ()=> startLevel());
	playBtn.addEventListener('click', ()=> { stopMenuMusic(); startGameMusic(); startLevel(); });
	aboutBtn.addEventListener('click', ()=> openOverlay('<h2>About Clean Water</h2><p>Access to clean water changes everything: health, education, and opportunity. This game highlights the importance of removing pollutants.</p>')); 
	tutorialBtn.addEventListener('click', ()=> openOverlay('<h2>Tutorial</h2><p>Use arrow keys or joystick to steer your boat. Press Space or Clean button near pollutants to remove them (+10 points). Collect droplets (+5). Reach cleanliness milestones for bonus points and facts.</p>'));
	mobileInstrBtn.addEventListener('click', ()=> openOverlay('<h2>Mobile Controls</h2><ul><li>Drag the joystick to move.</li><li>Tap the Clean button near pollutants.</li><li>Collect water droplets for bonus points.</li></ul>'));
	donateBtn.addEventListener('click', ()=> window.open('https://www.charitywater.org/donate','_blank'));
	quitBtn.addEventListener('click', ()=> { setState('splash'); showScreen('splash'); });
	quitBtn.addEventListener('click', ()=> { setState('splash'); showScreen('splash'); stopGameMusic(); startMenuMusic(); });
	// Start menu music initially
	startMenuMusic();
	resetBtn.addEventListener('click', ()=> resetGame());

	// Input handling
	window.addEventListener('keydown', e=>{
		if(STATE.current!=='playing') return;
		const b = STATE.boat; const speed = DIFFICULTY_SETTINGS[STATE.difficulty].speed;
		if(e.key==='ArrowLeft') b.vx = -speed;
		if(e.key==='ArrowRight') b.vx = speed;
		if(e.key==='ArrowUp') b.vy = -speed;
		if(e.key==='ArrowDown') b.vy = speed;
		if(e.key===' '){ attemptClean(); }
	});
	window.addEventListener('keyup', e=>{
		if(STATE.current!=='playing') return;
		const b = STATE.boat;
		if(['ArrowLeft','ArrowRight'].includes(e.key)) b.vx = 0;
		if(['ArrowUp','ArrowDown'].includes(e.key)) b.vy = 0;
	});
	cleanBtn.addEventListener('click', ()=> attemptClean());

	// Virtual joystick
	function setupJoystick(){
		const stick = joystick.querySelector('.stick');
		function pointerDown(ev){ STATE.joystick.active=true; moveStick(ev); }
		function pointerUp(){ STATE.joystick.active=false; stick.style.transform='translate(-50%,-50%)'; STATE.boat.vx=0; STATE.boat.vy=0; }
		function moveStick(ev){
			if(!STATE.joystick.active) return; const rect = joystick.getBoundingClientRect();
			const x = ev.clientX - rect.left - rect.width/2; const y = ev.clientY - rect.top - rect.height/2;
			const max = rect.width/2 - 20; const dx = Math.max(-max, Math.min(max,x)); const dy = Math.max(-max, Math.min(max,y));
			stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
			const speed = DIFFICULTY_SETTINGS[STATE.difficulty].speed;
			STATE.boat.vx = (dx/max)*speed;
			STATE.boat.vy = (dy/max)*speed;
		}
		joystick.addEventListener('pointerdown', pointerDown);
		window.addEventListener('pointerup', pointerUp);
		window.addEventListener('pointermove', moveStick);
	}
	setupJoystick();

	function attemptClean(){
		const b = STATE.boat; if(!b) return;
		const target = STATE.pollutants.find(p=>!p.cleaned && overlap(b,p));
		if(target){
			target.cleaned = true;
			STATE.score += 10;
			spawnSparkle(target.x + target.w/2, target.y + target.h/2);
			playCleaningSound();
		}
		const droplet = STATE.droplets.find(d=>!d.collected && overlap(b,d));
		if(droplet){ droplet.collected = true; STATE.dropsCollected++; STATE.score += 5; STATE.timeLeft += 1; playDropletSound(); }
		// Toxic attempt: near obstacle but space pressed (no cleaning effect)
		const nearObstacle = STATE.obstacles.find(o=> overlap(b,o));
		if(!target && nearObstacle){ STATE.timeLeft = Math.max(0, STATE.timeLeft - 10); playToxicAttemptSound(); }
	}

	function overlap(a,b){ return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

	function gameLoop(ts){
		if(STATE.current!=='playing') return; const dt = (ts-STATE.lastFrame)/1000 || 0; STATE.lastFrame = ts;
		if(!STATE.paused){ STATE.timeLeft -= dt; }
		updateBoat();
		checkMilestones();
		render();
		updateHUD();
		checkEndConditions();
		requestAnimationFrame(gameLoop);
	}

	function updateBoat(){
		const b = STATE.boat; if(!b) return; if(!STATE.paused){ b.x += b.vx; b.y += b.vy; } b.x = Math.max(0, Math.min(canvas.width - b.w, b.x)); b.y = Math.max(0, Math.min(canvas.height - b.h, b.y));
		// obstacle collision penalty
		STATE.obstacles.forEach(ob=>{ if(overlap(b,ob)){ STATE.score = Math.max(0, STATE.score - 10); } });
	}

	function checkMilestones(){
		const pct = cleanlinessPercent();
		if(STATE.milestoneIndex < MILESTONES.length && pct >= MILESTONES[STATE.milestoneIndex]){
			showMilestone(MILESTONES[STATE.milestoneIndex]);
			STATE.milestoneIndex++;
		}
	}

	function checkEndConditions(){
		const pct = cleanlinessPercent();
		if(pct >= 100){ // level finished
			setState('levelComplete');
			STATE.score += 100; // level bonus
			if(STATE.level >= 3){ setState('victory'); showEnd('victory'); }
			else { showEnd('level'); }
		} else if(STATE.timeLeft <= 0){ setState('gameOver'); showEnd('fail'); }
	}

	function render(){
		ctx.clearRect(0,0,canvas.width,canvas.height);
		drawWater();
		drawEntities();
		drawBoat();
	}
	function drawWater(){
		// subtle ripple overlay
		ctx.save();
		ctx.globalAlpha = 0.08;
		for(let i=0;i<12;i++){
			ctx.beginPath();
			ctx.arc(canvas.width/2, canvas.height/2, i*60 + (Date.now()/400 % 60), 0, Math.PI*2);
			ctx.strokeStyle = '#3ad1ff';
			ctx.lineWidth = 2;
			ctx.stroke();
		}
		ctx.restore();
	}
	function drawEntities(){
		STATE.pollutants.forEach(p=>{ if(p.cleaned) return; drawPollutant(p); });
		STATE.droplets.forEach(d=>{ if(d.collected) return; drawDroplet(d); });
		STATE.obstacles.forEach(o=> drawObstacle(o));
	}
	function drawPollutant(p){
		ctx.save();
		if(p.type==='plastic'){
			// Cartoonish plastic bottle: translucent body + cap + label
			const bottleW=26, bottleH=60; const bx = p.x; const by = p.y;
			ctx.globalAlpha = 0.85;
			const bodyGrad = ctx.createLinearGradient(bx,by,bx,by+bottleH);
			bodyGrad.addColorStop(0,'#e9f9ff'); bodyGrad.addColorStop(1,'#b3e1f3');
			ctx.fillStyle = bodyGrad;
			roundRect(ctx,bx,by,bottleW,bottleH,8,true,false);
			// label
			ctx.globalAlpha = 0.95; ctx.fillStyle='rgba(173,226,241,0.85)'; roundRect(ctx,bx+3,by+18,bottleW-6,14,4,true,false);
			// cap
			ctx.globalAlpha = 1; ctx.fillStyle='#3fa1c8'; roundRect(ctx,bx+4,by-6,bottleW-8,10,3,true,false);
			// highlight
			ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(bx+6,by+8); ctx.lineTo(bx+6,by+bottleH-10); ctx.stroke();
		} else if(p.type==='oil'){
			// Realistic oil slick: irregular blob with rainbow sheen
			const radiusX=40, radiusY=24; const cx=p.x+radiusX/2, cy=p.y+radiusY/2;
			ctx.beginPath();
			ctx.ellipse(cx,cy,radiusX,radiusY,0,0,Math.PI*2);
			const oilGrad = ctx.createRadialGradient(cx,cy,8,cx,cy,radiusX);
			oilGrad.addColorStop(0,'#222'); oilGrad.addColorStop(0.4,'#000'); oilGrad.addColorStop(1,'#050505');
			ctx.fillStyle = oilGrad; ctx.fill();
			// sheen
			ctx.globalCompositeOperation='overlay';
			const sheenGrad = ctx.createLinearGradient(p.x,p.y,p.x+radiusX,p.y+radiusY);
			sheenGrad.addColorStop(0,'rgba(255,0,200,0.25)');
			sheenGrad.addColorStop(0.5,'rgba(0,255,255,0.35)');
			sheenGrad.addColorStop(1,'rgba(255,255,0,0.25)');
			ctx.fillStyle = sheenGrad; ctx.beginPath(); ctx.ellipse(cx,cy,radiusX*0.85,radiusY*0.65,0,0,Math.PI*2); ctx.fill();
			ctx.globalCompositeOperation='source-over';
		} else { // trash -> rotting food pile
			const baseX=p.x, baseY=p.y, w=50, h=40; 
			// Moldy base
			const moldGrad = ctx.createLinearGradient(baseX,baseY,baseX,baseY+h);
			moldGrad.addColorStop(0,'#6b7d31'); moldGrad.addColorStop(1,'#3e4a1d');
			ctx.fillStyle = moldGrad;
			ctx.beginPath(); ctx.moveTo(baseX,baseY+h*0.4); ctx.quadraticCurveTo(baseX+w*0.5,baseY-h*0.4,baseX+w,baseY+h*0.4); ctx.lineTo(baseX+w,baseY+h); ctx.quadraticCurveTo(baseX+w*0.5,baseY+h*1.2,baseX,baseY+h); ctx.closePath(); ctx.fill();
			// Bits of food (bones, banana peel)
			ctx.strokeStyle='#d9d9d9'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(baseX+10,baseY+20); ctx.lineTo(baseX+18,baseY+28); ctx.stroke();
			ctx.beginPath(); ctx.moveTo(baseX+15,baseY+20); ctx.lineTo(baseX+23,baseY+28); ctx.stroke();
			// Banana peel
			ctx.fillStyle='#c2a112'; ctx.beginPath(); ctx.moveTo(baseX+30,baseY+18); ctx.quadraticCurveTo(baseX+42,baseY+10,baseX+38,baseY+28); ctx.quadraticCurveTo(baseX+34,baseY+22,baseX+30,baseY+18); ctx.fill();
			// Flies (small dots)
			ctx.fillStyle='#000'; for(let i=0;i<4;i++){ ctx.beginPath(); ctx.arc(baseX+12+i*8, baseY+10+Math.random()*12, 1.5,0,Math.PI*2); ctx.fill(); }
		}
		ctx.restore();
	}
	function drawDroplet(d){
		ctx.save();
		const g = ctx.createRadialGradient(d.x+10,d.y+10,8,d.x+10,d.y+10,16); g.addColorStop(0,'#9ee7ff'); g.addColorStop(1,'#1dbbe6');
		ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(d.x+13,d.y); ctx.quadraticCurveTo(d.x+26,d.y+18,d.x+13,d.y+34); ctx.quadraticCurveTo(d.x,d.y+18,d.x+13,d.y); ctx.fill();
		ctx.restore();
	}
	function drawObstacle(o){
		ctx.save();
		const grad = ctx.createLinearGradient(o.x,o.y,o.x,o.y+60); grad.addColorStop(0,'#9d6a23'); grad.addColorStop(0.5,'#5c3b16'); grad.addColorStop(1,'#9d6a23');
		ctx.fillStyle = grad; roundRect(ctx,o.x,o.y,46,60,8,true,false);
		ctx.fillStyle='#f5d10b'; ctx.font='20px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('☣', o.x+23,o.y+30);
		ctx.restore();
	}
	function drawBoat(){
		const b = STATE.boat; if(!b) return; ctx.save();
		// Wooden row boat hull (ellipse with inner shadow & plank lines)
		const hullGrad = ctx.createLinearGradient(b.x,b.y,b.x,b.y+b.h);
		hullGrad.addColorStop(0,'#c07a2a');
		hullGrad.addColorStop(.5,'#8b5a21');
		hullGrad.addColorStop(1,'#5a3a18');
		ctx.fillStyle = hullGrad;
		ctx.beginPath();
		ctx.moveTo(b.x + b.w*0.1, b.y);
		ctx.quadraticCurveTo(b.x + b.w/2, b.y - b.h*0.6, b.x + b.w*0.9, b.y);
		ctx.lineTo(b.x + b.w*0.95, b.y + b.h*0.85);
		ctx.quadraticCurveTo(b.x + b.w/2, b.y + b.h + b.h*0.3, b.x + b.w*0.05, b.y + b.h*0.85);
		ctx.closePath();
		ctx.fill();
		// Rim
		ctx.strokeStyle = '#d9a152';
		ctx.lineWidth = 3; ctx.stroke();
		// Plank lines
		ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
		for(let i=1;i<4;i++){ ctx.beginPath(); ctx.moveTo(b.x + b.w*0.12, b.y + (b.h*0.2*i)); ctx.lineTo(b.x + b.w*0.88, b.y + (b.h*0.2*i)); ctx.stroke(); }
		// Bench
		ctx.fillStyle = '#b9813c';
		ctx.fillRect(b.x + b.w*0.25, b.y + b.h*0.45, b.w*0.5, b.h*0.12);
		// Simple oar representation (side)
		ctx.strokeStyle='#d9a152'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(b.x + b.w*0.2, b.y + b.h*0.3); ctx.lineTo(b.x - b.w*0.1, b.y + b.h*0.15); ctx.stroke();
		ctx.beginPath(); ctx.moveTo(b.x + b.w*0.8, b.y + b.h*0.3); ctx.lineTo(b.x + b.w*1.1, b.y + b.h*0.15); ctx.stroke();
		ctx.restore();
	}
	function roundRect(ctx,x,y,w,h,r,fill,stroke){
		ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); if(fill) ctx.fill(); if(stroke) ctx.stroke();
	}

	function spawnSparkle(x,y){
		const el = document.createElement('div'); el.className='sparkle'; el.style.left=(x-11)+'px'; el.style.top=(y-11)+'px'; canvas.parentElement.appendChild(el); setTimeout(()=> el.remove(),600);
	}
	function launchConfetti(){
		confetti.classList.remove('hidden');
		for(let i=0;i<120;i++){
			const piece = document.createElement('div'); piece.className='confetti-piece';
			piece.style.left = Math.random()*100+'%';
			piece.style.background = ['#ffcc00','#1dbbe6','#ffffff','#4caf50'][i%4];
			piece.style.animationDelay = (Math.random()*2)+'s';
			piece.style.transform = 'rotate('+ (Math.random()*360)+'deg)';
			confetti.appendChild(piece);
		}
		setTimeout(()=> { confetti.innerHTML=''; confetti.classList.add('hidden'); }, 6000);
	}

})();
