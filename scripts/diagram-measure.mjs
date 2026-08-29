/**
 * Diagram text width — measure a label before placing it on a 400px canvas.
 *
 * Usage:
 *   node scripts/diagram-measure.mjs dg-eyebrow "SECOND CITY"
 *   node scripts/diagram-measure.mjs dg-note "one" "two" "three"
 *
 * SVG text does not wrap: a label wider than its canvas is drawn straight off
 * the edge. This imports the same tables the guard uses, so an authoring-time
 * measurement and the test cannot disagree.
 */

import { CLASSES, measure } from "../src/lib/text-metrics.ts";

const [className, ...texts] = process.argv.slice(2);

if (!className || texts.length === 0) {
  console.error('usage: node scripts/diagram-measure.mjs <class> "text" ["text" ...]');
  console.error(`classes: ${Object.keys(CLASSES).join(", ")}`);
  process.exit(1);
}

for (const text of texts) {
  console.log(`${measure(text, className).toFixed(1).padStart(7)}  ${JSON.stringify(text)}`);
}
