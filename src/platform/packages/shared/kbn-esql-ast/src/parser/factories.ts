/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * In case of changes in the grammar, this script should be updated: esql_update_ast_script.js
 */

import type {
  Token,
  ParserRuleContext,
  TerminalNode,
  RecognitionException,
  ParseTree,
} from 'antlr4';
import {
  IndexPatternContext,
  QualifiedNameContext,
  type ArithmeticUnaryContext,
  type DecimalValueContext,
  type InlineCastContext,
  type IntegerValueContext,
  type QualifiedIntegerLiteralContext,
  QualifiedNamePatternContext,
  FunctionContext,
  IdentifierContext,
  InputParamContext,
  InputNamedOrPositionalParamContext,
  IdentifierOrParameterContext,
  StringContext,
} from '../antlr/esql_parser';
import { DOUBLE_TICKS_REGEX, SINGLE_BACKTICK, TICKS_REGEX } from './constants';
import type {
  ESQLAstBaseItem,
  ESQLLiteral,
  ESQLList,
  ESQLTimeInterval,
  ESQLLocation,
  ESQLFunction,
  ESQLSource,
  ESQLColumn,
  ESQLCommandOption,
  ESQLAstItem,
  ESQLCommandMode,
  ESQLInlineCast,
  ESQLUnknownItem,
  ESQLNumericLiteralType,
  FunctionSubtype,
  ESQLNumericLiteral,
  ESQLOrderExpression,
  InlineCastingType,
  ESQLFunctionCallExpression,
  ESQLIdentifier,
  ESQLBinaryExpression,
  BinaryExpressionOperator,
} from '../types';
import { parseIdentifier, getPosition } from './helpers';
import { Builder, type AstNodeParserFields } from '../builder';

export function nonNullable<T>(v: T): v is NonNullable<T> {
  return v != null;
}

export function createAstBaseItem<Name = string>(
  name: Name,
  ctx: ParserRuleContext
): ESQLAstBaseItem<Name> {
  return {
    name,
    text: ctx.getText(),
    location: getPosition(ctx.start, ctx.stop),
    incomplete: Boolean(ctx.exception),
  };
}

const createParserFields = (ctx: ParserRuleContext): AstNodeParserFields => ({
  text: ctx.getText(),
  location: getPosition(ctx.start, ctx.stop),
  incomplete: Boolean(ctx.exception),
});

export const createCommand = <Name extends string>(name: Name, ctx: ParserRuleContext) =>
  Builder.command({ name, args: [] }, createParserFields(ctx));

export const createInlineCast = (ctx: InlineCastContext, value: ESQLInlineCast['value']) =>
  Builder.expression.inlineCast(
    { castType: ctx.dataType().getText().toLowerCase() as InlineCastingType, value },
    createParserFields(ctx)
  );

export const createList = (ctx: ParserRuleContext, values: ESQLLiteral[]): ESQLList =>
  Builder.expression.literal.list({ values }, createParserFields(ctx));

export const createNumericLiteral = (
  ctx: DecimalValueContext | IntegerValueContext,
  literalType: ESQLNumericLiteralType
): ESQLLiteral =>
  Builder.expression.literal.numeric(
    { value: Number(ctx.getText()), literalType },
    createParserFields(ctx)
  );

export function createFakeMultiplyLiteral(
  ctx: ArithmeticUnaryContext,
  literalType: ESQLNumericLiteralType
): ESQLLiteral {
  return {
    type: 'literal',
    literalType,
    text: ctx.getText(),
    name: ctx.getText(),
    value: ctx.PLUS() ? 1 : -1,
    location: getPosition(ctx.start, ctx.stop),
    incomplete: Boolean(ctx.exception),
  };
}

export function createLiteralString(ctx: StringContext): ESQLLiteral {
  const quotedString = ctx.QUOTED_STRING()?.getText() ?? '""';
  const isTripleQuoted = quotedString.startsWith('"""') && quotedString.endsWith('"""');
  let valueUnquoted = isTripleQuoted ? quotedString.slice(3, -3) : quotedString.slice(1, -1);

  if (!isTripleQuoted) {
    valueUnquoted = valueUnquoted
      .replace(/\\"/g, '"')
      .replace(/\\r/g, '\r')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\');
  }

  return Builder.expression.literal.string(
    valueUnquoted,
    {
      name: quotedString,
    },
    createParserFields(ctx)
  );
}

function isMissingText(text: string) {
  return /<missing /.test(text);
}

export function textExistsAndIsValid(text: string | undefined): text is string {
  return !!(text && !isMissingText(text));
}

export function createLiteral(
  type: ESQLLiteral['literalType'],
  node: TerminalNode | null
): ESQLLiteral {
  if (!node) {
    return {
      type: 'literal',
      name: 'unknown',
      text: 'unknown',
      value: 'unknown',
      literalType: type,
      location: { min: 0, max: 0 },
      incomplete: false,
    } as ESQLLiteral;
  }

  const text = node.getText();

  const partialLiteral: Omit<ESQLLiteral, 'literalType' | 'value'> = {
    type: 'literal',
    text,
    name: text,
    location: getPosition(node.symbol),
    incomplete: isMissingText(text),
  };
  if (type === 'double' || type === 'integer') {
    return {
      ...partialLiteral,
      literalType: type,
      value: Number(text),
      paramType: 'number',
    } as ESQLNumericLiteral<'double'> | ESQLNumericLiteral<'integer'>;
  } else if (type === 'param') {
    throw new Error('Should never happen');
  }
  return {
    ...partialLiteral,
    literalType: type,
    value: text,
  } as ESQLLiteral;
}

export function createTimeUnit(ctx: QualifiedIntegerLiteralContext): ESQLTimeInterval {
  return {
    type: 'timeInterval',
    quantity: Number(ctx.integerValue().INTEGER_LITERAL().getText()),
    unit: ctx.UNQUOTED_IDENTIFIER().symbol.text,
    text: ctx.getText(),
    location: getPosition(ctx.start, ctx.stop),
    name: `${ctx.integerValue().INTEGER_LITERAL().getText()} ${
      ctx.UNQUOTED_IDENTIFIER().symbol.text
    }`,
    incomplete: Boolean(ctx.exception),
  };
}

export function createFunction<Subtype extends FunctionSubtype>(
  name: string,
  ctx: ParserRuleContext,
  customPosition?: ESQLLocation,
  subtype?: Subtype
): ESQLFunction<Subtype> {
  const node: ESQLFunction<Subtype> = {
    type: 'function',
    name,
    text: ctx.getText(),
    location: customPosition ?? getPosition(ctx.start, ctx.stop),
    args: [],
    incomplete: Boolean(ctx.exception),
  };
  if (subtype) {
    node.subtype = subtype;
  }
  return node;
}

export const createFunctionCall = (ctx: FunctionContext): ESQLFunctionCallExpression => {
  const functionExpressionCtx = ctx.functionExpression();
  const functionName = functionExpressionCtx.functionName();
  const node: ESQLFunctionCallExpression = {
    type: 'function',
    subtype: 'variadic-call',
    name: functionName.getText().toLowerCase(),
    text: ctx.getText(),
    location: getPosition(ctx.start, ctx.stop),
    args: [],
    incomplete: Boolean(ctx.exception),
  };

  const identifierOrParameter = functionName.identifierOrParameter();

  if (identifierOrParameter instanceof IdentifierOrParameterContext) {
    const operator = createIdentifierOrParam(identifierOrParameter);

    if (operator) {
      node.operator = operator;
    }
  }

  return node;
};

export const createBinaryExpression = (
  operator: BinaryExpressionOperator,
  ctx: ParserRuleContext,
  args: ESQLBinaryExpression['args']
): ESQLBinaryExpression => {
  const node = Builder.expression.func.binary(
    operator,
    args,
    {},
    {
      text: ctx.getText(),
      location: getPosition(ctx.start, ctx.stop),
      incomplete: Boolean(ctx.exception),
    }
  ) as ESQLBinaryExpression;

  return node;
};

export const createIdentifierOrParam = (ctx: IdentifierOrParameterContext) => {
  const identifier = ctx.identifier();
  if (identifier) {
    return createIdentifier(identifier);
  } else {
    const parameter = ctx.parameter();
    if (parameter) {
      return createParam(parameter);
    }
  }
};

export const createIdentifier = (identifier: IdentifierContext): ESQLIdentifier => {
  const text = identifier.getText();
  const name = parseIdentifier(text);

  return Builder.identifier({ name }, createParserFields(identifier));
};

export const createParam = (ctx: ParseTree) => {
  if (ctx instanceof InputParamContext) {
    return Builder.param.unnamed(createParserFields(ctx));
  } else if (ctx instanceof InputNamedOrPositionalParamContext) {
    const text = ctx.getText();
    const value = text.slice(1);
    const valueAsNumber = Number(value);
    const isPositional = String(valueAsNumber) === value;
    const parserFields = createParserFields(ctx);

    if (isPositional) {
      return Builder.param.positional({ value: valueAsNumber }, parserFields);
    } else {
      return Builder.param.named({ value }, parserFields);
    }
  }
};

export const createOrderExpression = (
  ctx: ParserRuleContext,
  arg: ESQLColumn,
  order: ESQLOrderExpression['order'],
  nulls: ESQLOrderExpression['nulls']
) => {
  const node = Builder.expression.order(
    arg as ESQLColumn,
    { order, nulls },
    createParserFields(ctx)
  );

  return node;
};

function walkFunctionStructure(
  args: ESQLAstItem[],
  initialLocation: ESQLLocation,
  prop: 'min' | 'max',
  getNextItemIndex: (arg: ESQLAstItem[]) => number
) {
  let nextArg: ESQLAstItem | undefined = args[getNextItemIndex(args)];
  const location = { ...initialLocation };
  while (Array.isArray(nextArg) || nextArg) {
    if (Array.isArray(nextArg)) {
      nextArg = nextArg[getNextItemIndex(nextArg)];
    } else {
      location[prop] = Math[prop](location[prop], nextArg.location[prop]);
      if (nextArg.type === 'function') {
        nextArg = nextArg.args[getNextItemIndex(nextArg.args)];
      } else {
        nextArg = undefined;
      }
    }
  }
  return location[prop];
}

export function computeLocationExtends(fn: ESQLFunction) {
  const location = fn.location;
  if (fn.args) {
    // get min location navigating in depth keeping the left/first arg
    location.min = walkFunctionStructure(fn.args, location, 'min', () => 0);
    // get max location navigating in depth keeping the right/last arg
    location.max = walkFunctionStructure(fn.args, location, 'max', (args) => args.length - 1);
    // in case of empty array as last arg, bump the max location by 3 chars (empty brackets)
    if (
      Array.isArray(fn.args[fn.args.length - 1]) &&
      !(fn.args[fn.args.length - 1] as ESQLAstItem[]).length
    ) {
      location.max += 3;
    }
  }
  return location;
}

// Note: do not import esql_parser or bundle size will grow up by ~500 kb
/**
 * Do not touch this piece of code as it is auto-generated by a script
 */

/* SCRIPT_MARKER_START */
function getQuotedText(ctx: ParserRuleContext) {
  return [27 /* esql_parser.QUOTED_STRING */, 69 /* esql_parser.QUOTED_IDENTIFIER */]
    .map((keyCode) => ctx.getToken(keyCode, 0))
    .filter(nonNullable)[0];
}

function getUnquotedText(ctx: ParserRuleContext) {
  return [68 /* esql_parser.UNQUOTED_IDENTIFIER */, 77 /* esql_parser.UNQUOTED_SOURCE */]
    .map((keyCode) => ctx.getToken(keyCode, 0))
    .filter(nonNullable)[0];
}
/* SCRIPT_MARKER_END */

function isQuoted(text: string | undefined) {
  return text && /^(`)/.test(text);
}

/**
 * Follow a similar logic to the ES one:
 * * remove backticks at the beginning and at the end
 * * remove double backticks
 */
function safeBackticksRemoval(text: string | undefined) {
  return text?.replace(TICKS_REGEX, '').replace(DOUBLE_TICKS_REGEX, SINGLE_BACKTICK) || '';
}

function sanitizeSourceString(ctx: ParserRuleContext) {
  const contextText = ctx.getText();
  // If wrapped by triple quote, remove
  if (contextText.startsWith(`"""`) && contextText.endsWith(`"""`)) {
    return contextText.replace(/\"\"\"/g, '');
  }
  // If wrapped by single quote, remove
  if (contextText.startsWith(`"`) && contextText.endsWith(`"`)) {
    return contextText.slice(1, -1);
  }
  return contextText;
}

const unquoteIndexString = (indexString: string): string => {
  const isStringQuoted = indexString[0] === '"';

  if (!isStringQuoted) {
    return indexString;
  }

  // If wrapped by triple double quotes, simply remove them.
  if (indexString.startsWith(`"""`) && indexString.endsWith(`"""`)) {
    return indexString.slice(3, -3);
  }

  // If wrapped by double quote, remove them and unescape the string.
  if (indexString[indexString.length - 1] === '"') {
    indexString = indexString.slice(1, -1);
    indexString = indexString
      .replace(/\\"/g, '"')
      .replace(/\\r/g, '\r')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\');
    return indexString;
  }

  // This should never happen, but if it does, return the original string.
  return indexString;
};

export function sanitizeIdentifierString(ctx: ParserRuleContext) {
  const result =
    getUnquotedText(ctx)?.getText() ||
    safeBackticksRemoval(getQuotedText(ctx)?.getText()) ||
    safeBackticksRemoval(ctx.getText()); // for some reason some quoted text is not detected correctly by the parser
  // TODO - understand why <missing null> is now returned as the match text for the FROM command
  return result === '<missing null>' ? '' : result;
}

export function wrapIdentifierAsArray<T extends ParserRuleContext>(identifierCtx: T | T[]): T[] {
  return Array.isArray(identifierCtx) ? identifierCtx : [identifierCtx];
}

export function createSetting(policyName: Token, mode: string): ESQLCommandMode {
  return {
    type: 'mode',
    name: mode.replace('_', '').toLowerCase(),
    text: mode,
    location: getPosition(policyName, { stop: policyName.start + mode.length - 1 }), // unfortunately this is the only location we have
    incomplete: false,
  };
}

/**
 * In https://github.com/elastic/elasticsearch/pull/103949 the ENRICH policy name
 * changed from rule to token type so we need to handle this specifically
 */
export function createPolicy(token: Token, policy: string): ESQLSource {
  return {
    type: 'source',
    name: policy,
    text: policy,
    sourceType: 'policy',
    location: getPosition({
      start: token.stop - policy.length + 1,
      stop: token.stop,
    }), // take into account ccq modes
    incomplete: false,
  };
}

export function createSource(
  ctx: ParserRuleContext,
  type: 'index' | 'policy' = 'index'
): ESQLSource {
  const text = sanitizeSourceString(ctx);

  let cluster: string = '';
  let index: string = '';

  if (ctx instanceof IndexPatternContext) {
    const clusterString = ctx.clusterString();
    const indexString = ctx.indexString();

    if (clusterString) {
      cluster = clusterString.getText();
    }
    if (indexString) {
      index = indexString.getText();
      index = unquoteIndexString(index);
    }
  }

  return {
    type: 'source',
    cluster,
    index,
    name: text,
    sourceType: type,
    location: getPosition(ctx.start, ctx.stop),
    incomplete: Boolean(ctx.exception || text === ''),
    text: ctx?.getText(),
  };
}

export function createColumnStar(ctx: TerminalNode): ESQLColumn {
  const text = ctx.getText();
  const parserFields = {
    text,
    location: getPosition(ctx.symbol),
    incomplete: ctx.getText() === '',
    quoted: false,
  };
  const node = Builder.expression.column(
    { args: [Builder.identifier({ name: '*' }, parserFields)] },
    parserFields
  );

  node.name = text;

  return node;
}

export function createColumn(ctx: ParserRuleContext): ESQLColumn {
  const args: ESQLColumn['args'] = [];

  if (ctx instanceof QualifiedNamePatternContext) {
    const list = ctx.identifierPattern_list();

    for (const identifierPattern of list) {
      const ID_PATTERN = identifierPattern.ID_PATTERN();

      if (ID_PATTERN) {
        const name = parseIdentifier(ID_PATTERN.getText());
        const node = Builder.identifier({ name }, createParserFields(identifierPattern));

        args.push(node);
      } else {
        const parameter = createParam(identifierPattern.parameter());

        if (parameter) {
          args.push(parameter);
        }
      }
    }
  } else if (ctx instanceof QualifiedNameContext) {
    const list = ctx.identifierOrParameter_list();

    for (const item of list) {
      if (item instanceof IdentifierOrParameterContext) {
        const node = createIdentifierOrParam(item);

        if (node) {
          args.push(node);
        }
      }
    }
  } else {
    const name = sanitizeIdentifierString(ctx);
    const node = Builder.identifier({ name }, createParserFields(ctx));

    args.push(node);
  }

  const text = sanitizeIdentifierString(ctx);
  const hasQuotes = Boolean(getQuotedText(ctx) || isQuoted(ctx.getText()));
  const column = Builder.expression.column(
    { args },
    {
      text: ctx.getText(),
      location: getPosition(ctx.start, ctx.stop),
      incomplete: Boolean(ctx.exception || text === ''),
    }
  );

  column.name = text;
  column.quoted = hasQuotes;

  return column;
}

export function createOption(name: string, ctx: ParserRuleContext): ESQLCommandOption {
  return {
    type: 'option',
    name,
    text: ctx.getText(),
    location: getPosition(ctx.start, ctx.stop),
    args: [],
    incomplete: Boolean(
      ctx.exception ||
        ctx.children?.some((c) => {
          // @ts-expect-error not exposed in type but exists see https://github.com/antlr/antlr4/blob/v4.11.1/runtime/JavaScript/src/antlr4/tree/ErrorNodeImpl.js#L19
          return Boolean(c.isErrorNode);
        })
    ),
  };
}

export function createUnknownItem(ctx: ParserRuleContext): ESQLUnknownItem {
  return {
    type: 'unknown',
    name: 'unknown',
    text: ctx.getText(),
    location: getPosition(ctx.start, ctx.stop),
    incomplete: Boolean(ctx.exception),
  };
}

export function createError(exception: RecognitionException) {
  const token = exception.offendingToken;

  return {
    type: 'error' as const,
    text: `SyntaxError: ${exception.message}`,
    location: getPosition(token),
  };
}
