"use strict";
var TokenKind;
(function (TokenKind) {
    TokenKind[TokenKind["Comma"] = 0] = "Comma";
    TokenKind[TokenKind["Paren"] = 1] = "Paren";
    TokenKind[TokenKind["Pipe"] = 2] = "Pipe";
    TokenKind[TokenKind["Op"] = 3] = "Op";
    TokenKind[TokenKind["Func"] = 4] = "Func";
    TokenKind[TokenKind["Number"] = 5] = "Number";
    TokenKind[TokenKind["Var"] = 6] = "Var";
})(TokenKind || (TokenKind = {}));
const comma_regex = /^,/;
const parens_regex = /^[()]/;
const pipe_regex = /^\|/;
const op_regex = /^[+*-/^=]|^\\max|^\\min/;
const func_regex = /^(\\sqrt|\\sin|\\cos|\\tan|\\arcsin|\\arccos|\\arctan|\\repr|\\{sign}|\\{mod}|\\{ceil}|\\{floor}|\\{round})/;
const num_regex = /^(\d+)(\.\d+)?/;
const id_regex = /^[a-zA-Z]'*/;
function consume_token(reader) {
    if (reader.lk == undefined)
        return;
    reader.source = reader.source
        .slice(reader.lk.advance)
        .replace(/^\s+/, '');
}
function peek_token(reader) {
    const text = reader.source;
    const tokens_list = [
        [comma_regex, TokenKind.Comma],
        [parens_regex, TokenKind.Paren],
        [pipe_regex, TokenKind.Pipe],
        [op_regex, TokenKind.Op],
        [func_regex, TokenKind.Func],
        [num_regex, TokenKind.Number],
        [id_regex, TokenKind.Var],
    ];
    for (const [re, kind] of tokens_list) {
        const match = re.exec(text);
        if (match) {
            const tk = {
                kind,
                val: match[0],
                advance: match[0].length
            };
            reader.lk = tk;
            return tk;
        }
    }
    return null;
}
const operator = {
    '=': { prec: 1, right: true },
    '+': { prec: 2, right: false },
    '-': { prec: 2, right: false },
    '*': { prec: 3, right: false },
    '/': { prec: 3, right: false },
    '^': { prec: 4, right: false },
    '\\max': { prec: 5, right: false },
    '\\min': { prec: 5, right: false },
};
function parse_binary(reader, lhs, min_prec) {
    let lk = peek_token(reader);
    while (lk && lk.kind == TokenKind.Op && operator[lk.val].prec >= min_prec) {
        let op = lk.val;
        consume_token(reader);
        let rhs = parse_primary(reader);
        if (typeof rhs == 'string') {
            return rhs;
        }
        lk = peek_token(reader);
        while (lk && lk.kind == TokenKind.Op && (operator[lk.val].prec > operator[op].prec || (operator[lk.val].right && operator[lk.val].prec == operator[op].prec))) {
            rhs = parse_binary(reader, rhs, operator[lk.val].prec);
            if (typeof rhs == 'string') {
                return rhs;
            }
            lk = peek_token(reader);
        }
        lhs = { kind: TokenKind.Op, op: op, lhs: lhs, rhs: rhs };
    }
    return lhs;
}
function parse_primary(reader) {
    let tk = peek_token(reader);
    if (!tk) {
        return `Unexpected token or end of input parsing primary expression: "${reader.source}"`;
    }
    if (tk.kind == TokenKind.Func) {
        consume_token(reader);
        const lhs = parse_primary(reader);
        if (typeof lhs == 'string') {
            return lhs;
        }
        return { kind: TokenKind.Op, op: tk.val, lhs: lhs };
    }
    if (tk.kind == TokenKind.Op && tk.val == '-') {
        consume_token(reader);
        const lhs = parse_primary(reader);
        if (typeof lhs == 'string') {
            return lhs;
        }
        return { kind: TokenKind.Op, op: 'neg', lhs: lhs };
    }
    if (tk.kind == TokenKind.Paren && tk.val == '(') {
        return parse_paren(reader);
    }
    if (tk.kind == TokenKind.Pipe) {
        consume_token(reader);
        let lhs = parse_expression(reader);
        if (typeof lhs == 'string') {
            return lhs;
        }
        tk = peek_token(reader);
        if (tk && tk.kind == TokenKind.Pipe) {
            consume_token(reader);
            return { kind: TokenKind.Op, op: 'abs', lhs: lhs };
        }
        return "Expected `|`";
    }
    if (tk.kind != TokenKind.Number && tk.kind != TokenKind.Var) {
        return "Invalid Expression, expected number or var";
    }
    consume_token(reader);
    let lhs = tk.kind == TokenKind.Number ?
        { kind: TokenKind.Number, val: parseFloat(tk.val) }
        : { kind: TokenKind.Var, val: tk.val };
    tk = peek_token(reader);
    if (tk && tk.kind == TokenKind.Func) {
        consume_token(reader);
        const other_lhs = parse_primary(reader);
        if (typeof other_lhs == 'string') {
            return other_lhs;
        }
        const rhs = { kind: TokenKind.Op, op: tk.val, lhs: other_lhs };
        lhs = { kind: TokenKind.Op, op: '*', lhs: lhs, rhs: rhs };
    }
    else
        while (tk && tk.kind == TokenKind.Paren && tk.val == '(') {
            const rhs = parse_paren(reader);
            if (typeof rhs == 'string') {
                return rhs;
            }
            lhs = { kind: TokenKind.Op, op: '*', lhs: lhs, rhs: rhs };
            tk = peek_token(reader);
        }
    return lhs;
}
function parse_paren(reader) {
    consume_token(reader);
    let lhs = parse_expression(reader);
    if (typeof lhs == 'string') {
        return lhs;
    }
    let tk = peek_token(reader);
    if (tk && tk.kind == TokenKind.Comma) {
        consume_token(reader);
        let rhs = parse_expression(reader);
        if (typeof rhs == 'string') {
            return rhs;
        }
        lhs = { kind: TokenKind.Op, op: 'vector', lhs: lhs, rhs: rhs };
        tk = peek_token(reader);
        if (!tk) {
            return "Expected `)`";
        }
    }
    if (tk && tk.kind == TokenKind.Paren && tk.val == ')') {
        consume_token(reader);
        return lhs;
    }
    return "Expected `,` or `)`";
}
function parse_expression(reader) {
    const first = parse_primary(reader);
    if (typeof first == 'string') {
        return first;
    }
    const result = parse_binary(reader, first, 0);
    return result;
}
function parse_definition(reader) {
    let expr = parse_expression(reader);
    consume_token(reader);
    let origin = null;
    if (reader.source.startsWith('{from}')) {
        reader.source = reader.source.slice(6);
        origin = parse_expression(reader);
    }
    else if (reader.source != '') {
        return "Unexpected end of input";
    }
    if (typeof expr == 'string')
        return expr;
    if (typeof origin == 'string')
        return origin;
    return { expr: expr, origin: origin };
}
class Num {
    constructor(n, un = '') {
        this.n = n;
        this.un = un;
    }
    add(b) {
        if (!(b instanceof Num))
            return undefined;
        return new Num(this.n + b.n);
    }
    sub(b) {
        if (!(b instanceof Num))
            return undefined;
        return new Num(this.n - b.n);
    }
    mul(b) {
        if (b instanceof Vec)
            return new Vec(this.n * b.x, this.n * b.y);
        return new Num(this.n * b.n);
    }
    div(b) {
        if (b instanceof Vec)
            return undefined;
        return new Num(this.n / b.n);
    }
    abs() {
        return new Num(Math.abs(this.n));
    }
    neg() {
        return new Num(-this.n);
    }
}
class Vec {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    add(b) {
        if (!(b instanceof Vec))
            return undefined;
        return new Vec(this.x + b.x, this.y + b.y);
    }
    sub(b) {
        if (!(b instanceof Vec))
            return undefined;
        return new Vec(this.x - b.x, this.y - b.y);
    }
    mul(b) {
        if (b instanceof Num)
            return new Vec(this.x * b.n, this.y * b.n);
        return new Num(this.x * b.x + this.y * b.y);
    }
    div(b) {
        if (b instanceof Num)
            return new Vec(this.x / b.n, this.y / b.n);
        return undefined;
    }
    abs() {
        return new Num(Math.hypot(this.x, this.y));
    }
    neg() {
        return new Vec(-this.x, -this.y);
    }
}
function mapf(obj, f, n) {
    if (obj instanceof Vec)
        return new Vec(f(obj.x, n.n), f(obj.y, n.n));
    return new Num(f(obj.n, n.n));
}
function applyf(obj, f) {
    if (obj instanceof Vec)
        return new Vec(f(obj.x), f(obj.y));
    return new Num(f(obj.n));
}
function get_val(id, env) {
    if (!(id in env))
        return undefined;
    const obj = env[id];
    if (obj.val)
        return obj.val;
    let result;
    if (typeof obj.func == 'function') {
        result = obj.func();
    }
    else {
        result = execute_ast(obj.func, env);
    }
    obj.val = result;
    return result;
}
// TODO fix these things
// function get_repr(ast, env) {
//     if (!ast || ast.kind != 'id') return execute_ast(ast, env);
//     else {
//         let origin = get_origin(ast.val, env);
//         let val = get_val(env, ast.val);
//         //if (val instanceof Vec) lhs = lhs.add(val);
//         //else return undefined;
//         return undefined;
//     }
// }
// function get_origin(id, env) {
//     if (!(id in env)) return new Vec(0, 0);
//     if (env[id].val_origin) return env[id].val_origin;
//     if (!env[id].origin) return new Vec(0, 0);
//     let origin = get_repr(env[id].origin, env);
//     let value = execute_ast(env[id].func, env);
//     env[id].origin_val = value;
//     return value;
// }
function execute_ast(ast, env) {
    if (ast == undefined)
        return undefined;
    if (ast.kind == TokenKind.Op) {
        let lhs;
        let rhs;
        const op = ast.op[0] == '\\' ? ast.op.slice(1) : ast.op;
        switch (op) {
            case '+':
                lhs = execute_ast(ast.lhs, env);
                rhs = execute_ast(ast.rhs, env);
                if (lhs == undefined || rhs == undefined)
                    return undefined;
                return lhs.add(rhs);
            case '-':
                lhs = execute_ast(ast.lhs, env);
                rhs = execute_ast(ast.rhs, env);
                if (lhs == undefined || rhs == undefined)
                    return undefined;
                return lhs.sub(rhs);
            case '*':
                lhs = execute_ast(ast.lhs, env);
                rhs = execute_ast(ast.rhs, env);
                if (lhs == undefined || rhs == undefined)
                    return undefined;
                return lhs.mul(rhs);
            case '^':
                lhs = execute_ast(ast.lhs, env);
                rhs = execute_ast(ast.rhs, env);
                if (lhs == undefined || rhs == undefined)
                    return undefined;
                if (!(lhs instanceof Num && rhs instanceof Num))
                    return undefined;
                return new Num(lhs.n ** rhs.n);
            case '/':
                lhs = execute_ast(ast.lhs, env);
                rhs = execute_ast(ast.rhs, env);
                if (lhs == undefined || rhs == undefined)
                    return undefined;
                return lhs.div(rhs);
            case 'abs':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined)
                    return undefined;
                return lhs.abs();
            case 'neg':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined)
                    return undefined;
                return lhs.neg();
            case 'sqrt':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined)
                    return undefined;
                if (!(lhs instanceof Num))
                    return undefined;
                return new Num(Math.sqrt(lhs.n));
            case 'sin':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined)
                    return undefined;
                if (!(lhs instanceof Num))
                    return undefined;
                return new Num(Math.sin(lhs.n));
            case 'cos':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined)
                    return undefined;
                if (!(lhs instanceof Num))
                    return undefined;
                return new Num(Math.cos(lhs.n));
            case 'tan':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined)
                    return undefined;
                if (!(lhs instanceof Num))
                    return undefined;
                return new Num(Math.tan(lhs.n));
            case 'arcsin':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined)
                    return undefined;
                if (!(lhs instanceof Num))
                    return undefined;
                return new Num(Math.asin(lhs.n), 'rad');
            case 'arccos':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined)
                    return undefined;
                if (!(lhs instanceof Num))
                    return undefined;
                return new Num(Math.acos(lhs.n), 'rad');
            case 'arctan':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined)
                    return undefined;
                if (!(lhs instanceof Num))
                    return undefined;
                return new Num(Math.atan(lhs.n), 'rad');
            case 'max':
                lhs = execute_ast(ast.lhs, env);
                rhs = execute_ast(ast.rhs, env);
                if (lhs == undefined || !(rhs instanceof Num))
                    return undefined;
                return mapf(lhs, Math.max, rhs);
            case 'min':
                lhs = execute_ast(ast.lhs, env);
                rhs = execute_ast(ast.rhs, env);
                if (lhs == undefined || !(rhs instanceof Num))
                    return undefined;
                return mapf(lhs, Math.min, rhs);
            case '{ceil}':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined)
                    return undefined;
                return applyf(lhs, Math.ceil);
            case '{sign}':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined)
                    return undefined;
                return applyf(lhs, Math.sign);
            case '{floor}':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined)
                    return undefined;
                return applyf(lhs, Math.floor);
            case '{round}':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined)
                    return undefined;
                return applyf(lhs, Math.round);
            case 'vector':
                lhs = execute_ast(ast.lhs, env);
                rhs = execute_ast(ast.rhs, env);
                if (lhs == undefined || rhs == undefined)
                    return undefined;
                if (!(lhs instanceof Num && rhs instanceof Num))
                    return undefined;
                return new Vec(lhs.n, rhs.n);
            // TODO fix this thing
            // case 'repr':
            //     if (!ast.lhs || ast.lhs.kind != 'id') lhs = execute_ast(ast.lhs, env);
            //     else {
            //         lhs = get_origin(ast.lhs.val, env);
            //         let val = execute_ast(ast.lhs, env);
            //         if (val instanceof Vec) lhs = lhs.add(val);
            //         else return undefined;
            //     }
            //     // if (!(lhs instanceof Num && rhs instanceof Num)) return undefined;
            //     return lhs;
            case '=': break;
        }
    }
    else if (ast.kind == TokenKind.Number) {
        return new Num(ast.val);
    }
    else if (ast.kind == TokenKind.Var) {
        return get_val(ast.val, env);
    }
}
//# sourceMappingURL=parser.js.map