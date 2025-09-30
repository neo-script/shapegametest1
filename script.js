const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let shapes = [];
let score = 0;
let gameOver = false;
let paused = false;
let animationId;

const colors = ['#A7E6A1', '#A1D2E6', '#A1A1E6', '#E6A1BA', '#FFE69A', '#FFC69A'];

class Shape {
  constructor(x, y, size, type) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.type = type;
    this.speedX = (Math.random()*3+1)*(Math.random()<0.5?1:-1);
    this.speedY = (Math.random()*3+1)*(Math.random()<0.5?1:-1);
    this.color = colors[Math.floor(Math.random()*colors.length)];
    this.lastBonk = 0;
  }

  draw(){
    ctx.fillStyle = this.color;
    if(this.type==='circle'){
      ctx.beginPath();
      ctx.arc(this.x,this.y,this.size,0,Math.PI*2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(this.x,this.y-this.size);
      ctx.lineTo(this.x-this.size,this.y+this.size);
      ctx.lineTo(this.x+this.size,this.y+this.size);
      ctx.closePath();
      ctx.fill();
    }
  }

  update(){
    this.x += this.speedX;
    this.y += this.speedY;

    // Canvas edges
    if(this.x-this.size<0){ this.x=this.size; this.speedX*=-1; }
    if(this.x+this.size>canvas.width){ this.x=canvas.width-this.size; this.speedX*=-1; }
    if(this.y-this.size<0){ this.y=this.size; this.speedY*=-1; }
    if(this.y+this.size>canvas.height){ this.y=canvas.height-this.size; this.speedY*=-1; }

    // Left and right panels boundaries
    const leftPanel = document.getElementById('leftPanel').getBoundingClientRect();
    const rightPanel = document.getElementById('rightPanel').getBoundingClientRect();

    if(this.x+this.size>leftPanel.left && this.x-leftPanel.right<0 && this.y+this.size>leftPanel.top && this.y-leftPanel.bottom<0){
      this.speedX*=-1; this.speedY*=-1;
      if(this.x<leftPanel.right+this.size) this.x=leftPanel.right+this.size;
    }
    if(this.x-this.size<rightPanel.left && this.x+this.size>rightPanel.left && this.y+this.size>rightPanel.top && this.y-rightPanel.bottom<0){
      this.speedX*=-1; this.speedY*=-1;
      if(this.x>rightPanel.left-this.size) this.x=rightPanel.left-this.size;
    }
  }

  bounceFromMouse(mx,my){
    const dx=this.x-mx;
    const dy=this.y-my;
    const dist=Math.hypot(dx,dy);
    if(dist<this.size+15){
      const now=Date.now();
      if(now-this.lastBonk>200){
        const angle=Math.atan2(dy,dx);
        this.speedX=Math.cos(angle)*6;
        this.speedY=Math.sin(angle)*6;
        score++;
        scoreDisplay.textContent=score;
        localStorage.setItem('currentScore',score);
        this.lastBonk=now;
      }
    }
  }
}

// Initialize shapes avoiding panels
function initShapes(){
  shapes=[];
  let counts = Math.random()<0.5?{circle:3, triangle:2}:{circle:2, triangle:3};
  let attempts=0;
  const leftPanel=document.getElementById('leftPanel').getBoundingClientRect();
  const rightPanel=document.getElementById('rightPanel').getBoundingClientRect();

  function createShape(type){
    const size=Math.random()*30+20;
    let x,y;
    let safe=false;
    while(!safe){
      x=Math.random()*(canvas.width-2*size)+size;
      y=Math.random()*(canvas.height-2*size)+size;
      safe=(x+size<leftPanel.right || x-size>rightPanel.left);
    }
    return new Shape(x,y,size,type);
  }

  while((counts.circle>0 || counts.triangle>0) && attempts<500){
    let type=counts.circle>0?'circle':'triangle';
    if(counts.circle>0 && counts.triangle>0) type=Math.random()<counts.circle/(counts.circle+counts.triangle)?'circle':'triangle';
    const newShape=createShape(type);
    let overlapping=shapes.some(s=>Math.hypot(newShape.x-s.x,newShape.y-s.y)<newShape.size+s.size+10);
    if(!overlapping){
      shapes.push(newShape);
      counts[type]--;
    }
    attempts++;
  }
}

function checkCollision(){
  for(let i=0;i<shapes.length;i++){
    for(let j=i+1;j<shapes.length;j++){
      const s1=shapes[i];
      const s2=shapes[j];
      if((s1.type==='circle'&&s2.type==='triangle')||(s1.type==='triangle'&&s2.type==='circle')){
        if(Math.hypot(s1.x-s2.x,s1.y-s2.y)<s1.size+s2.size){
          gameOver=true;
          handleGameOver();
          return;
        }
      } else {
        let dx=s1.x-s2.x;
        let dy=s1.y-s2.y;
        if(Math.hypot(dx,dy)<s1.size+s2.size){
          let tX=s1.speedX,tY=s1.speedY;
          s1.speedX=s2.speedX; s1.speedY=s2.speedY;
          s2.speedX=tX; s2.speedY=tY;
        }
      }
    }
  }
}

function animate(){
  if(paused) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  shapes.forEach(s=>{s.update();s.draw();});
  checkCollision();
  if(!gameOver) animationId=requestAnimationFrame(animate);
}

canvas.addEventListener('mousemove', e=>{
  if(gameOver || paused) return;
  shapes.forEach(s=>s.bounceFromMouse(e.clientX,e.clientY));
});

startBtn.addEventListener('click', ()=>{
  score=0;
  scoreDisplay.textContent=score;
  gameOver=false;
  startBtn.style.display='none';
  pauseBtn.style.display='inline';
  restartBtn.style.display='none';
  initShapes();
  animate();
});

pauseBtn.addEventListener('click', ()=>{
  paused=!paused;
  if(!paused) animate();
});

restartBtn.addEventListener('click', ()=>{
  score=0;
  scoreDisplay.textContent=score;
  gameOver=false;
  restartBtn.style.display='none';
  paused=false;
  animate();
});

// Username and best score persistence
const usernameInput=document.getElementById('usernameInput');
const bestScoreDisplay=document.getElementById('bestScoreDisplay');

function initUsername(){
  let uname=localStorage.getItem('username')||'User'+Math.floor(Math.random()*10000);
  usernameInput.value=uname;
  localStorage.setItem('username',uname);
  let best=localStorage.getItem('bestScore')||0;
  bestScoreDisplay.textContent='Best Score: '+best;
}

usernameInput.addEventListener('blur', ()=>{
  let newName=usernameInput.value.trim();
  if(newName) localStorage.setItem('username',newName);
});

function saveBestScore(){
  let best=localStorage.getItem('bestScore')||0;
  if(score>best){
    localStorage.setItem('bestScore',score);
    bestScoreDisplay.textContent='Best Score: '+score;
  }
}

function handleGameOver(){
  saveBestScore();
  restartBtn.style.display='inline';
  pauseBtn.style.display='none';
  ctx.fillStyle='#03646A';
  ctx.font='48px Schoolbell, cursive';
  ctx.fillText('GAME OVER',canvas.width/2-150,canvas.height/2);
}

initUsername();
