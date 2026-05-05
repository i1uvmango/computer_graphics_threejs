import * as THREE from 'three';

// ==================== MATRIX VERSION ====================
// game.js 와 동일하나, 비행기(mesh + propeller)의 transform을
// matrixAutoUpdate = false 로 끄고 matrix.compose() 로 직접 합성함

// ==================== COLORS ====================
var Colors = {
    red:       0xf25346,
    white:     0xd8d0d1,
    brown:     0x59332e,
    brownDark: 0x23190f,
    pink:      0xF5986E,
    yellow:    0xf4ce93,
    blue:      0x68c3c0,
};

// ==================== GAME STATE ====================
var game;
var deltaTime = 0;
var newTime   = new Date().getTime();
var oldTime   = new Date().getTime();
var ennemiesPool  = [];
var particlesPool = [];

function resetGame() {
    game = {
        speed:               0,
        initSpeed:           .00035,
        baseSpeed:           .00035,
        targetBaseSpeed:     .00035,
        incrementSpeedByTime:   .0000025,
        incrementSpeedByLevel:  .000005,
        distanceForSpeedUpdate: 100,
        speedLastUpdate:        0,

        distance:             0,
        ratioSpeedDistance:   50,
        energy:               100,
        ratioSpeedEnergy:     3,

        level:                  1,
        levelLastUpdate:        0,
        distanceForLevelUpdate: 1000,

        planeDefaultHeight: 100,
        planeAmpHeight:     80,
        planeFallSpeed:     .001,
        planeSpeed:         1.4,

        planeCollisionDisplacementX: 0,
        planeCollisionSpeedX:        0,
        planeCollisionDisplacementY: 0,
        planeCollisionSpeedY:        0,

        seaRadius:     600,
        seaLength:     800,
        wavesMinAmp:   5,
        wavesMaxAmp:   15,
        wavesMinSpeed: .001,
        wavesMaxSpeed: .003,

        coinDistanceTolerance:    15,
        coinValue:                3,
        coinsSpeed:               .5,
        coinLastSpawn:            0,
        distanceForCoinsSpawn:    100,

        ennemyDistanceTolerance:  10,
        ennemyValue:              10,
        ennemiesSpeed:            .6,
        ennemyLastSpawn:          0,
        distanceForEnnemiesSpawn: 50,

        status: "playing",
    };
    fieldLevel.innerHTML = Math.floor(game.level);
}

// ==================== THREE.JS VARIABLES ====================
var scene, camera, renderer, container;
var HEIGHT, WIDTH;

// ==================== WASD TRANSLATION ====================
var targetPos = new THREE.Vector3(0, 100, 0);

// ==================== QUATERNION SLERP (2-phase) ====================
var startQuat  = new THREE.Quaternion();
var midQuat    = new THREE.Quaternion();
var endQuat    = new THREE.Quaternion();
var targetQuat = new THREE.Quaternion();
var slerpT      = 0.0;

// ==================== CAMERA STATE ====================
var cameraMode = 'default'; // 'default' | 'fps' | 'top'

const DEFAULT_FOV = 50;
const FPS_FOV     = 75;
var targetFov     = DEFAULT_FOV;

// ==================== KEYBOARD HOLD STATE ====================
var keysHeld = {};

// ==================== [MATRIX] 프로펠러 각도 ====================
var propellerAngle = 0;

// ==================== SCENE SETUP ====================
function createScene() {
    HEIGHT = window.innerHeight;
    WIDTH  = window.innerWidth;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);

    camera = new THREE.PerspectiveCamera(50, WIDTH / HEIGHT, 0.1, 10000);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(WIDTH, HEIGHT);
    renderer.shadowMap.enabled = true;

    cameraHolder = new THREE.Object3D();
    scene.add(cameraHolder);
    cameraHolder.add(camera);
    camera.position.set(0, 0, 200);

    container = document.getElementById('world');
    container.appendChild(renderer.domElement);
    window.addEventListener('resize', handleWindowResize, false);
}

function handleWindowResize() {
    HEIGHT = window.innerHeight;
    WIDTH  = window.innerWidth;
    renderer.setSize(WIDTH, HEIGHT);
    camera.aspect = WIDTH / HEIGHT;
    camera.updateProjectionMatrix();
}

// ==================== LIGHTS ====================
var ambientLight, hemisphereLight, shadowLight;

function createLights() {
    hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, .9);
    ambientLight    = new THREE.AmbientLight(0xdc8874, .5);
    shadowLight     = new THREE.DirectionalLight(0xffffff, .9);
    shadowLight.position.set(150, 350, 350);
    shadowLight.castShadow = true;
    shadowLight.shadow.camera.left   = -400;
    shadowLight.shadow.camera.right  =  400;
    shadowLight.shadow.camera.top    =  400;
    shadowLight.shadow.camera.bottom = -400;
    shadowLight.shadow.camera.near   = 1;
    shadowLight.shadow.camera.far    = 1000;
    shadowLight.shadow.mapSize.width  = 2048;
    shadowLight.shadow.mapSize.height = 2048;
    scene.add(hemisphereLight);
    scene.add(shadowLight);
    scene.add(ambientLight);
}

// ==================== AIRPLANE (part1 model) ====================
var AirPlane = function () {
    this.mesh = new THREE.Object3D();
    this.mesh.name = "airPlane";

    var cockpit = new THREE.Mesh(
        new THREE.BoxGeometry(60, 50, 50),
        new THREE.MeshPhongMaterial({ color: Colors.red, flatShading: true })
    );
    cockpit.castShadow = cockpit.receiveShadow = true;
    this.mesh.add(cockpit);

    var engine = new THREE.Mesh(
        new THREE.BoxGeometry(20, 50, 50),
        new THREE.MeshPhongMaterial({ color: Colors.white, flatShading: true })
    );
    engine.position.x = 40;
    engine.castShadow = engine.receiveShadow = true;
    this.mesh.add(engine);

    var tailPlane = new THREE.Mesh(
        new THREE.BoxGeometry(15, 20, 5),
        new THREE.MeshPhongMaterial({ color: Colors.red, flatShading: true })
    );
    tailPlane.position.set(-35, 25, 0);
    tailPlane.castShadow = tailPlane.receiveShadow = true;
    this.mesh.add(tailPlane);

    var sideWing = new THREE.Mesh(
        new THREE.BoxGeometry(40, 8, 150),
        new THREE.MeshPhongMaterial({ color: Colors.red, flatShading: true })
    );
    sideWing.castShadow = sideWing.receiveShadow = true;
    this.mesh.add(sideWing);

    this.propeller = new THREE.Mesh(
        new THREE.BoxGeometry(20, 10, 10),
        new THREE.MeshPhongMaterial({ color: Colors.brown, flatShading: true })
    );
    this.propeller.castShadow = this.propeller.receiveShadow = true;

    var blade = new THREE.Mesh(
        new THREE.BoxGeometry(1, 100, 20),
        new THREE.MeshPhongMaterial({ color: Colors.brownDark, flatShading: true })
    );
    blade.position.x = 8;
    blade.castShadow = blade.receiveShadow = true;
    this.propeller.add(blade);

    this.propeller.position.set(50, 0, 0);
    this.mesh.add(this.propeller);

    this.pilot = { updateHairs: function () {} };
};

// ==================== SEA ====================
var Sea = function () {
    var geom = new THREE.CylinderGeometry(game.seaRadius, game.seaRadius, game.seaLength, 80, 20);
    geom.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));

    var pos = geom.attributes.position;
    this.waves = [];
    var lookup = {};
    for (var i = 0; i < pos.count; i++) {
        var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        var key = Math.round(x*10)+'_'+Math.round(y*10)+'_'+Math.round(z*10);
        if (!lookup[key]) {
            lookup[key] = {
                x, y, z,
                ang:   Math.random() * Math.PI * 2,
                amp:   game.wavesMinAmp  + Math.random() * (game.wavesMaxAmp  - game.wavesMinAmp),
                speed: game.wavesMinSpeed + Math.random() * (game.wavesMaxSpeed - game.wavesMinSpeed),
            };
        }
        this.waves.push(lookup[key]);
    }
    this.mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({
        color: Colors.blue, transparent: true, opacity: .8, flatShading: true,
    }));
    this.mesh.receiveShadow = true;
};
Sea.prototype.moveWaves = function () {
    var pos = this.mesh.geometry.attributes.position;
    for (var i = 0; i < pos.count; i++) {
        var v = this.waves[i];
        var tx = v.x + Math.cos(v.ang) * v.amp;
        var ty = v.y + Math.sin(v.ang) * v.amp;
        pos.setX(i, pos.getX(i) + (tx - pos.getX(i)) * 0.03);
        pos.setY(i, pos.getY(i) + (ty - pos.getY(i)) * 0.03);
        v.ang += v.speed * deltaTime;
    }
    pos.needsUpdate = true;
};

// ==================== SKY / CLOUDS ====================
var Cloud = function () {
    this.mesh = new THREE.Object3D();
    var geom = new THREE.BoxGeometry(20, 20, 20);
    var mat  = new THREE.MeshPhongMaterial({ color: Colors.white });
    for (var i = 0, n = 3 + Math.floor(Math.random() * 3); i < n; i++) {
        var m = new THREE.Mesh(geom.clone(), mat);
        m.position.set(i * 15, Math.random() * 10, Math.random() * 10);
        m.rotation.set(0, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
        var s = .1 + Math.random() * .9;
        m.scale.set(s, s, s);
        m.castShadow = m.receiveShadow = true;
        this.mesh.add(m);
    }
};
Cloud.prototype.rotate = function () {
    this.mesh.children.forEach((m, i) => {
        m.rotation.z += Math.random() * .005 * (i + 1);
        m.rotation.y += Math.random() * .002 * (i + 1);
    });
};

var Sky = function () {
    this.mesh = new THREE.Object3D();
    this.clouds = [];
    var step = Math.PI * 2 / 20;
    for (var i = 0; i < 20; i++) {
        var c = new Cloud();
        this.clouds.push(c);
        var a = step * i;
        var h = game.seaRadius + 150 + Math.random() * 200;
        c.mesh.position.set(Math.cos(a) * h, Math.sin(a) * h, -300 - Math.random() * 500);
        c.mesh.rotation.z = a + Math.PI / 2;
        var s = 1 + Math.random() * 2;
        c.mesh.scale.set(s, s, s);
        this.mesh.add(c.mesh);
    }
};
Sky.prototype.moveClouds = function () {
    this.clouds.forEach(c => c.rotate());
    this.mesh.rotation.z += game.speed * deltaTime;
};

// ==================== ENEMIES ====================
var Ennemy = function () {
    this.mesh = new THREE.Mesh(
        new THREE.TetrahedronGeometry(8, 2),
        new THREE.MeshPhongMaterial({ color: Colors.red, shininess: 0, specular: 0xffffff, flatShading: true })
    );
    this.mesh.castShadow = true;
    this.angle = 0; this.dist = 0;
};

var EnnemiesHolder = function () {
    this.mesh = new THREE.Object3D();
    this.ennemiesInUse = [];
};
EnnemiesHolder.prototype.spawnEnnemies = function () {
    for (var i = 0; i < game.level; i++) {
        var e = ennemiesPool.length ? ennemiesPool.pop() : new Ennemy();
        e.angle    = -(i * 0.1);
        e.distance = game.seaRadius + game.planeDefaultHeight + (-1 + Math.random() * 2) * (game.planeAmpHeight - 20);
        e.mesh.position.y = -game.seaRadius + Math.sin(e.angle) * e.distance;
        e.mesh.position.x =  Math.cos(e.angle) * e.distance;
        this.mesh.add(e.mesh);
        this.ennemiesInUse.push(e);
    }
};
EnnemiesHolder.prototype.rotateEnnemies = function () {
    for (var i = 0; i < this.ennemiesInUse.length; i++) {
        var e = this.ennemiesInUse[i];
        e.angle += game.speed * deltaTime * game.ennemiesSpeed;
        if (e.angle > Math.PI * 2) e.angle -= Math.PI * 2;
        e.mesh.position.y = -game.seaRadius + Math.sin(e.angle) * e.distance;
        e.mesh.position.x =  Math.cos(e.angle) * e.distance;
        e.mesh.rotation.z += Math.random() * .1;
        e.mesh.rotation.y += Math.random() * .1;

        var diff = airplane.mesh.position.clone().sub(e.mesh.position);
        var d = diff.length();
        if (d < game.ennemyDistanceTolerance) {
            particlesHolder.spawnParticles(e.mesh.position.clone(), 15, Colors.red, 3);
            ennemiesPool.unshift(this.ennemiesInUse.splice(i, 1)[0]);
            this.mesh.remove(e.mesh);
            ambientLight.intensity = 2;
            removeEnergy();
            i--;
        } else if (e.angle > Math.PI) {
            ennemiesPool.unshift(this.ennemiesInUse.splice(i, 1)[0]);
            this.mesh.remove(e.mesh);
            i--;
        }
    }
};

// ==================== PARTICLES ====================
var Particle = function () {
    this.mesh = new THREE.Mesh(
        new THREE.TetrahedronGeometry(3, 0),
        new THREE.MeshPhongMaterial({ color: 0x009999, shininess: 0, specular: 0xffffff, flatShading: true })
    );
};
Particle.prototype.explode = function (pos, color, scale) {
    var _this = this, _p = this.mesh.parent;
    this.mesh.material.color = new THREE.Color(color);
    this.mesh.material.needsUpdate = true;
    this.mesh.scale.set(scale, scale, scale);
    setTimeout(function () {
        if (_p) _p.remove(_this.mesh);
        _this.mesh.scale.set(1, 1, 1);
        particlesPool.unshift(_this);
    }, 600);
};

var ParticlesHolder = function () { this.mesh = new THREE.Object3D(); };
ParticlesHolder.prototype.spawnParticles = function (pos, density, color, scale) {
    for (var i = 0; i < density; i++) {
        var p = particlesPool.length ? particlesPool.pop() : new Particle();
        this.mesh.add(p.mesh);
        p.mesh.visible = true;
        p.mesh.position.copy(pos);
        p.explode(pos, color, scale);
    }
};

// ==================== COINS ====================
var Coin = function () {
    this.mesh = new THREE.Mesh(
        new THREE.TetrahedronGeometry(5, 0),
        new THREE.MeshPhongMaterial({ color: 0x009999, shininess: 0, specular: 0xffffff, flatShading: true })
    );
    this.mesh.castShadow = true;
    this.angle = 0; this.dist = 0;
};

var CoinsHolder = function (n) {
    this.mesh = new THREE.Object3D();
    this.coinsInUse = [];
    this.coinsPool  = [];
    for (var i = 0; i < n; i++) this.coinsPool.push(new Coin());
};
CoinsHolder.prototype.spawnCoins = function () {
    var n   = 1 + Math.floor(Math.random() * 10);
    var d   = game.seaRadius + game.planeDefaultHeight + (-1 + Math.random() * 2) * (game.planeAmpHeight - 20);
    var amp = 10 + Math.round(Math.random() * 10);
    for (var i = 0; i < n; i++) {
        var c = this.coinsPool.length ? this.coinsPool.pop() : new Coin();
        this.mesh.add(c.mesh);
        this.coinsInUse.push(c);
        c.angle    = -(i * 0.02);
        c.distance = d + Math.cos(i * .5) * amp;
        c.mesh.position.y = -game.seaRadius + Math.sin(c.angle) * c.distance;
        c.mesh.position.x =  Math.cos(c.angle) * c.distance;
    }
};
CoinsHolder.prototype.rotateCoins = function () {
    for (var i = 0; i < this.coinsInUse.length; i++) {
        var c = this.coinsInUse[i];
        if (c.exploding) continue;
        c.angle += game.speed * deltaTime * game.coinsSpeed;
        if (c.angle > Math.PI * 2) c.angle -= Math.PI * 2;
        c.mesh.position.y = -game.seaRadius + Math.sin(c.angle) * c.distance;
        c.mesh.position.x =  Math.cos(c.angle) * c.distance;
        c.mesh.rotation.z += Math.random() * .1;
        c.mesh.rotation.y += Math.random() * .1;

        var diff = airplane.mesh.position.clone().sub(c.mesh.position);
        var d = diff.length();
        if (d < game.coinDistanceTolerance) {
            this.coinsPool.unshift(this.coinsInUse.splice(i, 1)[0]);
            this.mesh.remove(c.mesh);
            particlesHolder.spawnParticles(c.mesh.position.clone(), 5, 0x009999, .8);
            addEnergy();
            i--;
        } else if (c.angle > Math.PI) {
            this.coinsPool.unshift(this.coinsInUse.splice(i, 1)[0]);
            this.mesh.remove(c.mesh);
            i--;
        }
    }
};

// ==================== SCENE OBJECTS ====================
var sea, airplane, sky, coinsHolder, ennemiesHolder, particlesHolder;
var cameraHolder, targetMarker;

function createPlane() {
    airplane = new AirPlane();
    airplane.mesh.scale.set(.25, .25, .25);
    scene.add(airplane.mesh);

    // [MATRIX] 자동 행렬 갱신 비활성화
    airplane.mesh.matrixAutoUpdate      = false;
    airplane.propeller.matrixAutoUpdate = false;
}
function createSea()       { sea = new Sea(); sea.mesh.position.y = -game.seaRadius; scene.add(sea.mesh); }
function createSky()       { sky = new Sky(); sky.mesh.position.y = -game.seaRadius; scene.add(sky.mesh); }
function createCoins()     { coinsHolder = new CoinsHolder(20); scene.add(coinsHolder.mesh); }
function createEnnemies()  {
    for (var i = 0; i < 10; i++) ennemiesPool.push(new Ennemy());
    ennemiesHolder = new EnnemiesHolder();
    scene.add(ennemiesHolder.mesh);
}
function createParticles() {
    for (var i = 0; i < 10; i++) particlesPool.push(new Particle());
    particlesHolder = new ParticlesHolder();
    scene.add(particlesHolder.mesh);
}
function createTargetMarker() {
    targetMarker = new THREE.Mesh(
        new THREE.SphereGeometry(4, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.5 })
    );
    targetMarker.visible = false;
    scene.add(targetMarker);
}

// ==================== [MATRIX] 행렬 수동 합성 헬퍼 ====================
// airplane.mesh: TRS 행렬을 position/quaternion/scale로 compose
function updateAirplaneMatrix() {
    airplane.mesh.matrix.compose(
        airplane.mesh.position,
        airplane.mesh.quaternion,
        airplane.mesh.scale
    );
    airplane.mesh.matrixWorldNeedsUpdate = true;
}

// propeller: 부모(airplane.mesh) 로컬 공간에서 위치 + X축 회전 compose
// 프로펠러 로컬 위치 (50,0,0), 스케일 (1,1,1)
var _propPos   = new THREE.Vector3(50, 0, 0);
var _propScale = new THREE.Vector3(1, 1, 1);
function updatePropellerMatrix() {
    var propQuat = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0), propellerAngle
    );
    airplane.propeller.matrix.compose(_propPos, propQuat, _propScale);
    airplane.propeller.matrixWorldNeedsUpdate = true;
}

// ==================== KEYBOARD HANDLER ====================
function handleKeyDown(e) {
    const firstPress = !keysHeld[e.code];
    keysHeld[e.code] = true;

    if (firstPress) {
        switch (e.code) {
            case 'KeyW':
                startQuat.copy(airplane.mesh.quaternion);
                targetQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 4);
                slerpT = 0.0;
                break;
            case 'KeyS':
                startQuat.copy(airplane.mesh.quaternion);
                targetQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 4);
                slerpT = 0.0;
                break;
            case 'KeyA':
                startQuat.copy(airplane.mesh.quaternion);
                targetQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 4);
                slerpT = 0.0;
                break;
            case 'KeyD':
                startQuat.copy(airplane.mesh.quaternion);
                targetQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 4);
                slerpT = 0.0;
                break;
        }
    }

    if (e.code === 'KeyO') { cameraMode = 'fps';     targetFov = FPS_FOV;     }
    if (e.code === 'KeyP') { cameraMode = 'top';     targetFov = DEFAULT_FOV; }
    if (e.code === 'KeyL') { cameraMode = 'default'; targetFov = DEFAULT_FOV; }
}

function handleKeyUp(e) {
    keysHeld[e.code] = false;
}

// ==================== updatePlane: LERP + 2-phase SLERP + MATRIX ====================
function updatePlane() {
    const SPEED = 2.0;
    if (keysHeld['KeyW']) targetPos.y += SPEED;
    if (keysHeld['KeyS']) targetPos.y -= SPEED;
    if (keysHeld['KeyA']) targetPos.z -= SPEED;
    if (keysHeld['KeyD']) targetPos.z += SPEED;

    airplane.mesh.position.y += (targetPos.y - airplane.mesh.position.y) * 0.1;
    airplane.mesh.position.z += (targetPos.z - airplane.mesh.position.z) * 0.1;

    const wasdHeld = keysHeld['KeyW'] || keysHeld['KeyS'] || keysHeld['KeyA'] || keysHeld['KeyD'];
    if (wasdHeld) {
        slerpT = Math.min(slerpT + 0.03, 1.0);
        airplane.mesh.quaternion.slerpQuaternions(startQuat, targetQuat, slerpT);
        midQuat.copy(airplane.mesh.quaternion);
    } else {
        slerpT = Math.max(slerpT - 0.04, 0.0);
        airplane.mesh.quaternion.slerpQuaternions(midQuat, endQuat, 1.0 - slerpT);
    }

    const markerForwardOffset = (cameraMode === 'default') ? 120 : 0;
    targetMarker.position.set(targetPos.x, targetPos.y, targetPos.z - markerForwardOffset);
    targetMarker.visible = wasdHeld;

    // [MATRIX] position/quaternion 변경 후 수동으로 행렬 합성
    propellerAngle += 0.2;
    updateAirplaneMatrix();
    updatePropellerMatrix();
}

// ==================== CAMERA: updateCamera ====================
function updateCamera() {
    if (Math.abs(camera.fov - targetFov) > 0.01) {
        camera.fov += (targetFov - camera.fov) * 0.1;
        camera.updateProjectionMatrix();
    }
    const identityQuat = new THREE.Quaternion();

    if (cameraMode === 'fps') {
        cameraHolder.position.lerp(airplane.mesh.position, 0.1);
        const halfBankQuat = new THREE.Quaternion().slerpQuaternions(
            identityQuat, airplane.mesh.quaternion, 0.3
        );
        cameraHolder.quaternion.slerp(halfBankQuat, 0.08);
        camera.position.lerp(new THREE.Vector3(-100, 40, 0), 0.08);
        const prevQuat = camera.quaternion.clone();
        camera.lookAt(airplane.mesh.position.x, airplane.mesh.position.y, airplane.mesh.position.z);
        const lookAtQuat = camera.quaternion.clone();
        camera.quaternion.copy(prevQuat).slerp(lookAtQuat, 0.06);

    } else if (cameraMode === 'top') {
        cameraHolder.position.lerp(new THREE.Vector3(0, 0, 0), 0.06);
        cameraHolder.quaternion.slerp(identityQuat, 0.06);
        camera.position.lerp(new THREE.Vector3(0, 400, 0), 0.06);
        const topQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
        camera.quaternion.slerp(topQuat, 0.06);

    } else {
        cameraHolder.position.lerp(airplane.mesh.position, 0.1);
        cameraHolder.quaternion.slerp(identityQuat, 0.08);
        camera.position.lerp(new THREE.Vector3(0, 0, 200), 0.06);
        camera.quaternion.slerp(identityQuat, 0.06);
    }
}

// ==================== GAME LOGIC ====================
function updateDistance() {
    game.distance += game.speed * deltaTime * game.ratioSpeedDistance;
    fieldDistance.innerHTML = Math.floor(game.distance);
    var d = 502 * (1 - (game.distance % game.distanceForLevelUpdate) / game.distanceForLevelUpdate);
    levelCircle.setAttribute("stroke-dashoffset", d);
}

function updateEnergy() {
    game.energy -= game.speed * deltaTime * game.ratioSpeedEnergy;
    game.energy  = Math.max(0, game.energy);
    energyBar.style.right           = (100 - game.energy) + "%";
    energyBar.style.backgroundColor = (game.energy < 50) ? "#f25346" : "#68c3c0";
    energyBar.style.animationName   = (game.energy < 30) ? "blinking" : "none";
    if (game.energy < 1) game.status = "gameover";
}

function addEnergy()    { game.energy = Math.min(game.energy + game.coinValue,  100); }
function removeEnergy() { game.energy = Math.max(game.energy - game.ennemyValue, 0);  }
function showReplay()   { replayMessage.style.display = "block"; }
function hideReplay()   { replayMessage.style.display = "none";  }

// ==================== MAIN LOOP ====================
function loop() {
    newTime   = new Date().getTime();
    deltaTime = newTime - oldTime;
    oldTime   = newTime;

    if (game.status === "playing") {
        if (Math.floor(game.distance) % game.distanceForCoinsSpawn === 0 &&
            Math.floor(game.distance) > game.coinLastSpawn) {
            game.coinLastSpawn = Math.floor(game.distance);
            coinsHolder.spawnCoins();
        }
        if (Math.floor(game.distance) % game.distanceForSpeedUpdate === 0 &&
            Math.floor(game.distance) > game.speedLastUpdate) {
            game.speedLastUpdate = Math.floor(game.distance);
            game.targetBaseSpeed += game.incrementSpeedByTime * deltaTime;
        }
        if (Math.floor(game.distance) % game.distanceForEnnemiesSpawn === 0 &&
            Math.floor(game.distance) > game.ennemyLastSpawn) {
            game.ennemyLastSpawn = Math.floor(game.distance);
            ennemiesHolder.spawnEnnemies();
        }
        if (Math.floor(game.distance) % game.distanceForLevelUpdate === 0 &&
            Math.floor(game.distance) > game.levelLastUpdate) {
            game.levelLastUpdate = Math.floor(game.distance);
            game.level++;
            fieldLevel.innerHTML = Math.floor(game.level);
            game.targetBaseSpeed = game.initSpeed + game.incrementSpeedByLevel * game.level;
        }

        updatePlane();
        updateCamera();
        updateDistance();
        updateEnergy();

        game.baseSpeed += (game.targetBaseSpeed - game.baseSpeed) * deltaTime * 0.02;
        game.speed      = game.baseSpeed * game.planeSpeed;

    } else if (game.status === "gameover") {
        game.speed *= .99;
        // euler로 rotation 수정 → quaternion 자동 동기됨 → matrix.compose()로 반영
        airplane.mesh.rotation.z += (-Math.PI / 2 - airplane.mesh.rotation.z) * .0002 * deltaTime;
        airplane.mesh.rotation.x += 0.0003 * deltaTime;
        game.planeFallSpeed *= 1.05;
        airplane.mesh.position.y -= game.planeFallSpeed * deltaTime;
        // [MATRIX] gameover 구간에서도 수동 합성
        updateAirplaneMatrix();
        if (airplane.mesh.position.y < -200) {
            showReplay();
            game.status = "waitingReplay";
        }
        updateCamera();
    }

    // [MATRIX] 프로펠러 회전 누적 및 행렬 갱신 (매 프레임)
    propellerAngle += 0.2;
    updatePropellerMatrix();

    sea.mesh.rotation.z += game.speed * deltaTime;
    if (sea.mesh.rotation.z > 2 * Math.PI) sea.mesh.rotation.z -= 2 * Math.PI;

    ambientLight.intensity += (.5 - ambientLight.intensity) * deltaTime * 0.005;

    coinsHolder.rotateCoins();
    ennemiesHolder.rotateEnnemies();
    sky.moveClouds();
    sea.moveWaves();

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
}

// ==================== INIT ====================
var fieldDistance, energyBar, replayMessage, fieldLevel, levelCircle;

function init() {
    fieldDistance = document.getElementById("distValue");
    energyBar     = document.getElementById("energyBar");
    replayMessage = document.getElementById("replayMessage");
    fieldLevel    = document.getElementById("levelValue");
    levelCircle   = document.getElementById("levelCircleStroke");

    resetGame();
    createScene();
    createLights();
    createPlane();
    createSea();
    createSky();
    createCoins();
    createEnnemies();
    createParticles();
    createTargetMarker();

    airplane.mesh.position.set(0, 100, 0);
    targetPos.copy(airplane.mesh.position);
    endQuat.identity();

    // [MATRIX] 초기 행렬 설정 (position 확정 후)
    updateAirplaneMatrix();
    updatePropellerMatrix();

    window.addEventListener('keydown', handleKeyDown, false);
    window.addEventListener('keyup', handleKeyUp, false);
    document.addEventListener('mouseup', function () {
        if (game.status === "waitingReplay") { resetGame(); hideReplay(); }
    }, false);

    loop();
}

window.addEventListener('load', init, false);
