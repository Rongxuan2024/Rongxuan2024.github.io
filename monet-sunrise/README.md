# Impression · Sunrise

A standalone Three.js / WebXR impressionist sunrise with 90,000 procedural brushstrokes, layered harbor silhouettes, animated water and reflection, and nearby spatial pigment. All scene geometry is real 3D, rendered in stereo in XR. Three.js 0.180.0 is vendored with its MIT license. Optional Google Fonts have system fallbacks.

## Run

Run `npm run dev` in this directory and open http://localhost:8091. Run `npm run build` for a static `dist/` output. The app also runs at `/monet-sunrise/` from the portfolio's static server.

## Interaction

- Mouse or touch: move to stir, hold to gather, release to disperse.
- Right-drag to look; WASD to move; Q/E down/up. Space pauses, R resets, H hides controls.
- Headset: use HTTPS in a WebXR browser and select **Step inside**. `local-floor` is required; `hand-tracking` is optional so controllers remain supported. Pinch thumb and index finger to gather; release to disperse; move either hand to paint fading trails. Joint dots show actual tracking. Missing poses disable that hand's interaction. Pinch uses hysteresis to reduce flicker.
- Controllers: point and hold the primary select action. Transient pointer sources also use target-ray poses.
- Native 6DoF head tracking updates the stereo view. No artificial headset locomotion. Use the headset system menu to exit. All desktop camera motion is disabled while immersed.
- Adjust current, sunlight, three color palettes, and particle density. Ambient audio is opt-in and synthesized locally. Reduced-motion settings pause animation initially.

## Device notes

WebXR requires a secure context (HTTPS or localhost). Plain HTTP over a local-network IP does not enable immersive mode. Actual hand-joint availability, stereo comfort, tracking quality and frame rate must be verified with physical hardware. This project does not infer hardware compatibility from a desktop build. Particle density can be lowered before entering XR.

## References

- https://threejs.org/docs/pages/WebXRManager.html
- https://developer.mozilla.org/en-US/docs/Web/API/XRFrame/getJointPose
- https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/requestSession
