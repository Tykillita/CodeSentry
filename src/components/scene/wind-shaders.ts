import * as THREE from 'three';
import type { WindField } from './wind-simulation';

const treeWind=/* glsl */`
attribute vec3 windAnchor;
attribute float windWeight;
uniform float windTime;
uniform float windGust;
uniform float windSpeed;
uniform float windAngle;
vec3 canopyDisplacement(vec3 p, float weight) {
  float c = cos(-0.13), s = sin(-0.13);
  vec3 world = vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);
  vec3 air = vec3(
    -windSpeed*cos(windAngle)+0.07*sin(world.y*0.6+world.z*0.31+windTime*0.73),
    0.025+windGust*0.25+0.085*sin(world.x*0.42-world.z*0.3+windTime*0.91),
    0.06+windSpeed*sin(windAngle)+0.07*sin(world.x*0.43+world.y*0.58+windTime*0.54)
  );
  float wave = 0.60+0.25*sin(windTime*1.35+world.x*0.7+world.y*0.4+world.z*0.25);
  vec3 d = normalize(air)*(0.08+0.07*windGust)*weight*wave;
  return vec3(c*d.x-s*d.z,d.y,s*d.x+c*d.z);
}
`;

export function addTreeWind<T extends THREE.Material>(material:T,wind:WindField) {
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,wind.uniforms);
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\n${treeWind}`)
      .replace('#include <project_vertex>',/* glsl */`
        vec4 mvPosition = vec4(transformed,1.0);
        #ifdef USE_BATCHING
          mvPosition = batchingMatrix * mvPosition;
        #endif
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        mvPosition.xyz += canopyDisplacement(windAnchor,windWeight);
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
      `);
  };
  material.customProgramCacheKey=()=> 'codesentry-canopy-wind-v1';
  return material;
}

export function addPetalOpacity<T extends THREE.Material>(material:T) {
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float petalOpacity;\nvarying float vPetalOpacity;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvPetalOpacity = petalOpacity;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vPetalOpacity;')
      .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= vPetalOpacity;\nif (diffuseColor.a < 0.005) discard;');
  };
  material.customProgramCacheKey=()=> 'codesentry-petal-opacity-v1';
  return material;
}
