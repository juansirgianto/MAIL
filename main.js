// main.js

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://esm.run/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { LumaSplatsThree, LumaSplatsSemantics } from './libs/luma-web.module.js';
import { initCarousel } from './carousel.js';
import { createPins } from './pin.js';

initCarousel();

// Init scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0.58, 0.95, -0.56);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const canvas = renderer.domElement;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const { pins, pinPOIs } = createPins(scene);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const maxY = 1.5;
const minY = 0.5;

controls.addEventListener('change', () => {
  // Clamp camera Y position
  camera.position.y = Math.min(maxY, Math.max(minY, camera.position.y));
});

controls.minDistance = 0.9; 
controls.maxDistance = 1.2;  

// Luma Splats
const splats = new LumaSplatsThree({
    source: 'https://lumalabs.ai/capture/1855032b-de68-4fdd-adc9-b9935cef2a93',
    particleRevealEnabled: false
});
splats.position.set(-0.4, 0.5, 0.40); // geser Y ke 0.2, X & Z tetap

scene.add(splats);

// const axesHelper = new THREE.AxesHelper( 10 );
// axesHelper.position.y = 0;
// scene.add( axesHelper );

// caminfo
// const camInfo = document.getElementById('cam-info');

const areaButtons = [
  {
    button: document.querySelector('button:nth-child(1)'),
    cameraPosition: [0.65, 0.73 , -0.80],
    cameraTarget: [0.28, 0, -0.41],
    descriptionId: 'pooldescription',
  },
  {
    button: document.querySelector('button:nth-child(2)'),
    cameraPosition: [0.09, 0.65, -0.10],
    cameraTarget: [-0.35, 0, 0.35],
    descriptionId: 'housedescription',
  },
  {
    button: document.querySelector('button:nth-child(3)'),
    cameraPosition: [-1.56, 0.77, 0.42],
    cameraTarget: [-1, 0, 0.59],
    descriptionId: 'gardendescription',
  },
  {
    button: document.querySelector('button:nth-child(4)'),
    cameraPosition: [-0.83, 0.81, 0.87],
    cameraTarget: [-0.38, 0, 0.96],
    descriptionId: 'arrivaldescription',
  },
  {
    button: document.querySelector('button:nth-child(5)'),
    cameraPosition: [-0.34, 0.81, 1.04],
    cameraTarget: [0, 0, 0.7],
    descriptionId: 'archdescription',
  },
];

const buttons = document.querySelectorAll('.area-button');
const closeButtons = document.querySelectorAll('.close-description');

buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    buttons.forEach(b => b.dataset.active = "false");
    btn.dataset.active = "true";
  });
});

closeButtons.forEach(closeBtn => {
  closeBtn.addEventListener('click', () => {
    buttons.forEach(b => b.dataset.active = "false");
  });
});

areaButtons.forEach(({ button, cameraPosition, cameraTarget, descriptionId }) => {
  button.addEventListener('click', () => {
    moveCameraTo(cameraPosition, cameraTarget);

    // Sembunyikan semua deskripsi, lalu tampilkan yang dipilih
    document.querySelectorAll('.description-box').forEach(el => el.style.display = 'none');
    const descEl = document.getElementById(descriptionId);
    if (descEl) descEl.style.display = 'block';
  });
});


document.querySelectorAll('.close-description').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[id$="description"]').forEach(el => {
      el.style.display = 'none';
    });
  });
});

let isCameraAnimating = false;

function moveCameraTo(position, lookAt = null, duration = 1000) {
  if (isCameraAnimating) return; // hindari tumpukan animasi
  isCameraAnimating = true;
  const start = camera.position.clone();
  const end = new THREE.Vector3(...position);
  const startTarget = controls.target.clone();
  const endTarget = lookAt ? new THREE.Vector3(...lookAt) : startTarget;

  const startTime = performance.now();

  function animateCamera(time) {
    const elapsed = time - startTime;
    const t = Math.min(elapsed / duration, 1);
    camera.position.lerpVectors(start, end, t);
    controls.target.lerpVectors(startTarget, endTarget, t);

    if (t < 1) {
      requestAnimationFrame(animateCamera);
    } else {
      isCameraAnimating = false;
    }
  }

  requestAnimationFrame(animateCamera);
}

// Event klik
canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(
    pins.map(p => p.children[0]).filter(c => c instanceof THREE.Sprite)
  );

  if (intersects.length > 0) {
    const clickedSprite = intersects[0].object;
    const pinGroup = clickedSprite.parent;

    const pinPOI = pinPOIs.find(p => p.mesh === pinGroup);
    if (pinPOI) {
      // Pindahkan kamera
      moveCameraTo(pinPOI.camera_position.toArray(), pinPOI.camera_target.toArray());

      // Tampilkan deskripsi
      document.querySelectorAll('.description-box').forEach(d => d.style.display = 'none');
      const desc = document.getElementById(pinPOI.descriptionId);
      if (desc) desc.style.display = 'block';

      // Highlight sementara
      clickedSprite.material.color.set(0xffffff);
      setTimeout(() => clickedSprite.material.color.set(0xffffff), 300);
    }
  }
});

// let hoveredSprite = null;

// --- Setup di awal (sebelum event) ---
const pickables = pins               // cache sekali; jangan map di setiap event
  .map(p => p.children[0])
  .filter(c => c instanceof THREE.Sprite);

const pointer = new THREE.Vector2();
let hoveredSprite = null;
let rafId = null;
let pendingPick = false;
let lastX = 0, lastY = 0;

// Kurangi jangkauan ray agar tidak cek jauh-jauh (opsional)
raycaster.near = 0.1;
raycaster.far  = 5.0; // sesuaikan dengan skala scene

// Kalau banyak objek lain di scene, taruh pin di layer khusus:
const PIN_LAYER = 2;
pickables.forEach(o => o.layers.set(PIN_LAYER));
camera.layers.enable(PIN_LAYER);

// --- Event: throttled by rAF + threshold gerak + skip saat orbit ---
canvas.addEventListener('pointermove', (event) => {
  // Skip kalau kamera lagi digeser/zoom (OrbitControls)
  if (controls.dragging || isCameraAnimating) return;

  // Threshold gerak 2px supaya nggak spam raycast di jitter kecil
  if (Math.abs(event.clientX - lastX) < 2 && Math.abs(event.clientY - lastY) < 2) return;
  lastX = event.clientX; lastY = event.clientY;

  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  if (pendingPick) return; // sudah terjadwal di frame berikutnya
  pendingPick = true;

  rafId = requestAnimationFrame(() => {
    pendingPick = false;

    // setFromCamera otomatis pakai camera.layers; pastikan pickables juga di layer yg sama
    raycaster.setFromCamera(pointer, camera);

    // Hindari array/map baru setiap frame: pakai pickables yang sudah dicache
    const intersects = raycaster.intersectObjects(pickables, /*recursive=*/false);

    if (intersects.length > 0) {
      const sprite = intersects[0].object;
      if (hoveredSprite !== sprite) {
        if (hoveredSprite) hoveredSprite.material.color.setHex(0xffffff);
        sprite.material.color.setHex(0x757641);
        hoveredSprite = sprite;
      }
      canvas.style.cursor = 'pointer';
    } else {
      if (hoveredSprite) hoveredSprite.material.color.setHex(0xffffff);
      hoveredSprite = null;
      canvas.style.cursor = 'default';
    }
  });
}, { passive: true });

// Opsional: batalkan rAF saat blur/resize agar tidak ada pekerjaan sisa
window.addEventListener('blur', () => { if (rafId) cancelAnimationFrame(rafId); });


const videoBtn = document.getElementById('openVideo');
const videoModal = document.getElementById('videoModal');
const closeVideo = document.getElementById('closeVideo');
const videoPlayer = document.getElementById('videoPlayer');
const videoContent = document.getElementById('videoContent');

videoBtn.addEventListener('click', () => {
  videoModal.classList.remove('hidden');

  requestAnimationFrame(() => {
    videoContent.classList.remove('-translate-y-[100vh]', 'opacity-0');
  });

  videoPlayer.currentTime = 0;
  videoPlayer.play();
});

function closeWithAnim() {
  videoContent.classList.add('-translate-y-[100vh]', 'opacity-0');

  setTimeout(() => {
    videoModal.classList.add('hidden');
    videoPlayer.pause();
    videoPlayer.currentTime = 0;
  }, 500); // durasi 500ms sesuai transition
}

closeVideo.addEventListener('click', closeWithAnim);

videoModal.addEventListener('click', (e) => {
  if (e.target === videoModal) closeWithAnim();
});

  let isZooming = false;
let isOrbiting = false;

// Animate
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    if (isZooming || isOrbiting) return; // Skip update scene jika sedang animasi khusus
    // camInfo.textContent = `Camera: x=${camera.position.x.toFixed(2)}, y=${camera.position.y.toFixed(2)}, z=${camera.position.z.toFixed(2)}`;

    // const maxY = 2.0;
    // const minY = 0.3;
    // camera.position.y = Math.min(maxY, Math.max(minY, camera.position.y));
}

animate();

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});