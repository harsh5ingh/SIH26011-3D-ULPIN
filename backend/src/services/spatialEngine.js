import { round } from "../utils.js";

const EPSILON = 1e-10;

const close = (a, b, eps = EPSILON) =>
  Math.abs(Number(a) - Number(b)) <= eps;

const closed = (coords) => {
  if (!Array.isArray(coords) || coords.length === 0) {
    return [];
  }

  const first = coords[0];
  const last = coords.at(-1);

  if (
    close(first[0], last[0]) &&
    close(first[1], last[1])
  ) {
    return coords;
  }

  return [...coords, first];
};

const cross = (a, b, c) =>
  (b[0] - a[0]) * (c[1] - a[1]) -
  (b[1] - a[1]) * (c[0] - a[0]);

const signedArea = (coords) => {
  const polygon = closed(coords);

  if (polygon.length < 4) {
    return 0;
  }

  let sum = 0;

  for (let i = 0; i < polygon.length - 1; i += 1) {
    sum +=
      polygon[i][0] * polygon[i + 1][1] -
      polygon[i + 1][0] * polygon[i][1];
  }

  return sum / 2;
};

const polygonArea = (coords) =>
  Math.abs(signedArea(coords));

const inside = (point, a, b, orientation) =>
  orientation * cross(a, b, point) >= -EPSILON;

const lineIntersection = (a, b, c, d) => {
  const x1 = a[0];
  const y1 = a[1];
  const x2 = b[0];
  const y2 = b[1];

  const x3 = c[0];
  const y3 = c[1];
  const x4 = d[0];
  const y4 = d[1];

  const denominator =
    (x1 - x2) * (y3 - y4) -
    (y1 - y2) * (x3 - x4);

  if (Math.abs(denominator) < 1e-12) {
    return b;
  }

  const px =
    ((x1 * y2 - y1 * x2) * (x3 - x4) -
      (x1 - x2) * (x3 * y4 - y3 * x4)) /
    denominator;

  const py =
    ((x1 * y2 - y1 * x2) * (y3 - y4) -
      (y1 - y2) * (x3 * y4 - y3 * x4)) /
    denominator;

  return [px, py];
};

const clipPolygon = (subject, clip) => {
  let output = closed(subject).slice(0, -1);
  const clipPolygonPoints = closed(clip).slice(0, -1);

  if (
    output.length < 3 ||
    clipPolygonPoints.length < 3
  ) {
    return [];
  }

  const orientation =
    signedArea(clipPolygonPoints) >= 0 ? 1 : -1;

  for (
    let i = 0;
    i < clipPolygonPoints.length;
    i += 1
  ) {
    const A = clipPolygonPoints[i];
    const B =
      clipPolygonPoints[
        (i + 1) % clipPolygonPoints.length
      ];

    const input = output;
    output = [];

    if (!input.length) {
      break;
    }

    let S = input.at(-1);

    for (const E of input) {
      const endInside = inside(
        E,
        A,
        B,
        orientation
      );

      const startInside = inside(
        S,
        A,
        B,
        orientation
      );

      if (endInside) {
        if (!startInside) {
          output.push(
            lineIntersection(S, E, A, B)
          );
        }

        output.push(E);
      } else if (startInside) {
        output.push(
          lineIntersection(S, E, A, B)
        );
      }

      S = E;
    }
  }

  return output;
};

const pointInPolygon = (point, polygon) => {
  const points = closed(polygon);

  if (points.length < 4) {
    return false;
  }

  let insideFlag = false;

  for (
    let i = 0, j = points.length - 1;
    i < points.length;
    i += 1
  ) {
    const xi = points[i][0];
    const yi = points[i][1];

    const xj = points[j][0];
    const yj = points[j][1];

    const intersects =
      yi > point[1] !== yj > point[1] &&
      point[0] <
        ((xj - xi) * (point[1] - yi)) /
          (yj - yi + Number.EPSILON) +
          xi;

    if (intersects) {
      insideFlag = !insideFlag;
    }

    j = i;
  }

  return insideFlag;
};

const areaSqm = (coords) => {
  const points = closed(coords);

  if (points.length < 4) {
    return 0;
  }

  const latAverage =
    points.reduce(
      (sum, point) => sum + point[1],
      0
    ) / points.length;

  const latitudeFactor = 111000;

  const longitudeFactor =
    111000 *
    Math.cos(
      (latAverage * Math.PI) / 180
    );

  const origin = points[0];

  const projected = points.map((point) => [
    (point[0] - origin[0]) *
      longitudeFactor,
    (point[1] - origin[1]) *
      latitudeFactor,
  ]);

  return round(polygonArea(projected), 4);
};

export const spatialEngine = {
  createPolygon(coords) {
    if (
      !Array.isArray(coords) ||
      coords.length < 3
    ) {
      throw new Error(
        "Polygon must have at least 3 points"
      );
    }

    return closed(coords);
  },

  calculateArea(coords) {
    return areaSqm(coords);
  },

  calculateVolume(coords, zmin, zmax) {
    const height =
      Math.max(
        0,
        Number(zmax) - Number(zmin)
      );

    return round(
      areaSqm(coords) * height,
      4
    );
  },

  checkContainment2D(inner, outer) {
    const innerPoints =
      closed(inner).slice(0, -1);

    if (
      innerPoints.length < 3 ||
      closed(outer).length < 4
    ) {
      return [false, 0];
    }

    const contained = innerPoints.every(
      (point) =>
        pointInPolygon(point, outer)
    );

    if (contained) {
      return [true, 100];
    }

    const clipped = clipPolygon(
      inner,
      outer
    );

    const innerArea = polygonArea(inner);
    const clippedArea =
      polygonArea(clipped);

    const percentage = innerArea
      ? (clippedArea / innerArea) * 100
      : 0;

    return [
      percentage >= 99.9,
      round(percentage, 2),
    ];
  },

  checkOverlap2D(poly1, poly2) {
    const intersection = clipPolygon(
      poly1,
      poly2
    );

    if (intersection.length < 3) {
      return [false, 0];
    }

    const intersectionArea =
      polygonArea(intersection);

    if (intersectionArea < 1e-12) {
      return [false, 0];
    }

    const latAverage =
      poly1.reduce(
        (sum, point) => sum + point[1],
        0
      ) / poly1.length;

    const latitudeFactor = 111000;

    const longitudeFactor =
      111000 *
      Math.cos(
        (latAverage * Math.PI) / 180
      );

    const squareMeters =
      intersectionArea *
      latitudeFactor *
      longitudeFactor;

    return [
      squareMeters > 1e-7,
      round(squareMeters, 4),
    ];
  },

  checkVerticalOverlap(
    z1min,
    z1max,
    z2min,
    z2max,
    tolerance = 0.05
  ) {
    const overlapHeight =
      Math.min(
        Number(z1max),
        Number(z2max)
      ) -
      Math.max(
        Number(z1min),
        Number(z2min)
      );

    return overlapHeight > tolerance
      ? [true, round(overlapHeight, 4)]
      : [false, 0];
  },

  check3DVolumetricOverlap(
    c1,
    z1min,
    z1max,
    c2,
    z2min,
    z2max
  ) {
    const [hasHorizontalOverlap, area] =
      this.checkOverlap2D(c1, c2);

    if (!hasHorizontalOverlap) {
      return [false, 0];
    }

    const [hasVerticalOverlap, height] =
      this.checkVerticalOverlap(
        z1min,
        z1max,
        z2min,
        z2max
      );

    if (!hasVerticalOverlap) {
      return [false, 0];
    }

    return [
      true,
      round(area * height, 4),
    ];
  },

  getBoundingBox3D(
    coords,
    zmin,
    zmax
  ) {
    if (
      !Array.isArray(coords) ||
      coords.length === 0
    ) {
      throw new Error(
        "Coordinates are required"
      );
    }

    const longitudes = coords.map(
      (point) => point[0]
    );

    const latitudes = coords.map(
      (point) => point[1]
    );

    return {
      min_lng: Math.min(...longitudes),
      max_lng: Math.max(...longitudes),
      min_lat: Math.min(...latitudes),
      max_lat: Math.max(...latitudes),
      min_z_m: Number(zmin),
      max_z_m: Number(zmax),
    };
  },

  polygonArea,
};