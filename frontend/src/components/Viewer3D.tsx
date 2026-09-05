import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGeoVista } from '../context/GeoVistaContext';
import { PropertyUnit } from '../types';
import { Box, Layers, Eye, RefreshCw } from 'lucide-react';

export const Viewer3D: React.FC = () => {
  const {
    selectedParcel,
    selectedBuilding,
    floors,
    properties,
    selectedProperty,
    selectedFloorFilter,
    setSelectedFloorFilter,
    underground,
    elevated,
    candidates,
    activeLayers,
    toggleLayer,
    cameraState,
    setCameraState,
    selectPropertyById,
    viewerRevision
  } = useGeoVista();

  const mountRef = useRef<HTMLDivElement>(null);

  // Camera state tracking ref to preserve angles during render cycles
  const cameraStateRef = useRef({
    radius: cameraState?.radius ?? 38,
    theta: cameraState?.theta ?? Math.PI / 4,
    phi: cameraState?.phi ?? Math.PI / 3,
    target: (cameraState?.target ?? [0, 4, 0]) as [number, number, number],
    propertyId: selectedProperty?.id || selectedParcel?.id || ''
  });

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || 800;
    const height = mountRef.current.clientHeight || 420;

    // 1. Three.js Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1329'); // Deep slate navy

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    mountRef.current.replaceChildren(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.95);
    dirLight.position.set(40, 70, 40);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.5);
    hemiLight.position.set(0, 60, 0);
    scene.add(hemiLight);

    // 5. Centroid and Coordinate Conversion Pipeline (Goal 5 & 13)
    // Gather all available coordinates to find geographical center
    let allPoints: number[][] = [];
    if (selectedParcel?.geometry_2d) {
      allPoints.push(...selectedParcel.geometry_2d);
    }
    if (selectedBuilding?.footprint_2d) {
      allPoints.push(...selectedBuilding.footprint_2d);
    }
    properties.forEach((u) => {
      if (u.footprint_2d) allPoints.push(...u.footprint_2d);
    });

    // Compute geographical centroid
    let cLng = 77.4125;
    let cLat = 23.2595;
    if (allPoints.length > 0) {
      cLng = allPoints.reduce((sum, p) => sum + p[0], 0) / allPoints.length;
      cLat = allPoints.reduce((sum, p) => sum + p[1], 0) / allPoints.length;
    }

    const cosLat = Math.cos((cLat * Math.PI) / 180);
    // Convert [lng, lat] to local Cartesian meters (X east, Z north/south)
    const toLocal = (lng: number, lat: number): [number, number] => {
      const x = (lng - cLng) * 111000 * cosLat;
      const z = -(lat - cLat) * 111000;
      return [x, z];
    };

    // Ground elevation reference
    const zBase = selectedBuilding?.ground_elevation_m ?? 500.0;

    // Helper: Create Extruded Mesh from 2D coordinates and vertical Y bounds
    const createExtrudedMesh = (
      coords: number[][],
      yMin: number,
      yMax: number,
      color: number,
      opacity: number,
      isSelected: boolean
    ): THREE.Mesh | null => {
      if (!coords || coords.length < 3) return null;

      const pts = coords.map((c) => toLocal(c[0], c[1]));
      const shape = new THREE.Shape();
      shape.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        shape.lineTo(pts[i][0], pts[i][1]);
      }
      shape.closePath();

      const height = Math.max(0.3, yMax - yMin);
      const extrudeSettings = {
        depth: height,
        bevelEnabled: false
      };

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      // Three.js extrudes along +Z axis; rotate so extrusion goes upwards along +Y
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, yMin, 0);

      const material = new THREE.MeshStandardMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        roughness: 0.35,
        metalness: 0.15
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Add prominent edge lines
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: isSelected ? 0xffffff : 0x1e293b,
        linewidth: isSelected ? 2 : 1
      });
      const line = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(line);

      return mesh;
    };

    // 6. Ground Plane & Parcel Boundary
    const isRural = selectedParcel?.area_type === 'RURAL';
    const groundSize = isRural ? 180 : 90;

    const gridHelper = new THREE.GridHelper(
      groundSize,
      isRural ? 36 : 30,
      isRural ? 0x10b981 : 0x3b82f6,
      0x1e293b
    );
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Ground terrain slab
    const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundMat = new THREE.MeshStandardMaterial({
      color: isRural ? 0x064e3b : 0x090f1d,
      roughness: 0.9,
      metalness: 0.1
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.05;
    scene.add(groundMesh);

    // Render 2D Cadastral Parcel Boundary Slab
    if (activeLayers.showParcelBoundary && selectedParcel?.geometry_2d) {
      const pMesh = createExtrudedMesh(
        selectedParcel.geometry_2d,
        -0.08,
        0.06,
        isRural ? 0x059669 : 0x1d4ed8,
        0.25,
        false
      );
      if (pMesh) scene.add(pMesh);
    }

    // 7. Raycaster & Mesh Mapping for Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const meshMap = new Map<THREE.Mesh, PropertyUnit>();

    // 8. Render Property Units (Volumetric 3D Cadastre)
    properties.forEach((unit) => {
      // Respect floor filter
      if (selectedFloorFilter !== 'ALL' && unit.floor_number !== selectedFloorFilter) {
        return;
      }

      const yMin = unit.z_min_m - zBase;
      const yMax = unit.z_max_m - zBase;

      const isSelected = selectedProperty?.id === unit.id;

      let color = 0x3b82f6; // blue default
      if (unit.verification_status === 'APPROVED') color = 0x10b981; // emerald
      else if (unit.verification_status === 'UNDER_REVIEW') color = 0xf59e0b; // amber
      else if (unit.verification_status === 'CORRECTION_REQUIRED') color = 0xef4444; // rose red
      if (isSelected) color = 0x8b5cf6; // purple highlighted

      const opacity = isSelected ? 0.95 : 0.78;

      const unitMesh = createExtrudedMesh(unit.footprint_2d, yMin, yMax, color, opacity, isSelected);
      if (unitMesh) {
        scene.add(unitMesh);
        meshMap.set(unitMesh, unit);
      }
    });

    // 9. Render Underground Infrastructure (Subsurface utilities)
    if (activeLayers.showUnderground && underground.length > 0) {
      underground.forEach((ug) => {
        const yMin = ug.z_min_m - zBase; // Negative (below ground)
        const yMax = ug.z_max_m - zBase;

        const ugMesh = createExtrudedMesh(ug.geometry_2d, yMin, yMax, 0x0284c7, 0.45, false);
        if (ugMesh) {
          scene.add(ugMesh);
        }
      });
    }

    // 10. Render Elevated Infrastructure (Elevated Metro Corridor)
    if (activeLayers.showElevated && elevated.length > 0) {
      elevated.forEach((ev) => {
        const yMin = ev.z_min_m - zBase; // Elevated (positive)
        const yMax = ev.z_max_m - zBase;

        const evMesh = createExtrudedMesh(ev.geometry_2d, yMin, yMax, 0x38bdf8, 0.7, false);
        if (evMesh) {
          scene.add(evMesh);

          // Render Support Pillars down to ground
          if (ev.geometry_2d && ev.geometry_2d.length >= 4) {
            const pts = ev.geometry_2d.map((c) => toLocal(c[0], c[1]));
            for (let i = 0; i < Math.min(pts.length - 1, 4); i++) {
              const p = pts[i];
              const pillarGeo = new THREE.CylinderGeometry(0.5, 0.5, yMin, 8);
              const pillarMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
              const pillar = new THREE.Mesh(pillarGeo, pillarMat);
              pillar.position.set(p[0], yMin / 2, p[1]);
              scene.add(pillar);
            }
          }
        }
      });
    }

    // 11. Render Rural Structure Candidates
    if (activeLayers.showCandidates && candidates.length > 0) {
      candidates.forEach((cand) => {
        const [cx, cz] = toLocal(cand.location_2d[0], cand.location_2d[1]);
        const h = cand.estimated_height_m;

        const isPerm = cand.permanence_classification === 'LIKELY_PERMANENT';
        const candGeo = new THREE.BoxGeometry(7, h, 7);
        const candMat = new THREE.MeshStandardMaterial({
          color: isPerm ? 0xea580c : 0xca8a04,
          roughness: 0.5,
          metalness: 0.1
        });
        const candMesh = new THREE.Mesh(candGeo, candMat);
        candMesh.position.set(cx, h / 2, cz);
        candMesh.castShadow = true;

        const edges = new THREE.EdgesGeometry(candGeo);
        candMesh.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff })));
        scene.add(candMesh);

        // Visual Beacon Marker above structure candidate
        const beaconGeo = new THREE.ConeGeometry(0.8, 1.8, 4);
        const beaconMat = new THREE.MeshBasicMaterial({ color: isPerm ? 0xf97316 : 0xeab308 });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.rotation.x = Math.PI; // point down
        beacon.position.set(cx, h + 2.2, cz);
        scene.add(beacon);
      });
    }

    // 12. Generic Camera Framing Calculation (Goal 13)
    const bbox = new THREE.Box3().setFromObject(scene);
    let target = new THREE.Vector3(0, 4, 0);
    let autoRadius = 38;

    if (!bbox.isEmpty()) {
      bbox.getCenter(target);
      const size = bbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y * 1.5, size.z);
      autoRadius = Math.max(maxDim * 1.6, 26);
    }

    // Check if camera state can be reused (same property / parcel)
    const currentPropId = selectedProperty?.id || selectedParcel?.id || '';
    const isSameTarget = cameraStateRef.current.propertyId === currentPropId;

    if (!isSameTarget) {
      // Target changed: smoothly frame the new property!
      cameraStateRef.current.target = [target.x, target.y, target.z];
      cameraStateRef.current.radius = autoRadius;
      cameraStateRef.current.propertyId = currentPropId;
    }

    const updateCameraPosition = () => {
      const { radius, theta, phi, target: t } = cameraStateRef.current;
      camera.position.x = t[0] + radius * Math.sin(phi) * Math.cos(theta);
      camera.position.y = t[1] + radius * Math.cos(phi);
      camera.position.z = t[2] + radius * Math.sin(phi) * Math.sin(theta);
      camera.lookAt(t[0], t[1], t[2]);
    };
    updateCameraPosition();

    // 13. Interactive Mouse Orbit Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const dom = renderer.domElement;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      cameraStateRef.current.theta -= dx * 0.008;
      cameraStateRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, cameraStateRef.current.phi - dy * 0.008));
      updateCameraPosition();
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        setCameraState({ ...cameraStateRef.current });
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraStateRef.current.radius = Math.max(10, Math.min(180, cameraStateRef.current.radius + e.deltaY * 0.04));
      updateCameraPosition();
      setCameraState({ ...cameraStateRef.current });
    };

    const onClick = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(Array.from(meshMap.keys()));

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object as THREE.Mesh;
        const clickedUnit = meshMap.get(clickedMesh);
        if (clickedUnit) {
          selectPropertyById(clickedUnit.id);
        }
      }
    };

    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('click', onClick);

    // 14. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('click', onClick);
      renderer.dispose();
    };
  }, [
    selectedParcel,
    selectedBuilding,
    properties,
    selectedProperty,
    selectedFloorFilter,
    underground,
    elevated,
    candidates,
    activeLayers,
    viewerRevision,
    selectPropertyById,
    setCameraState
  ]);

  return (
    <div className="relative bg-slate-950 rounded-2xl overflow-hidden shadow-md border border-slate-800 flex flex-col">
      {/* 3D Viewer Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur z-20 text-xs text-slate-300 gap-2">
        <div className="flex items-center space-x-2">
          <Box className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-slate-200">3D Volumetric Cadastre Viewer</span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            | {selectedParcel ? `${selectedParcel.parcel_code} (${selectedParcel.locality})` : 'Cadastre Space'}
          </span>
        </div>

        {/* Floor slice filter & Layer Toggles */}
        <div className="flex items-center space-x-1.5 flex-wrap">
          {underground.length > 0 && (
            <button
              onClick={() => toggleLayer('showUnderground')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                activeLayers.showUnderground ? 'bg-sky-900/80 text-sky-200 border border-sky-700' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Subsurface ({underground.length})
            </button>
          )}

          {elevated.length > 0 && (
            <button
              onClick={() => toggleLayer('showElevated')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                activeLayers.showElevated ? 'bg-blue-900/80 text-blue-200 border border-blue-700' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Elevated Metro ({elevated.length})
            </button>
          )}

          {candidates.length > 0 && (
            <button
              onClick={() => toggleLayer('showCandidates')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                activeLayers.showCandidates ? 'bg-amber-900/80 text-amber-200 border border-amber-700' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Candidates ({candidates.length})
            </button>
          )}

          {floors.length > 0 && (
            <select
              value={selectedFloorFilter}
              onChange={(e) =>
                setSelectedFloorFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
              }
              className="bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 border border-slate-700 focus:outline-none"
            >
              <option value="ALL">All Floors</option>
              {floors.map((f) => (
                <option key={f.id} value={f.floor_number}>
                  Floor {f.floor_number}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-[410px] cursor-grab active:cursor-grabbing"></div>

      {/* 3D Legend Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-slate-900/95 border-t border-slate-800 text-[11px] text-slate-400 gap-2">
        <div className="flex items-center space-x-3 text-[10px]">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
            <span>Verified</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
            <span>Under Review</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
            <span>Overlap / Flagged</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-500"></span>
            <span>Selected Unit</span>
          </div>
          {candidates.length > 0 && (
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-orange-500"></span>
              <span>Candidate</span>
            </div>
          )}
        </div>

        {selectedProperty ? (
          <div className="text-slate-300 font-mono text-[10px]">
            Selected: <span className="font-semibold text-purple-400">{selectedProperty.proposed_3d_id}</span>{' '}
            (Z: {selectedProperty.z_min_m}m–{selectedProperty.z_max_m}m)
          </div>
        ) : selectedParcel ? (
          <div className="text-slate-300 font-mono text-[10px]">
            Parcel: <span className="font-semibold text-blue-400">{selectedParcel.parcel_code}</span> ({selectedParcel.land_use})
          </div>
        ) : null}
      </div>
    </div>
  );
};
