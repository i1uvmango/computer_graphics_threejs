import re

def main():
    with open('js/game.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add OrbitControls import
    if "OrbitControls" not in content[:500]:
        content = content.replace("import { gsap", "import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';\nimport { gsap")

    # 2. Modify OrbitControls init in createScene
    # Replace the commented out orbit controls block with actual init
    old_orbit = """  /*
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.minPolarAngle = -Math.PI / 2;
  controls.maxPolarAngle = Math.PI ;

  //controls.noZoom = true;
  //controls.noPan = true;
  //*/"""
    new_orbit = """  controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false;
  controls.target.set(0, 100, 0); // target airplane default height"""
    
    if "controls = new OrbitControls" not in content:
        content = content.replace(old_orbit, new_orbit)

    # 3. Spacebar logic update
    old_space = """  document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
      game.pov = (game.pov === '1pov') ? '3pov' : '1pov';
    }
  }, false);"""
    new_space = """  document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
      game.pov = (game.pov === 'orbit') ? '3pov' : 'orbit';
      controls.enabled = (game.pov === 'orbit');
    }
  }, false);"""
    content = content.replace(old_space, new_space)

    # 4. Modify updatePlane camera application logic
    old_apply = """  if (game.pov === '1pov') {
    apply1POV(camera);
    apply3POV(pipCamera);
  } else {
    apply3POV(camera);
    apply1POV(pipCamera);
  }"""
    new_apply = """  // 우측 하단 PiP는 항상 1인칭
  apply1POV(pipCamera);

  if (game.pov === '3pov') {
    apply3POV(camera);
  } else if (game.pov === 'orbit') {
    // 궤도 카메라(Orbit) 시점일 때는 비행기를 대상(target)으로 지속적으로 추적하게 함
    controls.target.set(0, airplane.mesh.position.y, 0);
    controls.update();
  }"""
    content = content.replace(old_apply, new_apply)

    with open('js/game.js', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    main()
