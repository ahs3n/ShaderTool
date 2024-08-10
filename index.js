var canvas = document.getElementById('canvas');
if (!canvas) {
    throw new Error();
}
var glOrNull = canvas.getContext('webgl');
var gl;
if (!glOrNull) {
    window.alert("Failed to initialize WebGL");
    throw new Error();
}
else {
    gl = glOrNull;
}
var ShaderInfo = /** @class */ (function () {
    function ShaderInfo(image, bufferA, bufferB, bufferC, bufferD) {
        if (bufferA === void 0) { bufferA = ""; }
        if (bufferB === void 0) { bufferB = ""; }
        if (bufferC === void 0) { bufferC = ""; }
        if (bufferD === void 0) { bufferD = ""; }
        this.image = image;
        this.bufferA = bufferA;
        this.bufferB = bufferB;
        this.bufferC = bufferC;
        this.bufferD = bufferD;
    }
    return ShaderInfo;
}());
;
var baseFragmentShader = "\n#ifdef GL_ES\n    precision highp float;\n#endif\n\nuniform vec2 iResolution;\nuniform float iTime;\n\n/* INSERT SHADER SOURCE HERE */\n\nvoid main() {\n    mainImage(gl_FragColor, vec2(gl_FragCoord));\n    gl_FragColor.a = 1.0;\n}\n";
var Renderer = /** @class */ (function () {
    function Renderer(shaders) {
        var _a, _b;
        var vertexArray = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1,
            1, -1,
            -1, 1,
        ]);
        this.fullscreenQuadVAO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.fullscreenQuadVAO);
        gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        var vert = gl.createShader(gl.VERTEX_SHADER);
        if (!vert) {
            throw new Error();
        }
        this.vertexShader = vert;
        var vertSource = (_b = (_a = document.getElementById("vertex-shader")) === null || _a === void 0 ? void 0 : _a.firstChild) === null || _b === void 0 ? void 0 : _b.nodeValue;
        if (!vertSource) {
            throw new Error();
        }
        gl.shaderSource(this.vertexShader, vertSource);
        gl.compileShader(this.vertexShader);
        // vertex shader is ready to go
        this.compile_image(shaders.image);
    }
    Renderer.prototype.draw = function (time) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.fullscreenQuadVAO);
        this.uniformF(this.prg_Image, "iTime", time);
        gl.useProgram(this.prg_Image);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    Renderer.prototype.compile_image = function (source) {
        var finalSource = baseFragmentShader.replace("/* INSERT SHADER SOURCE HERE */", source);
        var imageShader = gl.createShader(gl.FRAGMENT_SHADER);
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
        var iResolution = gl.getUniformLocation(this.prg_Image, "iResolution");
        gl.uniform2fv(iResolution, [gl.canvas.width, gl.canvas.height]);
        return imageShader;
    };
    Renderer.prototype.uniformF = function (prg, name, value) {
        var loc = gl.getUniformLocation(prg, name);
        if (loc != -1) {
            gl.useProgram(prg);
            gl.uniform1f(loc, value);
        }
    };
    Renderer.prototype.uniform2F = function (prg, name, value) {
        var loc = gl.getUniformLocation(prg, name);
        if (loc != -1) {
            gl.useProgram(prg);
            gl.uniform2fv(loc, value);
        }
    };
    return Renderer;
}());
;
var running = true;
var tOffset = 0;
var pauseShader;
var restartShader;
function main() {
    // TODO: load shaders from STOYAPI
    var shaders = new ShaderInfo("\n/* This animation is the material of my first youtube tutorial about creative \n   coding, which is a video in which I try to introduce programmers to GLSL \n   and to the wonderful world of shaders, while also trying to share my recent \n   passion for this community.\n                                       Video URL: https://youtu.be/f4s1h2YETNY\n*/\n\n//https://iquilezles.org/articles/palettes/\nvec3 palette( float t ) {\n    vec3 a = vec3(0.5, 0.5, 0.5);\n    vec3 b = vec3(0.5, 0.5, 0.5);\n    vec3 c = vec3(1.0, 1.0, 1.0);\n    vec3 d = vec3(0.263,0.416,0.557);\n\n    return a + b*cos( 6.28318*(c*t+d) );\n}\n\n//https://www.shadertoy.com/view/mtyGWy\nvoid mainImage( out vec4 fragColor, in vec2 fragCoord ) {\n    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;\n    vec2 uv0 = uv;\n    vec3 finalColor = vec3(0.0);\n    \n    for (float i = 0.0; i < 4.0; i++) {\n        uv = fract(uv * 1.5) - 0.5;\n\n        float d = length(uv) * exp(-length(uv0));\n\n        vec3 col = palette(length(uv0) + i*.4 + iTime*.4);\n\n        d = sin(d*8. + iTime)/8.;\n        d = abs(d);\n\n        d = pow(0.01 / d, 1.2);\n\n        finalColor += col * d;\n    }\n        \n    fragColor = vec4(finalColor, 1.0);\n}\n");
    var renderer = new Renderer(shaders);
    var start = performance.now() / 1000.0;
    var lastTime = start;
    var averageFPS = -1;
    var time;
    var fpsCounterElem = document.getElementById("fpsCounter");
    var timeDisplayElem = document.getElementById("iTimeDisplay");
    var animationFrameID;
    function animate() {
        time = performance.now() / 1000.0 - start + tOffset;
        renderer.draw(time);
        var deltaTime = performance.now() / 1000.0 - lastTime;
        var fps = 1.0 / deltaTime;
        if (averageFPS == -1) {
            averageFPS = fps;
        }
        else {
            averageFPS = 0.9 * averageFPS + 0.1 * fps;
        }
        fpsCounterElem.innerText = "".concat(averageFPS.toFixed(1));
        timeDisplayElem.innerText = "".concat(time.toFixed(2));
        lastTime = performance.now() / 1000.0;
        if (running)
            animationFrameID = requestAnimationFrame(animate);
    }
    animationFrameID = requestAnimationFrame(animate);
    pauseShader = function () {
        if (!running) {
            start = performance.now() / 1000.0;
            animationFrameID = requestAnimationFrame(animate);
        }
        else {
            tOffset = time;
            cancelAnimationFrame(animationFrameID);
        }
        running = !running;
    };
    restartShader = function () {
        start = performance.now() / 1000.0;
        tOffset = 0;
        averageFPS = -1;
        animate();
    };
}
window.onload = main;
