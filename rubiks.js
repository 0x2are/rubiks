//Author: Nick Dean

class Quaternion {
  constructor(w = 1, i = 0, j = 0, k = 0) {
    this.w = w;
    this.i = i;
    this.j = j;
    this.k = k;
  }

  
  static fromAxisAngle([x, y, z], angle) {
    const h = angle/2;
    const s = Math.sin(h);

    return new Quaternion(Math.cos(h), x*s, y*s, z*s);
  }


  static mult(q1, q2) {
    const v1 = createVector(q1.i, q1.j, q1.k);
    const v2 = createVector(q2.i, q2.j, q2.k);
    
    const v = p5.Vector.mult(v2, q1.w);
    v.add(p5.Vector.mult(v1, q2.w));
    v.add(p5.Vector.cross(v1, v2));
    
    return new Quaternion(
      q1.w*q2.w - p5.Vector.dot(v1, v2),
      v.x,
      v.y,
      v.z
    );
  }


  magnitude() {
    const {w,i,j,k} = this;
    return Math.sqrt(w*w + i*i + j*j + k*k);
  }


  normalise() {
    const mag = this.magnitude();

    this.w /= mag;
    this.i /= mag;
    this.j /= mag;
    this.k /= mag;
  }


  axisAngle() {
    const angle = 2 * Math.acos(this.w);
    const s = Math.sin(angle/2);
    const axis = createVector(1, 0, 0);

    if (s != 0) {
      axis.x = this.i / s;
      axis.y = this.j / s,
      axis.z = this.k / s;
    }

    return {axis, angle};
  }
}


class Cube {
  constructor(x, y, z) {
    this.xPos = x;
    this.yPos = y;
    this.zPos = z;

    this.rot = new Quaternion();
    
    //set the face colours. All inside colours are black
    //needs to be reset when piece assigned new position in cube
    this.calculateColours();
  }

  draw() {
    const hSize = boxSize / 2;

    push();
    const {axis, angle} = this.rot.axisAngle();
    rotate(angle, axis);

    //draw the outline
    strokeWeight(3);
    noFill();
    box(boxSize);
    strokeWeight(0);

    //draw the faces
    //front face
    push();
    translate(0, 0, hSize);

    fill(this.frontColour);
    plane(boxSize);
    pop();

    //right face
    push();
    rotateY(HALF_PI);
    translate(0, 0, hSize);

    fill(this.rightColour);
    plane(boxSize);
    pop();

    //back face
    push();
    rotateY(PI);
    translate(0, 0, hSize);

    fill(this.backColour);
    plane(boxSize);
    pop();

    //left face
    push();
    rotateY(3*HALF_PI);
    translate(0, 0, hSize);

    fill(this.leftColour);
    plane(boxSize);
    pop();

    //top then bottom face
    push();
    translate(0, -hSize, 0);
    rotateX(HALF_PI);
    fill(this.topColour);
    plane(boxSize);

    translate(0,0,-boxSize);
    fill(this.bottomColour);
    plane(boxSize);
    pop();

    pop();
  }


  calculateColours() {
    this.leftColour =   GREEN;
    this.topColour =    WHITE;
    this.backColour =   ORANGE;
    this.rightColour =  BLUE;
    this.bottomColour = YELLOW;
    this.frontColour =  RED;
  }
}


const WHITE  =  [255,255,255];
const YELLOW =  [255,255,0  ];
const ORANGE =  [255,128,0  ];
const MAGENTA = [255,0  ,255];
const RED    =  [255,0  ,0  ];
const GREEN  =  [0  ,255,0  ];
const BLUE   =  [0  ,0  ,255];
const BLACK  =  [0  ,0  ,0  ];
const HALF_PI = Math.PI / 2;

const cubeSize  = 3;   //number of cubes
const boxSize   = 48;  //size of each cube
const spacing   = 8;   //spacing between cubes
const qTurnTime = 256; //time in ms for a quarter turn

//quaternions to represent 90deg rotations along each axis
const xQuat = Quaternion.fromAxisAngle([1,0,0], HALF_PI);
const yQuat = Quaternion.fromAxisAngle([0,1,0], HALF_PI);
const zQuat = Quaternion.fromAxisAngle([0,0,1], HALF_PI);

const cubes = [];
const shift = -0.5 * (boxSize + spacing) * (cubeSize - 1);
const m = boxSize + spacing;

let selectedAxis  = 0; //axis of the cube to rotate
let selectedIndex = 0; //currently selected layer on the selected axis
let turnAnimStartTime = 0; //time that selected layer started turning

//tracks the number of rotations to apply and remaining number of turn animations
let turnCounter = 0; 


function setup() {
  const canvas = createCanvas(1280, 720, WEBGL);
  canvas.parent("p5-holder");
  
  //initialise the cubes
  for (let z = 0; z < cubeSize; ++z) {
    for (let y = 0; y < cubeSize; ++y) {
      for (let x = 0; x < cubeSize; ++x) {
        //don't generate cubes that are completely inside
        if (
          z === 0 || z === cubeSize - 1 ||
          x === 0 || x === cubeSize - 1 ||
          y === 0 || y === cubeSize - 1
        ) {
          cubes.push(new Cube(x, y, z));
        }

      }
    }
  }
}


function draw() {
  background(42,40,45);
  orbitControl();
  
  for (const c of cubes) {  
    push();
    
    if (turnCounter > 0 && isCubeSelected(c)) {
      rotateAnim();
    }

    //translate for each cube's position within the 
    //main cube, and shift all of them so that the cube is
    //centered on the origin
    translate(
      c.xPos * m + shift,
      c.yPos * m + shift,
      c.zPos * m + shift
    );

    //change stroke colour for selected cubes
    isCubeSelected(c) ? stroke(255,0,255) : stroke(BLACK);

    //draw the box
    c.draw();
    pop();
  }
}


function keyPressed() {
  //if selected index or axis is changed, apply all rotations
  switch(keyCode) {
    case DOWN_ARROW:
      applyAllRotations();
      selectedIndex = (selectedIndex + 1) % cubeSize;
      break;
    
    case UP_ARROW:
      applyAllRotations();
      --selectedIndex;
      if (selectedIndex < 0) {
        selectedIndex = cubeSize - 1;
      }
      break;

    case RIGHT_ARROW:
      applyAllRotations();
      --selectedAxis;      
      if (selectedAxis < 0) {
        selectedAxis = 2;
      }
      break;
    
    case LEFT_ARROW:
      applyAllRotations();
      selectedAxis = (selectedAxis + 1) % 3;
      break;

    case (' ').charCodeAt(0):
      if (turnCounter === 0) {
        turnAnimStartTime = millis();
      }
      ++turnCounter;

      //draw debug info
      
      break;
  }
}


function isRCubeSolved() {
  let test = null;
  let testAngle = 0;
  let ans = true;

  for (const c of cubes) {
    let {axis, angle} = c.rot.axisAngle();

    angle %= TWO_PI;
    axis.normalize();

    if (test == null) {
      test = axis;
      testAngle = angle;
    }
    else {
      const same = test.x == axis.x &&
                   test.y == axis.y &&
                   test.z == axis.z;

      //due to floating point rounding error,
      //the angles may me slightly different
      const sameAngle = angle - testAngle < 0.01;

      if (!(same && sameAngle)) {
        ans = false;
      }
    }
  }

  return ans;
}


function isCubeSelected({xPos, yPos, zPos}) {
  return [xPos, yPos, zPos][selectedAxis] === selectedIndex;
}


//perform the rotation for the animation of the active layer spinning
function rotateAnim() {
  //rotate for the rotation animation
  const elapsedTurnTime = millis() - turnAnimStartTime;
  
  if (elapsedTurnTime >= turnCounter * qTurnTime) {
    applyAllRotations();
  }
  else {
    //amount the layer should be turned by in radians
    const turnAmount = elapsedTurnTime / qTurnTime * HALF_PI;
    //call the appropriate rotation function based on the selected axis
    [rotateX, rotateY, rotateZ][selectedAxis](turnAmount);
  }
}


//applies turn counter rotations to the current selected layer
function applyAllRotations() {
  const rotCoords = (x, y) => {
    return [(cubeSize - 1) - y, x];
  }

  const selectedCubes = cubes.filter(isCubeSelected);

  while (turnCounter > 0) {
    --turnCounter;

    selectedCubes.forEach(c => {
      switch(selectedAxis) {
        case 0: //x
          [c.yPos, c.zPos] = rotCoords(c.yPos, c.zPos);
          c.rot = Quaternion.mult(xQuat, c.rot);
          break;

        case 1: //y
          [c.zPos, c.xPos] = rotCoords(c.zPos, c.xPos);
          c.rot = Quaternion.mult(yQuat, c.rot);
          break;

        case 2: //z
          [c.xPos, c.yPos] = rotCoords(c.xPos, c.yPos);
          c.rot = Quaternion.mult(zQuat, c.rot);
          break;
      }
    });
  }
}


//randomly changes the selected axis and layer and 
//sets turn counter from 0 to 3. Then runs apply all
//rotations. Does the whole process n times
function scrambleRCube(n = 42) {
  for (let i = 0; i < n; ++i) {
    selectedAxis = Math.floor(Math.random() * 4);
    selectedIndex = Math.floor(Math.random() * cubeSize + 1);
    turnCounter = Math.floor(Math.random() * 4);

    applyAllRotations();
  }
}



function resetRCube() {

}