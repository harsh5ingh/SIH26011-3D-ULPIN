import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Box,
  Eye,
  EyeOff,
  Layers,
  RefreshCw,
  Rotate3D,
  MousePointer2
} from 'lucide-react';
import { useGeoVista } from '../context/GeoVistaContext';
import {
  PropertyUnit,
  Floor,
  VerificationStatus
} from '../types';

type HoverTarget =
  | {
      type: 'floor';
      floorNumber: number;
      zMin: number;
      zMax: number;
      unitCount: number;
      x: number;
      y: number;
    }
  | {
      type: 'unit';
      unit: PropertyUnit;
      x: number;
      y: number;
    }
  | null;

type InteractiveObject = THREE.Object3D & {
  userData: {
    targetType?: 'floor' | 'unit';
    floorNumber?: number;
    property?: PropertyUnit;
  };
};

const Viewer3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationRef = useRef<number | null>(null);

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
    selectPropertyById,
    viewerRevision,
    validation
  } = useGeoVista();

  const [isolatedFloor, setIsolatedFloor] =
    useState<number | 'ALL'>('ALL');

  const [hoverTarget, setHoverTarget] =
    useState<HoverTarget>(null);

  const [hoveredFloor, setHoveredFloor] =
    useState<number | null>(null);

  const [hoveredUnit, setHoveredUnit] =
    useState<string | null>(null);

  const cameraValuesRef = useRef({
    radius: 80,
    theta: Math.PI / 4,
    phi: Math.PI / 3,
    target: new THREE.Vector3(0, 500, 0)
  });

  const dragRef = useRef({
    active: false,
    moved: false,
    lastX: 0,
    lastY: 0
  });

  /*
   * ------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------
   */

  const getFootprint = (
    object:
      | { footprint_2d?: number[][] }
      | undefined
  ): number[][] => {
    if (
      object?.footprint_2d &&
      object.footprint_2d.length >= 3
    ) {
      return object.footprint_2d;
    }

    return [
      [0, 0],
      [30, 0],
      [30, 20],
      [0, 20]
    ];
  };

  const getParcelFootprint = (): number[][] => {
    if (
      selectedParcel?.geometry_2d &&
      selectedParcel.geometry_2d.length >= 3
    ) {
      return selectedParcel.geometry_2d;
    }

    return [
      [0, 0],
      [45, 0],
      [45, 35],
      [0, 35]
    ];
  };

  const getInfrastructureFootprint = (
    geometry: number[][]
  ): number[][] => {
    if (
      geometry &&
      geometry.length >= 3
    ) {
      return geometry;
    }

    return [
      [0, 0],
      [15, 0],
      [15, 5],
      [0, 5]
    ];
  };

  const getUnitColor = (
    unit: PropertyUnit,
    selected: boolean,
    hovered: boolean
  ): number => {
    if (selected) return 0xa855f7;
    if (hovered) return 0x22d3ee;

    switch (unit.verification_status) {
      case 'CORRECTION_REQUIRED':
        return 0xef4444;

      case 'UNDER_REVIEW':
      case 'PENDING_VERIFICATION':
        return 0xf59e0b;

      case 'APPROVED':
        return 0x22c55e;

      case 'REJECTED':
        return 0x64748b;

      default:
        return 0x3b82f6;
    }
  };

  const getStatusLabel = (
    status: VerificationStatus
  ): string => {
    switch (status) {
      case 'APPROVED':
        return 'Verified';

      case 'UNDER_REVIEW':
        return 'Under Review';

      case 'CORRECTION_REQUIRED':
        return 'Correction Required';

      case 'PENDING_VERIFICATION':
        return 'Pending';

      case 'REJECTED':
        return 'Rejected';

      default:
        return status.replace(/_/g, ' ');
    }
  };

  const getFloorColor = (
    floorNumber: number,
    hovered: boolean,
    isolated: boolean
  ): number => {
    if (hovered) return 0x38bdf8;
    if (isolated) return 0x8b5cf6;

    const palette = [
      0x334155,
      0x3f4c6b,
      0x475569,
      0x526174,
      0x5b6b7c,
      0x64748b,
      0x718096,
      0x7c8798
    ];

    return palette[
      Math.abs(floorNumber) % palette.length
    ];
  };

  const getCentroid = (
    coordinates: number[][]
  ) => {
    if (!coordinates.length) {
      return { x: 0, y: 0 };
    }

    let x = 0;
    let y = 0;

    coordinates.forEach((point) => {
      x += point[0];
      y += point[1];
    });

    return {
      x: x / coordinates.length,
      y: y / coordinates.length
    };
  };

  const createExtrudedGeometry = (
    coordinates: number[][],
    zMin: number,
    zMax: number,
    origin: { x: number; y: number }
  ) => {
    const shape = new THREE.Shape();

    coordinates.forEach(
      (point, index) => {
        const x = point[0] - origin.x;
        const y = point[1] - origin.y;

        if (index === 0) {
          shape.moveTo(x, y);
        } else {
          shape.lineTo(x, y);
        }
      }
    );

    shape.closePath();

    const geometry =
      new THREE.ExtrudeGeometry(
        shape,
        {
          depth: Math.max(
            0.05,
            zMax - zMin
          ),
          bevelEnabled: false,
          steps: 1
        }
      );

    /*
     * Three.js Z extrusion -> vertical Y axis.
     */
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, zMin, 0);

    return geometry;
  };

  /*
   * ------------------------------------------------------------
   * THREE.JS SCENE
   * ------------------------------------------------------------
   */

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) return;

    /*
     * Cleanup old renderer
     */
    if (animationRef.current !== null) {
      cancelAnimationFrame(
        animationRef.current
      );
    }

    if (rendererRef.current) {
      rendererRef.current.dispose();

      if (
        rendererRef.current.domElement
          .parentElement === mount
      ) {
        mount.removeChild(
          rendererRef.current.domElement
        );
      }
    }

    const scene = new THREE.Scene();

    scene.background =
      new THREE.Color(0x07111f);

    const width =
      mount.clientWidth || 900;

    const height =
      mount.clientHeight || 500;

    const camera =
      new THREE.PerspectiveCamera(
        45,
        width / height,
        0.1,
        5000
      );

    const renderer =
      new THREE.WebGLRenderer({
        antialias: true
      });

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        2
      )
    );

    renderer.setSize(
      width,
      height
    );

    renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    mount.appendChild(
      renderer.domElement
    );

    rendererRef.current = renderer;

    /*
     * ----------------------------------------------------------
     * LIGHTING
     * ----------------------------------------------------------
     */

    scene.add(
      new THREE.AmbientLight(
        0xffffff,
        1.15
      )
    );

    const directional =
      new THREE.DirectionalLight(
        0xffffff,
        2
      );

    directional.position.set(
      80,
      140,
      100
    );

    scene.add(directional);

    const hemisphere =
      new THREE.HemisphereLight(
        0x93c5fd,
        0x0f172a,
        1.3
      );

    scene.add(hemisphere);

    /*
     * ----------------------------------------------------------
     * ORIGIN
     * ----------------------------------------------------------
     */

    const buildingFootprint =
      getFootprint(
        selectedBuilding
      );

    const parcelFootprint =
      getParcelFootprint();

    const reference =
      selectedBuilding
        ? buildingFootprint
        : parcelFootprint;

    const origin =
      getCentroid(reference);

    const groundElevation =
      selectedBuilding
        ?.ground_elevation_m ?? 500;

    /*
     * ----------------------------------------------------------
     * GROUND GRID
     * ----------------------------------------------------------
     */

    const grid =
      new THREE.GridHelper(
        240,
        24,
        0x334155,
        0x1e293b
      );

    grid.position.y =
      groundElevation - 0.2;

    scene.add(grid);

    /*
     * ----------------------------------------------------------
     * PARCEL BOUNDARY
     * ----------------------------------------------------------
     */

    if (
      activeLayers.showParcelBoundary &&
      parcelFootprint.length >= 3
    ) {
      const points =
        parcelFootprint.map(
          (point) =>
            new THREE.Vector3(
              point[0] - origin.x,
              groundElevation + 0.05,
              point[1] - origin.y
            )
        );

      points.push(
        points[0].clone()
      );

      const geometry =
        new THREE.BufferGeometry().setFromPoints(
          points
        );

      const line =
        new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({
            color: 0x60a5fa,
            transparent: true,
            opacity: 0.9
          })
        );

      scene.add(line);
    }

    /*
     * ----------------------------------------------------------
     * BUILDING ENVELOPE
     * ----------------------------------------------------------
     */

    const buildingMinZ =
      floors.length > 0
        ? Math.min(
            ...floors.map(
              (floor) => floor.z_min_m
            )
          )
        : groundElevation;

    const buildingMaxZ =
      floors.length > 0
        ? Math.max(
            ...floors.map(
              (floor) => floor.z_max_m
            )
          )
        : groundElevation + 15;

    if (
      selectedBuilding &&
      activeLayers.showBuildingEnvelope
    ) {
      const geometry =
        createExtrudedGeometry(
          buildingFootprint,
          buildingMinZ,
          buildingMaxZ,
          origin
        );

      const material =
        new THREE.MeshStandardMaterial({
          color: 0x64748b,
          transparent: true,
          opacity: 0.055,
          side: THREE.DoubleSide,
          depthWrite: false
        });

      const envelope =
        new THREE.Mesh(
          geometry,
          material
        );

      envelope.renderOrder = 0;

      scene.add(envelope);

      const edges =
        new THREE.EdgesGeometry(
          geometry
        );

      const edgeLines =
        new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({
            color: 0x94a3b8,
            transparent: true,
            opacity: 0.25
          })
        );

      scene.add(edgeLines);
    }

    /*
     * ----------------------------------------------------------
     * INTERACTIVE OBJECTS
     * ----------------------------------------------------------
     */

    const interactiveObjects:
      InteractiveObject[] = [];

    /*
     * ----------------------------------------------------------
     * FLOOR VOLUMES
     * ----------------------------------------------------------
     */

    floors.forEach(
      (floor: Floor) => {
        if (
          selectedFloorFilter !== 'ALL' &&
          selectedFloorFilter !==
            floor.floor_number
        ) {
          return;
        }

        if (
          isolatedFloor !== 'ALL' &&
          isolatedFloor !==
            floor.floor_number
        ) {
          return;
        }

        const isHovered =
          hoveredFloor ===
          floor.floor_number;

        const isIsolated =
          isolatedFloor ===
          floor.floor_number;

        const geometry =
          createExtrudedGeometry(
            buildingFootprint,
            floor.z_min_m,
            floor.z_max_m,
            origin
          );

        const material =
          new THREE.MeshStandardMaterial({
            color: getFloorColor(
              floor.floor_number,
              isHovered,
              isIsolated
            ),
            transparent: true,
            opacity: isHovered
              ? 0.34
              : isIsolated
                ? 0.22
                : 0.10,
            side: THREE.DoubleSide,
            depthWrite: false
          });

        const mesh =
          new THREE.Mesh(
            geometry,
            material
          ) as InteractiveObject;

        mesh.userData.targetType =
          'floor';

        mesh.userData.floorNumber =
          floor.floor_number;

        mesh.renderOrder = 1;

        scene.add(mesh);

        interactiveObjects.push(
          mesh
        );
      }
    );

    /*
     * ----------------------------------------------------------
     * PROPERTY UNIT VOLUMES
     * ----------------------------------------------------------
     */

    properties.forEach(
      (unit) => {
        if (
          selectedFloorFilter !== 'ALL' &&
          selectedFloorFilter !==
            unit.floor_number
        ) {
          return;
        }

        if (
          isolatedFloor !== 'ALL' &&
          isolatedFloor !==
            unit.floor_number
        ) {
          return;
        }

        const selected =
          selectedProperty?.id ===
          unit.id;

        const hovered =
          hoveredUnit === unit.id;

        /*
         * RULE_05 = volumetric overlap
         */
        const hasVolumetricConflict =
          validation?.results?.some(
            (result) =>
              result.target_object_id ===
                unit.id &&
              result.rule_id ===
                'RULE_05' &&
              result.status === 'FAIL'
          ) ?? false;

        const geometry =
          createExtrudedGeometry(
            unit.footprint_2d,
            unit.z_min_m,
            unit.z_max_m,
            origin
          );

        const color =
          hasVolumetricConflict
            ? 0xef4444
            : getUnitColor(
                unit,
                selected,
                hovered
              );

        const material =
          new THREE.MeshStandardMaterial({
            color,
            transparent: true,
            opacity:
              selected ||
              hovered ||
              hasVolumetricConflict
                ? 0.92
                : 0.76,
            metalness: 0.05,
            roughness: 0.55,
            side: THREE.DoubleSide
          });

        const mesh =
          new THREE.Mesh(
            geometry,
            material
          ) as InteractiveObject;

        mesh.userData.targetType =
          'unit';

        mesh.userData.property =
          unit;

        mesh.renderOrder = 5;

        scene.add(mesh);

        interactiveObjects.push(
          mesh
        );

        /*
         * Unit outline
         */
        const edges =
          new THREE.EdgesGeometry(
            geometry
          );

        const edgeColor =
          hasVolumetricConflict
            ? 0xff5555
            : selected
              ? 0xe879f9
              : hovered
                ? 0x67e8f9
                : 0x94a3b8;

        const edgeLines =
          new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({
              color: edgeColor,
              transparent: true,
              opacity:
                selected ||
                hovered ||
                hasVolumetricConflict
                  ? 1
                  : 0.45
            })
          );

        edgeLines.renderOrder = 6;

        scene.add(edgeLines);
      }
    );

    /*
     * ----------------------------------------------------------
     * UNDERGROUND
     * ----------------------------------------------------------
     */

    if (
      activeLayers.showUnderground
    ) {
      underground.forEach(
        (infra) => {
          const geometry =
            createExtrudedGeometry(
              getInfrastructureFootprint(
                infra.geometry_2d
              ),
              infra.z_min_m,
              infra.z_max_m,
              origin
            );

          const mesh =
            new THREE.Mesh(
              geometry,
              new THREE.MeshStandardMaterial({
                color: 0x6366f1,
                transparent: true,
                opacity: 0.38,
                side: THREE.DoubleSide
              })
            );

          scene.add(mesh);
        }
      );
    }

    /*
     * ----------------------------------------------------------
     * ELEVATED INFRASTRUCTURE
     * ----------------------------------------------------------
     */

    if (
      activeLayers.showElevated
    ) {
      elevated.forEach(
        (infra) => {
          const footprint =
            getInfrastructureFootprint(
              infra.geometry_2d
            );

          const geometry =
            createExtrudedGeometry(
              footprint,
              infra.z_min_m,
              infra.z_max_m,
              origin
            );

          const mesh =
            new THREE.Mesh(
              geometry,
              new THREE.MeshStandardMaterial({
                color: 0xf97316,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
              })
            );

          scene.add(mesh);

          /*
           * Support pillar
           */
          const centroid =
            getCentroid(
              footprint
            );

          const pillarHeight =
            Math.max(
              5,
              infra.z_min_m -
                groundElevation
            );

          const pillar =
            new THREE.Mesh(
              new THREE.CylinderGeometry(
                0.45,
                0.55,
                pillarHeight,
                12
              ),
              new THREE.MeshStandardMaterial({
                color: 0xc2410c
              })
            );

          pillar.position.set(
            centroid.x - origin.x,
            groundElevation +
              pillarHeight / 2,
            centroid.y - origin.y
          );

          scene.add(pillar);
        }
      );
    }

    /*
     * ----------------------------------------------------------
     * RURAL STRUCTURE CANDIDATES
     *
     * Candidate has location_2d, not footprint_2d.
     * ----------------------------------------------------------
     */

    if (
      activeLayers.showCandidates
    ) {
      candidates.forEach(
        (candidate) => {
          const location =
            candidate.location_2d;

          if (
            !location ||
            location.length < 2
          ) {
            return;
          }

          const x =
            location[0] - origin.x;

          const z =
            location[1] - origin.y;

          const height =
            candidate.estimated_height_m ||
            4;

          const width = 7;
          const depth = 6;

          const geometry =
            new THREE.BoxGeometry(
              width,
              height,
              depth
            );

          const isTemporary =
            candidate.permanence_classification ===
            'LIKELY_TEMPORARY';

          const mesh =
            new THREE.Mesh(
              geometry,
              new THREE.MeshStandardMaterial({
                color: isTemporary
                  ? 0xf59e0b
                  : 0x22c55e,
                transparent: true,
                opacity: 0.72
              })
            );

          mesh.position.set(
            x,
            groundElevation +
              height / 2,
            z
          );

          scene.add(mesh);

          /*
           * Candidate beacon
           */
          const beacon =
            new THREE.Mesh(
              new THREE.SphereGeometry(
                0.65,
                16,
                16
              ),
              new THREE.MeshBasicMaterial({
                color: 0xfacc15
              })
            );

          beacon.position.set(
            x,
            groundElevation +
              height +
              1.2,
            z
          );

          scene.add(beacon);
        }
      );
    }

    /*
     * ----------------------------------------------------------
     * Z AXIS
     * ----------------------------------------------------------
     */

    const zAxisX = -28;

    const zAxisHeight =
      Math.max(
        25,
        buildingMaxZ -
          buildingMinZ +
          10
      );

    const zAxis =
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(
          [
            new THREE.Vector3(
              zAxisX,
              buildingMinZ,
              0
            ),
            new THREE.Vector3(
              zAxisX,
              buildingMinZ +
                zAxisHeight,
              0
            )
          ]
        ),
        new THREE.LineBasicMaterial({
          color: 0x38bdf8
        })
      );

    scene.add(zAxis);

    const arrow =
      new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(
          zAxisX,
          buildingMinZ,
          0
        ),
        zAxisHeight,
        0x38bdf8,
        1.5,
        0.8
      );

    scene.add(arrow);

    /*
     * Floor ticks
     */
    floors.forEach(
      (floor) => {
        const tick =
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(
              [
                new THREE.Vector3(
                  zAxisX - 1.5,
                  floor.z_min_m,
                  0
                ),
                new THREE.Vector3(
                  zAxisX + 1.5,
                  floor.z_min_m,
                  0
                )
              ]
            ),
            new THREE.LineBasicMaterial({
              color: 0x64748b
            })
          );

        scene.add(tick);
      }
    );

    /*
     * ----------------------------------------------------------
     * CAMERA
     * ----------------------------------------------------------
     */

    const box =
      new THREE.Box3();

    scene.traverse(
      (object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.LineSegments ||
          object instanceof THREE.Line
        ) {
          box.expandByObject(
            object
          );
        }
      }
    );

    if (!box.isEmpty()) {
      const center =
        box.getCenter(
          new THREE.Vector3()
        );

      const size =
        box.getSize(
          new THREE.Vector3()
        );

      const maxDimension =
        Math.max(
          size.x,
          size.y,
          size.z
        );

      cameraValuesRef.current.target.copy(
        center
      );

      cameraValuesRef.current.radius =
        Math.max(
          45,
          maxDimension * 2.1
        );
    }

    /*
     * Restore saved camera when applicable.
     */
    if (
      cameraState &&
      cameraState.propertyId ===
        selectedProperty?.id
    ) {
      cameraValuesRef.current.radius =
        cameraState.radius;

      cameraValuesRef.current.theta =
        cameraState.theta;

      cameraValuesRef.current.phi =
        cameraState.phi;

      cameraValuesRef.current.target.set(
        ...cameraState.target
      );
    }

    const updateCamera =
      () => {
        const state =
          cameraValuesRef.current;

        const sinPhi =
          Math.sin(state.phi);

        camera.position.set(
          state.target.x +
            state.radius *
              sinPhi *
              Math.cos(
                state.theta
              ),

          state.target.y +
            state.radius *
              Math.cos(
                state.phi
              ),

          state.target.z +
            state.radius *
              sinPhi *
              Math.sin(
                state.theta
              )
        );

        camera.lookAt(
          state.target
        );
      };

    updateCamera();

    /*
     * ----------------------------------------------------------
     * RAYCASTING
     * ----------------------------------------------------------
     */

    const raycaster =
      new THREE.Raycaster();

    const pointer =
      new THREE.Vector2();

    const getIntersection =
      (event: MouseEvent) => {
        const rect =
          renderer.domElement.getBoundingClientRect();

        pointer.x =
          ((event.clientX -
            rect.left) /
            rect.width) *
            2 -
          1;

        pointer.y =
          -(
            (event.clientY -
              rect.top) /
              rect.height
          ) *
            2 +
          1;

        raycaster.setFromCamera(
          pointer,
          camera
        );

        const hits =
          raycaster.intersectObjects(
            interactiveObjects,
            false
          );

        return hits.length > 0
          ? hits[0]
          : null;
      };

    /*
     * ----------------------------------------------------------
     * HOVER
     * ----------------------------------------------------------
     */

    const handleHover =
      (event: MouseEvent) => {
        if (
          dragRef.current.active
        ) {
          setHoverTarget(null);
          setHoveredFloor(null);
          setHoveredUnit(null);
          return;
        }

        const hit =
          getIntersection(event);

        if (!hit) {
          setHoverTarget(null);
          setHoveredFloor(null);
          setHoveredUnit(null);
          renderer.domElement.style.cursor =
            'default';
          return;
        }

        const object =
          hit.object as InteractiveObject;

        const rect =
          renderer.domElement.getBoundingClientRect();

        const x =
          event.clientX -
          rect.left +
          14;

        const y =
          event.clientY -
          rect.top +
          14;

        /*
         * UNIT HOVER
         */
        if (
          object.userData.targetType ===
            'unit' &&
          object.userData.property
        ) {
          const unit =
            object.userData.property;

          setHoveredUnit(
            unit.id
          );

          setHoveredFloor(null);

          setHoverTarget({
            type: 'unit',
            unit,
            x,
            y
          });

          renderer.domElement.style.cursor =
            'pointer';

          return;
        }

        /*
         * FLOOR HOVER
         */
        if (
          object.userData.targetType ===
            'floor' &&
          object.userData.floorNumber !==
            undefined
        ) {
          const floor =
            floors.find(
              (item) =>
                item.floor_number ===
                object.userData
                  .floorNumber
            );

          if (floor) {
            setHoveredFloor(
              floor.floor_number
            );

            setHoveredUnit(null);

            setHoverTarget({
              type: 'floor',
              floorNumber:
                floor.floor_number,
              zMin:
                floor.z_min_m,
              zMax:
                floor.z_max_m,
              unitCount:
                floor.unit_count,
              x,
              y
            });

            renderer.domElement.style.cursor =
              'pointer';
          }
        }
      };

    /*
     * ----------------------------------------------------------
     * CLICK
     * ----------------------------------------------------------
     */

    const handleClick =
      (event: MouseEvent) => {
        if (
          dragRef.current.moved
        ) {
          dragRef.current.moved =
            false;

          return;
        }

        const hit =
          getIntersection(event);

        if (!hit) return;

        const object =
          hit.object as InteractiveObject;

        /*
         * Unit click
         */
        if (
          object.userData.targetType ===
            'unit' &&
          object.userData.property
        ) {
          const unit =
            object.userData.property;

          selectPropertyById(
            unit.id
          );

          setIsolatedFloor(
            unit.floor_number
          );

          setSelectedFloorFilter(
            unit.floor_number
          );

          return;
        }

        /*
         * Floor click
         */
        if (
          object.userData.targetType ===
            'floor' &&
          object.userData.floorNumber !==
            undefined
        ) {
          const floorNumber =
            object.userData.floorNumber;

          setIsolatedFloor(
            floorNumber
          );

          setSelectedFloorFilter(
            floorNumber
          );
        }
      };

    /*
     * ----------------------------------------------------------
     * ORBIT
     * ----------------------------------------------------------
     */

    const handlePointerDown =
      (event: MouseEvent) => {
        if (event.button !== 0) {
          return;
        }

        dragRef.current.active =
          true;

        dragRef.current.moved =
          false;

        dragRef.current.lastX =
          event.clientX;

        dragRef.current.lastY =
          event.clientY;

        renderer.domElement.style.cursor =
          'grabbing';
      };

    const handlePointerMove =
      (event: MouseEvent) => {
        if (
          !dragRef.current.active
        ) {
          handleHover(event);
          return;
        }

        const dx =
          event.clientX -
          dragRef.current.lastX;

        const dy =
          event.clientY -
          dragRef.current.lastY;

        if (
          Math.abs(dx) > 2 ||
          Math.abs(dy) > 2
        ) {
          dragRef.current.moved =
            true;
        }

        dragRef.current.lastX =
          event.clientX;

        dragRef.current.lastY =
          event.clientY;

        cameraValuesRef.current.theta -=
          dx * 0.008;

        cameraValuesRef.current.phi +=
          dy * 0.008;

        cameraValuesRef.current.phi =
          Math.max(
            0.2,
            Math.min(
              Math.PI - 0.2,
              cameraValuesRef.current.phi
            )
          );

        updateCamera();
      };

    const handlePointerUp =
      () => {
        dragRef.current.active =
          false;

        renderer.domElement.style.cursor =
          'default';
      };

    /*
     * ----------------------------------------------------------
     * ZOOM
     * ----------------------------------------------------------
     */

    const handleWheel =
      (event: WheelEvent) => {
        event.preventDefault();

        cameraValuesRef.current.radius *=
          event.deltaY > 0
            ? 1.1
            : 0.9;

        cameraValuesRef.current.radius =
          Math.max(
            10,
            Math.min(
              600,
              cameraValuesRef.current.radius
            )
          );

        updateCamera();
      };

    renderer.domElement.addEventListener(
      'mousedown',
      handlePointerDown
    );

    renderer.domElement.addEventListener(
      'mousemove',
      handlePointerMove
    );

    renderer.domElement.addEventListener(
      'mouseup',
      handlePointerUp
    );

    renderer.domElement.addEventListener(
      'mouseleave',
      handlePointerUp
    );

    renderer.domElement.addEventListener(
      'click',
      handleClick
    );

    renderer.domElement.addEventListener(
      'wheel',
      handleWheel,
      { passive: false }
    );

    /*
     * ----------------------------------------------------------
     * RESIZE
     * ----------------------------------------------------------
     */

    const handleResize =
      () => {
        const newWidth =
          mount.clientWidth;

        const newHeight =
          mount.clientHeight;

        camera.aspect =
          newWidth /
          newHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
          newWidth,
          newHeight
        );
      };

    window.addEventListener(
      'resize',
      handleResize
    );

    /*
     * ----------------------------------------------------------
     * ANIMATION
     * ----------------------------------------------------------
     */

    const animate =
      () => {
        animationRef.current =
          requestAnimationFrame(
            animate
          );

        renderer.render(
          scene,
          camera
        );
      };

    animate();

    /*
     * ----------------------------------------------------------
     * CLEANUP
     * ----------------------------------------------------------
     */

    return () => {
      if (
        animationRef.current !==
        null
      ) {
        cancelAnimationFrame(
          animationRef.current
        );
      }

      renderer.domElement.removeEventListener(
        'mousedown',
        handlePointerDown
      );

      renderer.domElement.removeEventListener(
        'mousemove',
        handlePointerMove
      );

      renderer.domElement.removeEventListener(
        'mouseup',
        handlePointerUp
      );

      renderer.domElement.removeEventListener(
        'mouseleave',
        handlePointerUp
      );

      renderer.domElement.removeEventListener(
        'click',
        handleClick
      );

      renderer.domElement.removeEventListener(
        'wheel',
        handleWheel
      );

      window.removeEventListener(
        'resize',
        handleResize
      );

      scene.traverse(
        (object) => {
          if (
            object instanceof
              THREE.Mesh ||
            object instanceof
              THREE.Line ||
            object instanceof
              THREE.LineSegments
          ) {
            object.geometry.dispose();

            if (
              Array.isArray(
                object.material
              )
            ) {
              object.material.forEach(
                (material) =>
                  material.dispose()
              );
            } else {
              object.material.dispose();
            }
          }
        }
      );

      renderer.dispose();

      if (
        renderer.domElement
          .parentElement === mount
      ) {
        mount.removeChild(
          renderer.domElement
        );
      }

      rendererRef.current =
        null;
    };
  }, [
    selectedParcel,
    selectedBuilding,
    floors,
    properties,
    selectedProperty,
    selectedFloorFilter,
    underground,
    elevated,
    candidates,
    activeLayers,
    isolatedFloor,
    hoveredFloor,
    hoveredUnit,
    validation,
    viewerRevision,
    cameraState,
    selectPropertyById,
    setSelectedFloorFilter
  ]);

  /*
   * ------------------------------------------------------------
   * RESET
   * ------------------------------------------------------------
   */

  const resetFloorIsolation =
    () => {
      setIsolatedFloor('ALL');
      setSelectedFloorFilter(
        'ALL'
      );
    };

  /*
   * ------------------------------------------------------------
   * CONFLICT
   * ------------------------------------------------------------
   */

  const hasConflict =
    selectedProperty?.verification_status ===
      'CORRECTION_REQUIRED' ||
    validation?.results?.some(
      (result) =>
        result.target_object_id ===
          selectedProperty?.id &&
        result.status === 'FAIL'
    ) === true;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/95 px-4 py-3">

        <div className="flex items-center gap-3">

          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-500/10">
            <Rotate3D
              size={18}
              className="text-cyan-400"
            />
          </div>

          <div>
            <div className="text-sm font-semibold text-white">
              3D Volumetric Cadastre
            </div>

            <div className="text-[11px] text-slate-400">
              Interactive vertical property view
            </div>
          </div>

        </div>

        <div className="flex items-center gap-2">

          <div className="mr-2 hidden items-center gap-1.5 text-[10px] text-slate-500 sm:flex">
            <MousePointer2 size={12} />
            Drag to orbit • Scroll to zoom • Click to inspect
          </div>

          <button
            onClick={
              resetFloorIsolation
            }
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-slate-700"
          >
            <RefreshCw size={13} />
            All Floors
          </button>

        </div>
      </div>

      {/* ======================================================
          VIEWER
      ====================================================== */}

      <div
        ref={mountRef}
        className="relative h-[500px] w-full"
      >

        {/* ====================================================
            HOVER TOOLTIP
        ==================================================== */}

        {hoverTarget && (
          <div
            className="pointer-events-none absolute z-30 min-w-[210px] rounded-xl border border-slate-600 bg-slate-950/95 px-3 py-2.5 shadow-2xl backdrop-blur"
            style={{
              left: Math.min(
                hoverTarget.x,
                650
              ),
              top: Math.min(
                hoverTarget.y,
                390
              )
            }}
          >

            {hoverTarget.type ===
            'floor' ? (
              <>
                <div className="flex items-center justify-between gap-3">

                  <span className="text-xs font-bold text-cyan-300">
                    FLOOR {hoverTarget.floorNumber}
                  </span>

                  <span className="rounded-full bg-cyan-500/10 px-1.5 py-0.5 text-[9px] text-cyan-300">
                    {hoverTarget.unitCount}{' '}
                    units
                  </span>

                </div>

                <div className="mt-2 space-y-1 text-[10px] text-slate-300">

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Z-min
                    </span>

                    <span>
                      {hoverTarget.zMin.toFixed(
                        2
                      )}{' '}
                      m
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Z-max
                    </span>

                    <span>
                      {hoverTarget.zMax.toFixed(
                        2
                      )}{' '}
                      m
                    </span>
                  </div>

                  <div className="mt-1 border-t border-slate-800 pt-1 text-cyan-300">
                    Click to isolate floor
                  </div>

                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">

                  <span className="text-xs font-bold text-cyan-300">
                    UNIT{' '}
                    {hoverTarget.unit.unit_number}
                  </span>

                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                      hoverTarget.unit
                        .verification_status ===
                      'CORRECTION_REQUIRED'
                        ? 'bg-red-500/10 text-red-300'
                        : hoverTarget.unit
                              .verification_status ===
                            'UNDER_REVIEW'
                          ? 'bg-amber-500/10 text-amber-300'
                          : 'bg-emerald-500/10 text-emerald-300'
                    }`}
                  >
                    {getStatusLabel(
                      hoverTarget.unit
                        .verification_status
                    )}
                  </span>

                </div>

                <div className="mt-2 space-y-1 text-[10px] text-slate-300">

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Floor
                    </span>

                    <span>
                      {
                        hoverTarget.unit
                          .floor_number
                      }
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Area
                    </span>

                    <span>
                      {hoverTarget.unit.area_sqm.toFixed(
                        2
                      )}{' '}
                      m²
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Z range
                    </span>

                    <span>
                      {hoverTarget.unit.z_min_m.toFixed(
                        2
                      )}
                      –
                      {hoverTarget.unit.z_max_m.toFixed(
                        2
                      )}{' '}
                      m
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      3D ID
                    </span>

                    <span className="max-w-[120px] truncate text-cyan-300">
                      {
                        hoverTarget.unit
                          .proposed_3d_id
                      }
                    </span>
                  </div>

                  <div className="mt-1 border-t border-slate-800 pt-1 text-cyan-300">
                    Click to inspect property
                  </div>

                </div>
              </>
            )}

          </div>
        )}

        {/* ====================================================
            VERTICAL FLOOR HUD
        ==================================================== */}

        {floors.length > 0 && (
          <div className="absolute right-3 top-3 z-20 w-40 rounded-xl border border-slate-700 bg-slate-950/85 p-3 backdrop-blur">

            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <Layers size={12} />
              Vertical Stack
            </div>

            <div className="max-h-[330px] space-y-1 overflow-y-auto">

              {[...floors]
                .sort(
                  (a, b) =>
                    b.floor_number -
                    a.floor_number
                )
                .map(
                  (floor) => {
                    const active =
                      isolatedFloor ===
                        floor.floor_number ||
                      selectedFloorFilter ===
                        floor.floor_number;

                    return (
                      <button
                        key={floor.id}
                        onClick={() => {
                          setIsolatedFloor(
                            floor.floor_number
                          );

                          setSelectedFloorFilter(
                            floor.floor_number
                          );
                        }}
                        className={`w-full rounded-md border px-2 py-1.5 text-left transition ${
                          active
                            ? 'border-cyan-400/30 bg-cyan-500/15'
                            : 'border-transparent hover:bg-slate-800'
                        }`}
                      >

                        <div className="flex items-center justify-between">

                          <span
                            className={`text-[10px] font-semibold ${
                              active
                                ? 'text-cyan-300'
                                : 'text-slate-300'
                            }`}
                          >
                            {floor.floor_name ||
                              `Floor ${floor.floor_number}`}
                          </span>

                          <span className="text-[9px] text-slate-500">
                            {floor.unit_count}
                          </span>

                        </div>

                        <div className="mt-0.5 text-[8px] text-slate-500">
                          {floor.z_min_m.toFixed(
                            1
                          )}
                          –
                          {floor.z_max_m.toFixed(
                            1
                          )}{' '}
                          m
                        </div>

                      </button>
                    );
                  }
                )}

            </div>
          </div>
        )}

        {/* ====================================================
            LAYER CONTROLS
        ==================================================== */}

        <div className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-1.5 rounded-xl border border-slate-700 bg-slate-950/85 p-2 backdrop-blur">

          {[
            {
              key: 'showUnderground' as const,
              label: 'Underground'
            },
            {
              key: 'showElevated' as const,
              label: 'Elevated'
            },
            {
              key: 'showCandidates' as const,
              label: 'Candidates'
            },
            {
              key: 'showBuildingEnvelope' as const,
              label: 'Envelope'
            },
            {
              key: 'showParcelBoundary' as const,
              label: 'Parcel'
            }
          ].map(
            (layer) => {
              const enabled =
                activeLayers[
                  layer.key
                ];

              return (
                <button
                  key={layer.key}
                  onClick={() =>
                    toggleLayer(
                      layer.key
                    )
                  }
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[9px] transition ${
                    enabled
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  {enabled ? (
                    <Eye size={11} />
                  ) : (
                    <EyeOff size={11} />
                  )}

                  {layer.label}
                </button>
              );
            }
          )}

        </div>

        {/* ====================================================
            CONFLICT BADGE
        ==================================================== */}

        {hasConflict && (
          <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/90 px-3 py-2 text-[10px] text-red-200 backdrop-blur">

            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />

            3D validation conflict detected

          </div>
        )}

        {/* ====================================================
            EMPTY STATE
        ==================================================== */}

        {!selectedBuilding &&
          properties.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">

              <div className="rounded-xl border border-slate-700 bg-slate-950/80 px-5 py-4 text-center backdrop-blur">

                <Box
                  size={26}
                  className="mx-auto mb-2 text-slate-500"
                />

                <div className="text-sm text-slate-300">
                  No vertical building data
                </div>

                <div className="mt-1 text-[10px] text-slate-500">
                  Select a parcel containing a building
                </div>

              </div>

            </div>
          )}

      </div>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/95 px-4 py-2.5">

        <div className="flex flex-wrap items-center gap-3 text-[9px] text-slate-400">

          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            Verified
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
            Under Review
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
            Conflict
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" />
            Selected
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-orange-500" />
            Elevated
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />
            Underground
          </div>

        </div>

        <div className="text-[9px] text-slate-500">
          Prototype 3D cadastral visualization • Z-axis = elevation
        </div>

      </div>
    </div>
  );
};

export { Viewer3D };
export default Viewer3D;