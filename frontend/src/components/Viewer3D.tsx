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
  Unlock,
  PanelRight,
  PanelRightClose,
  UnfoldVertical,
  FoldVertical,
  Scissors,
  UserRound,
  ShieldCheck,
  Map,
  History,
  Crosshair,
  Maximize2,
  Minimize2,
  RotateCcw,
  Camera,
  Layers3,
  Activity,
  Info,
  Clock3,
  GripVertical,
  X
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

  // Toggle the floor-stack HUD so it never has to interfere with the map.
  const [showVerticalStack, setShowVerticalStack] =
    useState(false);

  // Exploded floor inspection mode.
  const [explodedView, setExplodedView] =
    useState(false);

  // 10-part next-level inspection controls.
  const [xrayMode, setXrayMode] = useState(false);

  // Only ONE floating utility panel can be open at a time.
  type FloatingPanel =
    | 'stack'
    | 'camera'
    | 'spatial'
    | 'inspector'
    | 'identity'
    | 'history'
    | null;

  const [activePanel, setActivePanel] =
    useState<FloatingPanel>(null);

  const [showInspector, setShowInspector] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [showIdentityCard, setShowIdentityCard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCameraModes, setShowCameraModes] = useState(false);

  // Horizontal toolbar scroll: lets the user swipe/slide to reach the last tools.
  const toolbarScrollRef = useRef<HTMLDivElement | null>(null);
  const [toolbarScrollMax, setToolbarScrollMax] = useState(0);
  const [toolbarScrollValue, setToolbarScrollValue] = useState(0);

  const updateToolbarScrollMetrics = () => {
    const el = toolbarScrollRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    setToolbarScrollMax(max);
    setToolbarScrollValue(Math.min(max, el.scrollLeft));
  };

  useEffect(() => {
    updateToolbarScrollMetrics();
    const el = toolbarScrollRef.current;
    if (!el) return;

    const onScroll = () => {
      setToolbarScrollValue(el.scrollLeft);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    const observer = new ResizeObserver(updateToolbarScrollMetrics);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);

    return () => {
      el.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  const handleToolbarSlider = (value: number) => {
    const el = toolbarScrollRef.current;
    if (!el) return;
    el.scrollTo({ left: value, behavior: 'smooth' });
    setToolbarScrollValue(value);
  };

  const [panelOffsets, setPanelOffsets] = useState<
    Record<Exclude<FloatingPanel, null>, { x: number; y: number }>
  >({
    stack: { x: 0, y: 0 },
    camera: { x: 0, y: 0 },
    spatial: { x: 0, y: 0 },
    inspector: { x: 0, y: 0 },
    identity: { x: 0, y: 0 },
    history: { x: 0, y: 0 }
  });

  const panelDragRef = useRef<{
    panel: Exclude<FloatingPanel, null> | null;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({
    panel: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0
  });

  const closeFloatingPanels = () => {
    setActivePanel(null);
    setShowVerticalStack(false);
    setShowInspector(false);
    setShowMiniMap(false);
    setShowIdentityCard(false);
    setShowHistory(false);
    setShowCameraModes(false);
  };

  const openFloatingPanel = (
    panel: Exclude<FloatingPanel, null>
  ) => {
    setActivePanel(panel);
    setShowVerticalStack(panel === 'stack');
    setShowInspector(panel === 'inspector');
    setShowMiniMap(panel === 'spatial');
    setShowIdentityCard(panel === 'identity');
    setShowHistory(panel === 'history');
    setShowCameraModes(panel === 'camera');
  };

  const toggleFloatingPanel = (
    panel: Exclude<FloatingPanel, null>
  ) => {
    if (activePanel === panel) {
      closeFloatingPanels();
    } else {
      openFloatingPanel(panel);
    }
  };

  const startPanelDrag = (
    panel: Exclude<FloatingPanel, null>,
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    // Do not hijack pointer events from buttons/links inside the panel header.
    // This keeps the X close button clickable while the rest of the header remains draggable.
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea')) return;

    event.preventDefault();
    event.stopPropagation();

    const origin = panelOffsets[panel];

    panelDragRef.current = {
      panel,
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = panelDragRef.current;

      if (!drag.panel) return;

      const nextX =
        drag.originX +
        event.clientX -
        drag.startX;

      const nextY =
        drag.originY +
        event.clientY -
        drag.startY;

      setPanelOffsets((current) => ({
        ...current,
        [drag.panel!]: {
          x: Math.max(-260, Math.min(260, nextX)),
          y: Math.max(-180, Math.min(260, nextY))
        }
      }));
    };

    const stopDrag = () => {
      panelDragRef.current.panel = null;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopDrag);
      window.removeEventListener('pointercancel', stopDrag);
    };
  }, []);
  const [cameraMode, setCameraMode] = useState<'ORBIT' | 'TOP' | 'FRONT' | 'SIDE'>('ORBIT');
  const [transition2D3D, setTransition2D3D] = useState(false);
  const [timeIndex, setTimeIndex] = useState(2);
  const [cutawayHeight, setCutawayHeight] = useState(8);
  const [focusPulse, setFocusPulse] = useState(false);
  const [spatialFocus, setSpatialFocus] = useState<'BUILDING' | 'SOCIETY' | 'NORTH' | 'SOUTH'>('BUILDING');

  // Prevent hover/floor/validation scene rebuilds from resetting the camera.
  const cameraFitKeyRef =
    useRef<string | null>(null);

  const cameraValuesRef = useRef({
    radius: 92,
    theta: Math.PI / 4.2,
    phi: Math.PI / 2.85,
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
    z: number,
    scale = 1
  ) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.26, 2.5, 9),
      new THREE.MeshStandardMaterial({
        color: 0x6b4f35,
        roughness: 1
      })
    );
    trunk.position.y = 1.25;
    trunk.castShadow = true;
    group.add(trunk);

    const foliageMaterial = new THREE.MeshStandardMaterial({
      color: 0x2f6f3e,
      roughness: 1
    });

    // Layered foliage gives a rounded canopy instead of a single sphere.
    [
      { y: 2.35, r: 1.15, s: 1.0 },
      { y: 3.0, r: 1.35, s: 0.92 },
      { y: 3.65, r: 1.0, s: 0.86 }
    ].forEach((part) => {
      const crown = new THREE.Mesh(
        new THREE.IcosahedronGeometry(part.r, 1),
        foliageMaterial
      );
      crown.position.y = part.y;
      crown.scale.set(1, part.s, 1);
      crown.castShadow = true;
      group.add(crown);
    });

    scene.add(group);
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
    const floorHeight = 3.15;
    const totalHeight = floorsCount * floorHeight;
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xc9bda9,
      roughness: 0.82
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x8d7964,
      roughness: 0.8
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x5f9fb8,
      roughness: 0.18,
      metalness: 0.12,
      transparent: true,
      opacity: 0.88
    });

    // Main warm-stone residential mass.
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(width, totalHeight, depth),
      bodyMat
    );
    body.position.y = totalHeight / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Central recessed facade band.
    const centralBand = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.42, totalHeight - 0.5, 0.22),
      accentMat
    );
    centralBand.position.set(0, totalHeight / 2, depth / 2 + 0.12);
    group.add(centralBand);

    for (let floor = 0; floor < floorsCount; floor += 1) {
      const y = floor * floorHeight + 1.65;

      // Thin floor bands.
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.25, 0.11, depth + 0.25),
        new THREE.MeshStandardMaterial({
          color: 0xe3d8c7,
          roughness: 0.8
        })
      );
      band.position.y = floor * floorHeight + 0.08;
      group.add(band);

      // Front windows, grouped into apartment-like bays.
      for (let col = 0; col < 5; col += 1) {
        const px =
          -width / 2 +
          2.5 +
          col * ((width - 5) / 4);

        const window = new THREE.Mesh(
          new THREE.BoxGeometry(2.05, 1.35, 0.08),
          glassMat
        );
        window.position.set(px, y, depth / 2 + 0.16);
        group.add(window);

        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(2.28, 1.58, 0.07),
          new THREE.MeshStandardMaterial({
            color: 0xefe7da,
            roughness: 0.65
          })
        );
        frame.position.set(px, y, depth / 2 + 0.12);
        group.add(frame);
        // Re-add glass slightly forward so the frame reads as a surround.
        window.position.z = depth / 2 + 0.205;
      }

      // Balconies on selected bays, not every facade bay.
      if (floor % 2 === 0) {
        [-1, 1].forEach((side) => {
          const balcony = new THREE.Mesh(
            new THREE.BoxGeometry(4.2, 0.16, 2.2),
            new THREE.MeshStandardMaterial({
              color: 0xb9aa96,
              roughness: 0.8
            })
          );
          balcony.position.set(
            side * (width * 0.27),
            floor * floorHeight + 0.58,
            depth / 2 + 1.0
          );
          balcony.castShadow = true;
          group.add(balcony);

          const railing = new THREE.Mesh(
            new THREE.BoxGeometry(4.2, 0.85, 0.08),
            new THREE.MeshStandardMaterial({
              color: 0x9aa7ad,
              roughness: 0.35,
              metalness: 0.35,
              transparent: true,
              opacity: 0.72
            })
          );
          railing.position.set(
            side * (width * 0.27),
            floor * floorHeight + 1.02,
            depth / 2 + 2.05
          );
          group.add(railing);
        });
      }
    }

    // Side stair/elevator tower.
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.18, totalHeight + 0.4, depth * 0.42),
      new THREE.MeshStandardMaterial({
        color: 0xb4a48f,
        roughness: 0.85
      })
    );
    core.position.set(width * 0.34, (totalHeight + 0.4) / 2, -depth * 0.02);
    core.castShadow = true;
    group.add(core);

    // Entrance canopy and steps.
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 0.24, 3.0),
      new THREE.MeshStandardMaterial({
        color: 0x5f5143,
        roughness: 0.7
      })
    );
    canopy.position.set(0, 1.8, depth / 2 + 1.15);
    canopy.castShadow = true;
    group.add(canopy);

    const steps = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.45, 1.8),
      new THREE.MeshStandardMaterial({
        color: 0xa89a86,
        roughness: 0.9
      })
    );
    steps.position.set(0, 0.23, depth / 2 + 0.75);
    group.add(steps);

    // Rooftop parapet + small utility/solar structures.
    const parapet = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.5, 0.75, depth + 0.5),
      new THREE.MeshStandardMaterial({
        color: 0x746453,
        roughness: 0.85
      })
    );
    parapet.position.y = totalHeight + 0.25;
    group.add(parapet);

    const roofDeck = new THREE.Mesh(
      new THREE.BoxGeometry(width - 1.0, 0.12, depth - 1.0),
      new THREE.MeshStandardMaterial({
        color: 0xb7aa97,
        roughness: 0.9
      })
    );
    roofDeck.position.y = totalHeight + 0.66;
    group.add(roofDeck);

    [-width * 0.25, width * 0.12].forEach((px) => {
      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 0.9, 1.5, 12),
        new THREE.MeshStandardMaterial({
          color: 0xddd8cc,
          roughness: 0.7
        })
      );
      tank.position.set(px, totalHeight + 1.45, 0);
      tank.castShadow = true;
      group.add(tank);
    });

    // Small AC condenser units along the side.
    for (let floor = 0; floor < floorsCount; floor += 1) {
      const ac = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.58, 0.42),
        new THREE.MeshStandardMaterial({
          color: 0xddd7cb,
          roughness: 0.8
        })
      );
      ac.position.set(
        -width / 2 - 0.24,
        floor * floorHeight + 1.25,
        0
      );
      group.add(ac);
    }

    // Label kept as metadata plaque, not as a giant 3D block.
    group.userData.label = label;
    group.userData.fitCamera = true;

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
   * HERO BUILDING / NORMAL ARCHITECTURAL LOOK
   * ------------------------------------------------------------
   * Default state is an opaque residential building inspired by
   * the reference: warm facade, horizontal floor bands, windows,
   * balconies, roof parapet and rooftop equipment.
   *
   * IMPORTANT:
   * This is visual presentation geometry. The actual cadastral
   * Floor + PropertyUnit records remain the source of truth.
   * ------------------------------------------------------------
   */

  const HERO_WIDTH = 28;
  const HERO_DEPTH = 18;

  // Keep the real cadastral building behind the main society road.
  // This avoids the building sitting in the middle of the road.
  const HERO_POSITION_X = 0;
  const HERO_POSITION_Z = -19;

  const getHeroFloorY = (
    floor: Floor,
    floorIndex: number,
    groundElevation: number,
    exploded: boolean
  ) => {
    const localMin = floor.z_min_m - groundElevation;
    const localMax = floor.z_max_m - groundElevation;
    const actualHeight = Math.max(2.6, localMax - localMin);

    return {
      localMin,
      localMax,
      actualHeight,
      explosionOffset: exploded ? floorIndex * 4.5 : 0
    };
  };

  const addHeroArchitecturalDetail = (
    scene: THREE.Scene,
    floor: Floor,
    floorIndex: number,
    groundElevation: number,
    exploded: boolean,
    isXray: boolean,
    inspectionFloor: number | null
  ) => {
    const {
      localMin,
      actualHeight,
      explosionOffset
    } = getHeroFloorY(
      floor,
      floorIndex,
      groundElevation,
      exploded
    );

    const isInspectionFloor =
      inspectionFloor === floor.floor_number;

    const facadeMaterial = new THREE.MeshStandardMaterial({
      color: isInspectionFloor && isXray ? 0xb7c4cb : 0xd4c2a9,
      roughness: 0.84,
      metalness: 0.02,
      transparent: isXray,
      opacity: isXray
        ? isInspectionFloor
          ? 0.11
          : 0.035
        : 1
    });

    const floorBandMaterial = new THREE.MeshStandardMaterial({
      color: 0xeee5d7,
      roughness: 0.76,
      transparent: isXray,
      opacity: isXray
        ? isInspectionFloor
          ? 0.30
          : 0.08
        : 1
    });

    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x5d91a5,
      roughness: 0.16,
      metalness: 0.14,
      transparent: isXray,
      opacity: isXray
        ? isInspectionFloor
          ? 0.76
          : 0.10
        : 0.90
    });

    const facade = new THREE.Mesh(
      new THREE.BoxGeometry(
        HERO_WIDTH,
        Math.max(2.2, actualHeight - 0.22),
        HERO_DEPTH
      ),
      facadeMaterial
    );

    facade.position.set(
      0,
      localMin + actualHeight / 2 + explosionOffset,
      HERO_POSITION_Z
    );
    facade.castShadow = !isXray;
    facade.receiveShadow = true;
    facade.userData.heroArchitectural = true;
    scene.add(facade);

    // Strong architectural floor slab.
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(
        HERO_WIDTH + 0.55,
        0.16,
        HERO_DEPTH + 0.55
      ),
      floorBandMaterial
    );
    slab.position.set(
      0,
      localMin + explosionOffset,
      HERO_POSITION_Z
    );
    slab.castShadow = !isXray;
    scene.add(slab);

    // Front facade windows, evenly spaced but with architectural frames.
    for (let column = 0; column < 5; column += 1) {
      const x =
        -HERO_WIDTH / 2 +
        2.7 +
        column * ((HERO_WIDTH - 5.4) / 4);

      const windowFrame = new THREE.Mesh(
        new THREE.BoxGeometry(2.05, 1.28, 0.12),
        new THREE.MeshStandardMaterial({
          color: 0xf0e8dc,
          roughness: 0.68,
          transparent: isXray,
          opacity: isXray
            ? isInspectionFloor ? 0.18 : 0.04
            : 1
        })
      );

      windowFrame.position.set(
        x,
        localMin + 1.65 + explosionOffset,
        HERO_POSITION_Z + HERO_DEPTH / 2 + 0.07
      );
      scene.add(windowFrame);

      const windowGlass = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 0.95, 0.08),
        glassMaterial
      );

      windowGlass.position.set(
        x,
        localMin + 1.65 + explosionOffset,
        HERO_POSITION_Z + HERO_DEPTH / 2 + 0.16
      );
      scene.add(windowGlass);
    }

    // Two balconies per alternating floor for a residential feel.
    if (floorIndex % 2 === 1) {
      [-1, 1].forEach((side) => {
        const balcony = new THREE.Mesh(
          new THREE.BoxGeometry(4.8, 0.16, 2.0),
          new THREE.MeshStandardMaterial({
            color: 0xb6a58e,
            roughness: 0.82,
            transparent: isXray,
            opacity: isXray
              ? isInspectionFloor ? 0.28 : 0.05
              : 1
          })
        );

        balcony.position.set(
          side * 7.2,
          localMin + 0.62 + explosionOffset,
          HERO_POSITION_Z + HERO_DEPTH / 2 + 0.9
        );
        balcony.castShadow = !isXray;
        scene.add(balcony);

        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(4.8, 0.75, 0.08),
          new THREE.MeshStandardMaterial({
            color: 0x9ba6aa,
            roughness: 0.32,
            metalness: 0.22,
            transparent: true,
            opacity: isXray
              ? isInspectionFloor ? 0.30 : 0.04
              : 0.74
          })
        );

        rail.position.set(
          side * 7.2,
          localMin + 1.02 + explosionOffset,
          HERO_POSITION_Z + HERO_DEPTH / 2 + 1.86
        );
        scene.add(rail);
      });
    }

    // Corner columns.
    [-HERO_WIDTH / 2, HERO_WIDTH / 2].forEach((x) => {
      const column = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, actualHeight, 0.42),
        new THREE.MeshStandardMaterial({
          color: 0xb09f89,
          roughness: 0.75,
          transparent: isXray,
          opacity: isXray
            ? isInspectionFloor ? 0.22 : 0.035
            : 1
        })
      );
      column.position.set(
        x,
        localMin + actualHeight / 2 + explosionOffset,
        HERO_POSITION_Z + HERO_DEPTH / 2
      );
      scene.add(column);
    });
  };

  /*
   * ------------------------------------------------------------
   * NEXT-LEVEL VIEWER HELPERS
   * ------------------------------------------------------------
   */

  const selectedUnit =
    selectedProperty ??
    (hoverTarget?.type === 'unit'
      ? hoverTarget.unit
      : null);

  // Floor selected from the stack becomes the X-Ray inspection target.
  const inspectionFloor =
    isolatedFloor !== 'ALL'
      ? isolatedFloor
      : selectedFloorFilter !== 'ALL'
        ? selectedFloorFilter
        : null;

  const validationFailures =
    validation?.results?.filter(
      (result) => result.status === 'FAIL'
    ) ?? [];

  const validationFailureCount =
    validationFailures.length;

  const historySteps = [
    { label: 'Base record', year: '2024', status: 'Imported' },
    { label: 'Spatial validation', year: '2025', status: 'Validated' },
    { label: 'Current revision', year: '2026', status: 'Current' },
    { label: 'Proposed update', year: 'Future', status: 'Draft' }
  ];

  const cameraModeLabel = {
    ORBIT: 'Orbit',
    TOP: 'Top / 2D',
    FRONT: 'Front Elevation',
    SIDE: 'Side Elevation'
  }[cameraMode];

  const applyCameraMode = (
    mode: 'ORBIT' | 'TOP' | 'FRONT' | 'SIDE'
  ) => {
    setCameraMode(mode);

    if (mode === 'ORBIT') {
      cameraValuesRef.current.theta = Math.PI / 4.2;
      cameraValuesRef.current.phi = Math.PI / 2.85;
      cameraValuesRef.current.radius = 92;
    }

    if (mode === 'TOP') {
      cameraValuesRef.current.theta = 0;
      cameraValuesRef.current.phi = 0.22;
      cameraValuesRef.current.radius = 105;
    }

    if (mode === 'FRONT') {
      cameraValuesRef.current.theta = 0;
      cameraValuesRef.current.phi = Math.PI / 2.05;
      cameraValuesRef.current.radius = 90;
    }

    if (mode === 'SIDE') {
      cameraValuesRef.current.theta = Math.PI / 2;
      cameraValuesRef.current.phi = Math.PI / 2.05;
      cameraValuesRef.current.radius = 90;
    }
  };

  const resetAdvancedView = () => {
    setXrayMode(false);
    setIsolatedFloor('ALL');
    setSelectedFloorFilter('ALL');
    setExplodedView(false);
    setTransition2D3D(false);
    setCameraMode('ORBIT');
    cameraValuesRef.current.theta = Math.PI / 4.2;
    cameraValuesRef.current.phi = Math.PI / 2.85;
    cameraValuesRef.current.radius = 80;
    setFocusPulse(false);
    closeFloatingPanels();
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
      new THREE.Color(0xaed2e3);

    scene.fog = new THREE.Fog(
      0xaed2e3,
      220,
      420
    );

    const width =
      mount.clientWidth || 900;

    const height =
      mount.clientHeight || 500;

    const camera =
      new THREE.PerspectiveCamera(
        38,
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
        1.35
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
        320,
        24,
        12
      ),
      new THREE.MeshBasicMaterial({
        color: 0xbfd9e5,
        side: THREE.BackSide
      })
    );
    scene.add(skyDome);

    /*
     * Natural soft clouds.
     * Canvas-generated texture keeps the project asset-free while giving
     * the sky organic cloud silhouettes instead of a flat white dome.
     */
    const makeCloudTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const blobs = [
        [105, 142, 58, 38],
        [160, 116, 72, 50],
        [230, 130, 82, 52],
        [310, 112, 70, 48],
        [374, 140, 62, 40],
        [215, 160, 120, 42]
      ];

      blobs.forEach(([x, y, rx, ry]) => {
        const gradient = ctx.createRadialGradient(
          x,
          y,
          4,
          x,
          y,
          Math.max(rx, ry)
        );

        gradient.addColorStop(0, 'rgba(255,255,255,0.78)');
        gradient.addColorStop(0.55, 'rgba(250,253,255,0.46)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      return new THREE.CanvasTexture(canvas);
    };

    const cloudTexture = makeCloudTexture();

    if (cloudTexture) {
      const cloudGroup = new THREE.Group();
      cloudGroup.name = 'NaturalClouds';

      [
        { x: -105, y: 72, z: -120, s: 0.90, r: 0.03 },
        { x: 70, y: 92, z: -145, s: 1.15, r: -0.04 },
        { x: 150, y: 66, z: -55, s: 0.72, r: 0.02 },
        { x: -165, y: 105, z: 25, s: 1.25, r: -0.02 },
        { x: 30, y: 120, z: 130, s: 0.80, r: 0.05 }
      ].forEach((cloud) => {
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: cloudTexture,
            transparent: true,
            opacity: 0.62,
            depthWrite: false,
            fog: false
          })
        );

        sprite.position.set(
          cloud.x,
          cloud.y,
          cloud.z
        );
        sprite.scale.set(
          72 * cloud.s,
          36 * cloud.s,
          1
        );
        sprite.material.rotation = cloud.r;
        cloudGroup.add(sprite);
      });

      scene.add(cloudGroup);
    }

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
     * ISOMETRIC REAL-WORLD SOCIETY / CITY TILE
     * ----------------------------------------------------------
     * Designed to match the requested reference:
     * green land slab, grey road network, sidewalks, towers,
     * low-rise homes, shop, parking, street lamps, signals,
     * vehicles and landscaping. The selected cadastral building
     * remains the real interactive object.
     * ----------------------------------------------------------
     */

    if (selectedBuilding) {
      const city = new THREE.Group();
      city.name = 'IsometricSocietyContext';
      scene.add(city);

      // --- Raised terrain island ---
      const islandWidth = 118;
      const islandDepth = 88;
      const islandTop = 0;

      const soil = new THREE.MeshStandardMaterial({
        color: 0x5a3b24,
        roughness: 1
      });

      const grass = new THREE.MeshStandardMaterial({
        color: 0x3f8b3f,
        roughness: 1
      });

      const island = new THREE.Mesh(
        new THREE.BoxGeometry(islandWidth, 2.5, islandDepth),
        soil
      );
      island.position.y = -1.25;
      island.receiveShadow = true;
      city.add(island);

      const grassTop = new THREE.Mesh(
        new THREE.BoxGeometry(islandWidth - 1.5, 0.22, islandDepth - 1.5),
        grass
      );
      grassTop.position.y = 0.03;
      grassTop.receiveShadow = true;
      city.add(grassTop);

      // Irregular green patches for a non-CAD appearance.
      const patchMat = new THREE.MeshStandardMaterial({
        color: 0x4d9848,
        roughness: 1
      });

      [
        [-42, -27, 18, 13],
        [39, -28, 19, 12],
        [-35, 27, 15, 12],
        [38, 27, 17, 13],
        [0, 37, 26, 10]
      ].forEach(([px, pz, pw, pd]) => {
        const patch = new THREE.Mesh(
          new THREE.CircleGeometry(1, 16),
          patchMat
        );
        patch.scale.set(pw, pd, 1);
        patch.rotation.x = -Math.PI / 2;
        patch.position.set(px, 0.15, pz);
        city.add(patch);
      });

      // --- Roads ---
      const roadMat = new THREE.MeshStandardMaterial({
        color: 0x777b80,
        roughness: 0.96
      });

      const roadDarkMat = new THREE.MeshStandardMaterial({
        color: 0x65696e,
        roughness: 0.96
      });

      const roadH = new THREE.Mesh(
        new THREE.BoxGeometry(116, 0.16, 12),
        roadMat
      );
      roadH.position.set(0, 0.17, 0);
      roadH.receiveShadow = true;
      city.add(roadH);

      // Secondary cross street.
      const roadSecondary = new THREE.Mesh(
        new THREE.BoxGeometry(78, 0.15, 8),
        roadMat
      );
      roadSecondary.position.set(16, 0.17, 29);
      roadSecondary.receiveShadow = true;
      city.add(roadSecondary);

      // Sidewalks around the primary roads.
      const sidewalkMat = new THREE.MeshStandardMaterial({
        color: 0xb7b2aa,
        roughness: 0.92
      });

      [
        [0, 6.9, 116, 2.0],
        [0, -6.9, 116, 2.0]
      ].forEach(([sx, sz, sw, sd]) => {
        const sidewalk = new THREE.Mesh(
          new THREE.BoxGeometry(sw, 0.18, sd),
          sidewalkMat
        );
        sidewalk.position.set(sx, 0.29, sz);
        sidewalk.receiveShadow = true;
        city.add(sidewalk);
      });

      // Dashed lane markings.
      const markingMat = new THREE.MeshBasicMaterial({
        color: 0xf3f0dc,
        transparent: true,
        opacity: 0.9
      });

      for (let x = -50; x <= 50; x += 9) {
        const dash = new THREE.Mesh(
          new THREE.BoxGeometry(4.5, 0.035, 0.12),
          markingMat
        );
        dash.position.set(x, 0.29, 0);
        city.add(dash);
      }

      // Zebra crossings.
      for (let i = -2; i <= 2; i += 1) {
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.04, 5.5),
          markingMat
        );
        stripe.position.set(i * 1.5, 0.32, 6.95);
        city.add(stripe);
      }

      // --- Building helpers ---
      const addCityTower = (
        x: number,
        z: number,
        w: number,
        d: number,
        floorsCount: number,
        mainColor: number,
        glassColor: number,
        accentColor: number
      ) => {
        const g = new THREE.Group();
        g.position.set(x, 0.28, z);

        const fh = 3.0;
        const total = floorsCount * fh;

        const body = new THREE.Mesh(
          new THREE.BoxGeometry(w, total, d),
          new THREE.MeshStandardMaterial({
            color: mainColor,
            roughness: 0.8
          })
        );
        body.position.y = total / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        g.add(body);

        const glass = new THREE.MeshStandardMaterial({
          color: glassColor,
          roughness: 0.2,
          metalness: 0.12
        });

        const trim = new THREE.MeshStandardMaterial({
          color: accentColor,
          roughness: 0.72
        });

        for (let f = 0; f < floorsCount; f += 1) {
          const y = f * fh + 1.55;

          const slab = new THREE.Mesh(
            new THREE.BoxGeometry(w + 0.45, 0.13, d + 0.45),
            trim
          );
          slab.position.y = f * fh + 0.06;
          g.add(slab);

          for (let c = 0; c < 5; c += 1) {
            const wx = -w / 2 + 2.0 + c * ((w - 4) / 4);
            const win = new THREE.Mesh(
              new THREE.BoxGeometry(1.45, 1.25, 0.09),
              glass
            );
            win.position.set(wx, y, d / 2 + 0.10);
            g.add(win);

            const back = win.clone();
            back.position.z = -d / 2 - 0.10;
            g.add(back);
          }

          if (f % 2 === 1) {
            [-1, 1].forEach((side) => {
              const balcony = new THREE.Mesh(
                new THREE.BoxGeometry(4.0, 0.15, 2.0),
                new THREE.MeshStandardMaterial({
                  color: 0xd2c5b2,
                  roughness: 0.86
                })
              );
              balcony.position.set(
                side * (w * 0.27),
                f * fh + 0.55,
                d / 2 + 0.9
              );
              g.add(balcony);

              const rail = new THREE.Mesh(
                new THREE.BoxGeometry(4.0, 0.7, 0.08),
                new THREE.MeshStandardMaterial({
                  color: 0x9ca7ab,
                  roughness: 0.35,
                  metalness: 0.25,
                  transparent: true,
                  opacity: 0.72
                })
              );
              rail.position.set(
                side * (w * 0.27),
                f * fh + 0.95,
                d / 2 + 1.85
              );
              g.add(rail);
            });
          }
        }

        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w + 1.0, 0.55, d + 1.0),
          new THREE.MeshStandardMaterial({
            color: 0x3f4347,
            roughness: 0.82
          })
        );
        roof.position.y = total + 0.28;
        roof.castShadow = true;
        g.add(roof);

        // Rooftop room and water tank.
        const rooftop = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.32, 1.4, d * 0.32),
          new THREE.MeshStandardMaterial({
            color: accentColor,
            roughness: 0.8
          })
        );
        rooftop.position.set(0, total + 1.0, 0);
        g.add(rooftop);

        const tank = new THREE.Mesh(
          new THREE.CylinderGeometry(0.8, 0.8, 1.15, 14),
          new THREE.MeshStandardMaterial({
            color: 0xd6d6d0,
            roughness: 0.7
          })
        );
        tank.position.set(w * 0.22, total + 1.35, -d * 0.18);
        g.add(tank);

        city.add(g);
      };

      const addLowRise = (
        x: number,
        z: number,
        w: number,
        d: number,
        floorsCount: number,
        color: number
      ) => {
        const fh = 2.8;
        const total = floorsCount * fh;
        const g = new THREE.Group();
        g.position.set(x, 0.28, z);

        const body = new THREE.Mesh(
          new THREE.BoxGeometry(w, total, d),
          new THREE.MeshStandardMaterial({
            color,
            roughness: 0.82
          })
        );
        body.position.y = total / 2;
        body.castShadow = true;
        g.add(body);

        for (let f = 0; f < floorsCount; f += 1) {
          const y = f * fh + 1.35;
          for (let c = 0; c < 3; c += 1) {
            const win = new THREE.Mesh(
              new THREE.BoxGeometry(2.0, 1.0, 0.08),
              new THREE.MeshStandardMaterial({
                color: 0x71a9bd,
                roughness: 0.22,
                metalness: 0.12
              })
            );
            win.position.set(
              -w / 2 + 2.4 + c * ((w - 4.8) / 2),
              y,
              d / 2 + 0.08
            );
            g.add(win);
          }
        }

        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.7, 0.32, d + 0.7),
          new THREE.MeshStandardMaterial({
            color: 0x51545a,
            roughness: 0.85
          })
        );
        roof.position.y = total + 0.16;
        g.add(roof);

        city.add(g);
      };

      // --- Surrounding city/society buildings ---
      addCityTower(-38, -25, 15, 14, 9, 0xc7cbd0, 0x557f94, 0x6b7076);
      addCityTower(38, -27, 18, 15, 7, 0xd0b99b, 0x668da0, 0x736a61);
      addCityTower(-39, 25, 14, 13, 6, 0xbfc6c9, 0x4f7c90, 0x686f74);
      addLowRise(35, 27, 19, 14, 2, 0xd9d1c4);
      addLowRise(-25, 35, 18, 12, 2, 0xc9c0b3);

      // Commercial block intentionally omitted.
      // The reference scene is kept visually clean around the
      // cadastral building; no floating/ambiguous shop geometry.

      // --- Parking lots ---
      const parkingMat = new THREE.MeshStandardMaterial({
        color: 0x6d7175,
        roughness: 0.95
      });

      [
        [-27, -2, 20, 11],
        [30, -12, 17, 10]
      ].forEach(([px, pz, pw, pd]) => {
        const lot = new THREE.Mesh(
          new THREE.BoxGeometry(pw, 0.08, pd),
          parkingMat
        );
        lot.position.set(px, 0.28, pz);
        city.add(lot);

        for (let c = -1; c <= 1; c += 1) {
          const line = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.04, pd - 1),
            markingMat
          );
          line.position.set(px + c * (pw / 3), 0.34, pz);
          city.add(line);
        }
      });

      // --- Trees, shrubs and a central roundabout garden ---
      const addTree = (tx: number, tz: number, scale = 1) => {
        const g = new THREE.Group();
        g.position.set(tx, 0, tz);
        g.scale.setScalar(scale);

        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.25, 2.2, 8),
          new THREE.MeshStandardMaterial({
            color: 0x6c4b31,
            roughness: 1
          })
        );
        trunk.position.y = 1.1;
        trunk.castShadow = true;
        g.add(trunk);

        const foliage = new THREE.MeshStandardMaterial({
          color: 0x2f7738,
          roughness: 1
        });

        [
          [0, 2.3, 1.0],
          [-0.5, 2.8, 0.85],
          [0.5, 2.8, 0.9],
          [0, 3.35, 0.72]
        ].forEach(([cx, cy, r]) => {
          const crown = new THREE.Mesh(
            new THREE.IcosahedronGeometry(r, 1),
            foliage
          );
          crown.position.set(cx, cy, 0);
          crown.castShadow = true;
          g.add(crown);
        });

        city.add(g);
      };

      [
        [-49, -8, 0.85], [-48, 15, 0.75], [-31, 37, 0.95],
        [-13, 34, 0.75], [13, 35, 0.8], [49, 17, 0.85],
        [48, -9, 0.8], [28, -34, 0.9], [-23, -34, 0.85],
        [5, 22, 0.65], [-11, 22, 0.7]
      ].forEach(([tx, tz, s]) => addTree(tx, tz, s));

      // Round garden island.
      const garden = new THREE.Mesh(
        new THREE.CylinderGeometry(8.5, 8.5, 0.18, 32),
        new THREE.MeshStandardMaterial({
          color: 0x4d9a47,
          roughness: 1
        })
      );
      garden.position.set(-18, 0.32, 22);
      city.add(garden);

      const gardenPath = new THREE.Mesh(
        new THREE.TorusGeometry(6.2, 0.28, 8, 40),
        new THREE.MeshStandardMaterial({
          color: 0xd4c8ae,
          roughness: 0.92
        })
      );
      gardenPath.rotation.x = Math.PI / 2;
      gardenPath.position.set(-18, 0.43, 22);
      city.add(gardenPath);

      addTree(-18, 22, 1.05);
      addTree(-15, 23, 0.75);
      addTree(-21, 24, 0.78);

      // --- Street lamps ---
      const addLamp = (lx: number, lz: number, rot = 0) => {
        const g = new THREE.Group();
        g.position.set(lx, 0, lz);
        g.rotation.y = rot;

        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.13, 4.2, 10),
          new THREE.MeshStandardMaterial({
            color: 0x4e555b,
            roughness: 0.55,
            metalness: 0.3
          })
        );
        pole.position.y = 2.1;
        pole.castShadow = true;
        g.add(pole);

        const arm = new THREE.Mesh(
          new THREE.BoxGeometry(1.7, 0.10, 0.10),
          new THREE.MeshStandardMaterial({
            color: 0x4e555b,
            roughness: 0.55,
            metalness: 0.3
          })
        );
        arm.position.set(0.7, 4.05, 0);
        arm.rotation.z = -0.16;
        g.add(arm);

        const light = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.14, 0.32),
          new THREE.MeshStandardMaterial({
            color: 0xfff2bd,
            emissive: 0xffd66b,
            emissiveIntensity: 0.45
          })
        );
        light.position.set(1.45, 3.92, 0);
        g.add(light);

        city.add(g);
      };

      [
        [-15, 8, 0], [15, 8, Math.PI], [-15, -8, 0], [15, -8, Math.PI],
        [-8, -22, Math.PI / 2], [8, -22, -Math.PI / 2],
        [-8, 22, Math.PI / 2], [8, 22, -Math.PI / 2]
      ].forEach(([lx, lz, r]) => addLamp(lx, lz, r));

      // --- Traffic signals ---
      const addSignal = (sx: number, sz: number) => {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.1, 3.0, 8),
          new THREE.MeshStandardMaterial({
            color: 0x42484d,
            roughness: 0.6,
            metalness: 0.2
          })
        );
        pole.position.set(sx, 1.5, sz);
        city.add(pole);

        const head = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 1.1, 0.30),
          new THREE.MeshStandardMaterial({
            color: 0x202428,
            roughness: 0.75
          })
        );
        head.position.set(sx, 3.05, sz);
        city.add(head);

        [0.32, 0, -0.32].forEach((yy, index) => {
          const lamp = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 10, 10),
            new THREE.MeshStandardMaterial({
              color:
                index === 0 ? 0xef4444 :
                index === 1 ? 0xf59e0b : 0x22c55e,
              emissive:
                index === 0 ? 0x7f1d1d :
                index === 1 ? 0x78350f : 0x14532d,
              emissiveIntensity: 0.65
            })
          );
          lamp.position.set(sx, 3.05 + yy, sz - 0.17);
          city.add(lamp);
        });
      };

      [
        [-7.7, 7.7], [7.7, 7.7],
        [-7.7, -7.7], [7.7, -7.7]
      ].forEach(([sx, sz]) => addSignal(sx, sz));

      // --- Simple low-poly vehicles for scale ---
      const addCar = (
        cx: number,
        cz: number,
        bodyColor: number,
        rotation = 0,
        scale = 1
      ) => {
        const g = new THREE.Group();
        g.position.set(cx, 0.45, cz);
        g.rotation.y = rotation;
        g.scale.setScalar(scale);

        const body = new THREE.Mesh(
          new THREE.BoxGeometry(3.3, 0.72, 1.7),
          new THREE.MeshStandardMaterial({
            color: bodyColor,
            roughness: 0.65
          })
        );
        body.position.y = 0.35;
        body.castShadow = true;
        g.add(body);

        const cabin = new THREE.Mesh(
          new THREE.BoxGeometry(1.75, 0.65, 1.45),
          new THREE.MeshStandardMaterial({
            color: 0x5f7882,
            roughness: 0.25,
            metalness: 0.1
          })
        );
        cabin.position.set(-0.15, 0.95, 0);
        g.add(cabin);

        const wheelMat = new THREE.MeshStandardMaterial({
          color: 0x202124,
          roughness: 0.9
        });

        [-1.05, 1.05].forEach((wx) => {
          [-0.82, 0.82].forEach((wz) => {
            const wheel = new THREE.Mesh(
              new THREE.CylinderGeometry(0.34, 0.34, 0.22, 12),
              wheelMat
            );
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(wx, 0.28, wz);
            g.add(wheel);
          });
        });

        city.add(g);
      };

      addCar(-19, 0, 0xe5a11c, Math.PI / 2, 0.95);
      addCar(19, 0, 0x2878c7, -Math.PI / 2, 0.95);
      addCar(0, -18, 0xd83a35, 0, 0.9);
      addCar(0, 16, 0x2f3337, Math.PI, 0.8);
      addCar(31, -17, 0x3b3f43, Math.PI / 2, 0.75);

      // Tiny delivery/ambulance-like vehicle near the low-rise block.
      addCar(-31, -9, 0xf2f0e8, Math.PI / 2, 0.8);

      // --- Small pedestrian figures ---
      const addPerson = (px: number, pz: number, scale = 1) => {
        const g = new THREE.Group();
        g.position.set(px, 0.3, pz);
        g.scale.setScalar(scale);

        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.18, 0.55, 8),
          new THREE.MeshStandardMaterial({
            color: 0x334155,
            roughness: 0.8
          })
        );
        body.position.y = 0.35;
        g.add(body);

        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 10, 8),
          new THREE.MeshStandardMaterial({
            color: 0xc58d67,
            roughness: 0.9
          })
        );
        head.position.y = 0.78;
        g.add(head);

        city.add(g);
      };

      [
        [-12, 5], [13, 5], [-10, 27], [12, 27],
        [24, 7], [-24, 7]
      ].forEach(([px, pz]) => addPerson(px, pz, 0.9));

      // Keep context from dominating the actual cadastral geometry.
      city.traverse((obj) => {
        obj.userData.contextOnly = true;
      });
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
      { x: -40, z: -30, r: 17, c: 0x789b69 },
      { x: 35, z: 25, r: 20, c: 0x668d5d },
      { x: -10, z: 42, r: 14, c: 0x7fa56c },
      { x: 45, z: -28, r: 13, c: 0x72945f }
    ].forEach((patch) => {
      const shape = new THREE.Shape();
      const points = 10;

      for (let i = 0; i < points; i += 1) {
        const a = (i / points) * Math.PI * 2;
        const radius = patch.r * (0.72 + ((i * 17) % 11) / 30);
        const px = Math.cos(a) * radius;
        const py = Math.sin(a) * radius * 0.72;
        if (i === 0) shape.moveTo(px, py);
        else shape.lineTo(px, py);
      }
      shape.closePath();

      const mesh = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        new THREE.MeshStandardMaterial({
          color: patch.c,
          roughness: 1
        })
      );

      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(patch.x, -0.335, patch.z);
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
     *
     * NORMAL MODE:
     *   The hero building is visually opaque and architectural.
     *
     * X-RAY MODE:
     *   Only the clicked/selected floor becomes transparent.
     *   Other floors remain ghosted so the vertical relationship
     *   is still understandable.
     */
    visibleFloors.forEach((floor: Floor) => {
      const floorIndex =
        floors.findIndex(
          (item) =>
            item.floor_number === floor.floor_number
        );

      const {
        localMin,
        actualHeight,
        explosionOffset
      } = getHeroFloorY(
        floor,
        floorIndex,
        groundElevation,
        explodedView
      );

      const isHovered =
        hoveredFloor === floor.floor_number;

      const isInspectionFloor =
        inspectionFloor === floor.floor_number;

      const otherFloor =
        inspectionFloor !== null &&
        !isInspectionFloor;

      // Architectural body.
      addHeroArchitecturalDetail(
        scene,
        floor,
        floorIndex,
        groundElevation,
        explodedView,
        xrayMode,
        inspectionFloor
      );

      /*
       * Interactive transparent shell:
       * - invisible-ish in normal mode so the architectural body reads
       * - transparent in X-Ray, allowing the floor/unit geometry to show
       */
      const shellOpacity = xrayMode
        ? isInspectionFloor
          ? 0.10
          : 0.018
        : isHovered
          ? 0.12
          : 0.025;

      const floorShell =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            HERO_WIDTH + 0.02,
            Math.max(2.1, actualHeight - 0.28),
            HERO_DEPTH + 0.02
          ),
          new THREE.MeshStandardMaterial({
            color:
              isHovered
                ? 0x22d3ee
                : isInspectionFloor
                  ? 0x8b5cf6
                  : 0x64748b,
            transparent: true,
            opacity: shellOpacity,
            roughness: 0.55,
            metalness: 0.04,
            side: THREE.DoubleSide,
            depthWrite: false
          })
        ) as InteractiveObject;

      floorShell.position.set(
        0,
        localMin +
          actualHeight / 2 +
          explosionOffset,
        0
      );

      floorShell.userData.targetType = 'floor';
      floorShell.userData.floorNumber =
        floor.floor_number;
      floorShell.userData.fitCamera = true;
      floorShell.renderOrder = 12;
      scene.add(floorShell);
      interactiveObjects.push(floorShell);

      // X-ray inspection plane around the selected floor.
      if (xrayMode && isInspectionFloor) {
        const inspectionBand = new THREE.Mesh(
          new THREE.BoxGeometry(
            HERO_WIDTH + 0.85,
            Math.max(2.0, actualHeight - 0.38),
            HERO_DEPTH + 0.85
          ),
          new THREE.MeshBasicMaterial({
            color: isHovered ? 0x22d3ee : 0xa855f7,
            transparent: true,
            opacity: 0.055,
            depthWrite: false,
            side: THREE.DoubleSide
          })
        );

        inspectionBand.position.set(
          HERO_POSITION_X,
          localMin + actualHeight * 0.52 + explosionOffset,
          HERO_POSITION_Z
        );
        inspectionBand.renderOrder = 30;
        scene.add(inspectionBand);

        const inspectionOutline = new THREE.LineSegments(
          new THREE.EdgesGeometry(inspectionBand.geometry),
          new THREE.LineBasicMaterial({
            color: isHovered ? 0x22d3ee : 0xa855f7,
            transparent: true,
            opacity: 0.95
          })
        );
        inspectionOutline.position.copy(inspectionBand.position);
        inspectionOutline.renderOrder = 31;
        scene.add(inspectionOutline);
      }

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
              HERO_WIDTH / 2 - 0.8
            );

          const unitDepth =
            HERO_DEPTH - 2.4;

          const unitHeight =
            Math.max(
              2.15,
              actualHeight - 0.50
            );

          // Unit volumes are internal cadastral spaces.
          // Two units share the hero floor rather than floating outside it.
          const unitSide =
            unitIndex % 2 === 0
              ? -1
              : 1;

          const unitVisible =
            xrayMode
              ? isInspectionFloor
              : true;

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
                        : xrayMode && isInspectionFloor
                          ? 0x8b5cf6
                          : 0xc6b59f,
                emissive:
                  conflict
                    ? 0x5b1010
                    : selected
                      ? 0x3b0764
                      : hovered
                        ? 0x064e5b
                        : xrayMode && isInspectionFloor
                          ? 0x2e1065
                          : 0x000000,
                emissiveIntensity:
                  xrayMode && isInspectionFloor
                    ? 0.38
                    : selected || conflict || hovered
                      ? 0.22
                      : 0,
                transparent:
                  xrayMode || !unitVisible,
                opacity:
                  xrayMode
                    ? conflict || selected || hovered
                      ? 0.96
                      : isInspectionFloor
                        ? 0.86
                        : 0.045
                    : conflict
                      ? 0.80
                      : selected
                        ? 0.86
                        : 0.12,
                roughness: 0.50,
                metalness: 0.08,
                side: THREE.DoubleSide,
                depthWrite: true
              })
            ) as InteractiveObject;

          unitMesh.position.set(
            HERO_POSITION_X +
              unitSide * (unitWidth / 2 - 0.75),
            localMin +
              0.27 +
              unitHeight / 2 +
              explosionOffset,
            HERO_POSITION_Z
          );

          unitMesh.userData.targetType = 'unit';
          unitMesh.userData.property = unit;
          unitMesh.userData.fitCamera = true;
          unitMesh.renderOrder = 25;
          unitMesh.castShadow = !xrayMode;
          unitMesh.receiveShadow = true;

          scene.add(unitMesh);
          interactiveObjects.push(unitMesh);

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
                        : isInspectionFloor
                          ? 0xe5e7eb
                          : 0x94a3b8,
                transparent: true,
                opacity:
                  conflict ||
                  selected ||
                  hovered ||
                  isInspectionFloor
                    ? 0.95
                    : 0.16
              })
            );

          edge.position.copy(
            unitMesh.position
          );
          edge.renderOrder = 26;
          scene.add(edge);

          /*
           * Balcony and front windows are only emphasized for the
           * inspection floor in X-Ray mode. In normal mode they remain
           * part of the architectural building helper.
           */
          if (xrayMode && isInspectionFloor) {
            const balcony =
              new THREE.Mesh(
                new THREE.BoxGeometry(
                  unitWidth * 0.70,
                  0.14,
                  2.0
                ),
                new THREE.MeshStandardMaterial({
                  color: 0x8f9ba1,
                  roughness: 0.62,
                  transparent: true,
                  opacity: 0.76
                })
              );

            balcony.position.set(
              HERO_POSITION_X +
                unitSide * (unitWidth / 2 - 0.75),
              localMin +
                0.72 +
                explosionOffset,
              HERO_POSITION_Z +
                HERO_DEPTH / 2 + 0.95
            );
            balcony.castShadow = true;
            scene.add(balcony);

            const rail =
              new THREE.Mesh(
                new THREE.BoxGeometry(
                  unitWidth * 0.70,
                  0.72,
                  0.08
                ),
                new THREE.MeshStandardMaterial({
                  color: 0xdbe3e7,
                  roughness: 0.32,
                  metalness: 0.22,
                  transparent: true,
                  opacity: 0.72
                })
              );

            rail.position.set(
              HERO_POSITION_X +
                unitSide * (unitWidth / 2 - 0.75),
              localMin +
                1.12 +
                explosionOffset,
              HERO_POSITION_Z +
                HERO_DEPTH / 2 + 1.90
            );
            scene.add(rail);

            const glass =
              new THREE.MeshStandardMaterial({
                color: 0x6eb2ca,
                emissive: 0x0a4d63,
                emissiveIntensity: 0.25,
                roughness: 0.18,
                metalness: 0.18,
                transparent: true,
                opacity: 0.82
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
                HERO_POSITION_X +
                  unitSide * (unitWidth * 0.24) +
                  (windowIndex - 1) * 1.65,
                localMin +
                  1.70 +
                  explosionOffset,
                HERO_POSITION_Z +
                  HERO_DEPTH / 2 +
                  0.16
              );

              windowMesh.rotation.y =
                Math.PI / 2;

              scene.add(windowMesh);
            }
          }
        }
      );
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

      const topFloorIndex =
        Math.max(
          0,
          floors.length - 1
        );

      const roofExplosionOffset =
        explodedView
          ? topFloorIndex * 4.5
          : 0;

      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(
          HERO_WIDTH + 1.1,
          0.34,
          HERO_DEPTH + 1.1
        ),
        new THREE.MeshStandardMaterial({
          color: 0x3f4246,
          roughness: 0.78,
          transparent: xrayMode,
          opacity: xrayMode ? 0.22 : 1
        })
      );

      roof.position.set(
        HERO_POSITION_X,
        roofZ +
          0.16 +
          roofExplosionOffset,
        HERO_POSITION_Z
      );
      roof.castShadow = !xrayMode;
      scene.add(roof);

      const parapet = new THREE.Mesh(
        new THREE.BoxGeometry(
          HERO_WIDTH + 0.5,
          0.65,
          HERO_DEPTH + 0.5
        ),
        new THREE.MeshStandardMaterial({
          color: 0x716354,
          roughness: 0.82,
          transparent: xrayMode,
          opacity: xrayMode ? 0.12 : 1
        })
      );

      parapet.position.set(
        HERO_POSITION_X,
        roofZ +
          0.62 +
          roofExplosionOffset,
        HERO_POSITION_Z
      );
      scene.add(parapet);

      const utility = new THREE.Mesh(
        new THREE.BoxGeometry(
          5.2,
          1.65,
          4.0
        ),
        new THREE.MeshStandardMaterial({
          color: 0x807160,
          roughness: 0.82,
          transparent: xrayMode,
          opacity: xrayMode ? 0.14 : 1
        })
      );

      utility.position.set(
        HERO_POSITION_X,
        roofZ +
          1.0 +
          roofExplosionOffset,
        HERO_POSITION_Z
      );
      utility.castShadow = !xrayMode;
      scene.add(utility);

      const waterTank = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.78,
          0.78,
          1.15,
          16
        ),
        new THREE.MeshStandardMaterial({
          color: 0xd7d5cc,
          roughness: 0.7,
          transparent: xrayMode,
          opacity: xrayMode ? 0.18 : 1
        })
      );

      waterTank.position.set(
        HERO_POSITION_X + 5.8,
        roofZ +
          1.12 +
          roofExplosionOffset,
        HERO_POSITION_Z - 3.4
      );
      scene.add(waterTank);
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
          -60,
          0,
          -45
        )
      );
      societyBox.expandByPoint(
        new THREE.Vector3(
          60,
          Math.max(30, buildingMaxZ - groundElevation + 8),
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

          // Clicking a property/floor opens the cadastral X-Ray inspection.
          setXrayMode(true);

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

          // Floor-wise inspection automatically enters X-Ray mode.
          setXrayMode(true);
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

        if (focusPulse) {
          const t = performance.now() * 0.004;
          const pulse = 0.65 + Math.sin(t) * 0.25;
          scene.traverse((object) => {
            const mesh = object as THREE.Mesh;
            if (
              mesh.userData?.targetType === 'unit' &&
              mesh.material &&
              !Array.isArray(mesh.material) &&
              'emissiveIntensity' in mesh.material
            ) {
              (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
            }
          });
        }

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
    cameraLocked,
    explodedView,
    xrayMode,
    cutawayHeight
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
      setXrayMode(false);
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

  // Safe component-scope elevation values for UI controls.
  // `groundElevation` and `buildingMaxZ` inside the Three.js effect are
  // intentionally local to that scene build, so the React toolbar must
  // derive its own values from the same source data.
  const viewerGroundElevation =
    selectedBuilding?.ground_elevation_m ??
    (floors.length > 0
      ? Math.min(...floors.map((floor) => floor.z_min_m))
      : 500);

  const viewerBuildingMaxZ =
    floors.length > 0
      ? Math.max(...floors.map((floor) => floor.z_max_m))
      : viewerGroundElevation + 15;

  const cutawayMax = Math.max(
    5,
    viewerBuildingMaxZ - viewerGroundElevation
  );

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
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">

      {/* ======================================================
          HEADER — MOBILE FIRST / ORGANIZED TOOLBAR
      ====================================================== */}
      <div className="border-b border-slate-800 bg-slate-950/98">

        {/* Title / status row */}
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10">
              <Rotate3D size={18} className="text-cyan-400" />
            </div>

            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-white sm:text-sm">
                3D Volumetric Cadastre
              </div>
              <div className="hidden truncate text-[10px] text-slate-500 sm:block">
                Isometric GIS society • architectural cadastral view
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span className="hidden rounded-full border border-emerald-400/15 bg-emerald-500/10 px-2 py-1 text-[9px] font-semibold text-emerald-300 sm:inline-flex">
              LIVE
            </span>
            <button
              onClick={resetAdvancedView}
              title="Reset all viewer modes"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 transition hover:bg-slate-700"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>

        {/* Tool groups */}
        <div className="px-3 pb-3 sm:px-4">
          {/* Horizontally scrollable toolbar. On narrow screens swipe; on desktop use the slider below. */}
          <div
            ref={toolbarScrollRef}
            onWheel={(event) => {
              const el = toolbarScrollRef.current;
              if (!el) return;
              if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                el.scrollLeft += event.deltaY;
                event.preventDefault();
              }
            }}
            className="flex gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 pr-2 [scrollbar-width:thin] [scrollbar-color:rgba(71,85,105,.9)_transparent] touch-pan-x snap-x snap-mandatory lg:items-center"
          >

            {/* NAVIGATE */}
            <div className="shrink-0 rounded-xl border border-slate-800 bg-slate-900/75 p-1.5 snap-start">
              <div className="mb-1 px-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                Navigate
              </div>
              <div className="grid grid-cols-3 gap-1 sm:flex">
                <button
                  onClick={resetFloorIsolation}
                  title="Show all floors"
                  className="flex min-h-8 items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[10px] font-medium text-slate-300 transition hover:bg-slate-700"
                >
                  <RefreshCw size={12} />
                  <span>All Floors</span>
                </button>

                <button
                  onClick={() => setExplodedView((value) => !value)}
                  title={explodedView ? 'Return to normal view' : 'Separate floors'}
                  className={`flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition ${
                    explodedView
                      ? 'bg-purple-500/15 text-purple-200 ring-1 ring-purple-400/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {explodedView ? <FoldVertical size={12} /> : <UnfoldVertical size={12} />}
                  <span>{explodedView ? 'Normal' : 'Explode'}</span>
                </button>

                <button
                  onClick={toggleCameraLock}
                  title={cameraLocked ? 'Unlock camera' : 'Lock camera'}
                  className={`flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition ${
                    cameraLocked
                      ? 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cameraLocked ? <Lock size={12} /> : <Unlock size={12} />}
                  <span>{cameraLocked ? 'Locked' : 'Lock View'}</span>
                </button>
              </div>
            </div>

            {/* INSPECT */}
            <div className="shrink-0 rounded-xl border border-slate-800 bg-slate-900/75 p-1.5 snap-start">
              <div className="mb-1 px-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                Inspect
              </div>
              <div className="grid grid-cols-3 gap-1 sm:flex">
                <button
                  onClick={() => toggleFloatingPanel('stack')}
                  title={showVerticalStack ? 'Hide vertical stack' : 'Show floor stack'}
                  className={`flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition ${
                    showVerticalStack
                      ? 'bg-cyan-500/10 text-cyan-200 ring-1 ring-cyan-400/20'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {showVerticalStack ? <PanelRightClose size={12} /> : <PanelRight size={12} />}
                  <span>Stack</span>
                </button>

                <button
                  onClick={() => setXrayMode((v) => !v)}
                  title="Inspect selected floor in X-Ray"
                  className={`flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition ${
                    xrayMode
                      ? 'bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Scissors size={12} />
                  <span>{xrayMode ? 'X-Ray On' : 'X-Ray'}</span>
                </button>

                <button
                  onClick={() => toggleFloatingPanel('inspector')}
                  title="Property inspector"
                  className={`flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition ${
                    showInspector
                      ? 'bg-purple-500/10 text-purple-200 ring-1 ring-purple-400/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <UserRound size={12} />
                  <span>Inspector</span>
                </button>
              </div>
            </div>

            {/* VIEW */}
            <div className="shrink-0 rounded-xl border border-slate-800 bg-slate-900/75 p-1.5 snap-start">
              <div className="mb-1 px-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                View
              </div>
              <div className="grid grid-cols-4 gap-1 sm:flex">
                <button
                  onClick={() => toggleFloatingPanel('identity')}
                  title="ULPIN identity"
                  className="flex min-h-8 items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-2 py-1.5 text-[10px] font-medium text-slate-300 transition hover:bg-slate-700"
                >
                  <ShieldCheck size={12} />
                  <span className="hidden sm:inline">ULPIN</span>
                  <span className="sm:hidden">ID</span>
                </button>

                <button
                  onClick={() => toggleFloatingPanel('camera')}
                  title="Camera modes"
                  className={`flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition ${
                    showCameraModes
                      ? 'bg-cyan-500/10 text-cyan-200 ring-1 ring-cyan-400/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Camera size={12} />
                  <span>Camera</span>
                </button>

                <button
                  onClick={() => toggleFloatingPanel('spatial')}
                  title="Spatial context"
                  className={`flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition ${
                    showMiniMap
                      ? 'bg-cyan-500/10 text-cyan-200 ring-1 ring-cyan-400/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Map size={12} />
                  <span>Spatial</span>
                </button>

                <button
                  onClick={() => toggleFloatingPanel('history')}
                  title="Temporal history"
                  className={`flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition ${
                    showHistory
                      ? 'bg-cyan-500/10 text-cyan-200 ring-1 ring-cyan-400/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <History size={12} />
                  <span>History</span>
                </button>

                <button
                  onClick={() => setTransition2D3D((v) => !v)}
                  title="2D / 3D presentation"
                  className={`flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition ${
                    transition2D3D
                      ? 'bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Layers3 size={12} />
                  <span>{transition2D3D ? '2D' : '3D'}</span>
                </button>
              </div>
            </div>

          </div>

          {/* Toolbar slider — always available when the toolbar is wider than the screen. */}
          <div className="mt-1 flex items-center gap-2 px-1">
            <span className="shrink-0 text-[8px] font-semibold uppercase tracking-wider text-slate-600">
              Tools
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(1, toolbarScrollMax)}
              step={1}
              value={Math.min(toolbarScrollValue, Math.max(1, toolbarScrollMax))}
              onChange={(event) => handleToolbarSlider(Number(event.target.value))}
              disabled={toolbarScrollMax === 0}
              aria-label="Slide toolbar left or right"
              className="h-1.5 min-w-0 flex-1 cursor-pointer accent-cyan-400 disabled:cursor-default disabled:opacity-30"
            />
            <span className="shrink-0 text-[8px] text-slate-600">
              {toolbarScrollMax > 0 ? 'Swipe / Slide →' : 'All tools visible'}
            </span>
          </div>

          {/* Interaction hint — desktop only */}
          <div className="mt-2 hidden items-center gap-2 px-1 text-[9px] text-slate-600 md:flex">
            <MousePointer2 size={11} />
            <span>Drag to orbit</span>
            <span>•</span>
            <span>Scroll to zoom</span>
            <span>•</span>
            <span>Click a floor/property to inspect</span>
            <span className="text-cyan-700">Floor click → X-Ray</span>
            <span className="text-slate-700">•</span>
            <span className="text-slate-500">Open panels are draggable</span>
          </div>
        </div>
      </div>

      {/* ======================================================
          VIEWER
      ====================================================== */}

      <div
        ref={mountRef}
        className={`relative h-[420px] w-full sm:h-[500px] lg:h-[560px] transition-all duration-500 ${
          transition2D3D ? 'scale-[0.985]' : ''
        }`}
      >

        {/* ====================================================
            POLISHED SCENE STATUS STRIP
        ==================================================== */}
        <div className="pointer-events-none absolute inset-x-2 bottom-2 z-20 flex items-end justify-between gap-2 sm:inset-x-3 sm:bottom-3 sm:gap-3">
          <div className="max-w-[72%] rounded-xl border border-white/10 bg-slate-950/72 px-2.5 py-1.5 shadow-xl backdrop-blur-md sm:max-w-[62%] sm:px-3 sm:py-2">
            <div className="flex flex-wrap items-center gap-2 text-[9px]">
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-300">
                LIVE CADASTRE
              </span>
              <span className="text-slate-400">
                {floors.length} floors
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-300">
                Floor click → X-Ray
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">
                {properties.length} properties
              </span>
              {inspectionFloor !== null && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-cyan-300">
                    Floor {inspectionFloor} inspection
                  </span>
                </>
              )}
            </div>
            <div className="mt-1 text-[8px] text-slate-500">
              {xrayMode
                ? 'X-Ray inspection isolates the selected vertical property layer.'
                : 'Click a floor or property to inspect its vertical cadastral volume.'}
            </div>
          </div>
        </div>

        {/* ====================================================
            TOP-LEFT VIEW MODE HUD
        ==================================================== */}
        <div className="pointer-events-none absolute left-3 top-3 z-20 mt-28 rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-2 text-[9px] text-slate-300 backdrop-blur">
          <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
            <Activity size={11} />
            {cameraModeLabel} View
          </div>
          <div className="mt-1 text-slate-500">
            {xrayMode
              ? 'Floor-level X-Ray inspection'
              : transition2D3D
                ? '2D cadastral emphasis'
                : 'Architectural 3D volume'}
          </div>
        </div>

        {/* ====================================================
            CAMERA MODE PANEL
        ==================================================== */}
        {showCameraModes && (
          <div
            style={{
              transform: `translate3d(${panelOffsets.camera.x}px, ${panelOffsets.camera.y}px, 0)`
            }}
            className="absolute right-2 top-2 z-40 w-[calc(100%-1rem)] max-w-52 rounded-xl border border-white/10 bg-slate-950/70 p-2.5 shadow-2xl backdrop-blur-xl sm:right-3 sm:top-3"
          >
            <div
              onPointerDown={(event) => startPanelDrag('camera', event)}
              className="flex cursor-grab touch-none items-center justify-between border-b border-white/10 px-1 pb-2 active:cursor-grabbing"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                <GripVertical size={12} className="text-slate-500" />
                <Camera size={12} className="text-cyan-300" />
                Camera Modes
              </div>
              <button
                onClick={closeFloatingPanels}
                className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/10 hover:text-white"
                title="Close"
              >
                <X size={13} />
              </button>
            </div>

            <div className="space-y-1">
              {(['ORBIT', 'TOP', 'FRONT', 'SIDE'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => applyCameraMode(mode)}
                  className={`w-full rounded-md border px-2 py-1.5 text-left text-[10px] ${
                    cameraMode === mode
                      ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300'
                      : 'border-transparent text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {mode === 'ORBIT' ? '3D Orbit' :
                   mode === 'TOP' ? 'Top / 2D' :
                   mode === 'FRONT' ? 'Front Elevation' :
                   'Side Elevation'}
                </button>
              ))}
            </div>

            {xrayMode && (
              <div className="mt-3 border-t border-slate-800 pt-3">
                <div className="mb-1 flex justify-between text-[9px] text-slate-500">
                  <span>Cutaway Height</span>
                  <span>{cutawayHeight.toFixed(1)}m</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max={cutawayMax}
                  step="0.5"
                  value={Math.min(cutawayHeight, cutawayMax)}
                  onChange={(e) => setCutawayHeight(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}

        {/* ====================================================
            PROPERTY INSPECTOR
        ==================================================== */}
        {showInspector && selectedUnit && (
          <div
            style={{
              transform: `translate3d(${panelOffsets.inspector.x}px, ${panelOffsets.inspector.y}px, 0)`
            }}
            className="absolute bottom-16 right-2 z-40 w-[calc(100%-1rem)] max-w-64 rounded-xl sm:right-3 border border-purple-400/20 bg-slate-950/62 p-3 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500">
                  Property Inspector
                </div>
                <div className="mt-0.5 text-sm font-bold text-white">
                  Unit {selectedUnit.unit_number}
                </div>
              </div>
              <button
                onClick={closeFloatingPanels}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-white"
              >
                <Minimize2 size={12} />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[9px]">
              <div className="rounded-md bg-slate-900 p-2">
                <div className="text-slate-500">Floor</div>
                <div className="mt-0.5 font-semibold text-cyan-300">
                  {selectedUnit.floor_number}
                </div>
              </div>
              <div className="rounded-md bg-slate-900 p-2">
                <div className="text-slate-500">Area</div>
                <div className="mt-0.5 font-semibold text-white">
                  {selectedUnit.area_sqm.toFixed(2)} m²
                </div>
              </div>
              <div className="col-span-2 rounded-md bg-slate-900 p-2">
                <div className="text-slate-500">3D Property ID</div>
                <div className="mt-0.5 truncate font-mono text-cyan-300">
                  {selectedUnit.proposed_3d_id}
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between rounded-md border border-slate-800 px-2 py-1.5 text-[9px]">
              <span className="text-slate-500">Verification</span>
              <span className={
                selectedUnit.verification_status === 'CORRECTION_REQUIRED'
                  ? 'text-red-300'
                  : selectedUnit.verification_status === 'UNDER_REVIEW'
                    ? 'text-amber-300'
                    : 'text-emerald-300'
              }>
                {getStatusLabel(selectedUnit.verification_status)}
              </span>
            </div>

            {validationFailureCount > 0 && (
              <div className="mt-2 rounded-md border border-red-500/25 bg-red-500/10 p-2 text-[9px] text-red-200">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck size={11} />
                  {validationFailureCount} validation issue(s)
                </div>
                <div className="mt-1 text-red-300/70">
                  Spatial/evidence conflicts require review.
                </div>
              </div>
            )}

            <button
              onClick={() => {
                if (selectedUnit) {
                  setIsolatedFloor(selectedUnit.floor_number);
                  setSelectedFloorFilter(selectedUnit.floor_number);
                  setXrayMode(true);
                }
              }}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-cyan-400/25 bg-cyan-500/10 px-2 py-1.5 text-[9px] text-cyan-200"
            >
              <Scissors size={11} />
              Inspect Floor in X-Ray
            </button>

            <button
              onClick={() => setFocusPulse((v) => !v)}
              className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[9px] ${
                focusPulse
                  ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300'
                  : 'border-slate-700 bg-slate-900 text-slate-400'
              }`}
            >
              <Crosshair size={11} />
              {focusPulse ? 'Focus Selected On' : 'Focus Selected'}
            </button>
          </div>
        )}

        {/* ====================================================
            ULPIN / 3D PROPERTY IDENTITY CARD
        ==================================================== */}
        {showIdentityCard && (
          <div
            style={{
              transform: `translate3d(${panelOffsets.identity.x}px, ${panelOffsets.identity.y}px, 0)`
            }}
            className="absolute left-2 bottom-16 z-40 w-[calc(100%-1rem)] max-w-72 rounded-xl border border-cyan-400/20 bg-slate-950/65 p-3 shadow-2xl backdrop-blur-xl sm:left-3"
          >
            <div
              onPointerDown={(event) => startPanelDrag('identity', event)}
              className="flex cursor-grab touch-none items-start justify-between gap-2 active:cursor-grabbing"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500">
                    3D Property Identity
                  </div>
                  <div className="text-xs font-bold text-white">
                    {selectedUnit?.proposed_3d_id || selectedBuilding?.building_code || 'No property selected'}
                  </div>
                </div>
              </div>
              <button
                onClick={closeFloatingPanels}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-white/10 hover:text-white"
                title="Close"
              >
                <X size={13} />
              </button>
            </div>

            <div className="mt-3 space-y-1.5 text-[9px]">
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-500">Parcel</span>
                <span className="text-slate-200">{selectedParcel?.parcel_code || selectedParcel?.id || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-500">Building</span>
                <span className="text-slate-200">{selectedBuilding?.name || selectedBuilding?.building_code || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-500">Floor</span>
                <span className="text-cyan-300">{selectedUnit?.floor_number ?? '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-500">Vertical range</span>
                <span className="text-slate-200">
                  {selectedUnit ? `${selectedUnit.z_min_m.toFixed(2)}–${selectedUnit.z_max_m.toFixed(2)} m` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="text-emerald-300">
                  {selectedUnit ? getStatusLabel(selectedUnit.verification_status) : 'No selection'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            TEMPORAL / HISTORY PANEL
        ==================================================== */}
        {showHistory && (
          <div
            style={{
              transform: `translate3d(${panelOffsets.history.x}px, ${panelOffsets.history.y}px, 0)`
            }}
            className="absolute left-2 top-2 z-40 w-[calc(100%-1rem)] max-w-72 rounded-xl border border-white/10 bg-slate-950/65 p-3 shadow-2xl backdrop-blur-xl sm:left-3 sm:top-3"
          >
            <div
              onPointerDown={(event) => startPanelDrag('history', event)}
              className="flex cursor-grab touch-none items-center justify-between gap-2 border-b border-white/10 pb-2 active:cursor-grabbing"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                <GripVertical size={11} className="text-slate-500" />
                <Clock3 size={12} className="text-cyan-300" />
                Temporal History
              </div>
              <button
                onClick={closeFloatingPanels}
                className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-white/10 hover:text-white"
                title="Close"
              >
                <X size={13} />
              </button>
            </div>

            <div className="mt-3 space-y-1.5">
              {historySteps.map((step, index) => (
                <button
                  key={step.label}
                  onClick={() => setTimeIndex(index)}
                  className={`w-full rounded-md border p-2 text-left ${
                    timeIndex === index
                      ? 'border-cyan-400/30 bg-cyan-500/10'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-200">
                      {step.label}
                    </span>
                    <span className="text-[9px] text-cyan-300">
                      {step.year}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[8px] text-slate-500">
                    {step.status}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-[8px] text-slate-500">
              <Info size={10} />
              Timeline is a visual revision layer; backend audit events remain authoritative.
            </div>
          </div>
        )}

        {/* ====================================================
            MINI MAP
        ==================================================== */}
        {showMiniMap && (
          <div
            style={{
              transform: `translate3d(${panelOffsets.spatial.x}px, ${panelOffsets.spatial.y}px, 0)`
            }}
            className="absolute right-2 bottom-16 z-40 h-28 w-44 overflow-hidden rounded-xl border border-white/10 bg-slate-950/60 shadow-2xl backdrop-blur-xl sm:right-3 sm:h-32 sm:w-48">
            <div
              onPointerDown={(event) => startPanelDrag('spatial', event)}
              className="absolute inset-x-0 top-0 z-10 flex h-7 cursor-grab touch-none items-center justify-between border-b border-white/10 bg-slate-950/35 px-2 active:cursor-grabbing"
            >
              <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wider text-slate-400">
                <GripVertical size={10} />
                Spatial Context
              </div>
              <button
                onClick={closeFloatingPanels}
                className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-white/10 hover:text-white"
                title="Close"
              >
                <X size={11} />
              </button>
            </div>

            <div className="flex items-center gap-1.5 border-b border-slate-800 px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              <Map size={11} />
              Spatial Context
            </div>

            <div className="relative h-[102px] bg-[radial-gradient(circle_at_center,_rgba(34,211,238,.12),_transparent_45%)]">
              <div className="absolute inset-3 rounded-lg border border-slate-700">
                <button
                  onClick={() => {
                    setSpatialFocus('NORTH');
                    applyCameraMode('TOP');
                    cameraValuesRef.current.theta = 0;
                    cameraValuesRef.current.phi = 0.34;
                  }}
                  className={`absolute left-[9%] top-[10%] h-5 w-8 rounded-sm ${
                    spatialFocus === 'NORTH'
                      ? 'bg-cyan-400/35 ring-1 ring-cyan-300'
                      : 'bg-slate-600/70 hover:bg-slate-500'
                  }`}
                  title="Focus north context"
                />
                <button
                  onClick={() => {
                    setSpatialFocus('SOCIETY');
                    applyCameraMode('TOP');
                    cameraValuesRef.current.theta = Math.PI / 4;
                    cameraValuesRef.current.phi = 0.42;
                  }}
                  className={`absolute right-[10%] top-[18%] h-6 w-10 rounded-sm ${
                    spatialFocus === 'SOCIETY'
                      ? 'bg-cyan-400/35 ring-1 ring-cyan-300'
                      : 'bg-slate-600/70 hover:bg-slate-500'
                  }`}
                  title="Focus society context"
                />
                <button
                  onClick={() => {
                    setSpatialFocus('BUILDING');
                    applyCameraMode('ORBIT');
                    cameraValuesRef.current.radius = 72;
                  }}
                  className={`absolute left-[35%] top-[35%] h-9 w-12 rounded-sm border-2 ${
                    spatialFocus === 'BUILDING'
                      ? 'border-cyan-300 bg-cyan-400/20'
                      : 'border-slate-500 bg-slate-700/40'
                  }`}
                  title="Focus cadastral building"
                />
                <button
                  onClick={() => {
                    setSpatialFocus('SOUTH');
                    applyCameraMode('TOP');
                    cameraValuesRef.current.theta = Math.PI;
                    cameraValuesRef.current.phi = 0.40;
                  }}
                  className={`absolute left-[12%] bottom-[13%] h-4 w-7 rounded-sm ${
                    spatialFocus === 'SOUTH'
                      ? 'bg-emerald-400/40 ring-1 ring-emerald-300'
                      : 'bg-emerald-500/30 hover:bg-emerald-500/45'
                  }`}
                  title="Focus south context"
                />
                <button
                  onClick={() => {
                    setSpatialFocus('SOCIETY');
                    applyCameraMode('TOP');
                    cameraValuesRef.current.radius = 105;
                  }}
                  className="absolute right-[12%] bottom-[15%] h-4 w-7 rounded-sm bg-emerald-500/30 hover:bg-emerald-500/45"
                  title="View society extent"
                />
                <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-slate-700/50" />
                <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full bg-slate-700/50" />
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            2D → 3D TRANSITION INDICATOR
        ==================================================== */}
        {transition2D3D && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
            <div className="rounded-b-xl border-x border-b border-amber-400/20 bg-amber-500/10 px-4 py-1.5 text-[9px] text-amber-200 backdrop-blur">
              2D cadastral footprint emphasis • elevation retained as metadata
            </div>
          </div>
        )}

        {selectedBuilding && (
          <div className="pointer-events-none absolute bottom-16 left-1/2 z-20 w-[calc(100%-8rem)] max-w-[520px] -translate-x-1/2 sm:bottom-20 sm:w-auto rounded-lg border border-cyan-400/20 bg-slate-950/80 px-3 py-1.5 text-center backdrop-blur">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
              {selectedBuilding.name || selectedBuilding.building_code}
            </div>
            <div className="text-[8px] text-slate-500">
              Selected cadastral building • surrounding society context • cadastral geometry remains interactive
            </div>
          </div>
        )}

        {cameraLocked && (
          <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-slate-950/85 px-2.5 py-1.5 text-[10px] text-amber-200 shadow-lg backdrop-blur">
            <Lock size={11} />
            Camera locked
          </div>
        )}

        {explodedView && (
          <div className="absolute left-3 top-12 z-20 flex items-center gap-1.5 rounded-lg border border-purple-400/30 bg-slate-950/85 px-2.5 py-1.5 text-[10px] text-purple-200 shadow-lg backdrop-blur">
            <UnfoldVertical size={11} />
            Exploded floor inspection
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

        {floors.length > 0 &&
          showVerticalStack && (
            <div className="absolute right-2 top-2 z-20 w-[180px] max-w-[calc(100%-1rem)] rounded-xl sm:right-3 sm:top-3 sm:w-48 border border-slate-700 bg-slate-950/85 p-3 backdrop-blur">

            <div
              onPointerDown={(event) => startPanelDrag('stack', event)}
              className="mb-2 flex cursor-grab touch-none items-center justify-between border-b border-white/10 pb-2 active:cursor-grabbing"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                <GripVertical size={11} className="text-slate-500" />
                <Layers size={12} className="text-cyan-300" />
                Vertical Stack
              </div>
              <button
                onClick={closeFloatingPanels}
                className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-white/10 hover:text-white"
                title="Close"
              >
                <X size={13} />
              </button>
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
                          setXrayMode(true);
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
            LAYER CONTROL DOCK
        ==================================================== */}
        <div className="absolute bottom-2 left-2 z-30 sm:bottom-3 sm:left-3">
          <div className="flex max-w-[calc(100vw-1rem)] items-center gap-1.5 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/65 p-1.5 shadow-xl backdrop-blur-xl">
            <div className="hidden shrink-0 px-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-500 md:block">
              Layers
            </div>
            <button
              onClick={() =>
                toggleFloatingPanel(
                  'spatial'
                )}
              className={`flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[9px] font-semibold transition ${
                activePanel === 'spatial'
                  ? 'bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Layers size={11} />
              Spatial
            </button>

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
            ].map((layer) => {
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
                  title={
                    enabled
                      ? `Hide ${layer.label}`
                      : `Show ${layer.label}`
                  }
                  className={`flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[9px] transition ${
                    enabled
                      ? 'bg-slate-700/90 text-white'
                      : 'bg-slate-900/75 text-slate-500'
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
            })}

            <span className="shrink-0 px-1 text-[8px] text-slate-500 md:hidden">
              Layers
            </span>
          </div>
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

          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-cyan-400" />
            X-Ray
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-sky-400" />
            3D Identity
          </div>

        </div>

        <div className="text-[9px] text-slate-500">
          SIH 2026 3D cadastral visualization • Z-axis = elevation • Explode • X-Ray • Identity • History
        </div>

      </div>
    </div>
  );
};

export { Viewer3D };
export default Viewer3D;