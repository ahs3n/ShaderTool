import { setEditorValue, setupEditor } from './editor'

const canvas: HTMLCanvasElement|null = document.getElementById('canvas') as HTMLCanvasElement;
if (!canvas) {
    throw new Error();
}
const glOrNull: WebGLRenderingContext | null = canvas.getContext('webgl');
let gl: WebGLRenderingContext;

if (!glOrNull) {
    window.alert("Failed to initialize WebGL");
    throw new Error();
} else {
    gl = glOrNull;
}

class ShaderInfo {
    constructor(
        image: string,
        bufferA: string = "",
        bufferB: string = "",
        bufferC: string = "",
        bufferD: string = "",
    ) {
        this.image = image;
        this.bufferA = bufferA;
        this.bufferB = bufferB;
        this.bufferC = bufferC;
        this.bufferD = bufferD;
    }

    image: string;
    bufferA: string;
    bufferB: string;
    bufferC: string;
    bufferD: string;
}

class Uniforms {
    iResolution;           // viewport resolution (in pixels)
    iTime;                 // shader playback time (in seconds)
    iTimeDelta;            // render time (in seconds)
    iFrameRate;            // shader frame rate
    iFrame;                // shader playback frame
    // iChannelTime[4];       // channel playback time (in seconds)
    // iChannelResolution[4]; // channel resolution (in pixels)
    iMouse;                // mouse pixel coords. xy: current (if MLB down), zw: click
    // iChannel0..3;          // input channel. XX = 2D/Cube
    iDate;                 // (year, month, day, time in seconds)
}

const baseFragmentShader = `
#ifdef GL_ES
    precision highp float;
#endif

uniform vec3      iResolution;           // viewport resolution (in pixels)
uniform float     iTime;                 // shader playback time (in seconds)
uniform float     iTimeDelta;            // render time (in seconds)
uniform float     iFrameRate;            // shader frame rate
uniform int       iFrame;                // shader playback frame
// uniform float     iChannelTime[4];       // channel playback time (in seconds)
// uniform vec3      iChannelResolution[4]; // channel resolution (in pixels)
uniform vec4      iMouse;                // mouse pixel coords. xy: current (if MLB down), zw: click
// uniform samplerXX iChannel0..3;          // input channel. XX = 2D/Cube
// uniform vec4      iDate;                 // (year, month, day, time in seconds)

/* INSERT SHADER SOURCE HERE */

void main() {
    mainImage(gl_FragColor, vec2(gl_FragCoord));
    gl_FragColor.a = 1.0;
}
`;

class Renderer {
    constructor(shaders: ShaderInfo) {
        const vertexArray = new Float32Array([
            -1, -1,
             1, -1,
             1,  1,
            -1,  1
        ]);

        this.fullscreenQuadVAO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.fullscreenQuadVAO);
        gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);

        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(
            0, 2, gl.FLOAT, false, 0, 0
        )

        let vert = gl.createShader(gl.VERTEX_SHADER);

        if (!vert) {
            throw new Error();
        }
        this.vertexShader = vert;

        let vertSource = `
#ifdef GL_ES
    precision highp float;
#endif

attribute vec2 aPos_ndc;

void main() {
    gl_Position = vec4(aPos_ndc, 0.0, 1.0);
}
`;
        if (!vertSource) {
            throw new Error();
        }

        gl.shaderSource(this.vertexShader, vertSource);
        gl.compileShader(this.vertexShader);

        // vertex shader is ready to go
        this.compile_image(shaders.image);
    }

    draw() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.fullscreenQuadVAO);

        this.uniform3F(this.prg_Image, "iResolution", uniforms.iResolution);
        this.uniformF(this.prg_Image, "iTime", uniforms.iTime);
        this.uniformF(this.prg_Image, "iTimeDelta", uniforms.iTimeDelta);
        this.uniformF(this.prg_Image, "iFrameRate", uniforms.iFrameRate);
        this.uniformI(this.prg_Image, "iFrame", uniforms.iFrame);

        this.uniform4F(this.prg_Image, "iMouse", uniforms.iMouse);

        // uniform vec3      iResolution;           // viewport resolution (in pixels)
        // uniform float     iTime;                 // shader playback time (in seconds)
        // uniform float     iTimeDelta;            // render time (in seconds)
        // uniform float     iFrameRate;            // shader frame rate
        // uniform int       iFrame;                // shader playback frame
        // uniform float     iChannelTime[4];       // channel playback time (in seconds)
        // uniform vec3      iChannelResolution[4]; // channel resolution (in pixels)
        // uniform vec4      iMouse;                // mouse pixel coords. xy: current (if MLB down), zw: click
        // uniform samplerXX iChannel0..3;          // input channel. XX = 2D/Cube
        // uniform vec4      iDate;                 // (year, month, day, time in seconds)

        
        gl.useProgram(this.prg_Image);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }

    compile_image(source: string) {
        console.log("compile_image");
        
        let finalSource = baseFragmentShader.replace("/* INSERT SHADER SOURCE HERE */", source);
        let imageShader = gl.createShader(gl.FRAGMENT_SHADER);

        if (!imageShader) {
            throw new Error();
        }

        gl.shaderSource(imageShader, finalSource);
        gl.compileShader(imageShader);
        
        gl.deleteProgram(this.prg_Image);
        this.prg_Image = gl.createProgram();

        gl.attachShader(this.prg_Image, this.vertexShader);
        gl.attachShader(this.prg_Image, imageShader);

        gl.linkProgram(this.prg_Image);
        gl.useProgram(this.prg_Image);

        gl.bindAttribLocation(this.prg_Image, 0, "aPos_ndc"); 

        return imageShader;
    }

    uniformF(prg: WebGLProgram, name: string, value: number) {
        let loc = gl.getUniformLocation(prg, name);
        if (loc != -1) {
            gl.useProgram(prg);
            gl.uniform1f(loc, value);
        }
    }

    uniform2F(prg: WebGLProgram, name: string, value: [number, number]) {
        let loc = gl.getUniformLocation(prg, name);
        if (loc != -1) {
            gl.useProgram(prg);
            gl.uniform2fv(loc, value);
        }
    }
    
    uniform3F(prg: WebGLProgram, name: string, value: [number, number, number]) {
        let loc = gl.getUniformLocation(prg, name);
        if (loc != -1) {
            gl.useProgram(prg);
            gl.uniform3fv(loc, value);
        }
    }

    uniform4F(prg: WebGLProgram, name: string, value: [number, number, number, number]) {
        let loc = gl.getUniformLocation(prg, name);
        if (loc != -1) {
            gl.useProgram(prg);
            gl.uniform4fv(loc, value);
        }
    }
    
    uniformI(prg: WebGLProgram, name: string, value: number) {
        let loc = gl.getUniformLocation(prg, name);
        if (loc!= -1) {
            gl.useProgram(prg);
            gl.uniform1i(loc, value);
        }
    }

    uniform2I(prg: WebGLProgram, name: string, value: [number, number]) {
        let loc = gl.getUniformLocation(prg, name);
        if (loc!= -1) {
            gl.useProgram(prg);
            gl.uniform2iv(loc, value);
        }
    }
    
    uniform3I(prg: WebGLProgram, name: string, value: [number, number, number]) {
        let loc = gl.getUniformLocation(prg, name);
        if (loc!= -1) {
            gl.useProgram(prg);
            gl.uniform3iv(loc, value);
        }
    }

    fullscreenQuadVAO: WebGLBuffer | null;
    vertexShader: WebGLShader;

    prg_Image: WebGLProgram;
    prg_BufferA: WebGLProgram;
    prg_BufferB: WebGLProgram;
    prg_BufferC: WebGLProgram;
    prg_BufferD: WebGLProgram;
};

function validateNumericInput(event) {
    event.target.value = event.target.value.replace(/[^0-9]/g, '');
}

function numericInputCallback(event, type, callback) {
    console.log(type);
    if (event.target.nodeName == 'TEXTAREA' && type == "input"){
        if (event.target.value.includes("\n")){
            validateNumericInput(event);
            callback();
        }
        validateNumericInput(event);
    } else {
        validateNumericInput(event);
        callback();
    }
}

function nic(e,t,c){
    numericInputCallback(e,t,c);
}

function buttonToggle(event, callback){ // passses toggled on/off into callback
    if (!event.target.pressed){
        event.target.pressed = true;
        event.target.classList.add("buttonPressed");
        callback(true);
    } else {
        event.target.pressed = false;
        event.target.classList.remove("buttonPressed");
        callback(false);
    }
}

let boxes = [
    document.getElementById('advancedBox'),
    document.getElementById('archiveBox'),
    document.getElementById('renderBox')
];
let boxSelectors = [
    document.getElementById('advancedSelect'),
    document.getElementById('archiveSelect'),
    document.getElementById('renderSelect')
];

function boxSwitch(i){
    boxes[i].style.display = boxes[i].style.display=='block'?'none':'block'; 
    boxSelectors[i].children[0].innerHTML = boxes[i].style.display=='block'?'v':'>'; 
        // Should be swapped in favour of system independent, and properly aligned, images
    for (let x = 0; x < 3; x++){
        if (boxes[x] != boxes[i]){
        boxes[x].style.display = 'none';
        boxSelectors[x].children[0].innerHTML = '>';
        }
    }
}

let running: boolean = true;
let tOffset: number = 0;

let shaders: ShaderInfo;
let renderer: Renderer;
let uniforms: Uniforms;

let UI = {
    screen : {
        resX : null,
        resY : null,
        pauseButton : null,
        resetButton : null
    },
    advanced : {
        iTimeMin : null,
        iTimeMax : null,
        iTime : null,
        iTimeLoop : null,
        iFrame : null,
        paintCalls : null,
        frameTimer : null,
    },
    editor : {
        compileButton : null
    }
}

let time: number;
let deltaTime: number;
let frameCount: number = 0;
let averageFPS: number = -1;

function main() {

    UI.screen.resX = document.getElementById("resSelX") as HTMLTextAreaElement;
    UI.screen.resY = document.getElementById("resSelY") as HTMLTextAreaElement;
    UI.screen.resetButton = document.getElementById("resetButton");
    UI.screen.pauseButton = document.getElementById("pauseButton");
    
    UI.advanced.iTimeMin = document.getElementById("iTimeMin");
    UI.advanced.iTimeMax = document.getElementById("iTimeMax");
    UI.advanced.iTime = document.getElementById("iTime");
    UI.advanced.iTimeLoop = document.getElementById("iTimeLoop");
    UI.advanced.iFrame = document.getElementById("iFrame");
    UI.advanced.paintCalls = document.getElementById("paintCalls");
    UI.advanced.frameTimer = document.getElementById("frameTimerToggle")

    UI.editor.compileButton = document.getElementById("compileButton");

    
    boxSelectors[0].addEventListener("click", _ => {boxSwitch(0)});
    boxSelectors[1].addEventListener("click", _ => {boxSwitch(1)});
    boxSelectors[2].addEventListener("click", _ => {boxSwitch(2)});


        // TODO: load shaders from shadertoy
    shaders = new ShaderInfo(`
/* This animation is the material of my first youtube tutorial about creative 
   coding, which is a video in which I try to introduce programmers to GLSL 
   and to the wonderful world of shaders, while also trying to share my recent 
   passion for this community.
                                       Video URL: https://youtu.be/f4s1h2YETNY
*/

//https://iquilezles.org/articles/palettes/
vec3 palette( float t ) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263,0.416,0.557);

    return a + b*cos( 6.28318*(c*t+d) );
}

//https://www.shadertoy.com/view/mtyGWy
void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);
    
    for (float i = 0.0; i < 4.0; i++) {
        uv = fract(uv * 1.5) - 0.5;

        float d = length(uv) * exp(-length(uv0));

        vec3 col = palette(length(uv0) + i*.4 + iTime*.4);

        d = sin(d*8. + iTime)/8.;
        d = abs(d);

        d = pow(0.01 / d, 1.2);

        finalColor += col * d;
    }
        
    fragColor = vec4(finalColor, 1.0);
}
`);
    renderer = new Renderer(shaders);
    uniforms = new Uniforms;

    let start = performance.now() / 1000.0;
    let trueLastTime = start;
    let trueTime: number;

    let fpsCounterElem = document.getElementById("fpsCounter");
    let timeDisplayElem = document.getElementById("iTimeDisplay");
    let animationFrameID: number;
    let loopTime = false;

    setupEditor();
    setEditorValue(shaders.image);

    function cancelAndUpdate(){
        cancelAnimationFrame(animationFrameID);
        if (!running) {
            pauseShader();
            animate();
            pauseShader();
        } else {
            animate();
        }
    }

    function animate() {
        trueTime = performance.now();
        time = performance.now() / 1000.0 - start + tOffset;

        let pCalls = UI.advanced.paintCalls.value;
        if (!pCalls || pCalls < 1) pCalls = 1;
        for (let i = 0; i < pCalls; i++) {
            uniforms.iResolution = [gl.canvas.width, gl.canvas.height, 1.];
            uniforms.iTime = time;
            uniforms.iTimeDelta = deltaTime;
            uniforms.iFrameRate = averageFPS;
            uniforms.iFrame = frameCount;

            uniforms.iMouse = [1,1,1,1];
            // iMouse behaviour:
            // xy: Default to 0,0. when mouse down, current mouse coordinates. When mouse up, last known mouse coordinates
            // zw: Default to 0,0. coordinates of last click. If click was this frame, w is positive, otherwise negative. If mouse is held down, z is positive, otherwise negative
            // inspect in shader by fabrice: https://www.shadertoy.com/view/llySRh


            renderer.draw();
            frameCount++;
        }

        deltaTime = (performance.now() - trueLastTime)/1000.;
        let fps = deltaTime==0?1e5:1.0 / deltaTime;
        globalThis.deltaTime = deltaTime;


        if (averageFPS == -1 || averageFPS == Infinity) {
            averageFPS = fps;
        } else {
            averageFPS = 0.9 * averageFPS + 0.1 * fps;
        }

        fpsCounterElem.innerText = `${averageFPS.toFixed(1)}`;
        timeDisplayElem.innerText = `${time.toFixed(2)}`;
        UI.advanced.iTime.value = (time - iTimeMin) / (iTimeMax - iTimeMin);
        if (loopTime){
            if (time > iTimeMax || time < iTimeMin){
                setTime(iTimeMin);
            }
        }
        UI.advanced.iFrame.placeholder = frameCount;
        UI.advanced.iFrame.value = null;

        trueLastTime = performance.now();

        // console.log("animate");
        // console.log(frameCount - animationFrameID);

        if (running) animationFrameID = requestAnimationFrame(animate);
    }
    animationFrameID = requestAnimationFrame(animate);

    function pauseShader() {
        if (!running) {
            start = performance.now() / 1000.0;
            animationFrameID = requestAnimationFrame(animate);
        } else {
            tOffset = time;
            cancelAnimationFrame(animationFrameID);
        }
        running = !running;
    }
    UI.screen.pauseButton.addEventListener("click", pauseShader);

    function resetShader() {
        start = performance.now() / 1000.0;
        tOffset = loopTime?iTimeMin:0;
        averageFPS = -1;
        frameCount = 0;
        cancelAnimationFrame(animationFrameID);
        animate();
    }
    UI.screen.resetButton.addEventListener("click", resetShader);

    function compileShaders() {
        try {
            let startTime = performance.now();
            renderer.compile_image(shaders.image);
            cancelAndUpdate();
            UI.editor.compileButton.innerText = `| Compiled in ${(performance.now() - startTime).toFixed(1)}ms. |`;
        } catch {
            UI.editor.compileButton.innerText = `| Compile Error |`;
            running = false;
        } finally {
            setTimeout(() => {
                UI.editor.compileButton.innerText = "> compile <";
            }, 1500);
        }
    }
    UI.editor.compileButton.addEventListener("click", compileShaders);
    
    function resizeCanvas() {
        let x: number = parseInt(UI.screen.resX.value);
        let y: number = parseInt(UI.screen.resY.value);
        
        console.log(x, y);
        console.log(UI.screen.resX.value, UI.screen.resY.value);
        
        canvas.width = x;
        canvas.height = y;
        canvas.style.width = `${x}px`;
        canvas.style.height = `${y}px`;
        gl.canvas.width = x;
        gl.canvas.height = y;
        gl.viewport(0,0, x,y);
        
        cancelAndUpdate();
    }

    function setTime(t){
        tOffset = t - performance.now() / 1000.0 + start;
    }

    // globalThis.iTime = UI.advanced.iTime;
    let iTimeMin = 0;
    let iTimeMax = 60;
    UI.advanced.iTimeMin.value = iTimeMin;
    UI.advanced.iTimeMax.value = iTimeMax;
    
    ["input", "focusout"].forEach( t => {
        console.log(t);
        UI.screen.resX.addEventListener(t, (e) => nic(e, t, resizeCanvas));
        UI.screen.resY.addEventListener(t, (e) => nic(e, t, resizeCanvas));

        UI.advanced.iTimeMin.addEventListener(t, (e) => nic(e, t, _ => {
            let x = parseInt(UI.advanced.iTimeMin.value);
            // UI.advanced.iTime.min = x;
            iTimeMin = x;
            UI.advanced.iTime.click();

            console.log("iTime min range:", x);
        }));
        
        UI.advanced.iTimeMax.addEventListener(t, (e) => nic(e, t, _ => {
            let x = parseInt(UI.advanced.iTimeMax.value);
            // UI.advanced.iTime.max = x;
            iTimeMax = x;
            UI.advanced.iTime.click();

            console.log("iTime max range:", x);
        }));
        
        UI.advanced.iFrame.addEventListener(t, (e) => nic(e,t, _ => {
            if (running) pauseShader();
            frameCount = UI.advanced.iFrame.value;
        }));
    });
    
    UI.advanced.iTime.min = 0;
    UI.advanced.iTime.max = 1;
    UI.advanced.iTime.step = 5e-4;
    UI.advanced.iTime.addEventListener("input", _ => {
        let x = iTimeMin + (UI.advanced.iTime.value)*(iTimeMax-iTimeMin); 
            // implementation is correct and thus inverting max and min is allowed
        setTime(x);
        cancelAndUpdate();
    });
    
    UI.advanced.iTimeLoop.addEventListener("click", (e) => {
        buttonToggle(e, (x) => {
            loopTime = x;
        });
    });
    
    UI.advanced.frameTimer.addEventListener("click", (e) => {
        buttonToggle(e, (x) => {
            console.log("toggle frame timer",x?"on":"off");
        });
    });
    
    // for paintcalls, when onchange && mousedown (aka probably used arrow buttons), set paint calls to next PoT (or bitshift existing int)
    // on event, set variable corresponding to event to true, then every frame set both to false. If both are true then both events fired at the same time.
    let pCallsChanged = false, pCallsMUp = false, pCallsLast;
    function updateLoop(){
        if (pCallsChanged && pCallsMUp){ // this implementation is buggy. If you can 1. Notice the bug and 2. figure out a solution, feel free to make a PR with the improvement and a demo of it working
            if (UI.advanced.paintCalls.value > pCallsLast){
                console.log("up");
                UI.advanced.paintCalls.value--;
                UI.advanced.paintCalls.value = Math.pow(2, Math.ceil(Math.log2(UI.advanced.paintCalls.value)));
                UI.advanced.paintCalls.value = UI.advanced.paintCalls.value << 1;
            } else if (UI.advanced.paintCalls.value < pCallsLast){
                console.log("dn");
                UI.advanced.paintCalls.value++;
                UI.advanced.paintCalls.value = Math.pow(2, Math.floor(Math.log2(UI.advanced.paintCalls.value)));
                UI.advanced.paintCalls.value = UI.advanced.paintCalls.value >> 1;
            }
            pCallsLast = UI.advanced.paintCalls.value;
        }
        pCallsChanged = false;
        pCallsMUp = false;
        
        requestAnimationFrame(updateLoop);
    }
    updateLoop();

    UI.advanced.paintCalls.addEventListener("change", _ => {
        pCallsChanged = true;
    });
    UI.advanced.paintCalls.addEventListener("mouseup", _ => {
        pCallsMUp = true;
    });


}

export function updateActiveShader(value: string) {
    shaders.image = value;
}



window.onload = main;
