import { propertyString } from "./property-accessor.js";
import type {
  MarkVSpecProjectLoadResult,
  MarkVSpecProjectTransitionEdge,
  MarkVSpecProjectTransitionGraph,
  MarkVSpecProjectTransitionNode
} from "./types.js";

export function buildProjectTransitionGraph(project: MarkVSpecProjectLoadResult): MarkVSpecProjectTransitionGraph {
  const nodes = project.screens
    .map((screen): MarkVSpecProjectTransitionNode | undefined => {
      const id = screen.result?.screen.id ?? screen.index.id;
      if (!id) {
        return undefined;
      }

      return {
        id,
        title: screen.result?.screen.title ?? screen.index.title,
        route: screen.result?.screen.route,
        path: screen.resolvedPath
      };
    })
    .filter((node): node is MarkVSpecProjectTransitionNode => Boolean(node));

  const projectScreenIds = new Set(nodes.map((node) => node.id));
  const edges: MarkVSpecProjectTransitionEdge[] = [];

  for (const screen of project.screens) {
    const sourceScreenId = screen.result?.screen.id ?? screen.index.id;
    if (!sourceScreenId || !screen.result) {
      continue;
    }

    for (const action of screen.result.actions) {
      for (const transition of action.transitions) {
        if (!isProjectNavigationTarget(transition.to)) {
          continue;
        }

        edges.push({
          sourceScreenId,
          sourceScreenTitle: screen.result.screen.title,
          actionId: action.id,
          actionMarker: propertyString(action, "marker"),
          actionName: action.name,
          fromState: transition.from,
          result: transition.result,
          target: transition.to,
          targetType: projectTransitionTargetType(transition.to, projectScreenIds),
          location: transition.location
        });
      }
    }
  }

  return { nodes, edges };
}

export function renderProjectTransitionMermaid(graph: MarkVSpecProjectTransitionGraph): string {
  const lines = ["flowchart LR"];
  const aliases = new Map<string, string>();

  for (const node of graph.nodes) {
    const alias = mermaidNodeAlias(node.id, aliases);
    lines.push(`  ${alias}["${mermaidLabel(node.title ?? node.id)}"]`);
  }

  const externalTargets = [...new Set(graph.edges.filter((edge) => edge.targetType === "external").map((edge) => edge.target))];
  for (const target of externalTargets) {
    const alias = mermaidNodeAlias(target, aliases);
    lines.push(`  ${alias}["${mermaidLabel(target)}"]`);
  }

  for (const edge of graph.edges) {
    const source = mermaidNodeAlias(edge.sourceScreenId, aliases);
    const target = mermaidNodeAlias(edge.target, aliases);
    if (edge.targetType === "missing-screen") {
      lines.push(`  ${source} -. "${mermaidLabel(projectEdgeLabel(edge))}" .-> ${target}["${mermaidLabel(edge.target)}"]`);
    } else {
      lines.push(`  ${source} -->|"${mermaidLabel(projectEdgeLabel(edge))}"| ${target}`);
    }
  }

  return lines.join("\n");
}

function projectTransitionTargetType(target: string, projectScreenIds: Set<string>): MarkVSpecProjectTransitionEdge["targetType"] {
  if (target.startsWith("SCR-")) {
    return projectScreenIds.has(target) ? "screen" : "missing-screen";
  }

  return "external";
}

function isProjectNavigationTarget(target: string): boolean {
  return target.startsWith("SCR-") || target.startsWith("/") || /^https?:\/\//u.test(target);
}

function projectEdgeLabel(edge: MarkVSpecProjectTransitionEdge): string {
  const actionLabel = edge.actionMarker ? `${edge.actionMarker} ${edge.actionName}` : `${edge.actionId} ${edge.actionName}`;
  return edge.result ? `${actionLabel} / ${edge.result}` : actionLabel;
}

function mermaidNodeAlias(id: string, aliases: Map<string, string>): string {
  const existing = aliases.get(id);
  if (existing) {
    return existing;
  }

  const base = id.replace(/[^A-Za-z0-9_]/gu, "_").replace(/^(\d)/u, "_$1").toUpperCase();
  let alias = base || `NODE_${aliases.size + 1}`;
  let suffix = 2;
  const usedAliases = new Set(aliases.values());
  while (usedAliases.has(alias)) {
    alias = `${base || "NODE"}_${suffix}`;
    suffix += 1;
  }

  aliases.set(id, alias);
  return alias;
}

function mermaidLabel(value: string): string {
  return value.replace(/\\/gu, "\\\\").replace(/"/gu, "\\\"");
}
