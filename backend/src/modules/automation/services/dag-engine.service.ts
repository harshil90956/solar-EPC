import { Injectable, Logger } from '@nestjs/common';
import { ActionNode } from '../schemas/automation-rule.schema';

/**
 * DAG (Directed Acyclic Graph) Engine
 * Handles workflow execution order with topological sorting
 * Includes cycle detection to prevent infinite loops
 */

export interface DAGNode {
  id: string;
  data: ActionNode;
  dependencies: Set<string>;
  dependents: Set<string>;
}

export interface DAG {
  nodes: Map<string, DAGNode>;
  edges: Array<{ from: string; to: string }>;
}

@Injectable()
export class DAGEngine {
  private readonly logger = new Logger(DAGEngine.name);

  /**
   * Build a DAG from action nodes
   */
  buildDAG(actionNodes: ActionNode[]): DAG {
    const nodes = new Map<string, DAGNode>();
    const edges: Array<{ from: string; to: string }> = [];

    // Create nodes
    for (const node of actionNodes) {
      nodes.set(node.nodeId, {
        id: node.nodeId,
        data: node,
        dependencies: new Set(node.dependencies || []),
        dependents: new Set(),
      });
    }

    // Build edges and reverse dependencies
    for (const node of actionNodes) {
      const dagNode = nodes.get(node.nodeId);
      if (!dagNode) continue;

      // Add dependencies as edges
      for (const depId of node.dependencies || []) {
        if (nodes.has(depId)) {
          edges.push({ from: depId, to: node.nodeId });
          
          // Add to dependents of dependency
          const depNode = nodes.get(depId);
          if (depNode) {
            depNode.dependents.add(node.nodeId);
          }
        }
      }

      // Also check nextNodes for backward edges
      for (const nextId of node.nextNodes || []) {
        if (nodes.has(nextId)) {
          const nextNode = nodes.get(nextId);
          if (nextNode && !nextNode.dependencies.has(node.nodeId)) {
            // Auto-add dependency if next node doesn't already have it
            nextNode.dependencies.add(node.nodeId);
            edges.push({ from: node.nodeId, to: nextId });
            dagNode.dependents.add(nextId);
          }
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Detect cycles in the DAG using DFS
   * Returns true if cycle detected, false if acyclic
   */
  hasCycle(dag: DAG): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = dag.nodes.get(nodeId);
      if (node) {
        for (const dependentId of node.dependents) {
          if (!visited.has(dependentId)) {
            if (dfs(dependentId)) return true;
          } else if (recursionStack.has(dependentId)) {
            return true; // Cycle detected
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of dag.nodes.keys()) {
      if (!visited.has(nodeId)) {
        if (dfs(nodeId)) return true;
      }
    }

    return false;
  }

  /**
   * Get all nodes involved in a cycle (for debugging)
   */
  findCycleNodes(dag: DAG): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycleNodes: string[] = [];

    const dfs = (nodeId: string, path: string[]): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const node = dag.nodes.get(nodeId);
      if (node) {
        for (const dependentId of node.dependents) {
          if (!visited.has(dependentId)) {
            if (dfs(dependentId, [...path])) return true;
          } else if (recursionStack.has(dependentId)) {
            // Found cycle - capture nodes
            const cycleStart = path.indexOf(dependentId);
            cycleNodes.push(...path.slice(cycleStart));
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of dag.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    return [...new Set(cycleNodes)];
  }

  /**
   * Topological sort using Kahn's algorithm
   * Returns execution order or null if cycle detected
   */
  topologicalSort(dag: DAG): string[] | null {
    if (this.hasCycle(dag)) {
      this.logger.error('Cannot sort - cycle detected in DAG');
      return null;
    }

    // Calculate in-degrees
    const inDegree = new Map<string, number>();
    for (const [id, node] of dag.nodes) {
      inDegree.set(id, node.dependencies.size);
    }

    // Find nodes with no dependencies
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    const result: string[] = [];

    while (queue.length > 0) {
      // Sort queue for deterministic order
      queue.sort();
      const currentId = queue.shift()!;
      result.push(currentId);

      const currentNode = dag.nodes.get(currentId);
      if (currentNode) {
        for (const dependentId of currentNode.dependents) {
          const newDegree = (inDegree.get(dependentId) || 0) - 1;
          inDegree.set(dependentId, newDegree);
          if (newDegree === 0) {
            queue.push(dependentId);
          }
        }
      }
    }

    // Check if all nodes were processed
    if (result.length !== dag.nodes.size) {
      this.logger.error('Topological sort failed - possible cycle');
      return null;
    }

    return result;
  }

  /**
   * Get all nodes ready to execute (all dependencies satisfied)
   */
  getReadyNodes(dag: DAG, completedIds: Set<string>): string[] {
    const ready: string[] = [];

    for (const [id, node] of dag.nodes) {
      if (completedIds.has(id)) continue;

      // Check if all dependencies are completed
      const allDepsCompleted = [...node.dependencies].every(depId => completedIds.has(depId));
      if (allDepsCompleted) {
        ready.push(id);
      }
    }

    return ready.sort(); // Deterministic order
  }

  /**
   * Get all nodes that depend on a given node
   */
  getDependents(dag: DAG, nodeId: string): string[] {
    const node = dag.nodes.get(nodeId);
    if (!node) return [];
    return [...node.dependents];
  }

  /**
   * Get all dependencies of a node (transitive)
   */
  getAllDependencies(dag: DAG, nodeId: string, visited = new Set<string>()): string[] {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);

    const node = dag.nodes.get(nodeId);
    if (!node) return [];

    const deps: string[] = [];
    for (const depId of node.dependencies) {
      deps.push(depId);
      deps.push(...this.getAllDependencies(dag, depId, visited));
    }

    return [...new Set(deps)];
  }

  /**
   * Validate DAG and return any issues
   */
  validateDAG(dag: DAG): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for orphaned nodes
    const allReferenced = new Set<string>();
    for (const [id, node] of dag.nodes) {
      for (const dep of node.dependencies) {
        allReferenced.add(dep);
      }
      for (const dependent of node.dependents) {
        allReferenced.add(dependent);
      }
    }

    for (const id of dag.nodes.keys()) {
      const node = dag.nodes.get(id)!;
      if (node.dependencies.size === 0 && node.dependents.size === 0 && dag.nodes.size > 1) {
        errors.push(`Node ${id} is orphaned (no connections)`);
      }
    }

    // Check for missing dependencies
    for (const [id, node] of dag.nodes) {
      for (const dep of node.dependencies) {
        if (!dag.nodes.has(dep)) {
          errors.push(`Node ${id} references missing dependency: ${dep}`);
        }
      }
    }

    // Check for cycles
    if (this.hasCycle(dag)) {
      const cycleNodes = this.findCycleNodes(dag);
      errors.push(`Cycle detected involving nodes: ${cycleNodes.join(' → ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get execution batches - nodes that can run in parallel
   */
  getExecutionBatches(dag: DAG): string[][] {
    const sorted = this.topologicalSort(dag);
    if (!sorted) return [];

    const batches: string[][] = [];
    const completed = new Set<string>();

    while (completed.size < sorted.length) {
      const batch = this.getReadyNodes(dag, completed);
      if (batch.length === 0) break;
      
      batches.push(batch);
      batch.forEach(id => completed.add(id));
    }

    return batches;
  }
}
