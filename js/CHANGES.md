# 코드 변경 사항 요약 (리포트 업데이트용)

---

## 1. 파일 구성 현황

| 파일 | 설명 |
|---|---|
| `menu.html` | 모드 선택 진입점 (Game / Matrix 선택 화면) |
| `index.html` | Game 버전 진입점. importmap + `js/lab1_정만교.js` 로드 |
| `index_matrix.html` | Matrix 버전 진입점. importmap + `js/lab1_matrix_정만교.js` 로드 |
| `js/lab1_정만교.js` | 메인 게임 로직 (WASD 이동, 2-phase slerp, 카메라 3모드, lava shader) |
| `js/lab1_matrix_정만교.js` | Matrix 버전 (`matrixAutoUpdate=false` + `matrix.compose()`) |
| `textures/lava/cloud.png` | Lava shader용 noise 텍스쳐 |
| `textures/lava/lavatile.jpg` | Lava shader용 색상 텍스쳐 |
| `css/demo.css`, `css/game.css` | 원본 스타일 (변경 없음) |
| `js/CHANGES.md` | 본 문서 |

- `lab1_MK.js` / `lab1_MK.html` — 삭제됨 (`game.js`로 통합 완료)
- Live Server 호환: importmap 추가 (`"three": "https://esm.sh/three@0.184.0"`)

---

## 2. 비행기 동작 (Translation + Rotation) 관련 변경

### 2.1 상태 변수

| 변수 | 초기값 | 의미 |
|---|---|---|
| `targetPos` | `Vector3(0, 100, 0)` | 비행기가 향할 목표 위치 (WASD로 누적 갱신) |
| `startQuat` | identity | banking 시작 시 비행기의 현재 quaternion 스냅샷 |
| `midQuat` | identity | banking 최대 도달 시 quaternion (leveling 시작점) |
| `endQuat` | identity (init에서 `.identity()` 호출) | leveling 목표: 수평 자세 |
| `targetQuat` | identity | WASD 키별로 설정되는 banking 목표 quaternion |
| `slerpT` | `0.0` | 2-phase slerp 진행도. 키 누르면 0→1, 뗄 때 1→0 |
| `keysHeld` | `{}` | 키 누름 상태 추적 (OS repeat delay 방지용) |

> **변경 전**: `slerpT` (float, 0→1 단방향 증가) + 거리 기반 `t` 계산으로 phase 분기  
> **변경 후**: `slerpT` (키 상태 기반 양방향 0↔1)

### 2.2 키 입력 처리

| 키 | targetPos 갱신 | targetQuat 설정 |
|---|---|---|
| W | `+= 2.0/frame (y축 위)` | Z축 `+PI/4` (코 위로) |
| S | `-= 2.0/frame (y축 아래)` | Z축 `-PI/4` (코 아래로) |
| A | `-= 2.0/frame (z축 앞)` | X축 `-PI/4` (롤 좌) |
| D | `+= 2.0/frame (z축 뒤)` | X축 `+PI/4` (롤 우) |

- `keydown` + `keyup` 이벤트 모두 사용
- `keysHeld[e.code]` 로 최초 누름(`firstPress`) 판별:
  - **최초 누름 시에만** `startQuat` 캡처 + `targetQuat` 설정 + `slerpT = 0.0`
  - 이후 키 유지 동안은 `keysHeld`만 true 유지, quaternion 재설정 없음

```js
const firstPress = !keysHeld[e.code];
keysHeld[e.code] = true;
if (firstPress) {
    startQuat.copy(airplane.mesh.quaternion);
    targetQuat.setFromAxisAngle(axis, angle);
    slerpT = 0.0;
}
```

- `targetPos` 갱신은 `updatePlane()` 내 매 프레임 `keysHeld` 체크로 처리 (keydown 이벤트 내에서 갱신하지 않음)

### 2.3 updatePlane() 로직

```js
const SPEED = 2.0; // 매 프레임 targetPos 이동량
if (keysHeld['KeyW']) targetPos.y += SPEED;
// ... (S/A/D 동일)

// 위치 추종: lerp 0.1
airplane.mesh.position.y += (targetPos.y - airplane.mesh.position.y) * 0.1;

const wasdHeld = keysHeld['KeyW'] || ...;
if (wasdHeld) {
    // 1단계 BANKING: slerpT 0→1, startQuat→targetQuat
    slerpT = Math.min(slerpT + 0.03, 1.0);
    airplane.mesh.quaternion.slerpQuaternions(startQuat, targetQuat, slerpT);
    midQuat.copy(airplane.mesh.quaternion); // 매 프레임 갱신
} else {
    // 2단계 LEVELING: slerpT 1→0, midQuat→endQuat
    slerpT = Math.max(slerpT - 0.04, 0.0);
    airplane.mesh.quaternion.slerpQuaternions(midQuat, endQuat, 1.0 - slerpT);
}
```

| 항목 | 값 |
|---|---|
| banking 속도 | `slerpT += 0.03/frame` → 약 33프레임(~0.55초@60fps)에 최대 |
| leveling 속도 | `slerpT -= 0.04/frame` → 약 25프레임(~0.42초@60fps)에 수평 복귀 |
| 최대 banking 각도 | `PI/4 = 45°` |
| 위치 lerp 계수 | `0.1` |

**quaternion 갱신 시점 정리:**
- `startQuat`: 키 최초 누름 시 (`handleKeyDown`, `firstPress`)
- `targetQuat`: 키 최초 누름 시 (`handleKeyDown`, `firstPress`)
- `midQuat`: banking 중 매 프레임 (`updatePlane`, `wasdHeld` 구간)
- `endQuat`: `init()`에서 한 번 `.identity()` 설정, 이후 불변

### 2.4 발견 및 수정한 버그

**버그 1: WASD 누를 때 딜레이 후 큰 점프 (→ 설계 변경 근거)**
- 증상: 키를 누른 뒤 약 500ms 대기, 이후 큰 폭으로 이동
- 원인 A — OS keydown repeat delay: `keydown` 이벤트 기반 `targetPos += 30` 방식은 처음 누름 후 ~500ms 동안 이벤트가 오지 않아 딜레이 발생
- 원인 B — 연타 시 이전 명령 씹힘: `targetPos = airplane.mesh.position + 30` (현재 위치 기준)으로 구현 시, lerp 도중 재입력하면 아직 도달하지 못한 이동량이 무시되고 현재 위치에서 다시 +30이 됨. 예) 0→30 이동 중 위치=5에서 재입력 → targetPos=35, 첫 이동 25만큼 손실
- 수정: `keysHeld` 딕셔너리 + `updatePlane()` 내 매 프레임 `targetPos += SPEED(2.0)` 방식으로 전환
  - 키를 누르고 있는 매 프레임 누적 → OS 딜레이 없음
  - targetPos 기준 누적이므로 연타해도 이전 이동량 보존
  - 과제 명세의 `keydown ±30` 방식 대비 더 자연스러운 조작감 확보
  - slerpT(구 slerpT) 기반 2-phase slerp는 명세의 변수명/개념 그대로 유지

**버그 2: WASD 눌러도 비행기 rotation 없음 (banking이 안 보임)**
- 증상: WASD로 이동은 되지만 코가 기울지 않음
- 원인: 기존 `slerpT` 로직이 `(거리/30)` 기반으로 `t`를 계산했으나, 매 프레임 `targetPos`가 `SPEED`만큼 증가하므로 실제 거리차가 항상 ~15 유닛으로 수렴 → `t = 1.0 - 15/30 = 0.5` → banking phase가 즉시 건너뛰어짐
- 수정: 거리 기반 `t` 완전 제거, 키 상태 기반 `slerpT` 로 교체

---

## 3. 카메라 동작 관련 변경

### 3.1 카메라 부착 방식

```js
cameraHolder = new THREE.Object3D(); // scale 1, 씬에 직접 추가
scene.add(cameraHolder);
cameraHolder.add(camera);           // 카메라를 자식으로 연결
camera.position.set(0, 0, 200);     // 로컬 초기 위치
```

- `cameraHolder`(scale 1 Object3D)를 씬에 추가하고 카메라를 자식으로 연결
- `airplane.mesh`(scale 0.25)에 직접 붙이지 않음 → scale 문제 회피
- attach/detach 없음 — 모드 전환 시 `cameraHolder`의 위치/회전을 lerp/slerp로 조작

### 3.2 모드 전환 보간

| 모드 | cameraHolder.position | cameraHolder.quaternion | camera.position | camera.quaternion |
|---|---|---|---|---|
| fps (O) | `lerp(airplane.pos, 0.1)` | `slerp(halfBankQuat, 0.08)` | `lerp(-100,40,0, 0.08)` | lookAt slerp `0.06` |
| top (P) | `lerp(0,0,0, 0.06)` | `slerp(identity, 0.06)` | `lerp(0,400,0, 0.06)` | `slerp(topQuat, 0.06)` |
| default (L) | `lerp(airplane.pos, 0.1)` | `slerp(identity, 0.08)` | `lerp(0,0,200, 0.06)` | `slerp(identity, 0.06)` |

- `camStart/End` 변수 없음, `camTransT` 없음 — 매 프레임 lerp/slerp로 대체
- 모든 전환에 별도 "전환 완료" 상태 없음 (매 프레임 지속 보간)

### 3.3 FOV 동적 조절

```js
const DEFAULT_FOV = 50;  // default / top 모드
const FPS_FOV     = 75;  // fps 모드
var targetFov     = DEFAULT_FOV;

// updateCamera() 최상단, 매 프레임 실행
if (Math.abs(camera.fov - targetFov) > 0.01) {
    camera.fov += (targetFov - camera.fov) * 0.1;
    camera.updateProjectionMatrix();
}
```

- O 키: `targetFov = 75`, P/L 키: `targetFov = 50`
- lerp 계수 `0.1` — 위치/자세 보간과 완전히 독립적으로 실행
- `updateProjectionMatrix()` 는 FOV가 실제로 변할 때만 호출

### 3.4 Chase 추종 동작 (fps 모드 상세)

```js
// fps: 비행기 banking의 30%만 카메라에 반영 (partial roll)
const halfBankQuat = new THREE.Quaternion().slerpQuaternions(
    identityQuat, airplane.mesh.quaternion, 0.3
);
cameraHolder.quaternion.slerp(halfBankQuat, 0.08); // lag 포함

// lookAt 직접 호출 대신 slerp로 rotation 보간
const prevQuat = camera.quaternion.clone();
camera.lookAt(airplane.pos);
const lookAtQuat = camera.quaternion.clone();
camera.quaternion.copy(prevQuat).slerp(lookAtQuat, 0.06);
```

- 비행기 banking 100% 따라가면 멀미 유발 → 30% partial roll 적용
- `cameraHolder.quaternion.slerp(*, 0.08)` lag으로 추가 부드러움

### 3.5 발견 및 수정한 버그

**버그 1: 카메라 twitching (FPS 모드)**
- 증상: 비행기 추종 시 카메라가 미세하게 떨림
- 원인: `camera.position.lerp()` + `camera.lookAt()` 매 프레임 조합 → 비행기가 banking slerp 중 rotation이 점프할 때 lookAt도 같이 튐
- 수정: `cameraHolder` 부모 객체 도입, 카메라를 자식으로 연결. lerp+lookAt 직접 조합 제거

**버그 2: P→O 전환 시 rotation snap**
- 증상: top에서 fps로 전환 시 카메라 회전이 순간 점프
- 원인: fps 모드에서 `camera.lookAt()`을 직접 호출하면 quaternion이 즉시 덮어씌워짐
- 수정: lookAt 호출 전 `prevQuat` 저장 → lookAt 실행 → `lookAtQuat` 저장 → prevQuat에서 slerp

**버그 3: Top view degenerate lookAt**
- 증상: P 누르면 카메라가 이상한 방향으로 날아감
- 원인: `(0,400,0)`에서 `lookAt(0,0,0)` → view direction `(0,-1,0)`이 up vector `(0,1,0)`과 평행 → degenerate matrix
- 수정: `lookAt` 대신 `setFromEuler(new THREE.Euler(-PI/2, 0, 0))` 직접 설정

**버그 4: FPS 카메라 오프셋 이상 (airplane.mesh.scale 문제)**
- 증상: FPS 카메라가 비행기에 너무 가깝게 붙음
- 원인: `airplane.mesh.scale = (0.25, 0.25, 0.25)` 상태에서 `applyMatrix4(matrixWorld)` 사용 시 오프셋도 0.25배 축소됨
- 수정: `applyQuaternion(airplane.mesh.quaternion)` + `airplane.mesh.position` 수동 합산으로 교체 (이후 cameraHolder 방식으로 완전 대체)

---

## 4. Matrix 버전 (`js/game_matrix.js`)

`game.js`와 동일한 동작이지만 Three.js의 자동 transform 계산을 끄고 수동으로 matrix를 직접 구성.

### 4.1 핵심 변경 사항

```js
// 생성 시 자동 업데이트 비활성화
airplane.mesh.matrixAutoUpdate      = false;
airplane.propeller.matrixAutoUpdate = false;
```

```js
// airplane mesh matrix 수동 구성
function updateAirplaneMatrix() {
    airplane.mesh.matrix.compose(
        airplane.mesh.position,
        airplane.mesh.quaternion,
        airplane.mesh.scale
    );
    airplane.mesh.matrixWorldNeedsUpdate = true;
}
```

```js
// propeller matrix 수동 구성 (X축 회전)
var propellerAngle = 0;
var _propPos   = new THREE.Vector3(50, 0, 0);
var _propScale = new THREE.Vector3(1, 1, 1);
function updatePropellerMatrix() {
    var propQuat = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0), propellerAngle
    );
    airplane.propeller.matrix.compose(_propPos, propQuat, _propScale);
    airplane.propeller.matrixWorldNeedsUpdate = true;
}
```

### 4.2 호출 위치

| 위치 | 호출 함수 |
|---|---|
| `updatePlane()` | `updateAirplaneMatrix()`, `updatePropellerMatrix()` |
| 게임오버 낙하 구간 | `updateAirplaneMatrix()` |
| `init()` | `updateAirplaneMatrix()`, `updatePropellerMatrix()` |

- `propellerAngle` 변수로 직접 각도 누적 → `rotation.x` 직접 대입 방식 제거
- `matrixWorldNeedsUpdate = true` : 자식 메시(propeller)의 world matrix를 다음 렌더 전에 재계산하도록 플래그 설정

---

## 5. 환경/씬 변경

### 5.1 바다 (Sea) — Lava Shader 적용

원본 `MeshPhongMaterial` → `ShaderMaterial` (GLSL vertex + fragment shader) 로 교체.

**vertex shader:**
```glsl
uniform vec2 uvScale;
varying vec2 vUv;
void main() {
    vUv = uvScale * uv;  // UV 스케일 적용
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

**fragment shader 동작:**
1. `texture1`(cloud.png)을 noise로 사용해 UV를 `time`에 따라 왜곡
2. 왜곡된 UV로 `texture2`(lavatile.jpg) 샘플링
3. 색상 합성 및 exponential fog 적용

```js
this.uniforms = {
    time:       { value: 1.0 },
    fogDensity: { value: 0.0 },        // 씬이 넓어 shader fog 비활성화
    fogColor:   { value: new THREE.Vector3(0.969, 0.851, 0.667) }, // #f7d9aa
    uvScale:    { value: new THREE.Vector2(5.0, 2.0) },
    texture1:   { value: cloudTex },   // noise
    texture2:   { value: lavaTex  },   // color
};
```

- `time` uniform: `moveWaves()`에서 매 프레임 `+= 0.002 * deltaTime` 으로 증가
- 텍스쳐: `wrapS = wrapT = RepeatWrapping`, `colorSpace = SRGBColorSpace`

**버그: fogDensity로 인한 전체 색상 덮임**
- 증상: 바다 전체가 `#f7d9aa` (fog 색) 로 물들어 lava 텍스쳐가 안 보임
- 원인: Sea 실린더가 카메라에서 멀어 depth 값이 매우 커짐 → `exp2(-density * density * depth^2)` ≈ 0 → fogFactor = 1.0 → fog 색상이 100% 덮음
- 수정: `fogDensity: 0.0` 으로 shader fog 비활성화 (Three.js scene fog는 별도 유지)

### 5.2 파도 (Wave) 보간

버텍스 위치를 목표값으로 즉시 세팅 → lerp 0.05로 부드럽게 교체:

```js
// 변경 전
pos.setX(i, v.x + Math.cos(v.ang) * v.amp);

// 변경 후
var targetX = v.x + Math.cos(v.ang) * v.amp;
pos.setX(i, pos.getX(i) + (targetX - pos.getX(i)) * 0.05);
```

| 파라미터 | 값 |
|---|---|
| `wavesMinAmp` | 5 |
| `wavesMaxAmp` | 15 |
| 실린더 세그먼트 | `80×20` (기존 `40×10`에서 4배, 파도 곡선 부드러움) |
| lerp 계수 | 0.03 |

### 5.3 비행기 모델
- fog, sky 색상 **변경 없음** (원본 yakudoo/TheAviator 값 유지)
- **비행기 모델 교체**: 원본 전체 모델(파일럿 포함) → Part1 박스 모델

| 파츠 | 지오메트리 | 색상 |
|---|---|---|
| cockpit | BoxGeometry(60,50,50) | red |
| engine | BoxGeometry(20,50,50) | white |
| tailPlane | BoxGeometry(15,20,5) | red |
| sideWing | BoxGeometry(40,8,150) | red |
| propeller | BoxGeometry(20,10,10) + blade | brown/brownDark |

- `airplane.mesh.scale.set(0.25, 0.25, 0.25)` — 원본 게임 씬 크기에 맞게 축소

---

## 6. 그 외 의미 있는 변경

**상수 튜닝 (현재값)**

| 상수/변수 | 값 | 의미 |
|---|---|---|
| `SPEED` | `2.0` | WASD 매 프레임 targetPos 이동량 |
| banking 속도 | `slerpT += 0.03` | ~33프레임에 최대 banking |
| leveling 속도 | `slerpT -= 0.04` | ~25프레임에 수평 복귀 |
| banking 각도 | `PI/4 (45°)` | 최대 기울기 |
| DEFAULT_FOV | `50°` | 기본/top 시야각 |
| FPS_FOV | `75°` | FPS 모드 시야각 |
| position lerp | `0.1` | 비행기 위치 추종 |
| fps cam lerp | `0.08` | FPS 카메라 위치 전환 |
| top/default cam lerp | `0.06` | top/default 카메라 전환 |

**디버깅용 시각화 (회색 구체 마커)**
```js
// targetPos 위치에 회색 반투명 구체 표시 (WASD 누르는 동안만)
targetMarker = new THREE.Mesh(
    new THREE.SphereGeometry(4, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.5 })
);
targetMarker.visible = wasdHeld; // updatePlane() 내에서 매 프레임 갱신
```

- L 모드에서 W/S 키 누를 때 마커를 z축 -120 앞으로 오프셋 → 카메라 시점에서 목표 위치의 depth 가시성 향상
```js
const markerForwardOffset = (cameraMode === 'default') ? 120 : 0;
targetMarker.position.set(targetPos.x, targetPos.y, targetPos.z - markerForwardOffset);
```

**Live Server 호환 (importmap)**
```html
<script type="importmap">
{ "imports": { "three": "https://esm.sh/three@0.184.0" } }
</script>
```
- `game.js`의 `import * as THREE from 'three'` (bare specifier)를 Live Server에서도 해석 가능하게 함
- Vite(`npx vite`)에서도 동일 코드로 동작 (node_modules 경로 자동 해석)

---

## 7. 현재 알려진 미해결 이슈

- A/D 키(z축 이동)는 롤(banking)로 표현되나, 실제 비행기처럼 z 방향으로 코가 향하지는 않음 (요(yaw) 없음)
- banking 최대 각도 45°는 시각적으로 과하게 느껴질 수 있음 (튜닝 여지 있음)
- 게임오버 후 리플레이 시 `targetPos`가 리셋되지 않아 비행기가 마지막 위치에서 재시작됨 (확인 필요)

---

## 8. 최종 키 매핑 표

| 키 | 동작 | targetPos 변화 | 비행기 rotation | 카메라 |
|---|---|---|---|---|
| W | 위로 이동 | `y += 2.0/frame` | Z축 +45° (코 위) | - |
| S | 아래로 이동 | `y -= 2.0/frame` | Z축 -45° (코 아래) | - |
| A | 앞으로 이동 (z-) | `z -= 2.0/frame` | X축 -45° (롤 좌) | - |
| D | 뒤로 이동 (z+) | `z += 2.0/frame` | X축 +45° (롤 우) | - |
| O | FPS 카메라 | - | - | cameraMode='fps', FOV 50→75° |
| P | Top-down 카메라 | - | - | cameraMode='top', FOV 75→50° |
| L | 3인칭 카메라 | - | - | cameraMode='default', FOV →50° |

> W/A/S/D를 뗄 때: `slerpT` 감소 → `midQuat → endQuat(identity)` slerp로 자동 수평 복귀
