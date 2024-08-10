import * as monaco from 'monaco-editor'

import { updateActiveShader } from './index.ts';

const conf = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/']
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')']
  ],
  autoClosingPairs: [
    { open: '[', close: ']' },
    { open: '{', close: '}' },
    { open: '(', close: ')' },
    { open: "'", close: "'", notIn: ['string', 'comment'] },
    { open: '"', close: '"', notIn: ['string'] }
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" }
  ]
}

const keywords = [
  'const', 'uniform', 'break', 'continue',
  'do', 'for', 'while', 'if', 'else', 'switch', 'case', 'in', 'out', 'inout', 'true', 'false',
  'invariant', 'discard', 'return', 'sampler2D', 'samplerCube', 'sampler3D', 'struct',
  'radians', 'degrees', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'pow', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'exp', 'log', 'exp2', 'log2', 'sqrt', 'inversesqrt', 'abs', 'sign', 'floor', 'ceil', 'round', 'roundEven', 'trunc', 'fract', 'mod', 'modf',
  'min', 'max', 'clamp', 'mix', 'step', 'smoothstep', 'length', 'distance', 'dot', 'cross ',
  'determinant', 'inverse', 'normalize', 'faceforward', 'reflect', 'refract', 'matrixCompMult', 'outerProduct', 'transpose', 'lessThan ',
  'lessThanEqual', 'greaterThan', 'greaterThanEqual', 'equal', 'notEqual', 'any', 'all', 'not', 'packUnorm2x16', 'unpackUnorm2x16', 'packSnorm2x16', 'unpackSnorm2x16', 'packHalf2x16', 'unpackHalf2x16',
  'dFdx', 'dFdy', 'fwidth', 'textureSize', 'texture', 'textureProj', 'textureLod', 'textureGrad', 'texelFetch', 'texelFetchOffset',
  'textureProjLod', 'textureLodOffset', 'textureGradOffset', 'textureProjLodOffset', 'textureProjGrad', 'intBitsToFloat', 'uintBitsToFloat', 'floatBitsToInt', 'floatBitsToUint', 'isnan', 'isinf',
  'vec2', 'vec3', 'vec4', 'ivec2', 'ivec3', 'ivec4', 'uvec2', 'uvec3', 'uvec4', 'bvec2', 'bvec3', 'bvec4',
  'mat2', 'mat3', 'mat2x2', 'mat2x3', 'mat2x4', 'mat3x2', 'mat3x3', 'mat3x4', 'mat4x2', 'mat4x3', 'mat4x4', 'mat4',
  'float', 'int', 'uint', 'void', 'bool',
]

const language = {
    tokenPostfix: '.glsl',
    // Set defaultToken to invalid to see what you do not tokenize yet
    defaultToken: 'invalid',
    keywords,
    operators: [
      '=',
      '>',
      '<',
      '!',
      '~',
      '?',
      ':',
      '==',
      '<=',
      '>=',
      '!=',
      '&&',
      '||',
      '++',
      '--',
      '+',
      '-',
      '*',
      '/',
      '&',
      '|',
      '^',
      '%',
      '<<',
      '>>',
      '>>>',
      '+=',
      '-=',
      '*=',
      '/=',
      '&=',
      '|=',
      '^=',
      '%=',
      '<<=',
      '>>=',
      '>>>='
    ],
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    integersuffix: /([uU](ll|LL|l|L)|(ll|LL|l|L)?[uU]?)/,
    floatsuffix: /[fFlL]?/,
    encoding: /u|u8|U|L/,
  
    tokenizer: {
      root: [
        // identifiers and keywords
        [
          /[a-zA-Z_]\w*/,
          {
            cases: {
              '@keywords': { token: 'keyword.$0' },
              '@default': 'identifier'
            }
          }
        ],
  
        // Preprocessor directive (#define)
        [/^\s*#\s*\w+/, 'keyword.directive'],
  
        // whitespace
        { include: '@whitespace' },
  
        // delimiters and operators
        [/[{}()\[\]]/, '@brackets'],
        [/@symbols/, {
          cases: {
            '@operators': 'operator',
            '@default': ''
          }
        }],
  
        // numbers
        [/\d*\d+[eE]([\-+]?\d+)?(@floatsuffix)/, 'number.float'],
        [/\d*\.\d+([eE][\-+]?\d+)?(@floatsuffix)/, 'number.float'],
        [/0[xX][0-9a-fA-F']*[0-9a-fA-F](@integersuffix)/, 'number.hex'],
        [/0[0-7']*[0-7](@integersuffix)/, 'number.octal'],
        [/0[bB][0-1']*[0-1](@integersuffix)/, 'number.binary'],
        [/\d[\d']*\d(@integersuffix)/, 'number'],
        [/\d(@integersuffix)/, 'number'],
  
        // delimiter: after number because of .\d floats
        [/[;,.]/, 'delimiter']
      ],
  
      comment: [
        [/[^\/*]+/, 'comment'],
        [/\/\*/, 'comment', '@push'],
        ['\\*/', 'comment', '@pop'],
        [/[\/*]/, 'comment']
      ],
  
      // Does it have strings?
      string: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, {
          token: 'string.quote',
          bracket: '@close',
          next: '@pop'
        }]
      ],
  
      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment']
      ]
    }
}

let editor;

function expandHex(hex) {
  // Remove the hash at the start if it's there
  hex = hex.replace(/^#/, '');

  // Check if it's a 3-digit hex color
  if (hex.length === 3) {
    // Expand the 3-digit color to 6-digit color
    hex = hex.split('').map(function (char) {
      return char + char; // Duplicate each character
    }).join('');
  }

  // Add the hash back and return
  return `#${hex}`;
}

export function setupEditor() {
    // idk what this does, but it makes the yellow bar go away
    self.MonacoEnvironment = {
        getWorkerUrl: function (moduleId, label) {
            if (label === 'json') {
                return './dist/json.worker.js';
            }
            if (label === 'css' || label === 'scss' || label === 'less') {
                return './dist/css.worker.js';
            }
            if (label === 'html' || label === 'handlebars' || label === 'razor') {
                return './dist/html.worker.js';
            }
            if (label === 'typescript' || label === 'javascript') {
                return './dist/ts.worker.js';
            }
            return './dist/editor.worker.js';
        }
    };
    
        // basic GLSL language support
    monaco.languages.register({ id: 'glsl' });

    monaco.languages.setLanguageConfiguration('glsl', conf);
    monaco.languages.setMonarchTokensProvider('glsl', language);

    const root = document.documentElement;
    const rootStyle = window.getComputedStyle(root);
    const secondaryThemeColor = expandHex(rootStyle.getPropertyValue('--primary-bg-colour').trim());

    monaco.editor.defineTheme("shadertoy-dark", {
      base: "vs-dark", // can also be vs-dark or hc-black
      inherit: true, // can also be false to completely replace the builtin rules
      rules: [
      ],
      colors: {
        "editor.background": secondaryThemeColor,
      },
    });
    
    let editorElem = document.getElementById("editor");
    editor = monaco.editor.create(
        editorElem,
        {
            language: 'glsl',
            theme: 'shadertoy-dark',
            fontFamily: 'JetBrains Mono',
            
        }
    );
    editor.layout();

    window.addEventListener('resize', () => {
      editor.layout();
    });

    const observer = new ResizeObserver(entries => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
          editor.layout();
        }, 100); // debounce
    });
    observer.observe(document.getElementById('editorCont'));

    editor.onDidChangeModelContent((event) => {
        updateActiveShader(editor.getValue());
    });
}

export function setEditorValue(value) {
    editor.setValue(value);
}

export default function() {
    // idk why i need this
}