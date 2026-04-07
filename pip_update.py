import re

def main():
    with open('js/game.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add pipCamera global variable
    if "var pipCamera;" not in content:
        content = content.replace("var camera;", "var camera;\nvar pipCamera;")
        
    # 2. Add pipCamera initialization in createScene()
    init_old = """  camera = new THREE.PerspectiveCamera(
    fieldOfView,
    aspectRatio,
    nearPlane,
    farPlane
    );"""
    init_new = """  camera = new THREE.PerspectiveCamera(fieldOfView, aspectRatio, nearPlane, farPlane);
  pipCamera = new THREE.PerspectiveCamera(fieldOfView, aspectRatio, nearPlane, farPlane);"""
    content = content.replace(init_old, init_new)

    # 3. Add to handleWindowResize()
    resize_old = """  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();"""
    resize_new = """  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();
  if (pipCamera) {
    pipCamera.aspect = WIDTH / HEIGHT;
    pipCamera.updateProjectionMatrix();
  }"""
    if "pipCamera.aspect" not in content:
        content = content.replace(resize_old, resize_new)

    # 4. Modify updatePlane to use functional camera updater and apply to both
    updatePlane_old = """  camera.fov = normalize(mousePos.x,-1,1,40, 80);
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
  }"""

    # We want to replace it entirely
    updatePlane_new = """  camera.fov = normalize(mousePos.x,-1,1,40, 80);
  camera.updateProjectionMatrix();
  pipCamera.fov = camera.fov;
  pipCamera.updateProjectionMatrix();

  function apply1POV(cam) {
    cam.position.copy(airplane.mesh.position);
    var offset = new THREE.Vector3(8, 8, 0); 
    offset.applyEuler(airplane.mesh.rotation);
    cam.position.add(offset);
    
    var lookTarget = new THREE.Vector3(100, 0, 0);
    lookTarget.applyEuler(airplane.mesh.rotation);
    lookTarget.add(cam.position);
    
    cam.up.set(0, 1, 0);
    cam.up.applyEuler(airplane.mesh.rotation);
    cam.lookAt(lookTarget);
  }

  function apply3POV(cam) {
    cam.up.set(0, 1, 0);
    cam.rotation.set(0, 0, 0); 
    cam.position.x += (0 - cam.position.x) * deltaTime * 0.005; 
    cam.position.z += (200 - cam.position.z) * deltaTime * 0.005;
    cam.position.y += (airplane.mesh.position.y - cam.position.y) * deltaTime * game.cameraSensivity;
  }

  if (game.pov === '1pov') {
    apply1POV(camera);
    apply3POV(pipCamera);
  } else {
    apply3POV(camera);
    apply1POV(pipCamera);
  }"""
    content = content.replace(updatePlane_old, updatePlane_new)

    # 5. Modify loop() for viewport and scissor rendering
    loop_old = """  renderer.render(scene, camera);
  requestAnimationFrame(loop);"""
    loop_new = """  // Main Screen
  renderer.setViewport(0, 0, WIDTH, HEIGHT);
  renderer.setScissor(0, 0, WIDTH, HEIGHT);
  renderer.setScissorTest(true);
  renderer.render(scene, camera);

  // PIP (Picture-in-Picture) Bottom Right
  var pipWidth = WIDTH / 4;
  var pipHeight = HEIGHT / 4;
  var pipX = WIDTH - pipWidth - 20; // 20px padding
  var pipY = 20;

  renderer.setViewport(pipX, pipY, pipWidth, pipHeight);
  renderer.setScissor(pipX, pipY, pipWidth, pipHeight);
  renderer.setScissorTest(true);
  renderer.clearDepth(); // very important
  renderer.render(scene, pipCamera);

  requestAnimationFrame(loop);"""
    if "setViewport" not in content:
        content = content.replace(loop_old, loop_new)

    with open('js/game.js', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    main()
