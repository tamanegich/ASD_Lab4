const n1 = 4, n2 = 2, n3 = 2, n4 = 4;
const n = 10 + n3;
const seed = Number(`${n1}${n2}${n3}${n4}`);
const k1 = 1.0 - n3 * 0.01 - n4 * 0.01 - 0.3;

const canvas = document.getElementById("graphCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 800;

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

function mulberry32(a) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function generateAdjMatrix(n, k, seed) {
  let rng = mulberry32(seed);
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const val = rng() * 2.0 * k;
      matrix[i][j] = val >= 1.0 ? 1 : 0;
    }
  }
  return matrix;
}

function makeUndirected(matrix) {
  const n = matrix.length;
  const result = matrix.map(row => row.slice());
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (matrix[i][j] === 1 || matrix[j][i] === 1) {
        result[i][j] = 1;
        result[j][i] = 1;
      }
    }
  }
  return result;
}

function generateTrianglePositions(n) {
  const radius = 300;
  const positions = [];

  const corners = [
    [centerX, centerY - radius],
    [centerX - radius * Math.sin(Math.PI / 3), centerY + radius / 2],
    [centerX + radius * Math.sin(Math.PI / 3), centerY + radius / 2],
  ];

  const pointsPerSide = 5;
  const skipIndices = [1];

  for (let side = 0; side < 3; side++) {
    const [x1, y1] = corners[side];
    const [x2, y2] = corners[(side + 1) % 3];

    for (let i = 1; i <= pointsPerSide; i++) {
      if (skipIndices.includes(i)) continue;

      const t = i / pointsPerSide;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      positions.push([x, y]);
    }
  }

  return positions;
}


function drawGraph(matrix, directed, ctx, title) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.font = "20px garamond";
  ctx.fillText(title, 10, 30);

  vertexPositions.forEach(([x, y], i) => {
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, 2 * Math.PI);
    ctx.fillStyle = "rgb(181, 165, 240)";
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "indigo";
    ctx.fillText((i + 1).toString(), x - 5, y + 5);
  });

  const drawnPairs = new Set();

  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix.length; j++) {
      if (matrix[i][j]) {
        const key = `${i},${j}`;
        const reverseKey = `${j},${i}`;
        const [x1, y1] = vertexPositions[i];
        const [x2, y2] = vertexPositions[j];

        if (i === j) {
          // Петля
          drawLoopOutside(ctx, x1, y1, 20, centerX, centerY);
        } else if (directed) {
  				const reverseKey = `${j},${i}`;

  				if (drawnPairs.has(reverseKey)) {
    				// Зворотна — дуга
    				drawCurvedArrow(ctx, x1, y1, x2, y2, true);
  				} else {
    				drawArrow(ctx, x1, y1, x2, y2, true, centerX, centerY);
  				}
				} else {
  				drawArrow(ctx, x1, y1, x2, y2, false, centerX, centerY);
				}
        drawnPairs.add(key);
      }
    }
  }
}

function arePointsClose(x1, y1, x2, y2, eps = 0.1) {
  return Math.abs(x1 - x2) < eps && Math.abs(y1 - y2) < eps;
}

function drawArrow(ctx, x1, y1, x2, y2, isArrow, cx, cy, vertexRadius = 20) {
  if (arePointsClose(x1, y1, x2, y2)) {
    drawLoopOutside(ctx, x1, y1, vertexRadius, cx, cy);
    return;
  }

  const headlen = 10;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);

  const fromX = x1 + vertexRadius * Math.cos(angle);
  const fromY = y1 + vertexRadius * Math.sin(angle);
  const toX = x2 - vertexRadius * Math.cos(angle);
  const toY = y2 - vertexRadius * Math.sin(angle);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  if (isArrow) {
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6),
                toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6),
                toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.lineTo(toX, toY);
    ctx.fill();
  }
}

function drawCurvedArrow(ctx, x1, y1, x2, y2, isArrow, r = 20, curve = 0.2) {
  const angle = Math.atan2(y2 - y1, x2 - x1);

  const fromX = x1 + r * Math.cos(angle);
  const fromY = y1 + r * Math.sin(angle);
  const toX = x2 - r * Math.cos(angle);
  const toY = y2 - r * Math.sin(angle);

  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  const offsetX = -dy / len * len * curve;
  const offsetY = dx / len * len * curve;

  const ctrlX = midX + offsetX;
  const ctrlY = midY + offsetY;

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.quadraticCurveTo(ctrlX, ctrlY, toX, toY);
  ctx.stroke();

  if (isArrow) {
    const endAngle = Math.atan2(toY - ctrlY, toX - ctrlX);
    drawArrowhead(ctx, toX, toY, endAngle);
  }
}



function drawLoopOutside(ctx, x, y, r, cx, cy) {
  const loopRadius = r * 0.6;

  const dx = x - cx;
  const dy = y - cy;
  const baseAngle = Math.atan2(dy, dx);

  const offset = r + loopRadius * 0.6;
  const arcX = x + offset * Math.cos(baseAngle);
  const arcY = y + offset * Math.sin(baseAngle);

  const startAngle = baseAngle + Math.PI * 0.78;
  const endAngle = baseAngle - Math.PI * 0.78;

  ctx.beginPath();
  ctx.arc(arcX, arcY, loopRadius, startAngle, endAngle, true);
  ctx.stroke();

  const arrowX = arcX + loopRadius * Math.cos(endAngle);
  const arrowY = arcY + loopRadius * Math.sin(endAngle);
  const arrowAngle = endAngle - Math.PI / 2;
  drawArrowhead(ctx, arrowX, arrowY, arrowAngle);
}

function drawArrowhead(ctx, x, y, angle) {
  const size = 8;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size / 2);
  ctx.lineTo(-size, size / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function analyzeGraph(matrix, directed) {
  const n = matrix.length;
  const degrees = Array(n).fill(0);
  const inDeg = Array(n).fill(0);
  const outDeg = Array(n).fill(0);
  const isolated = [];
  const hanging = [];

  for (let i = 0; i < n; i++) {
    if (directed) {
      for (let j = 0; j < n; j++) {
        outDeg[i] += matrix[i][j];
        inDeg[i] += matrix[j][i];
      }
      degrees[i] = inDeg[i] + outDeg[i];
    } else {
      degrees[i] = matrix[i].reduce((a, b) => a + b, 0);
    }
  }

  degrees.forEach((d, i) => {
    if (d === 0) isolated.push(i + 1);
    else if (d === 1) hanging.push(i + 1);
  });

  const isRegular = degrees.every(d => d === degrees[0]);

  let text = "";
  text += "Степені: " + degrees.join(", ") + "\n";
  if (directed) {
    text += "Півстепені виходу: " + outDeg.join(", ") + "\n";
    text += "Півстепені заходу: " + inDeg.join(", ") + "\n";
  }
  text += isRegular ? `Граф однорідний, степінь: ${degrees[0]}\n` : "Граф не однорідний\n";
  text += "Ізольовані вершини: " + (isolated.length ? isolated.join(", ") : "немає") + "\n";
  text += "Висячі вершини: " + (hanging.length ? hanging.join(", ") : "немає");

  displayText(directed ? "Характеристики орієнтованого графа" : "Характеристики неорієнтованого графа", text);
}

function displayMatrix(matrix, title) {
  const output = document.getElementById("output");
  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  table.style.marginTop = "20px";

  const caption = document.createElement("caption");
  caption.textContent = title;
  caption.style.fontWeight = "bold";
  table.appendChild(caption);

  matrix.forEach(row => {
    const tr = document.createElement("tr");
    row.forEach(val => {
      const td = document.createElement("td");
      td.textContent = val;
      td.style.border = "1px solid indigo";
      td.style.padding = "4px";
      td.style.textAlign = "center";
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  output.appendChild(table);
}

function displayText(title, data) {
  const output = document.getElementById("output");
  const section = document.createElement("div");
  section.style.marginTop = "10px";

  const heading = document.createElement("h4");
  heading.textContent = title;
  section.appendChild(heading);

  const pre = document.createElement("pre");
  pre.textContent = data;
  section.appendChild(pre);

  output.appendChild(section);
}

function clearOutput() {
  document.getElementById("output").innerHTML = "";
}

const vertexPositions = generateTrianglePositions(12);

const Adir = generateAdjMatrix(n, k1, seed);
const Aundir = makeUndirected(Adir);

function drawDirected() {
  clearOutput();
  drawGraph(Adir, true, ctx, "Орієнтований граф");
  analyzeGraph(Adir, true);
  displayMatrix(Adir, "Матриця суміжності (напрямлений граф)");
}

function drawUndirected() {
  clearOutput();
  drawGraph(Aundir, false, ctx, "Неорієнтований граф");
  analyzeGraph(Aundir, false);
  displayMatrix(Aundir, "Матриця суміжності (ненапрямлений граф)");
}

document.getElementById("btnDirected").onclick = drawDirected;
document.getElementById("btnUndirected").onclick = drawUndirected;

drawDirected();
