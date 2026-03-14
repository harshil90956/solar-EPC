import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AutomationRule, AutomationRuleDocument, ConditionNode, ActionNode } from '../schemas/automation-rule.schema';
import { AutomationExecution, AutomationExecutionDocument, ExecutionContext, ActionExecutionResult } from '../schemas/automation-execution.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Condition Evaluation Engine
 * Uses DFS to evaluate expression trees with AND/OR logic
 */

@Injectable()
export class ConditionEngine {
  private readonly logger = new Logger(ConditionEngine.name);

  // Operator implementations
  private readonly operators: Record<string, (actual: any, expected: any) => boolean> = {
    eq: (a, b) => a === b,
    ne: (a, b) => a !== b,
    gt: (a, b) => Number(a) > Number(b),
    gte: (a, b) => Number(a) >= Number(b),
    lt: (a, b) => Number(a) < Number(b),
    lte: (a, b) => Number(a) <= Number(b),
    contains: (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase()),
    starts_with: (a, b) => String(a).toLowerCase().startsWith(String(b).toLowerCase()),
    ends_with: (a, b) => String(a).toLowerCase().endsWith(String(b).toLowerCase()),
    exists: (a) => a !== undefined && a !== null,
    empty: (a) => a === undefined || a === null || a === '',
    in: (a, b) => Array.isArray(b) && b.includes(a),
    not_in: (a, b) => Array.isArray(b) && !b.includes(a),
    regex: (a, b) => {
      try {
        const regex = new RegExp(b, 'i');
        return regex.test(String(a));
      } catch {
        return false;
      }
    },
  };

  /**
   * Evaluate a condition tree using DFS
   * Returns true if conditions are met, false otherwise
   */
  evaluateConditionTree(node: ConditionNode, context: Record<string, any>): boolean {
    if (!node) {
      return true; // No conditions = always match
    }

    // Handle leaf condition node
    if (node.type === 'condition') {
      const actualValue = this.resolveFieldPath(context, node.field || '');
      const operator = this.operators[node.operator || 'eq'];
      
      if (!operator) {
        this.logger.warn(`Unknown operator: ${node.operator}`);
        return false;
      }

      const result = operator(actualValue, node.value);
      this.logger.debug(`Condition: ${node.field} ${node.operator} ${node.value} = ${result} (actual: ${actualValue})`);
      return result;
    }

    // Handle group node (AND/OR)
    if (node.type === 'group') {
      if (!node.children || node.children.length === 0) {
        return true;
      }

      const logic = node.logic || 'AND';
      
      if (logic === 'AND') {
        // All children must be true
        for (const child of node.children) {
          if (!this.evaluateConditionTree(child, context)) {
            return false; // Short-circuit
          }
        }
        return true;
      } else if (logic === 'OR') {
        // At least one child must be true
        for (const child of node.children) {
          if (this.evaluateConditionTree(child, context)) {
            return true; // Short-circuit
          }
        }
        return false;
      }
    }

    return false;
  }

  /**
   * Resolve a dot-notation path from context
   * Supports nested objects and arrays
   */
  resolveFieldPath(context: Record<string, any>, path: string): any {
    if (!path || !context) {
      return undefined;
    }

    const parts = path.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }

      // Handle array notation: items[0]
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [_, key, index] = arrayMatch;
        value = value[key];
        if (Array.isArray(value)) {
          value = value[parseInt(index, 10)];
        }
      } else {
        value = value[part];
      }
    }

    return value;
  }

  /**
   * Pre-resolve all fields from a condition tree
   * Returns a map of field paths to their resolved values
   */
  preResolveFields(node: ConditionNode, context: Record<string, any>): Record<string, any> {
    const resolved: Record<string, any> = {};
    
    this.collectFields(node).forEach(field => {
      resolved[field] = this.resolveFieldPath(context, field);
    });

    return resolved;
  }

  /**
   * Collect all field paths from a condition tree
   */
  private collectFields(node: ConditionNode): Set<string> {
    const fields = new Set<string>();

    if (!node) return fields;

    if (node.type === 'condition' && node.field) {
      fields.add(node.field);
    } else if (node.type === 'group' && node.children) {
      for (const child of node.children) {
        this.collectFields(child).forEach(f => fields.add(f));
      }
    }

    return fields;
  }
}
