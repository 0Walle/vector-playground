const step = 80;

const colors = [
    "#dc322f",
    "#859900",
    '#b58900',
    '#cb4b16',
    '#d33682',
    '#6c71c4',
    '#268bd2',
    '#2aa198',
]

function Vector(x, y) {
    return {
        kind: 'vector',
        x1: 0,
        y1: 0,
        x2: x,
        y2: y,
        color: 0,
    }
}

function Point(x, y) {
    return {
        kind: 'point',
        x1: x,
        y1: y,
        color: 0,
    }
}

function draw_arrow(ctx, x1, y1, _x2, _y2) {
    if (_x2 == 0 && _y2 == 0) {
        ctx.beginPath();
        ctx.arc(x1, y1, 6, 0, 2 * Math.PI);
        ctx.fill();    
        return;
    };
    const x2 = x1 + _x2;
    const y2 = y1 + _y2;
    const headlen = 15;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    const PI6 = Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - Math.cos(angle) * 10, y2 - Math.sin(angle) * 10);
    ctx.stroke();
    ctx.moveTo(x2 - headlen * Math.cos(angle - PI6), y2 - headlen * Math.sin(angle - PI6));
    ctx.lineTo(x2 - headlen * Math.cos(angle + PI6), y2 - headlen * Math.sin(angle + PI6));
    ctx.lineTo(x2, y2);
    ctx.fill();
}

function snap(val) {
    return Math.abs(Math.round(val) - val) < 0.1 ? Math.round(val) : val;
}

function snap2(val1, val2) {
    let sx = Math.abs(Math.round(val1) - val1) < 0.1;
    let sy = Math.abs(Math.round(val2) - val2) < 0.1;
    return sx && sy ? [Math.round(val1),Math.round(val2)] : [val1, val2];
}