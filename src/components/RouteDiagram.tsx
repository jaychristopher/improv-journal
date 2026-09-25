import { Diagram } from "@/components/Diagram";
import { routeDiagram } from "@/lib/route-diagrams";

/**
 * The declared diagram for a route page, or nothing.
 *
 * Paths and the school pages are JSX routes with no markdown prose, so the
 * transform that inlines diagrams never sees them; this is `<Diagram>` fed
 * from `ROUTE_DIAGRAMS` by the page's own route (SA-13.1). Server component,
 * like `Diagram`: the SVG is read at build time and nothing ships to the
 * client.
 */
export function RouteDiagram({ route }: { route: string }) {
  const diagram = routeDiagram(route);
  if (!diagram) return null;
  return <Diagram src={diagram.src} alt={diagram.alt} caption={diagram.caption} />;
}
