# Starry Night — an immersive canvas

A standalone, procedural Three.js / WebXR experience. Open `/starry-night/` on this static site. All rendering dependencies are vendored locally; optional Google Fonts fall back to system fonts when offline.

## Run locally

From the repository root, run `python3 -m http.server 8080`, then open http://localhost:8080/starry-night/.

## Explore

- Mouse / touch: move to stir; hold to gather; release to disperse.
- Right-button drag: look around. W/A/S/D: move; Q/E: descend / ascend.
- H: hide interface; Space: pause; R: reset. Controls and shortcuts are keyboard accessible.
- Headset: use a WebXR browser over HTTPS, select **Enter immersive mode**, and grant the browser's XR permissions. Localhost also works for local development; a plain HTTP LAN address does not enable WebXR.
- Hand tracking: thumb/index pinch gathers particles; moving a tracked hand paints a fading golden trail. Hand joints are rendered as golden points. A compatible device and enabled hand tracking are required.
- Controllers or transient pointing input: aim and hold the primary select action to gather particles.
- 6DoF: native `local-floor` tracking updates the stereo camera from head position and orientation. The app does not move the headset camera artificially. Use the headset system menu to leave immersive mode.

The sky contains 24,000 / 48,000 / 80,000 brushstroke particles at low / medium / high density. A GPU shader animates and deforms particles around two simultaneous input positions. Procedural hills, a cypress, and village lights supply depth. Ambient sound is synthesized locally and starts only after a click. Reduced-motion preferences pause the initial animation.

## Validation notes

Desktop rendering and controls can be checked locally. Physical headset tracking, stereo comfort, hand-joint availability, and device frame rates require a real WebXR headset; desktop tests do not establish hardware compatibility.

## References

- [Three.js WebXRManager](https://threejs.org/docs/pages/WebXRManager.html)
- [WebXR joint poses](https://developer.mozilla.org/en-US/docs/Web/API/XRFrame/getJointPose)
- Three.js 0.180.0 is distributed under the MIT license, included in `vendor/THREE-LICENSE.txt`.
