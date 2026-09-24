import crypto from "node:crypto";

export const uuid = () => crypto.randomUUID();

export const now = () => new Date().toISOString();

export const round = (value, digits = 2) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Number(number.toFixed(digits));
};

export const clone = (value) => JSON.parse(JSON.stringify(value));

export const values = (obj) => Object.values(obj ?? {});

export const findByIdOr = (items, id, fields = []) => {
  if (!items || id === undefined || id === null) {
    return undefined;
  }

  if (items[id]) {
    return items[id];
  }

  const query = String(id).trim().toUpperCase();

  return Object.values(items).find((item) =>
    fields.some(
      (field) =>
        String(item?.[field] ?? "").trim().toUpperCase() === query
    )
  );
};