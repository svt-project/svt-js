import table from "../conformance/interpretation/named-colors.json" with { type: "json" };
import type { SrgbColor } from "./interpretation.js";

const names: ReadonlyMap<string, string> = new Map(
  Object.entries(table.colors),
);
// CSS numbers require a digit after a decimal point. Exponents and leading signs are optional.
export const numberPattern =
  /[+-]?(?:[0-9]*\.[0-9]+|[0-9]+)(?:[eE][+-]?[0-9]+)?/;
const componentPattern = new RegExp(
  "^(" + numberPattern.source + ")(%|deg|grad|rad|turn)?$",
  "i",
);
function component(token: string) {
  const match = componentPattern.exec(token);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value)
    ? { value, unit: (match[2] ?? "").toLowerCase() }
    : null;
}

function normalized(value: number, maximum = 1): number {
  return Math.max(0, Math.min(value, maximum)) / maximum;
}
function color(
  red: number,
  green: number,
  blue: number,
  alpha: number,
): SrgbColor {
  return Object.freeze({
    red: normalized(red),
    green: normalized(green),
    blue: normalized(blue),
    alpha: normalized(alpha),
  });
}
function hexColor(hex: string): SrgbColor | null {
  if (!/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) return null;
  const digits = hex.slice(1);
  const expanded =
    digits.length < 5 ? digits.replace(/./g, (digit) => digit + digit) : digits;
  const channel = (start: number) =>
    parseInt(expanded.slice(start, start + 2), 16) / 255;
  return color(
    channel(0),
    channel(2),
    channel(4),
    expanded.length === 8 ? channel(6) : 1,
  );
}

// Called after the lexical scan has rejected non-ASCII characters and non-CSS whitespace.
export function literalColor(text: string): SrgbColor | null {
  if (text.startsWith("#")) return hexColor(text);
  const lower = text.toLowerCase();
  if (lower === "transparent") return color(0, 0, 0, 0);
  const open = lower.indexOf("(");
  if (open < 0) {
    const hex = names.get(lower);
    return hex === undefined ? null : hexColor(hex);
  }
  const name = lower.slice(0, open);
  const hsl = name === "hsl" || name === "hsla";
  if ((!hsl && name !== "rgb" && name !== "rgba") || !lower.endsWith(")"))
    return null;
  const body = lower.slice(open + 1, -1).trim();
  const comma = body.includes(",");
  let channels: string[];
  let alphaText: string | undefined;
  if (comma) {
    channels = body.split(",").map((item) => item.trim());
    if (channels.length === 4) alphaText = channels.pop();
  } else {
    const [rgb, opacity, ...extra] = body.split("/");
    if (extra.length || rgb === undefined) return null;
    channels = rgb.trim().split(/[ \t\r\n\f]+/);
    alphaText = opacity?.trim();
  }
  if (channels.length !== 3) return null;
  const [first, second, third] = channels.map(component);
  const alpha = component(alphaText ?? "1");
  if (
    !first ||
    !second ||
    !third ||
    !alpha ||
    (alpha.unit !== "" && alpha.unit !== "%")
  )
    return null;
  const opacity = normalized(alpha.value, alpha.unit === "%" ? 100 : 1);
  if (!hsl) {
    const rgb = [first, second, third];
    if (rgb.some((c) => c.unit !== "" && c.unit !== "%")) return null;
    if (comma && rgb.some((c) => c.unit !== first.unit)) return null;
    const channel = (c: typeof first) =>
      normalized(c.value, c.unit === "%" ? 100 : 255);
    return color(channel(first), channel(second), channel(third), opacity);
  }
  if (first.unit === "%" || second.unit !== "%" || third.unit !== "%")
    return null;
  const period =
    first.unit === "grad"
      ? 400
      : first.unit === "rad"
        ? 2 * Math.PI
        : first.unit === "turn"
          ? 1
          : 360;
  const remainder = first.value % period;
  const hue = ((remainder < 0 ? remainder + period : remainder) / period) * 6;
  const lightness = normalized(third.value, 100);
  const chroma =
    (1 - Math.abs(2 * lightness - 1)) * normalized(second.value, 100);
  const x = chroma * (1 - Math.abs((hue % 2) - 1));
  const offset = lightness - chroma / 2;
  if (hue < 1) return color(chroma + offset, x + offset, offset, opacity);
  if (hue < 2) return color(x + offset, chroma + offset, offset, opacity);
  if (hue < 3) return color(offset, chroma + offset, x + offset, opacity);
  if (hue < 4) return color(offset, x + offset, chroma + offset, opacity);
  if (hue < 5) return color(x + offset, offset, chroma + offset, opacity);
  return color(chroma + offset, offset, x + offset, opacity);
}
