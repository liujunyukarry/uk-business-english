import * as T from "./vendor/three.module.js";
import { GLTFLoader } from "./vendor/loaders/GLTFLoader.js";
const loader = new GLTFLoader(),
  variants = ["ooli", "oobi", "oodi", "oozi", "oopi"];
const scenes = await Promise.all(
  variants.map(
    async (name) =>
      (await loader.loadAsync(new URL("./assets/karts/kart-" + name + ".glb", import.meta.url).href)).scene,
  ),
);
export function kartAsset(kind) {
  const index = { gold: 0, white: 1, dora: 2, mario: 3, bunny: 4, bear: 1, nova: 0, milo: 1 }[kind] ?? 0;
  const model = scenes[index].clone(true),
    wheels = [];
  model.scale.setScalar(2.05);
  const character = model.getObjectByName("character"),
    nativeDriver = ["nova", "milo"].includes(kind) ? character : null;
  if (!nativeDriver) character.removeFromParent();
  const wheelMeshes = [];
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.geometry.userData.shared = true;
      if (o.name.startsWith("wheel-")) wheelMeshes.push(o);
    }
  });
  for (const wheel of wheelMeshes) {
    const parent = wheel.parent,
      pivot = new T.Group();
    pivot.position.copy(wheel.position);
    wheel.position.set(0, 0, 0);
    parent.add(pivot);
    pivot.add(wheel);
    wheels.push({ pivot, mesh: wheel, front: wheel.name.includes("front") });
  }
  return { model, wheels, nativeDriver };
}
