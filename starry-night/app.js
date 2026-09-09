import * as THREE from './vendor/three.module.js';

const $ = (id) => document.getElementById(id);
const canvas = $('sky');
const settings = { flow: 0.6, glow: 0.7, density: 2, paused: matchMedia('(prefers-reduced-motion: reduce)').matches, palette: 'original' };
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
} catch (error) {
  $('xr-status').textContent = 'This browser could not start WebGL. Try a browser with hardware acceleration.';
  $('enter-xr').disabled = true;
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.xr.setFramebufferScaleFactor(0.85);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#081321');
const camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, 0.05, 100);
const rig = new THREE.Group();
scene.add(rig);
rig.add(camera);
camera.position.set(0, 1.6, 7);
let yaw = 0, pitch = 0;
let seed = 589;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const range = (a, b) => a + random() * (b - a);
const TAU = Math.PI * 2;
const blueColors = ['#244171', '#32578b', '#447aa6', '#548baf', '#608fb5', '#839faf', '#1c3355'];
const goldColors = ['#f4d077', '#d6b65e', '#f4df9b', '#af9854', '#ead692'];
const positions = [], colors = [], sizes = [], angles = [], seeds = [];
function point(x, y, z, color, size, angle = 0) {
  positions.push(x, y, z);
  const c = new THREE.Color(color);
  colors.push(c.r, c.g, c.b);
  sizes.push(size); angles.push(angle); seeds.push(random());
}
const pick = (list) => list[Math.floor(random() * list.length)];
const stars = [ [-7,6.7,.5],[-3.8,7.8,.38],[1.5,7.3,.55],[4.5,5.6,.38],[8,7.4,.9],[10,3.6,.32],[-10,3.5,.3],[0,1.1,.24] ];
// Interleaving all brush types keeps the complete composition at every density.
for (let i = 0; i < 80000; i++) {
  const type = random();
  if (type < .36) {
    const second = random() < .27;
    const r = Math.pow(random(), .6) * (second ? 2.65 : 4.5);
    const arm = Math.floor(random() * 5);
    const angle = r * 1.43 + arm * TAU / 5 + range(-.105,.105);
    const cx = second ? 5.0 : -.75, cy = second ? 2 : 3.4;
    const ripple = .1 * Math.sin(r * 19 + arm);
    point(cx + Math.cos(angle) * (r + ripple) * 1.52, cy + Math.sin(angle) * (r + ripple) * .69, -11 + range(-.65,.65), pick(blueColors), range(.36,.95), Math.atan2(Math.cos(angle)*.69, -Math.sin(angle)*1.52));
  } else if (type < .60) {
    const x = range(-24, 24), band = range(-1, 1);
    const y = 2.5 + Math.sin(x * .26) * 1.7 + Math.sin(x * .48 + 2) * .6 + band * .72;
    point(x,y,-13 + range(-1.5,1.5),pick(blueColors),range(.32,.82),Math.atan(Math.cos(x*.26)*.44 + Math.cos(x*.48+2)*.29));
  } else if (type < .73) {
    const [x,y,radius] = stars[Math.floor(random()*stars.length)];
    const r = Math.pow(random(),.7) * radius * 2.1, a = random()*TAU;
    const ring = Math.round(r / .12) * .12 + range(-.025,.025);
    point(x + Math.cos(a)*ring, y + Math.sin(a)*ring, -14 + range(-.12,.12), r < radius*.52 ? pick(goldColors) : (random()<.32 ? pick(goldColors) : pick(blueColors)),range(.28,.68),a+Math.PI/2);
  } else if (type < .89) {
    const x=range(-28,28), y=range(-1,17);
    point(x,y,range(-25,-17),pick(blueColors),range(.22,.65),Math.sin(x*.3+y*.4)*.6);
  } else {
    const a = random()*TAU, r = range(.7,15), elevation = range(-.3,.85);
    point(Math.cos(a)*r,1.6+Math.sin(elevation)*r,3+Math.sin(a)*r,random()<.3?pick(goldColors):pick(blueColors),range(.035,.11),range(0,TAU));
  }
}
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
geometry.setAttribute('aAngle', new THREE.Float32BufferAttribute(angles, 1));
geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
const uniforms = {
  uTime: { value: 0 }, uGlow: { value: .7 }, uPalette: { value: 0 },
  uPointer: { value: [new THREE.Vector3(),new THREE.Vector3()] },
  uActive: { value: new THREE.Vector2() }, uPinch: { value: new THREE.Vector2() },
  uRadius: { value: 4 }, uPixel: { value: renderer.getPixelRatio() }
};
const material = new THREE.ShaderMaterial({
  uniforms, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `
    attribute float aSize; attribute float aAngle; attribute float aSeed;
    uniform float uTime; uniform float uPixel; uniform vec3 uPointer[2]; uniform vec2 uActive; uniform vec2 uPinch; uniform float uRadius;
    varying vec3 vColor; varying float vAngle; varying float vSeed;
    void main(){
      vec3 p = position;
      float t = uTime * .15;
      p.x += sin(t + position.y * .8 + aSeed * 4.) * .13;
      p.y += cos(t * .7 + position.x * .5 + aSeed * 4.) * .1;
      for(int i=0; i<2; i++){
        vec3 d = uPointer[i] - p;
        float w = exp(-dot(d,d)/(uRadius*uRadius)) * uActive[i];
        p += d * w * uPinch[i] * .8;
        p.xy += vec2(-d.y,d.x) * w * (1. - uPinch[i] * .6) * .28;
        p.z += sin(w*3.14)*w*.4;
      }
      vec4 mv = modelViewMatrix * vec4(p,1.);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = clamp(aSize * 145. * uPixel / max(.5,-mv.z),1.,30.);
      vColor = color; vAngle = aAngle + sin(t+aSeed*6.)*.12; vSeed=aSeed;
    }`,
  fragmentShader: `
    uniform float uGlow; uniform float uPalette;
    varying vec3 vColor; varying float vAngle; varying float vSeed;
    void main(){
      vec2 p = gl_PointCoord - .5;
      float c=cos(vAngle),s=sin(vAngle);
      p=mat2(c,-s,s,c)*p;
      float d=length(p*vec2(1.15,3.6));
      float alpha=(1.-smoothstep(.23,.5,d))*(.35+vSeed*.5);
      if(alpha<.01) discard;
      vec3 col=vColor;
      if(uPalette>.5 && uPalette<1.5) col=mix(col,vec3(col.b*.9,col.g*.8,col.r*.6+col.b*.7),.72);
      if(uPalette>1.5) col=mix(col,vec3(col.b*.95+col.r*.4,col.g*.8,col.b*.57),.8);
      gl_FragColor=vec4(col*(.7+uGlow*.95),alpha);
    }`
});
const particles = new THREE.Points(geometry, material);
particles.frustumCulled = false;
scene.add(particles);

// Layered hills and the cypress are actual scene geometry, with stereo depth.
for (let layer=0; layer<4; layer++) {
  const shape = new THREE.Shape(); shape.moveTo(-40,-12);
  for(let x=-40;x<=40;x+=.25) {
    const y=-1.5-layer*.44+Math.sin(x*.27+layer*1.4)*.53+Math.sin(x*.63+layer)*.26;
    shape.lineTo(x,y);
  }
  shape.lineTo(40,-12);shape.closePath();
  const hill=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:['#182d45','#14253a','#0c1d30','#0a1523'][layer],side:THREE.DoubleSide}));
  hill.position.z=-17+layer*1.5;scene.add(hill);
}
const treeShape = new THREE.Shape();
treeShape.moveTo(-7,-6);
treeShape.bezierCurveTo(-8,-3,-7.8,-1.5,-7.1,-.3);
treeShape.bezierCurveTo(-7.3,1,-6.6,1.6,-6.55,3.4);
treeShape.bezierCurveTo(-6.1,2.5,-6.6,1.4,-6.1,.8);
treeShape.bezierCurveTo(-5.5,-.3,-5.9,-1,-5.35,-1.8);
treeShape.bezierCurveTo(-4.9,-3,-5.6,-4,-5,-6);treeShape.closePath();
const tree=new THREE.Mesh(new THREE.ShapeGeometry(treeShape),new THREE.MeshBasicMaterial({color:'#09151d',side:THREE.DoubleSide}));
tree.position.z=-7;scene.add(tree);
// Tiny village lights nestle behind the foreground hill.
for(let i=0;i<52;i++){
  const x=range(-4,9),y=range(-2.3,-1.65),w=range(.06,.22),h=range(.13,.34);
  const house=new THREE.Mesh(new THREE.BoxGeometry(w,h,.12),new THREE.MeshBasicMaterial({color:pick(['#1c3043','#24354a','#34404a'])}));
  house.position.set(x,y,-11);scene.add(house);
  if(i%3===0){const window=new THREE.Mesh(new THREE.PlaneGeometry(.033,.06),new THREE.MeshBasicMaterial({color:'#c6ab64'}));window.position.set(x,y,-10.93);scene.add(window);}
}

const handMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),new THREE.MeshBasicMaterial({color:'#e1cf96',transparent:true,opacity:.7}),50);
handMesh.count=0;handMesh.frustumCulled=false;scene.add(handMesh);
const markerGeometry=new THREE.SphereGeometry(.022,12,8);
const markers=[0,1].map(()=>{const m=new THREE.Mesh(markerGeometry,new THREE.MeshBasicMaterial({color:'#f2d78d'}));m.visible=false;scene.add(m);return m;});
const trailCount=1600,trailPositions=new Float32Array(trailCount*3),trailAges=new Float32Array(trailCount).fill(10);
const trailGeometry=new THREE.BufferGeometry();trailGeometry.setAttribute('position',new THREE.BufferAttribute(trailPositions,3));
trailGeometry.setAttribute('age',new THREE.BufferAttribute(trailAges,1));
const trailMaterial=new THREE.ShaderMaterial({uniforms:{},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`attribute float age; varying float life; void main(){life=max(0.,1.-age/2.5);vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(35.*life/max(.3,-p.z),1.,20.);}`,
  fragmentShader:`varying float life;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(1.,.76,.36,(1.-smoothstep(.05,.5,d))*life*.8);}`});
const trails=new THREE.Points(trailGeometry,trailMaterial);trails.frustumCulled=false;scene.add(trails);
let trailIndex=0;
function emitTrail(p,dt){for(let i=0;i<Math.ceil(dt*180);i++){const n=trailIndex++%trailCount;trailPositions[n*3]=p.x+range(-.03,.03);trailPositions[n*3+1]=p.y+range(-.03,.03);trailPositions[n*3+2]=p.z+range(-.03,.03);trailAges[n]=0;}}

let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4500);}
function updateRanges(){for(const id of ['flow','density','glow']){const input=$(id);input.style.setProperty('--fill',`${(input.value-input.min)/(input.max-input.min)*100}%`);}}
$('flow').addEventListener('input',e=>{settings.flow=+e.target.value;$('flow-value').value=`${settings.flow.toFixed(1)}×`;updateRanges();});
$('glow').addEventListener('input',e=>{settings.glow=+e.target.value/100;uniforms.uGlow.value=settings.glow;$('glow-value').value=`${e.target.value}%`;updateRanges();});
$('density').addEventListener('input',e=>{settings.density=+e.target.value;const count=[24000,48000,80000][settings.density];geometry.setDrawRange(0,count);$('density-value').value=['Low','Medium','High'][settings.density];$('particle-count').textContent=count.toLocaleString('en-US');updateRanges();});
document.querySelectorAll('[data-palette]').forEach(button=>button.addEventListener('click',()=>{
  settings.palette=button.dataset.palette;uniforms.uPalette.value=['original','dream','ember'].indexOf(settings.palette);
  document.querySelectorAll('[data-palette]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',b===button);});
  $('palette-name').textContent={original:'Original night',dream:'Lavender dream',ember:'Amber dusk'}[settings.palette];
}));
function togglePause(){settings.paused=!settings.paused;$('pause').textContent=settings.paused?'▷':'Ⅱ';$('pause').setAttribute('aria-label',settings.paused?'Resume animation':'Pause animation');$('pause').setAttribute('aria-pressed',settings.paused);}
$('pause').addEventListener('click',togglePause);
if(settings.paused){settings.paused=false;togglePause();}
let uiHidden=false;
function toggleUI(){uiHidden=!uiHidden;document.body.classList.toggle('hidden-ui',uiHidden);$('show-ui').hidden=!uiHidden;}
$('show-ui').addEventListener('click',toggleUI);
$('guide-open').addEventListener('click',()=>{$('guide').showModal();keys.clear();});
$('guide-close').addEventListener('click',()=>$('guide').close());
$('guide').addEventListener('click',e=>{if(e.target===$('guide')){const r=$('guide').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('guide').close();}});
const keys=new Set();
window.addEventListener('keydown',e=>{
  if(/INPUT|BUTTON|SELECT|TEXTAREA/.test(document.activeElement.tagName)||$('guide').open)return;
  if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE'].includes(e.code)){keys.add(e.code);e.preventDefault();}
  if(e.repeat)return;
  if(e.code==='Space'){e.preventDefault();togglePause();}
  if(e.code==='KeyH')toggleUI();if(e.code==='KeyR')reset();
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();pointer.active=false;pointer.down=false;pointer.look=false;});
function reset(){
  for(const [id,value] of [['flow',.6],['glow',70],['density',2]]){$(id).value=value;$(id).dispatchEvent(new Event('input'));}
  document.querySelector('[data-palette="original"]').click();uniforms.uTime.value=0;
  if(!renderer.xr.isPresenting){camera.position.set(0,1.6,7);camera.rotation.set(0,0,0);yaw=0;pitch=0;}
  trailAges.fill(10);pointer.active=false;pointer.down=false;
  if(settings.paused)togglePause();toast('The canvas is yours again.');
}
$('reset').addEventListener('click',reset);updateRanges();
const pointer={x:0,y:0,active:false,down:false,look:false};
const raycaster=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),11),intersection=new THREE.Vector3();
canvas.addEventListener('pointermove',e=>{
  pointer.x=e.clientX/innerWidth*2-1;pointer.y=-(e.clientY/innerHeight)*2+1;pointer.active=true;
  if(pointer.look){yaw-=e.movementX*.003;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.003,-1.25,1.25);camera.rotation.set(pitch,yaw,0,'YXZ');}
});
canvas.addEventListener('pointerdown',e=>{pointer.active=true;pointer.x=e.clientX/innerWidth*2-1;pointer.y=-(e.clientY/innerHeight)*2+1;pointer.down=e.button===0;pointer.look=e.button===2;canvas.setPointerCapture(e.pointerId);});
function releasePointer(e){pointer.down=false;pointer.look=false;if(e.pointerType==='touch')pointer.active=false;}
canvas.addEventListener('pointerup',releasePointer);canvas.addEventListener('pointercancel',()=>{pointer.active=false;pointer.down=false;pointer.look=false;});
canvas.addEventListener('lostpointercapture',()=>{pointer.down=false;pointer.look=false;});canvas.addEventListener('pointerleave',()=>{if(!pointer.down)pointer.active=false;});canvas.addEventListener('contextmenu',e=>e.preventDefault());

let audioContext,audioGain;
$('sound').addEventListener('click',async()=>{
  try{
    if(!audioContext){audioContext=new AudioContext();audioGain=audioContext.createGain();audioGain.gain.value=0;audioGain.connect(audioContext.destination);
      for(const [i,f] of [130.81,196,261.63,329.63,392].entries()){
        const osc=audioContext.createOscillator(),g=audioContext.createGain();osc.type='sine';osc.frequency.value=f;osc.detune.value=i%2?3:-3;g.gain.value=.035;osc.connect(g).connect(audioGain);osc.start();
      }
    }
    await audioContext.resume();const enabled=$('sound').getAttribute('aria-pressed')!=='true';audioGain.gain.setTargetAtTime(enabled?.55:0,audioContext.currentTime,.7);
    $('sound').setAttribute('aria-pressed',enabled);$('sound').setAttribute('aria-label',enabled?'Mute ambient sound':'Enable ambient sound');
    $('sound').innerHTML=`<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="${enabled?'M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14':'M16 9l5 6m0-6-5 6'}"/></svg>`;
  }catch{toast('Ambient audio could not start in this browser.');}
});

let xrSupported=false,xrChecking=true,startingXR=false;
async function checkXR(){
  try{xrSupported=!!(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr'));}
  catch{xrSupported=false;}finally{xrChecking=false;}
  $('xr-status').textContent=xrSupported?'Headset ready · hands or controllers':!isSecureContext?'Open over HTTPS to connect a headset':'Desktop preview · headset required for XR';
}
checkXR();
const selected=new Set();
$('enter-xr').addEventListener('click',async()=>{
  if(startingXR)return;
  if(renderer.xr.isPresenting){await renderer.xr.getSession().end();return;}
  if(xrChecking){toast('Checking your browser’s immersive support…');return;}
  if(!xrSupported){toast(!isSecureContext?'Open this page over HTTPS on your headset.':'Open this page in a WebXR headset browser to enter. You can explore with your mouse here.');return;}
  startingXR=true;$('enter-xr').disabled=true;let session;
  try{
    session=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor'],optionalFeatures:['hand-tracking']});
    session.addEventListener('selectstart',e=>selected.add(e.inputSource));session.addEventListener('selectend',e=>selected.delete(e.inputSource));
    session.addEventListener('inputsourceschange',e=>e.removed.forEach(s=>selected.delete(s)));
    await renderer.xr.setSession(session);
  }catch(error){if(session)await session.end().catch(()=>{});toast(error.name==='NotAllowedError'?'Immersive mode was not allowed. You can try again.':`Could not start immersive mode: ${error.message}`);}
  finally{startingXR=false;$('enter-xr').disabled=false;}
});
const savedPosition=new THREE.Vector3(),savedQuaternion=new THREE.Quaternion();
renderer.xr.addEventListener('sessionstart',()=>{
  savedPosition.copy(camera.position);savedQuaternion.copy(camera.quaternion);rig.position.set(0,0,3);rig.updateMatrixWorld(true);keys.clear();pointer.active=false;
  $('interface').style.display='none';$('show-ui').hidden=true;document.querySelector('.vignette').style.display='none';uniforms.uRadius.value=1.9;
});
renderer.xr.addEventListener('sessionend',()=>{
  rig.position.set(0,0,0);camera.position.copy(savedPosition);camera.quaternion.copy(savedQuaternion);selected.clear();handMesh.count=0;markers.forEach(m=>m.visible=false);
  $('interface').style.display='';document.querySelector('.vignette').style.display='';$('show-ui').hidden=!uiHidden;uniforms.uRadius.value=4;uniforms.uActive.value.set(0,0);uniforms.uPinch.value.set(0,0);checkXR();
});
const matrix=new THREE.Matrix4(),jointPosition=new THREE.Vector3(),jointScale=new THREE.Vector3(),quaternion=new THREE.Quaternion(),direction=new THREE.Vector3();
function updateXR(frame,dt){
  const reference=renderer.xr.getReferenceSpace(),session=renderer.xr.getSession();let slot=0,jointCount=0;
  uniforms.uActive.value.set(0,0);uniforms.uPinch.value.set(0,0);markers.forEach(m=>m.visible=false);
  if(!reference||session.visibilityState==='hidden'){handMesh.count=0;return;}
  for(const source of session.inputSources){
    if(slot>=2)break;
    let found=false,pinching=false;const target=uniforms.uPointer.value[slot];
    if(source.hand&&frame.getJointPose){
      const index=frame.getJointPose(source.hand.get('index-finger-tip'),reference),thumb=frame.getJointPose(source.hand.get('thumb-tip'),reference);
      if(index&&thumb){
        const p=index.transform.position,q=thumb.transform.position;
        const distance=Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z);
        target.set((p.x+q.x)/2,(p.y+q.y)/2,(p.z+q.z)/2).applyMatrix4(rig.matrixWorld);
        pinching=distance<.028;found=true;
      }
      for(const joint of source.hand.values()){
        const pose=frame.getJointPose(joint,reference);if(!pose||jointCount>=50)continue;
        jointPosition.copy(pose.transform.position).applyMatrix4(rig.matrixWorld);jointScale.setScalar(Math.max(.004,pose.radius||.007));
        matrix.compose(jointPosition,quaternion.identity(),jointScale);handMesh.setMatrixAt(jointCount++,matrix);
      }
    }else{
      const pose=frame.getPose(source.targetRaySpace,reference);
      if(pose){target.copy(pose.transform.position).applyMatrix4(rig.matrixWorld);quaternion.copy(pose.transform.orientation);direction.set(0,0,-1).applyQuaternion(quaternion);target.addScaledVector(direction,1.5);found=true;pinching=selected.has(source);}
    }
    if(found){uniforms.uActive.value.setComponent(slot,1);uniforms.uPinch.value.setComponent(slot,pinching?1:0);markers[slot].position.copy(target);markers[slot].visible=true;if(!settings.paused)emitTrail(target,dt);slot++;}
  }
  handMesh.count=jointCount;handMesh.instanceMatrix.needsUpdate=true;
}
function resize(){if(renderer.xr.isPresenting)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);uniforms.uPixel.value=renderer.getPixelRatio();}
window.addEventListener('resize',resize);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();toast('Graphics paused. Reload the page to restore the canvas.');});
let lastTime=0;
renderer.setAnimationLoop((time,frame)=>{
  const dt=Math.min((time-lastTime)/1000||.016,.05);lastTime=time;
  if(!settings.paused)uniforms.uTime.value+=dt*settings.flow;
  if(renderer.xr.isPresenting&&frame)updateXR(frame,dt);
  else{
    if(keys.size){const speed=dt*2.5;direction.set((keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),0,(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0)).applyAxisAngle(THREE.Object3D.DEFAULT_UP,yaw);camera.position.addScaledVector(direction,speed);camera.position.y+=((keys.has('KeyE')?1:0)-(keys.has('KeyQ')?1:0))*speed;}
    camera.updateMatrixWorld();raycaster.setFromCamera(new THREE.Vector2(pointer.x,pointer.y),camera);
    const hit=pointer.active&&!pointer.look&&raycaster.ray.intersectPlane(plane,intersection);
    if(hit)uniforms.uPointer.value[0].lerp(intersection,1-Math.exp(-dt*10));
    uniforms.uActive.value.x=THREE.MathUtils.damp(uniforms.uActive.value.x,hit?1:0,5,dt);uniforms.uActive.value.y=0;
    uniforms.uPinch.value.x=THREE.MathUtils.damp(uniforms.uPinch.value.x,pointer.down?1:0,5,dt);
    if(hit&&pointer.down&&!settings.paused)emitTrail(uniforms.uPointer.value[0],dt);
  }
  if(!settings.paused){for(let i=0;i<trailCount;i++){trailAges[i]+=dt;if(trailAges[i]<2.5){trailPositions[i*3]+=Math.sin(i+uniforms.uTime.value)*dt*.035;trailPositions[i*3+1]+=dt*.035;}}trailGeometry.attributes.position.needsUpdate=true;trailGeometry.attributes.age.needsUpdate=true;}
  renderer.render(scene,camera);
});
