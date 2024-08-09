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
};

const baseFragmentShader = `
#ifdef GL_ES
    precision highp float;
#endif

uniform vec2 iResolution;
uniform float iTime;

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
            -1,  1,

             1,  1,
             1, -1,
            -1,  1,
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

        let vertSource = (document.getElementById("vertex-shader") as HTMLScriptElement)?.firstChild?.nodeValue;
        if (!vertSource) {
            throw new Error();
        }

        gl.shaderSource(this.vertexShader, vertSource);
        gl.compileShader(this.vertexShader);

        // vertex shader is ready to go
        this.compile_image(shaders.image);
    }

    draw(time: number) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.fullscreenQuadVAO);
        this.uniformF(this.prg_Image, "iTime", time);
        gl.useProgram(this.prg_Image);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    compile_image(source: string) {
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
        
        let iResolution = gl.getUniformLocation(this.prg_Image, "iResolution");
        gl.uniform2fv(iResolution, [gl.canvas.width, gl.canvas.height]);

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
    fullscreenQuadVAO: WebGLBuffer | null;
    vertexShader: WebGLShader;

    prg_Image: WebGLProgram;
    prg_BufferA: WebGLProgram;
    prg_BufferB: WebGLProgram;
    prg_BufferC: WebGLProgram;
    prg_BufferD: WebGLProgram;
};

let running: boolean = true;
let tOffset: number = 0;

let pauseShader;
let restartShader;

function main() {
        // TODO: load shaders from STOYAPI
    let shaders = new ShaderInfo(`
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
    let renderer = new Renderer(shaders);

    let start = performance.now() / 1000.0;
    let lastTime = start;
    let averageFPS = -1;
    let time: number;

    let fpsCounterElem = document.getElementById("fpsCounter");
    let timeDisplayElem = document.getElementById("iTimeDisplay");
    let animationFrameID;

    function animate() {
        time = performance.now() / 1000.0 - start + tOffset;

        renderer.draw(time);

        let deltaTime = performance.now() / 1000.0 - lastTime;

        let fps = 1.0 / deltaTime;

        if (averageFPS == -1) {
            averageFPS = fps;
        } else {
            averageFPS = 0.9 * averageFPS + 0.1 * fps;
        }
        fpsCounterElem.innerText = `${averageFPS.toFixed(1)}`;

        timeDisplayElem.innerText = `${time.toFixed(2)}`;

        lastTime = performance.now() / 1000.0;

        if (running) animationFrameID = requestAnimationFrame(animate);
    }
    animationFrameID = requestAnimationFrame(animate);

    pauseShader = function () {
        if (!running) {
            start = performance.now() / 1000.0;
            animationFrameID = requestAnimationFrame(animate);
        } else {
            tOffset = time;
            cancelAnimationFrame(animationFrameID);
        }
        running = !running;
    }

    restartShader = function () {
        start = performance.now() / 1000.0;
        tOffset = 0;
        averageFPS = -1;
        cancelAnimationFrame(animationFrameID);
        animate();
    }
}


window.onload = main;
