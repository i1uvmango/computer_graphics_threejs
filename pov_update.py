import re
import sys

def main():
    with open('js/game.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add POV state to resetGame()
    if 'pov: "3pov",' not in content:
        content = content.replace('status : "playing",', 'status : "playing",\n          pov: "3pov",')

    # 2. Add event listener for toggling POV
    event_code = """document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
      game.pov = (game.pov === '1pov') ? '3pov' : '1pov';
    }
  }, false);

  loop();"""
    
    if "event.code === 'Space'" not in content:
        content = content.replace("loop();", event_code)

    # 3. Rewrite updatePlane() to handle 1POV / 3POV camera logic
    old_update = """  camera.fov = normalize(mousePos.x,-1,1,40, 80);
  camera.updateProjectionMatrix ()
  camera.position.y += (airplane.mesh.position.y - camera.position.y)*deltaTime*game.cameraSensivity;

  game.planeCollisionSpeedX += (0-game.planeCollisionSpeedX)*deltaTime * 0.03;"""
    
    new_update = """  camera.fov = normalize(mousePos.x,-1,1,40, 80);
  camera.updateProjectionMatrix();

  if (game.pov === '1pov') {
    // 1st person
    camera.position.copy(airplane.mesh.position);
    
    // Scale offset (cockpit is at x=5 in unscaled 3D, mesh scale is 0.25)
    var offset = new THREE.Vector3(8, 8, 0); 
    offset.applyEuler(airplane.mesh.rotation);
    camera.position.add(offset);
    
    // Look towards the nose, relative to the current plane rotation
    var lookTarget = new THREE.Vector3(100, 0, 0);
    lookTarget.applyEuler(airplane.mesh.rotation);
    lookTarget.add(camera.position);
    
    // Apply proper 'up' vector for roll 
    camera.up.set(0, 1, 0);
    camera.up.applyEuler(airplane.mesh.rotation);
    camera.lookAt(lookTarget);
    
  } else {
    // 3rd person (original)
    camera.up.set(0, 1, 0);
    camera.rotation.set(0, 0, 0); // Clear any 1pov rotation
    
    // Smoothly track y, hard lock x and z like original
    camera.position.x += (0 - camera.position.x) * deltaTime * 0.005; // Lerp x back to 0 just in case
    camera.position.z += (200 - camera.position.z) * deltaTime * 0.005;
    camera.position.y += (airplane.mesh.position.y - camera.position.y) * deltaTime * game.cameraSensivity;
    
    // (Optional) looking strictly straight means no lookAt needed if rotation is 0,0,0
  }

  game.planeCollisionSpeedX += (0-game.planeCollisionSpeedX)*deltaTime * 0.03;"""
    
    content = content.replace(old_update, new_update)

    with open('js/game.js', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    main()
