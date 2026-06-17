import * as THREE from 'three';
import { GLTFExporter } from 'three-stdlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const scene = new THREE.Scene();
const material = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
const shell = new THREE.Mesh(new THREE.BoxGeometry(20, 17.5, 15), material);
shell.position.y = 17.5 / 2;
scene.add(shell);

const exporter = new GLTFExporter();
exporter.parse(
  scene,
  (result) => {
    mkdirSync('public/models', { recursive: true });
    writeFileSync('public/models/demo-building.glb', Buffer.from(result));
    console.log('wrote public/models/demo-building.glb', result.byteLength, 'bytes');
  },
  (err) => {
    console.error('export failed', err);
    process.exit(1);
  },
  { binary: true },
);
