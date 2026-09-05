import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Box,
  Eye,
  EyeOff,
  Layers,
  RefreshCw,
  Rotate3D,
  MousePointer2,
  Lock,
  Unlock
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

type InteractiveObject = THREE.Mesh & {
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

  const [cameraLocked, setCameraLocked] =
    useState(false);

  // Prevent hover/floor/validation scene rebuilds from resetting the camera.
  const cameraFitKeyRef =
    useRef<string | null>(null);

  const cameraValuesRef = useRef({
    radius: 80,
    theta: Math.PI / 5,
    phi: Math.PI / 2.9,
    target: new THREE.Vector3(0, 8, 0)
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
      const xs = object.footprint_2d.map((p) => p[0]);
      const ys = object.footprint_2d.map((p) => p[1]);

      const width = Math.max(...xs) - Math.min(...xs);
      const depth = Math.max(...ys) - Math.min(...ys);

      // Reject degenerate/near-zero footprints so the viewer never
      // renders an invisible building.
      if (width > 2 && depth > 2) {
        return object.footprint_2d;
      }
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


  /*
   * ------------------------------------------------------------
   * SOCIETY / CONTEXT HELPERS
   * ------------------------------------------------------------
   * The selected building remains the real interactive cadastral
   * object. These surrounding elements are visual context only,
   * so the demo feels like a real apartment society instead of
   * an isolated CAD graph.
   */

  const addSocietyTree = (
    scene: THREE.Scene,
    x: number,
    z: number
  ) => {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
    );

    trunk.position.set(x, 1.1, z);
    scene.add(trunk);

    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(1.35, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        roughness: 0.9
      })
    );

    crown.position.set(x, 2.7, z);
    scene.add(crown);
  };

  const addSocietyBuilding = (
    scene: THREE.Scene,
    x: number,
    z: number,
    width: number,
    depth: number,
    floorsCount: number,
    label: string
  ) => {
    const floorHeight = 3.2;
    const totalHeight = floorsCount * floorHeight;

    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.userData.fitCamera = true;

    // Main block
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(width, totalHeight, depth),
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.72,
        metalness: 0.04
      })
    );

    body.position.y = totalHeight / 2;
    group.add(body);

    // Floor slabs
    for (let i = 1; i < floorsCount; i += 1) {
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.8, 0.14, depth + 0.8),
        new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          roughness: 0.7
        })
      );

      slab.position.y = i * floorHeight;
      group.add(slab);
    }

    // Roof slab
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(width + 1.2, 0.22, depth + 1.2),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.75
      })
    );

    roof.position.y = totalHeight + 0.1;
    group.add(roof);

    // Window strips on the front and back.
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x0c4a6e,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.1
    });

    const windowWidth = Math.max(1.4, width / 8);
    const windowHeight = 1.15;
    const columns = 5;

    for (let floor = 0; floor < floorsCount; floor += 1) {
      const y = floor * floorHeight + 1.7;

      for (let col = 0; col < columns; col += 1) {
        const px =
          -width / 2 +
          2.6 +
          col * ((width - 5.2) / Math.max(1, columns - 1));

        const front = new THREE.Mesh(
          new THREE.BoxGeometry(windowWidth, windowHeight, 0.08),
          windowMaterial
        );
        front.position.set(px, y, depth / 2 + 0.05);
        group.add(front);

        const back = front.clone();
        back.position.z = -depth / 2 - 0.05;
        group.add(back);
      }
    }

    // Entrance canopy
    const entrance = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 0.3, 2.8),
      new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.65
      })
    );

    entrance.position.set(0, 1.3, depth / 2 + 1.0);
    group.add(entrance);

    // Label plaque: visual-only, rendered as a small sign.
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(Math.min(12, width - 4), 1.0, 0.18),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.55
      })
    );

    sign.position.set(0, Math.min(totalHeight - 1.0, 8.5), depth / 2 + 0.15);
    group.add(sign);

    scene.add(group);
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

    // Real-world map-like atmosphere: sky tone + light distance fog.
    scene.background =
      new THREE.Color(0x9fd4f2);

    scene.fog = new THREE.Fog(
      0x9fd4f2,
      95,
      190
    );

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

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
        0xf5fbff,
        1.8
      )
    );

    const directional =
      new THREE.DirectionalLight(
        0xffffff,
        2
      );

    directional.position.set(
      55,
      85,
      45
    );

    directional.castShadow = true;
    directional.shadow.mapSize.set(1024, 1024);
    directional.shadow.camera.near = 1;
    directional.shadow.camera.far = 220;

    scene.add(directional);

    const hemisphere =
      new THREE.HemisphereLight(
        0xdff4ff,
        0x49634a,
        2.0
      );

    scene.add(hemisphere);

    /*
     * ----------------------------------------------------------
     * SKY / SUN
     * ----------------------------------------------------------
     */

    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(
        260,
        32,
        16
      ),
      new THREE.MeshBasicMaterial({
        color: 0xbfe6fb,
        side: THREE.BackSide
      })
    );

    skyDome.position.y = 45;
    scene.add(skyDome);

    const sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(
        5,
        24,
        16
      ),
      new THREE.MeshBasicMaterial({
        color: 0xfff3bf
      })
    );

    sunDisc.position.set(
      -75,
      90,
      -80
    );
    scene.add(sunDisc);

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
     * APARTMENT SOCIETY CONTEXT
     * ----------------------------------------------------------
     * The centre building is the actual cadastral object.
     * The surrounding block is a visual/demo context only.
     * ----------------------------------------------------------
     */

    if (selectedBuilding) {
      /*
       * Ground / landscaping base
       */
      const societyGround = new THREE.Mesh(
        new THREE.PlaneGeometry(150, 120),
        new THREE.MeshStandardMaterial({
          color: 0x66875b,
          roughness: 1
        })
      );

      societyGround.rotation.x = -Math.PI / 2;
      societyGround.position.y = -0.35;
      societyGround.receiveShadow = true;
      scene.add(societyGround);

      /*
       * Main driveway loop
       */
      const roadMaterial =
        new THREE.MeshStandardMaterial({
          color: 0x3e454c,
          roughness: 0.92
        });

      const road = new THREE.Mesh(
        new THREE.BoxGeometry(125, 0.18, 10),
        roadMaterial
      );
      road.position.set(0, -0.23, 32);
      road.receiveShadow = true;
      scene.add(road);

      const crossRoad = new THREE.Mesh(
        new THREE.BoxGeometry(10, 0.18, 100),
        roadMaterial
      );
      crossRoad.position.set(-38, -0.22, 0);
      crossRoad.receiveShadow = true;
      scene.add(crossRoad);

      /*
       * Road divider / curb
       */
      const curbMaterial =
        new THREE.MeshStandardMaterial({
          color: 0x64748b,
          roughness: 0.85
        });

      [-4.8, 4.8].forEach((offset) => {
        const curb = new THREE.Mesh(
          new THREE.BoxGeometry(125, 0.22, 0.35),
          curbMaterial
        );
        curb.position.set(0, -0.08, 32 + offset);
        scene.add(curb);
      });

      /*
       * Central landscaped garden.
       */
      const lawn = new THREE.Mesh(
        new THREE.BoxGeometry(25, 0.25, 18),
        new THREE.MeshStandardMaterial({
          color: 0x4e8a4e,
          roughness: 1
        })
      );
      lawn.position.set(-2, -0.16, 30);
      lawn.receiveShadow = true;
      scene.add(lawn);

      const gardenPath = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.12, 18),
        new THREE.MeshStandardMaterial({
          color: 0xb6a98d,
          roughness: 0.95
        })
      );
      gardenPath.position.set(-2, -0.01, 30);
      scene.add(gardenPath);

      /*
       * Two rows of proper parking bays.
       */
      for (let row = 0; row < 2; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          const slot = new THREE.Mesh(
            new THREE.BoxGeometry(4.2, 0.07, 7.2),
            new THREE.MeshStandardMaterial({
              color: 0x3d4652,
              roughness: 0.9
            })
          );

          slot.position.set(
            -25 + col * 5.2,
            -0.02,
            15 + row * 8
          );

          slot.receiveShadow = true;
          scene.add(slot);

          const divider = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.09, 7.0),
            new THREE.MeshBasicMaterial({
              color: 0xd5d9de
            })
          );

          divider.position.set(
            -27.6 + col * 5.2,
            0.03,
            15 + row * 8
          );

          scene.add(divider);
        }
      }

      /*
       * Society boundary wall sections.
       */
      const wallMaterial =
        new THREE.MeshStandardMaterial({
          color: 0x64748b,
          roughness: 0.8
        });

      [
        [0, -51, 120, 1],
        [60, 0, 1, 102],
        [-60, 0, 1, 102]
      ].forEach(([x, z, w, d]) => {
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(w, 1.2, d),
          wallMaterial
        );
        wall.position.set(x, 0.6, z);
        wall.receiveShadow = true;
        scene.add(wall);
      });

      /*
       * Gate pillars.
       */
      [-8, 8].forEach((x) => {
        const pillar = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 4.5, 1.8),
          new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            roughness: 0.68
          })
        );
        pillar.position.set(x, 2.25, -49);
        pillar.castShadow = true;
        scene.add(pillar);
      });

      /*
       * Secondary apartment: same society scale, visual context.
       * It has proper floors, windows, balconies and a roof.
       */
      addSocietyBuilding(
        scene,
        39,
        -8,
        20,
        16,
        5,
        'SUNRISE TOWER'
      );

      /*
       * Third small residential block makes the society feel occupied,
       * without stealing focus from the selected cadastral building.
       */
      addSocietyBuilding(
        scene,
        -35,
        -18,
        17,
        14,
        4,
        'PALM RESIDENCY'
      );

      /*
       * Street lamps / pedestrian-scale details.
       */
      [
        [-18, 24],
        [18, 24],
        [-43, -8],
        [43, -8]
      ].forEach(([x, z]) => {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(
            0.10,
            0.13,
            4.2,
            10
          ),
          new THREE.MeshStandardMaterial({
            color: 0x334155,
            roughness: 0.55,
            metalness: 0.25
          })
        );

        pole.position.set(
          x,
          2.1,
          z
        );
        pole.castShadow = true;
        scene.add(pole);

        const lamp = new THREE.Mesh(
          new THREE.SphereGeometry(
            0.28,
            12,
            8
          ),
          new THREE.MeshStandardMaterial({
            color: 0xfff4c2,
            emissive: 0xffd76a,
            emissiveIntensity: 0.8
          })
        );

        lamp.position.set(
          x,
          4.25,
          z
        );
        scene.add(lamp);
      });

      /*
       * Trees and landscaping.
       */
      [
        [-30, 30],
        [-22, 29],
        [24, 29],
        [31, 25],
        [25, -22],
        [8, -30],
        [-20, -29],
        [-43, 15],
        [47, 20]
      ].forEach(([x, z]) =>
        addSocietyTree(scene, x, z)
      );
    }

    /*
     * ----------------------------------------------------------
     * GROUND GRID
     * ----------------------------------------------------------
     */

    const grid =
      new THREE.GridHelper(
        130,
        26,
        0x243449,
        0x142235
      );

    // Keep the 3D scene in a local elevation frame.
    // The real cadastral Z values (~500m) are metadata; rendering starts at local 0m.
    grid.position.y = -0.2;

    grid.material.transparent = true;
    grid.visible = false;
    scene.add(grid);

    /*
     * ----------------------------------------------------------
     * TERRAIN / MAP-LIKE BASE
     *
     * No visible graph grid. A large physical ground plane,
     * subtle terrain patches, roads and landscaping create the
     * Google-Earth-like spatial feel.
     * ----------------------------------------------------------
     */

    const terrain = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 120, 1, 1),
      new THREE.MeshStandardMaterial({
        color: 0x6f9564,
        roughness: 1,
        metalness: 0
      })
    );

    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -0.38;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Soft terrain patches, not a mathematical grid.
    [
      { x: -40, z: -30, w: 34, d: 22, c: 0x789b69 },
      { x: 35, z: 25, w: 38, d: 28, c: 0x668d5d },
      { x: -10, z: 42, w: 28, d: 18, c: 0x7fa56c },
      { x: 45, z: -28, w: 25, d: 20, c: 0x72945f }
    ].forEach((patch) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(
          patch.w,
          patch.d
        ),
        new THREE.MeshStandardMaterial({
          color: patch.c,
          roughness: 1
        })
      );

      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(
        patch.x,
        -0.34,
        patch.z
      );
      mesh.receiveShadow = true;
      scene.add(mesh);
    });

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
              0.05,
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
          buildingMinZ - groundElevation,
          buildingMaxZ - groundElevation,
          origin
        );

      const material =
        new THREE.MeshStandardMaterial({
          color: 0x64748b,
          transparent: true,
          opacity: 0.018,
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
            opacity: 0.10
          })
        );

      scene.add(edgeLines);
    }

    /*
     * ----------------------------------------------------------
     * HERO APARTMENT BUILDING
     *
     * The real Floor + PropertyUnit records drive the interactive
     * building. Visual geometry is normalized into an architectural
     * apartment scale so it reads like a real society.
     * ----------------------------------------------------------
     */

    const interactiveObjects:
      InteractiveObject[] = [];

    const heroWidth = 28;
    const heroDepth = 18;

    const visibleFloors = floors.filter((floor) => {
      if (
        selectedFloorFilter !== 'ALL' &&
        selectedFloorFilter !== floor.floor_number
      ) {
        return false;
      }

      if (
        isolatedFloor !== 'ALL' &&
        isolatedFloor !== floor.floor_number
      ) {
        return false;
      }

      return true;
    });

    /*
     * Hero plinth
     */
    if (selectedBuilding && floors.length > 0) {
      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(
          heroWidth + 2.2,
          0.65,
          heroDepth + 2.2
        ),
        new THREE.MeshStandardMaterial({
          color: 0x4b5563,
          roughness: 0.86
        })
      );

      plinth.position.y = -0.32;
      plinth.castShadow = true;
      plinth.receiveShadow = true;
      scene.add(plinth);
    }

    /*
     * Floor-by-floor architectural stack.
     */
    visibleFloors.forEach((floor: Floor) => {
      const localMin =
        floor.z_min_m - groundElevation;

      const localMax =
        floor.z_max_m - groundElevation;

      const actualHeight =
        Math.max(2.6, localMax - localMin);

      const isHovered =
        hoveredFloor === floor.floor_number;

      const isIsolated =
        isolatedFloor === floor.floor_number ||
        selectedFloorFilter === floor.floor_number;

      /*
       * When a floor is hovered, other floors become subdued.
       * This creates the cutaway/inspection feeling from a GIS
       * volumetric viewer.
       */
      const otherFloor =
        hoveredFloor !== null &&
        !isHovered;

      const floorShell =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            heroWidth,
            actualHeight - 0.22,
            heroDepth
          ),
          new THREE.MeshStandardMaterial({
            color:
              isHovered
                ? 0x22d3ee
                : isIsolated
                  ? 0x8b5cf6
                  : 0x64748b,
            transparent: true,
            opacity:
              otherFloor
                ? 0.025
                : isHovered
                  ? 0.18
                  : isIsolated
                    ? 0.12
                    : 0.065,
            roughness: 0.58,
            metalness: 0.03,
            side: THREE.DoubleSide,
            depthWrite: false
          })
        ) as InteractiveObject;

      floorShell.position.set(
        0,
        localMin + actualHeight / 2,
        0
      );

      floorShell.userData.targetType = 'floor';
      floorShell.userData.floorNumber =
        floor.floor_number;
      floorShell.userData.fitCamera = true;
      floorShell.renderOrder = 1;

      scene.add(floorShell);
      interactiveObjects.push(floorShell);

      /*
       * Floor slab.
       */
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(
          heroWidth + 0.55,
          0.16,
          heroDepth + 0.55
        ),
        new THREE.MeshStandardMaterial({
          color:
            isHovered
              ? 0x67e8f9
              : 0x94a3b8,
          roughness: 0.74
        })
      );

      slab.position.set(
        0,
        localMin,
        0
      );

      slab.castShadow = true;
      slab.receiveShadow = true;
      scene.add(slab);

      /*
       * Real property units on this floor.
       */
      const floorUnits =
        properties.filter(
          (unit) =>
            unit.floor_number ===
            floor.floor_number
        );

      floorUnits.forEach(
        (unit, unitIndex) => {
          const selected =
            selectedProperty?.id === unit.id;

          const hovered =
            hoveredUnit === unit.id;

          const conflict =
            validation?.results?.some(
              (result) =>
                result.target_object_id === unit.id &&
                result.rule_id === 'RULE_05' &&
                result.status === 'FAIL'
            ) ?? false;

          const unitWidth =
            Math.min(
              12.8,
              heroWidth / 2 - 0.8
            );

          const unitDepth =
            heroDepth - 2.4;

          const unitHeight =
            Math.max(
              2.15,
              actualHeight - 0.50
            );

          const side =
            unitIndex % 2 === 0
              ? -1
              : 1;

          const unitMesh =
            new THREE.Mesh(
              new THREE.BoxGeometry(
                unitWidth,
                unitHeight,
                unitDepth
              ),
              new THREE.MeshStandardMaterial({
                color:
                  conflict
                    ? 0xef4444
                    : selected
                      ? 0xa855f7
                      : hovered
                        ? 0x22d3ee
                        : 0x64748b,
                transparent: true,
                opacity:
                  conflict ||
                  selected ||
                  hovered
                    ? 0.88
                    : 0.48,
                roughness: 0.58,
                metalness: 0.08,
                side: THREE.DoubleSide
              })
            ) as InteractiveObject;

          unitMesh.position.set(
            side *
              (unitWidth / 2 + 0.20),
            localMin +
              0.27 +
              unitHeight / 2,
            0
          );

          unitMesh.userData.targetType = 'unit';
          unitMesh.userData.property = unit;
          unitMesh.userData.fitCamera = true;
          unitMesh.renderOrder = 5;

          unitMesh.castShadow = true;
          unitMesh.receiveShadow = true;

          scene.add(unitMesh);
          interactiveObjects.push(unitMesh);

          /*
           * Unit border.
           */
          const edge =
            new THREE.LineSegments(
              new THREE.EdgesGeometry(
                unitMesh.geometry
              ),
              new THREE.LineBasicMaterial({
                color:
                  conflict
                    ? 0xff3b30
                    : selected
                      ? 0xe879f9
                      : hovered
                        ? 0x67e8f9
                        : 0xdbeafe,
                transparent: true,
                opacity:
                  conflict ||
                  selected ||
                  hovered
                    ? 1
                    : 0.32
              })
            );

          edge.position.copy(
            unitMesh.position
          );

          edge.renderOrder = 6;
          scene.add(edge);

          /*
           * Balcony.
           */
          const balcony =
            new THREE.Mesh(
              new THREE.BoxGeometry(
                unitWidth * 0.70,
                0.14,
                2.0
              ),
              new THREE.MeshStandardMaterial({
                color: 0x7c8798,
                roughness: 0.7
              })
            );

          balcony.position.set(
            side *
              (unitWidth / 2 + 0.20),
            localMin + 0.72,
            heroDepth / 2 + 0.95
          );

          balcony.castShadow = true;
          scene.add(balcony);

          /*
           * Balcony glass/rail.
           */
          const rail =
            new THREE.Mesh(
              new THREE.BoxGeometry(
                unitWidth * 0.70,
                0.72,
                0.08
              ),
              new THREE.MeshStandardMaterial({
                color: 0xcbd5e1,
                roughness: 0.35,
                metalness: 0.2,
                transparent: true,
                opacity: 0.72
              })
            );

          rail.position.set(
            side *
              (unitWidth / 2 + 0.20),
            localMin + 1.12,
            heroDepth / 2 + 1.90
          );

          scene.add(rail);

          /*
           * Front facade windows.
           */
          const glass =
            new THREE.MeshStandardMaterial({
              color: 0x7dd3fc,
              emissive: 0x075985,
              emissiveIntensity: 0.38,
              roughness: 0.18,
              metalness: 0.18
            });

          for (
            let windowIndex = 0;
            windowIndex < 3;
            windowIndex += 1
          ) {
            const windowMesh =
              new THREE.Mesh(
                new THREE.BoxGeometry(
                  1.65,
                  1.05,
                  0.10
                ),
                glass
              );

            windowMesh.position.set(
              side *
                (unitWidth / 2 + 0.20),
              localMin + 1.70,
              -4.2 +
                windowIndex * 4.1
            );

            windowMesh.rotation.y =
              Math.PI / 2;

            scene.add(windowMesh);
          }
        });

      /*
       * Architectural corner columns.
       */
      [-heroWidth / 2, heroWidth / 2].forEach((x) => {
        const column =
          new THREE.Mesh(
            new THREE.BoxGeometry(
              0.42,
              actualHeight,
              0.42
            ),
            new THREE.MeshStandardMaterial({
              color: 0x7c8798,
              roughness: 0.66
            })
          );

        column.position.set(
          x,
          localMin + actualHeight / 2,
          heroDepth / 2
        );

        column.castShadow = true;
        scene.add(column);
      });
    });

    /*
     * Roof terrace + utility room.
     */
    if (selectedBuilding && floors.length > 0) {
      const roofZ =
        Math.max(
          ...floors.map(
            (floor) =>
              floor.z_max_m -
              groundElevation
          )
        );

      const roof =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            heroWidth + 1.1,
            0.32,
            heroDepth + 1.1
          ),
          new THREE.MeshStandardMaterial({
            color: 0x273244,
            roughness: 0.76
          })
        );

      roof.position.set(
        0,
        roofZ + 0.16,
        0
      );

      roof.castShadow = true;
      scene.add(roof);

      const utility =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            5.5,
            1.7,
            4.2
          ),
          new THREE.MeshStandardMaterial({
            color: 0x475569,
            roughness: 0.78
          })
        );

      utility.position.set(
        0,
        roofZ + 1.0,
        0
      );

      utility.castShadow = true;
      scene.add(utility);
    }

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
              infra.z_min_m - groundElevation,
              infra.z_max_m - groundElevation,
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
              infra.z_min_m - groundElevation,
              infra.z_max_m - groundElevation,
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
              buildingMinZ - groundElevation,
              0
            ),
            new THREE.Vector3(
              zAxisX,
              buildingMinZ -
                groundElevation +
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
          buildingMinZ - groundElevation,
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
                  floor.z_min_m - groundElevation,
                  0
                ),
                new THREE.Vector3(
                  zAxisX + 1.5,
                  floor.z_min_m - groundElevation,
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

    /*
     * ----------------------------------------------------------
     * CAMERA FIT
     * ----------------------------------------------------------
     * Frame the apartment society, not the huge grid.
     */

    const societyBox = new THREE.Box3();

    // Main selected building.
    if (floors.length > 0) {
      societyBox.expandByPoint(
        new THREE.Vector3(
          -20,
          0,
          -15
        )
      );
      societyBox.expandByPoint(
        new THREE.Vector3(
          65,
          Math.max(18, buildingMaxZ - groundElevation),
          45
        )
      );
    }

    const societyCenter = societyBox.getCenter(
      new THREE.Vector3()
    );

    const societySize = societyBox.getSize(
      new THREE.Vector3()
    );

    const cameraFitKey = [
      selectedParcel?.id ?? 'no-parcel',
      selectedBuilding?.id ?? 'no-building',
      floors
        .map(
          (floor) =>
            `${floor.id}:${floor.z_min_m}:${floor.z_max_m}`
        )
        .join('|')
    ].join('::');

    /*
     * Only auto-fit when the spatial subject changes.
     * Hover, validation and floor highlighting must never reset
     * the user's current zoom/rotation.
     */
    if (
      cameraFitKeyRef.current !== cameraFitKey
    ) {
      cameraFitKeyRef.current = cameraFitKey;

      cameraValuesRef.current.target.set(
        societyCenter.x,
        Math.max(
          6,
          (buildingMaxZ - groundElevation) * 0.42
        ),
        societyCenter.z
      );

      cameraValuesRef.current.radius = Math.max(
        62,
        Math.max(
          societySize.x,
          societySize.y * 1.4,
          societySize.z
        ) * 1.45
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

        if (!hits.length) {
          return null;
        }

        // Units are the most important inspection target.
        // If a floor shell overlaps a unit, prefer the unit hit.
        const unitHit = hits.find(
          (hit) =>
            (hit.object as InteractiveObject)
              .userData.targetType === 'unit'
        );

        return unitHit ?? hits[0];
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
        if (
          cameraLocked ||
          event.button !== 0
        ) {
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

        if (cameraLocked) {
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
        if (cameraLocked) {
          event.preventDefault();
          return;
        }

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
    setSelectedFloorFilter,
    cameraLocked
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

  const toggleCameraLock = () => {
    dragRef.current.active = false;
    dragRef.current.moved = false;
    setCameraLocked(
      (locked) => !locked
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

          <button
            onClick={toggleCameraLock}
            title={
              cameraLocked
                ? 'Unlock camera to orbit and zoom'
                : 'Lock current camera position'
            }
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
              cameraLocked
                ? 'border-amber-400/40 bg-amber-500/15 text-amber-200'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {cameraLocked ? (
              <Lock size={13} />
            ) : (
              <Unlock size={13} />
            )}
            {cameraLocked ? 'Locked' : 'Lock View'}
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

        {selectedBuilding && (
          <div className="pointer-events-none absolute bottom-16 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-cyan-400/20 bg-slate-950/80 px-3 py-1.5 text-center backdrop-blur">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
              {selectedBuilding.name || selectedBuilding.building_code}
            </div>
            <div className="text-[8px] text-slate-500">
              Selected cadastral building • surrounding blocks are demo context
            </div>
          </div>
        )}

        {cameraLocked && (
          <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-slate-950/85 px-2.5 py-1.5 text-[10px] text-amber-200 shadow-lg backdrop-blur">
            <Lock size={11} />
            Camera locked
          </div>
        )}

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