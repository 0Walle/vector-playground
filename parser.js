"use strict"

const op_regex = /^[+*-/^=]/;
const func_regex = /^(\\sqrt|\\sin|\\cos|\\tan|\\arcsin|\\arccos|\\arctan)/;
const num_regex = /^(\d+)(\.\d+)?/;
const id_regex = /^[a-zA-Z]'*/;

function next_token(source) {
    let match;
    source.source = source.source.trim();

    if (/,/.exec(source.source[0])) return source.source.slice(1);
    if (/[()]/.exec(source.source[0])) return source.source.slice(1);
    if (/\|/.exec(source.source[0])) return source.source.slice(1);

    if (match = op_regex.exec(source.source)) {
        return source.source.slice(match[0].length);
    } else if (match = func_regex.exec(source.source)) {
        return source.source.slice(match[0].length);
    } else if (match = num_regex.exec(source.source)) {
        return source.source.slice(match[0].length);
    } else if (match = id_regex.exec(source.source)) {
        return source.source.slice(match[0].length);
    }
}

function peek_token(source) {
    let match;
    let t = source.source.trim();

    if (match = /,/.exec(t[0])) return {kind: 'comma'}
    if (match = /[()]/.exec(t[0])) return {kind: 'paren', val: match[0]}
    if (match = /\|/.exec(t[0])) return {kind: 'abs'}
    
    if (match = op_regex.exec(t)) {
        return {kind: 'op', val: match[0]};
    } else if (match = func_regex.exec(source.source)) {
        return {kind: 'func', val: match[0].slice(1)};
    } else if (match = num_regex.exec(t)) {
        return {kind: 'number', val: match[0]};
    } else if (match = id_regex.exec(t)) {
        return {kind: 'id', val: match[0]};
    }
}

const operator = {
    '=': {prec: 1, right: true},
    '+': {prec: 2, right: false},
    '-': {prec: 2, right: false},
    '*': {prec: 3, right: false},
    '/': {prec: 3, right: false},
    '^': {prec: 4, right: false},
}

function parse_binary(source, lhs, min_prec) {
    let lk = peek_token(source);
    while (lk && lk.kind == 'op' && operator[lk.val].prec >= min_prec) {
        let op = lk.val;
        source.source = next_token(source);
        let rhs = parse_primary(source);
        lk = peek_token(source);
        while (lk && lk.kind == 'op' && (operator[lk.val].prec > operator[op].prec || (operator[lk.val].right && operator[lk.val].prec == operator[op].prec))) {
            rhs = parse_binary(source, rhs, operator[lk.val].prec)
            lk = peek_token(source);
        }
        lhs = {kind: 'op', op: op, lhs: lhs, rhs: rhs};
    }
    return lhs
}

function parse_primary(source) {
    let tk = peek_token(source);

    if (tk.kind == 'func') {
        source.source = next_token(source);
        let lhs = parse_primary(source);
        return {kind: 'op', op: tk.val, lhs: lhs}
    }

    if (tk.kind == 'op' && tk.val == '-') {
        source.source = next_token(source);
        let lhs = parse_primary(source);
        return {kind: 'op', op: 'neg', lhs: lhs}
    }

    if (tk.kind == 'paren' && tk.val == '(') {
        source.source = next_token(source);
        let lhs = parse_binary(source, parse_primary(source), 0);
        tk = peek_token(source);
        if (tk.kind == 'comma') {
            source.source = next_token(source);
            let rhs = parse_binary(source, parse_primary(source), 0);
            lhs = {kind: 'op', op: 'vector', lhs: lhs, rhs: rhs}
            tk = peek_token(source);
        }
        if (tk.kind == 'paren' && tk.val == ')') {
            source.source = next_token(source);
            return lhs
        }
        throw "Nooo"
    }

    if (tk.kind == 'abs') {
        source.source = next_token(source);
        let lhs = parse_expression(source);
        tk = peek_token(source);
        if (tk.kind == 'abs') {
            source.source = next_token(source);
            return {kind: 'op', op: 'abs', lhs: lhs}
        }
        throw "Nooo"
    }

    if (tk.kind != 'number' && tk.kind != 'id') throw "Não";
    source.source = next_token(source);

    let lhs = tk;

    tk = peek_token(source);

    if (!tk) return lhs;

    if (tk.kind == 'func') {
        source.source = next_token(source);
        let other_lhs = parse_primary(source);
        let rhs = {kind: 'op', op: tk.val, lhs: other_lhs}
        lhs = {kind: 'op', op: '*', lhs: lhs, rhs: rhs}
    } else {
        while (tk && tk.kind == 'paren' && tk.val == '(') {
            let rhs = parse_paren(source)
            lhs = {kind: 'op', op: '*', lhs: lhs, rhs: rhs}

            tk = peek_token(source);
        }
    }
    
    // if (tk.kind == 'paren' && tk.val == '(') {
    //     let rhs = parse_paren(source)
    //     lhs = {kind: 'op', op: '*', lhs: lhs, rhs: rhs}
    //     do {
    //         tk = peek_token(source);
    //         if (!tk) break;

    //         if (tk.kind == 'paren' && tk.val == '(') {
    //             let rhs = parse_paren(source)
    //             lhs = {kind: 'op', op: '*', lhs: lhs, rhs: rhs}
    //         } else break;
    //     } while(true)
    // }

    return lhs;
}

function parse_paren(source) {
    source.source = next_token(source);
    let lhs = parse_binary(source, parse_primary(source), 0);
    let tk = peek_token(source);
    if (tk.kind == 'comma') {
        source.source = next_token(source);
        let rhs = parse_binary(source, parse_primary(source), 0);
        lhs = {kind: 'op', op: 'vector', lhs: lhs, rhs: rhs}
        tk = peek_token(source);
    }
    if (tk.kind == 'paren' && tk.val == ')') {
        source.source = next_token(source);
        return lhs
    }
    throw "Nooo"
}

function parse_expression(source) {
    let result = parse_binary(source, parse_primary(source), 0);
    return result;
}

function parse_definition(source) {
    // console.log('before', source)
    let expr = parse_expression(source)
    source.source = source.source.trim()
    let origin = null;
    if (source.source.startsWith('\\{from}')) {
        source.source = source.source.slice(7);
        source.source = source.source.trim();
        origin = parse_expression(source);
    }
    return {expr: expr, origin: origin};
}

class Num {
    constructor(n, un = null) {
        this.n = n
        this.un = un
    }

    add(b) {
        if (!(b instanceof Num)) return undefined;
        return new Num(this.n + b.n);
    }

    sub(b) {
        if (!(b instanceof Num)) return undefined;
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
        return new Num(Math.abs(this.n))
    }

    neg() {
        return new Num(-this.n)
    }
}

class Vec {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(b) {
        if (!(b instanceof Vec)) return undefined;
        return new Vec(this.x + b.x, this.y + b.y);
    }

    sub(b) {
        if (!(b instanceof Vec)) return undefined;
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
        return new Num(Math.hypot(this.x, this.y))
    }

    neg() {
        return new Vec(-this.x, -this.y);
    }
}

function get_val(env, id) {
    if (!(id in env)) return undefined;
    if (env[id].val) return env[id].val;

    let result;
    if (typeof env[id].func == 'function') {
        result = env[id].func();
    } else {
        result = execute_ast(env[id].func, env);
    }

    env[id].val = result;
    return result;

}

function execute_ast(ast, env) {
    if (ast.kind == 'op') {
        let lhs;
        let rhs;
        switch (ast.op) {
            case '+':
                lhs = execute_ast(ast.lhs, env);
                rhs = execute_ast(ast.rhs, env);
                if (lhs == undefined || rhs == undefined) return undefined;
                return lhs.add(rhs);
            case '-': 
                lhs = execute_ast(ast.lhs, env);
                rhs = execute_ast(ast.rhs, env);
                if (lhs == undefined || rhs == undefined) return undefined;
                return lhs.sub(rhs);
            case '*':
                lhs = execute_ast(ast.lhs, env);
                rhs = execute_ast(ast.rhs, env);
                if (lhs == undefined || rhs == undefined) return undefined;
                return lhs.mul(rhs);
            case '^':
                lhs = execute_ast(ast.lhs, env);
                rhs = execute_ast(ast.rhs, env);
                if (lhs == undefined || rhs == undefined) return undefined;
                if (!(lhs instanceof Num && rhs instanceof Num)) return undefined;
                return new Num(lhs.n ** rhs.n);
            case '/': 
                lhs = execute_ast(ast.lhs, env);
                rhs = execute_ast(ast.rhs, env);
                if (lhs == undefined || rhs == undefined) return undefined;
                return lhs.div(rhs);
            case 'abs':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined) return undefined;
                return lhs.abs();
            case 'neg':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined) return undefined;
                return lhs.neg();
            case 'sqrt':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined) return undefined;
                if (!(lhs instanceof Num)) return undefined;
                return new Num(Math.sqrt(lhs.n));
            case 'sin':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined) return undefined;
                if (!(lhs instanceof Num)) return undefined;
                return new Num(Math.sin(lhs.n));
            case 'cos':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined) return undefined;
                if (!(lhs instanceof Num)) return undefined;
                return new Num(Math.cos(lhs.n));
            case 'tan':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined) return undefined;
                if (!(lhs instanceof Num)) return undefined;
                return new Num(Math.tan(lhs.n));
            case 'arcsin':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined) return undefined;
                if (!(lhs instanceof Num)) return undefined;
                return new Num(Math.asin(lhs.n), 'rad');
            case 'arccos':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined) return undefined;
                if (!(lhs instanceof Num)) return undefined;
                return new Num(Math.acos(lhs.n), 'rad');
            case 'arctan':
                lhs = execute_ast(ast.lhs, env);
                if (lhs == undefined) return undefined;
                if (!(lhs instanceof Num)) return undefined;
                return new Num(Math.atan(lhs.n), 'rad');
            case 'vector':
                lhs = execute_ast(ast.lhs, env);
                rhs = execute_ast(ast.rhs, env);
                if (lhs == undefined || rhs == undefined) return undefined;
                if (!(lhs instanceof Num && rhs instanceof Num)) return undefined;
                return new Vec(lhs.n, rhs.n);
            case '=': break;
        }
    } else if (ast.kind == 'number') {
        return new Num(parseFloat(ast.val));
    } else if (ast.kind == 'id') {
        return get_val(env,ast.val);
    }
}

// let source = `4*A+b*(5)/(c)`;

// console.log(parse_expression({source: source}));