/**
 * ============================================================
 * APP MODULE
 * ============================================================
 * Handles Lenis smooth scroll, WebGL liquid cursor, 
 * navigation effects, and scroll animations.
 */

(function() {
    'use strict';

    // ============================================================
    // Lenis Smooth Scroll
    // ============================================================
    function initLenis() {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 2,
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        // Return for potential external use
        return lenis;
    }

    // ============================================================
    // WebGL Liquid Cursor
    // ============================================================
    function initWebGLCursor() {
        const canvas = document.getElementById('cursor-canvas');
        if (!canvas) return;

        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            console.log('WebGL not supported, cursor disabled');
            return;
        }

        // Vertex shader
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;

        // Fragment shader - liquid displacement effect
        const fragmentShaderSource = `
            precision mediump float;
            varying vec2 v_texCoord;
            uniform vec2 u_mouse;
            uniform float u_time;
            uniform vec2 u_resolution;

            void main() {
                vec2 uv = v_texCoord;
                
                // Distance from mouse
                vec2 mouseUV = u_mouse / u_resolution;
                float dist = distance(uv, mouseUV);
                
                // Ripple effect
                float ripple = sin(dist * 30.0 - u_time * 3.0) * 0.5 + 0.5;
                ripple *= smoothstep(0.5, 0.0, dist);
                
                // Displacement
                vec2 displacement = normalize(uv - mouseUV) * ripple * 0.03;
                vec2 displacedUV = uv + displacement;
                
                // Create gradient for cursor area
                float cursor = smoothstep(0.15, 0.0, dist);
                float ring = smoothstep(0.12, 0.15, dist) * smoothstep(0.2, 0.15, dist);
                
                // Color - subtle white/gray effect
                vec3 baseColor = vec3(0.96, 0.96, 0.96);
                vec3 ringColor = vec3(0.6, 0.6, 0.6);
                
                vec3 finalColor = mix(baseColor, ringColor, ring * 0.5);
                finalColor += cursor * 0.1;
                
                gl_FragColor = vec4(finalColor, 0.8 + ring * 0.2);
            }
        `;

        // Compile shaders
        function createShader(gl, type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compile error:', gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        }

        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) return;

        // Create program
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return;
        }

        gl.useProgram(program);

        // Set up geometry (full screen quad)
        const positions = new Float32Array([
            -1, -1,  1, -1,  -1, 1,
            -1,  1,  1, -1,   1, 1
        ]);

        const texCoords = new Float32Array([
            0, 1,  1, 1,  0, 0,
            0, 0,  1, 1,  1, 0
        ]);

        // Position buffer
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        const positionLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        // Texture coordinate buffer
        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

        const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
        gl.enableVertexAttribArray(texCoordLoc);
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

        // Get uniform locations
        const mouseLoc = gl.getUniformLocation(program, 'u_mouse');
        const timeLoc = gl.getUniformLocation(program, 'u_time');
        const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');

        // Mouse tracking
        let mouseX = 0, mouseY = 0;
        let targetX = 0, targetY = 0;

        document.addEventListener('mousemove', (e) => {
            targetX = e.clientX;
            targetY = canvas.height - e.clientY; // Flip Y for WebGL
        });

        // Resize handler
        function resize() {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            gl.viewport(0, 0, canvas.width, canvas.height);
        }

        resize();
        window.addEventListener('resize', resize);

        // Animation loop
        let startTime = Date.now();

        function animate() {
            // Smooth mouse follow
            mouseX += (targetX - mouseX) * 0.1;
            mouseY += (targetY - mouseY) * 0.1;

            const time = (Date.now() - startTime) / 1000;

            gl.uniform2f(mouseLoc, mouseX * (window.devicePixelRatio || 1), mouseY);
            gl.uniform1f(timeLoc, time);
            gl.uniform2f(resolutionLoc, canvas.width, canvas.height);

            gl.drawArrays(gl.TRIANGLES, 0, 6);

            requestAnimationFrame(animate);
        }

        animate();

        // Enable cursor on desktop
        document.body.classList.add('cursor-active');
    }

    // ============================================================
    // Navigation Scroll Effect
    // ============================================================
    function initNavScroll() {
        const nav = document.querySelector('.nav');
        if (!nav) return;

        let lastScroll = 0;

        window.addEventListener('scroll', () => {
            const currentScroll = window.scrollY;

            if (currentScroll > 100) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }

            lastScroll = currentScroll;
        }, { passive: true });
    }

    // ============================================================
    // Hero Scroll Animation
    // ============================================================
    function initHeroAnimation() {
        const hero = document.querySelector('.hero');
        if (!hero) return;

        // Parallax effect on hero
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY;
            const rate = scrolled * 0.5;
            
            if (hero.querySelector('.hero-title')) {
                hero.querySelector('.hero-title').style.transform = `translateY(${rate}px)`;
                hero.querySelector('.hero-title').style.opacity = 1 - (scrolled / 700);
            }
        }, { passive: true });
    }

    // ============================================================
    // Initialize Everything
    // ============================================================
    function init() {
        initLenis();
        // WebGL cursor disabled - uncomment to enable liquid cursor effect
        // initWebGLCursor();
        initNavScroll();
        initHeroAnimation();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();