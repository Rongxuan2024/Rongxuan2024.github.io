import * as THREE from './vendor/three.module.js';
const $ = (id) => document.getElementById(id);
const canvas = $('sky');
const settings = { flow: .6, glow: .7, density: 2, paused: matchMedia('(prefers-reduced-motion: reduce)').matches, palette: 'original' };
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch (error) { $('xr-status').textContent = 'Graphics unavailable. Enable hardware acceleration and reload.'; $('enter-xr').disabled = true; throw error; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.xr.setFramebufferScaleFactor(.8);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#708b91');
const camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, .04, 180);
const rig = new THREE.Group(); scene.add(rig); rig.add(camera); camera.position.set(0,2.1,6);
let yaw=0,pitch=0,seed=1872;
const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const range=(a,b)=>a+random()*(b-a),pick=a=>a[Math.floor(random()*a.length)],TAU=Math.PI*2;
const uniforms={uTime:{value:0},uGlow:{value:.7},uPalette:{value:0},uPointer:{value:[new THREE.Vector3(),new THREE.Vector3()]},uActive:{value:new THREE.Vector2()},uPinch:{value:new THREE.Vector2()},uRadius:{value:4},uPixel:{value:renderer.getPixelRatio()}};
// A world-space atmosphere keeps the horizon and sun stable as the viewer moves.
const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(95,48,24),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms,
 vertexShader:`varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec3 vWorld;uniform float uPalette;uniform float uGlow;
 void main(){vec3 d=normalize(vWorld-vec3(0.,1.6,0.));float h=smoothstep(-.06,.6,d.y);vec3 c=mix(vec3(.59,.64,.63),vec3(.26,.39,.45),h);float a=exp(-length(d.xz-vec2(.15,-.98))*3.5)*exp(-abs(d.y-.1)*8.);c+=vec3(.18,.08,-.025)*a*(.3+uGlow);if(d.y<0.)c=mix(c,vec3(.15,.29,.34),smoothstep(0.,.35,-d.y));if(uPalette>.5&&uPalette<1.5)c=c*vec3(.73,.84,1.03);if(uPalette>1.5)c=c*vec3(1.15,.97,.79);gl_FragColor=vec4(c,1.);}` }));scene.add(atmosphere);
const positions=[],colors=[],sizes=[],angles=[],seeds=[],types=[];
function point(x,y,z,color,size,angle=0,type=0){positions.push(x,y,z);const c=new THREE.Color(color);colors.push(c.r,c.g,c.b);sizes.push(size);angles.push(angle);seeds.push(random());types.push(type);}
const skyColors=['#a6b0a5','#8b9f9e','#779699','#bcb5a1','#b6a791','#8a9b9e','#b7b8a8'];
const seaColors=['#4d7b83','#5c8588','#789b99','#3e6978','#729192','#acac93','#92a399','#375d6b'];
const sunColors=['#ff8647','#f68b50','#ef7942','#ff9c5c','#ffad65'];
// All regions are interleaved so lowering quality preserves the whole painting.
for(let i=0;i<90000;i++){
 const r=random();
 if(r<.30){const x=range(-65,65),y=range(.1,40),z=range(-68,-40);point(x,y,z,pick(skyColors),range(.35,1.7),range(-.18,.18),0);}
 else if(r<.74){const x=range(-45,45),z=range(-65,12);const reflectX=3*(6-z)/28;const reflection=Math.abs(x-reflectX)<(.28+(z+65)*.014)&&random()<.72&&z<-1;point(x,-.15+range(-.055,.055),z,pick(reflection?sunColors:seaColors),reflection?range(.10,.65):range(.16,.9),range(-.1,.1),1);}
 else if(r<.80){const a=random()*TAU,radius=Math.sqrt(random())*.82;point(3+Math.cos(a)*radius,4.35+Math.sin(a)*radius,-22+range(-.08,.08),pick(sunColors),range(.09,.22),range(-.5,.5),2);}
 else if(r<.87){const z=range(-22,2),x=3*(6-z)/28+range(-1,1)*(.15+(z+22)*.036);point(x,-.07+range(-.03,.03),z,pick(sunColors),range(.09,.4),range(-.08,.08),1);}
 else if(r<.93){const x=range(-32,32),y=range(-.1,1.4)+Math.sin(x*.7)*.3;point(x,y,range(-39,-33),pick(['#627f84','#718c8c','#829895']),range(.14,.6),range(-.2,.2),0);}
 else{const a=random()*TAU,d=range(.35,7);point(Math.cos(a)*d,range(.15,3.4),Math.sin(a)*d,pick(random()<.4?sunColors:seaColors),range(.012,.043),range(-.7,.7),3);}
}
const geometry=new THREE.BufferGeometry();
for(const [name,values,n] of [['position',positions,3],['color',colors,3],['aSize',sizes,1],['aAngle',angles,1],['aSeed',seeds,1],['aType',types,1]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(values,n));
const material=new THREE.ShaderMaterial({uniforms,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.NormalBlending,
 vertexShader:`attribute float aSize;attribute float aAngle;attribute float aSeed;attribute float aType;
 uniform float uTime;uniform float uPixel;uniform vec3 uPointer[2];uniform vec2 uActive;uniform vec2 uPinch;uniform float uRadius;
 varying vec3 vColor;varying float vAngle;varying float vSeed;varying float vType;
 void main(){vec3 p=position;float t=uTime*.3;float mobile=1.-step(1.5,aType)* (1.-step(2.5,aType));p.x+=sin(t+aSeed*12.+position.z*.3)*.08*mobile;p.y+=sin(t*.7+position.x*.5+aSeed*6.)*(aType>2.5?.08:.022)*mobile;
 for(int i=0;i<2;i++){vec3 d=uPointer[i]-p;float w=exp(-dot(d,d)/(uRadius*uRadius))*uActive[i];p+=d*w*uPinch[i]*.88;p.xz+=vec2(-d.z,d.x)*w*(1.-uPinch[i]*.7)*.2;p.y+=sin(w*3.1416)*w*.5;}
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*520.*uPixel/max(.2,-mv.z),1.,64.);vColor=color;vAngle=aAngle;vSeed=aSeed;vType=aType;}`,
 fragmentShader:`uniform float uGlow;uniform float uPalette;varying vec3 vColor;varying float vAngle;varying float vSeed;varying float vType;
 void main(){vec2 p=gl_PointCoord-.5;float c=cos(vAngle),s=sin(vAngle);p=mat2(c,-s,s,c)*p;float d=length(p*vec2(1.05,3.3));float bristle=.72+.28*sin(p.x*53.+vSeed*77.);float alpha=(1.-smoothstep(.23,.5,d))*bristle*(vType>2.5?.65:.8);if(alpha<.01)discard;vec3 col=pow(vColor,vec3(1./2.2));col*=.8+uGlow*.3;if(uPalette>.5&&uPalette<1.5)col*=vec3(.73,.86,1.08);if(uPalette>1.5)col*=vec3(1.14,.97,.78);gl_FragColor=vec4(col,alpha);}`});
const particles=new THREE.Points(geometry,material);particles.frustumCulled=false;scene.add(particles);
// Three-dimensional silhouettes anchor the floating pigment in a harbor.
const harborMaterial=new THREE.MeshBasicMaterial({color:'#57777c',transparent:true,opacity:.45});
function beam(a,b,r,material=harborMaterial){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),v=end.clone().sub(start);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,v.length(),5),material);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());scene.add(mesh);return mesh;}
for(const [x,h,z] of [[-17,4.2,-35],[-13,3.2,-37],[-8,3.9,-37],[12,4.4,-36],[17,3.6,-36],[22,5.2,-38]]){beam([x,0,z],[x,h,z],.055);beam([x,h,z],[x+2.4,h-.75,z],.035);beam([x+2.4,h-.75,z],[x+2.4,.8,z],.012);}
for(let i=0;i<30;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(range(.5,2.3),range(.2,.9),1),harborMaterial);m.position.set(range(-28,28),.25,range(-40,-36));scene.add(m);}
const boats=[];
function boat(x,z,scale){const group=new THREE.Group(),mat=new THREE.MeshBasicMaterial({color:'#294952'});const hull=new THREE.Mesh(new THREE.SphereGeometry(1,16,6),mat);hull.scale.set(.9,.13,.29);group.add(hull);const figure=new THREE.Mesh(new THREE.CylinderGeometry(.045,.09,.48,6),mat);figure.position.set(.12,.28,0);group.add(figure);const head=new THREE.Mesh(new THREE.SphereGeometry(.074,8,6),mat);head.position.set(.12,.58,0);group.add(head);const oar=new THREE.Mesh(new THREE.CylinderGeometry(.014,.019,1.9,5),mat);oar.rotation.z=1.3;oar.position.set(.15,.1,.2);group.add(oar);group.scale.setScalar(scale);group.position.set(x,.02,z);scene.add(group);boats.push(group);}
boat(-3.5,-7,1);boat(-.9,-15,.75);boat(8,-23,.65);

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
$('density').addEventListener('input',e=>{settings.density=+e.target.value;const count=[26000,54000,90000][settings.density];geometry.setDrawRange(0,count);$('density-value').value=['Low','Medium','High'][settings.density];$('particle-count').textContent=count.toLocaleString('en-US');updateRanges();});
document.querySelectorAll('[data-palette]').forEach(button=>button.addEventListener('click',()=>{
  settings.palette=button.dataset.palette;uniforms.uPalette.value=['original','dream','ember'].indexOf(settings.palette);
  document.querySelectorAll('[data-palette]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',b===button);});
  $('palette-name').textContent={original:'First light',dream:'Blue hour',ember:'Golden'}[settings.palette];
}));
function togglePause(){settings.paused=!settings.paused;$('pause').textContent=settings.paused?'▷':'Ⅱ';$('pause').setAttribute('aria-label',settings.paused?'Resume animation':'Pause animation');$('pause').setAttribute('aria-pressed',settings.paused);}
$('pause').addEventListener('click',togglePause);
if(settings.paused){settings.paused=false;togglePause();}
let uiHidden=false;
function toggleUI(){uiHidden=!uiHidden;document.body.classList.toggle('hidden-ui',uiHidden);$('show-ui').hidden=!uiHidden;}
$('show-ui').addEventListener('click',toggleUI);
$('hide-ui').addEventListener('click',toggleUI);
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
  if(!renderer.xr.isPresenting){camera.position.set(0,2.1,6);camera.rotation.set(0,0,0);yaw=0;pitch=0;}
  trailAges.fill(10);pointer.active=false;pointer.down=false;
  if(settings.paused)togglePause();toast('The canvas is yours again.');
}
$('reset').addEventListener('click',reset);updateRanges();
const pointer={x:0,y:0,active:false,down:false,look:false};
const raycaster=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),22),intersection=new THREE.Vector3();
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
const handPinches=new WeakMap();
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
  savedPosition.copy(camera.position);savedQuaternion.copy(camera.quaternion);rig.position.set(0,0,0);rig.updateMatrixWorld(true);keys.clear();pointer.active=false;
  $('enter-xr').querySelector('span').textContent='Leave immersive mode';$('interface').style.display='none';$('show-ui').hidden=true;document.querySelector('.vignette').style.display='none';uniforms.uRadius.value=1.9;
});
renderer.xr.addEventListener('sessionend',()=>{
  $('enter-xr').querySelector('span').textContent='Step inside';rig.position.set(0,0,0);camera.position.copy(savedPosition);camera.quaternion.copy(savedQuaternion);selected.clear();handMesh.count=0;markers.forEach(m=>m.visible=false);
  $('interface').style.display='';document.querySelector('.vignette').style.display='';$('show-ui').hidden=!uiHidden;uniforms.uRadius.value=4;uniforms.uActive.value.set(0,0);uniforms.uPinch.value.set(0,0);resize();checkXR();
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
        pinching=distance<(handPinches.get(source)?.039:.027);handPinches.set(source,pinching);found=true;
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
    const surface=raycaster.ray.direction.y < -.08 ? new THREE.Plane(new THREE.Vector3(0,1,0),.1) : plane;
    const hit=pointer.active&&!pointer.look&&raycaster.ray.intersectPlane(surface,intersection);
    if(hit)uniforms.uPointer.value[0].lerp(intersection,1-Math.exp(-dt*10));
    uniforms.uActive.value.x=THREE.MathUtils.damp(uniforms.uActive.value.x,hit?1:0,5,dt);uniforms.uActive.value.y=0;
    uniforms.uPinch.value.x=THREE.MathUtils.damp(uniforms.uPinch.value.x,pointer.down?1:0,5,dt);
    if(hit&&pointer.down&&!settings.paused)emitTrail(uniforms.uPointer.value[0],dt);
  }
  if(!settings.paused){for(let i=0;i<trailCount;i++){trailAges[i]+=dt;if(trailAges[i]<2.5){trailPositions[i*3]+=Math.sin(i+uniforms.uTime.value)*dt*.035;trailPositions[i*3+1]+=dt*.035;}}trailGeometry.attributes.position.needsUpdate=true;trailGeometry.attributes.age.needsUpdate=true;}
  boats.forEach((b,i)=>{b.rotation.z=Math.sin(uniforms.uTime.value*.4+i)*.016;});
  renderer.render(scene,camera);
});
