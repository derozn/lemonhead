/**
 * Ban raw arithmetic on Pence-typed values outside the money module
 * (ADR 0008). Type-aware: an operand counts as money when its TypeScript
 * type mentions the 'Pence' brand, so a renamed variable cannot dodge the
 * rule the way one site dodged the old name-based grep.
 *
 * The operator set is deliberately `*`, `/`, and `%` only. Those are the
 * operations where scaling and rounding policy live, and the shape of every
 * violation the ADR 0008 audit found (÷100 display formatting). `+` and `-`
 * stay legal because they are dimensionally sound on money (pence plus pence
 * is pence) and because the property suites re-derive line totals with plain
 * `+`/`-` reduces as oracles deliberately independent of money.ts; banning
 * them would force those oracles through the very helpers they exist to
 * check. Production code still routes sums through sumPence/negate.
 *
 * Plain-JS twin of an ESLintUtils rule: it reads the type-checker through
 * context.sourceCode.parserServices (what getParserServices wraps), because
 * '@typescript-eslint/utils' is not a direct dependency of the workspace.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Pence multiplication, division, and modulo happen only in money.ts (ADR 0008)',
    },
    schema: [],
    messages: {
      noPenceArithmetic:
        "Raw '{{ operator }}' on a Pence-typed value. Scale money through the money.ts helpers " +
        '(proRata, applyPercent, multiplyRate); formatting to pounds belongs to the web ' +
        'formatter (ADR 0008).',
    },
  },
  create(context) {
    const services = context.sourceCode.parserServices;
    if (!services || typeof services.getTypeAtLocation !== 'function' || !services.program) {
      throw new Error(
        'no-pence-arithmetic requires type information; enable parserOptions.projectService for this file.',
      );
    }
    const checker = services.program.getTypeChecker();
    const bannedOperators = new Set(['*', '/', '%']);
    const isPence = (operand) =>
      checker.typeToString(services.getTypeAtLocation(operand)).includes('Pence');

    const bannedAssignmentOperators = new Set(['*=', '/=', '%=']);

    return {
      BinaryExpression(node) {
        if (!bannedOperators.has(node.operator)) return;
        if (isPence(node.left) || isPence(node.right)) {
          context.report({
            node,
            messageId: 'noPenceArithmetic',
            data: { operator: node.operator },
          });
        }
      },
      AssignmentExpression(node) {
        if (!bannedAssignmentOperators.has(node.operator)) return;
        if (isPence(node.left)) {
          context.report({
            node,
            messageId: 'noPenceArithmetic',
            data: { operator: node.operator },
          });
        }
      },
    };
  },
};
