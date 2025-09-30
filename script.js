const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let shapes = [];
let score = 0;
let gameOver = false;

const colors = ['#A7E6A1', '#A1D2E6', '#A1A1E6', '#E6A1BA', '#FFE69A', '#FFC69A'];

// Cache panel rects once per frame (performance + correctness)
let leftRect = null;
let rightRect = null;
function refreshPanelRects() {
  const lp = document.getElementById('leftPanel');
  const rp = document.getElementById('rightPanel');
  leftRect  = lp ? lp.getBoundingClientRect() : null;
  rightRect = rp ? rp.getBoundingClientRect() : null;
}

class Shape {
  constructor(x, y, size, type) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.type = type; // 'circle' or 'triangle'
    this.speedX = (Math.random() * 3 + 1) * (Math.random() < 0.5 ? 1 : -1);
    this.speedY = (Math.random() * 3 + 1) * (Math.random() < 0.5 ? 1 : -1);
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.lastBonk = 0;
  }

  draw() {
    ctx.fillStyle = this.color;
    if (this.type === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else { // triangle
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - this.size);
      ctx.lineTo(this.x - this.size, this.y + this.size);
      ctx.lineTo(this.x + this.size, this.y + this.size);
      ctx.closePath();
      ctx.fill();
    }
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    // Canvas edges
    if (this.x - this.size < 0) { this.x = this.size; this.speedX *= -1; }
    if (this.x + this.size > canvas.width) { this.x = canvas.width - this.size; this.speedX *= -1; }
    if (this.y - this.size < 0) { this.y = this.size; this.speedY *= -1; }
    if (this.y + this.size > canvas.height) { this.y = canvas.height - this.size; this.speedY *= -1; }

    // Prevent shapes from entering panels (use cached rects)
    if (leftRect) {
      const inX = this.x + this.size > leftRect.left && this.x - this.size < leftRect.right;
      const inY = this.y + this.size > leftRect.top  && this.y - this.size < leftRect.bottom;
      if (inX && inY) { this.speedX *= -1; this.speedY *= -1; }
    }
    if (rightRect) {
      const inX = this.x + this.size > rightRect.left && this.x - this.size < rightRect.right;
      const inY = this.y + this.size > rightRect.top  && this.y - this.size < rightRect.bottom;
      if (inX && inY) { this.speedX *= -1; this.speedY *= -1; }
    }
  }

  bounceFromMouse(mx, my) {
    const dx = this.x - mx;
    const dy = this.y - my;
    const distance = Math.hypot(dx, dy);
    if (distance < this.size + 15) { // bigger hitbox
      const now = Date.now();
      if (now - this.lastBonk > 200) {
        const angle = Math.atan2(dy, dx);
        const speed = 6;
        this.speedX = Math.cos(angle) * speed;
        this.speedY = Math.sin(angle) * speed;
        score++;
        scoreDisplay.textContent = score;
        this.lastBonk = now;
      }
    }
  }
}

// Initialize 2:3 circle:triangle ratio
function initShapes() {
  shapes = [];
  let counts = Math.random() < 0.5 ? {circle:3, triangle:2} : {circle:2, triangle:3};
  let attempts = 0;

  function createShape(type){
    const size = Math.random()*30 + 20;
    // Spawn anywhere on canvas; (keeping your original logic)
    const x = Math.random()*(canvas.width-2*size)+size;
    const y = Math.random()*(canvas.height-2*size)+size;
    return new Shape(x,y,size,type);
  }

  while((counts.circle>0 || counts.triangle>0) && attempts<500){
    let type = counts.circle>0 ? 'circle':'triangle';
    if(counts.circle>0 && counts.triangle>0){
      type = Math.random()<counts.circle/(counts.circle+counts.triangle)? 'circle':'triangle';
    }
    const newShape = createShape(type);
    let overlapping = shapes.some(s=>{
      let dx = newShape.x-s.x;
      let dy = newShape.y-s.y;
      return Math.hypot(dx,dy)<newShape.size+s.size+10;
    });
    if(!overlapping){
      shapes.push(newShape);
      counts[type]--;
    }
    attempts++;
  }
}

// --- precise geometry helpers for circle-triangle ---
function _sign(p1, p2, p3) {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}
function pointInTriangle(p, a, b, c) {
  const d1 = _sign(p, a, b);
  const d2 = _sign(p, b, c);
  const d3 = _sign(p, c, a);
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}
function distPointToSegment(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1, vy = y2 - y1;
  const l2 = vx*vx + vy*vy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * vx + (py - y1) * vy) / l2;
  t = Math.max(0, Math.min(1, t));
  const projx = x1 + t * vx;
  const projy = y1 + t * vy;
  return Math.hypot(px - projx, py - projy);
}
function circleTriangleCollide(circle, tri) {
  // Triangle vertices (matching draw): apex up, base wide
  const A = { x: tri.x,            y: tri.y - tri.size }; // top
  const B = { x: tri.x - tri.size, y: tri.y + tri.size }; // bottom-left
  const C = { x: tri.x + tri.size, y: tri.y + tri.size }; // bottom-right

  const P = { x: circle.x, y: circle.y };
  const r = Math.max(0, circle.size - 1.5); // small epsilon avoids "early" triggers

  if (pointInTriangle(P, A, B, C)) return true;

  const dAB = distPointToSegment(P.x, P.y, A.x, A.y, B.x, B.y);
  const dBC = distPointToSegment(P.x, P.y, B.x, B.y, C.x, C.y);
  const dCA = distPointToSegment(P.x, P.y, C.x, C.y, A.x, A.y);
  return (dAB <= r || dBC <= r || dCA <= r);
}

function checkCollision(){
  for(let i=0;i<shapes.length;i++){
    for(let j=i+1;j<shapes.length;j++){
      const s1 = shapes[i];
      const s2 = shapes[j];

      if((s1.type==='circle' && s2.type==='triangle')||(s1.type==='triangle' && s2.type==='circle')){
        const circle = s1.type==='circle'?s1:s2;
        const tri = s1.type==='triangle'?s1:s2;

        // BUGFIX: use precise circle-triangle collision, not center-distance
        if (circleTriangleCollide(circle, tri)) {
          handleGameOver();
          return;
        }
      } else if(s1.type===s2.type){
        let dx = s1.x - s2.x;
        let dy = s1.y - s2.y;
        let dist = Math.hypot(dx,dy);
        if(dist<s1.size+s2.size){
          let tempX=s1.speedX,tempY=s1.speedY;
          s1.speedX=s2.speedX;s1.speedY=s2.speedY;
          s2.speedX=tempX;s2.speedY=tempY;
        }
      }
    }
  }
}

function showGameOver(){
  restartBtn.style.display='inline';
  ctx.fillStyle='#03646A';
  ctx.font='48px Schoolbell, cursive';
  const text = 'GAME OVER';
  const m = ctx.measureText(text);
  ctx.fillText(text, (canvas.width - m.width)/2, canvas.height/2);
}

// BUGFIX: define handleGameOver (previously called but not defined)
function handleGameOver() {
  if (gameOver) return;
  gameOver = true;
  showGameOver();
}

function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  refreshPanelRects(); // cache panel rects once per frame
  shapes.forEach(shape=>{shape.update();shape.draw();});
  checkCollision();
  if(!gameOver) requestAnimationFrame(animate);
}

// BUGFIX: listen on window (canvas has pointer-events:none)
window.addEventListener('mousemove', e=>{
  if(gameOver) return;
  shapes.forEach(shape=>shape.bounceFromMouse(e.clientX,e.clientY));
});

// Buttons
startBtn.addEventListener('click', ()=>{
  score=0;scoreDisplay.textContent=score;
  gameOver=false;
  startBtn.style.display='none';
  restartBtn.style.display='none';
  initShapes();
  animate();
});

restartBtn.addEventListener('click', ()=>{
  score=0;scoreDisplay.textContent=score;
  gameOver=false;
  restartBtn.style.display='none';
  initShapes();
  animate();
});

// Username & leaderboard functions remain unchanged (as)
