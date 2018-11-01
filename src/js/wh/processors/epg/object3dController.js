import {
  Geometry,
  Shape,
  ShapeGeometry,
  Vector3,
} from '../../../lib/three.module.js';
import createObject3dControllerBase from '../../webgl/object3dControllerBase.js';
import { getEuclidPattern, rotateEuclidPattern } from './euclid.js';
import { PPQN } from '../../core/config.js';

const TWO_PI = Math.PI * 2;

export function createObject3dController(specs, my) {
  let that,
    centreCircle3d,
    centreDot3d,
    dots3d,
    hitarea3d,
    pointer3d,
    polygon3d,
    rotatedMarker3d,
    select3d,
    zeroMarker3d,
    radius3d,
    duration,
    pointerRotation,
    pointerRotationPrevious = 0,
    dotAnimations = {},

    initialize = function() {
      centreCircle3d = my.object3d.getObjectByName('centreCircle'),
      centreDot3d = my.object3d.getObjectByName('centreDot'),
      dots3d = my.object3d.getObjectByName('dots'),
      hitarea3d = my.object3d.getObjectByName('hitarea'),
      pointer3d = my.object3d.getObjectByName('pointer'),
      polygon3d = my.object3d.getObjectByName('polygon'),
      rotatedMarker3d = my.object3d.getObjectByName('rotatedMarker'),
      select3d = my.object3d.getObjectByName('select'),
      zeroMarker3d = my.object3d.getObjectByName('zeroMarker'),

      document.addEventListener(my.store.STATE_CHANGE, handleStateChanges);

      const params = specs.processorData.params.byId;
      updateNecklace(params.steps.value, params.pulses.value, params.rotation.value, params.is_mute.value);
      updateDuration(params.steps.value, params.rate.value);
    },

    terminate = function() {
      document.removeEventListener(my.store.STATE_CHANGE, handleStateChanges);
    },

    handleStateChanges = function(e) {
      switch (e.detail.action.type) {
        case e.detail.actions.CHANGE_PARAMETER:
          if (e.detail.action.processorID === my.id) {
            let params;
            switch (e.detail.action.paramKey) {
              case 'steps':
              case 'pulses':
                params = e.detail.state.processors.byId[my.id].params.byId;
                updateDuration(params.steps.value, params.rate.value);
                // fall through intended
              case 'rotation':
                params = params || e.detail.state.processors.byId[my.id].params.byId;
                updateNecklace(params.steps.value, params.pulses.value, params.rotation.value, params.is_mute.value);
                break;
              case 'is_triplets':
              case 'rate':
              case 'note_length':
                params = e.detail.state.processors.byId[my.id].params.byId;
                updateDuration(params.steps.value, params.rate.value);
                break;
              case 'is_mute':
                break;
            }
          }
          break;
      }
    },

    updateNecklace = function(steps, pulses, rotation, isMute) {
      // create the pattern
      let euclid = getEuclidPattern(steps, pulses);
      euclid = rotateEuclidPattern(euclid, rotation);

      // remove all existing necklace dots
      for (let i = 0, n = dots3d.children.length; i < n; i++) {
        dots3d.remove(dots3d.children[0]);
      }

      // 
      const polygonPoints = [];

      // add new dots
      radius3d = 8 + (steps > 16 ? (steps - 16) * 0.5 : 0);
      for (let i = 0; i < steps; i++) {
        let dot;
        const rad = TWO_PI * (i / steps);
        if (euclid[i]) {
          dot = centreDot3d.clone();
        } else {
          dot = select3d.clone();
        }
        dot.scale.set(0.1, 0.1, 1);
        dot.translateX(Math.sin(rad) * radius3d);
        dot.translateY(Math.cos(rad) * radius3d);
        dot.visible = true;
        dots3d.add(dot);
        
        // add coordinate of filled dot to polygon points
        if (euclid[i]) {
          polygonPoints.push(dot.position.clone());
        }
      }
      
      polygonPoints.push(polygonPoints[0].clone());

      updatePolygon(polygonPoints);
      updateHitarea();
      updatePointer(isMute);
      updateZeroMarker(steps, rotation);
      updateRotatedMarker(rotation);
    },
            
    /**
     * Update the polygon shape that connects the dots.
     * @param {array} points Coordinates of the shape points.
     */
    updatePolygon = function(points) {
        let i, n, line, lineGeom, fillShape, fillGeom;
        
        if (points.length > 2) {
            polygon3d.visible = true;
        } else {
            polygon3d.visible = false;
            return;
        }
        
        const fill = polygon3d.getObjectByName('polygonFill');

        if (points.length > 3) {
            fillShape = new Shape();
            fillShape.moveTo(points[0].x, points[0].y);
            n = points.length;
            for (i = 1; i < n; i++) {
                fillShape.lineTo(points[i].x, points[i].y);
            }
            fillShape.lineTo(points[0].x, points[0].y);
            fillGeom = new  ShapeGeometry(fillShape);
            fill.geometry = fillGeom;
            fill.visible = true;
        } else {
            fill.visible = false;
        }
        
        line = polygon3d.getObjectByName('polygonLine');
        line.geometry.dispose();
        line.geometry = new Geometry();
        line.geometry.vertices = points;
        line.geometry.verticesNeedUpdate = true;
    },
            
    /**
     * Update the hitarea used for mouse detection.
     */
    updateHitarea = function() {
        const scale = (radius3d + 3) * 0.1;
        hitarea3d.scale.set(scale, scale, 1);
    },
            
    /**
     * Update the pointer that connects the dots.
     */
    updatePointer = function(isMute) {
      let isSolo = false,
        isNotSolo = false,
        isNoteInControlled = false,
        isMutedByNoteInControl = false,
        mutedRadius = 4.5,
        radius = (isMute || isNotSolo || isMutedByNoteInControl) ? mutedRadius : radius3d;
      pointer3d.geometry.dispose();
      pointer3d.geometry = createPointerGeometry(radius, isSolo, isNoteInControlled);
    },
            
    /**
     * Create geometry for the pointer.
     * Also used by the pointer update function.
     * @param {Number} radius Pointer radius.
     * @param {Boolean} isSolo Pointer shows solo state.
     * @param {Boolean} isNoteInControlled Pointer shows external control state.
     * @return {Object} Three.js Geometry object.
     */
    createPointerGeometry = function(radius, isSolo, isNoteInControlled) {
      var geometry = new Geometry();
      if (isNoteInControlled) {
        var halfRadius = centreRadius + ((radius - centreRadius) / 2);
        geometry.vertices.push(
            new Vector3(0.0, centreRadius, 0.0),
            new Vector3(-0.9, halfRadius, 0.0),
          new Vector3(0.0, radius, 0.0),
            new Vector3(0.9, halfRadius, 0.0),
            new Vector3(0.0, centreRadius, 0.0)
        );
      } else {
        geometry.vertices.push(
          new Vector3(-2.9, 0.7, 0.0),
          new Vector3(0.0, radius, 0.0),
          new Vector3(2.9, 0.7, 0.0)
        );
        
        if (isSolo) {
          geometry.vertices.push(
            new Vector3(0.0, radius, 0.0),
            new Vector3(0.0, 1.0, 0.0)
          );
        }
      }
      
      return geometry;
    },
            
    /**
     * Update the zero marker.
     * @param {Number} steps Euclidean necklace node amount.
     * @param {Number} rotation Euclidean necklace rotation.
     */
    updateZeroMarker = function(steps, rotation) {
        var rad = TWO_PI * (-rotation / steps),
            radius = radius3d + 3;
        zeroMarker3d.position.x = Math.sin(rad) * radius;
        zeroMarker3d.position.y = Math.cos(rad) * radius;
    },
            
    /**
     * Update the marker that indicates if the pattern is rotated.
     * @param {Number} rotation Euclidean necklace rotation.
     */
    updateRotatedMarker = function(rotation) {
        rotatedMarker3d.position.y = radius3d + 3;
        rotatedMarker3d.visible = rotation !== 0;
    },
            
    /**
     * Show circle if the processor is selected, else hide.
     * @param {Boolean} isSelected True if selected.
     */
    updateSelectCircle = function(selectedId) {
      my.object3d.getObjectByName('select').visible = my.id === selectedId;
    },

    /**
     * Calculate the pattern's duration in milliseconds.
     */
    updateDuration = function(steps, rate) {
      // const rate = my.params.is_triplets.value ? my.params.rate.value * (2 / 3) : my.params.rate.value;
      const stepDuration = rate * PPQN;
      duration = steps * stepDuration;
    },
    
    draw = function(position, processorEvents) {
      showPlaybackPosition(position);
      updateNoteAnimations();

      if (processorEvents[my.id] && processorEvents[my.id].length) {
        for (let i = 0, n = processorEvents[my.id].length; i < n; i++) {
          const event = processorEvents[my.id][i];
          startNoteAnimation(event.stepIndex, event.delayFromNowToNoteStart, event.delayFromNowToNoteEnd);
        }
      }
    },
        
    /**
     * Show the playback position within the pattern.
     * Indicated by the pointer's rotation.
     * @param  {Number} position Position within pattern in ticks.
     */
    showPlaybackPosition = function(position) {
        pointerRotationPrevious = pointerRotation;
        pointerRotation = TWO_PI * (-position % duration / duration);
        pointer3d.rotation.z = pointerRotation;
    },
        
    /**
     * Show animation of the pattern dot that is about to play. 
     * @param {Number} stepIndex Index of the step to play.
     * @param {Number} noteStartDelay Delay from now until note start in ms.
     * @param {Number} noteStopDelay Delay from now until note end in ms.
     */
    startNoteAnimation = function(stepIndex, noteStartDelay, noteStopDelay) {
        // // get the coordinates of the dot for this step
        // let steps = my.params.steps.value;
        
        // // retain necklace dot state in object
        // dotAnimations[stepIndex] = {
        //     positionX: necklace[stepIndex].center.x,
        //     positionY: necklace[stepIndex].center.y,
        //     boundingBox: necklace[stepIndex].rect,
        //     dotRadius: 0,
        //     isActive: false,
        // }
        
        // // delay start of animation
        // setTimeout(() => {
        //     let tweeningDot = dotAnimations[stepIndex];
        //     tweeningDot.dotRadius = dotActiveRadius;
        //     tweeningDot.isActive = true;
        // }, noteStartDelay);
    },

    /**
     * Update the current nacklace dot animations.
     */
    updateNoteAnimations = function() {
        Object.keys(dotAnimations).forEach(key => {
            const obj = dotAnimations[key];
            obj.dotRadius /= 1.1;
            if (obj.isActive && obj.dotRadius < 1) {
                delete dotAnimations[key];
            }
        });
    };
  
  my = my || {};

  that = createObject3dControllerBase(specs, my);

  initialize();

  that.updateSelectCircle = updateSelectCircle;
  that.draw = draw;
  return that;
}